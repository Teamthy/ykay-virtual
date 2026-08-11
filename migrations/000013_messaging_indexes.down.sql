-- 000013_messaging_indexes: rollback

DROP INDEX IF EXISTS idx_conversations_booking;
DROP INDEX IF EXISTS idx_conversations_cohort;
DROP INDEX IF EXISTS idx_participants_user;
DROP INDEX IF EXISTS idx_participants_conversation;
DROP INDEX IF EXISTS idx_messages_conversation_time;
DROP INDEX IF EXISTS idx_notifications_user_read;
DROP INDEX IF EXISTS idx_lesson_participants_student;
