-- 000047_certificates.up.sql — learner completion certificates
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    learner_name VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    programme_title VARCHAR(255),
    credential_number VARCHAR(64) NOT NULL UNIQUE,
    issued_by VARCHAR(255) NOT NULL DEFAULT 'NUVORA Academy',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_certificates_cohort ON certificates(cohort_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_student_cohort
    ON certificates(student_profile_id, cohort_id)
    WHERE cohort_id IS NOT NULL;
