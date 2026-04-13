import type { SupabaseClient } from '@supabase/supabase-js';

/** 与 RPC / 库表一致：用于比对的去空格小写邮箱 */
export function normalizeJoinRequestEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

/**
 * 当前登录用户是否已在该物业有待审核申请（RLS 下仅能可靠读取本人 `user_id` 行）。
 * 用于提交前拦截重复点击 / 双请求；与库侧 partial unique 索引互补。
 */
export async function hasPendingJoinRequestForCurrentUser(
  client: SupabaseClient,
  propertyId: string,
  userId: string,
): Promise<boolean> {
  if (!propertyId?.trim() || !userId?.trim()) return false;
  const { data, error } = await client
    .from('join_requests')
    .select('id')
    .eq('property_id', propertyId)
    .eq('user_id', userId)
    .eq('status', 'pending')
    .limit(1);
  if (error) {
    console.warn('[joinRequestGuards] pending check failed', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

/**
 * 同物业 + 规范化邮箱是否已有 pending（与 `uniq_pending_request` 一致；提交前预检）。
 */
export async function hasPendingJoinRequestForPropertyEmail(
  client: SupabaseClient,
  propertyId: string,
  normalizedEmail: string,
): Promise<boolean> {
  const em = normalizeJoinRequestEmail(normalizedEmail);
  if (!propertyId?.trim() || !em) return false;
  const { data, error } = await client
    .from('join_requests')
    .select('id')
    .eq('property_id', propertyId)
    .eq('status', 'pending')
    .eq('email', em)
    .limit(1);
  if (error) {
    console.warn('[joinRequestGuards] pending-by-email check failed', error.message);
    return false;
  }
  return (data?.length ?? 0) > 0;
}

export type JoinRequestLike = { id: string; property_id: string; email: string | null; created_at: string };

/** 审核列表：同一物业 + 同一规范化邮箱只保留一条（优先最新 created_at）。 */
export function dedupePendingJoinRequestsByPropertyEmail<T extends JoinRequestLike>(list: T[]): T[] {
  const map = new Map<string, T>();
  for (const r of list) {
    const em = normalizeJoinRequestEmail(r.email);
    const key = em ? `${r.property_id}::${em}` : r.id;
    const prev = map.get(key);
    if (!prev || new Date(r.created_at).getTime() >= new Date(prev.created_at).getTime()) {
      map.set(key, r);
    }
  }
  return Array.from(map.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
