import { supabase } from './supabase';

/**
 * 登录后根据 property_members（active）与最近一条 join_requests 解析用户去向。
 * 表名与字段与项目现有迁移一致：property_members.user_id / property_id / status；join_requests.user_id / status / …
 */
export type ResolveUserPropertyAccessResult =
  | { type: 'single_property'; propertyId: string }
  | { type: 'multi_property'; firstPropertyId: string }
  | { type: 'pending'; propertyId: string }
  | { type: 'rejected'; propertyId: string | null; reason: string | null }
  | { type: 'none' };

export async function resolveUserPropertyAccess(userId: string): Promise<ResolveUserPropertyAccessResult> {
  const { data: mems, error: memErr } = await supabase
    .from('property_members')
    .select('property_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  if (memErr) {
    console.error('resolveUserPropertyAccess property_members', memErr);
  }

  const rows = mems ?? [];
  if (rows.length === 1) {
    return { type: 'single_property', propertyId: rows[0].property_id as string };
  }
  if (rows.length > 1) {
    return { type: 'multi_property', firstPropertyId: rows[0].property_id as string };
  }

  const { data: reqs, error: jrErr } = await supabase
    .from('join_requests')
    .select('property_id, status, rejection_reason')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1);

  if (jrErr) {
    console.error('resolveUserPropertyAccess join_requests', jrErr);
    return { type: 'none' };
  }

  const request = reqs?.[0];
  if (!request) return { type: 'none' };

  const st = String(request.status ?? '').toLowerCase();
  if (st === 'pending') {
    return { type: 'pending', propertyId: request.property_id as string };
  }
  if (st === 'rejected') {
    return {
      type: 'rejected',
      propertyId: (request.property_id as string) ?? null,
      reason: (request.rejection_reason as string | null) ?? null,
    };
  }

  return { type: 'none' };
}
