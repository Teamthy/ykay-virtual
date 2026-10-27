-- 000081_wallet_ledger — append-only journal for every wallet mutation.
--
-- Principles implemented:
--  * No balance change without a ledger record (same atomic statement).
--  * Replay safety: a unique idempotency_key makes retried/duplicate credits
--    (crash between steps, replayed webhook, concurrent qualifier) no-ops.
--  * Reconciliation invariant: for every wallet,
--        balance == SUM(credits) − SUM(debits)
--    which the payments runbook can assert as a one-query health check.
--
-- wallet_apply() performs claim → balance update → journal insert as ONE
-- SQL statement, so it is atomic whether called inside a unit-of-work
-- transaction (rollback takes everything) or standalone on the pool
-- (no claim-without-balance window on crash).

CREATE TABLE wallet_transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_id       UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    direction       VARCHAR(6) NOT NULL CHECK (direction IN ('CREDIT','DEBIT')),
    amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
    balance_after   NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (balance_after >= 0),
    ref_type        VARCHAR(40) NOT NULL DEFAULT 'UNSPECIFIED',
    ref_id          UUID,
    idempotency_key VARCHAR(140) UNIQUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallet_tx_user ON wallet_transactions(user_id, created_at DESC);
CREATE INDEX idx_wallet_tx_wallet ON wallet_transactions(wallet_id, created_at DESC);
CREATE INDEX idx_wallet_tx_ref ON wallet_transactions(ref_type, ref_id);

-- Baseline: existing balances become journal entries so the reconciliation
-- invariant holds for every wallet from day one (wallets at 0 need no row:
-- the CHECK forbids zero-amount entries).
INSERT INTO wallet_transactions (wallet_id, user_id, direction, amount, balance_after, ref_type)
SELECT id, user_id, 'CREDIT', balance, balance, 'BASELINE_BACKFILL'
FROM wallets
WHERE balance > 0;

-- wallet_apply — the single entry point for wallet mutations.
--   p_direction : 'CREDIT' | 'DEBIT'
--   p_idem_key  : NULL/'' = not keyed; otherwise apply-at-most-once
-- Returns the wallet's balance after the mutation (or the unchanged balance
-- on an idempotent replay).
-- Declared SQLSTATEs for callers:
--   no_data_found   (P0002) — no wallet for p_user_id  → ErrNotFound
--   check_violation (23514) — debit exceeds balance    → ErrInsufficientBalance
CREATE OR REPLACE FUNCTION wallet_apply(
    p_user_id   UUID,
    p_amount    NUMERIC,
    p_direction VARCHAR,
    p_ref_type  VARCHAR,
    p_ref_id    UUID,
    p_idem_key  VARCHAR
) RETURNS NUMERIC AS $$
DECLARE
    v_wallet_id UUID;
    v_balance   NUMERIC(12,2);
BEGIN
    IF p_amount IS NULL OR p_amount <= 0 THEN
        RAISE EXCEPTION 'wallet_apply: amount must be positive (got %)', p_amount;
    END IF;
    IF p_direction IS NULL OR p_direction NOT IN ('CREDIT', 'DEBIT') THEN
        RAISE EXCEPTION 'wallet_apply: direction must be CREDIT or DEBIT (got %)', p_direction;
    END IF;

    -- Serialize all mutations of this wallet (row lock held to transaction
    -- end): concurrent credits/debits and idempotency claims are ordered.
    SELECT id INTO v_wallet_id
    FROM wallets WHERE user_id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'wallet_apply: no wallet for user %', p_user_id
            USING ERRCODE = 'no_data_found';
    END IF;

    -- Idempotency claim (checked under the row lock): a replayed key means
    -- this mutation already applied — return the current balance untouched.
    IF p_idem_key IS NOT NULL AND p_idem_key <> '' THEN
        IF EXISTS (SELECT 1 FROM wallet_transactions WHERE idempotency_key = p_idem_key) THEN
            SELECT balance INTO v_balance FROM wallets WHERE user_id = p_user_id;
            RETURN v_balance;
        END IF;
    END IF;

    IF p_direction = 'CREDIT' THEN
        UPDATE wallets
        SET balance = balance + p_amount, updated_at = NOW()
        WHERE user_id = p_user_id
        RETURNING balance INTO v_balance;
    ELSE
        UPDATE wallets
        SET balance = balance - p_amount, updated_at = NOW()
        WHERE user_id = p_user_id AND balance >= p_amount
        RETURNING balance INTO v_balance;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'wallet_apply: insufficient balance for user %', p_user_id
                USING ERRCODE = 'check_violation';
        END IF;
    END IF;

    INSERT INTO wallet_transactions
        (wallet_id, user_id, direction, amount, balance_after, ref_type, ref_id, idempotency_key)
    VALUES
        (v_wallet_id, p_user_id, p_direction, p_amount, v_balance,
         COALESCE(NULLIF(p_ref_type, ''), 'UNSPECIFIED'), p_ref_id,
         NULLIF(COALESCE(p_idem_key, ''), ''));

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public;
