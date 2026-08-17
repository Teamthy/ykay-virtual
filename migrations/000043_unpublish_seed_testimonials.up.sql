-- 000043 — Unpublish fabricated seed testimonials (Parent 1..12, seed-form).
-- Marketing must not show invented quotes. Real stories stay public.

UPDATE testimonials
SET is_public = FALSE,
    is_featured = FALSE
WHERE is_public = TRUE
  AND (
    author_name ~ '^Parent [0-9]+$'
    OR consent_source IN ('seed-form-v1', 'seed-consent-form-v1', 'demo-consent-form-v1')
    OR body ILIKE '%My daughter improved from average to top of her class%'
  );
