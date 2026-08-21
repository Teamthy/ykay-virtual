-- 000055_tutor_bank_details: tutor payout destination (bank transfer).
-- Bank details are only returned on owner/admin surfaces — never in public
-- tutor search results.

ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS bank_name VARCHAR(120);
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS account_number VARCHAR(20);
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS account_name VARCHAR(160);
