-- Keep zones as an internal bed-linked model.
-- These columns let us keep stable links between map beds and zone rows.
ALTER TABLE zones
ADD COLUMN IF NOT EXISTS bed_uid text;

ALTER TABLE zones
ADD COLUMN IF NOT EXISTS source text;

CREATE UNIQUE INDEX IF NOT EXISTS zones_farm_bed_uid_active_idx
ON zones (farm_id, bed_uid)
WHERE bed_uid IS NOT NULL AND is_active = true;

CREATE INDEX IF NOT EXISTS zones_farm_source_idx
ON zones (farm_id, source);
