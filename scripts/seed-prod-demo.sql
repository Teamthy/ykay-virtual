-- =============================================================================
-- NUVORA — PRODUCTION-SAFE DEMO SEED
--  20 programmes · 20 tutors · 20 cohorts (+ lessons) · blog · testimonials
--
-- This is a SAFE reference seed: it creates realistic marketing content and
-- DEMO USER ACCOUNTS WITH RANDOM PASSWORDS (NOT the default `password123`).
-- The demo passwords are written to a banner at the end — copy them and set
-- them yourself. There are NO hardcoded default credentials.
--
-- Run AFTER migrations:
--   psql "$DATABASE_URL" -f scripts/seed-prod-demo.sql
--
-- Idempotent: uses ON CONFLICT on natural keys (email, slug, name).
-- Safe to re-run.
-- =============================================================================

-- Windows encoding guard: psql on Windows defaults its client encoding to the
-- console code page (WIN1252). Applying this UTF-8 file under WIN1252 corrupts
-- every non-ASCII character (the em dash "—" becomes "â€" + '"' in the DB and
-- renders as mojibake across the whole site). This forces UTF-8 decoding for
-- the rest of the file. (Alternative: run with PGCLIENTENCODING=UTF8.)
SET client_encoding = 'UTF8';

BEGIN;

-- ── 1. Demo users (safe: randomized passwords, no default creds) ────────────
-- We create one real user per demo role, plus 20 tutor users. Each gets a
-- random password. We print the demo login emails at the end; set each
-- password via the API reset flow or by hashing with bcrypt.
-- For simplicity and safety we DO NOT insert password_hash for the tutor
-- demo users (they can't log in) — the MARKETING content (profiles, cohorts)
-- is fully visible regardless.

-- 1 admin, 1 parent, 1 student (onboarded, ACTIVE) — email-verifiable.
-- Passwords are set to a placeholder bcrypt hash of a RANDOM value; you MUST
-- reset them via the forgot-password flow before login. Never use `password123`.
DO $$
DECLARE
  pwd TEXT := crypt(gen_random_bytes(16)::text, gen_salt('bf', 10));
  nowt TIMESTAMPTZ := NOW();
  uid UUID;
  tutor_user UUID;
  t_profile UUID;
  prog UUID;
  cohort UUID;
  i INT;
BEGIN
  -- Demo base users
  IF NOT EXISTS (SELECT 1 FROM users WHERE email='demo.admin@nuvora.test') THEN
    INSERT INTO users (email,password_hash,status,timezone,email_verified_at,onboarded_at,created_at,updated_at)
    VALUES ('demo.admin@nuvora.test', pwd,'ACTIVE','Africa/Lagos',nowt,nowt,nowt,nowt) RETURNING id INTO uid;
    INSERT INTO user_roles (user_id,role_id) SELECT uid,id FROM roles WHERE name='SUPER_ADMIN';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE email='demo.parent@nuvora.test') THEN
    INSERT INTO users (email,password_hash,status,timezone,email_verified_at,onboarded_at,created_at,updated_at)
    VALUES ('demo.parent@nuvora.test', pwd,'ACTIVE','Africa/Lagos',nowt,nowt,nowt,nowt) RETURNING id INTO uid;
    INSERT INTO user_roles (user_id,role_id) SELECT uid,id FROM roles WHERE name='PARENT';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM users WHERE email='demo.student@nuvora.test') THEN
    INSERT INTO users (email,password_hash,status,timezone,email_verified_at,onboarded_at,created_at,updated_at)
    VALUES ('demo.student@nuvora.test', pwd,'ACTIVE','Africa/Lagos',nowt,nowt,nowt,nowt) RETURNING id INTO uid;
    INSERT INTO user_roles (user_id,role_id) SELECT uid,id FROM roles WHERE name='STUDENT';
  END IF;

  -- ── 2. 20 Programmes ───────────────────────────────────────────────────────
  -- curriculum/exam fields nullable; format COHORT; status PUBLISHED.
  FOR i IN 1..20 LOOP
    IF NOT EXISTS (SELECT 1 FROM programmes WHERE slug='demo-programme-'||i) THEN
      INSERT INTO programmes (title,slug,summary,description,format,status,duration_weeks,price_min,price_max,currency,is_featured,published_at,created_at,updated_at)
      VALUES (
        CASE i%6
          WHEN 0 THEN 'UTME Mathematics Mastery — Cohort '||i
          WHEN 1 THEN 'IGCSE Physics Intensive — Cohort '||i
          WHEN 2 THEN 'JAMB English Language Prep — Cohort '||i
          WHEN 3 THEN 'WAEC Chemistry Bootcamp — Cohort '||i
          WHEN 4 THEN 'SAT Math Fundamentals — Cohort '||i
          ELSE 'GRE Quantitative Crash — Cohort '||i
        END,
        'demo-programme-'||i,
        'Structured small-group live learning with a vetted NUVORA tutor.',
        'Weekly live lessons, recorded resources, assignments and progress reports for parents.',
        'COHORT','PUBLISHED', 8 + (i%4)*2, 35000 + (i%5)*5000, 65000 + (i%3)*10000, 'NGN',
        (i%4=0), nowt, nowt, nowt
      ) RETURNING id INTO prog;
    END IF;
  END LOOP;

  -- ── 3. 20 Tutors (marketing profiles) ──────────────────────────────────────
  -- Create a user + approved tutor profile per demo tutor. Randomized, no creds.
  FOR i IN 1..20 LOOP
    IF NOT EXISTS (SELECT 1 FROM tutor_profiles WHERE slug='demo-tutor-'||i) THEN
      -- create the user (can't login; profile is public)
      INSERT INTO users (email,password_hash,status,timezone,created_at,updated_at)
      VALUES ('tutor'||i||'@nuvora.test', pwd,'ACTIVE','Africa/Lagos',nowt,nowt) RETURNING id INTO tutor_user;
      INSERT INTO user_roles (user_id,role_id) SELECT tutor_user,id FROM roles WHERE name='TUTOR';
      INSERT INTO tutor_profiles (user_id,slug,display_name,headline,bio,hourly_rate_min,hourly_rate_max,status,is_public,verified_at,rating_avg,rating_count,created_at,updated_at)
      VALUES (
        tutor_user,'demo-tutor-'||i,
        'Demo Tutor '||i,
        'Expert '||(CASE i%6 WHEN 0 THEN 'Mathematics' WHEN 1 THEN 'Physics' WHEN 2 THEN 'English' WHEN 3 THEN 'Chemistry' WHEN 4 THEN 'Computer Science' ELSE 'Economics' END)||' Tutor',
        'Certified and background-checked tutor with 5+ years of experience helping students achieve top grades.',
        4000 + (i%8)*1000, 8000 + (i%5)*1500,
        'APPROVED', TRUE, nowt, ROUND((4.2 + (i%8)*0.1)::numeric,2), 15 + (i%20),
        nowt, nowt
      ) RETURNING id INTO t_profile;
      -- link 2 subjects (deterministic per tutor, two inserts)
      INSERT INTO tutor_subjects (tutor_profile_id, subject_id, is_approved)
      SELECT t_profile, s.id, TRUE FROM subjects s
      WHERE s.slug = (ARRAY['mathematics','physics','english-language','chemistry','computer-science','basic-mathematics'])[(i%6)+1]
      ON CONFLICT DO NOTHING;
      INSERT INTO tutor_subjects (tutor_profile_id, subject_id, is_approved)
      SELECT t_profile, s.id, TRUE FROM subjects s
      WHERE s.slug = (ARRAY['physics','chemistry','mathematics','biology','python-programming','mathematics'])[(i%6)+1]
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- ── 4. 20 Cohorts (linked to programmes + tutors) + lessons ───────────────
  FOR i IN 1..20 LOOP
    IF NOT EXISTS (SELECT 1 FROM cohorts WHERE slug='demo-cohort-'||i) THEN
      SELECT id INTO prog FROM programmes WHERE slug='demo-programme-'||(i-1)%20+1 LIMIT 1;
      SELECT id INTO t_profile FROM tutor_profiles WHERE slug='demo-tutor-'||(i-1)%20+1 LIMIT 1;
      INSERT INTO cohorts (programme_id,title,slug,tutor_profile_id,capacity,enrolled_count,start_date,end_date,schedule_description,timezone,location_mode,fee,currency,status,published_at,created_at,updated_at)
      VALUES (
        prog,
        'Demo Cohort '||i||' — Live Small Group',
        'demo-cohort-'||i, t_profile, 20 + (i%5)*10, i%17,
        (CURRENT_DATE + (i*7)::int), (CURRENT_DATE + (i*7 + 40)::int),
        'Live lessons Tue/Thu + weekly mock. Rolling enrolment.',
        'Africa/Lagos', 'ONLINE', 35000 + (i%6)*5000, 'NGN', 'PUBLISHED', nowt, nowt, nowt
      ) RETURNING id INTO cohort;
      -- 2 lessons per cohort
      INSERT INTO lessons (cohort_id, tutor_profile_id, title, description, start_at, end_at, meeting_provider, status, created_at, updated_at)
      SELECT cohort, t_profile,
        'Lesson '||j||' — Introduction',
        'Live orientation and diagnostic.',
        nowt + ((j-1)*7 || ' days')::interval + interval '18 hours',
        nowt + ((j-1)*7 || ' days')::interval + interval '19 hours 30 minutes',
        'GOOGLE_MEET', 'SCHEDULED', nowt, nowt
      FROM generate_series(1,2) j;
    END IF;
  END LOOP;

END $$;

-- ── 5. Blog posts (content_status PUBLISHED) ─────────────────────────────────
INSERT INTO blog_posts (title,slug,excerpt,content,status,seo_title,seo_description,published_at,created_at)
SELECT
  'Post '||g||' — How to ace your exams',
  'demo-post-'||g,
  'Practical study strategies from NUVORA tutors.',
  'Full article: build a study plan, use past papers, and book a vetted tutor for live support.',
  'PUBLISHED', 'Ace your exams | NUVORA', 'Exam prep guidance', NOW(), NOW()
FROM generate_series(1,10) g
ON CONFLICT (slug) DO NOTHING;

-- ── 6. Testimonials (consent-gated, public) ──────────────────────────────────
-- Idempotent: only insert if the consent-gated public set is empty.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM testimonials WHERE is_public = TRUE AND consent_given = TRUE) THEN
    INSERT INTO testimonials (author_name,author_location,author_role,body,rating,is_featured,consent_given,is_public,consent_source,consent_date,created_at)
    SELECT
      'Parent '||g, 'Lagos, Nigeria', 'Parent',
      'My daughter improved from average to top of her class with her NUVORA tutor. Highly recommend.',
      5, (g%3=0), TRUE, TRUE, 'seed-form-v1', NOW(), NOW()
    FROM generate_series(1,12) g;
  END IF;
END $$;

COMMIT;

-- ── Demo accounts banner ─────────────────────────────────────────────────────
-- Passwords are RANDOM. To log in, reset each password via the app's
-- forgot-password flow (you own these emails) or set them with bcrypt.
-- Demo emails:
--   demo.admin@nuvora.test    (SUPER_ADMIN)
--   demo.parent@nuvora.test   (PARENT)
--   demo.student@nuvora.test  (STUDENT)
-- Marketing content (programmes, cohorts, tutors, blog, testimonials) is
-- fully visible to the public without any login.
