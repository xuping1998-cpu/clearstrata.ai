/*
  20260815120000_strata_phase3_safe_drop.sql
  Strata 退场（阶段三）：安全删除方案（仅在确认无业务依赖后执行）

  目标（删除）：
    - public.strata_notifications
    - public.stratas
    - 相关 FK / Realtime publication / RPC strata_id fallback（dashboard_budget_summary）

  设计原则：
    - 事务内执行：任何检查失败则整体回滚，不产生半删状态
    - Fail-fast：遇到未知外键依赖直接抛错，要求先显式处理依赖再继续
    - 尽量使用 IF EXISTS / 条件判断，支持多环境/多版本库形态
*/

BEGIN;

-- ---------------------------------------------------------------------------
-- A) 执行前检查（必须全部为 true，否则抛错回滚）
--    说明：这部分是“硬性护栏”，避免误删仍在使用的 legacy strata 表。
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_has_strata_notifications boolean;
  v_has_stratas boolean;
  v_has_notification_reads boolean;
  v_in_realtime boolean;
  v_recent_writes bigint := 0;
  v_fk_blockers bigint := 0;
BEGIN
  SELECT to_regclass('public.strata_notifications') IS NOT NULL INTO v_has_strata_notifications;
  SELECT to_regclass('public.stratas') IS NOT NULL INTO v_has_stratas;
  SELECT to_regclass('public.notification_reads') IS NOT NULL INTO v_has_notification_reads;

  -- 1) strata_notifications 最近 30 天无写入（若表不存在，视为通过）
  IF v_has_strata_notifications THEN
    EXECUTE $q$
      SELECT COUNT(1)
      FROM public.strata_notifications
      WHERE created_at >= (now() - interval '30 days')
    $q$ INTO v_recent_writes;
  END IF;

  IF v_recent_writes > 0 THEN
    RAISE EXCEPTION 'Precheck failed: public.strata_notifications has % writes in last 30 days', v_recent_writes
      USING ERRCODE = 'check_violation';
  END IF;

  -- 2) 不在 supabase_realtime publication（若 publication 不存在或表不存在，视为通过）
  SELECT EXISTS (
    SELECT 1
    FROM pg_publication p
    JOIN pg_publication_rel pr ON pr.prpubid = p.oid
    JOIN pg_class c ON c.oid = pr.prrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE p.pubname = 'supabase_realtime'
      AND n.nspname = 'public'
      AND c.relname = 'strata_notifications'
  ) INTO v_in_realtime;

  IF v_in_realtime THEN
    RAISE EXCEPTION 'Precheck failed: public.strata_notifications still in publication supabase_realtime'
      USING ERRCODE = 'check_violation';
  END IF;

  -- 3) 无外键依赖未处理（允许的依赖仅限于：
  --    - public.notification_reads.notification_id -> public.strata_notifications.id
  --    - public.strata_notifications.strata_id -> public.stratas.id
  --    其他任何表引用 strata_notifications/stratas 一律阻断并抛错
  SELECT COUNT(1)
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = rel.relnamespace
  JOIN pg_class refrel ON refrel.oid = con.confrelid
  JOIN pg_namespace rn ON rn.oid = refrel.relnamespace
  WHERE con.contype = 'f'
    AND rn.nspname = 'public'
    AND refrel.relname IN ('stratas', 'strata_notifications')
    AND NOT (
      -- allowed legacy relationships
      (n.nspname = 'public' AND rel.relname = 'notification_reads' AND refrel.relname = 'strata_notifications')
      OR
      (n.nspname = 'public' AND rel.relname = 'strata_notifications' AND refrel.relname = 'stratas')
    )
  INTO v_fk_blockers;

  IF v_fk_blockers > 0 THEN
    RAISE EXCEPTION 'Precheck failed: found % unexpected foreign key(s) referencing public.stratas/public.strata_notifications', v_fk_blockers
      USING ERRCODE = 'check_violation';
  END IF;

  -- 4) 无函数依赖 strata_id 分支（此迁移会覆盖 dashboard_budget_summary；其他函数不在此迁移内自动改写）
  --    这里做“提示级”检查：若仍存在函数源码包含 `strata_id`，抛错要求先清理再删表
  --    目的：避免前端/edge 仍调用 legacy RPC 或触发器/函数引用 strata 表。
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace ns ON ns.oid = p.pronamespace
    WHERE ns.nspname = 'public'
      AND p.prokind = 'f'
      AND pg_get_functiondef(p.oid) ILIKE '%strata_id%'
  ) THEN
    RAISE EXCEPTION 'Precheck failed: found function definitions referencing strata_id (cleanup required before dropping strata tables)'
      USING ERRCODE = 'check_violation';
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- B) Step 1：移除 Realtime publication（如果仍存在于 publication 中，这里做实际移除）
--    备注：上面 precheck 已要求“不在 publication”；但为了支持“先移除再执行”的一次性流程，
--    这里仍保留幂等移除逻辑。
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication p
    WHERE p.pubname = 'supabase_realtime'
  ) AND to_regclass('public.strata_notifications') IS NOT NULL THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime DROP TABLE public.strata_notifications';
    EXCEPTION
      WHEN undefined_object THEN
        -- table not in publication; ignore
        NULL;
    END;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- C) Step 2：冻结写入（可选）— 防御性处理：就算即将 DROP，也先收紧权限
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.strata_notifications') IS NOT NULL THEN
    REVOKE INSERT, UPDATE ON public.strata_notifications FROM authenticated;
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- D) Step 3：删除子表（如存在）
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.notification_reads;

-- ---------------------------------------------------------------------------
-- E) Step 4：删除主表
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.strata_notifications;

-- ---------------------------------------------------------------------------
-- F) Step 5：删除父表
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.stratas;

-- ---------------------------------------------------------------------------
-- G) RPC 清理：dashboard_budget_summary
--    - 删除 strata_id 分支
--    - 仅保留 property_id 逻辑（并保留 year-only 的最后兜底以兼容极端环境）
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.dashboard_budget_summary(uuid, int);

CREATE OR REPLACE FUNCTION public.dashboard_budget_summary(
  p_property_id uuid,
  p_year int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_budget numeric := 0;
  v_actual numeric := 0;
  v_sql text;
BEGIN
  IF p_property_id IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'bad_property',
      'message', 'property_id is required'
    );
  END IF;

  -- annual_budgets (property_id only)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'annual_budgets'
      AND column_name = 'property_id'
  ) THEN
    v_sql := $q$
      SELECT COALESCE(SUM(amount), 0)
      FROM public.annual_budgets
      WHERE property_id = $1
        AND fiscal_year = $2
    $q$;
    EXECUTE v_sql INTO v_budget USING p_property_id, p_year;
  ELSE
    -- last resort fallback (property_id column absent): keep behavior consistent with legacy implementation
    v_sql := $q$
      SELECT COALESCE(SUM(amount), 0)
      FROM public.annual_budgets
      WHERE fiscal_year = $1
    $q$;
    EXECUTE v_sql INTO v_budget USING p_year;
  END IF;

  -- invoices (property_id only)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'invoices'
      AND column_name = 'property_id'
  ) THEN
    v_sql := $q$
      SELECT COALESCE(SUM(total_amount), 0)
      FROM public.invoices
      WHERE property_id = $1
        AND fiscal_year = $2
        AND status = 'approved'
    $q$;
    EXECUTE v_sql INTO v_actual USING p_property_id, p_year;
  ELSE
    v_sql := $q$
      SELECT COALESCE(SUM(total_amount), 0)
      FROM public.invoices
      WHERE fiscal_year = $1
        AND status = 'approved'
    $q$;
    EXECUTE v_sql INTO v_actual USING p_year;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'year', p_year,
    'property_id', p_property_id,
    'budget', v_budget,
    'actual', v_actual,
    'remaining', v_budget - v_actual,
    'usage_rate',
      CASE
        WHEN v_budget > 0 THEN ROUND((v_actual / v_budget) * 100, 2)
        ELSE 0
      END
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', SQLERRM,
      'message', 'Unexpected error in dashboard_budget_summary'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.dashboard_budget_summary(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.dashboard_budget_summary(uuid, int) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

