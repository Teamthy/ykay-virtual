-- Unique provider+reference so a payment cannot be recorded twice for the same
-- gateway charge. Existing NULLs are left as-is (partial unique).
CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_reference_unique
  ON payments (provider, provider_reference)
  WHERE provider_reference IS NOT NULL;
