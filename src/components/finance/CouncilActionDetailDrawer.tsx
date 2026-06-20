import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Loader2,
  Map,
  Paperclip,
  ShoppingCart,
  X,
} from 'lucide-react';
import { formatCurrency } from '../../lib/budget/dashboardApi';
import {
  actionTypeLabel,
  priorityLabel,
  statusLabel,
  updateCouncilAction,
  type CouncilAction,
  type CouncilActionPriority,
  type CouncilActionStatus,
  type CouncilReviewStatus,
} from '../../features/finance/councilActionsApi';
import {
  assignCouncilAction,
  canInteractCouncilActionWorkflow,
  canManageCouncilActionWorkflow,
  findPropertyManagers,
  createActionComment,
  createCouncilDiscussionFromAction,
  eventTypeLabel,
  fetchRiskSummaryForAction,
  getActionAttachmentSignedUrl,
  listActionAttachments,
  listActionComments,
  listActionEvents,
  listWorkflowStaffOptions,
  mappingHref,
  markCouncilActionComplete,
  procurementNewJobHref,
  reviewEventExcerpt,
  suggestedWorkflowActions,
  uploadActionAttachment,
  workflowStaffLabel,
  type ActionRiskSummary,
  type CouncilActionAttachment,
  type CouncilActionComment,
  type CouncilActionEvent,
  type WorkflowStaffOption,
} from '../../features/finance/councilActionWorkflowApi';
import {
  approveCouncilActionReview,
  createManagerTaskFromCouncilAction,
  fetchManagerTaskForCouncilAction,
  getManagerTaskRollupForAction,
  getTaskAttachmentSignedUrl,
  isManagerTaskCompleted,
  managerCompletedEventExcerpt,
  managerTaskHref,
  managerTaskStatusLabel,
  returnCouncilActionToManager,
  type CouncilActionLinkedManagerTask,
  type ManagerTaskRollup,
} from '../../features/finance/councilActionManagerBridgeApi';

type Props = {
  action: CouncilAction;
  fiscalYear: number;
  en: boolean;
  roleInProperty: string | null;
  staffType: string | null;
  onClose: () => void;
  onUpdated: () => void;
};

function statusBadgeClass(status: CouncilActionStatus): string {
  if (status === 'completed') return 'bg-emerald-100 text-emerald-900';
  if (status === 'in_progress') return 'bg-sky-100 text-sky-900';
  if (status === 'dismissed') return 'bg-gray-100 text-gray-700';
  return 'bg-amber-100 text-amber-900';
}

export function CouncilActionDetailDrawer({
  action,
  fiscalYear,
  en,
  roleInProperty,
  staffType,
  onClose,
  onUpdated,
}: Props) {
  const loc = en ? 'en' : 'zh';
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canManage = canManageCouncilActionWorkflow(roleInProperty);
  const canInteract = canInteractCouncilActionWorkflow(roleInProperty, staffType);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [risk, setRisk] = useState<ActionRiskSummary | null>(null);
  const [comments, setComments] = useState<CouncilActionComment[]>([]);
  const [attachments, setAttachments] = useState<CouncilActionAttachment[]>([]);
  const [events, setEvents] = useState<CouncilActionEvent[]>([]);
  const [staff, setStaff] = useState<WorkflowStaffOption[]>([]);

  const [status, setStatus] = useState(action.status);
  const [priority, setPriority] = useState(action.priority);
  const [assignedTo, setAssignedTo] = useState(action.assigned_to ?? '');
  const [dueDate, setDueDate] = useState(action.due_date ?? '');
  const [commentDraft, setCommentDraft] = useState('');
  const [showAssignFocus, setShowAssignFocus] = useState(false);
  const [showManagerPicker, setShowManagerPicker] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [managerTask, setManagerTask] = useState<CouncilActionLinkedManagerTask | null>(null);
  const [managerRollup, setManagerRollup] = useState<ManagerTaskRollup | null>(null);
  const [reviewStatus, setReviewStatus] = useState<CouncilReviewStatus>(action.review_status ?? 'not_ready');
  const [returnNote, setReturnNote] = useState('');
  const [showReturnForm, setShowReturnForm] = useState(false);

  const managerCandidates = useMemo(() => findPropertyManagers(staff), [staff]);

  useEffect(() => {
    setStatus(action.status);
    setPriority(action.priority);
    setAssignedTo(action.assigned_to ?? '');
    setDueDate(action.due_date ?? '');
    setReviewStatus(action.review_status ?? 'not_ready');
  }, [action]);

  const reload = useCallback(async () => {
    setLoading(true);
    const [riskSummary, commentRows, attachmentRows, eventRows, staffOptions] = await Promise.all([
      fetchRiskSummaryForAction(action.property_id, fiscalYear, action),
      listActionComments(action.id),
      listActionAttachments(action.id),
      listActionEvents(action.id),
      listWorkflowStaffOptions(action.property_id),
    ]);
    setRisk(riskSummary);
    setComments(commentRows);
    setAttachments(attachmentRows);
    setEvents(eventRows);
    setStaff(staffOptions);
    const linkedTask = await fetchManagerTaskForCouncilAction(action.id);
    setManagerTask(linkedTask);
    const rollup = await getManagerTaskRollupForAction(action.id);
    setManagerRollup(rollup);
    setLoading(false);
  }, [action, fiscalYear]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const maybeCreateManagerTaskForAssignee = async (assigneeId: string | null) => {
    if (!assigneeId) return null;

    const manager = findPropertyManagers(staff).find((m) => m.user_id === assigneeId);
    if (!manager) return null;

    return await createManagerTaskFromCouncilAction(action.id, assigneeId, fiscalYear, en);
  };

  const saveFields = async () => {
    setSaving(true);
    setMessage(null);
    const { ok, error } = await updateCouncilAction(action.id, {
      status,
      priority,
      assigned_to: assignedTo || null,
      due_date: dueDate || null,
    });
    setSaving(false);
    if (!ok) {
      setMessage(error ?? (en ? 'Save failed' : '保存失败'));
      return;
    }
    setMessage(en ? 'Saved.' : '已保存。');
    onUpdated();
    await reload();
  };

  const handleAssign = async () => {
    setSaving(true);
    setMessage(null);
    const { ok, error } = await assignCouncilAction(action.id, assignedTo || null);
    if (!ok) {
      setSaving(false);
      setMessage(error ?? (en ? 'Assign failed' : '分配失败'));
      return;
    }

    const taskResult = await maybeCreateManagerTaskForAssignee(assignedTo || null);
    setSaving(false);

    if (taskResult?.error) {
      setMessage(
        en
          ? `Assignee updated, but manager task creation failed: ${taskResult.error}`
          : `负责人已更新，但经理任务创建失败：${taskResult.error}`,
      );
    } else if (taskResult?.existing) {
      setMessage(en ? 'Manager task already exists.' : '经理任务已存在。');
    } else if (taskResult?.task) {
      setMessage(
        en ? 'Assignee updated and manager task created.' : '负责人已更新，并已创建经理任务。',
      );
    } else {
      setMessage(en ? 'Assignee updated.' : '负责人已更新。');
    }

    onUpdated();
    await reload();
  };

  const handleAssignManager = async () => {
    const managers = findPropertyManagers(staff);

    if (managers.length === 0) {
      const hasManagerRoleWithoutUser = staff.some(
        (s) => String(s.role).toLowerCase() === 'manager' && !s.user_id?.trim(),
      );
      if (hasManagerRoleWithoutUser) {
        setMessage(
          en
            ? 'The manager has not accepted the invitation yet.'
            : '物业经理尚未接受邀请，无法分配。',
        );
        setShowAssignFocus(true);
        setShowManagerPicker(false);
        return;
      }
      setMessage(
        en
          ? 'No property manager found. Please add a manager first.'
          : '未找到物业经理，请先在人员管理中添加物业经理。',
      );
      setShowAssignFocus(true);
      setShowManagerPicker(false);
      return;
    }

    if (managers.length > 1) {
      setShowManagerPicker(true);
      setMessage(en ? 'Please select a property manager to assign.' : '请选择要分配的物业经理。');
      return;
    }

    await assignManagerTo(managers[0]);
  };

  const assignManagerTo = async (manager: WorkflowStaffOption) => {
    const assignedMsg = en ? 'Assigned to property manager.' : '已分配给物业经理。';
    const alreadyMsg = en ? 'Already assigned to this property manager.' : '已分配给该物业经理。';

    if (!manager.user_id?.trim()) {
      setMessage(
        en
          ? 'The manager has not accepted the invitation yet.'
          : '物业经理尚未接受邀请，无法分配。',
      );
      return;
    }

    const currentAssignee = assignedTo || action.assigned_to || '';
    if (currentAssignee === manager.user_id) {
      setAssignedTo(manager.user_id);
      setShowManagerPicker(false);
      setSaving(true);
      const taskResult = await maybeCreateManagerTaskForAssignee(manager.user_id);
      setSaving(false);
      if (taskResult?.error) {
        setMessage(taskResult.error);
      } else if (taskResult?.existing) {
        setMessage(en ? 'Manager task already exists.' : '经理任务已存在。');
      } else {
        setMessage(alreadyMsg);
      }
      onUpdated();
      await reload();
      return;
    }

    setSaving(true);
    setMessage(null);
    setAssignedTo(manager.user_id);
    const { ok, error } = await assignCouncilAction(action.id, manager.user_id);
    if (!ok) {
      setSaving(false);
      setMessage(error ?? (en ? 'Assign failed' : '分配失败'));
      return;
    }

    const taskResult = await maybeCreateManagerTaskForAssignee(manager.user_id);
    setSaving(false);
    if (taskResult?.error) {
      setMessage(
        taskResult.error ??
          (en ? 'Assigned, but manager task creation failed.' : '已分配，但经理任务创建失败。'),
      );
      onUpdated();
      await reload();
      return;
    }

    setShowManagerPicker(false);
    setMessage(
      taskResult?.existing
        ? en
          ? 'Assigned. Manager task already exists.'
          : '已分配。经理任务已存在。'
        : assignedMsg,
    );
    onUpdated();
    await reload();
  };

  const handleComplete = async () => {
    setSaving(true);
    const { ok, error } = await markCouncilActionComplete(action.id);
    setSaving(false);
    if (!ok) {
      setMessage(error ?? (en ? 'Complete failed' : '完成失败'));
      return;
    }
    setStatus('completed');
    setReviewStatus('approved');
    setMessage(en ? 'Action marked complete.' : '行动已标记完成。');
    onUpdated();
    await reload();
  };

  const handleApproveReview = async () => {
    setSaving(true);
    setMessage(null);
    const { ok, error } = await approveCouncilActionReview(action.id);
    setSaving(false);
    if (!ok) {
      setMessage(error ?? (en ? 'Approval failed' : '审核通过失败'));
      return;
    }
    setStatus('completed');
    setReviewStatus('approved');
    setShowReturnForm(false);
    setReturnNote('');
    setMessage(en ? 'Council approved and closed.' : '业委会已审核通过并关闭。');
    onUpdated();
    await reload();
  };

  const handleReturnToManager = async () => {
    if (!returnNote.trim()) {
      setMessage(en ? 'Please enter a return reason.' : '请输入退回原因。');
      return;
    }
    setSaving(true);
    setMessage(null);
    const { ok, error } = await returnCouncilActionToManager(action.id, returnNote);
    setSaving(false);
    if (!ok) {
      setMessage(error ?? (en ? 'Return failed' : '退回失败'));
      return;
    }
    setStatus('in_progress');
    setReviewStatus('returned');
    setShowReturnForm(false);
    setReturnNote('');
    setMessage(en ? 'Returned to manager for follow-up.' : '已退回物业经理补充。');
    onUpdated();
    await reload();
  };

  const showCouncilReviewPanel =
    Boolean(action.manager_task_id) &&
    Boolean(managerRollup?.manager_feedback?.trim()) &&
    reviewStatus === 'ready_for_review' &&
    status !== 'completed';

  const handleComment = async () => {
    setSaving(true);
    const { ok, error } = await createActionComment(action, commentDraft);
    setSaving(false);
    if (!ok) {
      setMessage(error ?? (en ? 'Comment failed' : '评论失败'));
      return;
    }
    setCommentDraft('');
    await reload();
  };

  const handleUpload = async (file: File) => {
    setSaving(true);
    const { ok, error } = await uploadActionAttachment(action, file);
    setSaving(false);
    if (!ok) {
      setMessage(error ?? (en ? 'Upload failed' : '上传失败'));
      return;
    }
    await reload();
  };

  const handleCreateDiscussion = async () => {
    setSaving(true);
    const { meetingId, error } = await createCouncilDiscussionFromAction(action, fiscalYear, en);
    setSaving(false);
    if (error || !meetingId) {
      setMessage(error ?? (en ? 'Could not create discussion' : '无法创建讨论'));
      return;
    }
    navigate(`/meetings/${meetingId}`);
  };

  const suggestions = suggestedWorkflowActions(action.alert_type, en);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        aria-label={en ? 'Close' : '关闭'}
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-gray-200 px-4 py-3">
          <div className="min-w-0 pr-2">
            <h4 className="text-base font-semibold text-gray-900">{action.title}</h4>
            <div className="mt-2 flex flex-wrap gap-2">
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(status)}`}
              >
                {statusLabel(status, en)}
              </span>
              <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-900">
                {priorityLabel(priority, en)}
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {actionTypeLabel(action.action_type, en)}
              {action.assignee_name
                ? ` · ${en ? 'Assignee' : '负责人'}: ${action.assignee_name}`
                : ''}
              {action.due_date ? ` · ${en ? 'Due' : '截止'}: ${action.due_date}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-500 hover:bg-gray-100"
            aria-label={en ? 'Close' : '关闭'}
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="size-4 animate-spin" aria-hidden />
              {en ? 'Loading workflow…' : '正在加载工作流…'}
            </div>
          ) : (
            <>
              {risk ? (
                <section className="rounded-xl border border-red-100 bg-red-50/40 p-3">
                  <h5 className="text-sm font-semibold text-red-950">
                    {en ? 'Risk Summary' : '风险摘要'}
                  </h5>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-gray-500">{en ? 'Budget' : '预算'}</div>
                      <div className="font-bold tabular-nums">
                        {formatCurrency(risk.budget_amount, loc)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">{en ? 'Actual' : '实际'}</div>
                      <div className="font-bold tabular-nums">
                        {formatCurrency(risk.actual_amount, loc)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">{en ? 'Remaining' : '剩余'}</div>
                      <div className="font-bold tabular-nums">
                        {formatCurrency(risk.remaining_amount, loc)}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500">
                        {risk.is_revenue
                          ? en
                            ? 'Collection'
                            : '收缴率'
                          : en
                            ? 'Variance'
                            : '差异率'}
                      </div>
                      <div className="font-bold tabular-nums">
                        {risk.percent_value == null ? '—' : `${risk.percent_value.toFixed(1)}%`}
                      </div>
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-red-900">
                    {en ? 'Risk: ' : '风险：'}
                    {risk.risk_description}
                  </p>
                </section>
              ) : null}

              {canManage ? (
                <section className="mt-4 space-y-3 rounded-xl border border-gray-200 p-3">
                  <h5 className="text-sm font-semibold text-gray-900">
                    {en ? 'Assignment & Status' : '分配与状态'}
                  </h5>
                  <label className="block text-sm">
                    <span className="font-medium text-gray-700">{en ? 'Status' : '状态'}</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as CouncilActionStatus)}
                    >
                      {(['open', 'in_progress', 'completed', 'dismissed'] as const).map((s) => (
                        <option key={s} value={s}>
                          {statusLabel(s, en)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-gray-700">{en ? 'Priority' : '优先级'}</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as CouncilActionPriority)}
                    >
                      {(['low', 'medium', 'high', 'critical'] as const).map((p) => (
                        <option key={p} value={p}>
                          {priorityLabel(p, en)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label
                    className={`block text-sm ${showAssignFocus ? 'rounded-lg ring-2 ring-violet-300 p-2' : ''}`}
                  >
                    <span className="font-medium text-gray-700">{en ? 'Assignee' : '负责人'}</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      value={assignedTo}
                      onChange={(e) => setAssignedTo(e.target.value)}
                    >
                      <option value="">{en ? 'Unassigned' : '未分配'}</option>
                      {staff.map((s) => (
                        <option key={s.user_id} value={s.user_id}>
                          {workflowStaffLabel(s, en)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-sm">
                    <span className="font-medium text-gray-700">{en ? 'Due date' : '截止日期'}</span>
                    <input
                      type="date"
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void saveFields()}
                      className="flex-1 rounded-lg bg-violet-700 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"
                    >
                      {en ? 'Save' : '保存'}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleAssign()}
                      className="flex-1 rounded-lg border border-violet-300 px-3 py-2 text-sm font-semibold text-violet-900 hover:bg-violet-50 disabled:opacity-50"
                    >
                      {en ? 'Assign' : '分配'}
                    </button>
                  </div>
                </section>
              ) : null}

              <section className="mt-4 rounded-xl border border-violet-100 bg-violet-50/40 p-3">
                <h5 className="text-sm font-semibold text-violet-950">
                  {en ? 'Suggested actions' : '建议措施'}
                </h5>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-violet-900">
                  {suggestions.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={mappingHref()}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-xs font-medium text-violet-900 hover:bg-violet-50"
                  >
                    <Map className="size-3.5" aria-hidden />
                    {en ? 'Open Mapping' : '打开映射'}
                  </Link>
                  <Link
                    to={procurementNewJobHref(action.alert_category)}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-xs font-medium text-violet-900 hover:bg-violet-50"
                  >
                    <ShoppingCart className="size-3.5" aria-hidden />
                    {en ? 'Create Procurement' : '创建采购'}
                  </Link>
                  <button
                    type="button"
                    disabled={saving || !canManage}
                    onClick={() => void handleCreateDiscussion()}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-xs font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50"
                  >
                    <CalendarDays className="size-3.5" aria-hidden />
                    {en ? 'Council Discussion' : '业委会讨论'}
                  </button>
                  <button
                    type="button"
                    disabled={!canManage || saving || loading}
                    onClick={() => void handleAssignManager()}
                    className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-white px-2.5 py-1 text-xs font-medium text-violet-900 hover:bg-violet-50 disabled:opacity-50"
                  >
                    <Briefcase className="size-3.5" aria-hidden />
                    {en ? 'Assign Manager' : '分配经理'}
                  </button>
                </div>
                {showManagerPicker && managerCandidates.length > 1 ? (
                  <div className="mt-3 rounded-lg border border-violet-200 bg-white p-3">
                    <h6 className="text-xs font-semibold text-violet-950">
                      {en ? 'Select property manager' : '选择物业经理'}
                    </h6>
                    <ul className="mt-2 space-y-2">
                      {managerCandidates.map((manager) => {
                        const isCurrent =
                          (assignedTo || action.assigned_to || '') === manager.user_id;
                        return (
                          <li
                            key={manager.user_id}
                            className="flex items-center justify-between gap-2 rounded-md border border-gray-100 bg-gray-50 px-2 py-2 text-sm"
                          >
                            <div className="min-w-0">
                              <div className="font-medium text-gray-900">
                                {workflowStaffLabel(manager, en)}
                              </div>
                              {manager.email ? (
                                <div className="truncate text-xs text-gray-500">{manager.email}</div>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              disabled={saving || isCurrent}
                              onClick={() => void assignManagerTo(manager)}
                              className="shrink-0 rounded-lg bg-violet-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isCurrent
                                ? en
                                  ? 'Assigned'
                                  : '已分配'
                                : en
                                  ? 'Assign'
                                  : '分配'}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <button
                      type="button"
                      className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                      onClick={() => setShowManagerPicker(false)}
                    >
                      {en ? 'Cancel' : '取消'}
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="mt-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                <h5 className="text-sm font-semibold text-slate-950">
                  {en ? 'Manager task' : '经理任务'}
                </h5>
                <div className="mt-2 border-t border-slate-200 pt-3">
                  {managerTask ? (
                    <dl className="grid gap-2 text-sm">
                      <div>
                        <dt className="text-gray-500">{en ? 'Status' : '状态'}</dt>
                        <dd className="font-medium text-gray-900">
                          {managerTaskStatusLabel(managerTask.status, en)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">{en ? 'Assignee' : '负责人'}</dt>
                        <dd className="font-medium text-gray-900">
                          {managerTask.assignee_name ?? (en ? 'Unassigned' : '未分配')}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-gray-500">{en ? 'Created' : '创建时间'}</dt>
                        <dd className="font-medium text-gray-900">
                          {new Date(managerTask.created_at).toLocaleString(en ? 'en-CA' : 'zh-CN')}
                        </dd>
                      </div>
                      <div className="pt-1">
                        <Link
                          to={managerTaskHref(managerTask.id)}
                          className="inline-flex rounded-lg bg-violet-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-800"
                        >
                          {en ? 'Open manager task' : '打开经理任务'}
                        </Link>
                      </div>
                    </dl>
                  ) : (
                    <p className="text-sm text-gray-500">
                      {en ? 'No manager task created yet.' : '尚未创建经理任务'}
                    </p>
                  )}
                </div>
              </section>

              {(managerRollup || managerTask || action.manager_task_id) ? (
                <section className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                  <h5 className="text-sm font-semibold text-emerald-950">
                    {en ? 'Manager feedback' : '经理反馈'}
                  </h5>
                  {managerRollup && isManagerTaskCompleted(managerRollup.task_status) ? (
                    <div className="mt-3 space-y-3 text-sm">
                      <p className="font-medium text-emerald-900">
                        {en
                          ? 'The property manager has submitted results.'
                          : '物业经理已提交处理结果'}
                      </p>
                      <div>
                        <div className="text-gray-500">{en ? 'Outcome' : '处理结果'}</div>
                        <p className="mt-1 whitespace-pre-wrap font-medium text-gray-900">
                          {managerRollup.manager_feedback?.trim() || (en ? '—' : '—')}
                        </p>
                      </div>
                      <div>
                        <div className="text-gray-500">{en ? 'Completed at' : '完成时间'}</div>
                        <p className="font-medium text-gray-900">
                          {managerRollup.completed_at
                            ? new Date(managerRollup.completed_at).toLocaleString(en ? 'en-CA' : 'zh-CN')
                            : '—'}
                        </p>
                      </div>
                      <div>
                        <div className="text-gray-500">{en ? 'Submitted by' : '处理人'}</div>
                        <p className="font-medium text-gray-900">
                          {managerRollup.manager_feedback_by_name ??
                            managerRollup.assigned_to_name ??
                            (en ? '—' : '—')}
                        </p>
                      </div>
                      <div>
                        <div className="text-gray-500">{en ? 'Attachments' : '附件'}</div>
                        {managerRollup.attachments.length === 0 ? (
                          <p className="mt-1 text-gray-500">
                            {en ? 'No manager attachments yet.' : '暂无经理附件'}
                          </p>
                        ) : (
                          <ul className="mt-1 space-y-1">
                            {managerRollup.attachments.map((a) => (
                              <li
                                key={a.id}
                                className="flex items-center justify-between gap-2 rounded border border-emerald-100 bg-white px-2 py-1.5"
                              >
                                <span className="truncate">{a.file_name}</span>
                                <button
                                  type="button"
                                  className="shrink-0 text-xs font-medium text-emerald-800 hover:underline"
                                  onClick={() =>
                                    void getTaskAttachmentSignedUrl(a.storage_path).then((url) => {
                                      if (url) window.open(url, '_blank', 'noopener,noreferrer');
                                    })
                                  }
                                >
                                  {en ? 'View' : '查看'}
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 space-y-2 text-sm">
                      <div>
                        <span className="text-gray-500">
                          {en ? 'Manager task status' : '经理任务状态'}：
                        </span>{' '}
                        <span className="font-medium text-gray-900">
                          {managerRollup
                            ? managerTaskStatusLabel(managerRollup.task_status, en)
                            : managerTask
                              ? managerTaskStatusLabel(managerTask.status, en)
                              : en
                                ? 'Pending'
                                : '待处理'}
                        </span>
                      </div>
                      <p className="text-gray-600">
                        {en
                          ? 'Waiting for the property manager to submit results.'
                          : '等待物业经理提交处理结果。'}
                      </p>
                      {(managerRollup?.task_id ?? managerTask?.id) ? (
                        <Link
                          to={managerTaskHref(managerRollup?.task_id ?? managerTask!.id)}
                          className="inline-flex rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-50"
                        >
                          {en ? 'Open manager task' : '打开经理任务'}
                        </Link>
                      ) : null}
                    </div>
                  )}
                </section>
              ) : null}

              {showCouncilReviewPanel && canManage ? (
                <section className="mt-4 rounded-xl border border-sky-200 bg-sky-50/50 p-3">
                  <h5 className="text-sm font-semibold text-sky-950">
                    {en ? 'Council review' : '业委会审核'}
                  </h5>
                  <p className="mt-2 text-sm text-sky-900">
                    {en
                      ? 'This task is awaiting council review.'
                      : '该任务正在等待业委会审核。'}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleApproveReview()}
                      className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                      {en ? 'Approve & close' : '通过并关闭'}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => setShowReturnForm((v) => !v)}
                      className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-900 hover:bg-amber-50 disabled:opacity-50"
                    >
                      {en ? 'Return to manager' : '退回经理'}
                    </button>
                  </div>
                  {showReturnForm ? (
                    <div className="mt-3 space-y-2">
                      <textarea
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        rows={3}
                        placeholder={
                          en
                            ? 'Enter return reason, e.g. please attach collection notice.'
                            : '请输入退回原因，例如：请补充催缴记录或附件。'
                        }
                        value={returnNote}
                        onChange={(e) => setReturnNote(e.target.value)}
                      />
                      <button
                        type="button"
                        disabled={saving || !returnNote.trim()}
                        onClick={() => void handleReturnToManager()}
                        className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                      >
                        {en ? 'Confirm return' : '确认退回'}
                      </button>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="mt-4">
                <h5 className="text-sm font-semibold text-gray-900">
                  {en ? 'Discussion' : '讨论'}
                </h5>
                {comments.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    {en ? 'No comments yet.' : '暂无评论。'}
                  </p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {comments.map((c) => (
                      <li key={c.id} className="rounded-lg border border-gray-100 bg-gray-50 p-2 text-sm">
                        <div className="flex flex-wrap items-center gap-x-2 text-xs text-gray-500">
                          <span className="font-medium text-gray-800">
                            {c.author_name ?? (en ? 'Member' : '成员')}
                          </span>
                          {c.author_role ? <span>{c.author_role}</span> : null}
                          <span>{new Date(c.created_at).toLocaleString()}</span>
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-gray-800">{c.comment}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {canInteract ? (
                  <div className="mt-3 space-y-2">
                    <textarea
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      rows={3}
                      value={commentDraft}
                      onChange={(e) => setCommentDraft(e.target.value)}
                      placeholder={en ? 'Add a comment…' : '添加评论…'}
                    />
                    <button
                      type="button"
                      disabled={saving || !commentDraft.trim()}
                      onClick={() => void handleComment()}
                      className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
                    >
                      {en ? 'Post comment' : '发表评论'}
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="mt-4">
                <h5 className="text-sm font-semibold text-gray-900">
                  {en ? 'Attachments' : '附件'}
                </h5>
                {attachments.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    {en ? 'No attachments yet.' : '暂无附件。'}
                  </p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {attachments.map((a) => (
                      <li key={a.id} className="flex items-center justify-between gap-2 rounded border border-gray-100 px-2 py-1.5">
                        <span className="truncate">{a.file_name}</span>
                        <button
                          type="button"
                          className="shrink-0 text-xs font-medium text-violet-700 hover:underline"
                          onClick={() =>
                            void getActionAttachmentSignedUrl(a.storage_path).then((url) => {
                              if (url) window.open(url, '_blank', 'noopener,noreferrer');
                            })
                          }
                        >
                          {en ? 'Open' : '打开'}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {canInteract ? (
                  <div className="mt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleUpload(file);
                        e.target.value = '';
                      }}
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50"
                    >
                      <Paperclip className="size-4" aria-hidden />
                      {en ? 'Upload file' : '上传文件'}
                    </button>
                  </div>
                ) : null}
              </section>

              {canManage && status !== 'completed' && !showCouncilReviewPanel ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleComplete()}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  <CheckCircle2 className="size-4" aria-hidden />
                  {en ? 'Mark Complete' : '标记完成'}
                </button>
              ) : null}

              <section className="mt-6 border-t border-gray-200 pt-4">
                <h5 className="text-sm font-semibold text-gray-900">
                  {en ? 'Activity Timeline' : '活动时间线'}
                </h5>
                {events.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">{en ? 'No events yet.' : '暂无记录。'}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {events.map((ev) => {
                      const managerExcerpt =
                        ev.event_type === 'manager_completed'
                          ? managerCompletedEventExcerpt(ev, managerRollup?.manager_feedback)
                          : null;
                      const reviewExcerpt =
                        ev.event_type === 'review_approved' || ev.event_type === 'review_returned'
                          ? reviewEventExcerpt(ev)
                          : null;
                      const excerpt = managerExcerpt ?? reviewExcerpt;
                      return (
                      <li key={ev.id} className="text-sm">
                        <div className="font-medium text-gray-900">
                          {eventTypeLabel(ev.event_type, en)}
                        </div>
                        {excerpt ? (
                          <p className="mt-1 text-gray-600">
                            {excerpt.length > 160
                              ? `${excerpt.slice(0, 160)}…`
                              : excerpt}
                          </p>
                        ) : null}
                        <div className="text-xs text-gray-500">
                          {ev.actor_name ?? (en ? 'System' : '系统')} ·{' '}
                          {new Date(ev.created_at).toLocaleString()}
                        </div>
                      </li>
                    );
                    })}
                  </ul>
                )}
              </section>
            </>
          )}

          {message ? <p className="mt-3 text-sm text-violet-800">{message}</p> : null}
        </div>
      </aside>
    </div>
  );
}
