-- 0011_pricing_tiers.sql — clinic-count pricing tiers with monthly + annual.
-- Replaces the solo/clinic/multibranch plan enum. Additive + migrates the one
-- existing clinic's plan so the clinics.plan FK stays satisfied.

-- 1. New tier columns (amounts nullable: tier_6plus is request-priced).
alter table public.billing_plans
  add column if not exists min_clinics integer,
  add column if not exists max_clinics integer,
  add column if not exists monthly_centavos integer,
  add column if not exists annual_centavos integer;

-- 2. Relax the legacy amount_centavos so request-priced tiers can exist.
alter table public.billing_plans alter column amount_centavos drop not null;
alter table public.billing_plans drop constraint if exists billing_plans_amount_centavos_check;

-- 3. Seed the new tiers.
insert into public.billing_plans
  (id, display_name, min_clinics, max_clinics, monthly_centavos, annual_centavos, amount_centavos, self_serve)
values
  ('tier_1',    '1 clinic',    1, 1,    69900,  700000,  69900,  true),
  ('tier_2_6',  '2–6 clinics', 2, 6,   149900, 1500000, 149900, true),
  ('tier_6plus','6+ clinics',  7, null, null,   null,    null,   false)
on conflict (id) do update set
  display_name     = excluded.display_name,
  min_clinics      = excluded.min_clinics,
  max_clinics      = excluded.max_clinics,
  monthly_centavos = excluded.monthly_centavos,
  annual_centavos  = excluded.annual_centavos,
  amount_centavos  = excluded.amount_centavos,
  self_serve       = excluded.self_serve,
  updated_at       = now();

-- 4. Migrate existing clinics off the old plan ids (all are 1 clinic -> tier_1).
update public.clinics
  set plan = 'tier_1'
  where plan in ('solo', 'clinic', 'multibranch');

-- 5. Drop the old plan rows now that nothing references them.
delete from public.billing_plans where id in ('solo', 'clinic', 'multibranch');
