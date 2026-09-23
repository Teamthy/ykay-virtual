-- 000078_lesson_player_notes: lesson bookmarks & timestamped notes (feature 5).
-- Distinct from `lesson_notes` (000006) which holds the tutor's post-lesson
-- summary. These are per-participant (parent/student/tutor) jump-to notes and
-- bookmarks inside the LMS lesson/recording player, shared with the other
-- participants of the same lesson.
CREATE TABLE IF NOT EXISTS lesson_player_notes (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id  UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       TEXT NOT NULL CHECK (role IN ('STUDENT','PARENT','TUTOR')),
    timestamp_sec INT NOT NULL DEFAULT 0 CHECK (timestamp_sec >= 0),
    is_bookmark  BOOLEAN NOT NULL DEFAULT FALSE,
    text       TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lesson_player_notes_lesson
    ON lesson_player_notes (lesson_id, timestamp_sec);
CREATE INDEX IF NOT EXISTS idx_lesson_player_notes_user
    ON lesson_player_notes (user_id, lesson_id);
