-- 000066_plus_subscriptions.down.sql
ALTER TABLE practice_exams DROP COLUMN IF EXISTS premium;
DROP TABLE IF EXISTS plus_usage;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS subscription_plans;
