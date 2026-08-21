-- Customers the farm sells to, and the orders they place against upcoming
-- harvests. An order is either a share of what a crop is expected to yield in
-- a given month, or a fixed weight.

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_farm_id ON customers(farm_id);

CREATE TABLE IF NOT EXISTS customer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  -- Which crop, and which month of which Mar–Feb season it is expected in.
  crop_id UUID REFERENCES crops(id) ON DELETE SET NULL,
  season INTEGER,
  month_key TEXT CHECK (
    month_key IS NULL OR month_key IN
    ('mar','apr','may','jun','jul','aug','sep','oct','nov','dec','jan','feb')
  ),
  -- Either a share of that month's expected harvest, or a fixed weight.
  share_pct NUMERIC,
  quantity_kg NUMERIC,
  price_per_kg NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT customer_orders_amount_present CHECK (share_pct IS NOT NULL OR quantity_kg IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_customer_orders_farm_id ON customer_orders(farm_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_customer_id ON customer_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_crop_id ON customer_orders(crop_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_when ON customer_orders(farm_id, season, month_key);

-- Farm members may read and write their own farm's rows, matching every other
-- operational table in the app.
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['customers', 'customer_orders'] LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Members can view ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Members can insert ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Members can update ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'Members can delete ' || t, t);

    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR SELECT USING (
        farm_id IN (SELECT farm_id FROM farm_members WHERE profile_id = auth.uid())
      )$f$, 'Members can view ' || t, t);

    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR INSERT WITH CHECK (
        farm_id IN (SELECT farm_id FROM farm_members WHERE profile_id = auth.uid())
      )$f$, 'Members can insert ' || t, t);

    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR UPDATE USING (
        farm_id IN (SELECT farm_id FROM farm_members WHERE profile_id = auth.uid())
      )$f$, 'Members can update ' || t, t);

    EXECUTE format($f$
      CREATE POLICY %I ON %I FOR DELETE USING (
        farm_id IN (SELECT farm_id FROM farm_members WHERE profile_id = auth.uid())
      )$f$, 'Members can delete ' || t, t);
  END LOOP;
END $$;
