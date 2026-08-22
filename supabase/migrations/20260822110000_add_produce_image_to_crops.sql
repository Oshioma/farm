-- Two pictures per crop: image_url is the plant in the ground, and this is the
-- harvested produce. The shop shows the produce picture, falling back to the
-- plant one where no produce picture has been taken.
ALTER TABLE crops
ADD COLUMN IF NOT EXISTS produce_image_url TEXT;
