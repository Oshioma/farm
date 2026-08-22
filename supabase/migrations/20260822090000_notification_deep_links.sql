-- Notifications carried a page, not a place: every task notification linked to
-- /farm, so clicking one dropped you on the dashboard with no idea which task
-- it meant. Each link now names the row it is about, and the pages scroll to
-- it and mark it.
--
-- Replaces the trigger functions created in create_notifications.sql. The
-- triggers themselves are unchanged and keep pointing at these names.

-- Task shared or assigned: the link carries the task's id, and which page
-- shows it — the dashboard for farm tasks, the lunar planner for lunar ones.
--
-- The original took four arguments. Adding one creates a second function
-- rather than replacing it, and a four-argument call would then be ambiguous,
-- so the old one goes first.
DROP FUNCTION IF EXISTS notify_shared_task(uuid, text, uuid, uuid);

CREATE OR REPLACE FUNCTION notify_shared_task(
  p_farm_id uuid,
  p_title text,
  p_assigned_to uuid,
  p_actor uuid,
  p_link text DEFAULT '/farm'
)
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
    IF p_assigned_to <> COALESCE(p_actor, v_zero) THEN
      INSERT INTO notifications (recipient_id, farm_id, type, title, link, actor_id)
      VALUES (p_assigned_to, p_farm_id, 'task_assigned',
              'You were assigned a task: ' || COALESCE(p_title, 'Untitled'), p_link, p_actor);
    END IF;
  ELSE
    INSERT INTO notifications (recipient_id, farm_id, type, title, link, actor_id)
    SELECT fm.profile_id, p_farm_id, 'task_shared',
           'New shared task: ' || COALESCE(p_title, 'Untitled'), p_link, p_actor
    FROM farm_members fm
    WHERE fm.farm_id = p_farm_id
      AND fm.profile_id <> COALESCE(p_actor, v_zero);
  END IF;
END;
$$;

-- The trigger runs on both `tasks` and `lunar_tasks`, so it picks the page from
-- the table it fired on.
CREATE OR REPLACE FUNCTION notify_task_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link text;
BEGIN
  IF TG_TABLE_NAME = 'lunar_tasks' THEN
    v_link := '/lunar-planner?task=' || NEW.id;
  ELSE
    v_link := '/farm?task=' || NEW.id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.farm_id IS NOT NULL THEN
      PERFORM notify_shared_task(NEW.farm_id, NEW.title, NEW.assigned_to, auth.uid(), v_link);
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.farm_id IS NOT NULL
       AND NEW.assigned_to IS NOT NULL
       AND NEW.assigned_to IS DISTINCT FROM OLD.assigned_to THEN
      PERFORM notify_shared_task(NEW.farm_id, NEW.title, NEW.assigned_to, auth.uid(), v_link);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- A new member or a role change is about the members list, not the dashboard.
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
         '/farm/invite?member=' || NEW.profile_id, NEW.profile_id
  FROM farm_members fm
  WHERE fm.farm_id = NEW.farm_id
    AND fm.role_on_farm IN ('owner', 'manager')
    AND fm.profile_id <> NEW.profile_id;

  RETURN NEW;
END;
$$;

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
         '/farm/invite?member=' || NEW.profile_id, auth.uid()
  FROM farm_members fm
  WHERE fm.farm_id = NEW.farm_id
    AND fm.role_on_farm IN ('owner', 'manager')
    AND fm.profile_id <> NEW.profile_id
    AND fm.profile_id <> COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);

  RETURN NEW;
END;
$$;

-- Notifications already in the table keep their old generic link; the bell
-- sends those to a sensible page rather than nowhere.
