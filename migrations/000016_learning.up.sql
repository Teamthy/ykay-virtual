-- 000016_learning: learner assessments (auto-graded), progress reports API
-- support, analytics indexes (Learning, Assessment & Reporting system).

-- Learner assessments: tutor-authored quizzes attached to cohorts/lessons.
CREATE TABLE learner_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    pass_threshold DECIMAL(5,2) NOT NULL DEFAULT 0.5,
    due_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('DRAFT','PUBLISHED','CLOSED')),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE learner_assessment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES learner_assessments(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,
    correct_index INT NOT NULL CHECK (correct_index >= 0),
    explanation TEXT,
    sort_order INT NOT NULL DEFAULT 0
);

CREATE TABLE learner_assessment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID NOT NULL REFERENCES learner_assessments(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','COMPLETED')),
    score DECIMAL(5,2),
    max_score DECIMAL(5,2),
    passed BOOLEAN,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (assessment_id, student_profile_id)
);

CREATE INDEX idx_learner_assessments_cohort ON learner_assessments(cohort_id);
CREATE INDEX idx_learner_attempts_student ON learner_assessment_attempts(student_profile_id);
CREATE INDEX idx_learner_attempts_assessment ON learner_assessment_attempts(assessment_id);

-- Progress reports: release by tutor → visible to student + linked parent.
CREATE INDEX IF NOT EXISTS idx_progress_reports_student ON progress_reports(student_profile_id, period_start DESC);
CREATE INDEX IF NOT EXISTS idx_progress_reports_tutor ON progress_reports(tutor_profile_id);

-- Analytics
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_enrollments_created ON cohort_enrollments(enrolled_at);
CREATE INDEX IF NOT EXISTS idx_users_created ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);
