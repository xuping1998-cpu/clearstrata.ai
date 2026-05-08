import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';
import { buildTimelineItems, type TimelineItem } from '../../lib/taskTimeline';
import { RepairBeforeAfterCard } from '../../components/property-admin/RepairBeforeAfterCard';
import { TaskAttachmentsSection, type TaskAttachmentRow } from '../../components/property-admin/TaskAttachmentsSection';
import { TaskCommentsSection } from '../../components/property-admin/TaskCommentsSection';
import { QuoteVariancePanel } from '../../components/finance/QuoteVariancePanel';
import { TaskInvoiceFeeAnomalyCard } from '../../components/property-admin/TaskInvoiceFeeAnomalyCard';
import { TaskLinkedInvoicesSection } from '../../components/property-admin/TaskLinkedInvoicesSection';
import { computeInvoiceFeeAnomaly, type FeeAnomalyState } from '../../lib/invoiceFeeAnomaly';
import { computeQuoteInvoiceVariance, type QuoteVarianceResult } from '../../lib/quoteInvoiceVariance';
import type { ManagerTaskType } from '../ManagerTasks';

function taskTypeLabel(kind: ManagerTaskType, en: boolean): string {
  const m: Record<ManagerTaskType, [string, string]> = {
    repair: ['Repair', '维修'],
    vendor: ['Vendor', '供应商'],
    invoice_review: ['Invoice review', '发票审核'],
    dispute: ['Dispute', '纠纷调解'],
  };
  return en ? m[kind][0] : m[kind][1];
}

function priorityLabel(p: string | null | undefined, en: boolean): string {
  const v = (p || 'normal').toLowerCase();
  const map: Record<string, [string, string]> = {
    low: ['Low', '低'],
    normal: ['Normal', '普通'],
    high: ['High', '高'],
    urgent: ['Urgent', '紧急'],
  };
  const pair = map[v] ?? map.normal;
  return en ? pair[0] : pair[1];
}

type TaskDetail = {
  id: string;
  property_id: string;
  task_type: ManagerTaskType;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  related_invoice_id: string | null;
  dispute_status: string | null;
  dispute_result: string | null;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
};

const STAFF_ROLES = new Set(['council', 'admin', 'manager', 'property_admin']);

function timelineTypeBadgeZh(t: TimelineItem['type'], en: boolean): string {
  const m: Record<TimelineItem['type'], [string, string]> = {
    task_created: ['Created', '任务创建'],
    task_updated: ['Updated', '任务更新'],
    log: ['Log', '工作日志'],
    invoice: ['Invoice', '发票关联'],
    approval: ['Finance audit', '财务审计'],
    attachment: ['Attachment', '附件'],
  };
  return en ? m[t][0] : m[t][1];
}

function badgeClass(t: TimelineItem['type']): string {
  switch (t) {
    case 'task_created':
      return 'bg-emerald-100 text-emerald-900';
    case 'task_updated':
      return 'bg-blue-100 text-blue-900';
    case 'log':
      return 'bg-slate-100 text-slate-800';
    case 'invoice':
      return 'bg-amber-100 text-amber-900';
    case 'approval':
      return 'bg-violet-100 text-violet-900';
    case 'attachment':
      return 'bg-teal-100 text-teal-900';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function PropertyTaskDetail() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();
  const en = language === 'en';
  const { profile } = useAuth();
  const { currentPropertyId, roleInProperty } = useProperty();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [approvalCount, setApprovalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logBody, setLogBody] = useState('');
  const [logTitle, setLogTitle] = useState('');
  const [logCategory, setLogCategory] = useState('');
  const [disputeStatus, setDisputeStatus] = useState('');
  const [disputeResult, setDisputeResult] = useState('');
  const [creatorName, setCreatorName] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [taskAttachments, setTaskAttachments] = useState<TaskAttachmentRow[]>([]);
  const [attachmentSignedUrls, setAttachmentSignedUrls] = useState<Record<string, string>>({});
  const [repairPreview, setRepairPreview] = useState<{ url: string; name: string } | null>(null);
  const [feeAnomaly, setFeeAnomaly] = useState<FeeAnomalyState | null>(null);
  const [quoteVariances, setQuoteVariances] = useState<
    { invoiceId: string; vendor: string; result: QuoteVarianceResult }[]
  >([]);

  const isStaff = roleInProperty != null && STAFF_ROLES.has(roleInProperty);

  const load = useCallback(async () => {
    if (!taskId || !currentPropertyId) return;
    setLoading(true);
    const { data: t, error: e1 } = await supabase.from('manager_tasks').select('*').eq('id', taskId).maybeSingle();
    if (e1 || !t || (t as TaskDetail).property_id !== currentPropertyId) {
      setTask(null);
      setTimeline([]);
      setFeeAnomaly(null);
      setQuoteVariances([]);
      setLoading(false);
      return;
    }
    const row = {
      ...(t as TaskDetail),
      priority: (t as { priority?: string }).priority ?? 'normal',
    };
    setTask(row);
    setDisputeStatus(row.dispute_status ?? '');
    setDisputeResult(row.dispute_result ?? '');

    const idsForProfiles = new Set<string>();
    if (row.created_by) idsForProfiles.add(row.created_by);
    if (row.assigned_to) idsForProfiles.add(row.assigned_to);

    const { data: logsRaw } = await supabase
      .from('manager_logs')
      .select('id, title, category, body, created_at, author_id, related_invoice_id')
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    const logs = logsRaw ?? [];
    for (const lg of logs) {
      if (lg.author_id) idsForProfiles.add(lg.author_id);
    }

    const profileMap = new Map<string, { full_name_en: string; full_name_zh?: string }>();
    if (idsForProfiles.size > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name_en, full_name_zh')
        .in('id', [...idsForProfiles]);
      for (const p of profs ?? []) profileMap.set(p.id, p);
    }

    if (row.created_by) {
      const p = profileMap.get(row.created_by);
      setCreatorName(p ? (en ? p.full_name_en : p.full_name_zh || p.full_name_en) : '—');
    } else setCreatorName('—');
    if (row.assigned_to) {
      const p = profileMap.get(row.assigned_to);
      setAssigneeName(p ? (en ? p.full_name_en : p.full_name_zh || p.full_name_en) : '—');
    } else setAssigneeName('—');

    const invoiceIds = new Set<string>();
    if (row.related_invoice_id) invoiceIds.add(row.related_invoice_id);
    for (const lg of logs) {
      if (lg.related_invoice_id) invoiceIds.add(lg.related_invoice_id);
    }

    const { data: taskInvoiceLinks } = await supabase.from('task_invoices').select('invoice_id').eq('task_id', taskId);
    for (const link of taskInvoiceLinks ?? []) {
      if (link.invoice_id) invoiceIds.add(link.invoice_id);
    }

    type InvoiceRowLite = {
      id: string;
      vendor_name: string;
      invoice_number: string | null;
      total_amount: number;
      invoice_date: string;
      created_at: string;
      status: string;
      category: string | null;
    };

    const invoicesMap = new Map<string, InvoiceRowLite>();
    if (invoiceIds.size > 0) {
      const { data: invs } = await supabase
        .from('invoices')
        .select('id, vendor_name, invoice_number, total_amount, invoice_date, created_at, status, category')
        .in('id', [...invoiceIds])
        .eq('property_id', currentPropertyId);
      for (const inv of invs ?? []) invoicesMap.set(inv.id, inv as InvoiceRowLite);
    }

    const primaryInvoiceId = row.related_invoice_id ?? (invoiceIds.size > 0 ? [...invoiceIds].sort()[0] : null);
    let feeState: FeeAnomalyState | null = null;
    if (primaryInvoiceId) {
      const inv = invoicesMap.get(primaryInvoiceId);
      if (inv && inv.vendor_name?.trim()) {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 12);
        const cutoffStr = cutoff.toISOString().slice(0, 10);
        const { data: histRaw } = await supabase
          .from('invoices')
          .select('id, total_amount, invoice_date, category')
          .eq('property_id', currentPropertyId)
          .eq('vendor_name', inv.vendor_name)
          .gte('invoice_date', cutoffStr);
        const historyRows = (histRaw ?? []).map((h) => ({
          id: h.id,
          total_amount: Number(h.total_amount),
          category: h.category ?? null,
        }));
        feeState = computeInvoiceFeeAnomaly({
          current: {
            id: inv.id,
            total_amount: Number(inv.total_amount),
            vendor_name: inv.vendor_name,
            category: inv.category ?? null,
            invoice_date: inv.invoice_date,
          },
          historyRows,
        });
      }
    }
    setFeeAnomaly(feeState);

    let quoteVarRows: { invoiceId: string; vendor: string; result: QuoteVarianceResult }[] = [];
    if (invoiceIds.size > 0) {
      const { data: invsWithQuote } = await supabase
        .from('invoices')
        .select('id, total_amount, quote_id, vendor_name')
        .in('id', [...invoiceIds])
        .eq('property_id', currentPropertyId)
        .not('quote_id', 'is', null);
      const qids = [...new Set((invsWithQuote ?? []).map((i) => i.quote_id).filter(Boolean))] as string[];
      const quoteAmt = new Map<string, number>();
      if (qids.length > 0) {
        const { data: quotes } = await supabase
          .from('procurement_quotes')
          .select('id, quoted_amount')
          .eq('property_id', currentPropertyId)
          .in('id', qids);
        for (const q of quotes ?? []) quoteAmt.set(q.id, Number(q.quoted_amount));
      }
      for (const row of invsWithQuote ?? []) {
        if (!row.quote_id) continue;
        const qa = quoteAmt.get(row.quote_id);
        const v = computeQuoteInvoiceVariance(qa, row.total_amount);
        if (v) {
          quoteVarRows.push({
            invoiceId: row.id,
            vendor: row.vendor_name,
            result: v,
          });
        }
      }
    }
    setQuoteVariances(quoteVarRows);

    let auditRows: {
      id: string;
      invoice_id: string;
      action: string;
      notes: string | null;
      old_status: string | null;
      new_status: string | null;
      created_at: string;
      actor_name?: string;
    }[] = [];

    if (invoiceIds.size > 0) {
      const { data: audits } = await supabase
        .from('invoice_audit_log')
        .select('id, invoice_id, action, notes, old_status, new_status, created_at, actor_id')
        .in('invoice_id', [...invoiceIds])
        .eq('property_id', currentPropertyId)
        .order('created_at', { ascending: true });

      const actorIds = [...new Set((audits ?? []).map((a) => a.actor_id).filter(Boolean))] as string[];
      const auditProfileMap = new Map<string, { full_name_en: string; full_name_zh?: string }>();
      if (actorIds.length) {
        const { data: ap } = await supabase.from('profiles').select('id, full_name_en, full_name_zh').in('id', actorIds);
        for (const p of ap ?? []) auditProfileMap.set(p.id, p);
      }
      auditRows = (audits ?? []).map((a) => ({
        id: a.id,
        invoice_id: a.invoice_id,
        action: a.action,
        notes: a.notes,
        old_status: a.old_status,
        new_status: a.new_status,
        created_at: a.created_at,
        actor_name: a.actor_id
          ? (() => {
              const p = auditProfileMap.get(a.actor_id);
              return p ? (en ? p.full_name_en : p.full_name_zh || p.full_name_en) : undefined;
            })()
          : undefined,
      }));
    }

    setApprovalCount(auditRows.length);

    const { data: attRowsRaw } = await supabase
      .from('task_attachments')
      .select('*')
      .eq('task_id', taskId)
      .eq('property_id', currentPropertyId)
      .order('created_at', { ascending: true });

    const attRows = (attRowsRaw ?? []) as TaskAttachmentRow[];
    setTaskAttachments(attRows);

    const attachmentSignUrls: Record<string, string> = {};
    await Promise.all(
      attRows.map(async (a) => {
        const { data: signed } = await supabase.storage.from('task-attachments').createSignedUrl(a.file_path, 3600);
        if (signed?.signedUrl) attachmentSignUrls[a.id] = signed.signedUrl;
      }),
    );
    setAttachmentSignedUrls(attachmentSignUrls);

    const logInputs = logs.map((lg) => ({
      id: lg.id,
      title: lg.title,
      category: lg.category,
      body: lg.body,
      created_at: lg.created_at,
      related_invoice_id: lg.related_invoice_id,
      author_name: lg.author_id
        ? (() => {
            const p = profileMap.get(lg.author_id);
            return p ? (en ? p.full_name_en : p.full_name_zh || p.full_name_en) : undefined;
          })()
        : undefined,
    }));

    const attachmentInputs = attRows.map((a) => ({
      id: a.id,
      file_name: a.file_name,
      file_path: a.file_path,
      file_type: a.file_type,
      category: a.category,
      created_at: a.created_at,
    }));

    const items = buildTimelineItems({
      task: {
        id: row.id,
        title: row.title,
        description: row.description,
        status: row.status,
        created_at: row.created_at,
        updated_at: row.updated_at,
      },
      logs: logInputs,
      taskRelatedInvoiceId: row.related_invoice_id,
      invoices: invoicesMap,
      invoiceAudit: auditRows,
      attachments: attachmentInputs,
      localeEn: en,
      labels: {
        taskCreated: en ? 'Task created' : '任务创建',
        taskUpdated: en ? 'Task updated' : '任务更新',
        taskCompleted: en ? 'Task completed / closed' : '任务完成或关闭',
        invoiceFromTask: en ? 'Linked on task' : '任务关联',
        invoiceFromLog: en ? 'Linked on log' : '日志关联',
        approvalPrefix: en ? 'Invoice audit' : '发票审核',
        approvalApprovedTitle: en ? 'Invoice approved' : '发票已通过审批',
      },
    });

    const withAttachmentUrls = items.map((it) => {
      if (it.type !== 'attachment') return it;
      const aid = it.metadata?.attachment_id as string | undefined;
      if (!aid) return it;
      return {
        ...it,
        metadata: { ...it.metadata, signed_url: attachmentSignUrls[aid] },
      };
    });

    setTimeline(withAttachmentUrls);
    setLoading(false);
  }, [taskId, currentPropertyId, en]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveDisputeFields = async () => {
    if (!taskId || !task || task.task_type !== 'dispute' || !isStaff) return;
    setSaving(true);
    const { error } = await supabase
      .from('manager_tasks')
      .update({
        dispute_status: disputeStatus.trim() || null,
        dispute_result: disputeResult.trim() || null,
      })
      .eq('id', taskId);
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    void load();
  };

  const addLog = async () => {
    if (!taskId || !task || !profile?.id || !logBody.trim()) return;
    setSaving(true);
    const payload: Record<string, unknown> = {
      property_id: task.property_id,
      task_id: taskId,
      author_id: profile.id,
      body: logBody.trim(),
    };
    if (logTitle.trim()) payload.title = logTitle.trim();
    if (logCategory.trim()) payload.category = logCategory.trim();
    const { error } = await supabase.from('manager_logs').insert(payload);
    setSaving(false);
    if (error) {
      alert(error.message);
      return;
    }
    setLogBody('');
    setLogTitle('');
    setLogCategory('');
    void load();
  };

  const sortedTimelineDesc = useMemo(() => [...timeline].reverse(), [timeline]);

  const repairBeforeAfterPair = useMemo(() => {
    const beforePhotos = taskAttachments.filter((a) => (a.category || '').trim() === 'before_photo');
    const afterPhotos = taskAttachments.filter((a) => (a.category || '').trim() === 'after_photo');
    const fb = beforePhotos[0];
    const fa = afterPhotos[0];
    if (!fb || !fa) return null;
    return { before: fb, after: fa };
  }, [taskAttachments]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <p className="text-gray-600">{en ? 'Task not found.' : '未找到任务'}</p>
        <Link to="/manager-tasks" className="mt-4 inline-block text-[#1D9E75] hover:underline">
          {en ? 'Back to list' : '返回任务列表'}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-4 inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft size={18} />
        {en ? 'Back' : '返回'}
      </button>

      <h1 className="text-2xl font-bold text-gray-900">{en ? 'Task detail' : '任务详情'}</h1>

      {/* 摘要 */}
      <div className="mt-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="text-lg font-semibold text-gray-900">{task.title || '—'}</h2>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800">
            {taskTypeLabel(task.task_type, en)}
          </span>
        </div>
        <p className="mt-3 whitespace-pre-wrap text-sm text-gray-700">{task.description || '—'}</p>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-gray-500">{en ? 'Status' : '状态'}</dt>
            <dd className="font-medium text-gray-900">{task.status}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{en ? 'Priority' : '优先级'}</dt>
            <dd className="font-medium text-gray-900">{priorityLabel(task.priority, en)}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{en ? 'Due' : '截止时间'}</dt>
            <dd className="font-medium text-gray-900">
              {task.due_date ? new Date(task.due_date).toLocaleString(en ? 'en-CA' : 'zh-CN') : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{en ? 'Created' : '创建时间'}</dt>
            <dd className="font-medium text-gray-900">
              {new Date(task.created_at).toLocaleString(en ? 'en-CA' : 'zh-CN')}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">{en ? 'Owner' : '创建人'}</dt>
            <dd className="font-medium text-gray-900">{creatorName}</dd>
          </div>
          <div>
            <dt className="text-gray-500">{en ? 'Assignee' : '负责人'}</dt>
            <dd className="font-medium text-gray-900">{assigneeName}</dd>
          </div>
        </dl>
      </div>

      {repairBeforeAfterPair ? (
        <RepairBeforeAfterCard
          beforeRow={repairBeforeAfterPair.before}
          afterRow={repairBeforeAfterPair.after}
          beforeUrl={attachmentSignedUrls[repairBeforeAfterPair.before.id]}
          afterUrl={attachmentSignedUrls[repairBeforeAfterPair.after.id]}
          en={en}
          onPreview={(url, name) => setRepairPreview({ url, name })}
        />
      ) : null}

      {feeAnomaly ? <TaskInvoiceFeeAnomalyCard state={feeAnomaly} en={en} /> : null}

      {quoteVariances.length > 0 ? (
        <div className="mt-6 space-y-4">
          <h2 className="text-lg font-bold text-gray-900">{en ? 'Quote vs invoice' : '报价对比'}</h2>
          {quoteVariances.map((row) => (
            <div key={row.invoiceId}>
              <p className="text-xs text-gray-500 mb-1">{row.vendor}</p>
              <QuoteVariancePanel result={row.result} en={en} />
            </div>
          ))}
        </div>
      ) : null}

      <TaskLinkedInvoicesSection
        taskId={task.id}
        propertyId={task.property_id}
        relatedInvoiceId={task.related_invoice_id}
        en={en}
      />

      {task.task_type === 'dispute' ? (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50/60 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">{en ? 'Dispute handling' : '纠纷处理信息'}</h2>
          <div className="mt-4 space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {en ? 'Complaint' : '投诉内容'}
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-900">{task.description || '—'}</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {en ? 'Current status' : '当前状态'}
              </div>
              {isStaff ? (
                <input
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  value={disputeStatus}
                  onChange={(e) => setDisputeStatus(e.target.value)}
                />
              ) : (
                <p className="mt-1 text-sm">{task.dispute_status ?? '—'}</p>
              )}
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                {en ? 'Result' : '处理结果'}
              </div>
              {isStaff ? (
                <textarea
                  className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  rows={3}
                  value={disputeResult}
                  onChange={(e) => setDisputeResult(e.target.value)}
                />
              ) : (
                <p className="mt-1 whitespace-pre-wrap text-sm">{task.dispute_result ?? '—'}</p>
              )}
            </div>
            {isStaff ? (
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveDisputeFields()}
                className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#178a66] disabled:opacity-50"
              >
                {saving ? (en ? 'Saving…' : '保存中…') : en ? 'Save' : '保存纠纷信息'}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* 时间线 */}
      <div className="mt-8 rounded-xl border border-emerald-100 bg-gradient-to-b from-emerald-50/40 to-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">{en ? 'Timeline' : '执行时间线'}</h2>
        <p className="mt-1 text-xs text-gray-500">
          {en
            ? 'Task events, logs, linked invoices, finance audit trail (read-only), and task attachments. Approve invoices in Expense Review.'
            : '任务事件、工作日志、关联发票、财务审计记录（invoice_audit_log，只读）及本任务附件上传记录。发票审批请在「支出审核」操作。'}
        </p>
        <ul className="mt-4 space-y-3">
          {sortedTimelineDesc.map((item) => (
            <li
              key={item.id}
              className="rounded-lg border border-gray-100 bg-white px-4 py-3 shadow-sm"
            >
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className={`rounded-full px-2 py-0.5 font-medium ${badgeClass(item.type)}`}>
                  {timelineTypeBadgeZh(item.type, en)}
                </span>
                <span className="text-gray-500">
                  {new Date(item.created_at).toLocaleString(en ? 'en-CA' : 'zh-CN')}
                </span>
                {item.actor_name ? (
                  <span className="text-gray-600">
                    {en ? 'By' : '操作人'}：{item.actor_name}
                  </span>
                ) : null}
              </div>
              {item.type === 'attachment' ? (
                <div className="mt-2 flex gap-3 sm:items-start">
                  {item.metadata?.signed_url && item.metadata?.is_image ? (
                    <button
                      type="button"
                      onClick={() =>
                        window.open(String(item.metadata?.signed_url), '_blank', 'noopener,noreferrer')
                      }
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1D9E75]"
                    >
                      <img
                        src={String(item.metadata?.signed_url)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{item.title}</p>
                    {item.description ? (
                      <p className="mt-1 text-sm text-gray-600 break-all">{item.description}</p>
                    ) : null}
                    {item.metadata?.signed_url ? (
                      <button
                        type="button"
                        onClick={() =>
                          window.open(String(item.metadata?.signed_url), '_blank', 'noopener,noreferrer')
                        }
                        className="mt-1 text-sm font-medium text-[#1D9E75] hover:underline"
                      >
                        {en ? 'Open attachment' : '打开附件'}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                <>
                  <p className="mt-1 font-medium text-gray-900">{item.title}</p>
                  {item.description ? (
                    <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{item.description}</p>
                  ) : null}
                  {item.type === 'invoice' && item.metadata?.source ? (
                    <p className="mt-1 text-xs text-amber-800">{String(item.metadata.source)}</p>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
        {timeline.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">{en ? 'No timeline entries.' : '暂无时间线数据'}</p>
        ) : null}
      </div>

      <div className="mt-4 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600">
        <span className="font-medium text-gray-800">{en ? 'Invoice approval' : '发票审批'}</span>
        {' · '}
        {en
          ? 'Performed only in Expense Review. The timeline above shows audit history for linked invoices (read-only).'
          : '请在「支出审核」进行审核/驳回/标记付款；上方时间线仅展示已有关联发票的审计记录（只读）。'}
        {approvalCount === 0 ? (
          <span className="block mt-1 text-amber-800">
            {en ? 'No finance audit entries for linked invoices yet.' : '当前关联发票暂无财务审计时间线。'}
          </span>
        ) : null}
      </div>

      <TaskCommentsSection taskId={task.id} propertyId={task.property_id} canPost={isStaff} en={en} />

      <TaskAttachmentsSection
        taskId={task.id}
        propertyId={task.property_id}
        canUpload={isStaff}
        en={en}
        onAttachmentsChange={() => void load()}
      />

      {/* 写日志 */}
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">{en ? 'Add work log' : '添加工作日志'}</h2>
        <p className="mt-1 text-xs text-gray-500">
          {en ? 'Stored in manager_logs with task_id (related_task_id).' : '写入 manager_logs，字段 task_id 即关联当前任务。'}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder={en ? 'Title (optional)' : '日志标题（可选）'}
            value={logTitle}
            onChange={(e) => setLogTitle(e.target.value)}
          />
          <input
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder={en ? 'Category (optional)' : '分类（可选）'}
            value={logCategory}
            onChange={(e) => setLogCategory(e.target.value)}
          />
        </div>
        <textarea
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          rows={3}
          placeholder={en ? 'Log content' : '日志内容'}
          value={logBody}
          onChange={(e) => setLogBody(e.target.value)}
        />
        <button
          type="button"
          disabled={saving || !logBody.trim()}
          onClick={() => void addLog()}
          className="mt-2 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? (en ? 'Saving…' : '保存中…') : en ? 'Save log' : '保存日志'}
        </button>
      </div>

      {repairPreview ? (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal
          onClick={() => setRepairPreview(null)}
        >
          <button
            type="button"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setRepairPreview(null)}
            aria-label="Close"
          >
            <X size={24} />
          </button>
          <img
            src={repairPreview.url}
            alt={repairPreview.name}
            className="max-h-[90vh] max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </div>
  );
}
