-- One-time magic-link tokens for meeting invite emails (consumed by Edge Function with service role only).

CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.meetings (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_user_meeting ON public.invite_tokens (user_id, meeting_id);
CREATE INDEX IF NOT EXISTS idx_invite_tokens_expires ON public.invite_tokens (expires_at) WHERE used_at IS NULL;

ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.invite_tokens FROM PUBLIC;
REVOKE ALL ON public.invite_tokens FROM anon;
REVOKE ALL ON public.invite_tokens FROM authenticated;

COMMENT ON TABLE public.invite_tokens IS 'One-time tokens for /invite?token= magic login; only service_role (Edge Functions) may read/write.';
