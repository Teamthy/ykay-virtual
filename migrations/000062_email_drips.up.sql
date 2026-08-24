-- 000062 — onboarding email drip tracking.
--
-- One row per (user, sequence, step) ever SENT. The UNIQUE constraint makes
-- a send idempotent at the storage layer: a cron retry after a crash can
-- never double-send. The daily/30-min sweep selects eligible users and
-- inserts the row in the same operation that delivers the email decision.

CREATE TABLE IF NOT EXISTS email_drips (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sequence   TEXT NOT NULL,
    step       INT  NOT NULL,
    sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, sequence, step)
);

CREATE INDEX IF NOT EXISTS idx_email_drips_lookup ON email_drips (sequence, step, sent_at DESC);
