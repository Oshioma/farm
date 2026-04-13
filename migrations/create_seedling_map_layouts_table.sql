-- Create seedling_map_layouts table to store the seedling zone/tray map per farm
CREATE TABLE IF NOT EXISTS seedling_map_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farm_id UUID NOT NULL UNIQUE REFERENCES farms(id) ON DELETE CASCADE,
  zones JSONB NOT NULL DEFAULT '[]',
  trays JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_seedling_map_layouts_farm_id ON seedling_map_layouts(farm_id);

-- Enable RLS
ALTER TABLE seedling_map_layouts ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Users can view their farm's seedling map layout" ON seedling_map_layouts;
DROP POLICY IF EXISTS "Users can update their farm's seedling map layout" ON seedling_map_layouts;
DROP POLICY IF EXISTS "Users can insert their farm's seedling map layout" ON seedling_map_layouts;

-- Create policies to allow users to access their farm's seedling map layout
CREATE POLICY "Users can view their farm's seedling map layout"
  ON seedling_map_layouts
  FOR SELECT
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their farm's seedling map layout"
  ON seedling_map_layouts
  FOR UPDATE
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their farm's seedling map layout"
  ON seedling_map_layouts
  FOR INSERT
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
    )
  );
