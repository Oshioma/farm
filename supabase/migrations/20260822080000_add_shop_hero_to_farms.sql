-- A photo for the top of the farm's shopfront. Produce photos come from
-- crops.image_url, which the crops page already fills.
ALTER TABLE farms
ADD COLUMN IF NOT EXISTS shop_hero_url TEXT;
