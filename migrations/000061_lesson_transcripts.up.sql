-- 000061 — lesson transcripts (virtual-school phase, item 2/4).
--
-- A plain-text transcript attached to a (usually recorded) lesson: the
-- tutor's lesson notes in readable prose, captions export, or a summary.
-- Nullable and optional — lessons without transcripts are unaffected.
-- Attached/edited via POST /lessons/{id}/transcript (tutor-of-cohort or
-- admin), surfaced in the LMS course view and the recorded-lesson library.

ALTER TABLE lessons
    ADD COLUMN IF NOT EXISTS transcript TEXT;
