-- 000066_plus_subscriptions.up.sql — NUVORA Plus premium tier.
--
-- Turns the marketing-only "NUVORA Plus" page into a real, sellable premium
-- tier: subscription plans + active-subscription entitlements that gate the
-- already-built premium features (verified certificates, full CBT practice-exam
-- vault, recorded-library transcripts, and a higher AI-assistant allowance).
--
-- Two concerns:
--   1. subscription_plans + subscriptions — who has an active Plus plan.
--   2. plus_usage — per-user, per-day, per-feature counters for usage-based
--      gates (the AI assistant's daily query allowance; reusable later for
--      other limits like "weekly reports").
--
-- practice_exams.premium — flags an exam as part of the Plus CBT vault.

CREATE TABLE IF NOT EXISTS subscription_plans (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code       VARCHAR(32) NOT NULL UNIQUE,          -- PLUS | PLUS_FAMILY | PLUS_TEAMS
    name       VARCHAR(120) NOT NULL,
    billing    VARCHAR(16) NOT NULL DEFAULT 'MONTHLY' CHECK (billing IN ('MONTHLY','ANNUAL')),
    price      DECIMAL(12,2) NOT NULL,
    currency   VARCHAR(3) NOT NULL DEFAULT 'NGN',
    trial_days INT NOT NULL DEFAULT 7,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscriptions (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_code   VARCHAR(32) NOT NULL REFERENCES subscription_plans(code),
    status      VARCHAR(16) NOT NULL DEFAULT 'ACTIVE'
                CHECK (status IN ('TRIAL','ACTIVE','EXPIRED','CANCELLED')),
    started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    trial_ends_at TIMESTAMPTZ,
    ends_at     TIMESTAMPTZ NOT NULL,
    auto_renew  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_active
    ON subscriptions(user_id, status);

CREATE TABLE IF NOT EXISTS plus_usage (
    user_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature  VARCHAR(32) NOT NULL,                   -- 'ai_assistant'
    day      DATE NOT NULL,
    count    INT NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, feature, day)
);

-- Practice exam can be flagged as a Plus (premium) vault item.
ALTER TABLE practice_exams ADD COLUMN IF NOT EXISTS premium BOOLEAN NOT NULL DEFAULT FALSE;

-- Default plans (idempotent). Plus = individual, Plus Family = whole linked
-- family, Plus Teams = institutions/orgs.
INSERT INTO subscription_plans (code, name, billing, price, currency, trial_days)
VALUES
    ('PLUS', 'NUVORA Plus', 'MONTHLY', 52500, 'NGN', 7),
    ('PLUS_FAMILY', 'NUVORA Plus Family', 'MONTHLY', 85000, 'NGN', 7),
    ('PLUS_TEAMS', 'NUVORA Plus Teams', 'ANNUAL', 900000, 'NGN', 0)
ON CONFLICT (code) DO NOTHING;
