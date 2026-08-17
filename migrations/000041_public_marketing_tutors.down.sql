-- 000041 down — remove the permanent marketing tutor profiles and their
-- backing users (reverse of 000041 up).

DELETE FROM tutor_subjects
WHERE tutor_profile_id IN (
  SELECT id FROM tutor_profiles
  WHERE slug IN ('chinasa','oluwatobi','olanike','adewale','judith','demilola')
);

DELETE FROM tutor_profiles
WHERE slug IN ('chinasa','oluwatobi','olanike','adewale','judith','demilola');

DELETE FROM user_roles
WHERE user_id IN (
  SELECT id FROM users
  WHERE email IN (
    'tutor.chinasa@nuvora.test',
    'tutor.oluwatobi@nuvora.test',
    'tutor.olanike@nuvora.test',
    'tutor.adewale@nuvora.test',
    'tutor.judith@nuvora.test',
    'tutor.demilola@nuvora.test'
  )
);

DELETE FROM users
WHERE email IN (
  'tutor.chinasa@nuvora.test',
  'tutor.oluwatobi@nuvora.test',
  'tutor.olanike@nuvora.test',
  'tutor.adewale@nuvora.test',
  'tutor.judith@nuvora.test',
  'tutor.demilola@nuvora.test'
);
