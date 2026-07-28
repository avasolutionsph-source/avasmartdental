-- 0016_accounts.sql — the billing entity. Phase B: exactly one account per
-- owner and one clinic per account (1:1), so this is a pure lift of billing off
-- clinics. Additive: clinics keeps its (now-deprecated) billing columns.
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
-- only the service role / edge functions write). No UPDATE/INSERT policy, so
-- RLS denies all client writes to accounts.
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
