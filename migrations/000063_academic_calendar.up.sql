-- 000063_academic_calendar.up.sql â€” virtual school, Pillar 1: academic
-- sessions (school years) and terms. NULL institution_id = the platform-wide
-- YK-Virtual virtual school; a set institution_id scopes the calendar to one
-- partner school. Cohorts can optionally be scheduled against a term
-- (cohorts.term_id), which is what later pillars (timetable, gradebook,
-- transcripts) anchor to.
CREATE TABLE IF NOT EXISTS academic_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,               -- e.g. "2026/2027"
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'DRAFT'
        CHECK (status IN ('DRAFT','ACTIVE','CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (ends_on > starts_on)
);

-- Session names unique per scope (platform scope coalesced to the nil UUID so
-- NULL institution rows dedupe too).
CREATE UNIQUE INDEX IF NOT EXISTS ux_academic_sessions_scope_name
    ON academic_sessions (COALESCE(institution_id, '00000000-0000-0000-0000-000000000000'::uuid), name);
-- At most one ACTIVE session per scope (service checks first for a friendly
-- error; this index is the concurrency backstop).
CREATE UNIQUE INDEX IF NOT EXISTS ux_academic_sessions_one_active
    ON academic_sessions (COALESCE(institution_id, '00000000-0000-0000-0000-000000000000'::uuid))
    WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_academic_sessions_institution
    ON academic_sessions(institution_id);

CREATE TABLE IF NOT EXISTS academic_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,               -- e.g. "First Term" / "Autumn Term"
    number INT NOT NULL CHECK (number >= 1 AND number <= 6),
    starts_on DATE NOT NULL,
    ends_on DATE NOT NULL,
    -- Optional term-level enrolment window; NULL bound = open-ended on that
    -- side. NULL,NULL = enrol whenever the term is open for signups
    -- (same semantics as cohorts enrollment windows, migration 000060).
    enrollment_opens_at TIMESTAMPTZ,
    enrollment_closes_at TIMESTAMPTZ,
    status VARCHAR(16) NOT NULL DEFAULT 'UPCOMING'
        CHECK (status IN ('UPCOMING','ACTIVE','CLOSED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (ends_on > starts_on),
    CHECK (enrollment_opens_at IS NULL OR enrollment_closes_at IS NULL
           OR enrollment_closes_at > enrollment_opens_at),
    UNIQUE (session_id, number)
);

-- At most one ACTIVE term per session (backstop; service enforces first).
CREATE UNIQUE INDEX IF NOT EXISTS ux_academic_terms_one_active
    ON academic_terms(session_id) WHERE status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS idx_academic_terms_session
    ON academic_terms(session_id);

-- Cohorts can now be scheduled against a term (school-timetable anchor).
ALTER TABLE cohorts ADD COLUMN IF NOT EXISTS term_id UUID
    REFERENCES academic_terms(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_cohorts_term ON cohorts(term_id);
