-- 000028 — meeting-link lifecycle fields (G4.2).
-- meeting_url/meeting_provider already exist from the original lessons
-- table; this adds the provider reference (idempotent refresh), link expiry
-- and the configurable join window.

ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS meeting_ref TEXT,
    ADD COLUMN IF NOT EXISTS meeting_expires_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS join_window_minutes INTEGER NOT NULL DEFAULT 15;
