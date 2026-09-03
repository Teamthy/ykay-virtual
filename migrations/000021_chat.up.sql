-- AI assistant chat threads + messages (phase 33; postgres repo now wired in phase 35).
CREATE TABLE IF NOT EXISTS chat_threads (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title           TEXT NOT NULL DEFAULT 'YK-Virtual support chat',
    status          TEXT NOT NULL DEFAULT 'OPEN',
    rating          INT CHECK (rating BETWEEN 1 AND 5),
    rating_comment  TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_threads_user ON chat_threads (user_id);
CREATE INDEX IF NOT EXISTS idx_chat_threads_status ON chat_threads (status);

CREATE TABLE IF NOT EXISTS chat_messages (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    thread_id  UUID NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    role       TEXT NOT NULL,
    content    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages (thread_id);
