-- A farm is not published anywhere public until someone says so. This governs
-- both the market at /shop and the farm's own shopfront at /<slug>, so a farm
-- that has not opted in cannot be reached by guessing its URL either.
ALTER TABLE farms
ADD COLUMN IF NOT EXISTS list_in_market BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS farms_list_in_market_idx ON farms (list_in_market) WHERE list_in_market = true;
