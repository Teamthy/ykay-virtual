-- 000006_booking: cohorts, private tuition, lessons - core YKAY + Tuteria parity + beyond

CREATE TYPE cohort_status AS ENUM ('DRAFT','PUBLISHED','FULL','ONGOING','COMPLETED','CANCELLED');
CREATE TYPE enrollment_status AS ENUM ('PENDING','CONFIRMED','CANCELLED','REFUNDED','WAITLISTED');
CREATE TYPE private_request_status AS ENUM ('PENDING','MATCHED','ASSIGNED','IN_PROGRESS','COMPLETED','CANCELLED');
CREATE TYPE lesson_status AS ENUM ('SCHEDULED','ONGOING','COMPLETED','CANCELLED','RESCHEDULED','NO_SHOW');
CREATE TYPE attendance_status AS ENUM ('PRESENT','ABSENT','LATE','EXCUSED');

CREATE TABLE cohorts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    programme_id UUID NOT NULL REFERENCES programmes(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    tutor_profile_id UUID REFERENCES tutor_profiles(id) ON DELETE SET NULL,
    capacity INT NOT NULL DEFAULT 20 CHECK (capacity > 0),
    enrolled_count INT NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    schedule_description TEXT,
    timezone VARCHAR(100) NOT NULL DEFAULT 'Africa/Lagos',
    location_mode VARCHAR(20) NOT NULL DEFAULT 'ONLINE' CHECK (location_mode IN ('ONLINE','IN_PERSON','HYBRID')),
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    fee DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status cohort_status NOT NULL DEFAULT 'DRAFT',
    meeting_link_template TEXT,
    created_by UUID REFERENCES users(id),
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cohorts_programme ON cohorts(programme_id);
CREATE INDEX idx_cohorts_tutor ON cohorts(tutor_profile_id);
CREATE INDEX idx_cohorts_status ON cohorts(status);
CREATE INDEX idx_cohorts_slug ON cohorts(slug);
CREATE INDEX idx_cohorts_dates ON cohorts(start_date, end_date);

CREATE TABLE cohort_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    order_id UUID,
    status enrollment_status NOT NULL DEFAULT 'PENDING',
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(cohort_id, student_profile_id)
);

CREATE INDEX idx_enrollments_cohort ON cohort_enrollments(cohort_id);
CREATE INDEX idx_enrollments_student ON cohort_enrollments(student_profile_id);
CREATE INDEX idx_enrollments_parent ON cohort_enrollments(parent_user_id);

CREATE TABLE private_tuition_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    curriculum_id UUID REFERENCES curricula(id) ON DELETE SET NULL,
    level_id UUID REFERENCES levels(id) ON DELETE SET NULL,
    goals TEXT,
    preferred_days VARCHAR(255),
    preferred_time_range VARCHAR(100),
    timezone VARCHAR(100) NOT NULL DEFAULT 'Africa/Lagos',
    location_mode VARCHAR(20) NOT NULL DEFAULT 'ONLINE' CHECK (location_mode IN ('ONLINE','IN_PERSON','HYBRID')),
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    status private_request_status NOT NULL DEFAULT 'PENDING',
    matched_tutor_id UUID REFERENCES tutor_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_private_req_parent ON private_tuition_requests(parent_user_id);
CREATE INDEX idx_private_req_status ON private_tuition_requests(status);

CREATE TABLE private_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES private_tuition_requests(id) ON DELETE CASCADE,
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    total_sessions INT NOT NULL CHECK (total_sessions > 0),
    sessions_used INT NOT NULL DEFAULT 0,
    session_duration_minutes INT NOT NULL DEFAULT 60,
    price_per_session DECIMAL(10,2) NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_packages_tutor ON private_packages(tutor_profile_id);
CREATE INDEX idx_packages_student ON private_packages(student_profile_id);

CREATE TABLE lessons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
    private_package_id UUID REFERENCES private_packages(id) ON DELETE CASCADE,
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_at TIMESTAMPTZ NOT NULL,
    end_at TIMESTAMPTZ NOT NULL,
    timezone VARCHAR(100) NOT NULL DEFAULT 'Africa/Lagos',
    meeting_url TEXT,
    meeting_provider VARCHAR(50) DEFAULT 'GOOGLE_MEET',
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    status lesson_status NOT NULL DEFAULT 'SCHEDULED',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_at > start_at),
    CHECK (cohort_id IS NOT NULL OR private_package_id IS NOT NULL)
);

CREATE INDEX idx_lessons_cohort ON lessons(cohort_id);
CREATE INDEX idx_lessons_package ON lessons(private_package_id);
CREATE INDEX idx_lessons_tutor ON lessons(tutor_profile_id);
CREATE INDEX idx_lessons_start ON lessons(start_at);
CREATE INDEX idx_lessons_status ON lessons(status);
CREATE INDEX idx_lessons_tutor_time ON lessons(tutor_profile_id, start_at, end_at);

CREATE TABLE lesson_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ,
    left_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lesson_id, student_profile_id)
);

CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    status attendance_status NOT NULL DEFAULT 'PRESENT',
    marked_by UUID REFERENCES users(id),
    note TEXT,
    marked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(lesson_id, student_profile_id)
);

CREATE INDEX idx_attendance_lesson ON attendance(lesson_id);

CREATE TABLE lesson_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    student_profile_id UUID REFERENCES student_profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    homework TEXT,
    is_visible_to_parent BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE resources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    programme_id UUID REFERENCES programmes(id) ON DELETE SET NULL,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_key TEXT, -- S3 public or private
    file_url TEXT,
    is_public BOOLEAN NOT NULL DEFAULT FALSE,
    uploaded_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    cohort_id UUID REFERENCES cohorts(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES lessons(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    instructions TEXT,
    due_at TIMESTAMPTZ,
    max_score DECIMAL(5,2),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_profile_id UUID NOT NULL REFERENCES student_profiles(id) ON DELETE CASCADE,
    content TEXT,
    file_key TEXT,
    score DECIMAL(5,2),
    feedback TEXT,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    graded_at TIMESTAMPTZ,
    graded_by UUID REFERENCES users(id)
);

CREATE INDEX idx_submissions_assignment ON submissions(assignment_id);
