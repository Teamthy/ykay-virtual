-- 000015_portals: rollback

ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_assignment_student_key;
DROP INDEX IF EXISTS idx_submissions_student;
DROP INDEX IF EXISTS idx_lessons_start;
DROP INDEX IF EXISTS idx_support_status;
