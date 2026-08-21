-- A customer's usual share of a harvest, used when ticking crops on the
-- customers page so the common case needs no typing.
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS default_share_pct NUMERIC;
