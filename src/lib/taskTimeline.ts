/**
 * 统一时间线条目（任务事件 / 日志 / 发票 / 审批审计 / 附件）
 */

import { getAttachmentEventTitle, isImageFile } from './taskAttachmentUtils';

export type TimelineItemType =
  | 'task_created'
  | 'task_updated'
  | 'log'
  | 'invoice'
  | 'approval'
  | 'attachment';

export type TimelineItem = {
  id: string;
  type: TimelineItemType;
  title: string;
  description?: string;
  created_at: string;
  actor_name?: string;
  metadata?: Record<string, unknown>;
};

type TaskRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  updated_at: string;
};

type LogRow = {
  id: string;
  title: string | null;
  category: string | null;
  body: string;
  created_at: string;
  related_invoice_id: string | null;
  author_name?: string;
};

type InvoiceRow = {
  id: string;
  vendor_name: string;
  invoice_number: string | null;
  total_amount: number;
  invoice_date: string;
  created_at: string;
  status: string;
};

type AuditRow = {
  id: string;
  invoice_id: string;
  action: string;
  notes: string | null;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
  actor_name?: string;
};

export type AttachmentTimelineInput = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  category: string | null;
  created_at: string;
};

function clip(s: string, max = 200): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/** 从任务、日志、发票、invoice_audit_log、任务附件 组装时间线并排序（旧 → 新） */
export function buildTimelineItems(input: {
  task: TaskRow;
  logs: LogRow[];
  taskRelatedInvoiceId: string | null;
  invoices: Map<string, InvoiceRow>;
  invoiceAudit: AuditRow[];
  /** 仅 task_id = 当前任务的附件 */
  attachments?: AttachmentTimelineInput[];
  localeEn: boolean;
  labels: {
    taskCreated: string;
    taskUpdated: string;
    taskCompleted: string;
    invoiceFromTask: string;
    invoiceFromLog: string;
    approvalPrefix: string;
    /** 发票审核 action=approve 时的时间线标题 */
    approvalApprovedTitle: string;
  };
}): TimelineItem[] {
  const { task, logs, taskRelatedInvoiceId, invoices, invoiceAudit, labels, attachments, localeEn } = input;
  const items: TimelineItem[] = [];

  items.push({
    id: `task-created-${task.id}`,
    type: 'task_created',
    title: labels.taskCreated,
    description: task.title ? `${task.title}${task.description ? ` — ${clip(task.description, 120)}` : ''}` : clip(task.description, 160),
    created_at: task.created_at,
    metadata: { status: task.status },
  });

  const doneStatuses = new Set(['done', 'closed', 'cancelled', 'resolved']);
  if (doneStatuses.has(String(task.status).toLowerCase())) {
    items.push({
      id: `task-complete-${task.id}`,
      type: 'task_updated',
      title: labels.taskCompleted,
      description: `status=${task.status}`,
      created_at: task.updated_at,
      metadata: { terminal: true },
    });
  } else if (new Date(task.updated_at).getTime() - new Date(task.created_at).getTime() > 2000) {
    items.push({
      id: `task-updated-${task.id}`,
      type: 'task_updated',
      title: labels.taskUpdated,
      description: `status=${task.status}`,
      created_at: task.updated_at,
      metadata: {},
    });
  }

  const invoiceIdsFromLogs = new Set<string>();
  for (const lg of logs) {
    if (lg.related_invoice_id) invoiceIdsFromLogs.add(lg.related_invoice_id);
  }

  for (const lg of logs) {
    const summaryTitle = (lg.title && lg.title.trim()) || clip(lg.body, 80);
    items.push({
      id: `log-${lg.id}`,
      type: 'log',
      title: summaryTitle,
      description: [lg.category ? `[${lg.category}]` : '', lg.body].filter(Boolean).join(' ').trim(),
      created_at: lg.created_at,
      actor_name: lg.author_name,
      metadata: { log_id: lg.id, category: lg.category, related_invoice_id: lg.related_invoice_id },
    });
  }

  const seenInvoiceEvents = new Set<string>();
  const addInvoiceEvent = (invId: string, source: 'task' | 'log') => {
    if (seenInvoiceEvents.has(invId)) return;
    seenInvoiceEvents.add(invId);
    const inv = invoices.get(invId);
    if (!inv) return;
    items.push({
      id: `invoice-${invId}-${source}`,
      type: 'invoice',
      title: inv.vendor_name,
      description: [
        inv.invoice_number ? `#${inv.invoice_number}` : '',
        `${inv.total_amount}`,
        inv.status,
      ]
        .filter(Boolean)
        .join(' · '),
      created_at: inv.invoice_date || inv.created_at,
      metadata: {
        invoice_id: invId,
        source: source === 'task' ? labels.invoiceFromTask : labels.invoiceFromLog,
        amount: inv.total_amount,
      },
    });
  };

  if (taskRelatedInvoiceId) addInvoiceEvent(taskRelatedInvoiceId, 'task');
  for (const lid of invoiceIdsFromLogs) addInvoiceEvent(lid, 'log');

  for (const a of invoiceAudit) {
    const isApprove = a.action === 'approve';
    items.push({
      id: `approval-${a.id}`,
      type: 'approval',
      title: isApprove ? labels.approvalApprovedTitle : `${labels.approvalPrefix}: ${a.action}`,
      description: isApprove
        ? a.notes?.trim() || undefined
        : [a.old_status && a.new_status ? `${a.old_status} → ${a.new_status}` : '', a.notes].filter(Boolean).join(' · ') || undefined,
      created_at: a.created_at,
      actor_name: a.actor_name,
      metadata: { invoice_id: a.invoice_id, audit_id: a.id, action: a.action },
    });
  }

  for (const att of attachments ?? []) {
    items.push({
      id: `attachment-${att.id}`,
      type: 'attachment',
      title: getAttachmentEventTitle(att.category, localeEn),
      description: att.file_name,
      created_at: att.created_at,
      metadata: {
        attachment_id: att.id,
        file_path: att.file_path,
        category: att.category,
        file_type: att.file_type,
        is_image: isImageFile(att.file_type, att.file_name),
      },
    });
  }

  items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  return items;
}
