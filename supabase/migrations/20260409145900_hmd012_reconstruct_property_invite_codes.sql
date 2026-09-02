-- HMD-012 governed historical clean-replay schema-origin reconstruction.
-- E-02-HFSOR-IA-004 · PAD-061 Option B.
-- Establishes public.property_invite_codes before immutable
-- 20260409150000_unit_whitelist_invite_codes.sql.
-- CREATE TABLE body copied exactly from 20260509120000_property_invite_codes.sql L3–L13.
-- No unit_no. No role. No RLS. No policies. No indexes. No grants. No data.
-- Not historical source. Not source restoration. Target unchanged. Later CREATE unchanged.

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
