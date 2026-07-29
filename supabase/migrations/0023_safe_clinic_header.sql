-- 0023_safe_clinic_header.sql — LOW-1: a malformed x-clinic-id header made
-- current_clinic_id() throw on the ::uuid cast (500). Guard the cast with a
-- uuid-shaped regex so a bad header just yields no row -> NULL -> a clean RLS
-- deny, never an error. Security is unchanged: the row is still returned only
-- when its account's owner_user_id = auth.uid().
create or replace function public.current_clinic_id()
returns uuid language sql stable security definer set search_path = public as $$
  with req as (
    select nullif(current_setting('request.headers', true)::json ->> 'x-clinic-id', '') as raw
  )
  select c.id
  from public.clinics c
  join public.accounts a on a.id = c.account_id
  cross join req
  where a.owner_user_id = auth.uid()
    and req.raw ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and c.id = req.raw::uuid
$$;
