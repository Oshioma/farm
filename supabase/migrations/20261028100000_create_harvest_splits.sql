-- Where each harvest went. A harvest can be split between destinations, so
-- each share is its own row: 0.30 kg to EH and 0.11 kg to ORG (Organzibar) is
-- two rows against the same harvest. Shares are recorded in kilos; whatever
-- is not assigned shows as "not assigned" on the harvest logs page. Adding a
-- destination later only means widening the destination check.
CREATE TABLE IF NOT EXISTS harvest_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  harvest_id UUID NOT NULL REFERENCES harvests(id) ON DELETE CASCADE,
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  quantity_kg NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE harvest_splits DROP CONSTRAINT IF EXISTS harvest_splits_destination_check;
ALTER TABLE harvest_splits ADD CONSTRAINT harvest_splits_destination_check
  CHECK (destination IN ('EH', 'ORG'));

ALTER TABLE harvest_splits DROP CONSTRAINT IF EXISTS harvest_splits_quantity_positive;
ALTER TABLE harvest_splits ADD CONSTRAINT harvest_splits_quantity_positive
  CHECK (quantity_kg > 0);

CREATE UNIQUE INDEX IF NOT EXISTS harvest_splits_harvest_destination_key
  ON harvest_splits(harvest_id, destination);
CREATE INDEX IF NOT EXISTS idx_harvest_splits_farm_id ON harvest_splits(farm_id);

ALTER TABLE harvest_splits ENABLE ROW LEVEL SECURITY;

-- Anyone on the farm can log harvests, so anyone on the farm can say where
-- one went, including changing or removing a share.
DROP POLICY IF EXISTS "Users can view their farm's harvest splits" ON harvest_splits;
DROP POLICY IF EXISTS "Users can insert their farm's harvest splits" ON harvest_splits;
DROP POLICY IF EXISTS "Users can update their farm's harvest splits" ON harvest_splits;
DROP POLICY IF EXISTS "Users can delete their farm's harvest splits" ON harvest_splits;

CREATE POLICY "Users can view their farm's harvest splits"
  ON harvest_splits
  FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their farm's harvest splits"
  ON harvest_splits
  FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
    AND harvest_id IN (SELECT id FROM harvests WHERE harvests.farm_id = harvest_splits.farm_id)
  );

CREATE POLICY "Users can update their farm's harvest splits"
  ON harvest_splits
  FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  )
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
    AND harvest_id IN (SELECT id FROM harvests WHERE harvests.farm_id = harvest_splits.farm_id)
  );

CREATE POLICY "Users can delete their farm's harvest splits"
  ON harvest_splits
  FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

-- Before this table existed the destination was typed into the notes. A note
-- that is just "EH" means the whole harvest went to EH; just "Organzibar"
-- means it all went to ORG. Longer notes that mention either are left alone.
INSERT INTO harvest_splits (harvest_id, farm_id, destination, quantity_kg)
SELECT id, farm_id, 'EH', quantity_kg
FROM harvests
WHERE lower(btrim(notes)) = 'eh' AND quantity_kg > 0
ON CONFLICT (harvest_id, destination) DO NOTHING;

INSERT INTO harvest_splits (harvest_id, farm_id, destination, quantity_kg)
SELECT id, farm_id, 'ORG', quantity_kg
FROM harvests
WHERE lower(btrim(notes)) = 'organzibar' AND quantity_kg > 0
ON CONFLICT (harvest_id, destination) DO NOTHING;
