-- Demo users for every role (phase 28) — so each dashboard can be reached
-- with one account. Password for all: password123
-- (bcrypt hash: $2a$10$L1nxlPVZP1enrb3DrCulHuXRCscyduEgYWl9oPII4o3BJ9i9aCT2y)

INSERT INTO users (id, email, password_hash, status, timezone, email_verified_at, created_at, updated_at) VALUES
('00000000-0000-0000-0000-0000000000a1', 'admin@ykaycollege.com',   '$2a$10$L1nxlPVZP1enrb3DrCulHuXRCscyduEgYWl9oPII4o3BJ9i9aCT2y', 'ACTIVE', 'Africa/Lagos', NOW(), NOW(), NOW()),
('00000000-0000-0000-0000-0000000000a2', 'parent@ykaycollege.com',  '$2a$10$L1nxlPVZP1enrb3DrCulHuXRCscyduEgYWl9oPII4o3BJ9i9aCT2y', 'ACTIVE', 'Africa/Lagos', NOW(), NOW(), NOW()),
('00000000-0000-0000-0000-0000000000a3', 'tutor@ykaycollege.com',   '$2a$10$L1nxlPVZP1enrb3DrCulHuXRCscyduEgYWl9oPII4o3BJ9i9aCT2y', 'ACTIVE', 'Africa/Lagos', NOW(), NOW(), NOW()),
('00000000-0000-0000-0000-0000000000a4', 'student@ykaycollege.com', '$2a$10$L1nxlPVZP1enrb3DrCulHuXRCscyduEgYWl9oPII4o3BJ9i9aCT2y', 'ACTIVE', 'Africa/Lagos', NOW(), NOW(), NOW());

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.name = 'SUPER_ADMIN' WHERE u.email = 'admin@ykaycollege.com';
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.name = 'PARENT' WHERE u.email = 'parent@ykaycollege.com';
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.name = 'TUTOR' WHERE u.email = 'tutor@ykaycollege.com';
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u JOIN roles r ON r.name = 'STUDENT' WHERE u.email = 'student@ykaycollege.com';

-- Demo learner linked to the parent account.
INSERT INTO student_profiles (id, user_id, first_name, last_name, timezone, guardian_consent, created_at, updated_at)
SELECT '00000000-0000-0000-0000-000000000001', u.id, 'Ada', 'Bello', 'Africa/Lagos', true, NOW(), NOW()
FROM users u WHERE u.email = 'parent@ykaycollege.com'
ON CONFLICT (id) DO NOTHING;
