-- Notifications
--
-- An in-app notification centre (the bell in the farm dashboard header). Rows
-- are created ONLY by the SECURITY DEFINER triggers below — there is no INSERT
-- policy for the authenticated role, so nothing client-side can spoof a
-- notification into another member's list. Each member sees, marks read, and
-- deletes only their own rows.
--
-- Three event families (all fire on a member action; no scheduler involved):
--   1. Farm join requests          -> the farm's managers (owner/manager)
--   2. New member / role change     -> the farm's managers
--   3. A task shared/assigned to a farm -> the assignee, or all members if none
--
-- Idempotent / re-runnable, matching this repo's migration style.

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  farm_id uuid REFERENCES farms(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  body text,
  link text,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient
  ON notifications(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications(recipient_id) WHERE NOT read;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- A member only ever reads / updates (mark read) / deletes their own rows.
-- No INSERT policy: only the triggers below (SECURITY DEFINER) create rows.
DROP POLICY IF EXISTS notifications_select_own ON notifications;
CREATE POLICY notifications_select_own ON notifications
  FOR SELECT TO authenticated
  USING (recipient_id = auth.uid());

DROP POLICY IF EXISTS notifications_update_own ON notifications;
CREATE POLICY notifications_update_own ON notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

DROP POLICY IF EXISTS notifications_delete_own ON notifications;
CREATE POLICY notifications_delete_own ON notifications
  FOR DELETE TO authenticated
  USING (recipient_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 1. Join request -> notify the farm's managers
--    join_requests inserts are upserts (onConflict farm_id,user_id), so also
--    fire when a withdrawn/resolved request flips back to 'pending'.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_join_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_farm_name text;
BEGIN
  IF NEW.status IS DISTINCT FROM 'pending' THEN
    RETURN NEW;
  END IF;
  -- On UPDATE, only a fresh transition into 'pending' is worth a notification.
  IF TG_OP = 'UPDATE' AND OLD.status = 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_farm_name FROM farms WHERE id = NEW.farm_id;

  INSERT INTO notifications (recipient_id, farm_id, type, title, link, actor_id)
  SELECT fm.profile_id, NEW.farm_id, 'join_request',
         COALESCE(NEW.user_email, 'Someone') || ' requested to join ' || COALESCE(v_farm_name, 'your farm'),
         '/farm/invite', NEW.user_id
  FROM farm_members fm
  WHERE fm.farm_id = NEW.farm_id
    AND fm.role_on_farm IN ('owner', 'manager')
    AND fm.profile_id <> COALESCE(NEW.user_id, '00000000-0000-0000-0000-000000000000'::uuid);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_join_request ON join_requests;
CREATE TRIGGER trg_notify_join_request
  AFTER INSERT OR UPDATE ON join_requests
  FOR EACH ROW EXECUTE FUNCTION notify_join_request();

-- ---------------------------------------------------------------------------
-- 2a. New member added -> notify the farm's managers (not the new member, and
--     so farm creation — where the owner adds themselves — notifies no one).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_new_member()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_farm_name text;
BEGIN
  SELECT name INTO v_farm_name FROM farms WHERE id = NEW.farm_id;

  INSERT INTO notifications (recipient_id, farm_id, type, title, link, actor_id)
  SELECT fm.profile_id, NEW.farm_id, 'new_member',
         COALESCE(NEW.user_email, 'A new member') || ' joined ' || COALESCE(v_farm_name, 'your farm'),
         '/farm', NEW.profile_id
  FROM farm_members fm
  WHERE fm.farm_id = NEW.farm_id
    AND fm.role_on_farm IN ('owner', 'manager')
    AND fm.profile_id <> NEW.profile_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_member ON farm_members;
CREATE TRIGGER trg_notify_new_member
  AFTER INSERT ON farm_members
  FOR EACH ROW EXECUTE FUNCTION notify_new_member();

-- ---------------------------------------------------------------------------
-- 2b. Role changed -> notify the farm's managers (not the affected member, nor
--     whoever made the change).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_role_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_farm_name text;
BEGIN
  IF NEW.role_on_farm IS NOT DISTINCT FROM OLD.role_on_farm THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_farm_name FROM farms WHERE id = NEW.farm_id;

  INSERT INTO notifications (recipient_id, farm_id, type, title, link, actor_id)
  SELECT fm.profile_id, NEW.farm_id, 'role_change',
         COALESCE(NEW.user_email, 'A member') || ' is now ' || COALESCE(NEW.role_on_farm, 'a member')
           || ' at ' || COALESCE(v_farm_name, 'your farm'),
         '/farm/invite', auth.uid()
  FROM farm_members fm
  WHERE fm.farm_id = NEW.farm_id
    AND fm.role_on_farm IN ('owner', 'manager')
    AND fm.profile_id <> NEW.profile_id
    AND fm.profile_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_role_change ON farm_members;
CREATE TRIGGER trg_notify_role_change
  AFTER UPDATE ON farm_members
  FOR EACH ROW EXECUTE FUNCTION notify_role_change();

-- ---------------------------------------------------------------------------
-- 3. Task shared/assigned to a farm -> the assignee, or every other member.
--    Shared helper reused by both the `tasks` (Goals) and `lunar_tasks` tables,
--    which both carry farm_id / assigned_to / title.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION notify_shared_task(p_farm_id uuid, p_title text, p_assigned_to uuid, p_actor uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_zero uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  IF p_farm_id IS NULL THEN
    RETURN;
  END IF;

  IF p_assigned_to IS NOT NULL THEN
    -- Assigned to one person: notify just them, unless they assigned it to self.
    IF p_assigned_to <> COALESCE(p_actor, v_zero) THEN
      INSERT INTO notifications (recipient_id, farm_id, type, title, link, actor_id)
      VALUES (p_assigned_to, p_farm_id, 'task_assigned',
              'You were assigned a task: ' || COALESCE(p_title, 'Untitled'), '/farm', p_actor);
    END IF;
  ELSE
    -- Unassigned shared task: notify every other member of the farm.
    INSERT INTO notifications (recipient_id, farm_id, type, title, link, actor_id)
    SELECT fm.profile_id, p_farm_id, 'task_shared',
           'New shared task: ' || COALESCE(p_title, 'Untitled'), '/farm', p_actor
    FROM farm_members fm
    WHERE fm.farm_id = p_farm_id
      AND fm.profile_id <> COALESCE(p_actor, v_zero);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION notify_task_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.farm_id IS NOT NULL THEN
      PERFORM notify_shared_task(NEW.farm_id, NEW.title, NEW.assigned_to, auth.uid());
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only on a (re)assignment to a specific person on a shared task.
    IF NEW.farm_id IS NOT NULL
       AND NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      PERFORM notify_shared_task(NEW.farm_id, NEW.title, NEW.assigned_to, auth.uid());
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_task_event ON tasks;
CREATE TRIGGER trg_notify_task_event
  AFTER INSERT OR UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION notify_task_event();

DROP TRIGGER IF EXISTS trg_notify_lunar_task_event ON lunar_tasks;
CREATE TRIGGER trg_notify_lunar_task_event
  AFTER INSERT OR UPDATE ON lunar_tasks
  FOR EACH ROW EXECUTE FUNCTION notify_task_event();
