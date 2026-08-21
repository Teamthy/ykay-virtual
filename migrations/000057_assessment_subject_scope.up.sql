-- 000057_assessment_subject_scope: every tutor-authored exam is scoped to
-- one of the tutor's onboarded subjects (policy: a tutor's tests reflect the
-- subjects they were vetted to teach).

ALTER TABLE learner_assessments ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_learner_assessments_subject ON learner_assessments (subject_id);
