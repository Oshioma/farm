-- Counted crops (mangoes, watermelons) keep a running piece total next to
-- their kilo yield, and an average weight of one piece so a count can be
-- turned into an estimated weight when nothing was put on a scale.
ALTER TABLE crops ADD COLUMN IF NOT EXISTS actual_yield_units integer;
ALTER TABLE crops ADD COLUMN IF NOT EXISTS kg_per_unit numeric;

ALTER TABLE crops DROP CONSTRAINT IF EXISTS crops_kg_per_unit_positive;
ALTER TABLE crops ADD CONSTRAINT crops_kg_per_unit_positive
  CHECK (kg_per_unit IS NULL OR kg_per_unit > 0);

-- True when harvests.quantity_kg came from count × kg_per_unit rather than a scale.
ALTER TABLE harvests ADD COLUMN IF NOT EXISTS weight_estimated boolean NOT NULL DEFAULT false;
