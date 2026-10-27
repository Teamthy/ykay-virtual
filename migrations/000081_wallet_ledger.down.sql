-- 000081 down — drop the wallet-apply function first, then the journal.
-- Journal rows are deleted with their wallets' context gone; if a roll-back
-- audit is needed, take a backup snapshot before down-migrating.
DROP FUNCTION IF EXISTS wallet_apply(UUID, NUMERIC, VARCHAR, VARCHAR, UUID, VARCHAR);
DROP TABLE IF EXISTS wallet_transactions;
