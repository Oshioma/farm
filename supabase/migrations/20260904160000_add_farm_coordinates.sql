-- Optional public farm coordinates for buyer-controlled nearest-farm sorting.

ALTER TABLE farms
  ADD COLUMN IF NOT EXISTS location_latitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_longitude DOUBLE PRECISION;

ALTER TABLE farms
  DROP CONSTRAINT IF EXISTS farms_location_latitude_check,
  DROP CONSTRAINT IF EXISTS farms_location_longitude_check;

ALTER TABLE farms
  ADD CONSTRAINT farms_location_latitude_check
    CHECK (location_latitude IS NULL OR location_latitude BETWEEN -90 AND 90),
  ADD CONSTRAINT farms_location_longitude_check
    CHECK (location_longitude IS NULL OR location_longitude BETWEEN -180 AND 180);

COMMENT ON COLUMN farms.location_latitude IS 'Optional public latitude used for buyer-requested distance sorting.';
COMMENT ON COLUMN farms.location_longitude IS 'Optional public longitude used for buyer-requested distance sorting.';
