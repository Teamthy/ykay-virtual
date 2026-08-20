-- 000053_user_profile_extras: persist onboarding details (bio, preferred
-- language) on the user record so the dashboard and account settings reflect
-- exactly what the learner entered during signup/onboarding.

ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(40);
