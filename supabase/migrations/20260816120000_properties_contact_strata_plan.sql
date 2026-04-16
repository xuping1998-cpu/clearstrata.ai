/*
  20260816120000_properties_contact_strata_plan.sql
  创建真实物业时的联系人与 Strata Plan 快照字段（旧数据可为空；新试用 insert 由触发器强制）
*/

BEGIN;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS contact_name text,
  ADD COLUMN IF NOT EXISTS contact_email text,
  ADD COLUMN IF NOT EXISTS contact_phone text,
  ADD COLUMN IF NOT EXISTS strata_plan text;

-- ---------------------------------------------------------------------------
-- 服务端强制：INSERT 且为试用（subscription_status = trial）时必须有「三件套 + 联系人」
-- （避免仅靠前端直写 properties 绕过）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.properties_enforce_contact_bundle_on_trial_insert()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF lower(coalesce(NEW.subscription_status, '')) = 'trial' THEN
      IF nullif(trim(NEW.contact_name), '') IS NULL
        OR nullif(trim(NEW.contact_email), '') IS NULL
        OR nullif(trim(NEW.contact_phone), '') IS NULL
        OR nullif(trim(NEW.strata_plan), '') IS NULL
      THEN
        RAISE EXCEPTION 'MISSING_REQUIRED_FIELDS'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_properties_enforce_contact_bundle_on_trial_insert ON public.properties;

CREATE TRIGGER trg_properties_enforce_contact_bundle_on_trial_insert
  BEFORE INSERT ON public.properties
  FOR EACH ROW
  EXECUTE FUNCTION public.properties_enforce_contact_bundle_on_trial_insert();

COMMENT ON FUNCTION public.properties_enforce_contact_bundle_on_trial_insert() IS
  'On INSERT, if subscription_status is trial, require contact_name, contact_email, contact_phone, strata_plan.';

COMMIT;
