-- 000011_booking_escrow: drop Phase 3 cron indexes (rollback)

DROP INDEX IF EXISTS idx_escrow_status_release;
DROP INDEX IF EXISTS idx_payouts_status_created;
DROP INDEX IF EXISTS idx_orders_status_created;
