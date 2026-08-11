-- 000016_learning: rollback

DROP TABLE IF EXISTS learner_assessment_attempts;
DROP TABLE IF EXISTS learner_assessment_questions;
DROP TABLE IF EXISTS learner_assessments;
DROP INDEX IF EXISTS idx_progress_reports_student;
DROP INDEX IF EXISTS idx_progress_reports_tutor;
DROP INDEX IF EXISTS idx_orders_created;
DROP INDEX IF EXISTS idx_enrollments_created;
DROP INDEX IF EXISTS idx_users_created;
DROP INDEX IF EXISTS idx_payments_order;
