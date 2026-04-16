/*
  Linked DBs that never received multi_tenant_properties may lack property_id on
  meeting_agenda_items / meeting_documents. Adds columns, backfills from meetings, indexes.
*/

ALTER TABLE public.meeting_agenda_items
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

ALTER TABLE public.meeting_documents
  ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id) ON DELETE SET NULL;

UPDATE public.meeting_agenda_items mai
SET property_id = m.property_id
FROM public.meetings m
WHERE mai.meeting_id = m.id
  AND mai.property_id IS NULL
  AND m.property_id IS NOT NULL;

UPDATE public.meeting_documents md
SET property_id = m.property_id
FROM public.meetings m
WHERE md.meeting_id = m.id
  AND md.property_id IS NULL
  AND m.property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS meeting_agenda_items_property_id_idx ON public.meeting_agenda_items(property_id);
CREATE INDEX IF NOT EXISTS meeting_documents_property_id_idx ON public.meeting_documents(property_id);
