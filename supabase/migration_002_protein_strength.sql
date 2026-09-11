-- Run this in Supabase SQL Editor as a NEW snippet — this is a migration for a database
-- that already has the original schema.sql applied. Don't re-run the full schema.sql,
-- just this file, once.

alter table profiles add column if not exists protein_target_g numeric default 46;

alter table logs drop constraint if exists logs_tracker_check;
alter table logs add constraint logs_tracker_check
  check (tracker in ('water', 'sugar', 'fiber', 'protein', 'movement', 'strength', 'artificial_sweetener', 'meal_source'));
