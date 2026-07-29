-- 0012 — trial is 18 days (was 14) and the tier is server-authoritative.
-- Supersedes the 0010 trigger. The client no longer influences trial length
-- OR tier: a new account always starts an 18-day trial at tier_1 (one clinic).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_clinic_name text := nullif(meta->>'clinic_name', '');
  v_trial_end timestamptz := now() + interval '18 days';
begin
  -- A signup is identified by clinic_name in the metadata.
  if v_clinic_name is null then
    return new;
  end if;

  insert into public.clinics (
    owner_user_id, name, contact_name, phone, plan,
    trial_end, paid_until, subscription_status
  )
  values (
    new.id, v_clinic_name,
    nullif(meta->>'contact_name', ''),
    nullif(meta->>'phone', ''),
    'tier_1',            -- server-side: every new account is one clinic
    v_trial_end,
    v_trial_end,
    'trialing'
  )
  on conflict (owner_user_id) do nothing;

  return new;
end;
$$;
