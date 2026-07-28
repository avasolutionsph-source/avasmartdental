-- 0010_paywall_integrity.sql — close two self-bypass holes in the paywall.
--
-- H1(a): handle_new_user trusted trial_end from raw_user_meta_data, which the
--        browser supplies — a user could sign up with trial_end = 2099 and
--        never pay. Trial length is a business rule, not client input, so the
--        trigger now computes it SERVER-SIDE as now() + 14 days and ignores any
--        client-supplied value.
--
-- H1(b): the "owners update own clinic" RLS policy let an authenticated owner
--        PATCH their own clinics row directly (e.g. set paid_until = 2099),
--        bypassing payment entirely. No client code ever writes clinics — only
--        the edge functions do, via the service role (which bypasses RLS). So
--        we drop the owner-UPDATE policy: with no UPDATE policy, RLS denies all
--        client UPDATEs to clinics, while the service role is unaffected.

-- ── H1(b): remove client write access to clinics ────────────────────────────
drop policy if exists "owners update own clinic" on public.clinics;
-- (SELECT policy "owners read own clinic" is intentionally kept.)

-- ── H1(a): trial length is server-authoritative ─────────────────────────────
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
  -- SERVER-SIDE trial end. The client's trial_end value is deliberately ignored.
  v_trial_end timestamptz := now() + interval '14 days';
begin
  -- A signup is identified by clinic_name + plan in the metadata. trial_end is
  -- no longer part of the signal (we set it ourselves).
  if v_clinic_name is null or v_plan is null then
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
    v_plan,
    v_trial_end,
    v_trial_end,          -- paid_until = trial_end during the trial
    'trialing'
  )
  on conflict (owner_user_id) do nothing;

  return new;
end;
$$;
