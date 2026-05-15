-- ════════════════════════════════════════════════════════════════════
--  MULTI-TENANT MIGRATION
-- ════════════════════════════════════════════════════════════════════
--
-- Before this migration: all clinic-app tables had RLS enabled but with
-- `using (true)` policies — any authenticated user could read/write all
-- rows from every clinic. This is a data leak the moment a second
-- clinic signs up.
--
-- This migration:
--   1. Adds `clinic_id uuid` to every clinic-data table, defaulting to
--      `public.current_clinic_id()` so inserts auto-scope to the
--      signed-in user's clinic.
--   2. Drops every wide-open policy and replaces it with
--      `clinic_id = current_clinic_id()` policies.
--   3. Auto-provisions clinic_settings + default payment_terms when a
--      new clinic is created (extension of the handle_new_user flow).
--
-- Safe to re-run (uses if-not-exists, drop-if-exists patterns).
-- ════════════════════════════════════════════════════════════════════


-- ── Helper: which clinic does the signed-in user own? ────────────────
-- Used by every RLS policy below. Stable within a transaction.
create or replace function public.current_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id
    from public.clinics
   where owner_user_id = auth.uid()
   limit 1
$$;

grant execute on function public.current_clinic_id() to anon, authenticated;


-- ── Wipe seed rows that have no clinic_id ────────────────────────────
-- The original migration.sql inserted a single clinic_settings row
-- (id = 1) and 4 default payment_terms. With multi-tenant these now
-- need to be per-clinic — handled by the on_clinic_created trigger
-- below. Delete the global versions first; we'll recreate them
-- per-clinic during backfill.
delete from public.payment_terms;

-- clinic_settings was designed as a single-row table:
--   id int primary key default 1 check (id = 1)
-- In multi-tenant, there's one row per clinic keyed by clinic_id, so
-- drop the legacy id column + PK entirely. clinic_id will become the
-- primary key further down. Wipe existing rows since they have no
-- clinic_id.
alter table public.clinic_settings drop constraint if exists clinic_settings_id_check;
alter table public.clinic_settings drop constraint if exists clinic_settings_pkey;
alter table public.clinic_settings drop column if exists id;
delete from public.clinic_settings;


-- ════════════════════════════════════════════════════════════════════
--  Add clinic_id + tenant-scoped RLS to every clinic-data table.
--  Wrapped in a DO block so we can iterate the table list and stay DRY.
-- ════════════════════════════════════════════════════════════════════
do $$
declare
  tbl text;
  clinic_tables text[] := array[
    'dentists', 'patients', 'medical_histories', 'consent_forms',
    'dental_charts', 'tooth_records', 'treatments', 'invoices',
    'invoice_items', 'installment_plans', 'installment_schedule',
    'payments', 'appointments', 'file_assets', 'drugs', 'prescriptions',
    'services', 'clinic_settings', 'payment_terms', 'notifications',
    'expense_categories', 'expenses'
  ];
begin
  foreach tbl in array clinic_tables loop

    -- 1. Add clinic_id column (idempotent via if-not-exists).
    execute format(
      'alter table public.%I add column if not exists clinic_id uuid '
      'references public.clinics(id) on delete cascade',
      tbl
    );

    -- 2. Default = current_clinic_id() so inserts auto-scope.
    execute format(
      'alter table public.%I alter column clinic_id '
      'set default public.current_clinic_id()',
      tbl
    );

    -- 3. Backfill: any pre-existing rows (e.g. from manual seeding) get
    --    assigned to the first clinic. In a fresh DB after the 9
    --    migrations + one test signup, only seed data hits this; in a
    --    production migration with real data, this is the moment of
    --    truth — single tenant only.
    execute format(
      'update public.%I set clinic_id = '
      '  (select id from public.clinics limit 1) '
      'where clinic_id is null',
      tbl
    );

    -- 4. Index for RLS performance.
    execute format(
      'create index if not exists %I on public.%I (clinic_id)',
      'idx_' || tbl || '_clinic_id', tbl
    );

    -- 5. Drop the wide-open "Allow all *" policies that the original
    --    migration created.
    execute format(
      'drop policy if exists "Allow all select on %I" on public.%I', tbl, tbl
    );
    execute format(
      'drop policy if exists "Allow all insert on %I" on public.%I', tbl, tbl
    );
    execute format(
      'drop policy if exists "Allow all update on %I" on public.%I', tbl, tbl
    );
    execute format(
      'drop policy if exists "Allow all delete on %I" on public.%I', tbl, tbl
    );

    -- 6. Replace with tenant-scoped policies. `auth.uid()` is null for
    --    anonymous requests, so current_clinic_id() returns NULL and
    --    `clinic_id = NULL` is never true → anons read nothing.
    execute format(
      'create policy "tenant_select" on public.%I for select '
      'using (clinic_id = public.current_clinic_id())',
      tbl
    );
    execute format(
      'create policy "tenant_insert" on public.%I for insert '
      'with check (clinic_id = public.current_clinic_id())',
      tbl
    );
    execute format(
      'create policy "tenant_update" on public.%I for update '
      'using (clinic_id = public.current_clinic_id()) '
      'with check (clinic_id = public.current_clinic_id())',
      tbl
    );
    execute format(
      'create policy "tenant_delete" on public.%I for delete '
      'using (clinic_id = public.current_clinic_id())',
      tbl
    );

  end loop;
end $$;


-- ── NOT NULL after backfill ──────────────────────────────────────────
-- Done in a second loop so the backfill above has a chance to run on
-- every table first (if any one table fails NOT NULL, the whole
-- migration aborts and you can see exactly which table has orphan data).
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'dentists', 'patients', 'medical_histories', 'consent_forms',
    'dental_charts', 'tooth_records', 'treatments', 'invoices',
    'invoice_items', 'installment_plans', 'installment_schedule',
    'payments', 'appointments', 'file_assets', 'drugs', 'prescriptions',
    'services', 'clinic_settings', 'payment_terms', 'notifications',
    'expense_categories', 'expenses'
  ] loop
    execute format(
      'alter table public.%I alter column clinic_id set not null',
      tbl
    );
  end loop;
end $$;


-- ── clinic_settings: clinic_id becomes the primary key ──────────────
-- After dropping the legacy `id` column above, the table is now keyed
-- solely by clinic_id. PK gives us UNIQUE + NOT NULL for free, so
-- exactly one settings row per clinic is enforced.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'clinic_settings_pkey'
       and conrelid = 'public.clinic_settings'::regclass
  ) then
    alter table public.clinic_settings add primary key (clinic_id);
  end if;
end $$;


-- ════════════════════════════════════════════════════════════════════
--  Auto-provision per-clinic defaults when a clinic is created.
-- ════════════════════════════════════════════════════════════════════
create or replace function public.handle_new_clinic()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- One clinic_settings row, seeded with the clinic name from signup.
  insert into public.clinic_settings (clinic_id, clinic_name)
  values (new.id, new.name)
  on conflict (clinic_id) do nothing;

  -- Default payment terms catalog.
  insert into public.payment_terms (clinic_id, name, months, description)
  values
    (new.id, 'Full Payment', 1, 'Full payment due on receipt'),
    (new.id, '2 Months',     2, 'Split into 2 monthly payments'),
    (new.id, '3 Months',     3, 'Split into 3 monthly payments'),
    (new.id, '6 Months',     6, 'Split into 6 monthly payments');

  return new;
end;
$$;

drop trigger if exists on_clinic_created on public.clinics;
create trigger on_clinic_created
  after insert on public.clinics
  for each row execute function public.handle_new_clinic();


-- ── Backfill defaults for clinics that existed BEFORE this migration ─
-- (in case any clinics row exists without matching settings/payment_terms)
insert into public.clinic_settings (clinic_id, clinic_name)
select c.id, c.name
  from public.clinics c
 where not exists (
   select 1 from public.clinic_settings cs where cs.clinic_id = c.id
 );

insert into public.payment_terms (clinic_id, name, months, description)
select c.id, t.name, t.months, t.description
  from public.clinics c
 cross join (values
   ('Full Payment'::text, 1, 'Full payment due on receipt'::text),
   ('2 Months',           2, 'Split into 2 monthly payments'),
   ('3 Months',           3, 'Split into 3 monthly payments'),
   ('6 Months',           6, 'Split into 6 monthly payments')
 ) as t(name, months, description)
 where not exists (
   select 1 from public.payment_terms pt
    where pt.clinic_id = c.id and pt.name = t.name
 );
