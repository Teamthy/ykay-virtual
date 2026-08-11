-- 000012_vetting_assessment: competency assessment engine (Phase 4)
-- Tuteria parity: "Take test" in the tutor funnel; YKAY adds a real question
-- bank, timed attempts, pass/fail scoring and 12-month competency expiry.

CREATE TABLE assessment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options JSONB NOT NULL,          -- ["A. ...", "B. ...", "C. ...", "D. ..."]
    correct_index INT NOT NULL CHECK (correct_index >= 0),
    explanation TEXT,
    difficulty INT NOT NULL DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessment_q_subject ON assessment_questions(subject_id, is_active);

CREATE TABLE assessment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','COMPLETED')),
    score DECIMAL(5,2),
    max_score DECIMAL(5,2),
    passed BOOLEAN,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_assessment_attempts_tutor ON assessment_attempts(tutor_profile_id, status);
CREATE INDEX idx_assessment_attempts_subject ON assessment_attempts(subject_id);

CREATE TABLE assessment_answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    attempt_id UUID NOT NULL REFERENCES assessment_attempts(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES assessment_questions(id) ON DELETE CASCADE,
    chosen_index INT,
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    answered_at TIMESTAMPTZ,
    UNIQUE(attempt_id, question_id)
);

CREATE INDEX idx_assessment_answers_attempt ON assessment_answers(attempt_id);

-- Seed a starter question bank for the flagship subjects (idempotent).
-- 8 questions each: Mathematics, English Language, Physics, Computer Science.
INSERT INTO assessment_questions (subject_id, question, options, correct_index, explanation, difficulty)
SELECT s.id, q.question, q.options::jsonb, q.correct_index, q.explanation, q.difficulty
FROM subjects s
JOIN (VALUES
  ('mathematics',
   'What is the value of 3x + 5 when x = 4?',
   '["A. 12", "B. 15", "C. 17", "D. 20"]', 2,
   '3(4) + 5 = 12 + 5 = 17.', 1),
  ('mathematics',
   'Solve for x: 2x - 7 = 11',
   '["A. 2", "B. 7", "C. 9", "D. 18"]', 2,
   '2x = 18, so x = 9.', 1),
  ('mathematics',
   'What is 25% of 240?',
   '["A. 48", "B. 60", "C. 72", "D. 80"]', 1,
   '240 × 0.25 = 60.', 1),
  ('mathematics',
   'The area of a circle with radius 7 cm (π = 22/7) is:',
   '["A. 154 cm²", "B. 144 cm²", "C. 44 cm²", "D. 308 cm²"]', 0,
   'A = πr² = (22/7) × 49 = 154 cm².', 2),
  ('mathematics',
   'Simplify: (x²y³)/(xy)',
   '["A. xy²", "B. x³y⁴", "C. x²y²", "D. xy³"]', 0,
   'x²/x = x and y³/y = y², giving xy².', 2),
  ('mathematics',
   'If y = 2x + 3 and x = 5, find y.',
   '["A. 10", "B. 13", "C. 16", "D. 20"]', 1,
   'y = 2(5) + 3 = 13.', 1),
  ('mathematics',
   'What is the mean of 4, 8, 12 and 16?',
   '["A. 8", "B. 10", "C. 12", "D. 14"]', 1,
   '(4+8+12+16)/4 = 40/4 = 10.', 1),
  ('mathematics',
   'A man buys a shirt for ₦3,000 and sells it for ₦3,600. His profit percent is:',
   '["A. 16.7%", "B. 20%", "C. 25%", "D. 30%"]', 1,
   'Profit = 600; 600/3000 × 100 = 20%.', 2),

  ('english-language',
   'Choose the correct spelling:',
   '["A. Occurence", "B. Occurrence", "C. Occurencee", "D. Occurrance"]', 1,
   'Occurrence has double r and double c.', 1),
  ('english-language',
   'Identify the part of speech of the word "quickly" in: She ran quickly.',
   '["A. Adjective", "B. Noun", "C. Adverb", "D. Preposition"]', 2,
   '"Quickly" modifies the verb "ran" — it is an adverb.', 1),
  ('english-language',
   'Which sentence is in the passive voice?',
   '["A. The dog bit the man.", "B. The man was bitten by the dog.", "C. The man bites the dog.", "D. The dog is biting."]', 1,
   'Passive: subject receives the action — "was bitten".', 2),
  ('english-language',
   'Choose the correct option: Neither of the boys ___ present.',
   '["A. were", "B. was", "C. are", "D. have been"]', 1,
   '"Neither" is singular, so the verb is "was".', 2),
  ('english-language',
   'The antonym of "generous" is:',
   '["A. Kind", "B. Miserly", "C. Wealthy", "D. Caring"]', 1,
   'Miserly means stingy — the opposite of generous.', 1),
  ('english-language',
   'Which of these is a synonym of "abundant"?',
   '["A. Scarce", "B. Plentiful", "C. Rare", "D. Empty"]', 1,
   'Abundant = plentiful.', 1),
  ('english-language',
   'Choose the correct question tag: He has finished his work, ___?',
   '["A. has he", "B. hasn''t he", "C. doesn''t he", "D. did he"]', 1,
   'Positive statement → negative tag: "hasn''t he".', 1),
  ('english-language',
   '"The students were as busy as ___." Complete with the correct idiom:',
   '["A. bees", "B. birds", "C. ants", "D. cats"]', 0,
   'The idiom is "as busy as bees".', 2),

  ('physics',
   'The SI unit of force is the:',
   '["A. Joule", "B. Watt", "C. Newton", "D. Pascal"]', 2,
   'Force is measured in newtons (N).', 1),
  ('physics',
   'A car accelerates from rest at 2 m/s². Its velocity after 5 s is:',
   '["A. 5 m/s", "B. 10 m/s", "C. 15 m/s", "D. 20 m/s"]', 1,
   'v = u + at = 0 + 2×5 = 10 m/s.', 1),
  ('physics',
   'Which energy conversion occurs in a hydroelectric dam?',
   '["A. Chemical → Electrical", "B. Potential → Kinetic → Electrical", "C. Nuclear → Thermal", "D. Sound → Light"]', 1,
   'Water''s potential energy becomes kinetic, driving turbines to generate electricity.', 2),
  ('physics',
   'The speed of light in a vacuum is approximately:',
   '["A. 3 × 10⁶ m/s", "B. 3 × 10⁸ m/s", "C. 3 × 10¹⁰ m/s", "D. 3000 m/s"]', 1,
   'c ≈ 3 × 10⁸ m/s.', 1),
  ('physics',
   'Ohm''s law states that V = I × R. If I = 3 A and R = 4 Ω, the voltage is:',
   '["A. 7 V", "B. 12 V", "C. 1.33 V", "D. 0.75 V"]', 1,
   'V = 3 × 4 = 12 V.', 1),
  ('physics',
   'Which of the following is a scalar quantity?',
   '["A. Velocity", "B. Force", "C. Distance", "D. Acceleration"]', 2,
   'Distance has magnitude only — it is scalar.', 2),
  ('physics',
   'Sound cannot travel through:',
   '["A. Water", "B. Steel", "C. A vacuum", "D. Air"]', 2,
   'Sound needs a medium; a vacuum has none.', 1),
  ('physics',
   'The weight of a 5 kg mass (g = 10 m/s²) is:',
   '["A. 5 N", "B. 10 N", "C. 50 N", "D. 0.5 N"]', 2,
   'W = mg = 5 × 10 = 50 N.', 1),

  ('computer-science',
   'Which data structure works on First-In-First-Out (FIFO)?',
   '["A. Stack", "B. Queue", "C. Tree", "D. Graph"]', 1,
   'A queue is FIFO; a stack is LIFO.', 1),
  ('computer-science',
   'What does CPU stand for?',
   '["A. Central Processing Unit", "B. Computer Personal Unit", "C. Central Program Utility", "D. Control Processing Unit"]', 0,
   'CPU = Central Processing Unit.', 1),
  ('computer-science',
   'Which of the following is NOT a programming language?',
   '["A. Python", "B. HTML", "C. JavaScript", "D. Java"]', 1,
   'HTML is a markup language, not a programming language.', 1),
  ('computer-science',
   'In binary, the decimal number 10 is represented as:',
   '["A. 1010", "B. 1001", "C. 1100", "D. 1011"]', 0,
   '10 = 8 + 2 = 1010₂.', 2),
  ('computer-science',
   'What is the time complexity of binary search on a sorted array of n elements?',
   '["A. O(n)", "B. O(n²)", "C. O(log n)", "D. O(1)"]', 2,
   'Binary search halves the search space each step: O(log n).', 2),
  ('computer-science',
   'Which protocol is used to securely browse the web?',
   '["A. FTP", "B. HTTP", "C. HTTPS", "D. SMTP"]', 2,
   'HTTPS encrypts traffic with TLS.', 1),
  ('computer-science',
   'Which of the following is a relational database?',
   '["A. Redis", "B. MongoDB", "C. PostgreSQL", "D. Elasticsearch"]', 2,
   'PostgreSQL is a relational (SQL) database.', 1),
  ('computer-science',
   'What is the output of 2 ** 3 in Python?',
   '["A. 6", "B. 8", "C. 9", "D. 5"]', 1,
   '** is exponentiation: 2³ = 8.', 1)
) AS q(subject_slug, question, options, correct_index, explanation, difficulty)
ON s.slug = q.subject_slug
ON CONFLICT DO NOTHING;
