-- 000025: tutor_subjects needs the unique constraint the repo's
-- ON CONFLICT (tutor_profile_id, subject_id) relies on (found during the
-- first real-Postgres deployment, phase 41).
CREATE UNIQUE INDEX IF NOT EXISTS tutor_subjects_profile_subject_unique
    ON tutor_subjects (tutor_profile_id, subject_id);
