-- 000080_financial_integrity_constraints — storage-layer backstops for the
-- money engine. The service layer already settles exactly once via the
-- order PENDING→PAID compare-and-set; these constraints make the remaining
-- failure modes structurally impossible to even write:
--
--  1. escrow_holds: at most ONE hold per order. Two holds on one order would
--     double-release to the tutor on auto-expiry. Duplicates that are still
--     HELD (bug caught before any money moved) are auto-removed, keeping the
--     earliest row. Any duplicate that already RELEASED/REFUNDED/DISPUTED
--     means money actually moved twice — the migration ABORTS loudly so a
--     human runs the payments runbook instead of silently deleting evidence.
--  2. referral_rewards: UNIQUE(referral_id) — at most one reward row per
--     referral. Duplicates beyond the earliest are removed; the wallet
--     ledger (000081) is the source of truth for credits actually issued.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM escrow_holds
        GROUP BY order_id HAVING COUNT(*) > 1
    ) THEN
        IF EXISTS (
            SELECT 1 FROM escrow_holds
            WHERE status <> 'HELD'
            GROUP BY order_id HAVING COUNT(*) > 1
        ) THEN
            RAISE EXCEPTION
                'financial review required: multiple settled (non-HELD) escrow_holds exist for the same order — investigate payouts before migrating';
        END IF;

        -- Safe auto-remediation: surplus holds that never released money are
        -- removed (keep the earliest row per order; payouts FK cascades only
        -- from rows we delete, and a HELD hold has no payout by construction).
        DELETE FROM escrow_holds h
        WHERE h.status = 'HELD'
          AND EXISTS (
              SELECT 1 FROM escrow_holds k
              WHERE k.order_id = h.order_id
                AND (k.created_at, k.id) < (h.created_at, h.id)
          );

        IF EXISTS (
            SELECT 1 FROM escrow_holds
            GROUP BY order_id HAVING COUNT(*) > 1
        ) THEN
            RAISE EXCEPTION
                'financial review required: settled and duplicate escrow_holds coexist for the same order — investigate before migrating';
        END IF;
    END IF;

    -- One reward row per referral (duplicates keep the earliest record).
    DELETE FROM referral_rewards r
    WHERE EXISTS (
        SELECT 1 FROM referral_rewards k
        WHERE k.referral_id = r.referral_id
          AND (k.created_at, k.id) < (r.created_at, r.id)
    );
END $$;

CREATE UNIQUE INDEX uq_escrow_holds_order_id ON escrow_holds(order_id);
CREATE UNIQUE INDEX uq_referral_rewards_referral_id ON referral_rewards(referral_id);
