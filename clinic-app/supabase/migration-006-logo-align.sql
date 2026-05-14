-- ═══════════════════════════════════════════════════════════════════
-- SMART DENTAL — Migration 006: Configurable logo alignment
-- Run this in Supabase SQL Editor (project > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════

-- Position the clinic logo on prescriptions and receipts. 'left' keeps
-- the previous default (logo on the left, text right-aligned).
alter table clinic_settings
  add column if not exists logo_align text not null default 'left'
  check (logo_align in ('left', 'center', 'right'));

-- ═══════════════════════════════════════════════════════════════════
-- DONE.
-- ═══════════════════════════════════════════════════════════════════
