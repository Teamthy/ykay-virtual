-- 000068_diagnostic_plan.down.sql
ALTER TABLE plus_learning_plans DROP COLUMN IF EXISTS source;
ALTER TABLE learner_assessments DROP COLUMN IF EXISTS is_diagnostic;
