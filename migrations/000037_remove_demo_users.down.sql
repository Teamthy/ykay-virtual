-- 000037 (down) — restore demo identities. INTENTIONALLY a no-op.
--
-- Re-enabling known-credential demo accounts in production is the exact
-- vulnerability this migration exists to remove (YK-001). Do NOT restore
-- demo users via a schema migration. If a development/staging environment
-- genuinely needs throwaway identities, create them through a dedicated
-- secret-controlled fixture script with fresh credentials — never by rolling
-- back this safety migration.
SELECT 1;
