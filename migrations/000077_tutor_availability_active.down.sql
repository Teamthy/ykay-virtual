-- 000077_tutor_availability_active down
DROP INDEX IF EXISTS idx_tutor_availabilities_lookup;
ALTER TABLE tutor_availabilities DROP COLUMN IF EXISTS active;
