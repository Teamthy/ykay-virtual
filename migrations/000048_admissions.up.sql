-- 000048_admissions.up.sql — virtual-school admissions applications
CREATE TABLE IF NOT EXISTS admissions_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    applicant_name VARCHAR(255) NOT NULL,
    current_level VARCHAR(100),
    preferred_term VARCHAR(100),
    notes TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING'
        CHECK (status IN ('PENDING','REVIEWING','OFFERED','ACCEPTED','REJECTED','WITHDRAWN')),
    reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admissions_institution ON admissions_applications(institution_id);
CREATE INDEX IF NOT EXISTS idx_admissions_parent ON admissions_applications(parent_user_id);
CREATE INDEX IF NOT EXISTS idx_admissions_student ON admissions_applications(student_profile_id);
CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions_applications(status);
