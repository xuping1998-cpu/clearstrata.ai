import { supabase } from '../../lib/supabase';
import type { BudgetRiskAlertType } from './budgetRiskAlertsApi';
import { alertTypeLabel } from './budgetRiskAlertsApi';
import type { CouncilAction } from './councilActionsApi';
import { updateCouncilAction } from './councilActionsApi';
import { fetchRiskSummaryForAction } from './councilActionWorkflowApi';

export type CouncilActionManagerTaskType =
  | 'budget_review'
  | 'owner_fee_collection'
  | 'finance_mapping'
  | 'follow_up';

export type CouncilActionLinkedManagerTask = {
  id: string;
  title: string;
  status: string;
  task_type: string;
  assigned_to: string | null;
  assignee_name: string | null;
  created_at: string;
  source_type: string | null;
  council_action_id: string | null;
};

export type ManagerTaskRollupAttachment = {
  id: string;
  file_name: string;
  storage_path: string;
  uploaded_by_name: string | null;
  created_at: string;
};

export type ManagerTaskRollup = {
  task_id: string;
  task_title: string;
  task_type: string;
  task_status: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  manager_feedback: string | null;
  manager_feedback_at: string | null;
  manager_feedback_by_name: string | null;
  attachments: ManagerTaskRollupAttachment[];
};

export type CouncilAssignedTaskStage =
  | 'waiting_manager'
  | 'waiting_council_review'
  | 'completed';

export type CouncilAssignedManagerTask = {
  status: string;
  manager_feedback?: string | null;
};

export type CouncilActionTaskLink = {
  actionId: string;
  actionTitle: string;
  actionStatus: string;
  dueDate: string | null;
  assignerName: string | null;
};

export function resolveCouncilAssignedTaskStage(
  task: CouncilAssignedManagerTask,
  linkedCouncilAction?: Pick<CouncilAction, 'status'> | null,
): CouncilAssignedTaskStage {
  if (linkedCouncilAction?.status === 'completed') {
    return 'completed';
  }

  const feedback = String(task.manager_feedback ?? '').trim();
  if (feedback && linkedCouncilAction?.status !== 'completed') {
    return 'waiting_council_review';
  }

  const status = String(task.status ?? '').trim().toLowerCase();
  if (!feedback || status === 'open') {
    return 'waiting_manager';
  }

  return 'waiting_manager';
}

export function councilAssignedStageLabel(stage: CouncilAssignedTaskStage, en: boolean): string {
  const labels: Record<CouncilAssignedTaskStage, { en: string; zh: string }> = {
    waiting_manager: { en: 'Awaiting manager', zh: '待经理处理' },
    waiting_council_review: { en: 'Awaiting council review', zh: '待业委会审核' },
    completed: { en: 'Completed', zh: '已完成' },
  };
  return en ? labels[stage].en : labels[stage].zh;
}

export function councilAssignedStageBadgeClass(stage: CouncilAssignedTaskStage): string {
  if (stage === 'waiting_manager') return 'bg-amber-100 text-amber-900';
  if (stage === 'waiting_council_review') return 'bg-sky-100 text-sky-900';
  return 'bg-emerald-100 text-emerald-900';
}

export async function fetchCouncilActionLinksForTasks(
  councilActionIds: string[],
  en = false,
): Promise<Record<string, CouncilActionTaskLink>> {
  const uniqueIds = [...new Set(councilActionIds.filter(Boolean))];
  if (!uniqueIds.length) return {};

  const { data, error } = await supabase
    .from('council_actions')
    .select('id, title, status, created_by, due_date')
    .in('id', uniqueIds);

  if (error || !data?.length) return {};

  const creatorIds = [
    ...new Set(data.map((r) => (r.created_by != null ? String(r.created_by) : '')).filter(Boolean)),
  ];
  const creatorNames = new Map<string, string | null>();
  await Promise.all(
    creatorIds.map(async (uid) => {
      creatorNames.set(uid, await loadProfileName(uid, en));
    }),
  );

  const out: Record<string, CouncilActionTaskLink> = {};
  for (const row of data) {
    const id = String(row.id);
    const createdBy = row.created_by != null ? String(row.created_by) : null;
    out[id] = {
      actionId: id,
      actionTitle: String(row.title ?? ''),
      actionStatus: String(row.status ?? ''),
      dueDate: row.due_date != null ? String(row.due_date).slice(0, 10) : null,
      assignerName: createdBy ? creatorNames.get(createdBy) ?? null : null,
    };
  }
  return out;
}

const MANAGER_TASK_COMPLETED = new Set(['completed', 'resolved', 'closed']);

export function isManagerTaskCompleted(status: string | null | undefined): boolean {
  return MANAGER_TASK_COMPLETED.has(String(status ?? '').trim().toLowerCase());
}

export function mapAlertTypeToManagerTaskType(
  alertType: string | null | undefined,
): CouncilActionManagerTaskType {
  switch (alertType as BudgetRiskAlertType | null | undefined) {
    case 'EXPENSE_OVER_BUDGET':
    case 'EXPENSE_NEAR_LIMIT':
      return 'budget_review';
    case 'REVENUE_COLLECTION_CRITICAL':
    case 'REVENUE_COLLECTION_LOW':
      return 'owner_fee_collection';
    case 'UNMAPPED_EXPENSE':
    case 'UNMAPPED_REVENUE':
      return 'finance_mapping';
    case 'NO_ACTIVITY':
      return 'follow_up';
    default:
      return 'budget_review';
  }
}

function formatMoney(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function buildManagerTaskDescription(
  action: CouncilAction,
  risk: Awaited<ReturnType<typeof fetchRiskSummaryForAction>>,
  en: boolean,
): string {
  if (!risk) {
    return en
      ? `Source: Budget risk alert\n\n${action.description ?? ''}`
      : `来源：预算风险预警\n\n${action.description ?? ''}`;
  }
  if (en) {
    return [
      'Source: Budget risk alert',
      '',
      `Budget: ${formatMoney(risk.budget_amount)}`,
      `Actual: ${formatMoney(risk.actual_amount)}`,
      `Remaining: ${formatMoney(risk.remaining_amount)}`,
      '',
      `Risk: ${risk.risk_description}`,
    ].join('\n');
  }
  return [
    '来源：预算风险预警',
    '',
    `预算：${formatMoney(risk.budget_amount)}`,
    `实际：${formatMoney(risk.actual_amount)}`,
    `剩余：${formatMoney(risk.remaining_amount)}`,
    '',
    `风险说明：${risk.risk_description}`,
  ].join('\n');
}

export function councilActionFinanceHref(actionId: string): string {
  return `/finance?tab=budget&actionId=${encodeURIComponent(actionId)}`;
}

export function managerTaskHref(taskId: string): string {
  return `/manager-tasks?taskId=${encodeURIComponent(taskId)}`;
}

export function managerTaskStatusLabel(status: string, en: boolean): string {
  const s = status.trim().toLowerCase();
  if (s === 'open') return en ? 'Pending' : '待处理';
  if (s === 'in_progress') return en ? 'In Progress' : '进行中';
  if (s === 'resolved' || s === 'completed' || s === 'closed') {
    return en ? 'Completed' : '已完成';
  }
  return status;
}

export function managerTaskTypeLabel(taskType: string, en: boolean): string {
  const labels: Record<string, { en: string; zh: string }> = {
    budget_review: { en: 'Budget review', zh: '预算审查' },
    owner_fee_collection: { en: 'Fee collection', zh: '追缴物业费' },
    finance_mapping: { en: 'Finance mapping', zh: '科目映射' },
    follow_up: { en: 'Follow-up', zh: '跟进事项' },
  };
  const row = labels[taskType];
  return row ? (en ? row.en : row.zh) : taskType;
}

async function loadProfileName(userId: string | null, en = false): Promise<string | null> {
  if (!userId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('full_name_en, full_name_zh')
    .eq('id', userId)
    .maybeSingle();
  if (!data) return null;
  const zh = data.full_name_zh != null ? String(data.full_name_zh).trim() : '';
  const enName = data.full_name_en != null ? String(data.full_name_en).trim() : '';
  return en ? enName || zh || null : zh || enName || null;
}

function extractManagerFeedback(row: Record<string, unknown>): string | null {
  const primary = String(row.manager_feedback ?? '').trim();
  if (primary) return primary;
  const legacy = String(row.dispute_result ?? '').trim();
  return legacy || null;
}

export async function getTaskAttachmentSignedUrl(filePath: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('task-attachments').createSignedUrl(filePath, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

export async function getManagerTaskRollupForAction(actionId: string): Promise<ManagerTaskRollup | null> {
  const { data: actionRow } = await supabase
    .from('council_actions')
    .select('manager_task_id, property_id')
    .eq('id', actionId)
    .maybeSingle();

  let taskId = actionRow?.manager_task_id != null ? String(actionRow.manager_task_id) : null;

  if (!taskId) {
    const { data: byLink } = await supabase
      .from('manager_tasks')
      .select('id')
      .eq('council_action_id', actionId)
      .maybeSingle();
    taskId = byLink?.id != null ? String(byLink.id) : null;
  }

  if (!taskId) return null;

  const { data: task, error } = await supabase
    .from('manager_tasks')
    .select(
      'id, title, task_type, status, assigned_to, created_at, updated_at, manager_feedback, manager_feedback_at, manager_feedback_by, dispute_result',
    )
    .eq('id', taskId)
    .maybeSingle();

  if (error || !task) return null;

  const row = task as Record<string, unknown>;
  const propertyId = actionRow?.property_id != null ? String(actionRow.property_id) : null;

  const [assignedName, feedbackByName, attachmentsRaw] = await Promise.all([
    loadProfileName(row.assigned_to != null ? String(row.assigned_to) : null),
    loadProfileName(row.manager_feedback_by != null ? String(row.manager_feedback_by) : null),
    propertyId
      ? supabase
          .from('task_attachments')
          .select('id, file_name, file_path, uploaded_by, created_at')
          .eq('task_id', taskId)
          .eq('property_id', propertyId)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const uploaderIds = [
    ...new Set(
      (attachmentsRaw.data ?? [])
        .map((a) => (a.uploaded_by != null ? String(a.uploaded_by) : ''))
        .filter(Boolean),
    ),
  ];
  const uploaderNames = new Map<string, string | null>();
  await Promise.all(
    uploaderIds.map(async (uid) => {
      uploaderNames.set(uid, await loadProfileName(uid));
    }),
  );

  const feedback = extractManagerFeedback(row);
  const feedbackAt =
    row.manager_feedback_at != null
      ? String(row.manager_feedback_at)
      : isManagerTaskCompleted(String(row.status ?? '')) && feedback
        ? String(row.updated_at ?? '')
        : null;

  const attachments: ManagerTaskRollupAttachment[] = (attachmentsRaw.data ?? []).map((a) => ({
    id: String(a.id),
    file_name: String(a.file_name ?? ''),
    storage_path: String(a.file_path ?? ''),
    uploaded_by_name:
      a.uploaded_by != null ? uploaderNames.get(String(a.uploaded_by)) ?? null : null,
    created_at: String(a.created_at),
  }));

  return {
    task_id: String(row.id),
    task_title: String(row.title ?? ''),
    task_type: String(row.task_type ?? ''),
    task_status: String(row.status ?? 'open'),
    assigned_to: row.assigned_to != null ? String(row.assigned_to) : null,
    assigned_to_name: assignedName,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
    completed_at: isManagerTaskCompleted(String(row.status ?? ''))
      ? feedbackAt ?? String(row.updated_at ?? '')
      : null,
    manager_feedback: feedback,
    manager_feedback_at: feedbackAt,
    manager_feedback_by_name: feedbackByName,
    attachments,
  };
}

export async function saveManagerTaskFeedback(
  taskId: string,
  feedback: string,
  status?: string,
): Promise<{ ok: boolean; error: string | null }> {
  const trimmed = feedback.trim();
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id ?? null;

  const patch: Record<string, unknown> = {};
  if (trimmed) {
    patch.manager_feedback = trimmed;
    patch.manager_feedback_at = new Date().toISOString();
    patch.manager_feedback_by = userId;
  }
  if (status?.trim()) {
    patch.status = status.trim();
  }

  if (!Object.keys(patch).length) {
    return { ok: false, error: 'Nothing to save' };
  }

  const { error } = await supabase.from('manager_tasks').update(patch).eq('id', taskId);
  if (error) return { ok: false, error: error.message };

  await syncCouncilActionStatus(taskId);
  return { ok: true, error: null };
}

function mapLinkedTaskRow(
  row: Record<string, unknown>,
  assigneeName: string | null,
): CouncilActionLinkedManagerTask {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    status: String(row.status ?? 'open'),
    task_type: String(row.task_type ?? ''),
    assigned_to: row.assigned_to != null ? String(row.assigned_to) : null,
    assignee_name: assigneeName,
    created_at: String(row.created_at),
    source_type: row.source_type != null ? String(row.source_type) : null,
    council_action_id: row.council_action_id != null ? String(row.council_action_id) : null,
  };
}

export async function fetchManagerTaskForCouncilAction(
  actionId: string,
): Promise<CouncilActionLinkedManagerTask | null> {
  const { data, error } = await supabase
    .from('manager_tasks')
    .select('id, title, status, task_type, assigned_to, created_at, source_type, council_action_id')
    .eq('council_action_id', actionId)
    .maybeSingle();

  if (error || !data) return null;
  const assigneeName = await loadProfileName(
    data.assigned_to != null ? String(data.assigned_to) : null,
  );
  return mapLinkedTaskRow(data as Record<string, unknown>, assigneeName);
}

export async function createManagerTaskFromCouncilAction(
  actionId: string,
  managerUserId: string,
  fiscalYear: number,
  en = false,
): Promise<{ task: CouncilActionLinkedManagerTask | null; error: string | null; existing: boolean }> {
  const { data: existing, error: existingErr } = await supabase
    .from('manager_tasks')
    .select('id, title, status, task_type, assigned_to, created_at, source_type, council_action_id')
    .eq('council_action_id', actionId)
    .maybeSingle();

  if (existingErr) {
    return { task: null, error: existingErr.message, existing: false };
  }
  if (existing) {
    const assigneeName = await loadProfileName(
      existing.assigned_to != null ? String(existing.assigned_to) : null,
    );
    return {
      task: mapLinkedTaskRow(existing as Record<string, unknown>, assigneeName),
      error: null,
      existing: true,
    };
  }

  const { data: actionRow, error: actionErr } = await supabase
    .from('council_actions')
    .select(
      'id, property_id, alert_type, alert_category, title, description, action_type, status, priority, assigned_to, due_date',
    )
    .eq('id', actionId)
    .maybeSingle();

  if (actionErr || !actionRow) {
    return { task: null, error: actionErr?.message ?? 'Council action not found', existing: false };
  }

  const action = actionRow as CouncilAction;
  const risk = await fetchRiskSummaryForAction(action.property_id, fiscalYear, action);
  const taskType = mapAlertTypeToManagerTaskType(action.alert_type);
  const description = buildManagerTaskDescription(action, risk, en);
  const { data: userData } = await supabase.auth.getUser();
  const createdBy = userData.user?.id ?? null;

  const dueDate = action.due_date ? `${action.due_date}T12:00:00.000Z` : null;

  const { data: inserted, error: insertErr } = await supabase
    .from('manager_tasks')
    .insert({
      property_id: action.property_id,
      task_type: taskType,
      title: action.title,
      description,
      status: 'open',
      assigned_to: managerUserId,
      created_by: createdBy,
      due_date: dueDate,
      source_type: 'council_action',
      source_id: actionId,
      council_action_id: actionId,
    })
    .select('id, title, status, task_type, assigned_to, created_at, source_type, council_action_id')
    .single();

  if (insertErr || !inserted) {
    return { task: null, error: insertErr?.message ?? 'Failed to create manager task', existing: false };
  }

  const { error: linkErr } = await supabase
    .from('council_actions')
    .update({ manager_task_id: String(inserted.id) })
    .eq('id', actionId);

  if (linkErr) {
    return { task: null, error: linkErr.message, existing: false };
  }

  const assigneeName = await loadProfileName(managerUserId);
  return {
    task: mapLinkedTaskRow(inserted as Record<string, unknown>, assigneeName),
    error: null,
    existing: false,
  };
}

export async function syncCouncilActionStatus(
  managerTaskId: string,
): Promise<{ ok: boolean; error: string | null }> {
  const { data: task, error: taskErr } = await supabase
    .from('manager_tasks')
    .select(
      'id, status, council_action_id, property_id, assigned_to, updated_at, manager_feedback, manager_feedback_at, manager_feedback_by, dispute_result',
    )
    .eq('id', managerTaskId)
    .maybeSingle();

  if (taskErr || !task?.council_action_id) {
    return { ok: !taskErr, error: taskErr?.message ?? null };
  }

  const actionId = String(task.council_action_id);
  const taskStatus = String(task.status ?? '').trim().toLowerCase();
  const feedback = extractManagerFeedback(task as Record<string, unknown>);
  const completedAt =
    task.manager_feedback_at != null
      ? String(task.manager_feedback_at)
      : isManagerTaskCompleted(taskStatus)
        ? String(task.updated_at ?? '')
        : null;

  const { data: action, error: actionErr } = await supabase
    .from('council_actions')
    .select('id, property_id, status')
    .eq('id', actionId)
    .maybeSingle();

  if (actionErr || !action) {
    return { ok: false, error: actionErr?.message ?? 'Council action not found' };
  }

  const actionStatus = String(action.status ?? '').trim().toLowerCase();

  if (taskStatus === 'in_progress' && actionStatus === 'open') {
    const { error } = await updateCouncilAction(actionId, { status: 'in_progress' });
    if (error) return { ok: false, error };
  }

  if (isManagerTaskCompleted(taskStatus)) {
    const { data: priorEvents } = await supabase
      .from('council_action_events')
      .select('id, new_value')
      .eq('action_id', actionId)
      .eq('event_type', 'manager_completed')
      .order('created_at', { ascending: false })
      .limit(1);

    const priorFeedback =
      priorEvents?.[0]?.new_value &&
      typeof priorEvents[0].new_value === 'object' &&
      priorEvents[0].new_value !== null &&
      'feedback' in (priorEvents[0].new_value as Record<string, unknown>)
        ? String((priorEvents[0].new_value as Record<string, unknown>).feedback ?? '').trim()
        : '';

    const shouldLog =
      !priorEvents?.length || (feedback.length > 0 && feedback !== priorFeedback);

    if (shouldLog) {
      const actorId =
        task.manager_feedback_by != null
          ? String(task.manager_feedback_by)
          : task.assigned_to != null
            ? String(task.assigned_to)
            : null;
      const { error: logErr } = await supabase.rpc('log_council_action_event', {
        p_action_id: actionId,
        p_property_id: String(action.property_id),
        p_actor_id: actorId,
        p_event_type: 'manager_completed',
        p_old_value: null,
        p_new_value: {
          message_zh: '物业经理已提交处理结果',
          message_en: 'Property manager submitted results',
          manager_task_id: managerTaskId,
          task_id: managerTaskId,
          status: taskStatus,
          feedback,
          completed_at: completedAt,
        },
      });
      if (logErr) return { ok: false, error: logErr.message };
    }
  }

  return { ok: true, error: null };
}

export async function fetchCouncilActionSourceForManagerTask(
  task: Pick<CouncilActionLinkedManagerTask, 'source_type' | 'council_action_id'>,
  en = false,
): Promise<{
  actionId: string;
  actionTitle: string;
  actionStatus: string;
  alertTypeLabel: string;
  dueDate: string | null;
  assignerName: string | null;
} | null> {
  if (task.source_type !== 'council_action' || !task.council_action_id) return null;

  const { data, error } = await supabase
    .from('council_actions')
    .select('id, title, alert_type, status, created_by, due_date')
    .eq('id', task.council_action_id)
    .maybeSingle();

  if (error || !data) return null;
  const createdBy = data.created_by != null ? String(data.created_by) : null;
  const assignerName = await loadProfileName(createdBy, en);
  return {
    actionId: String(data.id),
    actionTitle: String(data.title ?? ''),
    actionStatus: String(data.status ?? ''),
    alertTypeLabel: alertTypeLabel(String(data.alert_type ?? ''), true),
    dueDate: data.due_date != null ? String(data.due_date).slice(0, 10) : null,
    assignerName,
  };
}

export function managerCompletedEventExcerpt(
  event: { new_value: Record<string, unknown> | null },
  rollupFeedback?: string | null,
): string | null {
  const fromEvent = event.new_value?.feedback;
  if (typeof fromEvent === 'string' && fromEvent.trim()) return fromEvent.trim();
  if (rollupFeedback?.trim()) return rollupFeedback.trim();
  return null;
}
