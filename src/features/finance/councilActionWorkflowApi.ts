import { supabase } from '../../lib/supabase';
import { createMeeting } from '../meetings/api';
import type { BudgetRiskAlert, BudgetRiskAlertType } from './budgetRiskAlertsApi';
import type { CouncilAction, CouncilActionType } from './councilActionsApi';
import { updateCouncilAction } from './councilActionsApi';

export type CouncilActionComment = {
  id: string;
  action_id: string;
  property_id: string;
  created_by: string;
  author_name: string | null;
  author_role: string | null;
  comment: string;
  created_at: string;
};

export type CouncilActionAttachment = {
  id: string;
  action_id: string;
  property_id: string;
  uploaded_by: string;
  uploader_name: string | null;
  file_name: string;
  storage_path: string;
  created_at: string;
};

export type CouncilActionEventType =
  | 'created'
  | 'assigned'
  | 'status_changed'
  | 'priority_changed'
  | 'due_date_changed'
  | 'completed'
  | 'comment_added'
  | 'attachment_added';

export type CouncilActionEvent = {
  id: string;
  action_id: string;
  property_id: string;
  actor_id: string | null;
  actor_name: string | null;
  event_type: CouncilActionEventType;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  created_at: string;
};

export type ActionRiskSummary = {
  budget_amount: number;
  actual_amount: number;
  remaining_amount: number;
  percent_value: number | null;
  risk_description: string;
  is_revenue: boolean;
};

const ALLOWED_ATTACHMENT_EXT = new Set(['pdf', 'docx', 'xlsx', 'jpg', 'jpeg', 'png']);

export function canInteractCouncilActionWorkflow(
  role: string | null | undefined,
  staffType: string | null | undefined,
): boolean {
  const r = String(role ?? '').toLowerCase();
  if (['manager', 'council', 'admin', 'property_admin'].includes(r)) return true;
  if (r === 'viewer') {
    const st = String(staffType ?? '').toLowerCase();
    return ['accountant', 'auditor', 'lawyer', 'finance'].includes(st);
  }
  return false;
}

export function canManageCouncilActionWorkflow(role: string | null | undefined): boolean {
  const r = String(role ?? '').toLowerCase();
  return r === 'council' || r === 'admin' || r === 'property_admin';
}

function isRevenueAlertType(alertType: string | null): boolean {
  return (
    alertType === 'REVENUE_COLLECTION_LOW' ||
    alertType === 'REVENUE_COLLECTION_CRITICAL' ||
    alertType === 'UNMAPPED_REVENUE'
  );
}

export function suggestedWorkflowActions(
  alertType: string | null,
  en: boolean,
): string[] {
  switch (alertType as BudgetRiskAlertType | null) {
    case 'REVENUE_COLLECTION_LOW':
    case 'REVENUE_COLLECTION_CRITICAL':
      return en
        ? [
            'Review strata fee collection',
            'Contact delinquent owners',
            'Verify payment records',
            'Open council discussion',
          ]
        : ['审查物业费收缴', '联系欠费业主', '核对收款记录', '发起业委会讨论'];
    case 'EXPENSE_NEAR_LIMIT':
    case 'EXPENSE_OVER_BUDGET':
      return en
        ? [
            'Obtain additional quotes',
            'Review vendor contract',
            'Increase budget',
            'Escalate to council',
          ]
        : ['获取补充报价', '审查供应商合同', '申请增加预算', '提交业委会审议'];
    case 'UNMAPPED_EXPENSE':
    case 'UNMAPPED_REVENUE':
      return en
        ? ['Open Mapping Center', 'Review invoice classification']
        : ['打开科目映射', '审查发票分类'];
    default:
      return en
        ? ['Review budget context', 'Assign responsible staff', 'Document council decision']
        : ['审查预算背景', '分配负责人员', '记录业委会决议'];
  }
}

export function eventTypeLabel(type: CouncilActionEventType, en: boolean): string {
  const labels: Record<CouncilActionEventType, { en: string; zh: string }> = {
    created: { en: 'Created', zh: '已创建' },
    assigned: { en: 'Assigned', zh: '已分配' },
    status_changed: { en: 'Status Changed', zh: '状态变更' },
    priority_changed: { en: 'Priority Changed', zh: '优先级变更' },
    due_date_changed: { en: 'Due Date Changed', zh: '截止日期变更' },
    completed: { en: 'Completed', zh: '已完成' },
    comment_added: { en: 'Comment Added', zh: '新增评论' },
    attachment_added: { en: 'Attachment Added', zh: '新增附件' },
  };
  return en ? labels[type].en : labels[type].zh;
}

async function loadProfileMap(userIds: string[]) {
  const map = new Map<string, { full_name_en?: string | null; full_name_zh?: string | null }>();
  if (!userIds.length) return map;
  const { data } = await supabase
    .from('profiles')
    .select('id, full_name_en, full_name_zh')
    .in('id', userIds);
  for (const p of data ?? []) {
    map.set(String(p.id), p);
  }
  return map;
}

async function loadMemberRoleMap(propertyId: string, userIds: string[]) {
  const map = new Map<string, string>();
  if (!userIds.length) return map;
  const { data } = await supabase
    .from('property_members')
    .select('user_id, role, staff_type')
    .eq('property_id', propertyId)
    .in('user_id', userIds)
    .eq('status', 'active');
  for (const m of data ?? []) {
    const role = String(m.role);
    const staff = m.staff_type ? String(m.staff_type) : '';
    map.set(String(m.user_id), staff ? `${role} (${staff})` : role);
  }
  return map;
}

function displayName(
  profile: { full_name_en?: string | null; full_name_zh?: string | null } | undefined,
  en: boolean,
): string | null {
  if (!profile) return null;
  return en
    ? profile.full_name_en || profile.full_name_zh || null
    : profile.full_name_zh || profile.full_name_en || null;
}

export async function fetchRiskSummaryForAction(
  propertyId: string,
  fiscalYear: number,
  action: CouncilAction,
): Promise<ActionRiskSummary | null> {
  if (!action.alert_type) return null;

  let query = supabase
    .from('budget_risk_alerts')
    .select(
      'budget_amount, actual_amount, variance_amount, percent_value, message, alert_type',
    )
    .eq('property_id', propertyId)
    .eq('fiscal_year', fiscalYear)
    .eq('alert_type', action.alert_type);

  if (action.alert_category) {
    query = query.eq('budget_category', action.alert_category);
  }

  const { data, error } = await query.maybeSingle();
  if (error || !data) return null;

  const isRevenue = isRevenueAlertType(action.alert_type);
  const budget = Number(data.budget_amount);
  const actual = Number(data.actual_amount);
  const variance = Number(data.variance_amount);

  return {
    budget_amount: budget,
    actual_amount: actual,
    remaining_amount: isRevenue ? Math.max(0, variance) : budget - actual,
    percent_value: data.percent_value == null ? null : Number(data.percent_value),
    risk_description: String(data.message),
    is_revenue: isRevenue,
  };
}

export async function listActionComments(actionId: string): Promise<CouncilActionComment[]> {
  const { data, error } = await supabase
    .from('council_action_comments')
    .select('id, action_id, property_id, created_by, comment, created_at')
    .eq('action_id', actionId)
    .order('created_at', { ascending: true });

  if (error || !data?.length) return [];

  const userIds = [...new Set(data.map((r) => String(r.created_by)))];
  const propertyId = String(data[0].property_id);
  const [profiles, roles] = await Promise.all([
    loadProfileMap(userIds),
    loadMemberRoleMap(propertyId, userIds),
  ]);

  return data.map((r) => ({
    id: String(r.id),
    action_id: String(r.action_id),
    property_id: propertyId,
    created_by: String(r.created_by),
    author_name: displayName(profiles.get(String(r.created_by)), true),
    author_role: roles.get(String(r.created_by)) ?? null,
    comment: String(r.comment),
    created_at: String(r.created_at),
  }));
}

export async function createActionComment(
  action: CouncilAction,
  comment: string,
): Promise<{ ok: boolean; error: string | null }> {
  const trimmed = comment.trim();
  if (!trimmed) return { ok: false, error: 'Comment is empty' };

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { ok: false, error: 'Not authenticated' };

  const { error } = await supabase.from('council_action_comments').insert({
    action_id: action.id,
    property_id: action.property_id,
    created_by: userId,
    comment: trimmed,
  });

  return { ok: !error, error: error?.message ?? null };
}

export async function listActionAttachments(actionId: string): Promise<CouncilActionAttachment[]> {
  const { data, error } = await supabase
    .from('council_action_attachments')
    .select('id, action_id, property_id, uploaded_by, file_name, storage_path, created_at')
    .eq('action_id', actionId)
    .order('created_at', { ascending: true });

  if (error || !data?.length) return [];

  const userIds = [...new Set(data.map((r) => String(r.uploaded_by)))];
  const profiles = await loadProfileMap(userIds);

  return data.map((r) => ({
    id: String(r.id),
    action_id: String(r.action_id),
    property_id: String(r.property_id),
    uploaded_by: String(r.uploaded_by),
    uploader_name: displayName(profiles.get(String(r.uploaded_by)), true),
    file_name: String(r.file_name),
    storage_path: String(r.storage_path),
    created_at: String(r.created_at),
  }));
}

export async function uploadActionAttachment(
  action: CouncilAction,
  file: File,
): Promise<{ ok: boolean; error: string | null }> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_ATTACHMENT_EXT.has(ext)) {
    return { ok: false, error: 'File type not allowed' };
  }

  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { ok: false, error: 'Not authenticated' };

  const safeName = file.name.replace(/[^\w.\-() ]+/g, '_');
  const storagePath = `council-actions/${action.id}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, { upsert: false });

  if (uploadError) return { ok: false, error: uploadError.message };

  const { error: insertError } = await supabase.from('council_action_attachments').insert({
    action_id: action.id,
    property_id: action.property_id,
    uploaded_by: userId,
    file_name: file.name,
    storage_path: storagePath,
  });

  if (insertError) {
    await supabase.storage.from('documents').remove([storagePath]);
    return { ok: false, error: insertError.message };
  }

  return { ok: true, error: null };
}

export async function getActionAttachmentSignedUrl(
  storagePath: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function listActionEvents(actionId: string): Promise<CouncilActionEvent[]> {
  const { data, error } = await supabase
    .from('council_action_events')
    .select('id, action_id, property_id, actor_id, event_type, old_value, new_value, created_at')
    .eq('action_id', actionId)
    .order('created_at', { ascending: false });

  if (error || !data?.length) return [];

  const actorIds = [
    ...new Set(data.map((r) => r.actor_id).filter((id): id is string => id != null)),
  ];
  const profiles = await loadProfileMap(actorIds);

  return data.map((r) => ({
    id: String(r.id),
    action_id: String(r.action_id),
    property_id: String(r.property_id),
    actor_id: r.actor_id != null ? String(r.actor_id) : null,
    actor_name: r.actor_id ? displayName(profiles.get(String(r.actor_id)), true) : null,
    event_type: r.event_type as CouncilActionEventType,
    old_value: (r.old_value as Record<string, unknown> | null) ?? null,
    new_value: (r.new_value as Record<string, unknown> | null) ?? null,
    created_at: String(r.created_at),
  }));
}

export async function assignCouncilAction(
  actionId: string,
  assignedTo: string | null,
): Promise<{ ok: boolean; error: string | null }> {
  const patch: { assigned_to: string | null; status?: 'in_progress' } = {
    assigned_to: assignedTo,
  };
  if (assignedTo) patch.status = 'in_progress';
  return updateCouncilAction(actionId, patch);
}

export async function markCouncilActionComplete(
  actionId: string,
): Promise<{ ok: boolean; error: string | null }> {
  return updateCouncilAction(actionId, { status: 'completed' });
}

export async function createCouncilDiscussionFromAction(
  action: CouncilAction,
  fiscalYear: number,
  en: boolean,
): Promise<{ meetingId: string | null; error: string | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) return { meetingId: null, error: 'Not authenticated' };

  const category = action.alert_category ?? (en ? 'General' : '综合');
  const title = en ? `Budget Risk: ${category}` : `预算风险：${category}`;
  const description = action.description ?? '';

  const { id, error } = await createMeeting({
    propertyId: action.property_id,
    fiscalYear,
    meetingType: 'council',
    titleEn: en ? title : null,
    titleZh: en ? null : title,
    descriptionEn: en ? description : null,
    descriptionZh: en ? null : description,
    meetingFormat: 'written',
    status: 'draft',
    createdBy: userId,
  });

  return { meetingId: id ?? null, error: error?.message ?? null };
}

export function procurementNewJobHref(budgetCategory: string | null): string {
  const base = '/procurement/new';
  if (!budgetCategory) return base;
  return `${base}?budget_category=${encodeURIComponent(budgetCategory)}`;
}

export function mappingHref(): string {
  return '/finance?tab=budget#mapping';
}

export type WorkflowStaffOption = {
  user_id: string;
  role: string;
  staff_type: string | null;
  source: 'member' | 'invite';
  full_name_en: string | null;
  full_name_zh: string | null;
  email: string | null;
};

export async function listWorkflowStaffOptions(propertyId: string): Promise<WorkflowStaffOption[]> {
  const { data: members } = await supabase
    .from('property_members')
    .select('user_id, role, staff_type')
    .eq('property_id', propertyId)
    .eq('status', 'active');

  const eligible = (members ?? []).filter((m) => {
    const r = String(m.role).toLowerCase();
    if (['manager', 'council', 'property_admin', 'admin'].includes(r)) return true;
    if (r === 'viewer') {
      const st = String(m.staff_type ?? '').toLowerCase();
      return ['accountant', 'auditor', 'lawyer', 'finance'].includes(st);
    }
    return false;
  });

  const { data: invites } = await supabase
    .from('staff_invites')
    .select('email, full_name, staff_type, accepted_by, status')
    .eq('property_id', propertyId)
    .eq('status', 'accepted');

  const memberIds = eligible.map((m) => String(m.user_id));
  const inviteUserIds = (invites ?? [])
    .map((i) => i.accepted_by)
    .filter((id): id is string => id != null)
    .map(String);

  const allIds = [...new Set([...memberIds, ...inviteUserIds])];
  const { data: profiles } = allIds.length
    ? await supabase.from('profiles').select('id, full_name_en, full_name_zh, email').in('id', allIds)
    : { data: [] };

  const profileMap = new Map((profiles ?? []).map((p) => [String(p.id), p]));
  const seen = new Set<string>();
  const out: WorkflowStaffOption[] = [];

  for (const m of eligible) {
    const uid = String(m.user_id);
    if (seen.has(uid)) continue;
    seen.add(uid);
    const p = profileMap.get(uid);
    out.push({
      user_id: uid,
      role: String(m.role),
      staff_type: m.staff_type != null ? String(m.staff_type) : null,
      source: 'member',
      full_name_en: p?.full_name_en != null ? String(p.full_name_en) : null,
      full_name_zh: p?.full_name_zh != null ? String(p.full_name_zh) : null,
      email: p?.email != null ? String(p.email) : null,
    });
  }

  for (const inv of invites ?? []) {
    const uid = inv.accepted_by ? String(inv.accepted_by) : null;
    if (!uid || seen.has(uid)) continue;
    seen.add(uid);
    const p = profileMap.get(uid);
    out.push({
      user_id: uid,
      role: 'viewer',
      staff_type: inv.staff_type != null ? String(inv.staff_type) : null,
      source: 'invite',
      full_name_en: p?.full_name_en ?? (inv.full_name ? String(inv.full_name) : null),
      full_name_zh: p?.full_name_zh ?? null,
      email: p?.email != null ? String(p.email) : (inv.email ? String(inv.email) : null),
    });
  }

  return out.sort((a, b) => {
    const an = a.full_name_en || a.full_name_zh || a.email || '';
    const bn = b.full_name_en || b.full_name_zh || b.email || '';
    return an.localeCompare(bn);
  });
}

export function workflowStaffLabel(staff: WorkflowStaffOption, en: boolean): string {
  const name = en
    ? staff.full_name_en || staff.full_name_zh || staff.email
    : staff.full_name_zh || staff.full_name_en || staff.email;
  const role = staff.staff_type ?? staff.role;
  return name ? `${name} (${role})` : role;
}

export function actionTypeToProcurementCategory(actionType: CouncilActionType): string | null {
  if (actionType === 'procurement_required' || actionType === 'budget_review') {
    return null;
  }
  return null;
}
