-- 000034 — Seed login-able demo users for LOCAL DEV/STAGING convenience.
--
-- SECURITY (A-08): this migration must NEVER create a platform administrator.
-- The original version seeded admin@nuvora.com as a SUPER_ADMIN with a
-- password documented in the repository — a full platform takeover vector on
-- any database where this chain is applied. That admin seed has been REMOVED;
-- only non-privileged demo identities (PARENT / TUTOR / STUDENT) remain, and
-- they exist purely so a developer can log in and land on the right dashboard
-- without the email-verification or wizard screens. 000037 additionally
-- neutralizes the original admin identity for databases that already applied
-- the old version of this migration.
--
-- Credentials (DEV/STAGING ONLY — never production): password123
--   parent@nuvora.com → PARENT        (lands on /dashboard)
--   tutor@nuvora.com  → TUTOR         (lands on /tutor-dashboard)
--   student@nuvora.com→ STUDENT       (lands on /student-dashboard)
--
-- bcrypt hash below is for "password123" (same as the retired 000019 fixtures).

DO $$
DECLARE
  pwd TEXT := '$2a$10$L1nxlPVZP1enrb3DrCulHuXRCscyduEgYWl9oPII4o3BJ9i9aCT2y';
  nowt TIMESTAMPTZ := NOW();
  uid  UUID;
BEGIN
  -- Insert each demo user if the email isn't already taken.

  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'parent@nuvora.com' AND deleted_at IS NULL) THEN
    INSERT INTO users (id, email, password_hash, status, timezone, email_verified_at, onboarded_at, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-0000000000b2', 'parent@nuvora.com', pwd, 'ACTIVE', 'Africa/Lagos', nowt, nowt, nowt, nowt)
    RETURNING id INTO uid;
    INSERT INTO user_roles (user_id, role_id) SELECT uid, id FROM roles WHERE name = 'PARENT';
    INSERT INTO student_profiles (id, user_id, first_name, last_name, timezone, guardian_consent, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-0000000000c1', uid, 'Ada', 'Bello', 'Africa/Lagos', true, nowt, nowt)
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO parent_student_links (id, parent_user_id, student_profile_id, relationship, is_primary, created_at)
    SELECT uuid_generate_v4(), uid, '00000000-0000-0000-0000-0000000000c1', 'PARENT', true, nowt
    FROM student_profiles WHERE id = '00000000-0000-0000-0000-0000000000c1';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'tutor@nuvora.com' AND deleted_at IS NULL) THEN
    INSERT INTO users (id, email, password_hash, status, timezone, email_verified_at, onboarded_at, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-0000000000b3', 'tutor@nuvora.com', pwd, 'ACTIVE', 'Africa/Lagos', nowt, nowt, nowt, nowt)
    RETURNING id INTO uid;
    INSERT INTO user_roles (user_id, role_id) SELECT uid, id FROM roles WHERE name = 'TUTOR';
    INSERT INTO tutor_profiles (id, user_id, slug, display_name, bio, status, is_public, rating_avg, rating_count, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-0000000000c2', uid, 'oluwatobi', 'Oluwatobi', 'Mathematics and Sciences tutor.', 'APPROVED', true, 4.6, 20, nowt, nowt)
    ON CONFLICT (id) DO NOTHING;
    INSERT INTO tutor_subjects (tutor_profile_id, subject_id, is_approved)
    SELECT '00000000-0000-0000-0000-0000000000c2', id, true FROM subjects WHERE slug IN ('mathematics','physics') ON CONFLICT DO NOTHING;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'student@nuvora.com' AND deleted_at IS NULL) THEN
    INSERT INTO users (id, email, password_hash, status, timezone, email_verified_at, onboarded_at, created_at, updated_at)
    VALUES ('00000000-0000-0000-0000-0000000000b4', 'student@nuvora.com', pwd, 'ACTIVE', 'Africa/Lagos', nowt, nowt, nowt, nowt)
    RETURNING id INTO uid;
    INSERT INTO user_roles (user_id, role_id) SELECT uid, id FROM roles WHERE name = 'STUDENT';
  END IF;
END $$;
