-- 000042 — Neutralize EVERY known demo identity (000019 a1–a4 AND 000034 b1–b4)
-- by UUID and by documented emails. 000037 only targeted b1–b4, leaving
-- admin@ykaycollege.com (SUPER_ADMIN, password123) live after a full migrate.

DO $$
DECLARE
  v_ids UUID[] := ARRAY[
    '00000000-0000-0000-0000-0000000000a1',
    '00000000-0000-0000-0000-0000000000a2',
    '00000000-0000-0000-0000-0000000000a3',
    '00000000-0000-0000-0000-0000000000a4',
    '00000000-0000-0000-0000-0000000000b1',
    '00000000-0000-0000-0000-0000000000b2',
    '00000000-0000-0000-0000-0000000000b3',
    '00000000-0000-0000-0000-0000000000b4'
  ];
BEGIN
  DELETE FROM sessions
  WHERE user_id = ANY (v_ids)
     OR user_id IN (
        SELECT id FROM users WHERE lower(email) IN (
          'admin@ykaycollege.com', 'parent@ykaycollege.com',
          'tutor@ykaycollege.com', 'student@ykaycollege.com'
        )
     );

  DELETE FROM user_roles
  WHERE user_id = ANY (v_ids)
     OR user_id IN (
        SELECT id FROM users WHERE lower(email) IN (
          'admin@ykaycollege.com', 'parent@ykaycollege.com',
          'tutor@ykaycollege.com', 'student@ykaycollege.com'
        )
     );

  DELETE FROM parent_student_links
  WHERE parent_user_id = ANY (v_ids)
     OR parent_user_id IN (SELECT id FROM users WHERE lower(email) LIKE '%@ykaycollege.com'
        AND email IN ('admin@ykaycollege.com','parent@ykaycollege.com','tutor@ykaycollege.com','student@ykaycollege.com'))
     OR student_profile_id IN (
        SELECT id FROM student_profiles
        WHERE user_id = ANY (v_ids)
           OR user_id IN (SELECT id FROM users WHERE lower(email) IN (
             'admin@ykaycollege.com','parent@ykaycollege.com','tutor@ykaycollege.com','student@ykaycollege.com'
           ))
     );

  DELETE FROM tutor_profiles
  WHERE user_id = ANY (v_ids)
     OR user_id IN (SELECT id FROM users WHERE lower(email) IN (
       'admin@ykaycollege.com','parent@ykaycollege.com','tutor@ykaycollege.com','student@ykaycollege.com'
     ));

  DELETE FROM student_profiles
  WHERE user_id = ANY (v_ids)
     OR user_id IN (SELECT id FROM users WHERE lower(email) IN (
       'admin@ykaycollege.com','parent@ykaycollege.com','tutor@ykaycollege.com','student@ykaycollege.com'
     ));

  UPDATE users
  SET deleted_at = COALESCE(deleted_at, NOW()),
      password_hash = '!disabled-demo-account!',
      status = 'DELETED',
      email_verified_at = NULL,
      onboarded_at = NULL
  WHERE id = ANY (v_ids)
     OR lower(email) IN (
       'admin@ykaycollege.com', 'parent@ykaycollege.com',
       'tutor@ykaycollege.com', 'student@ykaycollege.com'
     );
END $$;
