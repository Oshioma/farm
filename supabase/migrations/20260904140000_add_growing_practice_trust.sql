-- Honest growing-practice claims and optional certification evidence.

ALTER TABLE farms
  ADD COLUMN IF NOT EXISTS growing_practice TEXT NOT NULL DEFAULT 'unspecified',
  ADD COLUMN IF NOT EXISTS practice_notes TEXT,
  ADD COLUMN IF NOT EXISTS certification_body TEXT,
  ADD COLUMN IF NOT EXISTS certification_reference TEXT,
  ADD COLUMN IF NOT EXISTS certification_url TEXT,
  ADD COLUMN IF NOT EXISTS certification_expires_on DATE,
  ADD COLUMN IF NOT EXISTS certification_verified_at TIMESTAMPTZ;

ALTER TABLE farms
  DROP CONSTRAINT IF EXISTS farms_growing_practice_check;

ALTER TABLE farms
  ADD CONSTRAINT farms_growing_practice_check
  CHECK (growing_practice IN ('unspecified', 'organic_practices', 'regenerative', 'conventional'));

COMMENT ON COLUMN farms.growing_practice IS 'Farmer-declared growing approach; not itself a certification.';
COMMENT ON COLUMN farms.certification_verified_at IS 'Set only after an administrator independently verifies the certification evidence.';
