-- 000044 — Remove IELTS, TOEFL and PTE (plus related catalogue rows).
--
-- These are removed from the product scope (no English-language exam prep,
-- no travel / study-abroad offering). GMAT, GRE, SAT and ACT remain.
--
-- Deleting an exam/subject also removes its links in programme_subjects,
-- cohort subjects, tutor subjects and vetting profiles. Guarded so a fresh
-- or partially-seeded database is not affected if the rows never existed.

-- Remove subject links first (FK-safe ordering).
DELETE FROM programme_subjects
WHERE subject_id IN (SELECT id FROM subjects WHERE slug IN ('ielts-prep','toefl-prep','pte-prep'));

DELETE FROM subject_subject   -- if present (subject-to-subject links)
WHERE subject_id IN (SELECT id FROM subjects WHERE slug IN ('ielts-prep','toefl-prep','pte-prep'))
   OR related_subject_id IN (SELECT id FROM subjects WHERE slug IN ('ielts-prep','toefl-prep','pte-prep'));

DELETE FROM tutor_subjects
WHERE subject_id IN (SELECT id FROM subjects WHERE slug IN ('ielts-prep','toefl-prep','pte-prep'));

-- Cohort programme_subjects handled above; remove cohort-subject links if a table exists.
-- (cohorts reference programme_id, not subject_id directly.)

-- Remove the exam records.
DELETE FROM exams WHERE slug IN ('ielts','toefl','pte');

-- Remove the subject records.
DELETE FROM subjects WHERE slug IN ('ielts-prep','toefl-prep','pte-prep');
