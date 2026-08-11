-- 000007_payment: wallets, orders, escrow, idempotent webhooks (Tuteria parity + SLO zero duplicate charges)

CREATE TYPE order_status AS ENUM ('PENDING','PAID','FAILED','REFUNDED','CANCELLED');
CREATE TYPE payment_status AS ENUM ('PENDING','SUCCESS','FAILED','REFUNDED');
CREATE TYPE payment_provider AS ENUM ('PAYSTACK','FLUTTERWAVE','STRIPE','MANUAL','BANK_TRANSFER');
CREATE TYPE payout_status AS ENUM ('PENDING','PROCESSING','PAID','FAILED');
CREATE TYPE escrow_status AS ENUM ('HELD','RELEASED','REFUNDED','DISPUTED');

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) NOT NULL UNIQUE,
    parent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    student_profile_id UUID REFERENCES student_profiles(id) ON DELETE SET NULL,
    institution_id UUID REFERENCES institutions(id) ON DELETE SET NULL,
    status order_status NOT NULL DEFAULT 'PENDING',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    idempotency_key VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_parent ON orders(parent_user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL CHECK (item_type IN ('COHORT','PRIVATE_PACKAGE','PRODUCT','FEE')),
    reference_id UUID NOT NULL,
    description TEXT,
    quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    provider payment_provider NOT NULL,
    provider_reference VARCHAR(255),
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status payment_status NOT NULL DEFAULT 'PENDING',
    paid_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_provider_ref ON payments(provider_reference);

CREATE TABLE payment_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    provider payment_provider NOT NULL,
    provider_reference VARCHAR(255) NOT NULL UNIQUE, -- idempotency guard per AGENTS.md
    payload JSONB NOT NULL,
    signature_valid BOOLEAN NOT NULL DEFAULT FALSE,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhooks_ref ON payment_webhooks(provider_reference);
CREATE INDEX idx_webhooks_processed ON payment_webhooks(processed);

CREATE TABLE escrow_holds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    status escrow_status NOT NULL DEFAULT 'HELD',
    held_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    release_at TIMESTAMPTZ,
    released_at TIMESTAMPTZ,
    dispute_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_escrow_order ON escrow_holds(order_id);
CREATE INDEX idx_escrow_tutor ON escrow_holds(tutor_profile_id);
CREATE INDEX idx_escrow_status ON escrow_holds(status);

CREATE TABLE payouts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tutor_profile_id UUID NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    escrow_hold_id UUID NOT NULL REFERENCES escrow_holds(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'NGN',
    status payout_status NOT NULL DEFAULT 'PENDING',
    provider VARCHAR(50),
    provider_reference VARCHAR(255),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payouts_tutor ON payouts(tutor_profile_id);
CREATE INDEX idx_payouts_status ON payouts(status);

-- Link cohort_enrollments order_id FK now that orders exists
ALTER TABLE cohort_enrollments ADD CONSTRAINT fk_enrollment_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;

-- Function to generate order number
CREATE OR REPLACE FUNCTION generate_order_number() RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
BEGIN
    new_number := 'YKAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;
