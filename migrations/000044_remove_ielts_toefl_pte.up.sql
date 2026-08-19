-- 000044 — Remove IELTS, TOEFL and PTE catalogue rows.
--
-- These are removed from product scope. GMAT, GRE, SAT and ACT remain.
-- Only references real tables: programme_subjects, tutor_subjects,
-- exams, subjects.

-- Remove programme links.
DELETE FROM programme_subjects
WHERE subject_id IN (SELECT id FROM subjects WHERE slug IN ('ielts-prep','toefl-prep','pte-prep'));

-- Remove tutor links.
DELETE FROM tutor_subjects
WHERE subject_id IN (SELECT id FROM subjects WHERE slug IN ('ielts-prep','toefl-prep','pte-prep'));

-- Remove exam records.
DELETE FROM exams WHERE slug IN ('ielts','toefl','pte');

-- Remove subject records.
DELETE FROM subjects WHERE slug IN ('ielts-prep','toefl-prep','pte-prep');
