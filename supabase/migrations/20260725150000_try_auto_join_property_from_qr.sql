/*
  # try_auto_join_property_from_qr

  QR / 扫码进楼：在 `bind_resident_by_unit` 前校验「已登录 + profiles 存在 + role = owner」，
  其余绑定与白名单逻辑与 `bind_resident_by_unit` 一致（含 trigger 写入 property_members）。
*/

CREATE OR REPLACE FUNCTION public.try_auto_join_property_from_qr(
  p_property_id uuid,
  p_unit_no text,
  p_language_pref text DEFAULT 'en'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_role public.user_role;
  v_bind jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'not_authenticated',
      'message', 'Not signed in',
      'message_zh', '请先登录'
    );
  END IF;

  SELECT p.role INTO v_role FROM public.profiles p WHERE p.id = v_uid;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'profile_missing',
      'message', 'Profile not found',
      'message_zh', '未找到用户资料'
    );
  END IF;

  IF v_role IS DISTINCT FROM 'owner'::public.user_role THEN
    RETURN jsonb_build_object(
      'ok', false,
      'success', false,
      'error', 'non_owner_role',
      'message', 'Only owner accounts can auto-join from QR.',
      'message_zh', '仅业主账号支持扫码自动进楼，请提交人工审核。'
    );
  END IF;

  v_bind := public.bind_resident_by_unit(p_property_id, p_unit_no, NULL::date, p_language_pref);

  RETURN v_bind || jsonb_build_object(
    'success', coalesce((v_bind ->> 'ok')::boolean, false)
  );
END;
$fn$;

COMMENT ON FUNCTION public.try_auto_join_property_from_qr(uuid, text, text) IS
  'QR entry: owner-only; delegates to bind_resident_by_unit for roster bind + membership trigger.';

REVOKE ALL ON FUNCTION public.try_auto_join_property_from_qr(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.try_auto_join_property_from_qr(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.try_auto_join_property_from_qr(uuid, text, text) TO service_role;
