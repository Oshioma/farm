-- Row-level security for join_requests.
--
-- Bug: a user who tried to request access to a farm they had *already*
-- requested before (a prior pending / rejected / accepted row exists) hit
--
--   new row violates row-level security policy (USING expression)
--   for table "join_requests"
--
-- The client sends the request as an UPSERT with onConflict "farm_id,user_id"
-- (see app/farm/page.tsx -> handleRequestJoin). When a row already exists for
-- that (farm_id, user_id) pair, PostgreSQL turns the upsert into an UPDATE and
-- checks the existing row against the UPDATE policy's USING expression. The
-- only UPDATE policy on join_requests allowed farm managers/owners (who accept
-- or reject requests) — never the requester — so the requester's own upsert
-- was rejected with the "(USING expression)" error above.
--
-- Fix: give a user full control over THEIR OWN request row (insert / select /
-- update / delete where user_id = auth.uid()), while keeping the manager's
-- ability to see and act on requests for farms they manage. Policies are
-- additive (PERMISSIVE, OR-combined) and idempotent, so applying this on top
-- of any policies already created in the Supabase dashboard is safe.

ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- The requester: full control over their own request row.
-- This is what makes the re-request UPSERT succeed — the UPDATE branch now has
-- a USING expression (user_id = auth.uid()) that the requester satisfies.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS join_requests_own_select ON join_requests;
CREATE POLICY join_requests_own_select ON join_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS join_requests_own_insert ON join_requests;
CREATE POLICY join_requests_own_insert ON join_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS join_requests_own_update ON join_requests;
CREATE POLICY join_requests_own_update ON join_requests
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS join_requests_own_delete ON join_requests;
CREATE POLICY join_requests_own_delete ON join_requests
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Farm managers/owners: see and act on requests for farms they manage
-- (accept -> add member + set status; reject -> set status). Kept here so the
-- table's access rules live in one place even if equivalent policies already
-- exist in the dashboard.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS join_requests_mgr_select ON join_requests;
CREATE POLICY join_requests_mgr_select ON join_requests
  FOR SELECT TO authenticated
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
        AND role_on_farm IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS join_requests_mgr_update ON join_requests;
CREATE POLICY join_requests_mgr_update ON join_requests
  FOR UPDATE TO authenticated
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
        AND role_on_farm IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
        AND role_on_farm IN ('owner', 'manager')
    )
  );

DROP POLICY IF EXISTS join_requests_mgr_delete ON join_requests;
CREATE POLICY join_requests_mgr_delete ON join_requests
  FOR DELETE TO authenticated
  USING (
    farm_id IN (
      SELECT farm_id FROM farm_members
      WHERE profile_id = auth.uid()
        AND role_on_farm IN ('owner', 'manager')
    )
  );
