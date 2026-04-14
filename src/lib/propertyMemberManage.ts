import { supabase } from './supabase';

/** `public.member_status` — extended for council member management. */
export type PropertyMemberRowStatus =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'inactive'
  | 'removed';

/** `property_members.role` values allowed in the management UI / RLS WITH CHECK. */
export type PropertyMemberDirectoryRole = 'owner' | 'council' | 'manager';

export function formatPropertyMemberGuardError(message: string | undefined, en: boolean): string {
  if (!message) return en ? 'Update failed.' : '操作失败。';
  if (message.includes('property_members_guard:self')) {
    return en ? 'You cannot modify your own membership row.' : '不能对本人执行该操作。';
  }
  if (message.includes('property_members_guard:last_council')) {
    return en
      ? 'At least one active council member is required for this property.'
      : '本物业必须至少保留一名在任业委会（council + active）成员。';
  }
  return message;
}

/** How many active council members are in the list (client mirror of DB rules). */
export function countActiveCouncils(
  rows: ReadonlyArray<{ role: string; status: string }>,
): number {
  return rows.filter((r) => r.role === 'council' && r.status === 'active').length;
}

export function isLastActiveCouncilRow(
  row: Readonly<{ userId: string; role: string; status: string }>,
  allRows: ReadonlyArray<{ userId: string; role: string; status: string }>,
): boolean {
  return row.role === 'council' && row.status === 'active' && countActiveCouncils(allRows) === 1;
}

export function rowActionsDisabled(
  row: Readonly<{ userId: string; role: string; status: string }>,
  currentUserId: string | undefined,
  allRows: ReadonlyArray<{ userId: string; role: string; status: string }>,
): { disabled: boolean; reason?: 'self' | 'last_council' | 'terminal' } {
  if (row.status === 'removed') return { disabled: true, reason: 'terminal' };
  if (currentUserId && row.userId === currentUserId) return { disabled: true, reason: 'self' };
  if (isLastActiveCouncilRow(row, allRows)) return { disabled: true, reason: 'last_council' };
  return { disabled: false };
}

export async function setMemberRole(
  memberId: string,
  role: PropertyMemberDirectoryRole,
  previousStatus: string,
) {
  void previousStatus;
  return supabase.rpc('update_member_role', { p_member_id: memberId, p_role: role });
}

export async function setMemberCouncil(memberId: string) {
  return supabase.rpc('update_member_role', { p_member_id: memberId, p_role: 'council' });
}

export async function freezeMember(memberId: string) {
  return supabase.rpc('freeze_member', { p_member_id: memberId });
}

/** Soft-remove (`removed`); DB trigger clears `residents.user_id` for this property + user. */
export async function kickMember(memberId: string) {
  return supabase.rpc('remove_member', { p_member_id: memberId });
}
