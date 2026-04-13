import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  Check,
  X,
  AlertTriangle,
  Eye,
  Loader2,
  Search,
  Filter,
  Trash2,
  CheckCircle,
  Download,
  Calendar,
  FileSpreadsheet,
  FileDown,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { canManageInvoiceWorkflow, canDeleteInvoice } from '../../lib/financePermissions';
import { fetchTaskTitleByInvoiceIds, fetchTasksForInvoice, type LinkedTask } from '../../lib/invoiceTaskLinks';
import { computeQuoteInvoiceVariance, isRedAlertVariance, type QuoteVarianceResult } from '../../lib/quoteInvoiceVariance';
import { exportInvoiceApprovalPdf } from '../../lib/pdf/exportInvoiceApprovalPdf';
import { exportMonthlyAbnormalInvoicesMeetingPackPdf } from '../../lib/pdf/exportMonthlyAbnormalInvoicesMeetingPackPdf';
import { QuoteVariancePanel } from '../../components/finance/QuoteVariancePanel';
import { scheduleInvoiceAiAuditAfterInsert } from '../../lib/invoiceAudit';

interface Invoice {
  id: string;
  file_name: string | null;
  document_url: string;
  vendor_name: string;
  invoice_number: string | null;
  invoice_date: string;
  subtotal: number;
  tax_amount: number | null;
  total_amount: number;
  hst_number: string | null;
  currency: string;
  status: string;
  category: string | null;
  notes: string | null;
  has_anomalies: boolean;
  /** 规则审计引擎（与 has_anomalies 独立） */
  is_abnormal?: boolean;
  audit_summary?: Record<string, unknown> | null;
  ai_extracted_data: Record<string, unknown> | null;
  ai_confidence_score: number | null;
  uploaded_by: string;
  created_at: string;
  updated_at?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  paid_at?: string | null;
  paid_by?: string | null;
  review_notes?: string | null;
  /** 审批通过时填写的备注（danger 时必填） */
  approval_note?: string | null;
  /** 审批人（verified_by join） */
  verifier?: { full_name_en: string; full_name_zh?: string };
  /** 直接指向 manager_tasks（与 task_invoices 互补） */
  related_task_id?: string | null;
  /** 对应已批准报价，用于与实际金额对比 */
  quote_id?: string | null;
  /** 业委会/管理员正式批准后设为 true，用于未审批付款硬规则 */
  approved?: boolean | null;
  fiscal_year?: number | null;
  budget_category_id?: string | null;
  /** approved/paid 时由库计算锁定；pending 时常为 null */
  is_budget_exceeded?: boolean | null;
  uploader?: { full_name_en: string; full_name_zh?: string };
}

interface AuditEntry {
  id: string;
  action: string;
  notes: string | null;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
  actor_id: string;
  actor?: { full_name_en: string; full_name_zh?: string } | null;
}

const CATEGORIES = [
  { value: 'general', labelZh: '一般', labelEn: 'General' },
  { value: 'maintenance', labelZh: '维修', labelEn: 'Maintenance' },
  { value: 'utilities', labelZh: '水电费', labelEn: 'Utilities' },
  { value: 'insurance', labelZh: '保险', labelEn: 'Insurance' },
  { value: 'professional_services', labelZh: '专业服务', labelEn: 'Professional' },
  { value: 'cleaning', labelZh: '清洁', labelEn: 'Cleaning' },
  { value: 'landscaping', labelZh: '绿化', labelEn: 'Landscaping' },
  { value: 'security', labelZh: '安保', labelEn: 'Security' },
  { value: 'elevator', labelZh: '电梯', labelEn: 'Elevator' },
  { value: 'plumbing', labelZh: '管道', labelEn: 'Plumbing' },
  { value: 'electrical', labelZh: '电气', labelEn: 'Electrical' },
];

function quoteVarianceBadgeClass(v: QuoteVarianceResult): string {
  switch (v.warningLevel) {
    case 'danger':
      return 'bg-red-100 text-red-800 ring-1 ring-red-200';
    case 'warning':
      return 'bg-amber-100 text-amber-900';
    default:
      return 'bg-emerald-50 text-emerald-800';
  }
}

function quoteVarianceShortLabel(v: QuoteVarianceResult, l: boolean): string {
  if (v.belowQuote) return l ? 'Below quote' : '低于报价';
  switch (v.warningLevel) {
    case 'danger':
      return l ? 'High Δ' : '明显偏高';
    case 'warning':
      return l ? 'Check' : '偏高';
    default:
      return l ? 'OK' : '正常';
  }
}

function statusStyle(status: string): { labelZh: string; labelEn: string; className: string } {
  const map: Record<string, { labelZh: string; labelEn: string; className: string }> = {
    pending_upload: { labelZh: '上传中', labelEn: 'Uploading', className: 'bg-gray-100 text-gray-700' },
    ai_processing: { labelZh: 'AI识别中', labelEn: 'AI processing', className: 'bg-slate-100 text-slate-700' },
    pending_review: { labelZh: '待审核', labelEn: 'Pending review', className: 'bg-blue-100 text-blue-800' },
    approved: { labelZh: '已批准', labelEn: 'Approved', className: 'bg-green-100 text-green-800' },
    paid: { labelZh: '已付款', labelEn: 'Paid', className: 'bg-cyan-100 text-cyan-800' },
    rejected: { labelZh: '已拒绝', labelEn: 'Rejected', className: 'bg-red-100 text-red-800' },
    flagged: { labelZh: '异常', labelEn: 'Exception', className: 'bg-red-100 text-red-800 ring-1 ring-red-200' },
    ai_extraction_failed: { labelZh: '识别失败', labelEn: 'Extraction failed', className: 'bg-orange-100 text-orange-800' },
  };
  return map[status] || map.pending_review;
}

type InvoiceAiAuditRow = {
  id?: string;
  invoice_id: string;
  risk_level: string;
  risk_score: number;
  ai_summary_zh: string;
  ai_summary_en: string;
  ai_reasons: unknown;
  ai_recommendations: unknown;
  model_name: string | null;
  status: string;
  updated_at: string;
};

function pickPreferredAiAudit(rows: InvoiceAiAuditRow[]): InvoiceAiAuditRow | null {
  if (rows.length === 0) return null;
  const open = rows.filter((r) => r.status === 'open');
  if (open.length === 1) return open[0];
  if (open.length > 1) {
    return open.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
  }
  return rows.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];
}

function parseReasonItem(raw: unknown, l: boolean): { title: string; detail: string } {
  if (typeof raw === 'string') {
    return { title: l ? 'Note' : '说明', detail: raw };
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const title = l
      ? String(o.title_en ?? o.title_zh ?? o.title ?? '—')
      : String(o.title_zh ?? o.title_en ?? o.title ?? '—');
    const detail = l
      ? String(o.explanation_en ?? o.explanation_zh ?? o.detail ?? o.message ?? '')
      : String(o.explanation_zh ?? o.explanation_en ?? o.detail ?? o.message ?? '');
    return { title, detail };
  }
  return { title: '—', detail: '' };
}

function parseRecItem(raw: unknown, l: boolean): { title: string; action: string } {
  if (typeof raw === 'string') {
    return { title: l ? 'Action' : '建议', action: raw };
  }
  if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const title = l
      ? String(o.title_en ?? o.title_zh ?? o.title ?? '—')
      : String(o.title_zh ?? o.title_en ?? o.title ?? '—');
    const action = l
      ? String(o.action_en ?? o.action_zh ?? o.action ?? '')
      : String(o.action_zh ?? o.action_en ?? o.action ?? '');
    return { title, action };
  }
  return { title: '—', action: '' };
}

function riskLevelBadgeClass(level: string): string {
  switch (level) {
    case 'low':
      return 'bg-emerald-100 text-emerald-900 ring-1 ring-emerald-200';
    case 'medium':
      return 'bg-amber-100 text-amber-900 ring-1 ring-amber-200';
    case 'high':
      return 'bg-orange-100 text-orange-950 ring-1 ring-orange-200';
    case 'critical':
      return 'bg-red-100 text-red-900 ring-1 ring-red-300';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function riskLevelLabel(level: string, l: boolean): string {
  const m: Record<string, { zh: string; en: string }> = {
    low: { zh: '低风险', en: 'Low' },
    medium: { zh: '中风险', en: 'Medium' },
    high: { zh: '高风险', en: 'High' },
    critical: { zh: '严重风险', en: 'Critical' },
  };
  const hit = m[level];
  if (hit) return l ? hit.en : hit.zh;
  return level;
}

function aiRiskShortLabel(level: string, l: boolean): string {
  const m: Record<string, { zh: string; en: string }> = {
    low: { zh: '低', en: 'L' },
    medium: { zh: '中', en: 'M' },
    high: { zh: '高', en: 'H' },
    critical: { zh: '严重', en: '!' },
  };
  const hit = m[level];
  if (hit) return l ? hit.en : hit.zh;
  return level.slice(0, 4);
}

function AiListRiskBadge({ level, l }: { level: string; l: boolean }) {
  return (
    <span
      className={`inline-flex max-w-full items-center gap-0.5 rounded-full px-1 py-0.5 text-[9px] font-semibold sm:text-[10px] ${riskLevelBadgeClass(level)}`}
      title={l ? `AI: ${level}` : `AI：${riskLevelLabel(level, false)}`}
    >
      <Sparkles className="size-2.5 shrink-0 opacity-80 sm:size-3" aria-hidden />
      {aiRiskShortLabel(level, l)}
    </span>
  );
}

function summarizeContextJson(ctx: Record<string, unknown> | null | undefined) {
  if (!ctx || typeof ctx !== 'object') return null;
  const budget = ctx.budget_year_summary as Record<string, unknown> | undefined;
  const vendorHist = ctx.vendor_history_12m;
  const catHist = ctx.category_history_12m;
  const rules = ctx.rule_audit_open;
  const ocr = ctx.ocr as Record<string, unknown> | undefined;
  const inv = ctx.invoice as Record<string, unknown> | undefined;
  const vendorCount = Array.isArray(vendorHist) ? vendorHist.length : 0;
  const catCount = Array.isArray(catHist) ? catHist.length : 0;
  const ruleCount = Array.isArray(rules) ? rules.length : 0;
  let ocrAvailable = false;
  if (ocr) {
    const sj = ocr.structured_json;
    const raw = ocr.raw_text;
    const hasStruct =
      sj != null &&
      sj !== 'null' &&
      (typeof sj === 'object' || (typeof sj === 'string' && (sj as string).length > 2 && (sj as string) !== 'null'));
    const hasRaw = typeof raw === 'string' && raw.trim().length > 0;
    ocrAvailable = Boolean(hasStruct || hasRaw);
  }
  const fiscalYear = budget?.fiscal_year;
  const remaining = budget?.remaining_budget;
  const catId = inv?.resolved_budget_category_id;
  return {
    fiscalYear: typeof fiscalYear === 'number' ? fiscalYear : null,
    remainingBudget: typeof remaining === 'number' ? remaining : null,
    budgetCategoryId: typeof catId === 'string' ? catId : null,
    vendorCount,
    categoryCount: catCount,
    ruleCount,
    ocrAvailable,
  };
}

function createdAtInCurrentMonth(createdAt: string): boolean {
  const c = new Date(createdAt);
  if (Number.isNaN(c.getTime())) return false;
  const now = new Date();
  return c.getFullYear() === now.getFullYear() && c.getMonth() === now.getMonth();
}

export function InvoiceManagement({
  highlightInvoiceId,
  dangerFilterOnly = false,
  auditFilterOnly = false,
  abnormalFilterOnly = false,
  highRiskFilterOnly = false,
  rangeThisMonthOnly = false,
}: {
  highlightInvoiceId?: string | null;
  /** 仅显示「明显高于报价」的红色预警发票（首页「查看全部」） */
  dangerFilterOnly?: boolean;
  /** 仅显示审计规则标记异常的发票（首页审计卡片） */
  auditFilterOnly?: boolean;
  /** 预算/科目异常或规则标记异常（与首页 KPI 深链 filter=abnormal 对齐） */
  abnormalFilterOnly?: boolean;
  /** 高风险：红色报价偏差、审计异常、异常状态或预算超支标记 */
  highRiskFilterOnly?: boolean;
  /** 与 abnormal 等组合：仅保留创建时间落在本自然月的发票 */
  rangeThisMonthOnly?: boolean;
} = {}) {
  const { profile } = useAuth();
  const { currentPropertyId, memberships, roleInProperty } = useProperty();
  const { language } = useLanguage();
  const l = language === 'en';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadAiHint, setUploadAiHint] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Invoice | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [invoiceTaskSource, setInvoiceTaskSource] = useState<
    Record<string, { taskId: string; title: string }>
  >({});
  const [quoteVarianceByInvoiceId, setQuoteVarianceByInvoiceId] = useState<Record<string, QuoteVarianceResult>>({});
  /** 关联报价是否超预算承诺（pending 审批时可读，用于必填审批理由） */
  const [quoteOverBudgetByInvoiceId, setQuoteOverBudgetByInvoiceId] = useState<Record<string, boolean>>({});
  const [exportingMeetingPack, setExportingMeetingPack] = useState(false);

  const canAudit = canManageInvoiceWorkflow(roleInProperty);

  const loadInvoices = useCallback(async () => {
    if (!currentPropertyId) {
      setInvoices([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select(
        '*, is_abnormal, audit_summary, uploader:profiles!invoices_uploaded_by_fkey(full_name_en, full_name_zh), verifier:profiles!invoices_verified_by_fkey(full_name_en, full_name_zh)',
      )
      .eq('property_id', currentPropertyId)
      .order('created_at', { ascending: false });
    setInvoices((data as Invoice[]) || []);
    setLoading(false);
  }, [currentPropertyId]);

  const loadInvoicesQuiet = useCallback(async () => {
    if (!currentPropertyId) return;
    const { data } = await supabase
      .from('invoices')
      .select(
        '*, is_abnormal, audit_summary, uploader:profiles!invoices_uploaded_by_fkey(full_name_en, full_name_zh), verifier:profiles!invoices_verified_by_fkey(full_name_en, full_name_zh)',
      )
      .eq('property_id', currentPropertyId)
      .order('created_at', { ascending: false });
    if (data) setInvoices(data as Invoice[]);
  }, [currentPropertyId]);

  useEffect(() => {
    void loadInvoices();
    const channel = supabase
      .channel('invoices-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        void loadInvoicesQuiet();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadInvoices, loadInvoicesQuiet]);

  useEffect(() => {
    if (!currentPropertyId || invoices.length === 0) {
      setInvoiceTaskSource({});
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const map = await fetchTaskTitleByInvoiceIds(
          currentPropertyId,
          invoices.map((i) => i.id),
        );
        if (cancelled) return;
        const obj: Record<string, { taskId: string; title: string }> = {};
        map.forEach((v, k) => {
          obj[k] = v;
        });
        setInvoiceTaskSource(obj);
      } catch (e) {
        console.error('fetchTaskTitleByInvoiceIds', e);
        if (!cancelled) setInvoiceTaskSource({});
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPropertyId, invoices]);

  useEffect(() => {
    let cancelled = false;
    if (!currentPropertyId || invoices.length === 0) {
      setQuoteVarianceByInvoiceId({});
      setQuoteOverBudgetByInvoiceId({});
      return;
    }
    const withQuote = invoices.filter((i) => i.quote_id);
    if (withQuote.length === 0) {
      setQuoteVarianceByInvoiceId({});
      setQuoteOverBudgetByInvoiceId({});
      return;
    }
    void (async () => {
      const qids = [...new Set(withQuote.map((i) => i.quote_id).filter(Boolean))] as string[];
      const { data: quotes } = await supabase
        .from('procurement_quotes')
        .select('id, quoted_amount, is_budget_exceeded')
        .in('id', qids);
      if (cancelled) return;
      const qm = new Map((quotes ?? []).map((q) => [q.id, Number(q.quoted_amount)]));
      const qBudget = new Map((quotes ?? []).map((q) => [q.id, Boolean(q.is_budget_exceeded)]));
      const out: Record<string, QuoteVarianceResult> = {};
      const overMap: Record<string, boolean> = {};
      for (const inv of withQuote) {
        if (!inv.quote_id) continue;
        const qa = qm.get(inv.quote_id);
        const v = computeQuoteInvoiceVariance(qa, inv.total_amount);
        if (v) out[inv.id] = v;
        if (qBudget.get(inv.quote_id)) overMap[inv.id] = true;
      }
      setQuoteVarianceByInvoiceId(out);
      setQuoteOverBudgetByInvoiceId(overMap);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPropertyId, invoices]);

  const [aiAuditListMap, setAiAuditListMap] = useState<
    Record<string, { risk_level: string; risk_score: number }>
  >({});

  useEffect(() => {
    if (!currentPropertyId || invoices.length === 0) {
      setAiAuditListMap({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const ids = invoices.map((i) => i.id);
      const CHUNK = 100;
      const merged: Record<
        string,
        { invoice_id: string; risk_level: string; risk_score: number; status: string; updated_at: string }
      > = {};
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from('invoice_ai_audits')
          .select('invoice_id, risk_level, risk_score, status, updated_at')
          .eq('property_id', currentPropertyId)
          .in('invoice_id', slice);
        if (cancelled) return;
        if (error) {
          setAiAuditListMap({});
          return;
        }
        for (const row of data ?? []) {
          const prev = merged[row.invoice_id];
          if (!prev) {
            merged[row.invoice_id] = row;
          } else {
            const prefer =
              row.status === 'open' && prev.status !== 'open'
                ? row
                : new Date(row.updated_at) > new Date(prev.updated_at)
                  ? row
                  : prev;
            merged[row.invoice_id] = prefer;
          }
        }
      }
      if (cancelled) return;
      setAiAuditListMap(
        Object.fromEntries(
          Object.entries(merged).map(([k, v]) => [
            k,
            { risk_level: v.risk_level, risk_score: Number(v.risk_score) },
          ]),
        ),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [invoices, currentPropertyId]);

  const [hybridAuditByInvoiceId, setHybridAuditByInvoiceId] = useState<
    Record<string, { over_budget: boolean; bypass_approval: boolean; ai_high: boolean }>
  >({});

  const [hybridAuditTick, setHybridAuditTick] = useState(0);

  useEffect(() => {
    if (!currentPropertyId) return;
    const channel = supabase
      .channel(`invoice-ai-results-${currentPropertyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoice_ai_audit_results',
          filter: `property_id=eq.${currentPropertyId}`,
        },
        () => setHybridAuditTick((n) => n + 1),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentPropertyId]);

  useEffect(() => {
    if (!currentPropertyId || invoices.length === 0) {
      setHybridAuditByInvoiceId({});
      return;
    }
    let cancelled = false;
    const ids = invoices.map((i) => i.id);
    void (async () => {
      const { data, error } = await supabase
        .from('invoice_ai_audit_results')
        .select('invoice_id, risk_score, over_budget, bypass_approval')
        .eq('property_id', currentPropertyId)
        .in('invoice_id', ids);
      if (cancelled) return;
      if (error) {
        if (import.meta.env.DEV) {
          console.warn('[invoices] hybrid audit flags', error.message);
        }
        setHybridAuditByInvoiceId({});
        return;
      }
      const m: Record<string, { over_budget: boolean; bypass_approval: boolean; ai_high: boolean }> = {};
      for (const r of data ?? []) {
        const id = r.invoice_id as string;
        const rs = Number(r.risk_score) || 0;
        m[id] = {
          over_budget: r.over_budget === true,
          bypass_approval: r.bypass_approval === true,
          ai_high: rs > 0.6,
        };
      }
      setHybridAuditByInvoiceId(m);
    })();
    return () => {
      cancelled = true;
    };
  }, [invoices, currentPropertyId, hybridAuditTick]);

  useEffect(() => {
    if (!highlightInvoiceId || invoices.length === 0) return;
    const inv = invoices.find((i) => i.id === highlightInvoiceId);
    if (inv) setSelectedInvoice(inv);
  }, [highlightInvoiceId, invoices]);

  const logAudit = async (
    invoiceId: string,
    action: string,
    opts?: { notes?: string; oldStatus?: string; newStatus?: string }
  ) => {
    if (!profile || !canAudit || !currentPropertyId) return;
    await supabase.from('invoice_audit_log').insert({
      property_id: currentPropertyId,
      invoice_id: invoiceId,
      actor_id: profile.id,
      action,
      notes: opts?.notes ?? null,
      old_status: opts?.oldStatus ?? null,
      new_status: opts?.newStatus ?? null,
    });
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = () => reject(new Error(l ? 'Read failed' : '文件读取失败'));
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile || !currentPropertyId) return;

    setUploading(true);
    setUploadProgress(l ? 'Reading file...' : '正在读取文件...');

    try {
      const fileBase64 = await readFileAsBase64(file);
      setUploadProgress(l ? 'AI extracting (~10s)...' : 'AI识别中（约10秒）...');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoice-ocr`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileBase64,
          mimeType: file.type || 'application/pdf',
        }),
      });

      const data = await response.json();
      if (!data.success || !data.extracted) {
        const err = data as {
          message?: string;
          message_zh?: string;
          error?: string;
        };
        const msgEn = typeof err.message === 'string' ? err.message.trim() : '';
        const msgZh = typeof err.message_zh === 'string' ? err.message_zh.trim() : '';

        let hint = '';
        if (l) {
          if (msgEn) hint = msgEn;
          else if (msgZh) hint = msgZh;
        } else {
          if (msgZh) hint = msgZh;
          else if (msgEn) hint = msgEn;
        }

        if (!hint) {
          if (err.error === 'PDF_OCR_UNAVAILABLE') {
            hint = l
              ? 'PDF OCR is not enabled yet. Please upload an image instead.'
              : '当前暂不支持直接识别 PDF，请先上传 JPG 或 PNG 图片。';
          } else if (err.error === 'AI_QUOTA_EXCEEDED') {
            hint = l
              ? 'AI recognition is temporarily unavailable. Please check service quota and try again.'
              : 'AI 识别暂时不可用，请检查服务额度后再试。';
          } else if (err.error === 'AI_OCR_FAILED') {
            hint = l
              ? 'AI recognition is temporarily unavailable. Please try again later.'
              : 'AI 识别暂时不可用，请稍后再试。';
          } else {
            hint = l ? 'Could not process this file.' : '无法处理该文件。';
          }
        }
        throw new Error(hint);
      }

      const ex = data.extracted as {
        vendor?: string;
        invoice_number?: string;
        invoice_date?: string;
        total_amount?: string;
        tax_amount?: string;
        currency?: string;
        summary?: string;
        raw_text?: string;
        items?: Array<{ description?: string; amount?: string }>;
      };

      const structured = data.structured as
        | {
            vendor?: string;
            amount?: string;
            date?: string;
            items?: Array<{ description?: string; amount?: string }>;
          }
        | undefined;

      const parseAmount = (s: unknown): number => {
        if (typeof s === 'number' && Number.isFinite(s)) return s;
        if (typeof s !== 'string') return 0;
        const cleaned = s.replace(/[^\d.-]/g, '');
        const n = parseFloat(cleaned);
        return Number.isFinite(n) ? n : 0;
      };

      const total = parseAmount(ex.total_amount);
      const tax = parseAmount(ex.tax_amount);
      const subtotal = Math.max(0, total - tax);

      const line_items: { description: string; amount: number }[] = Array.isArray(ex.items)
        ? ex.items.map((it) => ({
            description: String(it?.description ?? ''),
            amount: parseAmount(it?.amount),
          }))
        : [];

      const extracted = {
        vendor_name: ex.vendor || (l ? 'Unknown vendor' : '未知供应商'),
        invoice_number: ex.invoice_number || null,
        invoice_date: ex.invoice_date || new Date().toISOString().split('T')[0],
        due_date: null as string | null,
        subtotal,
        tax_amount: tax,
        total_amount: total,
        hst_number: null as string | null,
        currency: ex.currency || 'CAD',
        category: 'general',
        description: ex.summary || null,
        line_items,
        has_anomalies: false,
        anomaly_notes: '',
        raw_text: ex.raw_text || '',
      };

      const invDateStr = extracted.invoice_date || new Date().toISOString().split('T')[0];
      const fiscalYear =
        parseInt(String(invDateStr).slice(0, 4), 10) || new Date().getFullYear();
      setUploadProgress(l ? 'Uploading file...' : '正在上传文件...');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `invoices/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from('documents').getPublicUrl(filePath);

      setUploadProgress(l ? 'Saving...' : '正在保存记录...');

      const { data: insertedInvoice, error: dbError } = await supabase
        .from('invoices')
        .insert({
        property_id: currentPropertyId,
        file_name: file.name,
        document_url: pub.publicUrl,
        vendor_name: extracted.vendor_name || (l ? 'Unknown vendor' : '未知供应商'),
        invoice_number: extracted.invoice_number || null,
        invoice_date: extracted.invoice_date || new Date().toISOString().split('T')[0],
        due_date: extracted.due_date || null,
        subtotal: extracted.subtotal ?? 0,
        tax_amount: extracted.tax_amount ?? 0,
        total_amount: extracted.total_amount ?? 0,
        hst_number: extracted.hst_number || null,
        currency: extracted.currency || 'CAD',
        category: extracted.category || 'general',
        notes: extracted.description || null,
        has_anomalies: Boolean(extracted.has_anomalies),
        ai_extracted_data: extracted,
        ai_confidence_score: 0.85,
        uploaded_by: profile.id,
        status: 'pending_review',
        fiscal_year: fiscalYear,
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      const invoiceId = (insertedInvoice as { id: string } | null)?.id;
      if (!invoiceId) {
        throw new Error(l ? 'Missing invoice id after insert' : '发票保存后缺少invoice_id');
      }

      // 如果 AI 检测到异常：先拿到 invoiceId，再写 financial_anomalies。
      // financial_anomalies 写入失败不影响 invoices（不回滚），只记录日志。
      if (extracted.has_anomalies) {
        const anomalyNotes =
          (typeof extracted.anomaly_notes === 'string' && extracted.anomaly_notes.trim()) ||
          (typeof extracted.description === 'string' && extracted.description.trim()) ||
          (l ? 'AI detected anomalies' : 'AI检测到异常');

        try {
          const { error: anomalyError } = await supabase.from('financial_anomalies').insert({
            property_id: currentPropertyId,
            invoice_id: invoiceId,
            notes: anomalyNotes,
          });
          if (anomalyError) {
            console.error('financial_anomalies insert failed:', anomalyError);
          }
        } catch (anomalyErr) {
          console.error('financial_anomalies insert threw:', anomalyErr);
        }
      }

      try {
        const structuredPayload = structured ?? {
          vendor: extracted.vendor_name,
          amount: extracted.total_amount,
          date: extracted.invoice_date,
          items: line_items.map((x) => ({ description: x.description, amount: x.amount })),
        };
        const { error: ocrRawErr } = await supabase.from('invoice_ocr_raw').insert({
          invoice_id: invoiceId,
          property_id: currentPropertyId,
          structured_json: structuredPayload,
          raw_text: typeof ex.raw_text === 'string' ? ex.raw_text : null,
          ocr_model: 'claude-sonnet-4-20250514',
        });
        if (ocrRawErr) console.error('invoice_ocr_raw insert failed:', ocrRawErr);
      } catch (e) {
        console.error('invoice_ocr_raw insert threw:', e);
      }

      scheduleInvoiceAiAuditAfterInsert(invoiceId);
      setUploadAiHint(
        l ? 'AI audit will complete in the background. Open the invoice in a moment to see results.' : 'AI 审计稍后完成，可稍后打开发票详情查看。',
      );
      window.setTimeout(() => setUploadAiHint(''), 8000);

      setUploadProgress(l ? 'Done!' : '识别完成！');
      await loadInvoices();
      setTimeout(() => setUploadProgress(''), 2000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (() => {
              try {
                return typeof err === 'string' ? err : JSON.stringify(err);
              } catch {
                return String(err);
              }
            })();
      alert((l ? 'Upload failed: ' : '上传失败：') + msg);
      setUploadProgress('');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const applyInvoiceUpdate = async (
    id: string,
    patch: Record<string, unknown>,
    audit: { action: string; notes?: string; oldStatus: string; newStatus: string }
  ) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    const { error } = await supabase.from('invoices').update(patch).eq('id', id);
    if (error) {
      alert(l ? 'Update failed: ' + error.message : '更新失败：' + error.message);
      return;
    }
    await logAudit(id, audit.action, {
      notes: audit.notes,
      oldStatus: audit.oldStatus,
      newStatus: audit.newStatus,
    });
    await loadInvoicesQuiet();
    setSelectedInvoice((prev) =>
      prev?.id === id ? { ...prev, ...(patch as Partial<Invoice>), status: String(patch.status || prev.status) } : prev
    );
  };

  const approveInvoice = async (id: string, approvalNotes?: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv || !profile) return;
    let variance: QuoteVarianceResult | null = quoteVarianceByInvoiceId[inv.id] ?? null;
    let quoteOverBudget = inv.quote_id ? Boolean(quoteOverBudgetByInvoiceId[inv.id]) : false;
    if (inv.quote_id && (variance == null || !quoteOverBudget)) {
      const { data: q } = await supabase
        .from('procurement_quotes')
        .select('quoted_amount, is_budget_exceeded')
        .eq('id', inv.quote_id)
        .maybeSingle();
      if (variance == null) {
        variance = computeQuoteInvoiceVariance(q != null ? Number(q.quoted_amount) : null, inv.total_amount);
      }
      if (q?.is_budget_exceeded === true) quoteOverBudget = true;
    }
    const trimmed = approvalNotes?.trim();
    const needsReasonForVariance = variance?.warningLevel === 'danger';
    if ((needsReasonForVariance || quoteOverBudget) && !trimmed) {
      alert(l ? 'Please enter an approval reason.' : '必须填写审批理由');
      return;
    }
    await applyInvoiceUpdate(
      id,
      {
        status: 'approved',
        approved: true,
        verified_by: profile.id,
        verified_at: new Date().toISOString(),
        approval_note: trimmed || null,
        review_notes: null,
        updated_at: new Date().toISOString(),
      },
      { action: 'approve', notes: trimmed || undefined, oldStatus: inv.status, newStatus: 'approved' }
    );
  };

  /** 列表快捷通过：红色预警或报价超预算必须先打开详情填写理由 */
  const approveInvoiceFromList = async (inv: Invoice) => {
    let v: QuoteVarianceResult | null = quoteVarianceByInvoiceId[inv.id] ?? null;
    let quoteOverBudget = inv.quote_id ? Boolean(quoteOverBudgetByInvoiceId[inv.id]) : false;
    if (inv.quote_id && (v == null || !quoteOverBudget)) {
      const { data: q } = await supabase
        .from('procurement_quotes')
        .select('quoted_amount, is_budget_exceeded')
        .eq('id', inv.quote_id)
        .maybeSingle();
      if (v == null) {
        v = computeQuoteInvoiceVariance(q != null ? Number(q.quoted_amount) : null, inv.total_amount);
      }
      if (q?.is_budget_exceeded === true) quoteOverBudget = true;
    }
    if (v?.warningLevel === 'danger' || quoteOverBudget) {
      alert(
        l
          ? 'Open details and enter an approval reason before approving.'
          : '必须填写审批理由',
      );
      setSelectedInvoice(inv);
      return;
    }
    void approveInvoice(inv.id);
  };

  const submitReject = async () => {
    if (!rejectTarget || !profile) return;
    setRejectSubmitting(true);
    try {
      await applyInvoiceUpdate(
        rejectTarget.id,
        {
          status: 'flagged',
          review_notes: rejectNote.trim() || null,
          verified_by: profile.id,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          action: 'reject',
          notes: rejectNote.trim() || undefined,
          oldStatus: rejectTarget.status,
          newStatus: 'flagged',
        }
      );
      setRejectTarget(null);
      setRejectNote('');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const markPaid = async (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv || !profile) return;
    await applyInvoiceUpdate(
      id,
      {
        status: 'paid',
        paid_by: profile.id,
        paid_at: new Date().toISOString(),
        approved: inv.status === 'approved' || inv.approved === true,
        updated_at: new Date().toISOString(),
      },
      { action: 'mark_paid', oldStatus: inv.status, newStatus: 'paid' }
    );
  };

  const handleDelete = async (invoice: Invoice) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
      if (error) throw error;
      await loadInvoicesQuiet();
      if (selectedInvoice?.id === invoice.id) setSelectedInvoice(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      alert((l ? 'Delete failed: ' : '删除失败：') + msg);
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      if (dangerFilterOnly) {
        const v = quoteVarianceByInvoiceId[inv.id];
        if (!isRedAlertVariance(v)) return false;
      }
      if (auditFilterOnly && !inv.is_abnormal) return false;
      if (abnormalFilterOnly) {
        const flag = inv.budget_anomaly_flag != null && String(inv.budget_anomaly_flag).trim() !== '';
        if (!inv.is_abnormal && !flag) return false;
        if (rangeThisMonthOnly && !createdAtInCurrentMonth(inv.created_at)) return false;
      }
      if (highRiskFilterOnly) {
        const v = quoteVarianceByInvoiceId[inv.id];
        const redVar = isRedAlertVariance(v);
        const flag = inv.budget_anomaly_flag != null && String(inv.budget_anomaly_flag).trim() !== '';
        const abnormalish = Boolean(inv.is_abnormal) || flag;
        const flagged = inv.status === 'flagged';
        const budgetEx = inv.is_budget_exceeded === true;
        if (!redVar && !abnormalish && !flagged && !budgetEx) return false;
        if (rangeThisMonthOnly && !abnormalFilterOnly && !createdAtInCurrentMonth(inv.created_at)) return false;
      }
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        inv.vendor_name?.toLowerCase().includes(q) ||
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.file_name?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      const d = inv.invoice_date;
      const matchFrom = !dateFrom || d >= dateFrom;
      const matchTo = !dateTo || d <= dateTo;
      return matchSearch && matchStatus && matchFrom && matchTo;
    });
  }, [
    invoices,
    searchTerm,
    statusFilter,
    dateFrom,
    dateTo,
    dangerFilterOnly,
    auditFilterOnly,
    abnormalFilterOnly,
    highRiskFilterOnly,
    rangeThisMonthOnly,
    quoteVarianceByInvoiceId,
  ]);

  const statusCounts = useMemo(() => {
    return invoices.reduce(
      (acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [invoices]);

  const exportRows = (asExcel: boolean) => {
    const headers = l
      ? ['Vendor', 'Invoice #', 'Date', 'Subtotal', 'Tax', 'Total', 'Category', 'Status']
      : ['供应商', '发票号', '日期', '税前', '税额', '总计', '分类', '状态'];
    const rows = filtered.map((inv) => {
      const st = statusStyle(inv.status);
      const cat = CATEGORIES.find((c) => c.value === inv.category);
      const catLabel = l ? cat?.labelEn ?? inv.category : cat?.labelZh ?? inv.category;
      return [
        inv.vendor_name,
        inv.invoice_number || '',
        inv.invoice_date,
        Number(inv.subtotal).toFixed(2),
        Number(inv.tax_amount || 0).toFixed(2),
        Number(inv.total_amount).toFixed(2),
        catLabel || '',
        l ? st.labelEn : st.labelZh,
      ];
    });
    const esc = (cell: string | number) => {
      const s = String(cell);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const sep = asExcel ? '\t' : ',';
    const lines = [headers.join(sep), ...rows.map((r) => r.map(esc).join(sep))];
    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], {
      type: asExcel ? 'application/vnd.ms-excel;charset=utf-8' : 'text/csv;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = asExcel
      ? `invoices-${new Date().toISOString().slice(0, 10)}.xls`
      : `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const catLabel = (value: string | null | undefined) => {
    const c = CATEGORIES.find((x) => x.value === value);
    if (!c) return value || '-';
    return l ? c.labelEn : c.labelZh;
  };

  const handleExportMeetingPackPdf = async () => {
    if (!currentPropertyId) return;
    setExportingMeetingPack(true);
    try {
      const propertyName =
        memberships.find((m) => m.propertyId === currentPropertyId)?.name ?? (l ? 'Property' : '物业');
      await exportMonthlyAbnormalInvoicesMeetingPackPdf({
        zh: !l,
        propertyId: currentPropertyId,
        propertyName,
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'NO_ABNORMAL_IN_MONTH') {
        alert(l ? 'No abnormal invoices to export for this month.' : '当前月份暂无异常发票可导出');
        return;
      }
      console.error('exportMonthlyAbnormalInvoicesMeetingPackPdf', e);
      alert(l ? 'Export failed.' : '导出失败');
    } finally {
      setExportingMeetingPack(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-[#1D9E75]" size={32} />
      </div>
    );
  }

  return (
    <div className="mx-0 min-w-0 w-full max-w-none space-y-6">
      {dangerFilterOnly && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 flex flex-wrap items-center gap-2 justify-between">
          <span>
            {l
              ? 'Filtered: red-alert invoices only (≥20% above approved quote).'
              : '当前筛选：红色预警发票（发票金额较批复报价高出 ≥20%）。'}
          </span>
          <Link to="/finance?tab=invoices" className="font-semibold text-[#1D9E75] hover:underline shrink-0">
            {l ? 'Show all invoices' : '查看全部发票'}
          </Link>
        </div>
      )}
      {auditFilterOnly && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 flex flex-wrap items-center gap-2 justify-between">
          <span>
            {l
              ? 'Filtered: audit-flagged invoices only (automatic rules).'
              : '当前筛选：审计规则标记的异常发票。'}
          </span>
          <Link to="/finance?tab=invoices" className="font-semibold text-[#1D9E75] hover:underline shrink-0">
            {l ? 'Show all invoices' : '查看全部发票'}
          </Link>
        </div>
      )}
      {abnormalFilterOnly && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-950 flex flex-wrap items-center gap-2 justify-between">
          <span>
            {l
              ? `Filtered: abnormal invoices${rangeThisMonthOnly ? ' (created this month)' : ''}.`
              : `当前筛选：异常发票${rangeThisMonthOnly ? '（本月创建）' : ''}。`}
          </span>
          <Link to="/finance?tab=invoices" className="font-semibold text-[#1D9E75] hover:underline shrink-0">
            {l ? 'Show all invoices' : '查看全部发票'}
          </Link>
        </div>
      )}
      {highRiskFilterOnly && !abnormalFilterOnly && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 flex flex-wrap items-center gap-2 justify-between">
          <span>
            {l
              ? 'Filtered: high-risk invoices (quote variance, audit flags, exceptions, or budget exceeded).'
              : '当前筛选：高风险发票（报价偏差、审计/科目异常、流程异常或预算超支标记）。'}
          </span>
          <Link to="/finance?tab=invoices" className="font-semibold text-[#1D9E75] hover:underline shrink-0">
            {l ? 'Show all invoices' : '查看全部发票'}
          </Link>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        <SummaryCard
          label={l ? 'Pending review' : '待审核'}
          value={statusCounts['pending_review'] || 0}
          className="border-l-4 border-blue-500 bg-blue-50/80"
        />
        <SummaryCard
          label={l ? 'Approved' : '已批准'}
          value={statusCounts['approved'] || 0}
          className="border-l-4 border-green-500 bg-green-50/80"
        />
        <SummaryCard
          label={l ? 'Paid' : '已付款'}
          value={statusCounts['paid'] || 0}
          className="border-l-4 border-cyan-500 bg-cyan-50/80"
        />
        <SummaryCard
          label={l ? 'Exception' : '异常'}
          value={(statusCounts['flagged'] || 0) + (statusCounts['rejected'] || 0)}
          className="border-l-4 border-red-500 bg-red-50/80"
        />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => void handleExportMeetingPackPdf()}
          disabled={exportingMeetingPack || !currentPropertyId}
          className="inline-flex max-w-full items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:py-2.5 sm:text-sm"
        >
          {exportingMeetingPack ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <FileDown className="h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0 text-left leading-snug">
            {l ? 'Export monthly meeting pack (PDF)' : '导出本月异常发票会议包 PDF'}
          </span>
        </button>
      </div>

      {uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          {uploadProgress.includes('!') || uploadProgress.includes('Done') ? (
            <CheckCircle size={20} className="text-[#1D9E75] shrink-0" />
          ) : (
            <Loader2 size={20} className="animate-spin text-blue-600 shrink-0" />
          )}
          <span className="text-sm font-medium text-blue-800">{uploadProgress}</span>
        </div>
      )}

      {uploadAiHint ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-2.5 text-xs text-slate-700">
          {uploadAiHint}
        </div>
      ) : null}

      <div className="min-w-0 rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-200 p-2.5 sm:p-3 md:p-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full shrink-0 md:w-[220px] lg:w-[240px]">
              <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={l ? 'Search vendor, invoice #...' : '搜索供应商、发票号...'}
                className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-2 text-sm focus:ring-2 focus:ring-[#1D9E75] md:py-2 md:pl-9 md:pr-3"
              />
            </div>
            <div className="flex min-w-0 shrink-0 items-center gap-1.5">
              <Filter size={16} className="shrink-0 text-gray-400" aria-hidden />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-[150px] max-w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#1D9E75] md:px-3 md:py-2"
              >
                <option value="all">{l ? 'All statuses' : '全部状态'}</option>
                {(
                  [
                    'pending_upload',
                    'ai_processing',
                    'pending_review',
                    'approved',
                    'paid',
                    'flagged',
                    'rejected',
                    'ai_extraction_failed',
                  ] as const
                ).map((key) => (
                  <option key={key} value={key}>
                    {l ? statusStyle(key).labelEn : statusStyle(key).labelZh}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Calendar size={16} className="shrink-0 text-gray-400" aria-hidden />
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[145px] max-w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#1D9E75] md:py-2"
              />
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Calendar size={16} className="w-4 shrink-0 text-gray-400 opacity-0 sm:opacity-100" aria-hidden />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[145px] max-w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:ring-2 focus:ring-[#1D9E75] md:py-2"
                title={l ? 'To' : '结束日期'}
              />
            </div>
            <div className="flex w-full flex-wrap items-center gap-2 md:ml-auto md:w-auto md:justify-end">
              <button
                type="button"
                onClick={() => exportRows(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
              >
                <FileText size={14} />
                CSV
              </button>
              <button
                type="button"
                onClick={() => exportRows(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
              >
                <FileSpreadsheet size={14} />
                Excel
              </button>
              <label
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#1D9E75] px-2.5 py-1.5 text-xs font-medium text-white transition-colors sm:gap-2 sm:px-3 sm:py-2 sm:text-sm ${
                  uploading ? 'pointer-events-none opacity-50' : 'hover:bg-[#178a66]'
                }`}
              >
                <Upload size={16} className="sm:h-[18px] sm:w-[18px]" />
                {uploading ? (l ? 'Working…' : '处理中…') : l ? 'Upload' : '上传发票'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">{l ? 'No invoices' : '暂无发票记录'}</p>
          </div>
        ) : (
          <>
            <div className="hidden max-w-full overflow-x-auto md:block [scrollbar-width:thin]">
              <table className="w-full min-w-0 max-w-full table-fixed border-collapse text-xs">
                <colgroup>
                  <col style={{ width: '17%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '74px' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '36px' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '88px' }} />
                  <col style={{ width: '88px' }} />
                </colgroup>
                <thead className="border-b border-gray-200 bg-gray-50">
                  <tr>
                    <th className="min-w-0 px-1 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:px-1.5 sm:py-2">
                      {l ? 'Vendor' : '供应商'}
                    </th>
                    <th className="min-w-0 px-1 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:px-1.5 sm:py-2">
                      {l ? 'Invoice #' : '发票号'}
                    </th>
                    <th className="whitespace-nowrap px-1 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:px-1.5 sm:py-2">
                      {l ? 'Date' : '日期'}
                    </th>
                    <th className="min-w-0 px-1 py-1.5 text-right text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:px-1.5 sm:py-2">
                      {l ? 'Total' : '总计'}
                    </th>
                    <th
                      className="min-w-0 truncate px-0.5 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:py-2"
                      title={l ? 'Quote variance' : '报价对比'}
                    >
                      {l ? 'Quote' : '报价'}
                    </th>
                    <th className="px-0 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:py-2">
                      AI
                    </th>
                    <th
                      className="min-w-0 max-w-[72px] truncate px-1 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:px-1.5 sm:py-2"
                      title={l ? 'Category' : '分类'}
                    >
                      {l ? 'Category' : '分类'}
                    </th>
                    <th
                      className="min-w-0 max-w-[72px] truncate px-1 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:px-1.5 sm:py-2"
                      title={l ? 'Source task' : '来源任务'}
                    >
                      {l ? 'Source' : '来源'}
                    </th>
                    <th
                      className="min-w-0 max-w-[88px] truncate px-1 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:px-1.5 sm:py-2"
                      title={l ? 'Status' : '状态'}
                    >
                      {l ? 'Status' : '状态'}
                    </th>
                    <th className="w-[88px] min-w-[88px] max-w-[88px] whitespace-nowrap px-0.5 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:py-2">
                      {l ? 'Actions' : '操作'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((inv) => {
                    const st = statusStyle(inv.status);
                    const qv = quoteVarianceByInvoiceId[inv.id];
                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-gray-50 cursor-pointer ${
                          inv.has_anomalies || inv.is_abnormal ? 'bg-red-50/30' : ''
                        }`}
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        <td className="min-w-0 max-w-[160px] overflow-hidden px-1 py-1.5 align-top sm:px-1.5 sm:py-2">
                          <div className="truncate text-xs font-medium text-gray-900" title={inv.vendor_name}>
                            {inv.vendor_name}
                          </div>
                          {inv.hst_number && (
                            <div className="truncate text-[10px] text-gray-500" title={`HST: ${inv.hst_number}`}>
                              HST: {inv.hst_number}
                            </div>
                          )}
                          {hybridAuditByInvoiceId[inv.id] ? (
                            <div className="mt-0.5 flex max-w-full flex-wrap gap-0.5">
                              {hybridAuditByInvoiceId[inv.id].over_budget ? (
                                <span className="rounded bg-red-100 px-1 py-px text-[9px] font-semibold leading-tight text-red-800">
                                  {l ? 'Budget' : '超预算'}
                                </span>
                              ) : null}
                              {hybridAuditByInvoiceId[inv.id].bypass_approval ? (
                                <span className="rounded bg-red-100 px-1 py-px text-[9px] font-semibold leading-tight text-red-800">
                                  {l ? 'Bypass' : '未批'}
                                </span>
                              ) : null}
                              {hybridAuditByInvoiceId[inv.id].ai_high ? (
                                <span className="rounded bg-amber-100 px-1 py-px text-[9px] font-semibold leading-tight text-amber-950">
                                  AI
                                </span>
                              ) : null}
                            </div>
                          ) : null}
                        </td>
                        <td className="min-w-0 max-w-[120px] overflow-hidden px-1 py-1.5 sm:px-1.5 sm:py-2">
                          <div className="truncate whitespace-nowrap text-xs text-gray-700" title={inv.invoice_number || undefined}>
                            {inv.invoice_number || '-'}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-1 py-1.5 text-xs text-gray-700 sm:px-1.5 sm:py-2">
                          {new Date(inv.invoice_date).toLocaleDateString(l ? 'en-CA' : 'zh-CN', {
                            year: '2-digit',
                            month: 'numeric',
                            day: 'numeric',
                          })}
                        </td>
                        <td className="min-w-0 whitespace-nowrap px-1 py-1.5 text-right text-xs font-semibold tabular-nums text-gray-900 sm:px-1.5 sm:py-2">
                          ${Number(inv.total_amount).toFixed(2)}
                        </td>
                        <td className="min-w-0 overflow-hidden px-0.5 py-1.5 text-center sm:py-2">
                          {qv ? (
                            <span
                              className={`inline-flex max-w-full truncate rounded-full px-1 py-0.5 text-[10px] font-medium ${quoteVarianceBadgeClass(qv)}`}
                              title={l ? qv.messageEn : qv.message}
                            >
                              {quoteVarianceShortLabel(qv, l)}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="overflow-hidden px-0 py-1.5 text-center sm:py-2">
                          {aiAuditListMap[inv.id] ? (
                            <AiListRiskBadge level={aiAuditListMap[inv.id].risk_level} l={l} />
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                        <td className="min-w-0 max-w-[72px] overflow-hidden px-1 py-1.5 sm:px-1.5 sm:py-2">
                          <div className="truncate whitespace-nowrap text-xs text-gray-700" title={catLabel(inv.category)}>
                            {catLabel(inv.category)}
                          </div>
                        </td>
                        <td
                          className="min-w-0 max-w-[72px] overflow-hidden px-1 py-1.5 sm:px-1.5 sm:py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {invoiceTaskSource[inv.id] ? (
                            <Link
                              to={`/property-admin/tasks/${invoiceTaskSource[inv.id].taskId}`}
                              className="block truncate text-xs font-medium text-[#1D9E75] hover:underline"
                              title={invoiceTaskSource[inv.id].title}
                              onClick={(e) => e.stopPropagation()}
                            >
                              {invoiceTaskSource[inv.id].title}
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="min-w-0 max-w-[88px] overflow-hidden px-0.5 py-1.5 text-center sm:py-2" onClick={(e) => e.stopPropagation()}>
                          <span
                            className={`inline-flex max-w-full items-center gap-0.5 truncate rounded-full px-1 py-0.5 text-[10px] font-medium ${st.className}`}
                            title={l ? st.labelEn : st.labelZh}
                          >
                            {inv.has_anomalies && <AlertTriangle size={10} className="shrink-0" aria-hidden />}
                            {inv.is_abnormal && (
                              <ShieldAlert size={10} className="shrink-0 text-amber-700" aria-hidden />
                            )}
                            <span className="truncate">{l ? st.labelEn : st.labelZh}</span>
                          </span>
                        </td>
                        <td
                          className="w-[88px] min-w-[88px] max-w-[88px] overflow-visible px-0.5 py-1.5 text-center align-top sm:py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex w-full flex-col items-stretch gap-1">
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice(inv)}
                                className="rounded-md p-1 text-gray-500 hover:bg-green-50 hover:text-[#1D9E75]"
                                title={l ? 'Details' : '详情'}
                              >
                                <Eye size={14} />
                              </button>
                              {canDeleteInvoice(roleInProperty, profile?.id, inv.uploaded_by) && (
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm(inv)}
                                  className="rounded-md p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"
                                  title={l ? 'Delete' : '删除'}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                            {canAudit && inv.status === 'pending_review' && (
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => void approveInvoiceFromList(inv)}
                                  className="rounded-md bg-[#1D9E75] px-2 py-1.5 text-xs font-medium leading-none text-white hover:bg-[#178a66]"
                                >
                                  {l ? 'Approve' : '审核通过'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectTarget(inv);
                                    setRejectNote('');
                                  }}
                                  className="rounded-md bg-red-600 px-2 py-1.5 text-xs font-medium leading-none text-white hover:bg-red-700"
                                >
                                  {l ? 'Reject' : '驳回'}
                                </button>
                              </div>
                            )}
                            {canAudit && inv.status === 'approved' && (
                              <button
                                type="button"
                                onClick={() => void markPaid(inv.id)}
                                className="rounded-md bg-cyan-600 px-2 py-1.5 text-xs font-medium leading-none text-white hover:bg-cyan-700"
                                title={l ? 'Mark as paid' : '标记已付款'}
                              >
                                {l ? 'Paid' : '已付'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden p-4 space-y-3">
              {filtered.map((inv) => {
                const st = statusStyle(inv.status);
                const qv = quoteVarianceByInvoiceId[inv.id];
                return (
                  <button
                    type="button"
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-[#1D9E75]/50 transition-colors bg-white shadow-sm"
                  >
                    <div className="flex justify-between gap-2 mb-2">
                      <span className="font-semibold text-gray-900">{inv.vendor_name}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {aiAuditListMap[inv.id] ? (
                          <AiListRiskBadge level={aiAuditListMap[inv.id].risk_level} l={l} />
                        ) : null}
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>
                          {l ? st.labelEn : st.labelZh}
                        </span>
                      </div>
                    </div>
                    {hybridAuditByInvoiceId[inv.id] ? (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {hybridAuditByInvoiceId[inv.id].over_budget ? (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">
                            {l ? '🔴 Over budget' : '🔴 超预算'}
                          </span>
                        ) : null}
                        {hybridAuditByInvoiceId[inv.id].bypass_approval ? (
                          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-800">
                            {l ? '🔴 No approval' : '🔴 未审批执行'}
                          </span>
                        ) : null}
                        {hybridAuditByInvoiceId[inv.id].ai_high ? (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-950">
                            {l ? '🟡 AI risk' : '🟡 AI异常'}
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        {inv.invoice_number || '—'} · {new Date(inv.invoice_date).toLocaleDateString(l ? 'en-CA' : 'zh-CN')}
                      </div>
                      <div className="font-bold text-gray-900">${Number(inv.total_amount).toFixed(2)}</div>
                      {qv ? (
                        <div className="flex items-center gap-2 pt-1">
                          <span className="text-gray-500">{l ? 'Quote Δ' : '报价对比'}:</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${quoteVarianceBadgeClass(qv)}`}>
                            {quoteVarianceShortLabel(qv, l)}
                          </span>
                        </div>
                      ) : null}
                      {invoiceTaskSource[inv.id] ? (
                        <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                          <span className="text-gray-500">{l ? 'Source: ' : '来源：'}</span>
                          <Link
                            to={`/property-admin/tasks/${invoiceTaskSource[inv.id].taskId}`}
                            className="text-[#1D9E75] font-medium hover:underline"
                          >
                            {invoiceTaskSource[inv.id].title}
                          </Link>
                        </div>
                      ) : null}
                    </div>
                    {canAudit && inv.status === 'pending_review' && (
                      <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => void approveInvoiceFromList(inv)}
                          className="flex-1 py-2 text-xs font-medium rounded-lg bg-[#1D9E75] text-white"
                        >
                          {l ? 'Approve' : '审核通过'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectTarget(inv);
                            setRejectNote('');
                          }}
                          className="flex-1 py-2 text-xs font-medium rounded-lg bg-red-600 text-white"
                        >
                          {l ? 'Reject' : '驳回'}
                        </button>
                      </div>
                    )}
                    {canAudit && inv.status === 'approved' && (
                      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => void markPaid(inv.id)}
                          className="w-full py-2 text-xs font-medium rounded-lg bg-cyan-600 text-white"
                        >
                          {l ? 'Mark paid' : '标记已付款'}
                        </button>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="border-t border-gray-200 px-3 py-2 text-sm text-gray-500 sm:px-4 sm:py-2.5">
          {filtered.length} / {invoices.length} {l ? 'invoices' : '张发票'}
        </div>
      </div>

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onRefresh={loadInvoicesQuiet}
          canAudit={canAudit}
          profile={profile}
          onApprove={(id, notes) => void approveInvoice(id, notes)}
          onReject={(inv) => {
            setRejectTarget(inv);
            setRejectNote('');
          }}
          onMarkPaid={(id) => void markPaid(id)}
          catLabel={catLabel}
        />
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {l ? 'Reject invoice' : '驳回发票'}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {l ? 'Status will be set to Exception. Add a note (optional).' : '状态将设为「异常」，可填写备注（选填）。'}
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1D9E75] mb-4"
              placeholder={l ? 'Reason / note…' : '驳回原因 / 备注…'}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectNote('');
                }}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {l ? 'Cancel' : '取消'}
              </button>
              <button
                type="button"
                disabled={rejectSubmitting}
                onClick={() => void submitReject()}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {rejectSubmitting ? (l ? 'Saving…' : '提交中…') : l ? 'Confirm reject' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{l ? 'Delete invoice?' : '删除发票？'}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {deleteConfirm.vendor_name}{' '}
              {deleteConfirm.invoice_number ? `#${deleteConfirm.invoice_number}` : ''}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium"
              >
                {l ? 'Cancel' : '取消'}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {deleting ? '…' : l ? 'Delete' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={`min-w-0 rounded-xl p-3 sm:p-4 xl:p-5 ${className}`}>
      <div className="mb-1 truncate text-xs text-gray-600 sm:text-sm">{label}</div>
      <div className="text-xl font-bold tabular-nums text-gray-900 sm:text-2xl xl:text-3xl">{value}</div>
    </div>
  );
}

function InvoiceDetailModal({
  invoice,
  onClose,
  onRefresh,
  canAudit,
  profile,
  onApprove,
  onReject,
  onMarkPaid,
  catLabel,
}: {
  invoice: Invoice;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  canAudit: boolean;
  profile: { id: string } | null;
  onApprove: (id: string, approvalNotes?: string) => void;
  onReject: (inv: Invoice) => void;
  onMarkPaid: (id: string) => void;
  catLabel: (v: string | null | undefined) => string;
}) {
  const { language } = useLanguage();
  const { currentPropertyId, memberships } = useProperty();
  const l = language === 'en';
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editCategory, setEditCategory] = useState(invoice.category || 'general');
  const [editNotes, setEditNotes] = useState(invoice.notes || '');
  const [saving, setSaving] = useState(false);
  const [linkedTasks, setLinkedTasks] = useState<LinkedTask[]>([]);
  const [quoteVarianceResult, setQuoteVarianceResult] = useState<QuoteVarianceResult | null>(null);
  const [quoteBudgetExceeded, setQuoteBudgetExceeded] = useState(false);
  const [approvalNote, setApprovalNote] = useState('');
  const [relatedTaskTitleFallback, setRelatedTaskTitleFallback] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [aiAudit, setAiAudit] = useState<InvoiceAiAuditRow | null>(null);
  const [aiAuditContextRow, setAiAuditContextRow] = useState<{
    context_json: Record<string, unknown>;
  } | null>(null);
  const [aiAuditLoading, setAiAuditLoading] = useState(true);
  const [aiRunLoading, setAiRunLoading] = useState(false);
  const [reasonsExpanded, setReasonsExpanded] = useState(false);
  const [contextFoldOpen, setContextFoldOpen] = useState(false);
  const [devJsonOpen, setDevJsonOpen] = useState(false);
  const [auditBanner, setAuditBanner] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);

  const st = statusStyle(invoice.status);
  const aiData = invoice.ai_extracted_data as Record<string, unknown> | null;

  const loadAiAuditBundle = useCallback(async () => {
    setAiAuditLoading(true);
    const [{ data: audits, error: auditErr }, { data: ctxRow }] = await Promise.all([
      supabase.from('invoice_ai_audits').select('*').eq('invoice_id', invoice.id),
      supabase.from('invoice_ai_audit_contexts').select('context_json').eq('invoice_id', invoice.id).maybeSingle(),
    ]);
    if (auditErr) {
      setAiAudit(null);
    } else {
      const rows = (audits ?? []) as InvoiceAiAuditRow[];
      setAiAudit(rows.length ? pickPreferredAiAudit(rows) : null);
    }
    if (ctxRow?.context_json && typeof ctxRow.context_json === 'object') {
      setAiAuditContextRow({ context_json: ctxRow.context_json as Record<string, unknown> });
    } else {
      setAiAuditContextRow(null);
    }
    setAiAuditLoading(false);
  }, [invoice.id]);

  useEffect(() => {
    setEditCategory(invoice.category || 'general');
    setEditNotes(invoice.notes || '');
    setApprovalNote('');
  }, [invoice]);

  useEffect(() => {
    void loadAiAuditBundle();
  }, [loadAiAuditBundle]);

  /** Poll a few times while AI audit is still empty (e.g. after upload auto-run). */
  useEffect(() => {
    if (aiAudit != null) return;
    let ticks = 0;
    const maxTicks = 12;
    const id = window.setInterval(() => {
      ticks += 1;
      if (ticks > maxTicks) {
        window.clearInterval(id);
        return;
      }
      void loadAiAuditBundle();
    }, 8000);
    return () => window.clearInterval(id);
  }, [invoice.id, aiAudit, loadAiAuditBundle]);

  useEffect(() => {
    setReasonsExpanded(false);
    setContextFoldOpen(false);
    setDevJsonOpen(false);
    setAuditBanner(null);
  }, [invoice.id]);

  const runInvoiceAiAudit = async () => {
    setAiRunLoading(true);
    setAuditBanner(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        setAuditBanner({ type: 'err', msg: l ? 'Please sign in.' : '请先登录。' });
        return;
      }
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-invoice-ai-audit`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        },
        body: JSON.stringify({ invoice_id: invoice.id }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !json.success) {
        const detail = typeof json.error === 'string' ? json.error : 'ERR';
        console.error('run-invoice-ai-audit', json);
        setAuditBanner({ type: 'err', msg: l ? `Failed: ${detail}` : `失败：${detail}` });
        return;
      }
      await loadAiAuditBundle();
      await onRefresh();
      setAuditBanner({ type: 'ok', msg: l ? 'AI audit updated.' : 'AI 审计已更新' });
      window.setTimeout(() => setAuditBanner(null), 5000);
    } catch (e) {
      console.error('run-invoice-ai-audit', e);
      setAuditBanner({ type: 'err', msg: l ? 'Network error' : '网络错误' });
    } finally {
      setAiRunLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAudit(true);
      let q = supabase.from('invoice_audit_log').select('*').eq('invoice_id', invoice.id);
      if (currentPropertyId) q = q.eq('property_id', currentPropertyId);
      const { data, error } = await q.order('created_at', { ascending: false });
      if (cancelled) return;
      if (error || !data) {
        setAuditLog([]);
        setLoadingAudit(false);
        return;
      }
      const actorIds = [...new Set(data.map((d) => d.actor_id))];
      const { data: actors } = await supabase
        .from('profiles')
        .select('id, full_name_en, full_name_zh')
        .in('id', actorIds);
      const actorMap = new Map(actors?.map((a) => [a.id, a]) || []);
      setAuditLog(
        data.map((row) => ({
          ...row,
          actor: actorMap.get(row.actor_id) || null,
        })) as AuditEntry[]
      );
      setLoadingAudit(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [invoice.id, currentPropertyId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentPropertyId) return;
      try {
        const rows = await fetchTasksForInvoice(invoice.id, currentPropertyId);
        if (!cancelled) setLinkedTasks(rows);
      } catch (e) {
        console.error('fetchTasksForInvoice', e);
        if (!cancelled) setLinkedTasks([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoice.id, currentPropertyId]);

  useEffect(() => {
    let cancelled = false;
    if (!invoice.quote_id) {
      setQuoteVarianceResult(null);
      setQuoteBudgetExceeded(false);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from('procurement_quotes')
        .select('quoted_amount, is_budget_exceeded')
        .eq('id', invoice.quote_id)
        .maybeSingle();
      if (cancelled) return;
      setQuoteBudgetExceeded(Boolean(data?.is_budget_exceeded));
      if (data != null && data.quoted_amount != null) {
        setQuoteVarianceResult(computeQuoteInvoiceVariance(Number(data.quoted_amount), invoice.total_amount));
      } else {
        setQuoteVarianceResult(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invoice.quote_id, invoice.total_amount]);

  useEffect(() => {
    if (!invoice.related_task_id || !currentPropertyId) {
      setRelatedTaskTitleFallback(null);
      return;
    }
    const fromLinked = linkedTasks.find((t) => t.taskId === invoice.related_task_id)?.title;
    if (fromLinked) {
      setRelatedTaskTitleFallback(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from('manager_tasks')
        .select('title')
        .eq('id', invoice.related_task_id)
        .eq('property_id', currentPropertyId)
        .maybeSingle();
      if (!cancelled) setRelatedTaskTitleFallback(data?.title ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [invoice.related_task_id, currentPropertyId, linkedTasks]);

  const relatedSourceTaskTitle =
    invoice.related_task_id != null
      ? linkedTasks.find((t) => t.taskId === invoice.related_task_id)?.title ?? relatedTaskTitleFallback
      : null;

  const saveEdits = async () => {
    if (!profile || !canAudit || !currentPropertyId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          category: editCategory,
          notes: editNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);
      if (error) {
        alert(error.message);
        return;
      }
      await supabase.from('invoice_audit_log').insert({
        property_id: currentPropertyId,
        invoice_id: invoice.id,
        actor_id: profile.id,
        action: 'edit_details',
        notes: null,
        old_status: invoice.status,
        new_status: invoice.status,
      });
      await onRefresh();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleExportApprovalPdf = async () => {
    setExportingPdf(true);
    try {
      const propertyName =
        memberships.find((m) => m.propertyId === currentPropertyId)?.name ?? (l ? 'Property' : '物业');
      const approverName = invoice.verifier
        ? l
          ? invoice.verifier.full_name_en
          : invoice.verifier.full_name_zh || invoice.verifier.full_name_en
        : null;
      await exportInvoiceApprovalPdf({
        zh: !l,
        propertyName,
        propertyId: currentPropertyId ?? null,
        invoice,
        quoteVariance: quoteVarianceResult,
        sourceTaskTitle: relatedSourceTaskTitle,
        approverDisplayName: approverName,
      });
    } catch (e) {
      console.error('exportInvoiceApprovalPdf', e);
      alert(l ? 'Failed to export PDF.' : '导出 PDF 失败');
    } finally {
      setExportingPdf(false);
    }
  };

  const downloadDoc = async () => {
    if (!invoice.document_url) return;
    try {
      const res = await fetch(invoice.document_url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = invoice.file_name || 'invoice-document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(invoice.document_url, '_blank', 'noopener,noreferrer');
    }
  };

  const actionLabel = (a: string) => {
    const m: Record<string, { en: string; zh: string }> = {
      approve: { en: 'Approved', zh: '审核通过' },
      reject: { en: 'Rejected', zh: '驳回' },
      mark_paid: { en: 'Marked paid', zh: '标记已付款' },
      edit_details: { en: 'Edited details', zh: '编辑信息' },
    };
    return l ? m[a]?.en || a : m[a]?.zh || a;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overflow-x-hidden bg-black/50 p-2 sm:items-center sm:p-3 md:p-4">
      <div className="my-3 w-full min-w-0 max-w-[min(48rem,calc(100vw-1rem))] max-h-[min(92vh,900px)] overflow-y-auto overflow-x-hidden rounded-xl bg-white shadow-xl sm:my-4 sm:max-w-3xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-2 border-b border-gray-200 bg-white p-3 sm:gap-3 sm:p-4 md:p-5">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{invoice.vendor_name}</h2>
            <p className="text-sm text-gray-500 mt-1 truncate">
              {invoice.file_name || invoice.invoice_number || invoice.id.slice(0, 8)}
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => void handleExportApprovalPdf()}
              disabled={exportingPdf}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              title={l ? 'Export approval record PDF' : '导出审批记录 PDF'}
            >
              {exportingPdf ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{l ? 'Export PDF' : '导出审批记录 PDF'}</span>
            </button>
            <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X size={20} />
            </button>
          </div>
        </div>

        {auditBanner ? (
          <div
            className={`px-4 sm:px-6 py-2.5 text-sm border-b ${
              auditBanner.type === 'ok'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-100'
                : 'bg-red-50 text-red-800 border-red-100'
            }`}
            role="status"
          >
            {auditBanner.msg}
          </div>
        ) : null}

        <div className="min-w-0 space-y-6 p-3 sm:p-4 md:p-5">
          {/* 1. 发票基本信息 */}
          <section aria-labelledby="inv-basic-heading">
            <h3 id="inv-basic-heading" className="text-sm font-semibold text-gray-900 mb-3">
              {l ? 'Invoice details' : '发票基本信息'}
            </h3>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${st.className}`}>
                {invoice.has_anomalies && <AlertTriangle size={14} className="inline mr-1" aria-hidden />}
                {invoice.is_abnormal && <ShieldAlert size={14} className="inline mr-1 text-amber-700" aria-hidden />}
                {l ? st.labelEn : st.labelZh}
              </span>
              {invoice.ai_confidence_score != null && (
                <span className="text-xs text-gray-500">
                  AI {(invoice.ai_confidence_score * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoField label={l ? 'Supplier' : '供应商'} value={invoice.vendor_name || '—'} />
              <InfoField
                label={l ? 'Invoice date' : '开票日期'}
                value={new Date(invoice.invoice_date).toLocaleDateString(l ? 'en-CA' : 'zh-CN')}
              />
              <InfoField
                label={l ? 'Total amount' : '金额（含税）'}
                value={`$${Number(invoice.total_amount).toFixed(2)}`}
                highlight
              />
              <InfoField label={l ? 'Category' : '分类'} value={catLabel(invoice.category)} />
            </div>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <InfoField label={l ? 'Invoice #' : '发票号'} value={invoice.invoice_number || '-'} />
              <InfoField label={l ? 'Subtotal' : '税前'} value={`$${Number(invoice.subtotal).toFixed(2)}`} />
              <InfoField label={l ? 'Tax' : '税额'} value={`$${Number(invoice.tax_amount || 0).toFixed(2)}`} />
              <InfoField label={l ? 'Currency' : '币种'} value={invoice.currency || 'CAD'} />
              <InfoField label="HST" value={invoice.hst_number || '-'} />
              <InfoField
                label={l ? 'Uploaded by' : '上传人'}
                value={
                  invoice.uploader
                    ? l
                      ? invoice.uploader.full_name_en
                      : invoice.uploader.full_name_zh || invoice.uploader.full_name_en
                    : '—'
                }
              />
            </div>
          </section>

          {/* AI 审计结论 */}
          <section aria-labelledby="inv-ai-audit-heading">
            {aiAuditLoading ? (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5">
                <p className="text-sm text-gray-500">{l ? 'Loading…' : '加载中…'}</p>
              </div>
            ) : aiAudit ? (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 id="inv-ai-audit-heading" className="text-base font-semibold text-gray-900">
                    {l ? 'AI audit conclusion' : 'AI 审计结论'}
                  </h3>
                  <button
                    type="button"
                    disabled={aiRunLoading}
                    onClick={() => void runInvoiceAiAudit()}
                    className="shrink-0 rounded-lg bg-[#1D9E75] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#178a66] disabled:opacity-50"
                  >
                    {aiRunLoading ? (l ? 'Running…' : '运行中…') : l ? 'Run AI audit' : '立即运行 AI 审计'}
                  </button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${riskLevelBadgeClass(aiAudit.risk_level)}`}
                  >
                    {riskLevelLabel(aiAudit.risk_level, l)}
                  </span>
                  <div className="text-xs text-gray-600 text-right space-y-0.5">
                    <div>
                      {l ? 'Risk score' : '风险分数'}{' '}
                      <span className="font-semibold text-gray-900">
                        {Math.round(Number(aiAudit.risk_score))} / 100
                      </span>
                    </div>
                    <div className="text-gray-500">
                      {l ? 'Updated' : '更新'}{' '}
                      {new Date(aiAudit.updated_at).toLocaleString(l ? 'en-CA' : 'zh-CN', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </div>
                  </div>
                </div>
                <p className="text-sm sm:text-base leading-6 text-gray-700 whitespace-pre-wrap">
                  {l ? aiAudit.ai_summary_en || aiAudit.ai_summary_zh : aiAudit.ai_summary_zh || aiAudit.ai_summary_en}
                </p>
                {(() => {
                  const reasonsRaw = Array.isArray(aiAudit.ai_reasons)
                    ? (aiAudit.ai_reasons as unknown[])
                    : [];
                  const parsed = reasonsRaw.map((r) => parseReasonItem(r, l));
                  const show = reasonsExpanded ? parsed : parsed.slice(0, 3);
                  if (parsed.length === 0) return null;
                  return (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                        {l ? 'Risk factors' : '风险原因'}
                      </h4>
                      <ul className="space-y-2">
                        {show.map((item, idx) => (
                          <li
                            key={idx}
                            className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-800"
                          >
                            <div className="font-medium text-gray-900">{item.title}</div>
                            {item.detail ? (
                              <p className="mt-1 text-gray-600 leading-relaxed">{item.detail}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                      {parsed.length > 3 ? (
                        <button
                          type="button"
                          onClick={() => setReasonsExpanded((v) => !v)}
                          className="mt-2 text-xs font-medium text-[#1D9E75] hover:underline"
                        >
                          {reasonsExpanded
                            ? l
                              ? 'Show less'
                              : '收起'
                            : l
                              ? `Show ${parsed.length - 3} more`
                              : `展开更多（${parsed.length - 3}）`}
                        </button>
                      ) : null}
                    </div>
                  );
                })()}
                {(() => {
                  const recRaw = Array.isArray(aiAudit.ai_recommendations)
                    ? (aiAudit.ai_recommendations as unknown[])
                    : [];
                  const parsed = recRaw.map((r) => parseRecItem(r, l));
                  if (parsed.length === 0) return null;
                  return (
                    <div className="pt-3 border-t border-gray-100">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                        {l ? 'Suggested next steps' : '建议动作'}
                      </h4>
                      <ul className="space-y-3">
                        {parsed.map((item, idx) => (
                          <li key={idx} className="text-sm">
                            <div className="font-medium text-gray-900">{item.title}</div>
                            {item.action ? (
                              <p className="mt-1 text-gray-600 leading-relaxed">{item.action}</p>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
                {aiAudit.model_name ? (
                  <p className="text-xs text-gray-400 pt-1">
                    {l ? 'Model' : '模型'}: {aiAudit.model_name}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
                <h3 id="inv-ai-audit-heading" className="text-base font-semibold text-gray-900">
                  {l ? 'AI audit conclusion' : 'AI 审计结论'}
                </h3>
                <div className="rounded-xl bg-gray-50 border border-dashed border-gray-200 p-4 text-center space-y-2">
                  <p className="text-sm font-medium text-gray-900">
                    {l ? 'No AI audit yet' : '尚未生成 AI 审计结论'}
                  </p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {l
                      ? 'This invoice has not been analyzed yet. You can run an AI audit manually.'
                      : '该发票尚未完成 AI 风险分析。你可以手动触发一次 AI 审计。'}
                  </p>
                  <button
                    type="button"
                    disabled={aiRunLoading}
                    onClick={() => void runInvoiceAiAudit()}
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#178a66] disabled:opacity-50"
                  >
                    {aiRunLoading ? (l ? 'Running…' : '运行中…') : l ? 'Run AI audit now' : '立即运行 AI 审计'}
                  </button>
                </div>
              </div>
            )}
            {aiAuditContextRow?.context_json ? (
              <div className="mt-4 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
                <button
                  type="button"
                  onClick={() => setContextFoldOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 px-5 py-3 text-left text-sm font-semibold text-gray-900 hover:bg-gray-50"
                >
                  <span>{l ? 'Audit context summary' : '审计上下文摘要'}</span>
                  {contextFoldOpen ? (
                    <ChevronDown className="size-4 shrink-0 text-gray-500" />
                  ) : (
                    <ChevronRight className="size-4 shrink-0 text-gray-500" />
                  )}
                </button>
                {contextFoldOpen ? (
                  <div className="px-5 pb-5 pt-0 space-y-2 text-sm text-gray-700 border-t border-gray-100">
                    {(() => {
                      const s = summarizeContextJson(aiAuditContextRow.context_json);
                      if (!s) {
                        return <p className="text-gray-500">{l ? 'No summary.' : '暂无摘要。'}</p>;
                      }
                      return (
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                          <div>
                            <dt className="text-xs text-gray-500">
                              {l ? 'Budget / FY' : '预算 / 财年'}
                            </dt>
                            <dd>
                              {s.fiscalYear != null ? `${l ? 'FY' : '财年'} ${s.fiscalYear}` : '—'}
                              {s.remainingBudget != null
                                ? ` · ${l ? 'Remaining' : '剩余'} $${Number(s.remainingBudget).toFixed(2)}`
                                : ''}
                              {s.budgetCategoryId ? (
                                <span className="text-gray-500 text-xs ml-1">
                                  ({l ? 'cat' : '科目'} {s.budgetCategoryId.slice(0, 8)}…)
                                </span>
                              ) : null}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">
                              {l ? 'Same vendor invoices (12m)' : '同供应商历史（12 月）'}
                            </dt>
                            <dd>{s.vendorCount}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">
                              {l ? 'Same category invoices (12m)' : '同类别历史（12 月）'}
                            </dt>
                            <dd>{s.categoryCount}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-gray-500">
                              {l ? 'Open rule hits' : '规则命中数'}
                            </dt>
                            <dd>{s.ruleCount}</dd>
                          </div>
                          <div className="sm:col-span-2">
                            <dt className="text-xs text-gray-500">OCR</dt>
                            <dd>{s.ocrAvailable ? (l ? 'Available' : '可用') : l ? 'Limited / none' : '不可用或有限'}</dd>
                          </div>
                        </dl>
                      );
                    })()}
                    <button
                      type="button"
                      onClick={() => setDevJsonOpen((v) => !v)}
                      className="text-xs font-medium text-gray-500 hover:text-gray-800 pt-2"
                    >
                      {devJsonOpen
                        ? l
                          ? 'Hide developer JSON'
                          : '隐藏开发者 JSON'
                        : l
                          ? 'Show developer JSON'
                          : '查看原始 JSON（开发者）'}
                    </button>
                    {devJsonOpen ? (
                      <pre className="mt-2 max-h-48 overflow-auto rounded-lg bg-gray-900 text-gray-100 text-xs p-3 whitespace-pre-wrap break-all">
                        {JSON.stringify(aiAuditContextRow.context_json, null, 2)}
                      </pre>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          {/* 2. 费用异常提醒（红色预警） */}
          {quoteVarianceResult && isRedAlertVariance(quoteVarianceResult) ? (
            <section
              className="rounded-xl border-2 border-red-400 bg-red-50 p-4 shadow-sm"
              aria-labelledby="inv-anomaly-heading"
            >
              <h3 id="inv-anomaly-heading" className="text-base font-bold text-red-950">
                {l ? 'Cost anomaly alert' : '费用异常提醒'}
              </h3>
              <p className="mt-2 text-sm text-red-900">
                {l ? (
                  <>
                    {quoteVarianceResult.variancePercent * 100 >= 0 ? 'Above quote by ' : 'Below quote: '}
                    <span className="font-semibold">
                      {Math.abs(quoteVarianceResult.variancePercent * 100).toFixed(1)}%
                    </span>
                    . Review the reason before approving.
                  </>
                ) : (
                  <>
                    高于报价{' '}
                    <span className="font-semibold">
                      {(quoteVarianceResult.variancePercent * 100).toFixed(1)}%
                    </span>
                    ，建议复核原因后再审批。
                  </>
                )}
              </p>
            </section>
          ) : null}

          {/* 3. 报价对比 */}
          {invoice.quote_id && quoteVarianceResult ? (
            <QuoteVariancePanel result={quoteVarianceResult} en={l} />
          ) : null}

          {/* 4. 来源任务（related_task_id） */}
          {invoice.related_task_id ? (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{l ? 'Source task' : '来源任务'}</h3>
              <p className="text-sm text-gray-800">
                <Link
                  to={`/property-admin/tasks/${invoice.related_task_id}`}
                  className="font-medium text-[#1D9E75] hover:underline"
                >
                  {relatedSourceTaskTitle || (l ? 'View task' : '查看任务')}
                </Link>
              </p>
              <p className="mt-3 text-xs text-gray-600">
                <Link
                  to={`/property-admin/tasks/${invoice.related_task_id}`}
                  className="text-[#1D9E75] font-medium hover:underline"
                >
                  {l
                    ? 'View execution trail (logs / photos / before–after)'
                    : '查看执行过程（日志 / 图片 / 前后对比）'}
                </Link>
              </p>
            </section>
          ) : null}

          {/* 5. 审批区 */}
          {canAudit && invoice.status === 'pending_review' ? (
            <section className="rounded-xl border border-gray-200 bg-gray-50/80 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{l ? 'Approval' : '审批'}</h3>
              {(() => {
                const requiresApprovalReason =
                  quoteVarianceResult?.warningLevel === 'danger' || quoteBudgetExceeded;
                const warnSuggest =
                  quoteVarianceResult?.warningLevel === 'warning' &&
                  !quoteBudgetExceeded;
                const missingDangerNote = requiresApprovalReason && !approvalNote.trim();
                const handleApproveClick = () => {
                  if (requiresApprovalReason && !approvalNote.trim()) {
                    alert(l ? 'Please enter an approval reason.' : '必须填写审批理由');
                    return;
                  }
                  onApprove(invoice.id, approvalNote);
                };
                return (
                  <>
                    <label
                      className={`block text-xs font-medium mb-1.5 ${requiresApprovalReason ? 'text-red-800' : 'text-gray-600'}`}
                      htmlFor="invoice-approval-note"
                    >
                      {l ? 'Approval note' : '审批备注'}
                      {requiresApprovalReason ? (
                        <span className="text-red-600 font-semibold"> *</span>
                      ) : null}
                    </label>
                    {requiresApprovalReason ? (
                      <p className="text-xs text-red-700 mb-2">
                        {quoteBudgetExceeded && quoteVarianceResult?.warningLevel !== 'danger'
                          ? l
                            ? 'Quote exceeds budget commitment — approval note required.'
                            : '报价已超预算承诺，请填写审批理由后再通过'
                          : l
                            ? 'Required before approve.'
                            : '请填写审批理由后再通过'}
                      </p>
                    ) : warnSuggest ? (
                      <p className="text-xs text-amber-800 mb-2">
                        {l ? 'Variance is elevated — adding a note is recommended.' : '报价偏差偏高，建议填写审批备注。'}
                      </p>
                    ) : null}
                    <textarea
                      id="invoice-approval-note"
                      value={approvalNote}
                      onChange={(e) => setApprovalNote(e.target.value)}
                      rows={3}
                      className={`w-full px-3 py-2 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent ${
                        missingDangerNote
                          ? 'border-2 border-red-500 bg-red-50/50'
                          : 'border border-gray-300'
                      }`}
                      placeholder={
                        l
                          ? 'Notes are saved to the invoice and audit trail.'
                          : '填写后将保存至发票与操作记录。'
                      }
                      aria-invalid={missingDangerNote}
                      aria-required={requiresApprovalReason}
                    />
                    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                      <button
                        type="button"
                        onClick={handleApproveClick}
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#1D9E75] px-3 py-2 text-sm font-medium text-white hover:bg-[#178a66] sm:w-auto sm:px-3.5 sm:py-2.5"
                      >
                        <Check size={16} />
                        {l ? 'Approve' : '审核通过'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onReject(invoice)}
                        className="w-full rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 sm:w-auto sm:px-3.5 sm:py-2.5"
                      >
                        {l ? 'Reject' : '拒绝'}
                      </button>
                    </div>
                  </>
                );
              })()}
            </section>
          ) : null}

          {/* 审批记录（已通过） */}
          {invoice.status === 'approved' && invoice.verified_at ? (
            <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{l ? 'Approval record' : '审批记录'}</h3>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-gray-500">{l ? 'Approved by' : '审批人'}</dt>
                  <dd className="font-medium text-gray-900">
                    {invoice.verifier
                      ? l
                        ? invoice.verifier.full_name_en
                        : invoice.verifier.full_name_zh || invoice.verifier.full_name_en
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">{l ? 'Approved at' : '审批时间'}</dt>
                  <dd className="font-medium text-gray-900">
                    {new Date(invoice.verified_at).toLocaleString(l ? 'en-CA' : 'zh-CN')}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">{l ? 'Approval note' : '审批备注'}</dt>
                  <dd className="text-gray-800 whitespace-pre-wrap">
                    {invoice.approval_note?.trim() ||
                      (invoice.review_notes?.trim() ? invoice.review_notes : null) ||
                      (l ? '—' : '—')}
                  </dd>
                </div>
              </dl>
            </section>
          ) : null}

          {/* 6. 其它信息 */}
          <section className="space-y-6 pt-2 border-t border-dashed border-gray-200" aria-labelledby="inv-more-heading">
            <h3 id="inv-more-heading" className="text-sm font-semibold text-gray-900">
              {l ? 'More' : '其它信息'}
            </h3>
          {editing && canAudit ? (
            <div className="space-y-3 border border-gray-200 rounded-xl p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Category' : '分类'}</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {l ? c.labelEn : c.labelZh}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Notes' : '备注'}</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveEdits()}
                  disabled={saving}
                  className="px-4 py-2 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a66] disabled:opacity-50"
                >
                  {saving ? '…' : l ? 'Save' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                >
                  {l ? 'Cancel' : '取消'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {invoice.notes && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">{l ? 'Notes' : '备注'}</div>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{invoice.notes}</p>
                </div>
              )}
              {['flagged', 'rejected'].includes(invoice.status) && invoice.review_notes && (
                <div>
                  <div className="text-sm font-medium text-red-700 mb-1">
                    {l ? 'Rejection / exception note' : '驳回说明'}
                  </div>
                  <p className="text-sm text-red-900 bg-red-50 rounded-lg p-3 border border-red-100">
                    {invoice.review_notes}
                  </p>
                </div>
              )}
            </>
          )}

          {invoice.document_url && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void downloadDoc()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a66]"
              >
                <Download size={18} />
                {l ? 'Download voucher' : '下载凭证'}
              </button>
              <a
                href={invoice.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Eye size={18} />
                {l ? 'Open in new tab' : '新窗口打开'}
              </a>
            </div>
          )}

          {(() => {
            const raw = aiData?.line_items;
            const lineItems = Array.isArray(raw)
              ? (raw as Array<{ description: string; amount: number }>)
              : [];
            if (lineItems.length === 0) return null;
            return (
              <div>
                <div className="text-sm font-medium text-gray-500 mb-2">{l ? 'Line items' : '明细项目'}</div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {lineItems.map((item, i) => (
                    <div key={i} className="flex justify-between px-4 py-2 text-sm even:bg-gray-50">
                      <span className="text-gray-700">{item.description}</span>
                      <span className="font-medium">${Number(item.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">{l ? 'Activity log' : '操作记录'}</div>
            {loadingAudit ? (
              <Loader2 className="animate-spin text-gray-400" size={24} />
            ) : auditLog.length === 0 ? (
              <p className="text-sm text-gray-500">{l ? 'No entries yet.' : '暂无记录。'}</p>
            ) : (
              <ul className="space-y-2 border border-gray-100 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {auditLog.map((entry) => (
                  <li key={entry.id} className="px-3 py-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-gray-900">{actionLabel(entry.action)}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(entry.created_at).toLocaleString(l ? 'en-CA' : 'zh-CN')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {entry.actor
                        ? l
                          ? entry.actor.full_name_en
                          : entry.actor.full_name_zh || entry.actor.full_name_en
                        : entry.actor_id.slice(0, 8)}
                      {entry.old_status && entry.new_status && entry.old_status !== entry.new_status && (
                        <span>
                          {' '}
                          · {entry.old_status} → {entry.new_status}
                        </span>
                      )}
                    </div>
                    {entry.notes && <div className="text-xs text-gray-600 mt-1">{entry.notes}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-4 border-t border-gray-200">
            {canAudit && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                {l ? 'Edit' : '编辑'}
              </button>
            )}
            {canAudit && invoice.status === 'approved' && (
              <button
                type="button"
                onClick={() => onMarkPaid(invoice.id)}
                className="px-4 py-2.5 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700"
              >
                {l ? 'Mark paid' : '标记已付款'}
              </button>
            )}
          </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-0.5">{label}</div>
      <div className={`text-sm ${highlight ? 'text-[#1D9E75] font-bold text-lg' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
