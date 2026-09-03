-- 000037 — EMERGENCY: remove known-credential demo identities from PRODUCTION.
--
-- SECURITY (YK-001): migrations/000034 seeded login-able demo users whose
-- credentials are documented in the repo (password123), including a
-- SUPER_ADMIN (admin@ykaycollege.com). If that migration ran against a production
-- database, any attacker who knows the documented password can take over the
-- platform. This migration neutralises every demo identity in ANY environment
-- it runs in:
--   1. revokes ALL of their sessions (and clears them so the revocation is
--      effective immediately even against the 30s session cache),
--   2. removes every role grant (so a SUPER_ADMIN loses platform power),
--   3. soft-deletes the demo users (deleted_at) and clears their password so
--      the old bcrypt hash can no longer authenticate even if re-inserted,
--   4. deletes any linked demo profiles/links.
--
-- This is idempotent and safe to run everywhere. After applying, legitimate
-- users are untouched; demo identities are disabled and can only be restored
-- by an explicit, secret-controlled fixture command (not a schema migration).
--
-- NOTE: For development/staging you may re-create throwaway demo users via a
-- fixture script, NOT by re-running 000034 (it is superseded).

DO $$
DECLARE
  v_demo_user_ids UUID[] := ARRAY[
    '00000000-0000-0000-0000-0000000000b1', -- admin@ykaycollege.com  (SUPER_ADMIN)
    '00000000-0000-0000-0000-0000000000b2', -- parent@ykaycollege.com
    '00000000-0000-0000-0000-0000000000b3', -- tutor@ykaycollege.com
    '00000000-0000-0000-0000-0000000000b4'  -- student@ykaycollege.com
  ];
BEGIN
  -- 1) Revoke every session belonging to a demo user.
  DELETE FROM sessions
  WHERE user_id = ANY (v_demo_user_ids);

  -- 2) Strip all roles (SUPER_ADMIN, PARENT, TUTOR, STUDENT).
  DELETE FROM user_roles
  WHERE user_id = ANY (v_demo_user_ids);

  -- 3) Detach demo profiles / parent links.
  DELETE FROM parent_student_links
  WHERE parent_user_id = ANY (v_demo_user_ids)
     OR student_profile_id IN (
        SELECT id FROM student_profiles WHERE user_id = ANY (v_demo_user_ids)
     );
  DELETE FROM tutor_profiles WHERE user_id = ANY (v_demo_user_ids);
  DELETE FROM student_profiles WHERE user_id = ANY (v_demo_user_ids);

  -- 4) Soft-delete the demo users and neutralise their password hash so the
  --    documented bcrypt hash can never authenticate again. status is set to
  --    DELETED (a valid user_status enum value) alongside deleted_at.
  UPDATE users
  SET deleted_at = COALESCE(deleted_at, NOW()),
      password_hash = '!disabled-demo-account!',
      status = 'DELETED',
      email_verified_at = NULL,
      onboarded_at = NULL
  WHERE id = ANY (v_demo_user_ids);
END $$;
