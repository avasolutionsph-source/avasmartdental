-- 0018_signup_and_reminders.sql — signup creates an ACCOUNT (billing) then the
-- clinic linked to it; reminders become account-scoped.

-- handle_new_user — account first, then the clinic. clinics keeps its (now
-- deprecated) billing columns populated = account values to satisfy its NOT
-- NULL constraints; the ACCOUNT is the source of truth for billing.
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

-- billing_reminders is account-level now (billing is per account). Re-key it by
-- account_id (the table is empty in practice).
-- Drop the old policy FIRST — it references clinic_id, which blocks the column
-- drop below.
drop policy if exists "owners read own reminders" on public.billing_reminders;

alter table public.billing_reminders add column if not exists account_id uuid references public.accounts(id) on delete cascade;
update public.billing_reminders r set account_id = c.account_id
  from public.clinics c where r.clinic_id = c.id and r.account_id is null;
alter table public.billing_reminders drop constraint if exists billing_reminders_pkey;
alter table public.billing_reminders drop column if exists clinic_id;
alter table public.billing_reminders alter column account_id set not null;
alter table public.billing_reminders add primary key (account_id, kind, period_start);

create policy "owners read own reminders"
  on public.billing_reminders for select to authenticated
  using (account_id in (select id from public.accounts where owner_user_id = auth.uid()));
