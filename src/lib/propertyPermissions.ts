import type { UserRole } from './supabase';

/**
 * 加入申请「通过」：仅业委会（与 `approve_join_request` RPC 的 council gate 一致）。
 */
export function canApproveJoinRequest(role: UserRole | null | undefined): boolean {
  return normalizeRoleKey(role) === 'council';
}

/** 业委会视角下与「加入申请通过」一致的核心角色（不含 property_admin / manager）。 */
export function canManageUsersCouncilOrAdmin(role: UserRole | null | undefined): boolean {
  return canApproveJoinRequest(role);
}

export function canApproveJoinRequestFromContext(
  roleInProperty: UserRole | null | undefined,
  memberships: { role: UserRole }[],
): boolean {
  if (roleInProperty != null) return canApproveJoinRequest(roleInProperty);
  return memberships.some((m) => canApproveJoinRequest(m.role));
}

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

/**
 * Invoice approve / reject / mark paid (`pending_review` → `approved` / `rejected`, `paid`).
 * Property managers upload only — excluded here (matches product rule; backend RLS may still allow updates).
 */
export function canManageInvoiceWorkflow(role: UserRole | null | undefined): boolean {
  const r = normalizeRoleKey(role);
  return r === 'council' || r === 'admin' || r === 'property_admin';
}

export function canDeleteInvoice(
  role: UserRole | null | undefined,
  profileId: string | undefined,
  uploadedBy: string,
): boolean {
  if (!profileId) return false;
  const r = normalizeRoleKey(role);
  /** Owner (and similar) have read-only finance; never delete from this UI. */
  if (r === 'owner' || r === 'tenant' || r === 'viewer') return false;
  if (r === 'manager') return false;
  if (profileId === uploadedBy) return true;
  return canManageInvoiceWorkflow(role);
}

/** `/finance` invoice review: view invoices, budget tab, revenue (owner + staff). */
export function canViewInvoiceReview(role: UserRole | null | undefined): boolean {
  const r = normalizeRoleKey(role);
  return r === 'owner' || r === 'council' || r === 'admin' || r === 'property_admin' || r === 'manager';
}

/** PDF package + single-file supplement uploads (not owners). */
export function canUploadInvoicePackage(role: UserRole | null | undefined): boolean {
  const r = normalizeRoleKey(role);
  return r === 'manager' || r === 'council' || r === 'admin' || r === 'property_admin';
}

/** Same gate as approve/reject/governance save — council, admin, property_admin (not manager). */
export function canManageInvoiceReview(role: UserRole | null | undefined): boolean {
  return canManageInvoiceWorkflow(role);
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

/** 物业设置（名称/公开申请等）：物业管理员或历史 admin 角色 */
export function canManagePropertyAdmin(role: UserRole | null | undefined): boolean {
  const r = normalizeRoleKey(role);
  return r === 'property_admin' || r === 'admin';
}

/** 邀请物业经理（邮件）：业委会、物业管理员、物业维度 admin — 不包含 owner/manager */
export function canInvitePropertyManager(role: UserRole | null | undefined): boolean {
  const r = normalizeRoleKey(role);
  return r === 'council' || r === 'admin' || r === 'property_admin';
}

/** 房号白名单：仅物业内 admin / council（与 `unit_whitelist` RLS 一致） */
export function canManageUnitWhitelist(role: UserRole | null | undefined): boolean {
  const r = normalizeRoleKey(role);
  return r === 'admin' || r === 'council';
}

/** When `roleInProperty` is null (e.g. multi-property before picker), infer from any membership. */
export function canReviewJoinRequestsFromContext(
  roleInProperty: UserRole | null | undefined,
  memberships: { role: UserRole }[],
): boolean {
  if (roleInProperty != null) return canReviewJoinRequests(roleInProperty);
  return memberships.some((m) => canReviewJoinRequests(m.role));
}

/**
 * Core nav “审核申请”: `property_members.role` only — admin, council, property_admin, manager.
 * (Admin on the property must see the same entry as council.)
 */
const JOIN_REVIEW_NAV_ROLES: ReadonlySet<string> = new Set([
  'admin',
  'council',
  'property_admin',
  'manager',
]);

export function canShowJoinRequestReviewNav(role: UserRole | null | undefined): boolean {
  if (!canReviewJoinRequests(role)) return false;
  const r = normalizeRoleKey(role);
  return JOIN_REVIEW_NAV_ROLES.has(r);
}

/**
 * 系统管理「人员管理」：可审核、改角色、成员管理（非 owner）。
 * Based solely on `property_members.role`.
 */
export function canManageUsersOnProperty(role: UserRole | null | undefined): boolean {
  const r = normalizeRoleKey(role);
  return (
    r === 'admin' ||
    r === 'council' ||
    r === 'property_admin' ||
    r === 'manager'
  );
}

/**
 * 成员角色编辑：仅 admin、council、物业管理员（不含 manager，与 Edge 限制一致）。
 */
export function canEditPropertyMemberRoles(role: UserRole | null | undefined): boolean {
  const r = normalizeRoleKey(role);
  return r === 'admin' || r === 'council' || r === 'property_admin';
}

/** 成员管理（property_members）：仅业委会可改角色 / 冻结 / 踢出（与 RLS `property_members_council_update` 一致）。 */
export function canCouncilManagePropertyMembers(role: UserRole | null | undefined): boolean {
  return normalizeRoleKey(role) === 'council';
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

/** 人员管理页：成员 / 加入申请 / 邀请码（与「业主信息」后台能力一致，不含纯 owner）。 */
export function canAccessPropertyPeoplePage(role: UserRole | null | undefined): boolean {
  return canManageUsersOnProperty(role);
}

/**
 * 物业设置页：基础信息、加入规则、白名单等（物业管理员 / 业委会 / 系统管理员侧；业委会需可见加入规则等）。
 */
export function canAccessPropertySettingsPage(role: UserRole | null | undefined): boolean {
  return (
    canManagePropertyAdmin(role) ||
    canManageUnitWhitelist(role) ||
    canApproveJoinRequest(role)
  );
}

export function canAccessPropertyPeoplePageFromContext(
  roleInProperty: UserRole | null | undefined,
  memberships: { role: UserRole }[],
): boolean {
  if (roleInProperty != null) return canAccessPropertyPeoplePage(roleInProperty);
  return memberships.some((m) => canAccessPropertyPeoplePage(m.role));
}

export function canAccessPropertySettingsPageFromContext(
  roleInProperty: UserRole | null | undefined,
  memberships: { role: UserRole }[],
): boolean {
  if (roleInProperty != null) return canAccessPropertySettingsPage(roleInProperty);
  return memberships.some((m) => canAccessPropertySettingsPage(m.role));
}

/** 左侧「系统管理」是否展示（任一子入口可用）。 */
export function canShowSystemManagementSection(
  roleInProperty: UserRole | null | undefined,
  memberships: { role: UserRole }[],
): boolean {
  return (
    canAccessPropertyPeoplePageFromContext(roleInProperty, memberships) ||
    canAccessPropertySettingsPageFromContext(roleInProperty, memberships)
  );
}
