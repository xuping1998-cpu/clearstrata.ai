/*
  # owner_documents.property_id (production gap fix)

  Production public.owner_documents may lack property_id while the app filters/inserts
  by property_id (FormsTab → /owner-info 表单). PostgREST then returns 400.

  - Add nullable property_id (no SET NOT NULL) so legacy rows are not blocked.
  - RLS od_all_tenant already scopes by property_id IN user_property_ids(); NULL legacy
    rows are simply invisible and do not block new inserts with a valid property_id.
*/

BEGIN;

ALTER TABLE public.owner_documents
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_owner_documents_property_id
  ON public.owner_documents(property_id);

COMMIT;

NOTIFY pgrst, 'reload schema';
