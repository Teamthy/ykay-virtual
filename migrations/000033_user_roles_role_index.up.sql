-- 000033: index user_roles(role_id) — role-scoped queries (e.g. "every
-- SUPER_ADMIN", admin inbox lookups, RolesForUser joins by role) currently scan
-- the whole table because only the composite UNIQUE(user_id, role_id) index
-- exists. Adds a small covering index for role-first lookups.
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
