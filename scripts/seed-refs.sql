-- NUVORA — reference seed rows for real-PostgreSQL e2e (phase 41).
-- Mirrors the in-memory dev seeds (seedMemoryCatalogue / seedMemoryTutors /
-- seedLMSDemo) so the E2E suite's hardcoded IDs resolve FKs.
-- Run after `make migrate` on a fresh database, before scripts/e2e.sh.
-- Dev/demo data only — never run against production.

-- Subjects: migrations pre-seed them (random UUIDs); the e2e suite resolves
-- the Mathematics subject id dynamically, so nothing to do here.

-- Tutor profile 0102 linked to the demo tutor user (a3), APPROVED + public.
INSERT INTO tutor_profiles (id, user_id, slug, display_name, bio, status, is_public, rating_avg, rating_count)
VALUES ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-0000000000a3',
        'oluwatobi', 'Oluwatobi', 'Mathematics and Sciences tutor.',
        'APPROVED', TRUE, 4.6, 20)
ON CONFLICT (id) DO NOTHING;

-- Competency question bank for Mathematics — the migration ships a bank with
-- arbitrary correct indexes, which breaks the deterministic suite (it answers
-- every question with index 1, like the memory-mode bank). Replace it with
-- the deterministic bank (fresh disposable DB, no attempts exist yet).
DELETE FROM assessment_questions
WHERE subject_id = (SELECT id FROM subjects WHERE slug = 'mathematics');

INSERT INTO assessment_questions (subject_id, question, options, correct_index, difficulty, is_active)
SELECT s.id, g.q, g.o::jsonb, 1, 2, TRUE
FROM subjects s
JOIN (VALUES
  ('What is 7 × 6?',       '["36","42","48","54"]'),
  ('Solve for x: 2x + 4 = 12', '["2","4","6","8"]'),
  ('What is 15% of 200?',  '["20","30","35","40"]'),
  ('What is the square root of 144?', '["10","12","14","16"]'),
  ('What is 3/4 as a decimal?', '["0.25","0.75","0.5","1.25"]'),
  ('What is the area of a 6×9 rectangle?', '["36","54","63","72"]')
) AS g(q, o) ON s.slug = 'mathematics';

-- Programmes
INSERT INTO programmes (id, title, slug, summary, format, status, is_featured, currency) VALUES
('00000000-0000-0000-0000-00000000d001', 'Nigerian Curriculum (Core Maths)', 'nigerian-curriculum', 'Core maths programme', 'COHORT', 'PUBLISHED', TRUE, 'NGN'),
('00000000-0000-0000-0000-00000000d002', 'British Curriculum (IGCSE Prep)', 'british-curriculum', 'IGCSE preparation', 'COHORT', 'PUBLISHED', FALSE, 'NGN')
ON CONFLICT (slug) DO UPDATE SET id = EXCLUDED.id;

-- Cohort c010 (FKs to programme d001 + tutor 0102)
INSERT INTO cohorts (id, programme_id, title, slug, tutor_profile_id, capacity, enrolled_count, start_date, end_date, schedule_description, timezone, location_mode, fee, currency, status)
VALUES ('00000000-0000-0000-0000-00000000c010', '00000000-0000-0000-0000-00000000d001',
        'UTME 2026 Mastery — 320+ Programme', 'utme-2026-mastery',
        '00000000-0000-0000-0000-000000000102', 60, 41,
        CURRENT_DATE + 25, CURRENT_DATE + 145,
        'Live classes Tue/Thu/Sat evenings + weekly mock CBT.',
        'Africa/Lagos', 'ONLINE', 35000, 'NGN', 'PUBLISHED')
ON CONFLICT (slug) DO UPDATE SET id = EXCLUDED.id;

-- Lessons for c010 (3 sessions)
INSERT INTO lessons (id, cohort_id, tutor_profile_id, title, description, start_at, end_at, timezone, status)
SELECT g.id, '00000000-0000-0000-0000-00000000c010', '00000000-0000-0000-0000-000000000102',
       g.title, 'Live session',
       CURRENT_TIMESTAMP + (25 + g.i * 7) * INTERVAL '1 day',
       CURRENT_TIMESTAMP + (25 + g.i * 7) * INTERVAL '1 day' + INTERVAL '90 minutes',
       'Africa/Lagos', 'SCHEDULED'
FROM (VALUES
  ('00000000-0000-0000-0000-000000000011', 0, 'Intro + diagnostic'),
  ('00000000-0000-0000-0000-000000000012', 1, 'Maths: Algebra foundations'),
  ('00000000-0000-0000-0000-000000000013', 2, 'English: Comprehension strategies')
) AS g(id, i, title)
ON CONFLICT (id) DO NOTHING;

-- Demo learner 0001 linked to the parent user (a2) — used by dashboards.
INSERT INTO student_profiles (id, first_name, last_name, date_of_birth, school_name, current_level, guardian_consent, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000001', 'Ada', 'Bello', '2012-04-01', 'Sunrise Academy', 'JSS1', TRUE, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- LMS demo: 2 assignments + a 3-question auto-graded quiz + attendance + graded submission
INSERT INTO assignments (id, cohort_id, title, instructions, max_score) VALUES
('00000000-0000-0000-0000-000000000021', '00000000-0000-0000-0000-00000000c010', 'Algebra diagnostic worksheet', 'Solve the diagnostic worksheet and upload your working.', 20),
('00000000-0000-0000-0000-000000000022', '00000000-0000-0000-0000-00000000c010', 'Comprehension essay', 'Write a 300-word comprehension summary of the attached passage.', 10)
ON CONFLICT (id) DO NOTHING;

INSERT INTO learner_assessments (id, cohort_id, tutor_profile_id, title, instructions, pass_threshold, status, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000031', '00000000-0000-0000-0000-00000000c010',
        '00000000-0000-0000-0000-000000000102', 'Week 1 diagnostic quiz',
        'You have 10 minutes. Passing mark: 70%.', 70, 'PUBLISHED', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO assessment_questions (id, assessment_id, question, options, correct_index, sort_order)
SELECT g.id, '00000000-0000-0000-0000-000000000031', g.q, g.o, 1, g.i
FROM (VALUES
  ('00000000-0000-0000-0000-000000000041', 0, 'What is 7 × 6?', ARRAY['36','42','48','54']),
  ('00000000-0000-0000-0000-000000000042', 1, 'Solve for x: 2x + 4 = 12', ARRAY['2','4','6','8']),
  ('00000000-0000-0000-0000-000000000043', 2, 'What is 15% of 200?', ARRAY['20','30','35','40'])
) AS g(id, i, q, o)
ON CONFLICT (id) DO NOTHING;
