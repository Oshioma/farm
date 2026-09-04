-- Tanzania fulfilment details shown to buyers on the public shop and tracking page.

ALTER TABLE farms
  ADD COLUMN IF NOT EXISTS shop_contact_phone TEXT,
  ADD COLUMN IF NOT EXISTS fulfilment_method TEXT NOT NULL DEFAULT 'collection',
  ADD COLUMN IF NOT EXISTS collection_instructions TEXT,
  ADD COLUMN IF NOT EXISTS delivery_area TEXT;

ALTER TABLE farms
  DROP CONSTRAINT IF EXISTS farms_fulfilment_method_check;

ALTER TABLE farms
  ADD CONSTRAINT farms_fulfilment_method_check
  CHECK (fulfilment_method IN ('collection', 'delivery', 'both'));

COMMENT ON COLUMN farms.shop_contact_phone IS 'Public farm contact number, preferably WhatsApp-enabled.';
COMMENT ON COLUMN farms.fulfilment_method IS 'How public shop orders are handed over: collection, delivery, or both.';
COMMENT ON COLUMN farms.collection_instructions IS 'Public collection location, timing, or directions.';
COMMENT ON COLUMN farms.delivery_area IS 'Public description of delivery coverage and arrangements.';
