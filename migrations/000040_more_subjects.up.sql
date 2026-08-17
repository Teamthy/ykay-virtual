-- 000040 — expand the teaching-subject catalogue (tutor application, Phase 4).
-- Idempotent: ON CONFLICT (slug) DO NOTHING, so re-running is safe.
INSERT INTO subjects (name, slug, category) VALUES
-- Core academics
('Further Mathematics','further-mathematics','Academic'),
('Economics','economics','Academic'),
('Geography','geography','Academic'),
('Government','government','Academic'),
('History','history','Academic'),
('Literature in English','literature-in-english','Academic'),
('Business Studies','business-studies','Academic'),
('Accounting','accounting','Academic'),
('Agricultural Science','agricultural-science','Academic'),
('Technical Drawing','technical-drawing','Academic'),
-- Languages
('Arabic','arabic','Languages'),
('Chinese (Mandarin)','chinese-mandarin','Languages'),
('Portuguese','portuguese','Languages'),
('Igbo','igbo','Nigerian Languages'),
-- Digital / tech
('Web Development','web-development','Digital'),
('Data Science','data-science','Digital'),
('UI/UX Design','uiux-design','Digital'),
('Graphic Design','graphic-design','Digital'),
('Digital Marketing','digital-marketing','Digital'),
('Microsoft Office','microsoft-office','Digital'),
('Scratch Programming','scratch-programming','Digital'),
('Robotics','robotics','Digital'),
-- Exams
('SAT Prep','sat-prep','Exam Preparation'),
('GRE Prep','gre-prep','Exam Preparation'),
('TOEFL Prep','toefl-prep','Exam Preparation'),
('WAEC Prep','waec-prep','Exam Preparation'),
('JAMB/UTME Prep','jamb-utme-prep','Exam Preparation'),
('IGCSE Prep','igcse-prep','Exam Preparation'),
('Common Entrance','common-entrance','Exam Preparation'),
('BECE Prep','bece-prep','Exam Preparation'),
-- Music / arts
('Music Theory','music-theory','Music'),
('Drums','drums','Music'),
('Voice / Singing','voice-singing','Music'),
('Fine Art','fine-art','Arts'),
('Dance','dance','Arts'),
('Photography','photography','Arts'),
('Public Speaking','public-speaking','Life Skills'),
('Chess','chess','Life Skills'),
('French for Kids','french-for-kids','Languages')
ON CONFLICT (slug) DO NOTHING;
