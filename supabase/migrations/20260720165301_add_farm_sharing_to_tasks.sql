-- Goals (the `tasks` table) were only visible to the row's own creator /
-- assignee, so each worker could only see their own goals even though the
-- goals and dashboard views were already built to group everyone's goals by
-- person.
--
-- This grants every member of a farm READ access to ALL of that farm's goals,
-- so the whole team can see the shared plan. Editing stays restricted: the
-- existing owner-scoped UPDATE/DELETE policies are left untouched, so a worker
-- can still only act on their own goals. The UI hides the action buttons on
-- goals that aren't the viewer's so nothing errors.
--
-- PostgreSQL combines multiple PERMISSIVE policies with OR, so this new
-- farm-membership SELECT policy simply BROADENS visibility on top of whatever
-- owner-scoped policies already exist — no data migration or knowledge of the
-- original policy names is needed.

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farm members can view all farm tasks" ON tasks;
DROP POLICY IF EXISTS "Farm members can update unassigned farm tasks" ON tasks;
DROP POLICY IF EXISTS "Farm members can delete unassigned farm tasks" ON tasks;

CREATE POLICY "Farm members can view all farm tasks"
  ON tasks
  FOR SELECT
  USING (
    farm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.farm_id = tasks.farm_id AND fm.profile_id = auth.uid()
    )
  );

-- Unassigned ("general") goals belong to no one in particular, so any farm
-- member may pick them up: complete, start, or delete them. Goals ASSIGNED to
-- a specific person stay editable only by that person (via the pre-existing
-- owner-scoped policies), so this does not let members touch each other's work.
CREATE POLICY "Farm members can update unassigned farm tasks"
  ON tasks
  FOR UPDATE
  USING (
    assigned_to IS NULL AND farm_id IS NOT NULL AND EXISTS (
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

CREATE POLICY "Farm members can delete unassigned farm tasks"
  ON tasks
  FOR DELETE
  USING (
    assigned_to IS NULL AND farm_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM farm_members fm
      WHERE fm.farm_id = tasks.farm_id AND fm.profile_id = auth.uid()
    )
  );
