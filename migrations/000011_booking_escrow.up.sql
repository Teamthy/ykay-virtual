-- 000011_booking_escrow: indexes for the escrow + payout crons (Phase 3)
-- expire_stale_booking_holds scans HELD holds past release_at (Tuteria 3-day auto-release).
-- process_weekly_tutor_payouts scans PENDING payouts.

CREATE INDEX IF NOT EXISTS idx_escrow_status_release ON escrow_holds (status, release_at)
    WHERE status = 'HELD';

CREATE INDEX IF NOT EXISTS idx_payouts_status_created ON payouts (status, created_at)
    WHERE status = 'PENDING';

-- Pending orders that never received a payment within a grace window are
-- cancelled by the (Phase 8) order expiry job; index supports it.
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders (status, created_at)
    WHERE status = 'PENDING';
