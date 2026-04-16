/*
  Multi-tenant repair: ensure property_id exists on core tables, add *_property_id_idx
  indexes, and backfill NULLs from property_members (then single-property fallback).

  Idempotent: safe to re-run (IF NOT EXISTS / IS NULL guards).
*/

ALTER TABLE public.property_members ADD COLUMN IF NOT EXISTS approved_at timestamptz;

-- ---------------------------------------------------------------------------
-- 1) Columns (nullable uuid; FK optional for legacy rows)
-- ---------------------------------------------------------------------------
ALTER TABLE public.residents ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
ALTER TABLE public.owner_info ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
ALTER TABLE public.disputes ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
ALTER TABLE public.community_notifications ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);
ALTER TABLE public.property_invite_codes ADD COLUMN IF NOT EXISTS property_id uuid REFERENCES public.properties(id);

-- ---------------------------------------------------------------------------
-- 2) Indexes (requested naming)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS residents_property_id_idx ON public.residents(property_id);
CREATE INDEX IF NOT EXISTS owner_info_property_id_idx ON public.owner_info(property_id);
CREATE INDEX IF NOT EXISTS disputes_property_id_idx ON public.disputes(property_id);
CREATE INDEX IF NOT EXISTS community_notifications_property_id_idx ON public.community_notifications(property_id);

-- Replace legacy invite-code index name with the canonical one (avoid duplicate btree).
DROP INDEX IF EXISTS public.idx_property_invite_codes_property_id;
CREATE INDEX IF NOT EXISTS property_invite_codes_property_id_idx ON public.property_invite_codes(property_id);

-- ---------------------------------------------------------------------------
-- 3) Backfill from active property_members (one property per user: stable pick)
-- ---------------------------------------------------------------------------
UPDATE public.residents r
SET property_id = s.property_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, property_id
  FROM public.property_members
  WHERE status = 'active'
  ORDER BY user_id, approved_at DESC NULLS LAST, property_id ASC
) s
WHERE r.property_id IS NULL
  AND r.user_id IS NOT NULL
  AND r.user_id = s.user_id;

UPDATE public.owner_info o
SET property_id = s.property_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, property_id
  FROM public.property_members
  WHERE status = 'active'
  ORDER BY user_id, approved_at DESC NULLS LAST, property_id ASC
) s
WHERE o.property_id IS NULL
  AND o.user_id IS NOT NULL
  AND o.user_id = s.user_id;

UPDATE public.disputes d
SET property_id = s.property_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, property_id
  FROM public.property_members
  WHERE status = 'active'
  ORDER BY user_id, approved_at DESC NULLS LAST, property_id ASC
) s
WHERE d.property_id IS NULL
  AND d.reporter_id = s.user_id;

UPDATE public.community_notifications cn
SET property_id = s.property_id
FROM (
  SELECT DISTINCT ON (user_id) user_id, property_id
  FROM public.property_members
  WHERE status = 'active'
  ORDER BY user_id, approved_at DESC NULLS LAST, property_id ASC
) s
WHERE cn.property_id IS NULL
  AND cn.created_by = s.user_id;

-- ---------------------------------------------------------------------------
-- 4) Fallback: single known property in the database (legacy single-strata)
-- ---------------------------------------------------------------------------
DO $fb$
DECLARE
  sole_id uuid;
  nprops int;
BEGIN
  SELECT count(*)::int INTO nprops FROM public.properties;
  IF nprops = 1 THEN
    SELECT id INTO sole_id FROM public.properties ORDER BY created_at NULLS LAST LIMIT 1;
    IF sole_id IS NOT NULL THEN
      UPDATE public.residents SET property_id = sole_id WHERE property_id IS NULL;
      UPDATE public.owner_info SET property_id = sole_id WHERE property_id IS NULL;
      UPDATE public.disputes SET property_id = sole_id WHERE property_id IS NULL;
      UPDATE public.community_notifications SET property_id = sole_id WHERE property_id IS NULL;
    END IF;
  END IF;
END $fb$;
