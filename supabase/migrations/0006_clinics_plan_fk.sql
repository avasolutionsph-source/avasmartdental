-- 0006_clinics_plan_fk.sql — clinics.plan must reference the price table.
-- Enables PostgREST embedding of billing_plans on clinics, and guarantees a
-- clinic's plan id always exists in billing_plans (referential integrity).
alter table public.clinics
  drop constraint if exists clinics_plan_fkey;
alter table public.clinics
  add constraint clinics_plan_fkey
  foreign key (plan) references public.billing_plans (id);
