-- 000063_academic_calendar.down.sql â€” roll back virtual-school Pillar 1.
ALTER TABLE cohorts DROP COLUMN IF EXISTS term_id;
DROP TABLE IF EXISTS academic_terms;
DROP TABLE IF EXISTS academic_sessions;
