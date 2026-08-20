-- Indexes for batched list queries (parent dashboard, attendance summary).
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_profile_id);
