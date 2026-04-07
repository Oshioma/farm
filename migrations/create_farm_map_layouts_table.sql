-- Create farm_map_layouts table to store map configuration across devices
CREATE TABLE IF NOT EXISTS farm_map_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL UNIQUE REFERENCES farms(id) ON DELETE CASCADE,
  beds JSONB NOT NULL DEFAULT '[]',
  landmarks JSONB NOT NULL DEFAULT '[]',
  background_image TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_farm_map_layouts_farm_id ON farm_map_layouts(farm_id);

-- Enable RLS if needed
ALTER TABLE farm_map_layouts ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to access their farm's map layout
CREATE POLICY "Users can view their farm's map layout"
  ON farm_map_layouts
  FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their farm's map layout"
  ON farm_map_layouts
  FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their farm's map layout"
  ON farm_map_layouts
  FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );
