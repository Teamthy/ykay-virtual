-- Revert order-number prefix YK-Virtual- → YKAY- (phase 14 rollback).

CREATE OR REPLACE FUNCTION generate_order_number() RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
BEGIN
    new_number := 'YKAY-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;
