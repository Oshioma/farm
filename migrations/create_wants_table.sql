-- Create wants table to track things the farm wants to acquire
CREATE TABLE IF NOT EXISTS wants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wants_farm_id ON wants(farm_id);

ALTER TABLE wants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their farm's wants" ON wants;
DROP POLICY IF EXISTS "Users can view wants of farms they belong to" ON wants;
DROP POLICY IF EXISTS "Users can insert their farm's wants" ON wants;
DROP POLICY IF EXISTS "Users can update their farm's wants" ON wants;
DROP POLICY IF EXISTS "Users can delete their farm's wants" ON wants;

-- Members can view wants across any farm they are a member of (used for the
-- "other farms' wants" cross-farm view).
CREATE POLICY "Users can view wants of farms they belong to"
  ON wants
  FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their farm's wants"
  ON wants
  FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their farm's wants"
  ON wants
  FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their farm's wants"
  ON wants
  FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );
