-- 000053_user_profile_extras.down

ALTER TABLE users DROP COLUMN IF EXISTS preferred_language;
ALTER TABLE users DROP COLUMN IF EXISTS bio;
