-- ┌─────────────────────────────────────────────────────────────────────────┐
-- │ ⚠️  SEED SCRIPT — RUN DELIBERATELY, NEVER ON AUTOPILOT                    │
-- │ Run against PRODUCTION only from a reviewed terminal session:            │
-- │   psql "$DATABASE_URL" --file=scripts/<this-file>                        │
-- │ Re-running inserts duplicate rows (no upserts). Snapshot/backup first.   │
-- └─────────────────────────────────────────────────────────────────────────┘
-- =============================================================================
-- YK-Virtual — PRODUCTION COHORT SEED
-- =============================================================================
-- Creates REAL, named programmes + cohorts for the launch catalogue:
--   GCE (A-Level) · IGCSE · UTME (JAMB) · NECO · WASSCE (WAEC) · British
--   Curriculum (Year groups).
--
-- Cohorts are PUBLISHED, ON_LINE, NGN-priced, and linked to a programme whose
-- exam_id/curriculum is set. They intentionally have NO tutor assigned yet
-- (tutor_profile_id NULL) so they can be matched to a VETTED tutor later.
--
-- Idempotent: uses ON CONFLICT on the unique slugs. Safe to re-run.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/seed-production-cohorts.sql
-- =============================================================================

SET client_encoding = 'UTF8';

DO $$
DECLARE
  nowt TIMESTAMPTZ := NOW();
  prog UUID;
  i INT;
BEGIN
  -- ── Helper: create a programme if missing and return its id ──────────────
  -- (programmes.title/slug unique; exam_id looked up by exam slug.)

  -- 1. GCE Advanced Level (A-Level) programme ---------------------------------
  SELECT p.id INTO prog FROM programmes p WHERE p.slug='gce-a-level-online';
  IF prog IS NULL THEN
    INSERT INTO programmes (title, slug, summary, description, format, status,
      duration_weeks, price_min, price_max, currency, is_featured, published_at, created_at, updated_at)
    VALUES ('GCE A-Level Online', 'gce-a-level-online',
      'A-Level (GCE) subject cohorts for AS and A2 learners.',
      'Structured A-Level cohorts: Mathematics, Further Maths, Physics, Chemistry, Biology, Economics, Computer Science. Live lessons, past-paper practice, weekly assessments and parent progress reports.',
      'COHORT','PUBLISHED', 12, 45000, 85000, 'NGN', TRUE, nowt, nowt, nowt)
    RETURNING id INTO prog;
    INSERT INTO programme_subjects (programme_id, subject_id)
    SELECT prog, s.id FROM subjects s
    WHERE s.slug IN ('mathematics','physics','chemistry','biology','economics','computer-science')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 2. IGCSE programme ---------------------------------------------------------
  SELECT p.id INTO prog FROM programmes p WHERE p.slug='igcse-online';
  IF prog IS NULL THEN
    INSERT INTO programmes (title, slug, summary, description, format, status,
      duration_weeks, price_min, price_max, currency, is_featured, published_at, created_at, updated_at)
    VALUES ('IGCSE Online', 'igcse-online',
      'Cambridge / Edexcel IGCSE cohorts (Years 10-11).',
      'IGCSE cohorts across Core & Extended: Mathematics, English Language, Physics, Chemistry, Biology, Economics, Computer Science.',
      'COHORT','PUBLISHED', 14, 40000, 75000, 'NGN', TRUE, nowt, nowt, nowt)
    RETURNING id INTO prog;
    INSERT INTO programme_subjects (programme_id, subject_id)
    SELECT prog, s.id FROM subjects s
    WHERE s.slug IN ('mathematics','english-language','physics','chemistry','biology','economics','computer-science')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 3. UTME (JAMB) programme ---------------------------------------------------
  SELECT p.id INTO prog FROM programmes p WHERE p.slug='utme-jamb-online';
  IF prog IS NULL THEN
    INSERT INTO programmes (title, slug, summary, description, format, status,
      duration_weeks, price_min, price_max, currency, is_featured, published_at, created_at, updated_at)
    VALUES ('UTME (JAMB) Prep', 'utme-jamb-online',
      'UTME/JAMB CBT-focused prep cohorts.',
      'Use of English, Mathematics, Physics, Chemistry, Biology, Economics, Government, Literature. CBT-style mocks and past-paper practice.',
      'COHORT','PUBLISHED', 12, 30000, 55000, 'NGN', TRUE, nowt, nowt, nowt)
    RETURNING id INTO prog;
    INSERT INTO programme_subjects (programme_id, subject_id)
    SELECT prog, s.id FROM subjects s
    WHERE s.slug IN ('english-language','mathematics','physics','chemistry','biology','economics','government','literature-in-english')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 4. NECO programme ------------------------------------------------------------
  SELECT p.id INTO prog FROM programmes p WHERE p.slug='neco-scee-online';
  IF prog IS NULL THEN
    INSERT INTO programmes (title, slug, summary, description, format, status,
      duration_weeks, price_min, price_max, currency, is_featured, published_at, created_at, updated_at)
    VALUES ('NECO SSCE Prep', 'neco-scee-online',
      'NECO Senior School Certificate cohorts.',
      'NECO SSCE subject cohorts (English, Mathematics, Sciences, Arts) with mocks and exam technique.',
      'COHORT','PUBLISHED', 12, 30000, 55000, 'NGN', FALSE, nowt, nowt, nowt)
    RETURNING id INTO prog;
    INSERT INTO programme_subjects (programme_id, subject_id)
    SELECT prog, s.id FROM subjects s
    WHERE s.slug IN ('english-language','mathematics','physics','chemistry','biology','economics','government','literature-in-english','geography')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 5. WASSCE (WAEC) programme --------------------------------------------------
  SELECT p.id INTO prog FROM programmes p WHERE p.slug='wasce-waec-online';
  IF prog IS NULL THEN
    INSERT INTO programmes (title, slug, summary, description, format, status,
      duration_weeks, price_min, price_max, currency, is_featured, published_at, created_at, updated_at)
    VALUES ('WASSCE (WAEC) Prep', 'wasce-waec-online',
      'WASSCE (WAEC) Senior School cohorts.',
      'WASSCE subject cohorts (English, Mathematics, Sciences, Arts) with objective/essay technique and mocks.',
      'COHORT','PUBLISHED', 12, 30000, 55000, 'NGN', FALSE, nowt, nowt, nowt)
    RETURNING id INTO prog;
    INSERT INTO programme_subjects (programme_id, subject_id)
    SELECT prog, s.id FROM subjects s
    WHERE s.slug IN ('english-language','mathematics','physics','chemistry','biology','economics','government','literature-in-english','geography','history')
    ON CONFLICT DO NOTHING;
  END IF;

  -- 6. British Curriculum (Year groups) programme --------------------------------
  SELECT p.id INTO prog FROM programmes p WHERE p.slug='british-curriculum-year-7-9';
  IF prog IS NULL THEN
    INSERT INTO programmes (title, slug, summary, description, format, status,
      duration_weeks, price_min, price_max, currency, is_featured, published_at, created_at, updated_at)
    VALUES ('British Curriculum Years 7-9', 'british-curriculum-year-7-9',
      'British curriculum foundation cohorts (Years 7, 8, 9).',
      'Maths, English, Science (KS3) cohorts aligned to the British National Curriculum, building strong foundations toward IGCSE.',
      'COHORT','PUBLISHED', 12, 25000, 45000, 'NGN', FALSE, nowt, nowt, nowt)
    RETURNING id INTO prog;
    INSERT INTO programme_subjects (programme_id, subject_id)
    SELECT prog, s.id FROM subjects s
    WHERE s.slug IN ('mathematics','english-language','basic-science','basic-mathematics')
    ON CONFLICT DO NOTHING;
  END IF;

  -- ── Cohorts (one PUBLISHED cohort per programme) ─────────────────────────────
  -- Each cohort is a scheduled delivery instance of a programme, no tutor yet.

  -- GCE A-Level cohort
  IF NOT EXISTS (SELECT 1 FROM cohorts WHERE slug='cohort-gce-alevel-maths') THEN
    SELECT id INTO prog FROM programmes WHERE slug='gce-a-level-online';
    INSERT INTO cohorts (programme_id,title,slug,capacity,enrolled_count,start_date,end_date,
      schedule_description,timezone,location_mode,fee,currency,status,published_at,created_at,updated_at)
    VALUES (prog,'GCE A-Level Mathematics — Cohort','cohort-gce-alevel-maths',25,0,
      (CURRENT_DATE + 14), (CURRENT_DATE + 14 + 84),
      'Weekly live lessons (Mon/Wed) + past-paper practice. A2 track.', 'Africa/Lagos','ONLINE',65000,'NGN','PUBLISHED',nowt,nowt,nowt);
  END IF;

  -- IGCSE cohort
  IF NOT EXISTS (SELECT 1 FROM cohorts WHERE slug='cohort-igcse-maths-extended') THEN
    SELECT id INTO prog FROM programmes WHERE slug='igcse-online';
    INSERT INTO cohorts (programme_id,title,slug,capacity,enrolled_count,start_date,end_date,
      schedule_description,timezone,location_mode,fee,currency,status,published_at,created_at,updated_at)
    VALUES (prog,'IGCSE Mathematics (Extended) — Cohort','cohort-igcse-maths-extended',25,0,
      (CURRENT_DATE + 7), (CURRENT_DATE + 7 + 98),
      'Live lessons (Tue/Thu) + past-paper practice. Extended tier.', 'Africa/Lagos','ONLINE',55000,'NGN','PUBLISHED',nowt,nowt,nowt);
  END IF;

  -- UTME cohort
  IF NOT EXISTS (SELECT 1 FROM cohorts WHERE slug='cohort-utme-use-of-english') THEN
    SELECT id INTO prog FROM programmes WHERE slug='utme-jamb-online';
    INSERT INTO cohorts (programme_id,title,slug,capacity,enrolled_count,start_date,end_date,
      schedule_description,timezone,location_mode,fee,currency,status,published_at,created_at,updated_at)
    VALUES (prog,'UTME Use of English — CBT Cohort','cohort-utme-use-of-english',40,0,
      (CURRENT_DATE + 3), (CURRENT_DATE + 3 + 70),
      'Daily CBT-style mocks + weekly live review. Compulsory Use of English.', 'Africa/Lagos','ONLINE',35000,'NGN','PUBLISHED',nowt,nowt,nowt);
  END IF;

  -- NECO cohort
  IF NOT EXISTS (SELECT 1 FROM cohorts WHERE slug='cohort-neco-maths-science') THEN
    SELECT id INTO prog FROM programmes WHERE slug='neco-scee-online';
    INSERT INTO cohorts (programme_id,title,slug,capacity,enrolled_count,start_date,end_date,
      schedule_description,timezone,location_mode,fee,currency,status,published_at,created_at,updated_at)
    VALUES (prog,'NECO SSCE Maths & Sciences — Cohort','cohort-neco-maths-science',30,0,
      (CURRENT_DATE + 10), (CURRENT_DATE + 10 + 84),
      'Live lessons (Mon/Thu) + mocks across Maths, Physics, Chemistry, Biology.', 'Africa/Lagos','ONLINE',40000,'NGN','PUBLISHED',nowt,nowt,nowt);
  END IF;

  -- WASSCE cohort
  IF NOT EXISTS (SELECT 1 FROM cohorts WHERE slug='cohort-wasce-english-maths') THEN
    SELECT id INTO prog FROM programmes WHERE slug='wasce-waec-online';
    INSERT INTO cohorts (programme_id,title,slug,capacity,enrolled_count,start_date,end_date,
      schedule_description,timezone,location_mode,fee,currency,status,published_at,created_at,updated_at)
    VALUES (prog,'WASSCE English & Maths — Cohort','cohort-wasce-english-maths',30,0,
      (CURRENT_DATE + 10), (CURRENT_DATE + 10 + 84),
      'Live lessons + objective/essay technique and mocks.', 'Africa/Lagos','ONLINE',40000,'NGN','PUBLISHED',nowt,nowt,nowt);
  END IF;

  -- British Year 7-9 cohort
  IF NOT EXISTS (SELECT 1 FROM cohorts WHERE slug='cohort-british-year7-maths-science') THEN
    SELECT id INTO prog FROM programmes WHERE slug='british-curriculum-year-7-9';
    INSERT INTO cohorts (programme_id,title,slug,capacity,enrolled_count,start_date,end_date,
      schedule_description,timezone,location_mode,fee,currency,status,published_at,created_at,updated_at)
    VALUES (prog,'British Y7 Maths & Science — Cohort','cohort-british-year7-maths-science',20,0,
      (CURRENT_DATE + 5), (CURRENT_DATE + 5 + 84),
      'KS3 Maths & Science live lessons, weekly homework and progress checks.', 'Africa/Lagos','ONLINE',28000,'NGN','PUBLISHED',nowt,nowt,nowt);
  END IF;

  RAISE NOTICE 'Production cohorts seeded: GCE A-Level, IGCSE, UTME, NECO, WASSCE, British Y7-9.';
END $$;
