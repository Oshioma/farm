-- Goals (the `tasks` table) were only visible to the row's own creator /
-- assignee, so each worker could only see their own goals. Goals are a shared
-- team plan though: every member of a farm should see ALL of that farm's goals
-- (and be able to act on them), exactly like the shared Lunar Planner tasks in
-- add_farm_sharing_to_lunar_tasks.sql.
--
-- PostgreSQL combines multiple PERMISSIVE policies with OR, so these new
-- farm-membership policies simply BROADEN access on top of whatever
-- owner-scoped policies already exist on the table — we don't need to know or
-- drop the original policy names. A task is now visible / editable / deletable
-- by its original owner (existing policies) OR by any member of its farm (these
-- policies).

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm members can view all farm tasks" ON tasks;
DROP POLICY IF EXISTS "Farm members can insert farm tasks" ON tasks;
DROP POLICY IF EXISTS "Farm members can update all farm tasks" ON tasks;
DROP POLICY IF EXISTS "Farm members can delete all farm tasks" ON tasks;

CREATE POLICY "Farm members can view all farm tasks"
  ON tasks
  FOR SELECT
  USING (
    farm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.farm_id = tasks.farm_id AND fm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Farm members can insert farm tasks"
  ON tasks
  FOR INSERT
  WITH CHECK (
    farm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.farm_id = tasks.farm_id AND fm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Farm members can update all farm tasks"
  ON tasks
  FOR UPDATE
  USING (
    farm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.farm_id = tasks.farm_id AND fm.profile_id = auth.uid()
    )
  )
  WITH CHECK (
    farm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.farm_id = tasks.farm_id AND fm.profile_id = auth.uid()
    )
  );

CREATE POLICY "Farm members can delete all farm tasks"
  ON tasks
  FOR DELETE
  USING (
    farm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.farm_id = tasks.farm_id AND fm.profile_id = auth.uid()
    )
  );
