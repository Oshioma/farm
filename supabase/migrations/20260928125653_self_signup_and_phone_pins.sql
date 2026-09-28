-- Farmers can now start WhatsApp setup themselves (/jisajili) and come back
-- later with their phone number and a 4-digit PIN (/ingia).
--
-- whatsapp_invites.source: 'admin' for invites sent from the admin page,
-- 'self' for a farmer who signed up on their own.
-- whatsapp_invites.signin_until: the invite link signs the farmer in only
-- until this moment. New invites get 14 days; opening the shop shortens it to
-- one hour. Afterwards the link shows a "sign in with your PIN" screen, and
-- the admin can renew it from the admin page.
--
-- farmer_pins: one row per phone number, holding a salted scrypt hash of the
-- PIN and a lockout counter. Like whatsapp_invites, only the service role
-- touches it: RLS is on and no policies exist.

ALTER TABLE public.whatsapp_invites
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'admin';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'whatsapp_invites_source_check') THEN
    ALTER TABLE public.whatsapp_invites
      ADD CONSTRAINT whatsapp_invites_source_check CHECK (source IN ('admin', 'self'));
  END IF;
END $$;

ALTER TABLE public.whatsapp_invites
  ADD COLUMN IF NOT EXISTS signin_until timestamptz;

-- Existing farmers get a fresh 14-day window so they can open their link and set a PIN.
UPDATE public.whatsapp_invites SET signin_until = now() + interval '14 days' WHERE signin_until IS NULL;

ALTER TABLE public.whatsapp_invites
  ALTER COLUMN signin_until SET DEFAULT (now() + interval '14 days'),
  ALTER COLUMN signin_until SET NOT NULL;

CREATE TABLE IF NOT EXISTS public.farmer_pins (
  phone text PRIMARY KEY,
  user_id uuid NOT NULL,
  pin_hash text NOT NULL,
  failed_attempts integer NOT NULL DEFAULT 0,
  locked_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS farmer_pins_user_id_idx ON public.farmer_pins (user_id);

ALTER TABLE public.farmer_pins ENABLE ROW LEVEL SECURITY;
