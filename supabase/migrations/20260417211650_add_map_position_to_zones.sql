-- Add map_position column to zones table
-- This stores the visual position of each zone on the farm map
-- Format: { "x": number, "y": number, "w": number, "h": number, "rotate"?: number }
ALTER TABLE zones ADD COLUMN IF NOT EXISTS map_position jsonb DEFAULT NULL;
