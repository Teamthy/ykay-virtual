-- 000024_schema_fixes: real-Postgres compatibility fixes found during the
-- first live deployment (phase 41).
--  1. subjects.updated_at — the repo scans it (entity has the field).
--  2. auth_tokens purpose CHECK — extend with LOGIN_CODE (phase 18 flow).
--  3. (locations area/city/state) fixed in code — schema is hierarchical
--     (name/type/parent); the repo now searches locations.name instead.

ALTER TABLE subjects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_purpose_check;
ALTER TABLE auth_tokens ADD CONSTRAINT auth_tokens_purpose_check
    CHECK (purpose IN ('VERIFY_EMAIL','PASSWORD_RESET','LOGIN_CODE'));
