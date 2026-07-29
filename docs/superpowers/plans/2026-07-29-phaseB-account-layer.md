# Phase B Implementation Plan — Account layer (account-level billing)

> **Scope discipline:** Introduce an `accounts` table and move billing (paid_until, tier, trial, status, billing_period) from `clinics` to `accounts`. **Still exactly one clinic per account** — `current_clinic_id()` stays `limit 1`, and the 22-table SELECT/WRITE isolation is UNCHANGED. The trick: keep the RLS-referenced functions' NAMES (`clinic_is_writable()`, `clinic_access_tier()`, `settle_invoice()`) and only change their BODIES to resolve `clinic → account`. So the 66 RLS policies are never touched. Additive + reversible on the LIVE DB. Re-verify settle idempotency + the gate against account billing. Then STOP for verification before Phase C.

**Goal:** Billing becomes account-level (one paid_until per account) while the tenant/isolation model is byte-for-byte unchanged, so Phase C can later add multiple clinics per account.

---

## Migration 0016 — accounts table + backfill (1:1)

`supabase/migrations/0016_accounts.sql`:
```sql
-- accounts — the billing entity. Phase B: exactly one account per owner and one
-- clinic per account (1:1), so this is a pure lift of billing off clinics.
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null references public.billing_plans(id),
  trial_end timestamptz not null,
  paid_until timestamptz not null,
  grace_days integer not null default 7 check (grace_days between 0 and 60),
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing','active','past_due','canceled')),
  billing_period text check (billing_period in ('monthly','annual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id)
);

alter table public.accounts enable row level security;

-- Owners may READ their account; they may NEVER write billing (H1 pattern —
-- only the service role / edge functions write). No UPDATE/INSERT policy.
drop policy if exists "owners read own account" on public.accounts;
create policy "owners read own account"
  on public.accounts for select to authenticated
  using (owner_user_id = auth.uid());

drop trigger if exists accounts_set_updated_at on public.accounts;
create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- 1:1 backfill: one account per existing clinic, copying its billing.
insert into public.accounts
  (owner_user_id, tier, trial_end, paid_until, grace_days, subscription_status, billing_period)
select owner_user_id, plan, trial_end, paid_until, grace_days, subscription_status, billing_period
from public.clinics
on conflict (owner_user_id) do nothing;

-- Link clinics to their owner's account.
alter table public.clinics add column if not exists account_id uuid references public.accounts(id) on delete cascade;
update public.clinics c set account_id = a.id
  from public.accounts a where a.owner_user_id = c.owner_user_id and c.account_id is null;
alter table public.clinics alter column account_id set not null;

create index if not exists clinics_account_id_idx on public.clinics(account_id);
```

Verify: `select (select count(*) from accounts) as accounts, (select count(*) from clinics) as clinics, (select count(*) from clinics where account_id is null) as unlinked;` → accounts==clinics, unlinked=0. And per-clinic: account billing == old clinic billing.

## Migration 0017 — move the billing functions onto accounts

`supabase/migrations/0017_billing_on_accounts.sql`:
```sql
-- account_access_tier — same date logic as before, on the account.
create or replace function public.account_access_tier(p_account_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select case
    when a.subscription_status = 'canceled' then 'read_only'
    when a.paid_until is null then null
    when now() <= a.paid_until then 'full'
    when now() <= a.paid_until + make_interval(days => coalesce(a.grace_days,7)) then 'grace'
    else 'read_only'
  end
  from public.accounts a where a.id = p_account_id;
$$;

-- clinic_access_tier — kept for back-compat, now resolves through the account.
create or replace function public.clinic_access_tier(p_clinic_id uuid)
returns text language sql stable security definer set search_path = public as $$
  select public.account_access_tier((select account_id from public.clinics where id = p_clinic_id));
$$;

-- clinic_is_writable — SAME NAME (the 66 RLS policies call it, untouched), body
-- now goes clinic -> account. Still FAIL-OPEN.
create or replace function public.clinic_is_writable()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    public.account_access_tier(
      (select account_id from public.clinics where id = public.current_clinic_id())
    ) is distinct from 'read_only',
    true
  );
$$;

grant execute on function public.account_access_tier(uuid) to authenticated;

-- settle_invoice — credit the ACCOUNT now, not the clinic. Claim + amount-check
-- unchanged; the paid_until GREATEST extension moves to accounts.
create or replace function public.settle_invoice(p_invoice_id uuid, p_paid_amount integer)
returns table (out_paid_until timestamptz, out_already_settled boolean)
language plpgsql security definer set search_path = public as $$
declare
  v_clinic_id uuid;
  v_account_id uuid;
  v_period_end timestamptz;
  v_amount integer;
  v_claimed boolean := false;
begin
  update public.billing_invoices
     set status = 'paid', paid_at = now()
   where id = p_invoice_id and status = 'open'
   returning clinic_id, period_end, amount_centavos
   into v_clinic_id, v_period_end, v_amount;
  v_claimed := found;

  if v_claimed then
    if p_paid_amount is distinct from v_amount then
      raise exception 'amount_mismatch: expected %, got %', v_amount, p_paid_amount;
    end if;
    select account_id into v_account_id from public.clinics where id = v_clinic_id;
    update public.accounts
       set paid_until = greatest(paid_until, v_period_end),
           subscription_status = 'active'
     where id = v_account_id;
  end if;

  return query
    select a.paid_until, (not v_claimed)
    from public.billing_invoices bi
    join public.clinics c on c.id = bi.clinic_id
    join public.accounts a on a.id = c.account_id
    where bi.id = p_invoice_id;
end;
$$;

revoke all on function public.settle_invoice(uuid, integer) from public, anon, authenticated;
```

Verify: `current_clinic_id()` still `limit 1` (unchanged); 66 gated policies still present; force an account past grace → `clinic_is_writable()` false for its owner, fail-open true for unknown.

## Migration 0018 — signup creates account + clinic; reminders keyed by account

`supabase/migrations/0018_signup_and_reminders.sql`:
```sql
-- handle_new_user — create the ACCOUNT (billing) then the clinic linked to it.
-- clinics keeps its (now-deprecated) billing columns populated = account values
-- to satisfy its NOT NULL constraints; the account is the source of truth.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_clinic_name text := nullif(meta->>'clinic_name', '');
  v_trial_end timestamptz := now() + interval '18 days';
  v_account_id uuid;
begin
  if v_clinic_name is null then
    return new;
  end if;

  insert into public.accounts (owner_user_id, tier, trial_end, paid_until, subscription_status)
  values (new.id, 'tier_1', v_trial_end, v_trial_end, 'trialing')
  on conflict (owner_user_id) do nothing
  returning id into v_account_id;

  if v_account_id is null then
    select id into v_account_id from public.accounts where owner_user_id = new.id;
  end if;

  insert into public.clinics (
    owner_user_id, account_id, name, contact_name, phone, plan,
    trial_end, paid_until, subscription_status
  )
  values (
    new.id, v_account_id, v_clinic_name,
    nullif(meta->>'contact_name', ''), nullif(meta->>'phone', ''),
    'tier_1', v_trial_end, v_trial_end, 'trialing'
  )
  on conflict (owner_user_id) do nothing;

  return new;
end;
$$;

-- billing_reminders is account-level now (billing is per account). Table is
-- empty in practice; re-key it by account_id.
alter table public.billing_reminders add column if not exists account_id uuid references public.accounts(id) on delete cascade;
update public.billing_reminders r set account_id = c.account_id
  from public.clinics c where r.clinic_id = c.id and r.account_id is null;
-- drop old PK + clinic_id, add account-scoped PK
alter table public.billing_reminders drop constraint if exists billing_reminders_pkey;
alter table public.billing_reminders drop column if exists clinic_id;
alter table public.billing_reminders alter column account_id set not null;
alter table public.billing_reminders add primary key (account_id, kind, period_start);

drop policy if exists "owners read own reminders" on public.billing_reminders;
create policy "owners read own reminders"
  on public.billing_reminders for select to authenticated
  using (account_id in (select id from public.accounts where owner_user_id = auth.uid()));
```

## Edge function updates

### create-invoice — price/extend off the account
- Resolve the account via the clinic: select `clinics.account_id` and embed the account's `billing_plans` tier + `accounts.paid_until, accounts.billing_period, accounts.tier`. Practically: query `accounts` joined to the caller's clinic. Simplest — after `callerClinicId`, fetch `select id, account_id from clinics where id = clinicId`, then `select paid_until, tier, billing_period, billing_plans!inner(monthly_centavos, annual_centavos, self_serve) from accounts where id = account_id`.
- `periodStart = account.paid_until`; tier + period → amount (unchanged logic); persist `billing_period` on the ACCOUNT (`update accounts set billing_period=...`).
- Everything else (period-in-external_id, cadence switch, idempotency, reuse, qrImageDataUrl-always) unchanged. billing_invoices still carries clinic_id.

### billing-cron — iterate accounts
- Select from `accounts` (not clinics): id, owner_user_id, paid_until, grace_days, subscription_status, billing_period, tier. Compute daysLeft off `account.paid_until`. Insert `billing_reminders {account_id, kind, period_start}`. Lapse: `update accounts set subscription_status='past_due'`. Email lookup via owner_user_id unchanged.

### getClinicBilling (clinic-app) — read the account
- `clinic-app/src/lib/api.ts`: resolve the account for the signed-in clinic and return billing from it. Query: `accounts` (RLS scopes to owner) selecting `paid_until, trial_end, subscription_status, billing_period, tier, billing_plans!inner(display_name, monthly_centavos, annual_centavos)`. Keep the returned `ClinicBilling` shape (paid_until, subscription_status, planLabel, planMonthlyCentavos, planAnnualCentavos, billing_period) so `SettingsPage`, `AccessBanner`, `ReadOnlyGate` need no change. (They read `paid_until` + `subscription_status` — now the account's.)

## Verification (controller-run, sandbox)
1. Backfill: accounts==clinics, all clinics linked, account billing == pre-migration clinic billing.
2. Invariants: `current_clinic_id()` unchanged (`limit 1`); 66 gated write policies present; SELECT isolation on the 22 tables intact (spot-check a table's policies unchanged).
3. Gate on account: throwaway account+clinic → force account past grace → owner's `clinic_is_writable()` = false, reads still allowed; fail-open on unknown = true.
4. settle on account: create-invoice (monthly & annual) → simulate → `accounts.paid_until` advances by the right period; 3 extra polls unchanged (idempotent); clinics.paid_until (deprecated copy) NOT used for the decision.
5. Signup: throwaway auth user → one account (tier_1, 18d) + one linked clinic; clean up.
6. Builds green (app + clinic-app), tests green. Clean up ALL test rows (Mode B).
7. STOP — report Phase B done; do not start Phase C until the user verifies.
