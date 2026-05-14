-- ═══════════════════════════════════════════════════════════════════
-- SMART DENTAL — Migration 007: Free-form logo positioning
-- Run this in Supabase SQL Editor (project > SQL Editor > New Query)
-- ═══════════════════════════════════════════════════════════════════

-- Replace the discrete logo_align (left/center/right) with continuous
-- horizontal % and vertical px sliders. Existing rows get a sensible
-- default mapped from logo_align.
alter table clinic_settings
  add column if not exists logo_pos_x_pct integer not null default 0
  check (logo_pos_x_pct between 0 and 100);

alter table clinic_settings
  add column if not exists logo_pos_y_px integer not null default 0
  check (logo_pos_y_px between -200 and 200);

-- Backfill from logo_align so existing alignment is preserved.
update clinic_settings set logo_pos_x_pct = case
  when logo_align = 'right' then 100
  when logo_align = 'center' then 50
  else 0
end
where logo_pos_x_pct = 0;

-- ═══════════════════════════════════════════════════════════════════
-- DONE.
-- ═══════════════════════════════════════════════════════════════════
