-- ═══════════════════════════════════════════════════════════════════
-- SMART DENTAL — Migration 004: Per-tooth photo references
-- Run this in Supabase SQL Editor (project > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════

-- Add a nullable tooth_number column to file_assets so a photo can be
-- attached to a specific tooth on a patient's dental chart. Existing
-- rows (xrays, documents, full-mouth photos) keep tooth_number NULL.
alter table file_assets
  add column if not exists tooth_number int;

create index if not exists idx_file_assets_patient_tooth
  on file_assets(patient_id, tooth_number);

-- ═══════════════════════════════════════════════════════════════════
-- DONE.
-- ═══════════════════════════════════════════════════════════════════
