-- ---------------------------------------------------------------------------
-- unit_whitelist: per-property allowed unit numbers (业委会维护，无需手写 SQL)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.unit_whitelist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties (id) ON DELETE CASCADE,
  unit_no text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unit_whitelist_property_id_unit_no_key UNIQUE (property_id, unit_no)
);

COMMENT ON TABLE public.unit_whitelist IS 'Allowed units for a property; managed from app / property admin.';

CREATE INDEX IF NOT EXISTS idx_unit_whitelist_property_id
  ON public.unit_whitelist (property_id);

-- ---------------------------------------------------------------------------
-- RLS: 仅当前物业下 role 为 admin 或 council 的 active 成员可读写
-- ---------------------------------------------------------------------------

ALTER TABLE public.unit_whitelist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unit_whitelist_select ON public.unit_whitelist;
DROP POLICY IF EXISTS unit_whitelist_insert ON public.unit_whitelist;
DROP POLICY IF EXISTS unit_whitelist_update ON public.unit_whitelist;
DROP POLICY IF EXISTS unit_whitelist_delete ON public.unit_whitelist;

CREATE POLICY unit_whitelist_select
  ON public.unit_whitelist FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = unit_whitelist.property_id
        AND pm.user_id = auth.uid()
        AND pm.status::text = 'active'
        AND pm.role::text IN ('admin', 'council')
    )
  );

CREATE POLICY unit_whitelist_insert
  ON public.unit_whitelist FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = unit_whitelist.property_id
        AND pm.user_id = auth.uid()
        AND pm.status::text = 'active'
        AND pm.role::text IN ('admin', 'council')
    )
  );

CREATE POLICY unit_whitelist_update
  ON public.unit_whitelist FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = unit_whitelist.property_id
        AND pm.user_id = auth.uid()
        AND pm.status::text = 'active'
        AND pm.role::text IN ('admin', 'council')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = unit_whitelist.property_id
        AND pm.user_id = auth.uid()
        AND pm.status::text = 'active'
        AND pm.role::text IN ('admin', 'council')
    )
  );

CREATE POLICY unit_whitelist_delete
  ON public.unit_whitelist FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.property_members pm
      WHERE pm.property_id = unit_whitelist.property_id
        AND pm.user_id = auth.uid()
        AND pm.status::text = 'active'
        AND pm.role::text IN ('admin', 'council')
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.unit_whitelist TO authenticated;

NOTIFY pgrst, 'reload schema';
