import type { UserRole } from './supabase';

/** Primary staff roles for invites + join-request review (matches DB `user_role`). */
const STAFF_INVITE_JOIN_ROLES: ReadonlySet<string> = new Set([
  'property_admin',
  'council',
  'manager',
  'admin', // optional legacy enum value
]);

function normalizeRoleKey(role: unknown): string {
  return String(role ?? '')
    .trim()
    .toLowerCase();
}

/**
 * Property-scoped staff for invite codes + join-request review (`property_members.role`).
 * Allows property_admin, council, manager; optional admin. Excludes owner / tenant / viewer.
 */
function staffForPropertyInvitesAndJoinReview(role: UserRole | null | undefined): boolean {
  const r = normalizeRoleKey(role);
  if (!r) return false;
  return STAFF_INVITE_JOIN_ROLES.has(r);
}

/** Active property role from `property_members` (not global `profiles.role`). */
export function canManageInvoiceWorkflow(role: UserRole | null | undefined): boolean {
  return role === 'council' || role === 'admin' || role === 'property_admin' || role === 'manager';
}

export function canDeleteInvoice(
  role: UserRole | null | undefined,
  profileId: string | undefined,
  uploadedBy: string,
): boolean {
  if (!profileId) return false;
  if (profileId === uploadedBy) return true;
  return canManageInvoiceWorkflow(role) || role === 'manager';
}

/** 审核加入申请（/admin/join-requests）：与 staffForPropertyInvitesAndJoinReview 一致 */
export function canReviewJoinRequests(role: UserRole | null | undefined): boolean {
  return staffForPropertyInvitesAndJoinReview(role);
}

/** 加入申请审核页：property_admin / council / manager / legacy admin */
const JOIN_REVIEW_STAFF_ONLY: ReadonlySet<string> = new Set(['property_admin', 'council', 'manager', 'admin']);

export function canReviewJoinRequestsAsStaff(role: UserRole | null | undefined): boolean {
  const r = normalizeRoleKey(role);
  if (!r) return false;
  return JOIN_REVIEW_STAFF_ONLY.has(r);
}

/** 物业后台入口：物业管理员或历史 admin 角色 */
export function canManagePropertyAdmin(role: UserRole | null | undefined): boolean {
  const r = normalizeRoleKey(role);
  return r === 'property_admin' || r === 'admin';
}

/** When `roleInProperty` is null (e.g. multi-property before picker), infer from any membership. */
export function canReviewJoinRequestsFromContext(
  roleInProperty: UserRole | null | undefined,
  memberships: { role: UserRole }[],
): boolean {
  if (roleInProperty != null) return canReviewJoinRequests(roleInProperty);
  return memberships.some((m) => canReviewJoinRequests(m.role));
}

/** Core nav “审核申请”: property_admin, council, manager only (reuses canReviewJoinRequests, excludes legacy admin). */
const JOIN_REVIEW_NAV_ROLES: ReadonlySet<string> = new Set(['property_admin', 'council', 'manager']);

export function canShowJoinRequestReviewNav(role: UserRole | null | undefined): boolean {
  if (!canReviewJoinRequests(role)) return false;
  const r = normalizeRoleKey(role);
  return JOIN_REVIEW_NAV_ROLES.has(r);
}

export function canShowJoinRequestReviewNavFromContext(
  roleInProperty: UserRole | null | undefined,
  memberships: { role: UserRole }[],
): boolean {
  if (roleInProperty != null) return canShowJoinRequestReviewNav(roleInProperty);
  return memberships.some((m) => canShowJoinRequestReviewNav(m.role));
}

export function canManagePropertyInvitesFromContext(
  roleInProperty: UserRole | null | undefined,
  memberships: { role: UserRole }[],
): boolean {
  if (roleInProperty != null) return canManagePropertyInvites(roleInProperty);
  return memberships.some((m) => canManagePropertyInvites(m.role));
}

export function canManagePropertyAdminFromContext(
  roleInProperty: UserRole | null | undefined,
  memberships: { role: UserRole }[],
): boolean {
  if (roleInProperty != null) return canManagePropertyAdmin(roleInProperty);
  return memberships.some((m) => canManagePropertyAdmin(m.role));
}

/** /admin/invites 邀请码：与 canReviewJoinRequests 同一组物业职员（非 owner） */
export function canManagePropertyInvites(role: UserRole | null | undefined): boolean {
  return staffForPropertyInvitesAndJoinReview(role);
}

export function isOwnerOrTenant(role: UserRole | null | undefined): boolean {
  return role === 'owner' || role === 'tenant';
}
