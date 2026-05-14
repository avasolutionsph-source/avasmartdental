-- ═══════════════════════════════════════════════════════════════════
-- SMART DENTAL — Migration 003: Recall Date on patients
-- Run this in Supabase SQL Editor (project > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════

-- Add a nullable recall_date so the clinic can track when each
-- patient should come back. Existing rows default to NULL.
alter table patients
  add column if not exists recall_date date;

create index if not exists idx_patients_recall_date on patients(recall_date);

-- ═══════════════════════════════════════════════════════════════════
-- DONE.
-- ═══════════════════════════════════════════════════════════════════
