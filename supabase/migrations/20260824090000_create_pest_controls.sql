-- Pest control (spray) journal. The pest_logs table records a pest issue that
-- was spotted; this records the treatment applied to a bed, so the map can
-- show how many times each bed has been sprayed and when. It mirrors the
-- fertilisations table: zone_id holds the primary bed, extra_zone_ids a JSON
-- array of any additional beds, and next_spray_* links the follow-up goal.
CREATE TABLE IF NOT EXISTS pest_controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL REFERENCES farms(id) ON DELETE CASCADE,
  date DATE,
  product TEXT,
  target_pest TEXT,
  method TEXT,
  quantity TEXT,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  extra_zone_ids TEXT,
  notes TEXT,
  next_spray_date DATE,
  next_spray_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pest_controls_farm_id ON pest_controls(farm_id);
CREATE INDEX IF NOT EXISTS idx_pest_controls_zone_id ON pest_controls(zone_id);
CREATE INDEX IF NOT EXISTS idx_pest_controls_next_spray_task_id ON pest_controls(next_spray_task_id);

ALTER TABLE pest_controls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their farm's pest controls" ON pest_controls;
DROP POLICY IF EXISTS "Users can insert their farm's pest controls" ON pest_controls;
DROP POLICY IF EXISTS "Users can update their farm's pest controls" ON pest_controls;
DROP POLICY IF EXISTS "Users can delete their farm's pest controls" ON pest_controls;

CREATE POLICY "Users can view their farm's pest controls"
  ON pest_controls
  FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their farm's pest controls"
  ON pest_controls
  FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their farm's pest controls"
  ON pest_controls
  FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their farm's pest controls"
  ON pest_controls
  FOR DELETE
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );
