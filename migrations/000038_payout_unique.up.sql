-- 000038 — enforce one payout per escrow hold (YK-007).
--
-- A ReleaseEscrow race (two concurrent workers/retries) could otherwise create
-- two payout rows for the same escrow hold, settling the tutor twice. The
-- unique constraint on escrow_hold_id makes the second insert fail, so the
-- service's atomic compare-and-set (ReleaseIfHeld) is the only valid path and a
-- duplicate payout is a hard database error rather than silent double payment.
--
-- If this migration fails with a duplicate-key on existing data, there is
-- already a double-settlement bug to reconcile before deploying.

ALTER TABLE payouts
  ADD CONSTRAINT payouts_escrow_hold_id_unique UNIQUE (escrow_hold_id);
