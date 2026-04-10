/*
  # profiles.account activation status

  - `status`: pending (awaiting admin approval of resident signup), active, suspended (rejected signup).
  - Existing rows default to active; align with pending residents where applicable.
*/

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

DO $m$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_status_check'
  ) THEN
    ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
      CHECK (status IN ('pending', 'active', 'suspended'));
  END IF;
END $m$;

COMMENT ON COLUMN profiles.status IS 'Account lifecycle: pending until resident record approved; active; suspended if registration rejected.';

UPDATE profiles p
SET status = 'pending'
FROM residents r
WHERE r.user_id = p.id
  AND r.status = 'pending'
  AND p.status = 'active';




