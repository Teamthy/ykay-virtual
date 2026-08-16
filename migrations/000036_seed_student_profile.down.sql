-- 000036 (down) — remove the demo student profile + parent link backfilled by up.
DELETE FROM parent_student_links
WHERE student_profile_id = '00000000-0000-0000-0000-0000000000c3';

DELETE FROM student_profiles
WHERE id = '00000000-0000-0000-0000-0000000000c3';
