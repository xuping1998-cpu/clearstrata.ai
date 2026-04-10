-- Standalone invite code rows for admin QR / labels (separate from property_invites).

CREATE TABLE IF NOT EXISTS public.property_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  code text NOT NULL,
  label text NOT NULL DEFAULT '',
  used_count int NOT NULL DEFAULT 0 CHECK (used_count >= 0),
  max_uses int NOT NULL DEFAULT 1 CHECK (max_uses >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT property_invite_codes_code_unique UNIQUE (code)
);

CREATE INDEX IF NOT EXISTS idx_property_invite_codes_property_id
  ON public.property_invite_codes(property_id);

ALTER TABLE public.property_invite_codes ENABLE ROW LEVEL SECURITY;

-- Staff (same scope as property_invites select) can read/write codes for their property.
CREATE POLICY "pic_select_property"
  ON public.property_invite_codes FOR SELECT TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = property_invite_codes.property_id
        AND pm.status = 'active'
        AND pm.role IN ('property_admin', 'admin', 'council', 'manager')
    )
  );

CREATE POLICY "pic_insert_property"
  ON public.property_invite_codes FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = property_invite_codes.property_id
        AND pm.status = 'active'
        AND pm.role IN ('property_admin', 'admin', 'council', 'manager')
    )
  );

CREATE POLICY "pic_update_property"
  ON public.property_invite_codes FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = property_invite_codes.property_id
        AND pm.status = 'active'
        AND pm.role IN ('property_admin', 'admin', 'council', 'manager')
    )
  )
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = property_invite_codes.property_id
        AND pm.status = 'active'
        AND pm.role IN ('property_admin', 'admin', 'council', 'manager')
    )
  );

GRANT SELECT, INSERT, UPDATE ON public.property_invite_codes TO authenticated;
GRANT ALL ON public.property_invite_codes TO service_role;




