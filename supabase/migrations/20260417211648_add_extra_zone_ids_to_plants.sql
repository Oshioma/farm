-- Add extra_zone_ids column to plants table for multi-zone support
ALTER TABLE plants ADD COLUMN IF NOT EXISTS extra_zone_ids text DEFAULT NULL;
