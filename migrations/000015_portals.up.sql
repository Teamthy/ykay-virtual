-- 000015_portals: portal support — submission idempotency, support list, stats indexes.

-- Submissions: one submission per student per assignment (upsert target).
ALTER TABLE submissions ADD CONSTRAINT submissions_assignment_student_key UNIQUE (assignment_id, student_profile_id);

CREATE INDEX IF NOT EXISTS idx_submissions_student ON submissions(student_profile_id, submitted_at DESC);

CREATE INDEX IF NOT EXISTS idx_lessons_start ON lessons (start_at) WHERE start_at >= NOW() - INTERVAL '1 day';

CREATE INDEX IF NOT EXISTS idx_support_status ON support_tickets (status, created_at DESC);
