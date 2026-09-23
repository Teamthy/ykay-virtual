-- 000077_tutor_availability_active: tutor availability matching (feature 4).
-- The base `tutor_availabilities` table (000004) stores recurring weekly slots.
-- Add an explicit `active` flag so a tutor can pause a slot without deleting it
-- (the spec's (tutor, weekday, start, end, active) shape), and index weekday
-- for the real-slot matching query used by the booking flows.
ALTER TABLE tutor_availabilities
    ADD COLUMN IF NOT EXISTS active BOOLEAN NOT NULL DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_tutor_availabilities_lookup
    ON tutor_availabilities (tutor_profile_id, day_of_week) WHERE active = TRUE;
