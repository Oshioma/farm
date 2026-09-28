-- Some produce is counted, not weighed: a farmer picks 40 mangoes or 12
-- watermelons and has no scale in the field. A harvest can now record a count,
-- a weight, or both, so quantity_kg is no longer required.
ALTER TABLE harvests ADD COLUMN IF NOT EXISTS quantity_units integer;
ALTER TABLE harvests ALTER COLUMN quantity_kg DROP NOT NULL;

ALTER TABLE harvests DROP CONSTRAINT IF EXISTS harvests_quantity_present;
ALTER TABLE harvests ADD CONSTRAINT harvests_quantity_present
  CHECK (quantity_kg IS NOT NULL OR quantity_units IS NOT NULL);

ALTER TABLE harvests DROP CONSTRAINT IF EXISTS harvests_quantity_units_positive;
ALTER TABLE harvests ADD CONSTRAINT harvests_quantity_units_positive
  CHECK (quantity_units IS NULL OR quantity_units >= 0);
