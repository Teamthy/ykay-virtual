-- 000080 down — drop the backstop indexes. Rows removed by the up-migration's
-- duplicate remediation are intentionally NOT restored (they were surplus
-- records; the wallet ledger and payouts remain the financial source of truth).
DROP INDEX IF EXISTS uq_referral_rewards_referral_id;
DROP INDEX IF EXISTS uq_escrow_holds_order_id;
