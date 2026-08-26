-- 000067_plus_advisor.up.sql — NUVORA Plus: named Learning Advisor + learning plan.
--
-- Plus families get a named advisor (a staff member) who manages their learning
-- journey and is the routing target for Plus support. Each Plus user can also
-- carry a personalised learning plan (diagnostic-derived or advisor-authored)
-- surfaced on the Plus dashboard.

CREATE TABLE IF NOT EXISTS plus_advisors (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- Plus subscriber/family
    advisor_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE, -- staff advisor
    note           TEXT,
    assigned_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_plus_advisors_advisor ON plus_advisors(advisor_user_id);

CREATE TABLE IF NOT EXISTS plus_learning_plans (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    goals             TEXT,
    focus_areas       TEXT,      -- comma/newline separated
    recommendations   TEXT,
    status            VARCHAR(16) NOT NULL DEFAULT 'DRAFT'
                      CHECK (status IN ('DRAFT','ACTIVE','COMPLETED')),
    created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, student_profile_id)
);
CREATE INDEX IF NOT EXISTS idx_plus_learning_plans_user ON plus_learning_plans(user_id);
