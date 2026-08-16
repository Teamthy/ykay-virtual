-- 000035 — on-demand video lessons + per-student lesson progress.
--
-- Adds a `video_url` to lessons so a cohort can carry a pre-recorded lesson
-- (MP4 / hosted video link) that students watch in-app, in addition to live
-- meeting links. A `lesson_progress` table tracks each student's watch state
-- (watched + last position) so the LMS can show completion and resume.

ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Per-student lesson progress.
CREATE TABLE IF NOT EXISTS lesson_progress (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id         UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    watched           BOOLEAN NOT NULL DEFAULT FALSE,
    position_seconds  INT NOT NULL DEFAULT 0,
    watched_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (lesson_id, student_profile_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress (student_profile_id, watched);
