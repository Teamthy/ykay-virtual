-- 000079_cohort_waitlist: cohort waitlist alerts (feature 6).
-- When a cohort is full, learners join a waitlist (ordered by position). When a
-- seat opens (cancellation or admin adds seats) the front of the waitlist is
-- notified via the existing notification/email path. `notified_at` makes the
-- notification idempotent (a seat opening never double-notifies the same row).
CREATE TABLE IF NOT EXISTS cohort_waitlist (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cohort_id    UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    position     INT  NOT NULL,
    notified_at  TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (cohort_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_cohort_waitlist_cohort
    ON cohort_waitlist (cohort_id, position);
