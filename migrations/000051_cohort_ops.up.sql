ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS code VARCHAR(16);
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS banner_url TEXT;

UPDATE cohorts
SET code = 'NV-' || UPPER(SUBSTRING(REPLACE(id::text, '-', ''), 1, 8))
WHERE code IS NULL OR code = '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_cohorts_code ON cohorts (code);

CREATE TABLE IF NOT EXISTS cohort_join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','REJECTED')),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES users(id),
    UNIQUE (cohort_id, tutor_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_cohort_join_requests_status ON cohort_join_requests (status, created_at DESC);
