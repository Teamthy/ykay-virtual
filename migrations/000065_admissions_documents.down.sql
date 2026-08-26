-- 000065_admissions_documents.down.sql
DROP TABLE IF EXISTS admissions_documents;
ALTER TABLE admissions_applications
    DROP COLUMN IF EXISTS offer_fee,
    DROP COLUMN IF EXISTS offer_currency,
    DROP COLUMN IF EXISTS offer_message;
