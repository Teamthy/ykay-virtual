-- 000030 — audit_logs_archive + index (G7.3 capacity).
-- audit_logs is the highest-volume table (~4-6M rows/year at 10k users);
-- the worker's archive_audit_logs job moves rows older than
-- AUDIT_RETENTION_DAYS (default 180) here in bounded batches.

CREATE TABLE IF NOT EXISTS audit_logs_archive (
    LIKE audit_logs INCLUDING ALL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_archive_created ON audit_logs_archive(created_at DESC);
