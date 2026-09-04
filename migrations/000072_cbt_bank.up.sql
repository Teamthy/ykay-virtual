-- Shared CBT practice bank: exam-style questions across subjects, seeded from
-- the single-source cbt-bank.csv (same file seeds the college site). Papers
-- are generated per request (random subset per student) and graded on the
-- server — the correct index never ships in the generated paper.
CREATE TABLE IF NOT EXISTS cbt_subjects (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    class_level TEXT NOT NULL DEFAULT 'ss2',
    department  TEXT NOT NULL DEFAULT 'general',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cbt_questions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id    UUID NOT NULL REFERENCES cbt_subjects(id) ON DELETE CASCADE,
    topic         TEXT NOT NULL DEFAULT 'General',
    difficulty    INT  NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
    stem          TEXT NOT NULL,
    options       JSONB NOT NULL,
    correct_index INT  NOT NULL CHECK (correct_index BETWEEN 0 AND 5),
    explanation   TEXT NOT NULL DEFAULT '',
    source        TEXT NOT NULL DEFAULT 'curriculum',
    status        TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published')),
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (subject_id, stem)
);

CREATE INDEX IF NOT EXISTS idx_cbt_questions_subject_status ON cbt_questions(subject_id, status);
