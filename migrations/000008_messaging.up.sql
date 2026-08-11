-- 000008_messaging: booking-scoped conversations (improvement over Tuteria WhatsApp-only)

CREATE TYPE conversation_type AS ENUM ('BOOKING','COHORT','SUPPORT','DIRECT');
CREATE TYPE message_type AS ENUM ('TEXT','IMAGE','FILE','SYSTEM');

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type conversation_type NOT NULL DEFAULT 'BOOKING',
    booking_id UUID REFERENCES private_packages(id) ON DELETE SET NULL,
    cohort_id UUID REFERENCES cohorts(id) ON DELETE SET NULL,
    subject VARCHAR(255),
    is_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_booking ON conversations(booking_id);
CREATE INDEX idx_conversations_cohort ON conversations(cohort_id);

CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    is_muted BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE(conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_conv ON conversation_participants(conversation_id);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type message_type NOT NULL DEFAULT 'TEXT',
    body TEXT NOT NULL,
    metadata JSONB,
    is_edited BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_user_id);

CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_key TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    file_size INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

CREATE TABLE notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(100) NOT NULL UNIQUE,
    channel VARCHAR(20) NOT NULL DEFAULT 'EMAIL' CHECK (channel IN ('EMAIL','SMS','WHATSAPP','PUSH','IN_APP')),
    subject VARCHAR(255),
    body_template TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
