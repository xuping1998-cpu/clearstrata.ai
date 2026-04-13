/*
  # Optional unit_id on property_members (SaaS model extension)

  No public.units table in baseline schema; column is nullable UUID for future FK.
*/

ALTER TABLE public.property_members
  ADD COLUMN IF NOT EXISTS unit_id uuid;

COMMENT ON COLUMN public.property_members.unit_id IS 'Optional unit reference when a units table is introduced; nullable.';

CREATE INDEX IF NOT EXISTS idx_property_members_unit_id
  ON public.property_members(unit_id)
  WHERE unit_id IS NOT NULL;

ALTER TABLE public.residents
  ADD COLUMN IF NOT EXISTS unit_id uuid;

COMMENT ON COLUMN public.residents.unit_id IS 'Optional normalized unit FK; unit_no remains the display label.';

CREATE INDEX IF NOT EXISTS idx_residents_unit_id
  ON public.residents(unit_id)
  WHERE unit_id IS NOT NULL;
