/*
  20260815130000_properties_trial_fields.sql
  3 个月免费试用（90 天）字段：public.properties

  - subscription_status: trial | active | past_due | canceled
  - trial_started_at
  - trial_ends_at

  兼容策略（临时）：
  - 现有历史物业：若字段为空，统一 backfill 为 trial + 90 天（从 created_at 或 now 起算）
  - 约束：以“可选、幂等”为目标；避免旧环境卡住
*/

BEGIN;

ALTER TABLE public.properties
  ADD COLUMN IF NOT EXISTS subscription_status text,
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz;

-- Backfill existing rows (best-effort, safe on old data)
UPDATE public.properties
SET subscription_status = COALESCE(subscription_status, 'trial')
WHERE subscription_status IS NULL;

UPDATE public.properties
SET trial_started_at = COALESCE(trial_started_at, created_at, now())
WHERE trial_started_at IS NULL;

UPDATE public.properties
SET trial_ends_at = COALESCE(trial_ends_at, trial_started_at + interval '90 days')
WHERE trial_ends_at IS NULL;

-- Optional index for status filters
CREATE INDEX IF NOT EXISTS idx_properties_subscription_status
  ON public.properties(subscription_status);

-- Optional check constraint (guarded; don't block legacy/unknown values)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'properties_subscription_status_check'
  ) THEN
    ALTER TABLE public.properties
      ADD CONSTRAINT properties_subscription_status_check
      CHECK (subscription_status IN ('trial', 'active', 'past_due', 'canceled'))
      NOT VALID;
  END IF;
EXCEPTION
  WHEN others THEN
    -- Keep migration non-blocking across mixed environments.
    NULL;
END
$$;

COMMIT;

