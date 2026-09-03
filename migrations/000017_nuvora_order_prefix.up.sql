-- YK-Virtual rebrand: order-number prefix YKAY- → YK-Virtual- (phase 14).
-- Existing rows keep their numbers; only new orders are affected.

CREATE OR REPLACE FUNCTION generate_order_number() RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
BEGIN
    new_number := 'YK-Virtual-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;
