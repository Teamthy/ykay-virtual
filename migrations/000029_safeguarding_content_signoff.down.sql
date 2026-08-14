ALTER TABLE programmes
    DROP COLUMN IF EXISTS published_at,
    DROP COLUMN IF EXISTS review_due_at;

ALTER TABLE testimonials
    DROP COLUMN IF EXISTS consent_source,
    DROP COLUMN IF EXISTS consent_date,
    DROP COLUMN IF EXISTS published_at,
    DROP COLUMN IF EXISTS published_by;

ALTER TABLE support_tickets
    DROP COLUMN IF EXISTS category,
    DROP COLUMN IF EXISTS severity,
    DROP COLUMN IF EXISTS sla_due_at,
    DROP COLUMN IF EXISTS resolved_at;
