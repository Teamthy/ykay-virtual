-- 000070_dashboard_insights.up.sql — dashboard features: lesson feedback,
-- leaderboard opt-in, and per-user dashboard preferences.
--
-- lesson_feedback — a learner rates a lesson they attended (post-lesson
-- satisfaction, 1-5 stars + optional comment). One per learner+lesson.
-- leaderboard_opt_in — whether a user is visible on cohort leaderboards
-- (default off = safeguarding-friendly; users choose to compete).
-- dashboard_prefs — customizable widget visibility + weekly goal.

CREATE TABLE IF NOT EXISTS lesson_feedback (
    id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id        UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    rating           INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment          TEXT,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (lesson_id, student_profile_id)
);
CREATE INDEX IF NOT EXISTS idx_lesson_feedback_lesson ON lesson_feedback(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_feedback_student ON lesson_feedback(student_profile_id);

CREATE TABLE IF NOT EXISTS dashboard_prefs (
    user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    leaderboard_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
    weekly_goal      INT NOT NULL DEFAULT 3,          -- lessons/week goal
    widgets          JSONB NOT NULL DEFAULT '[]',     -- visible widget keys
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
