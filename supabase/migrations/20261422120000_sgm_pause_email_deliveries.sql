/*
  sgm_pause_email_deliveries:
  - Independent email delivery ledger for SGM pause notices
  - Idempotency: skip when status=sent exists; max 3 attempts per meeting+user
*/

CREATE TABLE IF NOT EXISTS public.sgm_pause_email_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meetings(id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  status text NOT NULL CHECK (status IN ('sent', 'failed')),
  error_message text,
  attempt_no integer NOT NULL CHECK (attempt_no >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sgm_pause_email_deliveries_meeting_user_attempt_unique
    UNIQUE (meeting_id, user_id, attempt_no)
);

COMMENT ON TABLE public.sgm_pause_email_deliveries IS
  'Email send attempts for SGM pause notices; one row per Resend attempt per meeting+user.';

CREATE INDEX IF NOT EXISTS idx_sgm_pause_email_deliveries_meeting_user
  ON public.sgm_pause_email_deliveries (meeting_id, user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sgm_pause_email_deliveries_property
  ON public.sgm_pause_email_deliveries (property_id, created_at DESC);

ALTER TABLE public.sgm_pause_email_deliveries ENABLE ROW LEVEL SECURITY;

-- RC-011 IU-3: guarded policy for idempotent re-apply (OOB catalog)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'sgm_pause_email_deliveries'
      AND policyname = 'sgm_pause_email_deliveries_select_staff'
  ) THEN
    CREATE POLICY "sgm_pause_email_deliveries_select_staff"
      ON public.sgm_pause_email_deliveries FOR SELECT TO authenticated
      USING (
        property_id IN (SELECT public.user_property_ids())
        AND EXISTS (
          SELECT 1 FROM public.property_members pm
          WHERE pm.user_id = (SELECT auth.uid())
            AND pm.property_id = sgm_pause_email_deliveries.property_id
            AND pm.status = 'active'
            AND pm.role IN ('council', 'admin', 'manager', 'property_admin')
        )
      );
  END IF;
END $$;

-- Service role only for writes; no client INSERT/UPDATE policies

NOTIFY pgrst, 'reload schema';
