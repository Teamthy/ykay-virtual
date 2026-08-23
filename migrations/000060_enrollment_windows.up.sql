-- 000060_enrollment_windows: FR-25 — cohorts get an optional enrolment
-- window. NULL opens_at = open as soon as published; NULL closes_at = open
-- until the cohort's end_date (mid-cohort join allowed). CanEnrollAt() in
-- internal/domain/booking enforces the window server-side at booking time.
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS enrollment_opens_at TIMESTAMPTZ;
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS enrollment_closes_at TIMESTAMPTZ;
