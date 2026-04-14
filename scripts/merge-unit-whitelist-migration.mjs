import fs from 'fs';

const head = fs.readFileSync('supabase/migrations/20260409150000_unit_whitelist_invite_codes.sql', 'utf8');
const submit = fs.readFileSync('supabase/migrations/_submit_fn_only.sql', 'utf8');

const tail = `
-- ---------------------------------------------------------------------------
-- Bump public property_invite_codes on join_requests approval (pending path no longer consumes at submit)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.trg_join_requests_bump_public_invite_on_approve()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $tr$
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.status = 'approved'::public.join_request_status
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.invite_id IS NULL
     AND NEW.invite_code IS NOT NULL
     AND length(trim(NEW.invite_code)) > 0
  THEN
    UPDATE public.property_invite_codes pic
    SET
      used_count = pic.used_count + 1,
      is_active = CASE
        WHEN pic.max_uses > 0 AND (pic.used_count + 1) >= pic.max_uses THEN false
        ELSE pic.is_active
      END
    WHERE pic.property_id = NEW.property_id
      AND (pic.code = trim(NEW.invite_code) OR lower(pic.code) = lower(trim(NEW.invite_code)));
  END IF;
  RETURN NEW;
END;
$tr$;

DROP TRIGGER IF EXISTS join_requests_bump_public_invite_on_approve ON public.join_requests;
CREATE TRIGGER join_requests_bump_public_invite_on_approve
  AFTER UPDATE OF status ON public.join_requests
  FOR EACH ROW
  WHEN (NEW.status = 'approved'::join_request_status AND OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.trg_join_requests_bump_public_invite_on_approve();

REVOKE ALL ON FUNCTION public.trg_join_requests_bump_public_invite_on_approve() FROM PUBLIC;
`;

const out = head.trimEnd() + '\n\n' + submit.trim() + '\n' + tail;
fs.writeFileSync('supabase/migrations/20260409150000_unit_whitelist_invite_codes.sql', out, 'utf8');
console.log('merged', out.length);
