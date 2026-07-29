-- 0007_signup_paid_until.sql — fix a signup-breaking gap introduced by 0004.
--
-- 0004 made clinics.paid_until NOT NULL with no default. But handle_new_user
-- (0002) inserts a clinics row WITHOUT paid_until, so every new signup would
-- fail with "null value in column paid_until violates not-null constraint",
-- which rolls back the whole auth.signUp transaction — no user ever created.
--
-- Fix: the trigger sets paid_until = trial_end. During the trial the paid-through
-- date IS the trial end (the trial is the first, free, billing period), so this
-- matches the design exactly. trial_end is guaranteed non-null here because the
-- function returns early when v_trial_end is null.
--
-- Forward-only: 0002 stays as applied; this CREATE OR REPLACE supersedes it.

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
    paid_until,          -- NEW: entitlement clock starts at the trial end
    subscription_status
  )
  values (
    new.id,
    v_clinic_name,
    nullif(meta->>'contact_name', ''),
    nullif(meta->>'phone', ''),
    v_plan,
    v_trial_end,
    v_trial_end,         -- paid_until = trial_end during the trial
    'trialing'
  )
  on conflict (owner_user_id) do nothing;

  return new;
end;
$$;
