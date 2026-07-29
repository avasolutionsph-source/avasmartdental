-- 0024_safe_clinic_header_case.sql — 0023's regex-in-WHERE did not stop the
-- ::uuid cast (Postgres doesn't guarantee WHERE short-circuit, so a malformed
-- x-clinic-id still errored: 22P02). Use a CASE, which IS guaranteed to only
-- evaluate the matching branch, so the cast runs ONLY on a uuid-shaped header;
-- anything else becomes NULL -> no row -> clean RLS deny, never an error.
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
    and c.id = case
      when req.raw ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
      then req.raw::uuid
      else null
    end
$$;
