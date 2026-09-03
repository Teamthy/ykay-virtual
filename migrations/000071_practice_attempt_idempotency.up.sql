-- One open practice sitting per student/exam. Service code auto-marks expired
-- open attempts before opening a fresh sitting, and submit uses a compare-and-
-- set UPDATE so double submits replay the original result instead of overwriting.
CREATE UNIQUE INDEX IF NOT EXISTS practice_attempts_one_open_per_student_exam
  ON practice_attempts (student_id, exam_id)
  WHERE submitted_at IS NULL;
