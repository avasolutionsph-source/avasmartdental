-- 0008_reminders.sql — ledger so each billing reminder is sent exactly once.
-- The primary key (clinic_id, kind, period_start) makes a re-send a no-op:
-- the cron inserts first, and a duplicate-key error means it already went out.
create table if not exists public.billing_reminders (
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  kind text not null check (kind in ('trial_t7','trial_t3','trial_t1',
                                    'renewal_t7','renewal_t3','renewal_t1',
                                    'grace_started','read_only')),
  period_start timestamptz not null,
  sent_at timestamptz not null default now(),
  primary key (clinic_id, kind, period_start)
);

alter table public.billing_reminders enable row level security;

drop policy if exists "owners read own reminders" on public.billing_reminders;
create policy "owners read own reminders"
  on public.billing_reminders for select to authenticated
  using (clinic_id = public.current_clinic_id());
