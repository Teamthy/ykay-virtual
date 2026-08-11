-- 000005_academics: curriculum, levels, subjects, programmes (British + Nigerian + Digital)
CREATE TYPE curriculum_type AS ENUM ('BRITISH','NIGERIAN','INTERNATIONAL','PROFESSIONAL','VOCATIONAL','DIGITAL');
CREATE TYPE programme_format AS ENUM ('COHORT','PRIVATE','BOOTCAMP','HOLIDAY','ONLINE_CLASS','HYBRID');
CREATE TYPE programme_status AS ENUM ('DRAFT','PUBLISHED','ARCHIVED');

CREATE TABLE curricula (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    type curriculum_type NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE levels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    curriculum_id UUID NOT NULL REFERENCES curricula(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    order_index INT NOT NULL DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(curriculum_id, slug)
);

CREATE INDEX idx_levels_curriculum ON levels(curriculum_id);

CREATE TABLE subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    category VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_subjects_slug ON subjects(slug);
CREATE INDEX idx_subjects_category ON subjects(category);

CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE programmes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    summary TEXT,
    description TEXT,
    curriculum_id UUID REFERENCES curricula(id) ON DELETE SET NULL,
    level_id UUID REFERENCES levels(id) ON DELETE SET NULL,
    exam_id UUID REFERENCES exams(id) ON DELETE SET NULL,
    format programme_format NOT NULL DEFAULT 'COHORT',
    status programme_status NOT NULL DEFAULT 'DRAFT',
    duration_weeks INT,
    price_min DECIMAL(10,2),
    price_max DECIMAL(10,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    seo_title VARCHAR(255),
    seo_description TEXT,
    cover_image_key TEXT, -- S3 public bucket
    created_by UUID REFERENCES users(id),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_programmes_slug ON programmes(slug);
CREATE INDEX idx_programmes_status ON programmes(status);
CREATE INDEX idx_programmes_curriculum ON programmes(curriculum_id);
CREATE INDEX idx_programmes_level ON programmes(level_id);
CREATE INDEX idx_programmes_format ON programmes(format);
CREATE INDEX idx_programmes_featured ON programmes(is_featured) WHERE is_featured = TRUE;

CREATE TABLE programme_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(programme_id, subject_id)
);

CREATE TABLE tutor_subjects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    curriculum_id UUID REFERENCES curricula(id) ON DELETE SET NULL,
    level_id UUID REFERENCES levels(id) ON DELETE SET NULL,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tutor_profile_id, subject_id, curriculum_id, level_id)
);

CREATE INDEX idx_tutor_subjects_tutor ON tutor_subjects(tutor_profile_id);
CREATE INDEX idx_tutor_subjects_subject ON tutor_subjects(subject_id);

-- Update competency_assessments FK now that subjects exists
ALTER TABLE competency_assessments ADD CONSTRAINT fk_competency_subject FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE SET NULL;

-- Seed curricula
INSERT INTO curricula (name, slug, type, description) VALUES
('British Curriculum','british','BRITISH','Year 7-9, IGCSE Year 10-11, A Level pathways'),
('Nigerian Curriculum','nigerian','NIGERIAN','JSS1-3, SSS1-3 with WAEC/NECO/JAMB focus'),
('Digital Academy','digital-academy','DIGITAL','Computer Science, Python, AI, Cybersecurity'),
('Professional Exams','professional','PROFESSIONAL','IELTS, GMAT, GRE, SAT, TOEFL, ICAN, PTE, ACT'),
('Vocational / HCA','vocational-hca','VOCATIONAL','Healthcare Assistant & Caregiver training')
ON CONFLICT (slug) DO NOTHING;

-- Seed exams from Tuteria parity
INSERT INTO exams (name, slug, description) VALUES
('IGCSE','igcse','British IGCSE examinations'),
('WAEC','waec','West African Examination Council'),
('NECO','neco','National Examinations Council'),
('JAMB/UTME','jamb','Joint Admissions and Matriculation Board'),
('A Level','a-level','British A Levels'),
('IELTS','ielts','International English Language Testing System'),
('GMAT','gmat','Graduate Management Admission Test'),
('GRE','gre','Graduate Record Examination'),
('SAT','sat','Scholastic Assessment Test'),
('TOEFL','toefl','Test of English as Foreign Language'),
('ICAN','ican','Institute of Chartered Accountants of Nigeria'),
('PTE','pte','Pearson Test of English'),
('ACT','act','American College Testing')
ON CONFLICT (slug) DO NOTHING;

-- Seed subjects
INSERT INTO subjects (name, slug, category) VALUES
('Mathematics','mathematics','Academic'),('English Language','english-language','Academic'),
('Basic Mathematics','basic-mathematics','Academic'),('Basic Science','basic-science','Academic'),
('Physics','physics','Academic'),('Chemistry','chemistry','Academic'),('Biology','biology','Academic'),
('Computer Science','computer-science','Digital'),('Python Programming','python-programming','Digital'),
('Artificial Intelligence','artificial-intelligence','Digital'),('Cybersecurity','cybersecurity','Digital'),
('French','french','Languages'),('Yoruba','yoruba','Nigerian Languages'),('Hausa','hausa','Nigerian Languages'),
('German','german','Languages'),('Spanish','spanish','Languages'),
('Piano','piano','Music'),('Guitar','guitar','Music'),('Violin','violin','Music'),
('IELTS Prep','ielts-prep','Exam Preparation'),('GMAT Prep','gmat-prep','Exam Preparation')
ON CONFLICT (slug) DO NOTHING;
