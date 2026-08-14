-- 000029 — safeguarding escalation + content sign-off (G5).
-- support_tickets: category/severity/SLA for safeguarding triage;
-- testimonials: consent evidence + publication sign-off;
-- programmes: publish-workflow metadata (review cadence).

ALTER TABLE support_tickets
    ADD COLUMN IF NOT EXISTS category VARCHAR(30) NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN IF NOT EXISTS severity VARCHAR(10) NOT NULL DEFAULT 'LOW',
    ADD COLUMN IF NOT EXISTS sla_due_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_support_category ON support_tickets(category);

ALTER TABLE testimonials
    ADD COLUMN IF NOT EXISTS consent_source VARCHAR(255),
    ADD COLUMN IF NOT EXISTS consent_date TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES users(id);

ALTER TABLE programmes
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS review_due_at TIMESTAMPTZ;
