-- 000056_paystack_transfers.down

ALTER TABLE payouts DROP COLUMN IF EXISTS otp_required;
ALTER TABLE payouts DROP COLUMN IF EXISTS transfer_code;

ALTER TABLE tutor_profiles DROP COLUMN IF EXISTS paystack_recipient_code;
ALTER TABLE tutor_profiles DROP COLUMN IF EXISTS bank_code;
