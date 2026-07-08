-- The Lunar Planner's "Tasks" view is now embedded on the farm dashboard as a
-- shared team task manager, so lunar_tasks needs to be assignable and visible
-- to every member of a farm rather than only the row's creator. lunar_days
-- (moon phase overrides / personal notes) stays user-scoped and untouched -
-- the calculated moon phase itself is a pure function of the date, so every
-- farm member sees the same guidance regardless of who is logged in.

ALTER TABLE lunar_tasks
ADD COLUMN IF NOT EXISTS farm_id UUID REFERENCES farms(id) ON DELETE CASCADE;

ALTER TABLE lunar_tasks
ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_lunar_tasks_farm_id ON lunar_tasks(farm_id);
CREATE INDEX IF NOT EXISTS idx_lunar_tasks_farm_date ON lunar_tasks(farm_id, date);
CREATE INDEX IF NOT EXISTS idx_lunar_tasks_assigned_to ON lunar_tasks(assigned_to);

-- ---------------------------------------------------------------------------
-- RLS: a lunar task is visible/editable by its creator (personal, farm_id
-- null) OR by any member of its farm (farm_id set) - matching how the main
-- "tasks" (Goals) table works.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can view their own lunar tasks" ON lunar_tasks;
DROP POLICY IF EXISTS "Users can insert their own lunar tasks" ON lunar_tasks;
DROP POLICY IF EXISTS "Users can update their own lunar tasks" ON lunar_tasks;
DROP POLICY IF EXISTS "Users can delete their own lunar tasks" ON lunar_tasks;
DROP POLICY IF EXISTS "Users can view their own or farm lunar tasks" ON lunar_tasks;
DROP POLICY IF EXISTS "Users can insert their own or farm lunar tasks" ON lunar_tasks;
DROP POLICY IF EXISTS "Users can update their own or farm lunar tasks" ON lunar_tasks;
DROP POLICY IF EXISTS "Users can delete their own or farm lunar tasks" ON lunar_tasks;

CREATE POLICY "Users can view their own or farm lunar tasks"
  ON lunar_tasks
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR (farm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.farm_id = lunar_tasks.farm_id AND fm.profile_id = auth.uid()
    ))
  );

CREATE POLICY "Users can insert their own or farm lunar tasks"
  ON lunar_tasks
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (farm_id IS NULL OR EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.farm_id = lunar_tasks.farm_id AND fm.profile_id = auth.uid()
    ))
  );

CREATE POLICY "Users can update their own or farm lunar tasks"
  ON lunar_tasks
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (farm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.farm_id = lunar_tasks.farm_id AND fm.profile_id = auth.uid()
    ))
  )
  WITH CHECK (
    user_id = auth.uid()
    OR (farm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.farm_id = lunar_tasks.farm_id AND fm.profile_id = auth.uid()
    ))
  );

CREATE POLICY "Users can delete their own or farm lunar tasks"
  ON lunar_tasks
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR (farm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.farm_id = lunar_tasks.farm_id AND fm.profile_id = auth.uid()
    ))
  );
