import { supabase } from '../../lib/supabase';
import {
  alertTypeLabel,
  type BudgetRiskAlert,
  type BudgetRiskAlertSeverity,
} from './budgetRiskAlertsApi';

export type CouncilActionStatus = 'open' | 'in_progress' | 'completed' | 'dismissed';

export type CouncilActionPriority = 'low' | 'medium' | 'high' | 'critical';

export type CouncilActionType =
  | 'budget_review'
  | 'vendor_review'
  | 'procurement_required'
  | 'mapping_required'
  | 'revenue_collection'
  | 'insurance_review'
  | 'council_discussion'
  | 'special_assessment';

export type CouncilAction = {
  id: string;
  property_id: string;
  alert_type: string | null;
  alert_category: string | null;
  title: string;
  description: string | null;
  action_type: CouncilActionType;
  status: CouncilActionStatus;
  priority: CouncilActionPriority;
  assigned_to: string | null;
  assignee_name: string | null;
  due_date: string | null;
  assigned_at: string | null;
  created_by: string | null;
  created_at: string;
  completed_at: string | null;
  completed_by: string | null;
};

export type CouncilActionsSummary = {
  openCount: number;
  inProgressCount: number;
  completedCount: number;
  overdueCount: number;
  completionRate: number | null;
};

export type PropertyStaffOption = {
  user_id: string;
  role: string;
  full_name_en: string | null;
  full_name_zh: string | null;
};

function mapActionRow(
  r: Record<string, unknown>,
  assignee?: { full_name_en?: string | null; full_name_zh?: string | null } | null,
): CouncilAction {
  const enName = assignee?.full_name_en != null ? String(assignee.full_name_en) : null;
  const zhName = assignee?.full_name_zh != null ? String(assignee.full_name_zh) : null;
  return {
    id: String(r.id),
    property_id: String(r.property_id),
    alert_type: r.alert_type != null ? String(r.alert_type) : null,
    alert_category: r.alert_category != null ? String(r.alert_category) : null,
    title: String(r.title),
    description: r.description != null ? String(r.description) : null,
    action_type: r.action_type as CouncilActionType,
    status: (r.status as CouncilActionStatus) ?? 'open',
    priority: (r.priority as CouncilActionPriority) ?? 'medium',
    assigned_to: r.assigned_to != null ? String(r.assigned_to) : null,
    assignee_name: enName || zhName,
    due_date: r.due_date != null ? String(r.due_date).slice(0, 10) : null,
    assigned_at: r.assigned_at != null ? String(r.assigned_at) : null,
    created_by: r.created_by != null ? String(r.created_by) : null,
    created_at: String(r.created_at),
    completed_at: r.completed_at != null ? String(r.completed_at) : null,
    completed_by: r.completed_by != null ? String(r.completed_by) : null,
  };
}

export function actionTypeFromAlert(alertType: BudgetRiskAlert['alert_type']): CouncilActionType {
  switch (alertType) {
    case 'EXPENSE_OVER_BUDGET':
      return 'budget_review';
    case 'EXPENSE_NEAR_LIMIT':
      return 'council_discussion';
    case 'REVENUE_COLLECTION_LOW':
    case 'REVENUE_COLLECTION_CRITICAL':
      return 'revenue_collection';
    case 'UNMAPPED_EXPENSE':
    case 'UNMAPPED_REVENUE':
      return 'mapping_required';
    case 'NO_ACTIVITY':
      return 'council_discussion';
    default:
      return 'budget_review';
  }
}

export function priorityFromAlertSeverity(severity: BudgetRiskAlertSeverity): CouncilActionPriority {
  if (severity === 'critical') return 'critical';
  if (severity === 'warning') return 'high';
  return 'low';
}

export function suggestedDueDate(priority: CouncilActionPriority): string {
  const days = priority === 'critical' ? 7 : priority === 'high' ? 14 : 30;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function buildActionFromAlert(alert: BudgetRiskAlert, en: boolean): {
  title: string;
  description: string;
  action_type: CouncilActionType;
  priority: CouncilActionPriority;
  due_date: string;
} {
  const category = alert.budget_category ?? (en ? 'General' : '综合');
  const typeLabel = alertTypeLabel(alert.alert_type, en);
  const action_type = actionTypeFromAlert(alert.alert_type);
  const priority = priorityFromAlertSeverity(alert.severity);
  const pct =
    alert.percent_value == null ? '' : ` (${alert.percent_value.toFixed(1)}%)`;

  return {
    title: en ? `${typeLabel}: ${category}` : `${typeLabel}：${category}`,
    description: en
      ? `${alert.message}${pct}. Budget ${alert.budget_amount.toFixed(2)}, actual ${alert.actual_amount.toFixed(2)}.`
      : `${alert.message}${pct}。预算 ${alert.budget_amount.toFixed(2)}，实际 ${alert.actual_amount.toFixed(2)}。`,
    action_type,
    priority,
    due_date: suggestedDueDate(priority),
  };
}

export function openActionKey(alertType: string, alertCategory: string | null): string {
  return `${alertType}:${alertCategory ?? '_'}`;
}

export async function listCouncilActions(propertyId: string): Promise<CouncilAction[]> {
  const { data, error } = await supabase
    .from('council_actions')
    .select(
      'id, property_id, alert_type, alert_category, title, description, action_type, status, priority, assigned_to, due_date, assigned_at, created_by, created_at, completed_at, completed_by',
    )
    .eq('property_id', propertyId)
    .order('created_at', { ascending: false });

  if (error || !data?.length) return [];

  const assigneeIds = [
    ...new Set(data.map((r) => r.assigned_to).filter((id): id is string => id != null)),
  ];
  const profileMap = new Map<string, { full_name_en?: string | null; full_name_zh?: string | null }>();
  if (assigneeIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name_en, full_name_zh')
      .in('id', assigneeIds);
    for (const p of profiles ?? []) {
      profileMap.set(String(p.id), p);
    }
  }

  return data.map((r) =>
    mapActionRow(
      r as Record<string, unknown>,
      r.assigned_to ? profileMap.get(String(r.assigned_to)) : null,
    ),
  );
}

export function summarizeCouncilActions(rows: CouncilAction[]): CouncilActionsSummary {
  const today = new Date().toISOString().slice(0, 10);
  const active = rows.filter((r) => r.status === 'open' || r.status === 'in_progress');
  const completedCount = rows.filter((r) => r.status === 'completed').length;
  return {
    openCount: rows.filter((r) => r.status === 'open').length,
    inProgressCount: rows.filter((r) => r.status === 'in_progress').length,
    completedCount,
    overdueCount: active.filter((r) => r.due_date != null && r.due_date < today).length,
    completionRate: rows.length === 0 ? null : (completedCount / rows.length) * 100,
  };
}

export async function summarizeCouncilActionsForProperty(
  propertyId: string,
): Promise<CouncilActionsSummary> {
  const rows = await listCouncilActions(propertyId);
  return summarizeCouncilActions(rows);
}

export async function listOpenActionKeys(propertyId: string): Promise<Set<string>> {
  const { data, error } = await supabase
    .from('council_actions')
    .select('alert_type, alert_category')
    .eq('property_id', propertyId)
    .in('status', ['open', 'in_progress']);

  if (error || !data) return new Set();
  return new Set(
    data.map((r) => openActionKey(String(r.alert_type ?? ''), r.alert_category as string | null)),
  );
}

export async function findOpenCouncilActionForAlert(
  propertyId: string,
  alert: BudgetRiskAlert,
): Promise<CouncilAction | null> {
  const { data, error } = await supabase
    .from('council_actions')
    .select(
      'id, property_id, alert_type, alert_category, title, description, action_type, status, priority, assigned_to, due_date, assigned_at, created_by, created_at, completed_at, completed_by',
    )
    .eq('property_id', propertyId)
    .eq('alert_type', alert.alert_type)
    .in('status', ['open', 'in_progress']);

  if (error || !data?.length) return null;

  const match = data.find(
    (r) =>
      (r.alert_category == null && alert.budget_category == null) ||
      String(r.alert_category ?? '') === String(alert.budget_category ?? ''),
  );
  return match ? mapActionRow(match as Record<string, unknown>) : null;
}

export async function createCouncilActionFromAlert(
  alert: BudgetRiskAlert,
  en: boolean,
): Promise<{ action: CouncilAction | null; error: string | null; existing: boolean }> {
  const existing = await findOpenCouncilActionForAlert(alert.property_id, alert);
  if (existing) {
    return { action: existing, error: null, existing: true };
  }

  const draft = buildActionFromAlert(alert, en);
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const { data, error } = await supabase
    .from('council_actions')
    .insert({
      property_id: alert.property_id,
      alert_type: alert.alert_type,
      alert_category: alert.budget_category,
      title: draft.title,
      description: draft.description,
      action_type: draft.action_type,
      status: 'open',
      priority: draft.priority,
      due_date: draft.due_date,
      created_by: userId,
    })
    .select(
      'id, property_id, alert_type, alert_category, title, description, action_type, status, priority, assigned_to, due_date, assigned_at, created_by, created_at, completed_at, completed_by',
    )
    .single();

  if (error || !data) {
    return { action: null, error: error?.message ?? 'Insert failed', existing: false };
  }
  return { action: mapActionRow(data as Record<string, unknown>), error: null, existing: false };
}

export async function updateCouncilAction(
  id: string,
  patch: Partial<
    Pick<CouncilAction, 'status' | 'priority' | 'assigned_to' | 'due_date' | 'title' | 'description'>
  >,
): Promise<{ ok: boolean; error: string | null }> {
  const { error } = await supabase.from('council_actions').update(patch).eq('id', id);
  return { ok: !error, error: error?.message ?? null };
}

export async function listPropertyStaffForAssignment(
  propertyId: string,
): Promise<PropertyStaffOption[]> {
  const { data: members, error } = await supabase
    .from('property_members')
    .select('user_id, role')
    .eq('property_id', propertyId)
    .eq('status', 'active')
    .in('role', ['manager', 'council', 'property_admin', 'admin']);

  if (error || !members?.length) return [];

  const userIds = members.map((m) => String(m.user_id));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name_en, full_name_zh')
    .in('id', userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [String(p.id), p]));

  return members.map((m) => {
    const p = profileMap.get(String(m.user_id));
    return {
      user_id: String(m.user_id),
      role: String(m.role),
      full_name_en: p?.full_name_en != null ? String(p.full_name_en) : null,
      full_name_zh: p?.full_name_zh != null ? String(p.full_name_zh) : null,
    };
  });
}

export function actionTypeLabel(type: CouncilActionType, en: boolean): string {
  const labels: Record<CouncilActionType, { en: string; zh: string }> = {
    budget_review: { en: 'Budget Review', zh: '预算审查' },
    vendor_review: { en: 'Vendor Review', zh: '供应商审查' },
    procurement_required: { en: 'Procurement Required', zh: '需采购授权' },
    mapping_required: { en: 'Mapping Required', zh: '需科目映射' },
    revenue_collection: { en: 'Revenue Collection', zh: '收入收缴' },
    insurance_review: { en: 'Insurance Review', zh: '保险审查' },
    council_discussion: { en: 'Council Discussion', zh: '业委会讨论' },
    special_assessment: { en: 'Special Assessment', zh: '特别评估' },
  };
  return en ? labels[type].en : labels[type].zh;
}

export function statusLabel(status: CouncilActionStatus, en: boolean): string {
  const labels: Record<CouncilActionStatus, { en: string; zh: string }> = {
    open: { en: 'Open', zh: '待处理' },
    in_progress: { en: 'In Progress', zh: '进行中' },
    completed: { en: 'Completed', zh: '已完成' },
    dismissed: { en: 'Dismissed', zh: '已忽略' },
  };
  return en ? labels[status].en : labels[status].zh;
}

export function priorityLabel(priority: CouncilActionPriority, en: boolean): string {
  const labels: Record<CouncilActionPriority, { en: string; zh: string }> = {
    low: { en: 'Low', zh: '低' },
    medium: { en: 'Medium', zh: '中' },
    high: { en: 'High', zh: '高' },
    critical: { en: 'Critical', zh: '严重' },
  };
  return en ? labels[priority].en : labels[priority].zh;
}

export function staffDisplayName(staff: PropertyStaffOption, en: boolean): string {
  const name = en
    ? staff.full_name_en || staff.full_name_zh
    : staff.full_name_zh || staff.full_name_en;
  return name ? `${name} (${staff.role})` : staff.role;
}
