-- Tracks whether a nursery start has been transplanted out to the field.
-- Transplanting creates a crop record (see lib/farm.ts) linked to the beds
-- it was moved to; the seedling row is kept for germination/tray history
-- but flagged here so it no longer counts as active nursery stock.
ALTER TABLE seedlings
ADD COLUMN IF NOT EXISTS transplanted BOOLEAN DEFAULT FALSE;

ALTER TABLE seedlings
ADD COLUMN IF NOT EXISTS transplanted_at DATE;
