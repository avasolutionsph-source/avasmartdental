-- 0004_billing.sql — subscription billing: server-side prices, paid-through
-- tracking, monthly QRPh invoices, and the access-tier functions that gate
-- writes once a clinic stops paying.

-- ---------------------------------------------------------------------------
-- 1. billing_plans — THE server-side price table. Single source of truth for
--    what a clinic is charged. Amounts are integer centavos (NextPay "PHP/2").
--    Never charge from a request body. (Guide §7 rule 1.)
-- ---------------------------------------------------------------------------
create table if not exists public.billing_plans (
  id text primary key,
  display_name text not null,
  amount_centavos integer not null check (amount_centavos > 0),
  self_serve boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.billing_plans (id, display_name, amount_centavos, self_serve) values
  ('solo',        'Solo',         149900, true),
  ('clinic',      'Clinic',       299900, true),
  ('multibranch', 'Multi-branch', 499900, false)
on conflict (id) do update
  set display_name    = excluded.display_name,
      amount_centavos = excluded.amount_centavos,
      self_serve      = excluded.self_serve,
      updated_at      = now();

alter table public.billing_plans enable row level security;

-- Prices are public information (they are on the pricing page).
drop policy if exists "anyone reads plans" on public.billing_plans;
create policy "anyone reads plans"
  on public.billing_plans for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- 2. clinics.paid_until — the real entitlement clock.
--    During the trial it equals trial_end; each paid invoice pushes it forward
--    one month. THIS is what gates access, not trial_end.
-- ---------------------------------------------------------------------------
alter table public.clinics
  add column if not exists paid_until timestamptz;

update public.clinics
  set paid_until = trial_end
  where paid_until is null;

alter table public.clinics
  alter column paid_until set not null;

-- Grace period is uniform for now but lives on the row so support can extend
-- it for one clinic without a code change.
alter table public.clinics
  add column if not exists grace_days integer not null default 7
  check (grace_days >= 0 and grace_days <= 60);

-- ---------------------------------------------------------------------------
-- 3. billing_invoices — one row per monthly charge attempt.
--    external_id is what we send to NextPay; it is unique so a retried
--    generation can never mint two intents for the same period.
-- ---------------------------------------------------------------------------
create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  plan_id text not null references public.billing_plans (id),
  amount_centavos integer not null check (amount_centavos > 0),
  period_start timestamptz not null,
  period_end timestamptz not null,
  external_id text not null unique,
  payment_intent_id text,
  qr_string text,
  qr_expires_at timestamptz,
  status text not null default 'open'
    check (status in ('open', 'paid', 'expired', 'canceled')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint billing_invoices_period_valid check (period_end > period_start),
  -- At most one unpaid invoice per clinic per period.
  unique (clinic_id, period_start)
);

create index if not exists billing_invoices_clinic_idx
  on public.billing_invoices (clinic_id, created_at desc);
create index if not exists billing_invoices_open_idx
  on public.billing_invoices (status) where status = 'open';

alter table public.billing_invoices enable row level security;

-- Owners may READ their invoices. They may never write them — only the
-- service role (edge functions) writes, and only after verifying with NextPay.
drop policy if exists "owners read own invoices" on public.billing_invoices;
create policy "owners read own invoices"
  on public.billing_invoices for select
  to authenticated
  using (clinic_id = public.current_clinic_id());

drop trigger if exists billing_invoices_set_updated_at on public.billing_invoices;
create trigger billing_invoices_set_updated_at
  before update on public.billing_invoices
  for each row execute function public.set_updated_at();

drop trigger if exists billing_plans_set_updated_at on public.billing_plans;
create trigger billing_plans_set_updated_at
  before update on public.billing_plans
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. Access tier — derived from dates, never stored, so it can never go stale.
--      full      : paid_until in the future
--      grace     : past paid_until but within grace_days — still writable,
--                  the UI shows a warning banner
--      read_only : past grace — records stay fully readable and exportable,
--                  new entries are blocked. Nothing is ever deleted.
--
-- Returns NULL when the clinic is unknown or its state is unreadable. Callers
-- must treat NULL as "don't know", never as "not entitled" — see
-- clinic_is_writable() below for why.
-- ---------------------------------------------------------------------------
create or replace function public.clinic_access_tier(p_clinic_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when c.subscription_status = 'canceled' then 'read_only'
    when c.paid_until is null then null           -- unknown, not "unpaid"
    when now() <= c.paid_until then 'full'
    when now() <= c.paid_until
                  + make_interval(days => coalesce(c.grace_days, 7)) then 'grace'
    else 'read_only'
  end
  from public.clinics c
  where c.id = p_clinic_id;
$$;

-- Writable — used by the write RLS policies in 0005.
--
-- DELIBERATELY FAIL-OPEN. Only a definitive 'read_only' blocks a write;
-- anything unknown (no clinic row, null paid_until, unreadable state) allows
-- it. The two failure modes are not symmetric:
--   * Wrong in our favour  -> a PAYING clinic cannot record a treatment.
--     That is a patient-safety problem.
--   * Wrong in their favour -> someone gets a few days of unpaid use.
--     That is a small, recoverable revenue problem.
-- We take the revenue risk every time.
--
-- This does NOT weaken tenant isolation. The policies read
--   clinic_id = current_clinic_id() AND clinic_is_writable()
-- so when current_clinic_id() is NULL the first predicate is already NULL and
-- the write is refused regardless. Fail-open here only ever answers the
-- question "have they paid?", never "is this row theirs?".
create or replace function public.clinic_is_writable()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.clinic_access_tier(public.current_clinic_id()) is distinct from 'read_only',
    true
  );
$$;

grant execute on function public.clinic_access_tier(uuid) to authenticated;
grant execute on function public.clinic_is_writable() to authenticated;
