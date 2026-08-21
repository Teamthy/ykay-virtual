-- 000057_assessment_subject_scope.down

DROP INDEX IF EXISTS idx_learner_assessments_subject;
ALTER TABLE learner_assessments DROP COLUMN IF EXISTS subject_id;
