-- 000045 — Remove DEMO / MARKETING tutor profiles, their demo programmes and
-- demo cohorts, so ONLY real, admin-approved (verified) tutors are shown on
-- the tutors page.
--
-- This targets:
--   * seed-prod-demo.sql demo identities (demo-tutor-*, tutorN@ykvirtual.test,
--     demo-programme-*, demo-cohort-*)
--   * 000041 marketing tutor profiles (tutor.<name>@ykvirtual.test) which are
--     APPROVED + is_public but are NOT real teachers.
--
-- Real tutors who register and pass vetting are unaffected.

DO $$
DECLARE
  v_user uuid;
BEGIN
  -- 1. Remove demo cohorts.
  DELETE FROM cohorts WHERE slug LIKE 'demo-cohort-%';

  -- 2. Remove demo programmes (cascades to cohort links via ON DELETE CASCADE).
  DELETE FROM programmes WHERE slug LIKE 'demo-programme-%';

  -- 3. Remove demo + marketing tutor profiles and their user rows.
  FOR v_user IN
    SELECT u.id FROM users u
    WHERE u.email ILIKE 'tutor%@ykvirtual.test'
       OR u.email ILIKE 'tutor.%@ykvirtual.test'
  LOOP
    DELETE FROM tutor_profiles WHERE user_id = v_user;
    DELETE FROM user_roles WHERE user_id = v_user;
    DELETE FROM sessions WHERE user_id = v_user;
  END LOOP;
  DELETE FROM users
  WHERE email ILIKE 'tutor%@ykvirtual.test'
     OR email ILIKE 'tutor.%@ykvirtual.test';

  -- 4. Also remove the demo parent/student identities (non-production).
  DELETE FROM parent_student_links WHERE parent_user_id IN (
    SELECT id FROM users WHERE email IN ('demo.parent@ykvirtual.test','demo.student@ykvirtual.test')
  );
  DELETE FROM users WHERE email IN ('demo.parent@ykvirtual.test','demo.student@ykvirtual.test');
END $$;
