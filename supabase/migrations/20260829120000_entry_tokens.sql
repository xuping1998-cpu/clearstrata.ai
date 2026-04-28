-- entry_tokens: one-time tokens for QR property entry auto-login flow.
-- Distinct from invite_tokens (meeting invites). Service role only.

-- Helper: look up auth user id by email (used by entry-auto-join edge function)
CREATE OR REPLACE FUNCTION public.get_auth_user_id_by_email(p_email text)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = auth, public
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(trim(p_email)) LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_auth_user_id_by_email(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_auth_user_id_by_email(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_auth_user_id_by_email(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_id_by_email(text) TO service_role;

COMMENT ON FUNCTION public.get_auth_user_id_by_email(text) IS
  'Service-role-only helper: returns auth.users.id for a given email. Used by entry-auto-join edge function.';

-- entry_tokens table
CREATE TABLE IF NOT EXISTS public.entry_tokens (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id   uuid        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  unit_no       text        NOT NULL,
  kind          text        NOT NULL CHECK (kind IN ('auto_approved', 'pending_submitted', 'already_member')),
  reason        text,
  final_redirect text       NOT NULL,
  token         text        NOT NULL UNIQUE,
  expires_at    timestamptz NOT NULL,
  used_at       timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.entry_tokens                IS 'One-time entry tokens for QR /entry auto-login; consumed by consume-entry-token edge function.';
COMMENT ON COLUMN public.entry_tokens.kind           IS 'auto_approved | pending_submitted | already_member';
COMMENT ON COLUMN public.entry_tokens.reason         IS 'unit_occupied | unit_change_request | null';
COMMENT ON COLUMN public.entry_tokens.final_redirect IS '"/" for approved/member, "/join/pending" for pending cases';
COMMENT ON COLUMN public.entry_tokens.token          IS 'One-time random token; consumed on first use';

CREATE INDEX IF NOT EXISTS idx_entry_tokens_token
  ON public.entry_tokens (token) WHERE used_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_entry_tokens_user
  ON public.entry_tokens (user_id);
CREATE INDEX IF NOT EXISTS idx_entry_tokens_expires
  ON public.entry_tokens (expires_at) WHERE used_at IS NULL;

ALTER TABLE public.entry_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.entry_tokens FROM PUBLIC;
REVOKE ALL ON public.entry_tokens FROM anon;
REVOKE ALL ON public.entry_tokens FROM authenticated;
GRANT ALL ON public.entry_tokens TO service_role;
