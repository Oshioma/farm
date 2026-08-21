-- Lets a fertiliser log entry carry an optional "next time to fertilise"
-- date, which auto-creates (and stays in sync with) a linked goal due on
-- that date. next_fertilise_task_id tracks which task belongs to this entry
-- so editing the date updates the same task instead of creating a duplicate.
ALTER TABLE fertilisations
ADD COLUMN IF NOT EXISTS next_fertilise_date DATE;

ALTER TABLE fertilisations
ADD COLUMN IF NOT EXISTS next_fertilise_task_id UUID REFERENCES tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_fertilisations_next_fertilise_task_id
ON fertilisations(next_fertilise_task_id);
