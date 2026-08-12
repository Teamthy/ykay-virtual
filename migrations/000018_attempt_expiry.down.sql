ALTER TABLE learner_assessment_attempts DROP CONSTRAINT learner_assessment_attempts_status_check;
ALTER TABLE learner_assessment_attempts ADD CONSTRAINT learner_assessment_attempts_status_check
    CHECK (status IN ('IN_PROGRESS','COMPLETED'));
