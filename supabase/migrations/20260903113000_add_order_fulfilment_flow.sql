-- Track the real outcome of a reservation from confirmation to collection.

ALTER TABLE customer_orders
  ADD COLUMN IF NOT EXISTS actual_quantity_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS actual_price_per_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ready_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS collected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE customer_orders
  DROP CONSTRAINT IF EXISTS customer_orders_actual_quantity_nonnegative,
  DROP CONSTRAINT IF EXISTS customer_orders_actual_price_nonnegative;

ALTER TABLE customer_orders
  ADD CONSTRAINT customer_orders_actual_quantity_nonnegative
    CHECK (actual_quantity_kg IS NULL OR actual_quantity_kg >= 0),
  ADD CONSTRAINT customer_orders_actual_price_nonnegative
    CHECK (actual_price_per_kg IS NULL OR actual_price_per_kg >= 0);

-- Preserve older completed orders while moving the application vocabulary
-- from "fulfilled" to the clearer final state, "collected".
UPDATE customer_orders
SET status = 'collected',
    collected_at = COALESCE(collected_at, updated_at, NOW())
WHERE status = 'fulfilled';

CREATE OR REPLACE FUNCTION set_customer_order_status_timestamps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'confirmed' AND NEW.confirmed_at IS NULL THEN
      NEW.confirmed_at := NOW();
    ELSIF NEW.status = 'ready' AND NEW.ready_at IS NULL THEN
      NEW.ready_at := NOW();
    ELSIF NEW.status = 'collected' AND NEW.collected_at IS NULL THEN
      NEW.collected_at := NOW();
    ELSIF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := NOW();
    END IF;
  END IF;

  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS customer_orders_status_timestamps
  ON customer_orders;

CREATE TRIGGER customer_orders_status_timestamps
BEFORE UPDATE ON customer_orders
FOR EACH ROW
EXECUTE FUNCTION set_customer_order_status_timestamps();
