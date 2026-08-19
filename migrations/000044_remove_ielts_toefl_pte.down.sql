-- 000044 down — re-add IELTS, TOEFL and PTE catalogue rows.
-- (Down is best-effort; it only restores the seed catalogue rows.)

INSERT INTO exams (name, slug, description) VALUES
('IELTS','ielts','International English Language Testing System'),
('TOEFL','toefl','Test of English as Foreign Language'),
('PTE','pte','Pearson Test of English')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO subjects (name, slug, category) VALUES
('IELTS Prep','ielts-prep','Exam Preparation'),
('TOEFL Prep','toefl-prep','Exam Preparation'),
('PTE Prep','pte-prep','Exam Preparation')
ON CONFLICT (slug) DO NOTHING;
