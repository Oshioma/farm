-- Email people when a goal (or lunar planner task) is assigned to them.
--
-- notify_shared_task() already writes a 'task_assigned' row to notifications
-- for the bell. This trigger forwards each of those rows to the app, which
-- looks up the person's email and sends it through Resend
-- (app/api/webhooks/task-assigned).
--
-- The call goes out through pg_net, which queues it and returns at once, so
-- assigning a goal never waits on (or fails because of) email.
--
-- Settings live in Supabase Vault so no secret is in the repo:
--   app_webhook_secret  must match WEBHOOK_SECRET in Vercel (required)
--   app_base_url        e.g. https://www.shamba.online (optional, that default)
-- Without app_webhook_secret nothing is sent.
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION email_task_assigned()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_secret text;
  v_base text;
BEGIN
  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE name = 'app_webhook_secret' LIMIT 1;
  IF v_secret IS NULL OR v_secret = '' THEN
    RETURN NEW;
  END IF;
  SELECT decrypted_secret INTO v_base FROM vault.decrypted_secrets WHERE name = 'app_base_url' LIMIT 1;
  v_base := rtrim(COALESCE(NULLIF(v_base, ''), 'https://www.shamba.online'), '/');

  PERFORM net.http_post(
    url := v_base || '/api/webhooks/task-assigned',
    body := jsonb_build_object('record', to_jsonb(NEW)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret
    ),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Email is a courtesy; the assignment and its bell notification still stand.
  RAISE WARNING 'email_task_assigned: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_email_task_assigned ON notifications;
CREATE TRIGGER trg_email_task_assigned
  AFTER INSERT ON notifications
  FOR EACH ROW
  WHEN (NEW.type = 'task_assigned')
  EXECUTE FUNCTION email_task_assigned();
