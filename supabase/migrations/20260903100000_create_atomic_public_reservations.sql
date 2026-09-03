-- Group public shop reservations and create their line items atomically.
-- This prevents two buyers from claiming the same remaining harvest at once.

ALTER TABLE customer_orders
  ADD COLUMN IF NOT EXISTS reservation_id UUID,
  ADD COLUMN IF NOT EXISTS reservation_reference TEXT;

CREATE INDEX IF NOT EXISTS idx_customer_orders_reservation_id
  ON customer_orders (reservation_id);

CREATE INDEX IF NOT EXISTS idx_customer_orders_reservation_reference
  ON customer_orders (reservation_reference);

CREATE OR REPLACE FUNCTION create_public_reservation(
  p_farm_id UUID,
  p_customer_id UUID,
  p_items JSONB,
  p_notes TEXT DEFAULT NULL
)
RETURNS TABLE (reservation_id UUID, reservation_reference TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reservation_id UUID := gen_random_uuid();
  v_reference TEXT;
  v_item JSONB;
  v_crop_id UUID;
  v_season INTEGER;
  v_month_key TEXT;
  v_quantity NUMERIC;
  v_price NUMERIC;
  v_expected NUMERIC;
  v_committed NUMERIC;
  v_eta harvest_eta%ROWTYPE;
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'Reservation items must be an array';
  END IF;

  IF jsonb_array_length(p_items) < 1 OR jsonb_array_length(p_items) > 12 THEN
    RAISE EXCEPTION 'A reservation must contain between 1 and 12 items';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM customers
    WHERE id = p_customer_id AND farm_id = p_farm_id AND is_active = TRUE
  ) THEN
    RAISE EXCEPTION 'Customer does not belong to this farm';
  END IF;

  v_reference := 'SO-' || upper(substr(replace(v_reservation_id::TEXT, '-', ''), 1, 10));

  -- Lock and validate every requested crop-month before inserting any line.
  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_crop_id := (v_item->>'cropId')::UUID;
    v_season := (v_item->>'season')::INTEGER;
    v_month_key := lower(v_item->>'monthKey');
    v_quantity := (v_item->>'quantityKg')::NUMERIC;
    v_price := NULLIF(v_item->>'pricePerKg', '')::NUMERIC;
    v_expected := NULLIF(v_item->>'expectedKg', '')::NUMERIC;

    IF v_month_key NOT IN ('mar','apr','may','jun','jul','aug','sep','oct','nov','dec','jan','feb') THEN
      RAISE EXCEPTION 'Invalid harvest month';
    END IF;
    IF v_quantity IS NULL OR v_quantity <= 0 OR v_quantity > 10000 THEN
      RAISE EXCEPTION 'Invalid reservation quantity';
    END IF;
    IF v_expected IS NULL OR v_expected < 0 THEN
      RAISE EXCEPTION 'This harvest cannot be reserved by weight';
    END IF;

    -- Every competing reservation for this crop-month takes the same lock.
    PERFORM pg_advisory_xact_lock(
      hashtextextended(
        p_farm_id::TEXT || ':' || v_crop_id::TEXT || ':' || v_season::TEXT || ':' || v_month_key,
        0
      )
    );

    SELECT *
      INTO v_eta
      FROM harvest_eta
      WHERE farm_id = p_farm_id
        AND crop_id = v_crop_id
        AND year = v_season
      LIMIT 1
      FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'That crop no longer has an expected harvest';
    END IF;

    SELECT COALESCE(SUM(
      CASE
        WHEN season = v_season AND month_key = v_month_key
          THEN COALESCE(quantity_kg, 0)
        WHEN season IS NULL AND month_key IS NULL AND share_pct IS NOT NULL
          THEN v_expected * share_pct / 100
        ELSE 0
      END
    ), 0)
    INTO v_committed
    FROM customer_orders
    WHERE farm_id = p_farm_id
      AND crop_id = v_crop_id
      AND status <> 'cancelled';

    IF v_committed + v_quantity > v_expected THEN
      RAISE EXCEPTION 'Only % kg is still available',
        GREATEST(0, floor(v_expected - v_committed));
    END IF;
  END LOOP;

  INSERT INTO customer_orders (
    farm_id,
    customer_id,
    crop_id,
    season,
    month_key,
    share_pct,
    quantity_kg,
    price_per_kg,
    status,
    notes,
    reservation_id,
    reservation_reference
  )
  SELECT
    p_farm_id,
    p_customer_id,
    (item->>'cropId')::UUID,
    (item->>'season')::INTEGER,
    lower(item->>'monthKey'),
    NULL,
    (item->>'quantityKg')::NUMERIC,
    NULLIF(item->>'pricePerKg', '')::NUMERIC,
    'pending',
    NULLIF(trim(p_notes), ''),
    v_reservation_id,
    v_reference
  FROM jsonb_array_elements(p_items) AS item;

  RETURN QUERY SELECT v_reservation_id, v_reference;
END;
$$;

REVOKE ALL ON FUNCTION create_public_reservation(UUID, UUID, JSONB, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION create_public_reservation(UUID, UUID, JSONB, TEXT) FROM anon;
REVOKE ALL ON FUNCTION create_public_reservation(UUID, UUID, JSONB, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION create_public_reservation(UUID, UUID, JSONB, TEXT) TO service_role;
