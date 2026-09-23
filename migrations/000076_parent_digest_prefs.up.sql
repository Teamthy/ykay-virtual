-- 000076_parent_digest_prefs: weekly parent progress digest (feature 3).
-- One row per parent; the worker collects each child's activity since
-- `last_sent_at` and emails via the existing Resend path. `enabled` is the
-- dashboard toggle. No fabricated metrics — a child with no activity is either
-- skipped or reported plainly.
CREATE TABLE IF NOT EXISTS parent_digest_prefs (
    parent_user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    enabled        BOOLEAN NOT NULL DEFAULT TRUE,
    last_sent_at   TIMESTAMPTZ,
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
