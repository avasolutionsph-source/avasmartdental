-- 0021_fix_signup_clinic_insert.sql — 0020 dropped clinics' unique(owner_user_id),
-- which broke handle_new_user: its clinic insert used ON CONFLICT (owner_user_id)
-- do nothing, and that unique constraint no longer exists -> every signup errored.
--
-- Fix: create the first clinic ONLY when the account was newly created (the
-- accounts RETURNING is null on a re-fire). No ON CONFLICT needed on clinics —
-- an owner may now have many clinics, and the account guard makes signup
-- idempotent without one.
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

  -- v_account_id is non-null only when THIS insert created the account (first
  -- signup) -> create the account's first clinic exactly once.
  if v_account_id is not null then
    insert into public.clinics (
      owner_user_id, account_id, name, contact_name, phone, plan,
      trial_end, paid_until, subscription_status
    )
    values (
      new.id, v_account_id, v_clinic_name,
      nullif(meta->>'contact_name', ''), nullif(meta->>'phone', ''),
      'tier_1', v_trial_end, v_trial_end, 'trialing'
    );
  end if;

  return new;
end;
$$;
