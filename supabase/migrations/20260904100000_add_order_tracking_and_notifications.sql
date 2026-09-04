-- Private buyer tracking links and in-app order alerts for farm managers.

ALTER TABLE customer_orders
  ADD COLUMN IF NOT EXISTS tracking_token UUID;

CREATE INDEX IF NOT EXISTS idx_customer_orders_tracking_token
  ON customer_orders (tracking_token)
  WHERE tracking_token IS NOT NULL;

CREATE OR REPLACE FUNCTION notify_customer_order_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_customer_name TEXT;
  v_reference TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- A public basket creates several line rows. Notify once for the first row.
    IF NEW.reservation_id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM customer_orders existing
      WHERE existing.reservation_id = NEW.reservation_id
        AND existing.id <> NEW.id
    ) THEN
      RETURN NEW;
    END IF;

    SELECT name INTO v_customer_name
    FROM customers
    WHERE id = NEW.customer_id;

    v_reference := COALESCE(NEW.reservation_reference, 'new order');

    INSERT INTO notifications (recipient_id, farm_id, type, title, body, link)
    SELECT
      fm.profile_id,
      NEW.farm_id,
      'customer_order',
      'New reservation ' || v_reference,
      COALESCE(v_customer_name, 'A customer') || ' reserved produce.',
      '/farm/orders'
    FROM farm_members fm
    WHERE fm.farm_id = NEW.farm_id
      AND fm.role_on_farm IN ('owner', 'manager');

  ELSIF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    SELECT name INTO v_customer_name
    FROM customers
    WHERE id = NEW.customer_id;

    INSERT INTO notifications (recipient_id, farm_id, type, title, body, link, actor_id)
    SELECT
      fm.profile_id,
      NEW.farm_id,
      'order_status',
      COALESCE(NEW.reservation_reference, 'Order') || ' is now ' || NEW.status,
      COALESCE(v_customer_name, 'Customer') || ' · order status changed.',
      '/farm/orders',
      auth.uid()
    FROM farm_members fm
    WHERE fm.farm_id = NEW.farm_id
      AND fm.role_on_farm IN ('owner', 'manager')
      AND fm.profile_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_customer_order_event
  ON customer_orders;

CREATE TRIGGER trg_notify_customer_order_event
AFTER INSERT OR UPDATE ON customer_orders
FOR EACH ROW
EXECUTE FUNCTION notify_customer_order_event();
