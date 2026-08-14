ALTER TABLE lessons
    DROP COLUMN IF EXISTS meeting_ref,
    DROP COLUMN IF EXISTS meeting_expires_at,
    DROP COLUMN IF EXISTS join_window_minutes;
