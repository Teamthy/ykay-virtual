-- 000031 — first-time onboarding flag (3-page wizard completion marker).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS onboarded_at TIMESTAMPTZ;
