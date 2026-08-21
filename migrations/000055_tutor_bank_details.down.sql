-- 000055_tutor_bank_details.down

ALTER TABLE tutor_profiles DROP COLUMN IF EXISTS account_name;
ALTER TABLE tutor_profiles DROP COLUMN IF EXISTS account_number;
ALTER TABLE tutor_profiles DROP COLUMN IF EXISTS bank_name;
