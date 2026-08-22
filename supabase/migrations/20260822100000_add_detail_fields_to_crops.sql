-- Descriptive fields for a crop, written once by the farm and read by
-- customers on the shopfront. All optional: the shop shows what is filled in
-- and says nothing about the rest.
ALTER TABLE crops ADD COLUMN IF NOT EXISTS flavour TEXT;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS appearance TEXT;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS size TEXT;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS best_eaten TEXT;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS nutritional_qualities TEXT;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS why_special TEXT;
