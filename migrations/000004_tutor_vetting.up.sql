-- 000004_tutor_vetting: tutor profiles + staged vetting (Tuteria 7 stages parity)
CREATE TYPE tutor_status AS ENUM ('DRAFT','SUBMITTED','UNDER_REVIEW','INTERVIEW','VERIFICATION','APPROVED','REJECTED','SUSPENDED','HOLD');
CREATE TYPE vetting_stage_type AS ENUM ('ACCOUNT','PERSONAL_PROFILE','PROFESSIONAL','TEACHING_SCOPE','EVIDENCE','SCREENING','DECISION','ACTIVATION');
CREATE TYPE document_type AS ENUM ('GOVT_ID','CERTIFICATE','CV','REFERENCE_LETTER','GUARANTOR_ID','OTHER');
CREATE TYPE document_status AS ENUM ('PENDING','APPROVED','REJECTED');

CREATE TABLE tutor_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    slug VARCHAR(255) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    bio TEXT,
    headline VARCHAR(255),
    years_experience INT NOT NULL DEFAULT 0,
    hourly_rate_min DECIMAL(10,2),
    hourly_rate_max DECIMAL(10,2),
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status tutor_status NOT NULL DEFAULT 'DRAFT',
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES users(id),
    rating_avg DECIMAL(3,2) NOT NULL DEFAULT 0,
    rating_count INT NOT NULL DEFAULT 0,
    total_hours_taught INT NOT NULL DEFAULT 0,
    total_students INT NOT NULL DEFAULT 0,
    ranking_score DECIMAL(10,4) NOT NULL DEFAULT 0,
    timezone VARCHAR(100) NOT NULL DEFAULT 'Africa/Lagos',
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    accepts_online BOOLEAN NOT NULL DEFAULT TRUE,
    accepts_in_person BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tutor_slug ON tutor_profiles(slug);
CREATE INDEX idx_tutor_status ON tutor_profiles(status);
CREATE INDEX idx_tutor_public ON tutor_profiles(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_tutor_rating ON tutor_profiles(rating_avg DESC);
CREATE INDEX idx_tutor_ranking ON tutor_profiles(ranking_score DESC);

CREATE TABLE tutor_qualifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    institution VARCHAR(255),
    year INT,
    description TEXT,
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tutor_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    type document_type NOT NULL,
    file_key TEXT NOT NULL, -- S3 private bucket key
    file_name VARCHAR(255) NOT NULL,
    file_size INT,
    mime_type VARCHAR(100),
    status document_status NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMPTZ,
    rejection_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tutor_docs_tutor ON tutor_documents(tutor_profile_id);
CREATE INDEX idx_tutor_docs_status ON tutor_documents(status);

CREATE TABLE tutor_availabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_recurring BOOLEAN NOT NULL DEFAULT TRUE,
    valid_from DATE,
    valid_to DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tutor_profile_id, day_of_week, start_time, end_time)
);

CREATE TABLE tutor_availability_exceptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_available BOOLEAN NOT NULL DEFAULT FALSE,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vetting_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    stage vetting_stage_type NOT NULL,
    from_status tutor_status,
    to_status tutor_status NOT NULL,
    actor_user_id UUID REFERENCES users(id),
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vetting_tutor ON vetting_events(tutor_profile_id);
CREATE INDEX idx_vetting_stage ON vetting_events(stage);

-- Competency assessment (what Tuteria calls quick test)
CREATE TABLE competency_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    subject_id UUID, -- will FK after academics migration, nullable for now
    score DECIMAL(5,2),
    max_score DECIMAL(5,2) NOT NULL DEFAULT 100,
    passed BOOLEAN NOT NULL DEFAULT FALSE,
    attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    metadata JSONB
);

CREATE INDEX idx_competency_tutor ON competency_assessments(tutor_profile_id);
