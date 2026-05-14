-- handle_new_user — fired by Supabase auth on insert into auth.users.
-- Reads the metadata that the landing-site checkout (signupClinic in
-- app/src/lib/supabase.ts) attaches under raw_user_meta_data and copies
-- the relevant fields into a new public.clinics row.
--
-- Metadata shape expected:
--   clinic_name, contact_name, phone, plan, trial_end (ISO timestamp)

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_clinic_name text := nullif(meta->>'clinic_name', '');
  v_plan text := nullif(meta->>'plan', '');
  v_trial_end timestamptz := nullif(meta->>'trial_end', '')::timestamptz;
begin
  -- If the user wasn't created via the clinic signup flow (no metadata),
  -- silently skip — admins may still create raw users from the dashboard.
  if v_clinic_name is null or v_plan is null or v_trial_end is null then
    return new;
  end if;

  insert into public.clinics (
    owner_user_id,
    name,
    contact_name,
    phone,
    plan,
    trial_end,
    subscription_status
  )
  values (
    new.id,
    v_clinic_name,
    nullif(meta->>'contact_name', ''),
    nullif(meta->>'phone', ''),
    v_plan,
    v_trial_end,
    'trialing'
  )
  on conflict (owner_user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
