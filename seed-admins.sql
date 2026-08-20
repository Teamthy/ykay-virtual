-- =============================================================================
-- NUVORA — SEED ADMIN & SUPER ADMIN ACCOUNTS (local/ops only)
-- =============================================================================
-- Creates two operator accounts. Passwords MUST be supplied via environment:
--
--   NUVORA_SUPERADMIN_BCRYPT  — bcrypt hash for superadmin@nuvora.com
--   NUVORA_ADMIN_BCRYPT       — bcrypt hash for admin@nuvora.com
--
-- Generate a hash (never commit plaintext passwords):
--   python3 -c 'import bcrypt; print(bcrypt.hashpw(b"YOUR_PASSWORD", bcrypt.gensalt(rounds=12)).decode())'
--
-- Idempotent. Do NOT run against production unless you intend to create these
-- operator accounts, then rotate passwords immediately via password-reset.
-- =============================================================================

SET client_encoding = 'UTF8';

DO $$
DECLARE
  su_id UUID;
  ad_id UUID;
  su_hash TEXT := current_setting('nuvora.superadmin_bcrypt', true);
  ad_hash TEXT := current_setting('nuvora.admin_bcrypt', true);
BEGIN
  IF su_hash IS NULL OR su_hash = '' THEN
    RAISE EXCEPTION 'Set nuvora.superadmin_bcrypt (bcrypt hash). Never store plaintext passwords in this file.';
  END IF;
  IF ad_hash IS NULL OR ad_hash = '' THEN
    RAISE EXCEPTION 'Set nuvora.admin_bcrypt (bcrypt hash). Never store plaintext passwords in this file.';
  END IF;

  INSERT INTO users (email, password_hash, status, timezone, email_verified_at, onboarded_at)
  VALUES ('superadmin@nuvora.com', su_hash, 'ACTIVE', 'Africa/Lagos', NOW(), NOW())
  ON CONFLICT (email) WHERE deleted_at IS NULL
  DO UPDATE SET deleted_at = NULL, status = 'ACTIVE', password_hash = EXCLUDED.password_hash
  RETURNING id INTO su_id;

  IF su_id IS NULL THEN
    UPDATE users
       SET deleted_at = NULL, status = 'ACTIVE', password_hash = su_hash,
           email_verified_at = NOW(), onboarded_at = NOW()
     WHERE email = 'superadmin@nuvora.com'
     RETURNING id INTO su_id;
  END IF;

  INSERT INTO user_roles (user_id, role_id)
  SELECT su_id, id FROM roles WHERE name = 'SUPER_ADMIN'
  ON CONFLICT (user_id, role_id) DO NOTHING;

  INSERT INTO users (email, password_hash, status, timezone, email_verified_at, onboarded_at)
  VALUES ('admin@nuvora.com', ad_hash, 'ACTIVE', 'Africa/Lagos', NOW(), NOW())
  ON CONFLICT (email) WHERE deleted_at IS NULL
  DO UPDATE SET deleted_at = NULL, status = 'ACTIVE', password_hash = EXCLUDED.password_hash
  RETURNING id INTO ad_id;

  IF ad_id IS NULL THEN
    UPDATE users
       SET deleted_at = NULL, status = 'ACTIVE', password_hash = ad_hash,
           email_verified_at = NOW(), onboarded_at = NOW()
     WHERE email = 'admin@nuvora.com'
     RETURNING id INTO ad_id;
  END IF;

  INSERT INTO user_roles (user_id, role_id)
  SELECT ad_id, id FROM roles WHERE name = 'ACADEMIC_ADMIN'
  ON CONFLICT (user_id, role_id) DO NOTHING;
END $$;
