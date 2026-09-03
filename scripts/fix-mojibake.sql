-- =============================================================================
-- YK-Virtual — one-time data repair: un-corrupt mojibake'd em dashes (2026-08-16)
--
-- WHAT HAPPENED
--   scripts/seed-prod-demo.sql contains proper UTF-8 em dashes ("—") in four
--   columns (programmes.title, cohorts.title, lessons.title, blog_posts.title).
--   It was applied with `psql -f` on Windows, whose default client encoding is
--   WIN1252, so the UTF-8 bytes of "—" (E2 80 94) were mis-decoded and stored
--   as "â€”" (â = U+00E2, € = U+20AC, ” = U+201D). Every page rendering those
--   titles shows "â€”" instead of "—".
--
-- WHAT THIS DOES
--   Replaces the corrupted 3-character sequence with the real em dash, using
--   chr() so this file is pure ASCII and can NEVER itself be corrupted by a
--   wrong client encoding. Idempotent: re-running it does nothing once the
--   corrupted rows are fixed.
--
-- RUN (from the repo root, or anywhere you can reach the Render DB):
--   psql "$DATABASE_URL" -f scripts/fix-mojibake.sql
-- (Set PGCLIENTENCODING=UTF8 if you're on Windows — though this file is
--  ASCII-only, so it's safe either way.)

SET client_encoding = 'UTF8';

-- 'â€”'  = chr(226) || chr(8364) || chr(8221)   (â  €  ”)
-- '—'    = chr(8212)
BEGIN;

UPDATE programmes  SET title = replace(title, chr(226)||chr(8364)||chr(8221), chr(8212)) WHERE title LIKE '%'||chr(226)||'%';
UPDATE cohorts     SET title = replace(title, chr(226)||chr(8364)||chr(8221), chr(8212)) WHERE title LIKE '%'||chr(226)||'%';
UPDATE lessons     SET title = replace(title, chr(226)||chr(8364)||chr(8221), chr(8212)) WHERE title LIKE '%'||chr(226)||'%';
UPDATE blog_posts  SET title = replace(title, chr(226)||chr(8364)||chr(8221), chr(8212)) WHERE title LIKE '%'||chr(226)||'%';

COMMIT;

-- Verification: should return 0 rows.
SELECT 'programmes' AS tbl, count(*) AS still_corrupted FROM programmes WHERE title LIKE '%'||chr(226)||'%'
UNION ALL SELECT 'cohorts', count(*) FROM cohorts WHERE title LIKE '%'||chr(226)||'%'
UNION ALL SELECT 'lessons', count(*) FROM lessons WHERE title LIKE '%'||chr(226)||'%'
UNION ALL SELECT 'blog_posts', count(*) FROM blog_posts WHERE title LIKE '%'||chr(226)||'%';
