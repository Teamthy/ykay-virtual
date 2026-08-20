-- 000054_leads: lead capture for conversion follow-up. Visitors who browse
-- but don't enroll (callback requests, exit-intent captures, enrollment
-- starts that never reach payment) land here; the ops team follows up on
-- WhatsApp and marks them CONTACTED / CONVERTED / CLOSED.

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL DEFAULT '',
    email VARCHAR(255),
    phone VARCHAR(40),
    source VARCHAR(255) NOT NULL DEFAULT 'website',
    intent VARCHAR(40) NOT NULL DEFAULT 'CALLBACK_REQUEST',
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'NEW'
        CHECK (status IN ('NEW','CONTACTED','CONVERTED','CLOSED')),
    contacted_at TIMESTAMPTZ,
    converted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_status_created ON leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads (email);
CREATE INDEX IF NOT EXISTS idx_leads_intent_user ON leads (intent, user_id, created_at DESC);
