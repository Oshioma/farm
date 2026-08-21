-- Role-based access enforcement (farm manager vs worker).
--
-- The farm has two roles in farm_members.role_on_farm: "owner" (the farm
-- manager/creator) and "worker" (invited members). "manager" is also treated
-- as a managing role for the future. This migration enforces, at the database
-- layer, what only managers may do — so hiding a button in the UI is backed by
-- real security, not just cosmetics.
--
-- Strategy: PostgreSQL AND-combines RESTRICTIVE policies with the (OR-combined)
-- PERMISSIVE ones. So a RESTRICTIVE "must be a manager" policy NARROWS existing
-- access without needing to know or drop the existing permissive policy names.
-- For the fully manager-only tables we also add a PERMISSIVE manager policy as a
-- safety net so managers can never be locked out.

-- ---------------------------------------------------------------------------
-- Helper: is the current user a manager (owner/manager) of this farm?
-- SECURITY DEFINER so it can read farm_members without tripping its own RLS.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION is_farm_manager(fid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM farm_members
    WHERE farm_id = fid
      AND profile_id = auth.uid()
      AND role_on_farm IN ('owner', 'manager')
  );
$$;

DO $$
DECLARE
  t text;
  -- Money & business data: managers only for EVERYTHING (read + write).
  financial text[] := ARRAY['sales', 'expenses', 'assets', 'income_prediction'];
  -- Farm structure & planning: members may READ, only managers may WRITE.
  structure text[] := ARRAY[
    'zones', 'crops', 'companion_planting', 'planting_plan',
    'farm_map_layouts', 'seedling_map_layouts', 'tree_registry',
    'system_docs', 'soil_tests', 'soil_improvements'
  ];
  -- Operational records: anyone may add/update, only managers may DELETE.
  deletable text[] := ARRAY[
    'tasks', 'harvests', 'pest_logs', 'seedlings', 'fertilisations',
    'compost', 'mulch', 'harvest_eta', 'plants', 'wants', 'seed_collection'
  ];
BEGIN
  -- Financial tables: permissive manager grant (safety net) + restrictive lock.
  FOREACH t IN ARRAY financial LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_mgr_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I AS PERMISSIVE FOR ALL TO authenticated '
      'USING (is_farm_manager(farm_id)) WITH CHECK (is_farm_manager(farm_id))',
      t || '_mgr_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_mgr_only', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR ALL TO authenticated '
      'USING (is_farm_manager(farm_id)) WITH CHECK (is_farm_manager(farm_id))',
      t || '_mgr_only', t);
  END LOOP;

  -- Structure tables: managers-only writes (insert/update/delete); reads open.
  FOREACH t IN ARRAY structure LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_ins_mgr', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR INSERT TO authenticated '
      'WITH CHECK (is_farm_manager(farm_id))', t || '_ins_mgr', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_upd_mgr', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR UPDATE TO authenticated '
      'USING (is_farm_manager(farm_id)) WITH CHECK (is_farm_manager(farm_id))',
      t || '_upd_mgr', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_del_mgr', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR DELETE TO authenticated '
      'USING (is_farm_manager(farm_id))', t || '_del_mgr', t);
  END LOOP;

  -- Operational records: only managers may delete.
  FOREACH t IN ARRAY deletable LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_del_mgr', t);
    EXECUTE format(
      'CREATE POLICY %I ON %I AS RESTRICTIVE FOR DELETE TO authenticated '
      'USING (is_farm_manager(farm_id))', t || '_del_mgr', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- work_hours: workers may LOG their own hours (INSERT stays open), but only
-- managers may read the log, edit, or delete entries (pay/summary is private).
-- ---------------------------------------------------------------------------
ALTER TABLE work_hours ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS work_hours_read_mgr ON work_hours;
CREATE POLICY work_hours_read_mgr ON work_hours
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (is_farm_manager(farm_id));

DROP POLICY IF EXISTS work_hours_update_mgr ON work_hours;
CREATE POLICY work_hours_update_mgr ON work_hours
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (is_farm_manager(farm_id)) WITH CHECK (is_farm_manager(farm_id));

DROP POLICY IF EXISTS work_hours_delete_mgr ON work_hours;
CREATE POLICY work_hours_delete_mgr ON work_hours
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (is_farm_manager(farm_id));
