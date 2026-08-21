-- 000058_auth_tokens_mfa: the MFA challenge token purpose was defined in
-- code (identity.TokenMFAChallenge, used by the admin login flow) but was
-- missing from the auth_tokens.purpose CHECK constraint added in 000024.
-- Admin (ACADEMIC_ADMIN / SUPER_ADMIN) logins therefore failed with
-- "new row for relation \"auth_tokens\" violates check constraint
-- \"auth_tokens_purpose_check\"" — on every backend, including local dev.
ALTER TABLE auth_tokens DROP CONSTRAINT IF EXISTS auth_tokens_purpose_check;
ALTER TABLE auth_tokens ADD CONSTRAINT auth_tokens_purpose_check
    CHECK (purpose IN ('VERIFY_EMAIL','PASSWORD_RESET','LOGIN_CODE','MFA_CHALLENGE'));
