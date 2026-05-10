import type { UserRole } from '@/lib/supabase';

/** `/meetings` 管理视图：业委会与物业管理员。物业经理仅能走业主参与页，不得管理会议流程。 */
export function canManagePropertyMeetings(role: UserRole | null): boolean {
  if (!role) return false;
  return role === 'council' || role === 'admin' || role === 'property_admin';
}

/** 侧栏「会议投票」默认跳转：管理人进会议列表；经理/业主等进业主表决页 */
export function meetingsNavHref(role: UserRole | null): '/meetings' | '/owner-voting' {
  return canManagePropertyMeetings(role) ? '/meetings' : '/owner-voting';
}
