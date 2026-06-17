/*
  # AGM Budget PDF import (Phase AGM-1)

  agm_budget_documents — uploaded AGM budget PDFs and parse/approve workflow.
  agm_budget_lines — council-approved budget lines per fiscal year.
*/

BEGIN;

-- ---------------------------------------------------------------------------
-- agm_budget_documents
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agm_budget_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'pending_parse'
    CHECK (status IN ('pending_parse', 'parsed', 'approved')),
  fiscal_year integer,
  parsed_draft jsonb,
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agm_budget_documents_property
  ON public.agm_budget_documents(property_id);

CREATE INDEX IF NOT EXISTS idx_agm_budget_documents_status
  ON public.agm_budget_documents(property_id, status);

COMMENT ON TABLE public.agm_budget_documents IS
  'AGM budget PDF uploads: pending_parse → parsed (draft) → approved.';
COMMENT ON COLUMN public.agm_budget_documents.parsed_draft IS
  'AI parse draft: { fiscal_year, lines: [{ category, amount }] } before council approval.';

-- ---------------------------------------------------------------------------
-- agm_budget_lines
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.agm_budget_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  fiscal_year integer NOT NULL,
  category text NOT NULL,
  budget_amount numeric(14, 2) NOT NULL CHECK (budget_amount >= 0),
  source_document_id uuid REFERENCES public.agm_budget_documents(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_agm_budget_lines_category UNIQUE (property_id, fiscal_year, category)
);

CREATE INDEX IF NOT EXISTS idx_agm_budget_lines_property_year
  ON public.agm_budget_lines(property_id, fiscal_year);

-- ---------------------------------------------------------------------------
-- RLS — agm_budget_documents
-- ---------------------------------------------------------------------------
ALTER TABLE public.agm_budget_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "abd_select_tenant" ON public.agm_budget_documents;
DROP POLICY IF EXISTS "abd_insert_staff" ON public.agm_budget_documents;
DROP POLICY IF EXISTS "abd_update_staff" ON public.agm_budget_documents;
DROP POLICY IF EXISTS "abd_delete_council" ON public.agm_budget_documents;

CREATE POLICY "abd_select_tenant"
  ON public.agm_budget_documents FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "abd_insert_staff"
  ON public.agm_budget_documents FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_staff_ids())
    AND created_by = (SELECT auth.uid())
  );

CREATE POLICY "abd_update_staff"
  ON public.agm_budget_documents FOR UPDATE TO authenticated
  USING (property_id IN (SELECT public.user_property_staff_ids()))
  WITH CHECK (property_id IN (SELECT public.user_property_staff_ids()));

CREATE POLICY "abd_delete_council"
  ON public.agm_budget_documents FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = agm_budget_documents.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  );

-- ---------------------------------------------------------------------------
-- RLS — agm_budget_lines
-- ---------------------------------------------------------------------------
ALTER TABLE public.agm_budget_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "abl_select_tenant" ON public.agm_budget_lines;
DROP POLICY IF EXISTS "abl_insert_council" ON public.agm_budget_lines;
DROP POLICY IF EXISTS "abl_update_council" ON public.agm_budget_lines;
DROP POLICY IF EXISTS "abl_delete_council" ON public.agm_budget_lines;

CREATE POLICY "abl_select_tenant"
  ON public.agm_budget_lines FOR SELECT TO authenticated
  USING (property_id IN (SELECT public.user_property_ids()));

CREATE POLICY "abl_insert_council"
  ON public.agm_budget_lines FOR INSERT TO authenticated
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = agm_budget_lines.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  );

CREATE POLICY "abl_update_council"
  ON public.agm_budget_lines FOR UPDATE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = agm_budget_lines.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  )
  WITH CHECK (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = agm_budget_lines.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  );

CREATE POLICY "abl_delete_council"
  ON public.agm_budget_lines FOR DELETE TO authenticated
  USING (
    property_id IN (SELECT public.user_property_ids())
    AND EXISTS (
      SELECT 1 FROM public.property_members pm
      WHERE pm.user_id = (SELECT auth.uid())
        AND pm.property_id = agm_budget_lines.property_id
        AND pm.status = 'active'
        AND pm.role IN ('council', 'admin', 'property_admin')
    )
  );

COMMIT;

NOTIFY pgrst, 'reload schema';
