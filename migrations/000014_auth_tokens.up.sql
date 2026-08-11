-- 000014_auth_tokens: email verification + password reset tokens (Phase 8)
-- Only the SHA-256 hash of each token is stored; raw tokens travel only in
-- emailed links. Tokens are single-use (consumed_at) and expire (expires_at).

CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('VERIFY_EMAIL','PASSWORD_RESET')),
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id, purpose);
CREATE INDEX idx_auth_tokens_hash ON auth_tokens(token_hash);
