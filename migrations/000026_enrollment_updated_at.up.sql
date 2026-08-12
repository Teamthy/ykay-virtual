-- 000026: cohort_enrollments.updated_at — the repo's status update sets it
-- (found during the first real-Postgres deployment, phase 41).
ALTER TABLE cohort_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
