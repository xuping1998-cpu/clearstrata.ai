-- Public join: optional property_code + server-side resolve by slug / property_code / id
-- Fixes client-only matching when code lives in property_code or list is incomplete.

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS property_code text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_property_code_unique
  ON public.properties (lower(trim(property_code)))
  WHERE property_code IS NOT NULL AND btrim(property_code) <> '';

CREATE OR REPLACE FUNCTION public.list_properties_open_for_join()
RETURNS TABLE(id uuid, name text, slug text, property_code text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.name, p.slug, p.property_code
  FROM public.properties p
  WHERE p.allow_public_join_requests = true
  ORDER BY p.name;
$$;

-- Match by slug, property_code, or property id (text / uuid)
CREATE OR REPLACE FUNCTION public.resolve_property_for_join_request(p_code text)
RETURNS TABLE(id uuid, name text, slug text, property_code text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v text := trim(p_code);
BEGIN
  IF v = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT p.id, p.name, p.slug, p.property_code
  FROM public.properties p
  WHERE p.allow_public_join_requests = true
    AND (
      lower(trim(coalesce(p.slug, ''))) = lower(v)
      OR (p.property_code IS NOT NULL AND lower(trim(p.property_code)) = lower(v))
      OR p.id::text = v
      OR lower(p.id::text) = lower(v)
      OR replace(p.id::text, '-', '') = replace(lower(v), '-', '')
    )
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_property_for_join_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_property_for_join_request(text) TO authenticated;




