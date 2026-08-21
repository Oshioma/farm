-- Overdue task roll-over for the Lunar Planner.
--
-- When a planned (not done) task's scheduled day passes, the planner now rolls
-- it forward onto today so it stays visible instead of getting stranded in the
-- past. `carried_over_from` records the day the task was ORIGINALLY scheduled
-- for, so the UI can show a "task probably for <date>" hint. It is preserved as
-- the very first scheduled date across repeated roll-overs (only ever set when
-- currently NULL) and cleared when a user deliberately re-picks a date via the
-- task's new date picker.

ALTER TABLE lunar_tasks
ADD COLUMN IF NOT EXISTS carried_over_from DATE;
