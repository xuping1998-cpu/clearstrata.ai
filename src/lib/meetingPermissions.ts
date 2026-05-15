import type { UserRole } from '@/lib/supabase';

/** `/meetings` 管理视图：业委会与物业管理员。物业经理仅能走业主参与页，不得管理会议流程。 */
export function canManagePropertyMeetings(role: UserRole | null): boolean {
  if (!role) return false;
  return role === 'council' || role === 'admin' || role === 'property_admin';
}

/** 侧栏「会议投票」：管理人进会议管理；业主/经理等进投票列表（非联署专区）。 */
export function meetingsNavHref(role: UserRole | null): '/meetings' | '/voting' {
  return canManagePropertyMeetings(role) ? '/meetings' : '/voting';
}
