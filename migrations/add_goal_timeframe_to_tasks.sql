-- Tasks are presented in the app as "Goals" with three horizons: a specific
-- month, a calendar year, or a rolling 3-year window. This column records
-- which horizon a row belongs to; existing rows default to "month" so all
-- current tasks become month goals with no data migration required.
ALTER TABLE tasks
ADD COLUMN IF NOT EXISTS goal_timeframe text NOT NULL DEFAULT 'month';

ALTER TABLE tasks
DROP CONSTRAINT IF EXISTS tasks_goal_timeframe_check;

ALTER TABLE tasks
ADD CONSTRAINT tasks_goal_timeframe_check
CHECK (goal_timeframe IN ('month', 'year', '3year'));

CREATE INDEX IF NOT EXISTS tasks_farm_goal_timeframe_idx
ON tasks (farm_id, goal_timeframe);
