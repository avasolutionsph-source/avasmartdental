-- ═══════════════════════════════════════════════════════════════════
-- SMART DENTAL — Migration 002: Expenses + Expense Categories
-- Run this in Supabase SQL Editor (project > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════

-- ─── Expense Categories ─────────────────────────────────────────
create table if not exists expense_categories (
  category_id  bigint generated always as identity primary key,
  name         text not null unique,
  color        text not null default '#6366f1',
  created_at   timestamptz not null default now()
);

-- ─── Expenses ───────────────────────────────────────────────────
create table if not exists expenses (
  expense_id      bigint generated always as identity primary key,
  category_id     bigint references expense_categories(category_id) on delete set null,
  date            date not null,
  amount_int      bigint not null default 0,        -- centavos (PHP × 100)
  payment_method  text not null default 'cash',     -- free-form (matches PSC value names)
  remarks         text not null default '',
  created_at      timestamptz not null default now()
);

create index if not exists idx_expenses_date on expenses(date);
create index if not exists idx_expenses_category on expenses(category_id);

-- ─── RLS ────────────────────────────────────────────────────────
alter table expense_categories enable row level security;
alter table expenses enable row level security;

-- Open access (mirrors the policy pattern in migration.sql)
do $$
declare
  tbl text;
begin
  for tbl in select unnest(array['expense_categories','expenses']) loop
    execute format('drop policy if exists "Allow all select on %I" on %I', tbl, tbl);
    execute format('drop policy if exists "Allow all insert on %I" on %I', tbl, tbl);
    execute format('drop policy if exists "Allow all update on %I" on %I', tbl, tbl);
    execute format('drop policy if exists "Allow all delete on %I" on %I', tbl, tbl);

    execute format('create policy "Allow all select on %I" on %I for select using (true)', tbl, tbl);
    execute format('create policy "Allow all insert on %I" on %I for insert with check (true)', tbl, tbl);
    execute format('create policy "Allow all update on %I" on %I for update using (true) with check (true)', tbl, tbl);
    execute format('create policy "Allow all delete on %I" on %I for delete using (true)', tbl, tbl);
  end loop;
end $$;

-- ═══════════════════════════════════════════════════════════════════
-- DONE.
-- ═══════════════════════════════════════════════════════════════════
