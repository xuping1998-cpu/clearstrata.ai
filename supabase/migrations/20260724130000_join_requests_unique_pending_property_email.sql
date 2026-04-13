/*
  Prevent duplicate pending join_requests for the same property + email (case-insensitive).
  - Cleans historical duplicates (keeps newest by created_at).
  - Partial unique index matches frontend / RPC normalization (lower(trim(email))).
*/

-- ---------------------------------------------------------------------------
-- 1) Remove duplicate pending rows (same property + normalized email)
-- ---------------------------------------------------------------------------

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY property_id, lower(trim(coalesce(email, '')))
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.join_requests
  WHERE status = 'pending'::public.join_request_status
    AND coalesce(trim(email), '') <> ''
)
DELETE FROM public.join_requests jr
USING ranked r
WHERE jr.id = r.id
  AND r.rn > 1;

-- ---------------------------------------------------------------------------
-- 2) Partial unique index (production guard + race safety)
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_request
  ON public.join_requests (property_id, (lower(trim(email))))
  WHERE status = 'pending'::public.join_request_status
    AND coalesce(trim(email), '') <> '';

COMMENT ON INDEX public.uniq_pending_request IS
  'At most one pending join_request per property and normalized email (non-empty email).';
