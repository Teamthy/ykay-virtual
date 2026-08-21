-- 000059_practice_exams: CBT practice exams for students + tutor-authored
-- school/college exam papers.
--   - practice_exams: one exam owned by a tutor profile; optionally scoped to
--     a cohort (NULL = open to every student). Status ACTIVE|ARCHIVED.
--   - practice_questions: ordered questions with JSON options and the
--     correct index (never served to the student before submission).
--   - practice_attempts: one timed sitting per attempt; answers, score and
--     pass/fail are written on submit (or on expiry auto-submit).
CREATE TABLE IF NOT EXISTS practice_exams (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id         UUID NOT NULL,
    subject          TEXT NOT NULL,
    title            TEXT NOT NULL,
    description      TEXT NOT NULL DEFAULT '',
    duration_minutes INT  NOT NULL DEFAULT 30 CHECK (duration_minutes BETWEEN 1 AND 180),
    passing_score    INT  NOT NULL DEFAULT 60 CHECK (passing_score BETWEEN 0 AND 100),
    cohort_id        UUID,
    status           TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','ARCHIVED')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_practice_exams_tutor ON practice_exams(tutor_id);
CREATE INDEX IF NOT EXISTS idx_practice_exams_status ON practice_exams(status);

CREATE TABLE IF NOT EXISTS practice_questions (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id       UUID NOT NULL REFERENCES practice_exams(id) ON DELETE CASCADE,
    position      INT  NOT NULL,
    text          TEXT NOT NULL,
    options       JSONB NOT NULL,
    correct_index INT  NOT NULL CHECK (correct_index >= 0),
    explanation   TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_practice_questions_exam ON practice_questions(exam_id);

CREATE TABLE IF NOT EXISTS practice_attempts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_id     UUID NOT NULL REFERENCES practice_exams(id) ON DELETE CASCADE,
    student_id  UUID NOT NULL,
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL,
    submitted_at TIMESTAMPTZ,
    answers     JSONB,
    score       INT CHECK (score BETWEEN 0 AND 100),
    passed      BOOLEAN,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_student ON practice_attempts(student_id);
CREATE INDEX IF NOT EXISTS idx_practice_attempts_exam ON practice_attempts(exam_id);
