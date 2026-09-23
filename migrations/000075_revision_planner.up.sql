-- 000075_revision_planner: adaptive revision planner (feature 1).
--   - revision_plans: one active plan per (learner, subject, exam) with a study
--     window; status DRAFT|ACTIVE|ARCHIVED.
--   - revision_plan_tasks: units/topics scheduled inside the window, with a
--     priority and a `source` distinguishing the initial seed from later
--     rebalances ('seeded' | 'rebalanced').
CREATE TABLE IF NOT EXISTS revision_plans (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    subject            TEXT NOT NULL,
    exam               TEXT NOT NULL DEFAULT '',
    window_start       DATE NOT NULL,
    window_end         DATE NOT NULL,
    status             TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT','ACTIVE','ARCHIVED')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (window_end >= window_start)
);
CREATE INDEX IF NOT EXISTS idx_revision_plans_student ON revision_plans (student_profile_id, status);

CREATE TABLE IF NOT EXISTS revision_plan_tasks (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id      UUID NOT NULL REFERENCES revision_plans(id) ON DELETE CASCADE,
    topic        TEXT NOT NULL,
    window_start DATE NOT NULL,
    window_end   DATE NOT NULL,
    status       TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','DONE','SKIPPED')),
    priority     INT  NOT NULL DEFAULT 2 CHECK (priority BETWEEN 1 AND 3),
    source       TEXT NOT NULL DEFAULT 'seeded' CHECK (source IN ('seeded','rebalanced')),
    completed_at TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (window_end >= window_start)
);
CREATE INDEX IF NOT EXISTS idx_revision_tasks_plan ON revision_plan_tasks (plan_id, status);
