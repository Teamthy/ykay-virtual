-- 000036 — Backfill missing student_profile for the demo STUDENT (Postgres mode).
--
-- 000034 seeded a login-able STUDENT account (student@nuvora.com) but only
-- created a user + role, NOT a student_profiles row. Every profile-scoped
-- endpoint (e.g. GET /api/v1/me/lessons) resolves the actor's own profile via
-- ProfileAuthorizer.ResolveStudent, which returns FORBIDDEN
-- ("student profile does not belong to this account") when no profile exists.
-- This backfills the missing profile so the student's learning dashboard works,
-- and links the demo PARENT to the same learner so a parent can also view the
-- student's lessons. Idempotent / safe to run on already-seeded DBs.
--
-- DEV/STAGING ONLY — mirrors 000034; never point at production.

DO $$
DECLARE
  v_student_user UUID := '00000000-0000-0000-0000-0000000000b4';
  v_parent_user  UUID := '00000000-0000-0000-0000-0000000000b2';
  v_profile_id   UUID := '00000000-0000-0000-0000-0000000000c3';
  v_now TIMESTAMPTZ := NOW();
BEGIN
  -- Only touch the demo student; ignore if the seed user is absent.
  IF EXISTS (SELECT 1 FROM users WHERE id = v_student_user AND deleted_at IS NULL) THEN
    INSERT INTO student_profiles (id, user_id, first_name, last_name, timezone, guardian_consent, created_at, updated_at)
    VALUES (v_profile_id, v_student_user, 'Kelechi', 'Okoro', 'Africa/Lagos', true, v_now, v_now)
    ON CONFLICT (id) DO NOTHING;

    -- Give the demo parent visibility of this learner too (safe: the parent
    -- dashboard already renders a learner dropdown when there are many).
    IF EXISTS (SELECT 1 FROM users WHERE id = v_parent_user AND deleted_at IS NULL) THEN
      INSERT INTO parent_student_links (id, parent_user_id, student_profile_id, relationship, is_primary, created_at)
      VALUES (uuid_generate_v4(), v_parent_user, v_profile_id, 'PARENT', false, v_now)
      ON CONFLICT (parent_user_id, student_profile_id) DO NOTHING;
    END IF;
  END IF;
END $$;
