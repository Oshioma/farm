-- The harvest ETA sheet can link a bed row to the crop growing in it, so the
-- page can show every bed that currently has a crop and the transplant flow can
-- top up estimates for the crop it just created.
ALTER TABLE harvest_eta
ADD COLUMN IF NOT EXISTS crop_id uuid REFERENCES crops(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS harvest_eta_crop_id_idx ON harvest_eta (crop_id);

-- One row per bed per season keeps the merged view (saved rows + beds with
-- crops) unambiguous and lets the transplant flow reuse an existing bed row.
CREATE INDEX IF NOT EXISTS harvest_eta_farm_year_zone_idx
ON harvest_eta (farm_id, year, zone_id);
