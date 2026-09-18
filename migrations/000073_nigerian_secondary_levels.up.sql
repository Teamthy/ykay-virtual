-- 000073_nigerian_secondary_levels: repair migration for 000052.
--
-- 000052 seeded the Nigerian JUNIOR/SENIOR secondary rows with curriculum_slug
-- 'Nigerian' (capital N) while curricula.slug is 'nigerian' — Postgres string
-- comparison is case-sensitive, so those six rows silently matched no
-- curriculum and were never inserted. Every environment that ran 000052
-- (production, staging, CI's Postgres-backed jobs) is missing JSS1–JSS3 and
-- SSS1–SSS3 in the learner "current level" dropdowns, while the in-memory
-- demo seeds (cmd/api/main.go) have them — which is why memory-mode flows
-- worked but Postgres-backed ones (browser E2E, onboarding wizard) failed.
--
-- 000052 itself is also fixed (case typo), so fresh installs seed correctly
-- and this migration's ON CONFLICT DO NOTHING makes it a no-op there; for
-- existing databases it inserts exactly the six missing levels.

INSERT INTO levels (curriculum_id, name, slug, order_index, description)
SELECT c.id, v.name, v.slug, v.order_index, v.description
FROM curricula c,
     (VALUES
        ('nigerian', 'JSS1', 'jss1', 20, 'Junior Secondary School 1'),
        ('nigerian', 'JSS2', 'jss2', 21, 'Junior Secondary School 2'),
        ('nigerian', 'JSS3', 'jss3', 22, 'Junior Secondary School 3 (BECE)'),
        ('nigerian', 'SSS1', 'sss1', 30, 'Senior Secondary School 1'),
        ('nigerian', 'SSS2', 'sss2', 31, 'Senior Secondary School 2'),
        ('nigerian', 'SSS3', 'sss3', 32, 'Senior Secondary School 3 (WAEC/NECO/JAMB)')
     ) AS v(curriculum_slug, name, slug, order_index, description)
WHERE c.slug = v.curriculum_slug
ON CONFLICT (curriculum_id, slug) DO NOTHING;
