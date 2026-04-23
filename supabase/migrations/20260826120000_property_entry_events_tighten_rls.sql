/*
  收口：补全 property_entry_events 表（前端 trackPropertyEntryEvent 使用）并收紧 RLS
  - 不引入第二套边界：仅有 property_id + public.resolve_public_demo_property
  - Demo（BCS3736 解析行）：anon 仅允许“漏斗”事件、且仅针对 demo 物业；authenticated 的 insert 不放开真实业务表
  - 幂等：IF NOT EXISTS / CREATE OR REPLACE / DROP POLICY IF EXISTS

  与真实物业数据隔离：anon 不能向**非** demo 物业写事件行（非 demo 漏斗须已登录，由 authenticated 策略处理）。
*/

-- ---------------------------------------------------------------------------
-- 1) Helper（与 20260824130000* 中逻辑一致，可重复 OR REPLACE）
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_public_demo_property(p_property_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_property_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.resolve_public_demo_property('BCS3736') AS d
      WHERE d.id = p_property_id
    );
$$;

REVOKE ALL ON FUNCTION public.is_public_demo_property(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_public_demo_property(uuid) TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- 2) 表
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.property_entry_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL,
  invite_code text NULL,
  source text NULL,
  event_type text NOT NULL,
  user_id uuid NULL,
  request_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS property_entry_events_property_id_created_at_idx
  ON public.property_entry_events (property_id, created_at DESC);

CREATE INDEX IF NOT EXISTS property_entry_events_event_type_idx
  ON public.property_entry_events (event_type, created_at DESC);

ALTER TABLE public.property_entry_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON public.property_entry_events TO authenticated;
GRANT INSERT ON public.property_entry_events TO anon;

-- ---------------------------------------------------------------------------
-- 3) Policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS "property_entry_events_insert_anon" ON public.property_entry_events;
DROP POLICY IF EXISTS "property_entry_events_insert_authenticated" ON public.property_entry_events;
DROP POLICY IF EXISTS "property_entry_events_select_self_or_demo" ON public.property_entry_events;
DROP POLICY IF EXISTS "property_entry_events_no_update_delete" ON public.property_entry_events;

-- anon：仅对 demo 物业、且限定 event_type，防止任意写真实 tenant
CREATE POLICY "property_entry_events_insert_anon"
  ON public.property_entry_events FOR INSERT TO anon
  WITH CHECK (
    public.is_public_demo_property(property_id)
    AND event_type IN (
      'opened', 'auth_ok', 'submitted', 'approved', 'auto_approved'
    )
  );

-- authenticated：仅 allow_public_join 的物业、或已是成员、或 demo；且 user_id 不伪造他人
CREATE POLICY "property_entry_events_insert_authenticated"
  ON public.property_entry_events FOR INSERT TO authenticated
  WITH CHECK (
    (user_id IS NULL OR user_id = (SELECT auth.uid()))
    AND (
      public.is_public_demo_property(property_id)
      OR property_id IN (SELECT public.user_property_ids())
      OR EXISTS (
        SELECT 1 FROM public.properties p
        WHERE p.id = property_entry_events.property_id
          AND p.allow_public_join_requests = true
      )
    )
  );

-- 读：本人事件行 或 该物业 active 成员 或 demo 物业全员只读
CREATE POLICY "property_entry_events_select_self_or_demo"
  ON public.property_entry_events FOR SELECT TO authenticated
  USING (
    (user_id IS NOT NULL AND user_id = (SELECT auth.uid()))
    OR property_id IN (SELECT public.user_property_ids())
    OR public.is_public_demo_property(property_id)
  );

-- 无 update/delete 客户端策略（若需服务角色在库外处理，保持默认无 policy = 拒）
-- anon 无 SELECT
NOTIFY pgrst, 'reload schema';
