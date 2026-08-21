-- 000056_paystack_transfers: Paystack payout transfers (one-click bank payouts).
-- tutor_profiles gains the bank code (Paystack requires the bank code, not the
-- display name) and a cached transfer-recipient code; payouts gain the
-- transfer code + OTP flag for the initiate/finalize flow.

ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS bank_code VARCHAR(10);
ALTER TABLE tutor_profiles ADD COLUMN IF NOT EXISTS paystack_recipient_code VARCHAR(64);

ALTER TABLE payouts ADD COLUMN IF NOT EXISTS transfer_code VARCHAR(255);
ALTER TABLE payouts ADD COLUMN IF NOT EXISTS otp_required BOOLEAN NOT NULL DEFAULT FALSE;
