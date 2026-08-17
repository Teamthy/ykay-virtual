-- 000041 — Permanent public tutor catalogue seed (marketing profiles).
--
-- WHY: after 000037 removed the demo identities, a fresh production database
-- has ZERO discoverable tutors — /tutors/search returns an empty list and the
-- homepage collage links to nothing. This migration seeds a small set of
-- permanent, APPROVED, public tutor profiles so the tutor catalogue and search
-- are never empty, in any environment.
--
-- SAFETY:
--   * These are MARKETING profiles only. Each is backed by a real user row
--     whose password_hash is a fresh random value generated at apply time
--     (crypt(gen_random_bytes(16))), so the accounts can never be logged into.
--   * No roles are granted beyond TUTOR, and no administrative privilege.
--   * Ratings/experience match the values already used for these named tutors
--     in the product fixtures (site-data.ts / mockTutors) — nothing new is
--     invented here.
--   * Idempotent: user lookup by email + ON CONFLICT on natural keys (slug,
--     tutor_subjects unique index). Safe to apply repeatedly.
--
-- The six profiles match the bundled portrait photos in client/public/tutors/.

DO $$
DECLARE
  nowt TIMESTAMPTZ := NOW();
  pwd  TEXT := crypt(gen_random_bytes(16)::text, gen_salt('bf', 10)); -- unusable
  uid  UUID;
  tp   UUID;
BEGIN
  -- ── Chinasa — Mathematics & English ──────────────────────────────────────
  SELECT id INTO uid FROM users WHERE email = 'tutor.chinasa@nuvora.test' AND deleted_at IS NULL;
  IF uid IS NULL THEN
    INSERT INTO users (email, password_hash, status, timezone, created_at, updated_at)
    VALUES ('tutor.chinasa@nuvora.test', pwd, 'ACTIVE', 'Africa/Lagos', nowt, nowt) RETURNING id INTO uid;
    INSERT INTO user_roles (user_id, role_id) SELECT uid, id FROM roles WHERE name = 'TUTOR';
  END IF;
  INSERT INTO tutor_profiles
    (user_id, slug, display_name, headline, bio, years_experience, hourly_rate_min, hourly_rate_max,
     currency, status, is_public, verified_at, approved_at, rating_avg, rating_count,
     total_hours_taught, total_students, ranking_score, timezone, accepts_online, accepts_in_person, created_at, updated_at)
  VALUES
    (uid, 'chinasa', 'Chinasa', 'Mathematics specialist — British & Nigerian curricula',
     'Patient, structured Mathematics and English tutor for primary and junior-secondary learners.',
     8, 6000, 10000, 'NGN', 'APPROVED', TRUE, nowt, nowt, 4.87, 28, 2548, 34, 98.5, 'Africa/Lagos', TRUE, TRUE, nowt, nowt)
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO tp;
  IF tp IS NOT NULL THEN
    INSERT INTO tutor_subjects (tutor_profile_id, subject_id, is_approved)
    SELECT tp, id, TRUE FROM subjects WHERE slug IN ('mathematics','english-language') AND is_active = TRUE
    ON CONFLICT (tutor_profile_id, subject_id) DO NOTHING;
  END IF;

  -- ── Oluwatobi — Mathematics & Physics ────────────────────────────────────
  SELECT id INTO uid FROM users WHERE email = 'tutor.oluwatobi@nuvora.test' AND deleted_at IS NULL;
  IF uid IS NULL THEN
    INSERT INTO users (email, password_hash, status, timezone, created_at, updated_at)
    VALUES ('tutor.oluwatobi@nuvora.test', pwd, 'ACTIVE', 'Africa/Lagos', nowt, nowt) RETURNING id INTO uid;
    INSERT INTO user_roles (user_id, role_id) SELECT uid, id FROM roles WHERE name = 'TUTOR';
  END IF;
  INSERT INTO tutor_profiles
    (user_id, slug, display_name, headline, bio, years_experience, hourly_rate_min, hourly_rate_max,
     currency, status, is_public, verified_at, approved_at, rating_avg, rating_count,
     total_hours_taught, total_students, ranking_score, timezone, accepts_online, accepts_in_person, created_at, updated_at)
  VALUES
    (uid, 'oluwatobi', 'Oluwatobi', 'Mathematics & Physics tutor',
     'Senior-secondary Mathematics and Physics tutor focused on WAEC, NECO and IGCSE exam preparation.',
     6, 5000, 9000, 'NGN', 'APPROVED', TRUE, nowt, nowt, 4.60, 20, 1200, 22, 95.2, 'Africa/Lagos', TRUE, TRUE, nowt, nowt)
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO tp;
  IF tp IS NOT NULL THEN
    INSERT INTO tutor_subjects (tutor_profile_id, subject_id, is_approved)
    SELECT tp, id, TRUE FROM subjects WHERE slug IN ('mathematics','physics') AND is_active = TRUE
    ON CONFLICT (tutor_profile_id, subject_id) DO NOTHING;
  END IF;

  -- ── Olanike — English & Literature ───────────────────────────────────────
  SELECT id INTO uid FROM users WHERE email = 'tutor.olanike@nuvora.test' AND deleted_at IS NULL;
  IF uid IS NULL THEN
    INSERT INTO users (email, password_hash, status, timezone, created_at, updated_at)
    VALUES ('tutor.olanike@nuvora.test', pwd, 'ACTIVE', 'Africa/Lagos', nowt, nowt) RETURNING id INTO uid;
    INSERT INTO user_roles (user_id, role_id) SELECT uid, id FROM roles WHERE name = 'TUTOR';
  END IF;
  INSERT INTO tutor_profiles
    (user_id, slug, display_name, headline, bio, years_experience, hourly_rate_min, hourly_rate_max,
     currency, status, is_public, verified_at, approved_at, rating_avg, rating_count,
     total_hours_taught, total_students, ranking_score, timezone, accepts_online, accepts_in_person, created_at, updated_at)
  VALUES
    (uid, 'olanike', 'Olanike', 'English Language & Literature tutor',
     'English Language and Literature-in-English tutor for IGCSE, WAEC and NECO candidates.',
     7, 5500, 9500, 'NGN', 'APPROVED', TRUE, nowt, nowt, 4.80, 24, 1500, 26, 96.8, 'Africa/Lagos', TRUE, TRUE, nowt, nowt)
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO tp;
  IF tp IS NOT NULL THEN
    INSERT INTO tutor_subjects (tutor_profile_id, subject_id, is_approved)
    SELECT tp, id, TRUE FROM subjects WHERE slug IN ('english-language','literature-in-english') AND is_active = TRUE
    ON CONFLICT (tutor_profile_id, subject_id) DO NOTHING;
  END IF;

  -- ── Adewale — Computer Science & Python ──────────────────────────────────
  SELECT id INTO uid FROM users WHERE email = 'tutor.adewale@nuvora.test' AND deleted_at IS NULL;
  IF uid IS NULL THEN
    INSERT INTO users (email, password_hash, status, timezone, created_at, updated_at)
    VALUES ('tutor.adewale@nuvora.test', pwd, 'ACTIVE', 'Africa/Lagos', nowt, nowt) RETURNING id INTO uid;
    INSERT INTO user_roles (user_id, role_id) SELECT uid, id FROM roles WHERE name = 'TUTOR';
  END IF;
  INSERT INTO tutor_profiles
    (user_id, slug, display_name, headline, bio, years_experience, hourly_rate_min, hourly_rate_max,
     currency, status, is_public, verified_at, approved_at, rating_avg, rating_count,
     total_hours_taught, total_students, ranking_score, timezone, accepts_online, accepts_in_person, created_at, updated_at)
  VALUES
    (uid, 'adewale', 'Adewale', 'Computer Science & Python tutor',
     'Computer Science and Python Programming tutor for IGCSE, A-Level and digital-skills learners.',
     5, 7000, 12000, 'NGN', 'APPROVED', TRUE, nowt, nowt, 4.75, 18, 900, 19, 94.6, 'Africa/Lagos', TRUE, TRUE, nowt, nowt)
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO tp;
  IF tp IS NOT NULL THEN
    INSERT INTO tutor_subjects (tutor_profile_id, subject_id, is_approved)
    SELECT tp, id, TRUE FROM subjects WHERE slug IN ('computer-science','python-programming') AND is_active = TRUE
    ON CONFLICT (tutor_profile_id, subject_id) DO NOTHING;
  END IF;

  -- ── Judith — Chemistry & Biology ─────────────────────────────────────────
  SELECT id INTO uid FROM users WHERE email = 'tutor.judith@nuvora.test' AND deleted_at IS NULL;
  IF uid IS NULL THEN
    INSERT INTO users (email, password_hash, status, timezone, created_at, updated_at)
    VALUES ('tutor.judith@nuvora.test', pwd, 'ACTIVE', 'Africa/Lagos', nowt, nowt) RETURNING id INTO uid;
    INSERT INTO user_roles (user_id, role_id) SELECT uid, id FROM roles WHERE name = 'TUTOR';
  END IF;
  INSERT INTO tutor_profiles
    (user_id, slug, display_name, headline, bio, years_experience, hourly_rate_min, hourly_rate_max,
     currency, status, is_public, verified_at, approved_at, rating_avg, rating_count,
     total_hours_taught, total_students, ranking_score, timezone, accepts_online, accepts_in_person, created_at, updated_at)
  VALUES
    (uid, 'judith', 'Judith', 'Chemistry & Biology tutor',
     'Chemistry and Biology tutor with a practical, exam-focused approach for WAEC, NECO and IGCSE.',
     6, 5500, 9500, 'NGN', 'APPROVED', TRUE, nowt, nowt, 4.70, 16, 1050, 18, 93.9, 'Africa/Lagos', TRUE, TRUE, nowt, nowt)
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO tp;
  IF tp IS NOT NULL THEN
    INSERT INTO tutor_subjects (tutor_profile_id, subject_id, is_approved)
    SELECT tp, id, TRUE FROM subjects WHERE slug IN ('chemistry','biology') AND is_active = TRUE
    ON CONFLICT (tutor_profile_id, subject_id) DO NOTHING;
  END IF;

  -- ── Demilola — Economics & Business Studies ──────────────────────────────
  SELECT id INTO uid FROM users WHERE email = 'tutor.demilola@nuvora.test' AND deleted_at IS NULL;
  IF uid IS NULL THEN
    INSERT INTO users (email, password_hash, status, timezone, created_at, updated_at)
    VALUES ('tutor.demilola@nuvora.test', pwd, 'ACTIVE', 'Africa/Lagos', nowt, nowt) RETURNING id INTO uid;
    INSERT INTO user_roles (user_id, role_id) SELECT uid, id FROM roles WHERE name = 'TUTOR';
  END IF;
  INSERT INTO tutor_profiles
    (user_id, slug, display_name, headline, bio, years_experience, hourly_rate_min, hourly_rate_max,
     currency, status, is_public, verified_at, approved_at, rating_avg, rating_count,
     total_hours_taught, total_students, ranking_score, timezone, accepts_online, accepts_in_person, created_at, updated_at)
  VALUES
    (uid, 'demilola', 'Demilola', 'Economics & Business Studies tutor',
     'Economics and Business Studies tutor helping learners build strong exam technique.',
     5, 5000, 8500, 'NGN', 'APPROVED', TRUE, nowt, nowt, 4.65, 14, 800, 15, 92.8, 'Africa/Lagos', TRUE, TRUE, nowt, nowt)
  ON CONFLICT (slug) DO NOTHING RETURNING id INTO tp;
  IF tp IS NOT NULL THEN
    INSERT INTO tutor_subjects (tutor_profile_id, subject_id, is_approved)
    SELECT tp, id, TRUE FROM subjects WHERE slug IN ('economics','business-studies') AND is_active = TRUE
    ON CONFLICT (tutor_profile_id, subject_id) DO NOTHING;
  END IF;
END $$;
