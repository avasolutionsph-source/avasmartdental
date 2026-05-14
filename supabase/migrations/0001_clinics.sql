-- Clinics table — one row per signup from the landing-site checkout flow.
-- Populated automatically by the handle_new_user trigger below, reading the
-- metadata that signupClinic() attaches to auth.users.raw_user_meta_data.

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  plan text not null,
  trial_end timestamptz not null,
  subscription_status text not null default 'trialing'
    check (subscription_status in ('trialing', 'active', 'past_due', 'canceled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id)
);

create index if not exists clinics_owner_user_id_idx
  on public.clinics (owner_user_id);

alter table public.clinics enable row level security;

drop policy if exists "owners read own clinic" on public.clinics;
create policy "owners read own clinic"
  on public.clinics
  for select
  using (auth.uid() = owner_user_id);

drop policy if exists "owners update own clinic" on public.clinics;
create policy "owners update own clinic"
  on public.clinics
  for update
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

-- updated_at maintenance
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists clinics_set_updated_at on public.clinics;
create trigger clinics_set_updated_at
  before update on public.clinics
  for each row execute function public.set_updated_at();
