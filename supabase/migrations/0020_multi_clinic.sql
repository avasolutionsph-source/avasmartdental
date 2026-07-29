-- 0020_multi_clinic.sql — many clinics per account; header-driven active clinic
-- with strict membership validation; account tier tracks clinic count.

-- Allow many clinics per account.
alter table public.clinics drop constraint if exists clinics_owner_user_id_key;

-- current_clinic_id: returns the x-clinic-id header's clinic ONLY if it belongs
-- to an account owned by the caller. Spoofing another account's clinic id -> no
-- row -> NULL -> every RLS policy (clinic_id = current_clinic_id()) denies.
create or replace function public.current_clinic_id()
returns uuid language sql stable security definer set search_path = public as $$
  select c.id
  from public.clinics c
  join public.accounts a on a.id = c.account_id
  where a.owner_user_id = auth.uid()
    and c.id = nullif(current_setting('request.headers', true)::json ->> 'x-clinic-id', '')::uuid
$$;

-- Account tier tracks clinic count. 1->tier_1, 2..6->tier_2_6, 7+->tier_6plus.
create or replace function public.recompute_account_tier()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_account uuid := coalesce(new.account_id, old.account_id);
  v_count integer;
  v_tier text;
begin
  select count(*) into v_count from public.clinics where account_id = v_account;
  select id into v_tier from public.billing_plans
    where v_count >= min_clinics and (max_clinics is null or v_count <= max_clinics)
    order by min_clinics desc limit 1;
  if v_tier is not null then
    update public.accounts set tier = v_tier where id = v_account;
  end if;
  return null;
end;
$$;

drop trigger if exists clinics_recompute_tier on public.clinics;
create trigger clinics_recompute_tier
  after insert or delete on public.clinics
  for each row execute function public.recompute_account_tier();
