-- ═══════════════════════════════════════════════════════════════════
-- SMART DENTAL — Migration 005: Configurable logo size
-- Run this in Supabase SQL Editor (project > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════

-- Store the clinic logo size (in CSS pixels) so the prescription and
-- receipt headers render at the size set in the Settings preview.
-- Default 56px matches the previous hard-coded value.
alter table clinic_settings
  add column if not exists logo_size_px integer not null default 56;

-- ═══════════════════════════════════════════════════════════════════
-- DONE.
-- ═══════════════════════════════════════════════════════════════════
