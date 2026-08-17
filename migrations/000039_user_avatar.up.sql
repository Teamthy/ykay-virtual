-- 000039 — profile photos: avatar_url on users (settings hub, Phase 2).
-- Stores a PUBLIC object URL (S3/MinIO public bucket); the upload itself
-- flows through POST /me/avatar which enforces size/MIME via the upload
-- guard before persisting the URL.
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
