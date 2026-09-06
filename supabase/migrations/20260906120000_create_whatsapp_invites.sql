-- WhatsApp onboarding invites (farm_invites already holds member invites for /join). The admin creates a row, sends its link by
-- WhatsApp (a wa.me deep link the admin taps), and the farmer completes the
-- first setup on a public page keyed by the token, with no login. Only the
-- service role reads or writes this table: RLS is on and no policies exist.

CREATE TABLE IF NOT EXISTS public.whatsapp_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  farmer_name text NOT NULL,
  phone text NOT NULL,
  lang text NOT NULL DEFAULT 'sw' CHECK (lang IN ('en', 'sw')),
  step text NOT NULL DEFAULT 'farm' CHECK (step IN ('farm', 'location', 'crop', 'done')),
  user_id uuid,
  farm_id uuid REFERENCES public.farms(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  opened_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS whatsapp_invites_phone_idx ON public.whatsapp_invites (phone);
CREATE INDEX IF NOT EXISTS whatsapp_invites_created_at_idx ON public.whatsapp_invites (created_at DESC);

ALTER TABLE public.whatsapp_invites ENABLE ROW LEVEL SECURITY;
