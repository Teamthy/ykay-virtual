-- Disposable SUPER_ADMIN for throwaway e2e databases only.
-- 000042 disables admin@ykaycollege.com; this account is NOT a production identity.
-- Password: password123 (same bcrypt as historical 000019 demo hash).

INSERT INTO users (id, email, password_hash, status, timezone, email_verified_at, onboarded_at, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-00000000e2e1',
  'e2e-admin@test.invalid',
  '$2a$10$L1nxlPVZP1enrb3DrCulHuXRCscyduEgYWl9oPII4o3BJ9i9aCT2y',
  'ACTIVE',
  'Africa/Lagos',
  NOW(),
  NOW(),
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET deleted_at = NULL,
    password_hash = EXCLUDED.password_hash,
    status = 'ACTIVE',
    email_verified_at = NOW(),
    onboarded_at = NOW();

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'SUPER_ADMIN'
WHERE u.email = 'e2e-admin@test.invalid'
ON CONFLICT DO NOTHING;
