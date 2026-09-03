-- 000069_plus_teams.up.sql — YK-Virtual Plus Teams: institution seat management.
--
-- An institution with a PLUS_TEAMS plan allocates a number of seats; each seat
-- is a user covered by the org's subscription. institution_plus tracks the
-- seat capacity; institution_plus_seats records who holds a seat.

CREATE TABLE IF NOT EXISTS institution_plus (
    institution_id UUID PRIMARY KEY REFERENCES institutions(id) ON DELETE CASCADE,
    total_seats    INT NOT NULL DEFAULT 0 CHECK (total_seats >= 0),
    used_seats     INT NOT NULL DEFAULT 0 CHECK (used_seats >= 0),
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS institution_plus_seats (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (institution_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_institution_plus_seats_inst ON institution_plus_seats(institution_id);
CREATE INDEX IF NOT EXISTS idx_institution_plus_seats_user ON institution_plus_seats(user_id);
