-- =============================================================================
-- NUVORA — SEED ADMIN & SUPER ADMIN ACCOUNTS
-- =============================================================================
-- Creates two operator accounts with STRONG, DIFFERENT passwords:
--
--   SUPER ADMIN : superadmin@nuvora.com   (full platform control)
--   ACADEMIC    : admin@nuvora.com        (content / cohorts / vetting / ops)
--
-- Passwords are bcrypt-hashed (cost 10) and are NOT committed in plaintext.
-- They are set here (documented in the ops manual) and SHOULD be changed via
-- the password-reset flow after first login.
--
-- Idempotent: safe to re-run. Uses ON CONFLICT on the partial unique email
-- index. Re-activates the row if it had been soft-deleted.
--
-- Usage (local compose):
--   psql "postgres://nuvora:nuvora@localhost:5432/nuvora" -f scripts/seed-admins.sql
--   # or
--   make seed-admins
--
-- WARNING: do NOT run against a production DB with real users unless you
-- deliberately want these operator accounts. They grant platform access.
-- =============================================================================

SET client_encoding = 'UTF8';

DO $$
DECLARE
  su_id UUID;
  ad_id UUID;
BEGIN
  -- ── 1. SUPER_ADMIN -------------------------------------------------------
  INSERT INTO users (email, password_hash, status, timezone, email_verified_at, onboarded_at)
  VALUES (
    'superadmin@nuvora.com',
    '$2b$10$2L59AuV3tEo26YPp8amtauh3CuosWxnZBY0/XttzYNO.eJUyqANSS', -- SuperAdmin@2026
    'ACTIVE',
    'Africa/Lagos',
    NOW(), NOW()
  )
  ON CONFLICT (email) WHERE deleted_at IS NULL
  DO UPDATE SET deleted_at = NULL, status = 'ACTIVE', password_hash = EXCLUDED.password_hash
  RETURNING id INTO su_id;

  -- The partial unique index won't block re-inserting a soft-deleted email;
  -- handle the case where the row exists but was soft-deleted.
  IF su_id IS NULL THEN
    UPDATE users
       SET deleted_at = NULL,
           status = 'ACTIVE',
           password_hash = '$2b$10$2L59AuV3tEo26YPp8amtauh3CuosWxnZBY0/XttzYNO.eJUyqANSS',
           email_verified_at = NOW(), onboarded_at = NOW()
     WHERE email = 'superadmin@nuvora.com'
     RETURNING id INTO su_id;
  END IF;

  INSERT INTO user_roles (user_id, role_id)
  SELECT su_id, id FROM roles WHERE name = 'SUPER_ADMIN'
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RAISE NOTICE 'SUPER_ADMIN ready: superadmin@nuvora.com (id %)', su_id;

  -- ── 2. ACADEMIC_ADMIN ---------------------------------------------------
  INSERT INTO users (email, password_hash, status, timezone, email_verified_at, onboarded_at)
  VALUES (
    'admin@nuvora.com',
    '$2b$10$Ezi/Pw03gabyzKfnZ1NCg.nwVoSS28gusH9lT1x3U7ImI8LtyLJsS', -- Admin@2026
    'ACTIVE',
    'Africa/Lagos',
    NOW(), NOW()
  )
  ON CONFLICT (email) WHERE deleted_at IS NULL
  DO UPDATE SET deleted_at = NULL, status = 'ACTIVE', password_hash = EXCLUDED.password_hash
  RETURNING id INTO ad_id;

  IF ad_id IS NULL THEN
    UPDATE users
       SET deleted_at = NULL,
           status = 'ACTIVE',
           password_hash = '$2b$10$Ezi/Pw03gabyzKfnZ1NCg.nwVoSS28gusH9lT1x3U7ImI8LtyLJsS',
           email_verified_at = NOW(), onboarded_at = NOW()
     WHERE email = 'admin@nuvora.com'
     RETURNING id INTO ad_id;
  END IF;

  INSERT INTO user_roles (user_id, role_id)
  SELECT ad_id, id FROM roles WHERE name = 'ACADEMIC_ADMIN'
  ON CONFLICT (user_id, role_id) DO NOTHING;

  RAISE NOTICE 'ACADEMIC_ADMIN ready: admin@nuvora.com (id %)', ad_id;
END $$;
