-- 000074_learning_mastery: foundation read-models for the topic-mastery heatmap
-- (feature 2) and the adaptive revision planner (feature 1).
--   - learning_topic_results: append-only per-question outcomes from CBT /
--     practice / past-paper attempts, so mastery and weak-topic seeding have a
--     real source of truth. Never fabricated; only written when a graded result
--     is known.
--   - topic_mastery: a maintained read-model per (student, subject, topic)
--     recomputed from learning_topic_results (attempts, correct, mastery %).
CREATE TABLE IF NOT EXISTS learning_topic_results (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    subject            TEXT NOT NULL,
    topic              TEXT NOT NULL,
    correct            BOOLEAN NOT NULL,
    source             TEXT NOT NULL DEFAULT 'cbt' CHECK (source IN ('cbt','practice','pastpaper','diagnostic')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lt_results_student_subject
    ON learning_topic_results (student_profile_id, subject, topic);

CREATE TABLE IF NOT EXISTS topic_mastery (
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    subject            TEXT NOT NULL,
    topic              TEXT NOT NULL,
    attempts           INT  NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    correct            INT  NOT NULL DEFAULT 0 CHECK (correct >= 0),
    mastery            INT  NOT NULL DEFAULT 0 CHECK (mastery BETWEEN 0 AND 100),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (student_profile_id, subject, topic)
);
