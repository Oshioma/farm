-- Create mulch table to log mulching actions applied to beds
CREATE TABLE IF NOT EXISTS mulch (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  mulch_type TEXT,
  date DATE,
  source TEXT,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mulch_farm_id ON mulch(farm_id);
CREATE INDEX IF NOT EXISTS idx_mulch_zone_id ON mulch(zone_id);

ALTER TABLE mulch ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their farm's mulch" ON mulch;
DROP POLICY IF EXISTS "Users can insert their farm's mulch" ON mulch;
DROP POLICY IF EXISTS "Users can update their farm's mulch" ON mulch;
DROP POLICY IF EXISTS "Users can delete their farm's mulch" ON mulch;

CREATE POLICY "Users can view their farm's mulch"
  ON mulch
  FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their farm's mulch"
  ON mulch
  FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their farm's mulch"
  ON mulch
  FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their farm's mulch"
  ON mulch
  FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );
