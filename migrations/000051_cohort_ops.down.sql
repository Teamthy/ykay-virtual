DROP TABLE IF EXISTS cohort_join_requests;
DROP INDEX IF EXISTS idx_cohorts_code;
ALTER TABLE cohorts DROP COLUMN IF EXISTS banner_url;
ALTER TABLE cohorts DROP COLUMN IF EXISTS code;
