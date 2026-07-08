-- Fertiliser, compost, and mulch logs previously created one row per bed
-- when logged against multiple beds, so the log showed a separate line per
-- bed instead of one entry listing all of them. This mirrors the zone_id +
-- extra_zone_ids pattern already used by crops and plants: zone_id holds the
-- primary bed, extra_zone_ids holds a JSON array of any additional beds.
ALTER TABLE fertilisations
ADD COLUMN IF NOT EXISTS extra_zone_ids TEXT;

ALTER TABLE compost
ADD COLUMN IF NOT EXISTS extra_zone_ids TEXT;

ALTER TABLE mulch
ADD COLUMN IF NOT EXISTS extra_zone_ids TEXT;
