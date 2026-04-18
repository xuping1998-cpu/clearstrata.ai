-- One-time meeting invite magic links (consumed by Edge Function consume-invite-token; no client DML).
CREATE TABLE IF NOT EXISTS public.invite_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  meeting_id uuid NOT NULL REFERENCES public.meetings (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invite_tokens_user_meeting
  ON public.invite_tokens (user_id, meeting_id);

ALTER TABLE public.invite_tokens ENABLE ROW LEVEL SECURITY;

-- No direct access for clients; Edge Functions use service role.
REVOKE ALL ON public.invite_tokens FROM PUBLIC;
REVOKE ALL ON public.invite_tokens FROM anon;
REVOKE ALL ON public.invite_tokens FROM authenticated;
GRANT ALL ON public.invite_tokens TO service_role;

COMMENT ON TABLE public.invite_tokens IS 'One-time tokens for /invite?token= meeting deep links; consumed by consume-invite-token.';
