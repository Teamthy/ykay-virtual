-- 000064_recorded_library.up.sql — on-demand recorded-lesson library catalogue.
--
-- The virtual-school "recorded lesson library" expansion. A recorded lesson is
-- a `lessons` row with a `video_url` (000035) + optional `transcript` (000061).
-- This migration adds a 1:1 companion table so admins can curate which recorded
-- lessons appear in the public/on-demand catalogue WITHOUT touching the core
-- lessons table or every query that reads it (extend, don't fork).
--
-- A row in `recorded_library` = "this lesson is part of the library".
--   visible        -> appears in the public catalogue + search
--   featured       -> surfaced on the homepage / featured rail
--   thumbnail_url  -> poster image (public bucket), shown in cards
--   duration_seconds -> human-friendly watch duration
--   sort_order     -> catalogue ordering (lower first) within featured/visible
--
-- Gating note: the library is a browse/discovery surface. Playback remains
-- entitlement-scoped in the service layer (a viewer must be a participant of
-- the lesson's cohort/private package, or an admin), so making an item
-- "visible" never grants playback to non-members — it only puts its metadata
-- (title, description, cohort/programme, thumbnail, duration) in the catalogue.

CREATE TABLE IF NOT EXISTS recorded_library (
    lesson_id        UUID PRIMARY KEY REFERENCES lessons(id) ON DELETE CASCADE,
    visible          BOOLEAN NOT NULL DEFAULT FALSE,
    featured         BOOLEAN NOT NULL DEFAULT FALSE,
    thumbnail_url    TEXT,
    duration_seconds INT,
    sort_order       INT NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Catalogue scan: visible-first, featured + manual sort, then recency.
CREATE INDEX IF NOT EXISTS idx_recorded_library_catalogue
    ON recorded_library(visible, featured, sort_order);

-- Admin list: find the non-featured set quickly.
CREATE INDEX IF NOT EXISTS idx_recorded_library_featured
    ON recorded_library(featured) WHERE visible = TRUE;
