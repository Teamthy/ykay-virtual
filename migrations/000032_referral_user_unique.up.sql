-- 000032 — referral_codes.user_id unique (latent bug: the repo inserts with
-- ON CONFLICT (user_id) but the table only had a non-unique index, so every
-- /me/referral-code request 500'd on a fresh database).
-- One referral code per user is the domain rule (create ON CONFLICT DO UPDATE).
DELETE FROM referral_codes a
USING referral_codes b
WHERE a.user_id = b.user_id AND a.created_at < b.created_at;

CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_user_key ON referral_codes(user_id);
