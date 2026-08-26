-- 000065_admissions_documents.up.sql — admissions expansion: supporting
-- documents + offer→accept fee wiring.
--
-- Supporting documents: a parent can attach documents to their application
-- (birth certificate, previous transcripts, references). Documents are stored
-- as object keys / hosted URLs (the value is an S3 object key or an https URL
-- the app already controls); we never store the binary here.
--
-- Offer fee: when an admin moves an application to OFFERED they may attach an
-- acceptance fee + currency + a message. The parent's Accept action then
-- auto-creates a PENDING order for that fee (the "auto-enrol fee wiring"),
-- which flows through the existing payment/escrow/webhook engine.

CREATE TABLE IF NOT EXISTS admissions_documents (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    application_id UUID NOT NULL REFERENCES admissions_applications(id) ON DELETE CASCADE,
    name           VARCHAR(255) NOT NULL,
    -- Object key (S3 public bucket) or hosted https URL. Never the raw binary.
    url            TEXT NOT NULL,
    mime_type      VARCHAR(100),
    size_bytes     BIGINT,
    uploaded_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admissions_documents_app
    ON admissions_documents(application_id);

ALTER TABLE admissions_applications
    ADD COLUMN IF NOT EXISTS offer_fee DECIMAL(12,2),
    ADD COLUMN IF NOT EXISTS offer_currency VARCHAR(3),
    ADD COLUMN IF NOT EXISTS offer_message TEXT;
