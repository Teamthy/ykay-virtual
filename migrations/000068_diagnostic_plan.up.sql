-- 000068_diagnostic_plan.up.sql — NUVORA Plus diagnostic → learning-plan engine.
--
-- Marks learner assessments as "diagnostics": when a learner completes a
-- diagnostic, the platform auto-authors a personalised Plus learning plan from
-- the score + subject (diagnostic→learning-plan). plus_learning_plans gains a
-- `source` so auto-generated plans are distinguishable from advisor-authored ones.

ALTER TABLE learner_assessments ADD COLUMN IF NOT EXISTS is_diagnostic BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE plus_learning_plans ADD COLUMN IF NOT EXISTS source VARCHAR(32) NOT NULL DEFAULT 'MANUAL';
