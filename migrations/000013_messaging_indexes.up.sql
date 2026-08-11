-- 000013_messaging_indexes: scale indexes for the messaging + notification
-- surfaces (10k-user target: conversation lists, unread counts, message paging).

CREATE INDEX IF NOT EXISTS idx_conversations_booking ON conversations (booking_id) WHERE booking_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_cohort ON conversations (cohort_id) WHERE cohort_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_participants_user ON conversation_participants (user_id, conversation_id);
CREATE INDEX IF NOT EXISTS idx_participants_conversation ON conversation_participants (conversation_id, user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_time ON messages (conversation_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications (user_id, is_read, created_at DESC);

-- Lessons for dashboards
CREATE INDEX IF NOT EXISTS idx_lesson_participants_student ON lesson_participants (student_profile_id, lesson_id);
