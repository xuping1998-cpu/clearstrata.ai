import {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
  forwardRef,
  useImperativeHandle,
  type ChangeEvent,
} from 'react';
import { Link } from 'react-router-dom';
import {
  Upload,
  FileText,
  Check,
  X,
  AlertTriangle,
  Eye,
  Loader2,
  Trash2,
  CheckCircle,
  Download,
  FileSpreadsheet,
  FileDown,
  ShieldAlert,
  Sparkles,
  ChevronDown,
  ChevronRight,
  PenLine,
  Copy,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { canManageInvoiceWorkflow, canDeleteInvoice, canUploadInvoicePackage } from '../../lib/financePermissions';
import { fetchTaskTitleByInvoiceIds, fetchTasksForInvoice, type LinkedTask } from '../../lib/invoiceTaskLinks';
import { computeQuoteInvoiceVariance, isRedAlertVariance, type QuoteVarianceResult } from '../../lib/quoteInvoiceVariance';
import { exportInvoiceApprovalPdf } from '../../lib/pdf/exportInvoiceApprovalPdf';
import { QuoteVariancePanel } from '../../components/finance/QuoteVariancePanel';
import { uploadInvoiceDocumentDirect, isAllowedInvoiceUploadFile } from '../../lib/invoiceDirectUpload';
import { ocrPrefillCredibility } from '../../lib/invoiceSingleUploadCredibility';
import {
  getPdfPageCountFromFile,
  processPayablePdfPackage,
  type PayablePackageResult,
} from '../../lib/invoicePdfPackage';
import {
  currentAccountingDefaults,
  effectiveAccountingMonth,
  effectiveAccountingYear,
} from '../../lib/invoiceAccountingPeriod';
import { runInvoiceAudit } from '../../lib/invoiceAudit';
import { INVOICE_AUDIT_RULE_CODES, type InvoiceAuditSummary } from '../../lib/audit/invoiceAuditRules';
import { resolveLedgerGovernanceMode } from '../../lib/invoiceGovernanceLedgerMode';
import { sanitizeDbText } from '../../lib/invoiceJsonSanitize';
import { HistoricalBenchmarkReviewModal } from '../../components/finance/HistoricalBenchmarkReviewModal';
import {
  formatHistoricalBenchmarkRange,
  historicalAuditPanelClass,
  historicalAuditServiceTypeLabel,
  historicalAuditStatusBadgeClass,
  historicalAuditStatusMessage,
  parseHistoricalAuditFromContext,
  partitionReasonsForHistoricalCandidate,
  isVendorHistoryComparisonText,
  historicalAuditProcurementSuggestLabel,
  historicalAuditListButtonClass,
  historicalAuditListPillClass,
  historicalAuditListTooltip,
  historicalAuditRowAccentClass,
  isHistoricalAuditCandidate,
  type HistoricalAuditPayload,
} from '../../lib/audit/historicalAudit';

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
  /** 可选：结构化或自由文本描述（若有则优先用于标题推断） */
  description_zh?: string | null;
  description_en?: string | null;
  description?: string | null;
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
  /** 若库中有则用于展示推断账期月份；采购草稿不落库（表无字段） */
  fiscal_month?: number | null;
  budget_category_id?: string | null;
  /** approved/paid 时由库计算锁定；pending 时常为 null */
  is_budget_exceeded?: boolean | null;
  uploader?: { full_name_en: string; full_name_zh?: string };
  /** 财务账套归档：用户选择的自然年（与发票开具日无关） */
  accounting_year?: number | null;
  /** 财务账套归档：1–12 */
  accounting_month?: number | null;
  budget_anomaly_flag?: string | null;
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

/** Month selectors for archive-period modal (1–12). */
const MONTH_OPTS: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MONTH_LABEL_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

function quoteVarianceBadgeClass(v: QuoteVarianceResult): string {
  switch (v.warningLevel) {
    case 'danger':
      return 'bg-red-100 text-red-800 ring-1 ring-red-200';
    case 'warning':
      return 'bg-amber-100 text-amber-900';
    default:
      return 'bg-clearstrata-ui-soft text-clearstrata-ui-softText';
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

/** 年/月折叠汇总：总额、张数、主要流程状态（不含「异常」等其它口径） */
function aggregateInvoiceFoldSummary(rows: Invoice[]) {
  let total = 0;
  let pending_review = 0;
  let approved = 0;
  let paid = 0;
  for (const inv of rows) {
    total += Number(inv.total_amount) || 0;
    if (inv.status === 'pending_review') pending_review++;
    else if (inv.status === 'approved') approved++;
    else if (inv.status === 'paid') paid++;
  }
  return { total, count: rows.length, pending_review, approved, paid };
}

function isHistoricalLedgerMonth(
  ledgerYear: number,
  ledgerMonth: number,
  governanceStartIso: string | null | undefined,
): boolean {
  return resolveLedgerGovernanceMode(ledgerYear, ledgerMonth, governanceStartIso).mode === 'historical';
}

/** Year/month fold subtitle — formal months show review stats; historical months show archive-only counts. */
function formatInvoiceFoldSummaryLine(
  agg: ReturnType<typeof aggregateInvoiceFoldSummary>,
  opts: { langEn: boolean; fmtMoney: (n: number) => string; historical: boolean },
): string {
  const { langEn: l, fmtMoney, historical } = opts;
  if (historical) {
    return l
      ? `Total ${fmtMoney(agg.total)} | ${agg.count} invoices | Archived ${agg.count}`
      : `总额 ${fmtMoney(agg.total)}｜发票 ${agg.count} 张｜历史归档 ${agg.count}`;
  }
  return l
    ? `${fmtMoney(agg.total)} · ${agg.count} invoices · pending ${agg.pending_review} · approved ${agg.approved} · paid ${agg.paid}`
    : `总额 ${fmtMoney(agg.total)}｜发票 ${agg.count} 张｜待审核 ${agg.pending_review}｜已批准 ${agg.approved}｜已付款 ${agg.paid}`;
}

function statusStyle(status: string): { labelZh: string; labelEn: string; className: string } {
  const map: Record<string, { labelZh: string; labelEn: string; className: string }> = {
    pending_upload: { labelZh: '上传中', labelEn: 'Uploading', className: 'bg-gray-100 text-gray-700' },
    ai_processing: { labelZh: 'AI识别中', labelEn: 'AI processing', className: 'bg-slate-100 text-slate-700' },
    pending_review: { labelZh: '待审核', labelEn: 'Pending review', className: 'bg-blue-100 text-blue-800' },
    draft_manual: {
      labelZh: '待补充信息',
      labelEn: 'Needs details',
      className: 'bg-amber-100 text-amber-900 ring-1 ring-amber-200',
    },
    approved: { labelZh: '已批准', labelEn: 'Approved', className: 'bg-clearstrata-brand-100 text-clearstrata-brand-800' },
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
      return 'bg-clearstrata-brand-100 text-clearstrata-brand-900 ring-1 ring-clearstrata-ui-softBorder';
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

type InvoiceAnomalyLite = {
  invoice_id?: string;
  rule_code: string;
  message_zh: string;
  message_en: string;
  severity: string;
};

/** Monthly audit drill-down + copy: never show raw DB messages (encoding issues). */
type MonthlyAuditTag = 'link' | 'price' | 'dup' | 'budget';

type MonthlyAuditFilter = 'all' | MonthlyAuditTag;

const RULE_CODE_EXPLAIN_ZH: Record<string, string> = {
  missing_procurement_link: '缺少采购记录',
  no_quote: '缺少采购记录',
  historical_price_variance: '当前金额高于市场参考范围',
  amount_gt_quote_110: '当前金额高于市场参考范围',
  vendor_price_spike: '当前金额高于市场参考范围',
  procurement_out_of_scope: '超出采购批复或报价容差',
  duplicate_invoice: '疑似重复付款',
  budget_overrun: '超预算',
  no_budget_category: '预算分类缺失，需核对',
};

const RULE_CODE_EXPLAIN_EN: Record<string, string> = {
  missing_procurement_link: 'Missing procurement linkage',
  no_quote: 'Missing procurement linkage',
  historical_price_variance: 'Amount above market reference range',
  amount_gt_quote_110: 'Amount above market reference range',
  vendor_price_spike: 'Amount above market reference range',
  procurement_out_of_scope: 'Outside approved procurement / quote tolerance',
  duplicate_invoice: 'Suspected duplicate payment',
  budget_overrun: 'Over budget',
  no_budget_category: 'Budget category missing — verify',
};

const RULE_FALLBACK_ZH = '需人工复核';
const RULE_FALLBACK_EN = 'Manual review recommended';

/** Historical reconstruction: retrospective benchmark review (not vendor-average spike). */
const HIST_BENCHMARK_REVIEW_ZH =
  'AI建议对该历史发票进行市场补询价比对，以辅助业委会判断是否存在异常支出。';
const HIST_BENCHMARK_REVIEW_EN =
  'AI recommends a retrospective market benchmark review for this invoice.';

function explainRuleCode(
  l: boolean,
  rawCode: string,
  ledgerMode: 'formal' | 'historical' = 'formal',
): string {
  const k = String(rawCode ?? '')
    .trim()
    .toLowerCase();
  if (!k) return l ? RULE_FALLBACK_EN : RULE_FALLBACK_ZH;
  if (ledgerMode === 'historical') {
    if (k === 'vendor_price_spike' || k === 'historical_price_variance') {
      return l ? HIST_BENCHMARK_REVIEW_EN : HIST_BENCHMARK_REVIEW_ZH;
    }
  }
  if (l) return RULE_CODE_EXPLAIN_EN[k] ?? RULE_FALLBACK_EN;
  return RULE_CODE_EXPLAIN_ZH[k] ?? RULE_FALLBACK_ZH;
}

/** Stable risk copy from codes + inferred signals only (no message_zh/message_en). */
function buildMonthlyRiskExplanation(
  l: boolean,
  inv: Invoice,
  sx: MonthlyRiskSignals,
  anomalies: InvoiceAnomalyLite[],
  ledgerMode: 'formal' | 'historical',
  historicalAudit?: HistoricalAuditPayload | null,
): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  const push = (s: string) => {
    const t = s.trim();
    if (!t || seen.has(t)) return;
    seen.add(t);
    parts.push(t);
  };

  const codeSet = new Set<string>();
  for (const a of anomalies) {
    const c = String(a.rule_code ?? '').trim().toLowerCase();
    if (c) codeSet.add(c);
  }
  for (const c of auditSummaryCodesForInv(inv)) {
    const k = c.trim().toLowerCase();
    if (k) codeSet.add(k);
  }
  const histCandidate = isHistoricalAuditCandidate(historicalAudit);

  for (const c of codeSet) {
    if (histCandidate && c === 'vendor_price_spike') continue;
    if (ledgerMode === 'historical' && c === 'vendor_price_spike') {
      push(l ? HIST_BENCHMARK_REVIEW_EN : HIST_BENCHMARK_REVIEW_ZH);
      continue;
    }
    push(explainRuleCode(l, c, ledgerMode));
  }

  if (sx.noProcurement && !histCandidate) {
    push(explainRuleCode(l, 'no_quote', ledgerMode));
  }
  if (histCandidate) {
    push(
      l
        ? historicalAuditListTooltip(historicalAudit?.benchmarkStatus, true)
        : historicalAuditListTooltip(historicalAudit?.benchmarkStatus, false),
    );
  } else if (ledgerMode === 'historical') {
    if (sx.benchmarkReviewCandidate && !codeSet.has('vendor_price_spike')) {
      push(l ? HIST_BENCHMARK_REVIEW_EN : HIST_BENCHMARK_REVIEW_ZH);
    }
  } else {
    if (sx.procurementScope) {
      push(explainRuleCode(l, 'procurement_out_of_scope', ledgerMode));
    }
    if (sx.aiResidual) push(l ? RULE_FALLBACK_EN : RULE_FALLBACK_ZH);
  }
  if (sx.duplicate) push(explainRuleCode(l, 'duplicate_invoice'));
  if (sx.overBudget) push(explainRuleCode(l, 'budget_overrun'));
  if (inv.has_anomalies && parts.length === 0) push(l ? RULE_FALLBACK_EN : RULE_FALLBACK_ZH);
  if (inv.is_abnormal === true && parts.length === 0) push(l ? RULE_FALLBACK_EN : RULE_FALLBACK_ZH);

  return parts.join(l ? '; ' : '；') || (l ? RULE_FALLBACK_EN : RULE_FALLBACK_ZH);
}

function auditSummaryCodesForInv(inv: Invoice): string[] {
  const raw = inv.audit_summary as InvoiceAuditSummary | null | undefined;
  if (!raw || typeof raw !== 'object') return [];
  const rc = raw.rule_codes;
  return Array.isArray(rc) ? rc.filter((x): x is string => typeof x === 'string') : [];
}

function aiExtractDuplicateHeuristic(inv: Invoice): boolean {
  try {
    const blob = JSON.stringify(inv.ai_extracted_data ?? {}).toLowerCase();
    return blob.includes('duplicate');
  } catch {
    return false;
  }
}

type MonthlyRiskSignals = {
  procurementScope: boolean;
  /** Historical mode: vendor_price_spike → benchmark review candidate, not confirmed price anomaly */
  benchmarkReviewCandidate: boolean;
  overBudget: boolean;
  duplicate: boolean;
  noProcurement: boolean;
  /** AI / OCR anomaly without hitting structured procurement/budget/dup/no-quote buckets */
  aiResidual: boolean;
  anyAlert: boolean;
};

function monthlyRiskSignals(
  inv: Invoice,
  extras: {
    hybrid?: { over_budget: boolean; bypass_approval: boolean; ai_high: boolean };
    qv?: QuoteVarianceResult | null | undefined;
    anomalies: InvoiceAnomalyLite[];
    ai?: { risk_level: string; risk_score: number };
  },
): MonthlyRiskSignals {
  const codes = [...(extras.anomalies ?? []).map((r) => r.rule_code), ...auditSummaryCodesForInv(inv)];
  const set = new Set(codes);

  const duplicate = set.has(INVOICE_AUDIT_RULE_CODES.DUPLICATE_INVOICE) || aiExtractDuplicateHeuristic(inv);
  const noProcurement =
    set.has(INVOICE_AUDIT_RULE_CODES.NO_QUOTE) ||
    (!inv.quote_id &&
      (inv.status === 'pending_review' || inv.status === 'approved') &&
      Number(inv.total_amount) >= 50);

  const benchmarkReviewCandidate = set.has(INVOICE_AUDIT_RULE_CODES.VENDOR_PRICE_SPIKE);

  const procurementScope =
    extras.hybrid?.bypass_approval === true ||
    (extras.qv != null && isRedAlertVariance(extras.qv)) ||
    set.has(INVOICE_AUDIT_RULE_CODES.AMOUNT_GT_QUOTE_110) ||
    set.has(INVOICE_AUDIT_RULE_CODES.VENDOR_PRICE_SPIKE);

  const overBudget =
    extras.hybrid?.over_budget === true || Boolean(inv.budget_anomaly_flag && String(inv.budget_anomaly_flag).trim());

  const rs = extras.ai?.risk_score;
  const level = String(extras.ai?.risk_level || '').toLowerCase();
  const aiRisky =
    extras.hybrid?.ai_high === true ||
    inv.is_abnormal === true ||
    inv.has_anomalies === true ||
    (typeof rs === 'number' &&
      rs >= 40 &&
      (level === '' || ['medium', 'high', 'critical'].includes(level)));

  const structuredHit =
    procurementScope === true ||
    overBudget === true ||
    duplicate === true ||
    noProcurement === true;

  const aiResidual = aiRisky === true && !structuredHit;

  const anyAlert = procurementScope || overBudget || duplicate || noProcurement || aiRisky;

  return {
    procurementScope,
    benchmarkReviewCandidate,
    overBudget,
    duplicate,
    noProcurement,
    aiResidual,
    anyAlert,
  };
}

function historicalBenchmarkReviewRow(sx: MonthlyRiskSignals): boolean {
  return (
    sx.benchmarkReviewCandidate ||
    sx.aiResidual ||
    (sx.procurementScope && !sx.benchmarkReviewCandidate)
  );
}

function monthlyRowTags(
  isHistorical: boolean,
  sx: MonthlyRiskSignals,
  historicalAudit?: HistoricalAuditPayload | null,
): MonthlyAuditTag[] {
  const tags: MonthlyAuditTag[] = [];
  const histCandidate = isHistoricalAuditCandidate(historicalAudit);
  if (!histCandidate) {
    if (sx.noProcurement) tags.push('link');
    if (isHistorical) {
      if (historicalBenchmarkReviewRow(sx)) tags.push('price');
    } else if (sx.procurementScope) {
      tags.push('price');
    }
  }
  if (sx.duplicate) tags.push('dup');
  if (sx.overBudget) tags.push('budget');
  return tags;
}

function rowRiskAccentClass(
  tags: MonthlyAuditTag[],
  historical: boolean,
  historicalAudit?: HistoricalAuditPayload | null,
): string {
  if (tags.includes('budget')) return 'border-l-4 border-l-red-500 bg-red-50/45';
  if (tags.includes('dup')) return 'border-l-4 border-l-orange-500 bg-orange-50/40';
  if (isHistoricalAuditCandidate(historicalAudit)) {
    return historicalAuditRowAccentClass(historicalAudit?.benchmarkStatus);
  }
  if (tags.includes('price')) {
    return historical
      ? 'border-l-4 border-l-amber-400 bg-amber-50/45'
      : 'border-l-4 border-l-red-600 bg-red-50/50';
  }
  if (tags.includes('link')) {
    return historical
      ? 'border-l-4 border-l-blue-600 bg-blue-50/40'
      : 'border-l-4 border-l-red-600 bg-red-50/50';
  }
  return 'border-l-4 border-l-slate-200 bg-white';
}

function monthlyTagPillClass(tag: MonthlyAuditTag, historical: boolean): string {
  if (tag === 'budget') return 'bg-red-100 text-red-900 ring-1 ring-red-200';
  if (tag === 'dup') return 'bg-orange-100 text-orange-950 ring-1 ring-orange-200';
  if (tag === 'price') {
    return historical
      ? 'bg-amber-100 text-amber-950 ring-1 ring-amber-200'
      : 'bg-red-100 text-red-900 ring-1 ring-red-200';
  }
  return historical
    ? 'bg-blue-100 text-blue-900 ring-1 ring-blue-200'
    : 'bg-red-100 text-red-900 ring-1 ring-red-200';
}

function monthlyTagLabel(tag: MonthlyAuditTag, l: boolean, historical: boolean): string {
  if (tag === 'budget') return l ? 'Over budget' : '超预算';
  if (tag === 'dup') return l ? 'Duplicate' : '疑似重复';
  if (tag === 'price') {
    return l
      ? historical
        ? 'Historical Benchmark Review'
        : 'Procurement scope'
      : historical
        ? '历史补询价'
        : '超采购范围';
  }
  return l ? (historical ? 'Suggested linkage' : 'No procurement') : historical ? '建议补建采购记录' : '无采购记录';
}

const HIST_PROC_ZH_SUFFIX = '历史发票补建采购';
const HIST_PROC_EN_SUFFIX = 'Historical invoice linkage';
const FALLBACK_HIST_PROC_TITLE_ZH = '历史采购补建草稿';
const FALLBACK_HIST_PROC_TITLE_EN = 'Historical procurement draft';

/** One-line truncation for procurement titles */
function truncateOneLine(s: string, max: number): string {
  const t = s.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, Math.max(1, max - 1))}…`;
}

function financeCatLabelInvoice(value: string | null | undefined, languageEn: boolean): string {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  const key = trimmed || 'general';
  const c = CATEGORIES.find((x) => x.value === key);
  if (!c) return trimmed || (languageEn ? 'General' : '一般');
  return languageEn ? c.labelEn : c.labelZh;
}

function pickInvoiceDescriptionForProcTitle(inv: Invoice): string {
  const zh = typeof inv.description_zh === 'string' && inv.description_zh.trim() ? inv.description_zh.trim() : '';
  if (zh) return truncateOneLine(zh, 240);
  const en = typeof inv.description_en === 'string' && inv.description_en.trim() ? inv.description_en.trim() : '';
  if (en) return truncateOneLine(en, 240);
  const d = typeof inv.description === 'string' && inv.description.trim() ? inv.description.trim() : '';
  return truncateOneLine(d, 240);
}

function inferHistoricalProcurementTitles(inv: Invoice): { titleZh: string; titleEn: string } {
  const desc = pickInvoiceDescriptionForProcTitle(inv);
  if (desc)
    return {
      titleZh: truncateOneLine(desc, 140),
      titleEn: truncateOneLine(desc, 140),
    };
  const vendorZh = inv.vendor_name?.trim() || '';
  const vendorEn = inv.vendor_name?.trim() || '';
  if (!vendorZh) {
    return { titleZh: FALLBACK_HIST_PROC_TITLE_ZH, titleEn: FALLBACK_HIST_PROC_TITLE_EN };
  }
  const catRaw = inv.category?.trim();
  if (catRaw) {
    return {
      titleZh: truncateOneLine(`${vendorZh} · ${financeCatLabelInvoice(catRaw, false)}`, 140),
      titleEn: truncateOneLine(`${vendorEn || vendorZh} · ${financeCatLabelInvoice(catRaw, true)}`, 140),
    };
  }
  return {
    titleZh: truncateOneLine(`${vendorZh}${HIST_PROC_ZH_SUFFIX}`, 140),
    titleEn: truncateOneLine(`${vendorEn || vendorZh} · ${HIST_PROC_EN_SUFFIX}`, 140),
  };
}

function humanHistoricalProcFingerprintLines(inv: Invoice, languageEn: boolean): string {
  const vendor = inv.vendor_name?.trim() || (languageEn ? '—' : '—');
  const num = inv.invoice_number?.trim() || (languageEn ? '—' : '—');
  const amt = Number(inv.total_amount);
  const amtStr = Number.isFinite(amt) ? amt.toFixed(2) : String(inv.total_amount ?? '');
  const dt = (inv.invoice_date || '').slice(0, 10) || (languageEn ? '—' : '—');
  if (languageEn) {
    return `AI historical-invoice linkage draft:\nVendor: ${vendor}\nInvoice: ${num}\nAmount: ${amtStr}\nDate: ${dt}\ninvoice_id: ${inv.id}`;
  }
  return `AI根据历史发票补建：\n供应商：${vendor}\n发票号：${num}\n金额：${amtStr}\n日期：${dt}\ninvoice_id：${inv.id}`;
}

function historicalProcDisclaimerZh(): string {
  return '说明：这是 AI 根据历史发票生成的补建草稿，用于倒查建账；不代表该支出已完成正式采购审批。';
}

function historicalProcDisclaimerEn(): string {
  return 'Note: AI-generated linkage draft from historical invoices for retroactive bookkeeping. Formal procurement approval is not implied.';
}

function inferInvoiceLedgerYearMonth(inv: Invoice): {
  fy: number | null;
  fmDisplay: number | null;
} {
  let fy: number | null = typeof inv.fiscal_year === 'number' && Number.isFinite(inv.fiscal_year) ? inv.fiscal_year : null;
  if (fy === null && typeof inv.invoice_date === 'string' && inv.invoice_date.length >= 4) {
    const parsed = Number(inv.invoice_date.slice(0, 4));
    if (Number.isFinite(parsed)) fy = parsed;
  }
  let fmDisplay: number | null =
    typeof inv.fiscal_month === 'number' && inv.fiscal_month >= 1 && inv.fiscal_month <= 12 ? inv.fiscal_month : null;
  if (
    fmDisplay === null &&
    typeof inv.accounting_month === 'number' &&
    inv.accounting_month >= 1 &&
    inv.accounting_month <= 12
  ) {
    fmDisplay = inv.accounting_month;
  }
  if (fmDisplay === null && typeof inv.invoice_date === 'string' && inv.invoice_date.length >= 7) {
    const m = Number(inv.invoice_date.slice(5, 7));
    if (Number.isFinite(m) && m >= 1 && m <= 12) fmDisplay = m;
  }
  return { fy, fmDisplay };
}

function buildHistoricalProcAiReasonPayload(inv: Invoice): string | null {
  const { fy, fmDisplay } = inferInvoiceLedgerYearMonth(inv);
  const base: Record<string, unknown> = {
    invoice_id: inv.id,
    inference_type: 'historical_inferred',
    reconstruction_source: 'monthly_audit_historical',
    vendor_name: inv.vendor_name,
    invoice_number: inv.invoice_number,
    invoice_date: inv.invoice_date,
    amount: typeof inv.total_amount === 'number' ? inv.total_amount : Number(inv.total_amount),
    category: inv.category,
    fiscal_year: fy ?? inv.fiscal_year ?? null,
    fiscal_month_hint: fmDisplay,
  };
  const raw = inv.ai_extracted_data;
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const rec = raw as Record<string, unknown>;
    for (const k of ['metadata', 'extra_data', 'ai_context', 'source_type'] as const) {
      if (rec[k] !== undefined && rec[k] !== null) base[k] = rec[k];
    }
  }
  try {
    const j = JSON.stringify(base);
    if (j.length <= 8000) return j;
    // Never slice stringified JSON: a cut can land inside a "\\uXXXX" escape and
    // produce invalid JSON / "unsupported Unicode escape sequence" when parsed or stored as jsonb.
    const minimal: Record<string, unknown> = {
      invoice_id: base.invoice_id,
      inference_type: base.inference_type,
      reconstruction_source: base.reconstruction_source,
      vendor_name: String(base.vendor_name ?? '').slice(0, 500),
      invoice_number: base.invoice_number,
      invoice_date: base.invoice_date,
      amount: base.amount,
      category: base.category,
      fiscal_year: base.fiscal_year,
      fiscal_month_hint: base.fiscal_month_hint,
      truncated: true,
      original_json_length: j.length,
    };
    return JSON.stringify(minimal);
  } catch {
    return null;
  }
}

function buildHistoricalProcCopyText(inv: Invoice, languageEn: boolean): string {
  const { titleZh, titleEn } = inferHistoricalProcurementTitles(inv);
  const amt = Number(inv.total_amount);
  const amtStr = Number.isFinite(amt) ? amt.toFixed(2) : String(inv.total_amount ?? '');
  const { fy: fyHint, fmDisplay } = inferInvoiceLedgerYearMonth(inv);
  const fySource = fyHint ?? '';
  const fmSource = fmDisplay ?? '';
  const lines = languageEn
    ? [
        'AI procurement draft — historical linkage',
        `Title EN: ${titleEn}`,
        `Title ZH: ${titleZh}`,
        `Vendor: ${inv.vendor_name ?? ''}`,
        `Amount: ${amtStr}`,
        `Invoice date: ${(inv.invoice_date ?? '').slice(0, 10)}`,
        `Invoice #: ${inv.invoice_number ?? ''}`,
        `invoice_id: ${inv.id}`,
        `category tag: historical_inferred`,
        `fiscal_year: ${fySource || '—'}`,
        `fiscal_month_hint: ${fmSource || '—'}`,
        '',
        humanHistoricalProcFingerprintLines(inv, true),
      ]
    : [
        'AI补建采购记录草稿（倒查）',
        `项目标题 CN: ${titleZh}`,
        `Title EN: ${titleEn}`,
        `供应商：${inv.vendor_name ?? ''}`,
        `金额：${amtStr}`,
        `发票日期：${(inv.invoice_date ?? '').slice(0, 10)}`,
        `发票号：${inv.invoice_number ?? ''}`,
        `invoice_id：${inv.id}`,
        `类型标注：historical_inferred`,
        `fiscal_year：${fySource || '—'}`,
        `推断 fiscal_month：${fmSource || '—'}`,
        '',
        humanHistoricalProcFingerprintLines(inv, false),
      ];
  return lines.filter(Boolean).join('\n');
}

/**
 * Canonical `procurement_status` enum (see migrations): includes `approved` — suitable as
 * council-confirmed baseline for invoice matching without implying job `completed`.
 */
const HISTORICAL_PROC_CONFIRMED_STATUS = 'approved' as const;

function buildHistoricalProcDraftInsertPayload(
  inv: Invoice,
  posterId: string,
  propertyId: string,
): Record<string, unknown> {
  const { titleZh, titleEn } = inferHistoricalProcurementTitles(inv);
  const amtNum = Number(inv.total_amount);
  const amtSafe = Number.isFinite(amtNum) ? amtNum : 0;
  const { fy } = inferInvoiceLedgerYearMonth(inv);

  const humanZh = humanHistoricalProcFingerprintLines(inv, false);
  const humanEn = humanHistoricalProcFingerprintLines(inv, true);

  const description_zh = `${historicalProcDisclaimerZh()}\n\n${humanZh}\n\ninvoice_id：${inv.id}`;
  const description_en = `${historicalProcDisclaimerEn()}\n\n${humanEn}\n\ninvoice_id: ${inv.id}`;

  const base: Record<string, unknown> = {
    property_id: propertyId,
    posted_by: posterId,
    title_zh: titleZh || FALLBACK_HIST_PROC_TITLE_ZH,
    title_en: titleEn || FALLBACK_HIST_PROC_TITLE_EN,
    description_zh,
    description_en,
    estimated_budget: amtSafe,
    status: 'draft',
    job_type: 'procurement',
    priority: 'medium',
    category: 'historical_inferred',
    unit_number: null,
    task_id: null,
  };
  if (fy != null) base.fiscal_year = fy;
  const reason = buildHistoricalProcAiReasonPayload(inv);
  if (reason) base.ai_estimate_reasoning = reason;
  return base;
}

function HistoricalInvoiceProcDraftModal(props: {
  invoice: Invoice;
  languageEn: boolean;
  busy: boolean;
  feedback: string | null;
  /** Council / admin / property_admin — same as invoice workflow auditors. */
  canAudit: boolean;
  savedJobId: string | null;
  isConfirmedBaseline: boolean;
  confirmUnavailable: boolean;
  confirmBusy: boolean;
  onConfirmBaseline: () => void;
  onClose: () => void;
  onPersist: () => void;
}) {
  const {
    invoice,
    languageEn,
    busy,
    feedback,
    canAudit,
    savedJobId,
    isConfirmedBaseline,
    confirmUnavailable,
    confirmBusy,
    onConfirmBaseline,
    onClose,
    onPersist,
  } = props;
  const [copyHint, setCopyHint] = useState<string | null>(null);

  const bundle = useMemo(() => {
    const titles = inferHistoricalProcurementTitles(invoice);
    const amtNum = Number(invoice.total_amount);
    const amtStr = Number.isFinite(amtNum) ? amtNum.toFixed(2) : String(invoice.total_amount ?? '');
    const { fy, fmDisplay } = inferInvoiceLedgerYearMonth(invoice);
    const copyText = buildHistoricalProcCopyText(invoice, languageEn);
    return { titles, amtStr, fy, fmDisplay, copyText };
  }, [invoice, languageEn]);

  return (
    <div
      className="fixed inset-0 z-[62] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hist-proc-draft-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          <h2 id="hist-proc-draft-title" className="text-base font-semibold text-gray-900">
            {languageEn ? 'AI procurement draft (historical)' : 'AI补建采购记录草稿'}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            {languageEn ? historicalProcDisclaimerEn() : historicalProcDisclaimerZh()}
          </p>
          {isConfirmedBaseline ? (
            <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50/90 px-2.5 py-2 text-[11px] font-medium leading-relaxed text-emerald-950">
              <span className="block">{languageEn ? 'Confirmed historical record' : '已确认补建记录'}</span>
              <span className="mt-1 block font-normal text-emerald-900/95">
                {languageEn
                  ? 'Council confirmed this record as a historical reconstruction baseline for matching; this does not mean formal procurement approval was completed at that time.'
                  : 'Council确认该记录为历史补建采购基线，不代表当时已完成正式采购审批。'}
              </span>
            </p>
          ) : null}
        </div>
        <div className="space-y-3 overflow-y-auto px-4 py-3 text-sm text-gray-800" style={{ maxHeight: '52vh' }}>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
            <dt className="font-medium text-gray-500">{languageEn ? 'Project title ZH' : '项目标题（中）'}</dt>
            <dd className="min-w-0 break-words">{bundle.titles.titleZh}</dd>
            <dt className="font-medium text-gray-500">{languageEn ? 'Project title EN' : '项目标题（英）'}</dt>
            <dd className="min-w-0 break-words">{bundle.titles.titleEn}</dd>
            <dt className="font-medium text-gray-500">{languageEn ? 'Vendor' : '供应商'}</dt>
            <dd>{invoice.vendor_name || '—'}</dd>
            <dt className="font-medium text-gray-500">{languageEn ? 'Amount' : '金额'}</dt>
            <dd className="font-semibold tabular-nums">${bundle.amtStr}</dd>
            <dt className="font-medium text-gray-500">{languageEn ? 'Invoice date' : '发票日期'}</dt>
            <dd>{(invoice.invoice_date || '').slice(0, 10) || '—'}</dd>
            <dt className="font-medium text-gray-500">{languageEn ? 'Invoice #' : '发票号'}</dt>
            <dd>{invoice.invoice_number || '—'}</dd>
            <dt className="font-medium text-gray-500">invoice_id</dt>
            <dd className="break-all font-mono text-[11px] text-gray-700">{invoice.id}</dd>
            <dt className="font-medium text-gray-500">{languageEn ? 'Type tag' : '类型'}</dt>
            <dd>
              <code className="rounded bg-gray-100 px-1 py-0.5 text-[11px]">historical_inferred</code>
            </dd>
            <dt className="font-medium text-gray-500">{languageEn ? 'fiscal_year' : '财年 f.y.'}</dt>
            <dd>{bundle.fy ?? '—'}</dd>
            <dt className="font-medium text-gray-500">{languageEn ? 'fiscal_month (inferred)' : '财年月份（推断）'}</dt>
            <dd>{bundle.fmDisplay ?? '—'}</dd>
            {savedJobId ? (
              <>
                <dt className="font-medium text-gray-500">procurement_jobs.id</dt>
                <dd className="break-all font-mono text-[11px] text-gray-700">{savedJobId}</dd>
              </>
            ) : null}
          </dl>
          {confirmUnavailable ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-950">
              {languageEn
                ? 'This database has no usable confirmed status for historical jobs; keep using the draft and Copy.'
                : '当前采购表缺少可确认状态，暂时只能保存为草稿。'}
            </p>
          ) : null}
        </div>
        {feedback ? (
          <p className="border-t border-gray-100 bg-gray-50 px-4 py-2 text-xs text-gray-700">{feedback}</p>
        ) : null}
        {copyHint ? <p className="border-t border-gray-100 px-4 py-1.5 text-center text-[11px] text-emerald-800">{copyHint}</p> : null}
          <button
            type="button"
            onClick={() => {
              void (async () => {
                try {
                  if (!navigator.clipboard?.writeText) throw new Error('no_clipboard');
                  await navigator.clipboard.writeText(bundle.copyText);
                  setCopyHint(languageEn ? 'Copied.' : '已复制。');
                  window.setTimeout(() => setCopyHint(null), 2000);
                } catch {
                  setCopyHint(languageEn ? 'Copy failed.' : '复制失败。');
                  window.setTimeout(() => setCopyHint(null), 2500);
                }
              })();
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
          >
            <Copy className="size-3.5" aria-hidden />
            {languageEn ? 'Copy for procurement form' : '复制为采购记录'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={busy || confirmBusy}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            {languageEn ? 'Close' : '关闭'}
          </button>
          <button
            type="button"
            disabled={busy || confirmBusy || !!savedJobId || isConfirmedBaseline}
            onClick={onPersist}
            title={savedJobId && !languageEn ? '草稿已保存，可进行确认或使用复制。' : savedJobId ? 'Draft saved.' : undefined}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
            {languageEn ? 'Save draft' : '保存草稿'}
          </button>
          {canAudit && savedJobId && !isConfirmedBaseline && !confirmUnavailable ? (
            <button
              type="button"
              disabled={busy || confirmBusy}
              onClick={() => void onConfirmBaseline()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-800 disabled:opacity-60"
            >
              {confirmBusy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : null}
              {languageEn ? 'Confirm record' : '确认补建采购记录'}
            </button>
          ) : null}
      </div>
    </div>
  );
}

function MonthlyAutoAuditPanel(props: {
  monthKey: string;
  accountingYear: number;
  accountingMonth: number;
  monthList: Invoice[];
  governanceStartIso: string | null;
  l: boolean;
  canAudit: boolean;
  busyMonthKey: string | null;
  onRunForMonth: (mk: string, list: Invoice[]) => void;
  onPickInvoice: (inv: Invoice) => void;
  onOpenHistoricalProcDraft: (inv: Invoice) => void;
  onOpenBenchmarkReview: (inv: Invoice) => void;
  hybridAuditByInvoiceId: Record<string, { over_budget: boolean; bypass_approval: boolean; ai_high: boolean }>;
  quoteVarianceByInvoiceId: Record<string, QuoteVarianceResult>;
  aiAuditListMap: Record<string, { risk_level: string; risk_score: number }>;
  anomaliesByInvoiceId: Record<string, InvoiceAnomalyLite[]>;
  historicalAuditByInvoiceId: Record<string, HistoricalAuditPayload | null>;
}) {
  const {
    monthKey,
    accountingYear,
    accountingMonth,
    monthList,
    governanceStartIso,
    l,
    canAudit,
    busyMonthKey,
    onRunForMonth,
    onPickInvoice,
    onOpenHistoricalProcDraft,
    onOpenBenchmarkReview,
    hybridAuditByInvoiceId,
    quoteVarianceByInvoiceId,
    aiAuditListMap,
    anomaliesByInvoiceId,
    historicalAuditByInvoiceId,
  } = props;

  const { mode: ledgerMode, governanceUnset } = resolveLedgerGovernanceMode(
    accountingYear,
    accountingMonth,
    governanceStartIso,
  );

  const [auditDrillFilter, setAuditDrillFilter] = useState<MonthlyAuditFilter>('all');

  useEffect(() => {
    setAuditDrillFilter('all');
  }, [monthKey]);

  /**
   * Historical bookkeeping months (and properties without a configured governance
   * start date) are archive-only: hide audit stats / table / run buttons and show
   * a lightweight notice instead. Only formal-governance months keep the audit UI.
   */
  if (ledgerMode === 'historical') {
    return (
      <section
        className="mx-4 mb-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 shadow-sm sm:mx-8"
        aria-labelledby={`month-ai-audit-heading-${monthKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
      >
        <h3
          id={`month-ai-audit-heading-${monthKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
          className="text-sm font-semibold text-slate-900"
        >
          {l ? 'Historical invoices archived' : '历史发票已归档'}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-700">
          {l
            ? 'Invoices before the governance start date are kept for records only and are not included in AI audit.'
            : '治理启动前的历史发票仅用于留档和查看，不进行 AI 自动审计。'}
        </p>
        {governanceUnset ? (
          <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
            {l
              ? 'Tip: set the governance start date on the AGM Approved Budget tab to enable monthly AI audit for current periods.'
              : '提示：在「AGM批准预算」页设置「治理启动日期」后，治理期内的会计月即可启用 AI 月度自动审计。'}
          </p>
        ) : null}
      </section>
    );
  }

  const { stats, rows } = useMemo(() => {
    let colA = 0;
    let colB = 0;
    let budget = 0;
    let dup = 0;
    let anyCount = 0;
    type Row = {
      inv: Invoice;
      typeLabelZh: string;
      typeLabelEn: string;
      detail: string;
      tags: MonthlyAuditTag[];
      historicalAudit: HistoricalAuditPayload | null;
    };
    const outRows: Row[] = [];

    const isHistorical = ledgerMode === 'historical';

    for (const inv of monthList) {
      const ha = historicalAuditByInvoiceId[inv.id] ?? null;
      const histCand = isHistoricalAuditCandidate(ha);
      const anomalies = anomaliesByInvoiceId[inv.id] ?? [];
      const sx = monthlyRiskSignals(inv, {
        hybrid: hybridAuditByInvoiceId[inv.id],
        qv: quoteVarianceByInvoiceId[inv.id],
        anomalies,
        ai: aiAuditListMap[inv.id],
      });
      if (!sx.anyAlert && !histCand) continue;
      anyCount += 1;
      if (isHistorical) {
        if (sx.noProcurement) colA += 1;
        if (historicalBenchmarkReviewRow(sx)) colB += 1;
        if (sx.overBudget) budget += 1;
        if (sx.duplicate) dup += 1;
      } else {
        if (sx.procurementScope) colA += 1;
        if (sx.overBudget) budget += 1;
        if (sx.duplicate) dup += 1;
        if (sx.noProcurement) colB += 1;
      }

      const tags = monthlyRowTags(isHistorical, sx, ha);

      const typeBitsZh: string[] = [];
      const typeBitsEn: string[] = [];
      if (histCand) {
        typeBitsZh.push(historicalAuditProcurementSuggestLabel(false));
        typeBitsEn.push(historicalAuditProcurementSuggestLabel(true));
      }
      const orderedTags: MonthlyAuditTag[] = ['link', 'price', 'dup', 'budget'];
      for (const tg of orderedTags) {
        if (!tags.includes(tg)) continue;
        typeBitsZh.push(monthlyTagLabel(tg, false, isHistorical));
        typeBitsEn.push(monthlyTagLabel(tg, true, isHistorical));
      }
      if (typeBitsZh.length === 0) {
        typeBitsZh.push('综合风险');
        typeBitsEn.push('Risk signal');
      }

      outRows.push({
        inv,
        typeLabelZh: typeBitsZh.slice(0, 5).join('、'),
        typeLabelEn: typeBitsEn.slice(0, 5).join(' · '),
        detail: buildMonthlyRiskExplanation(l, inv, sx, anomalies, ledgerMode, ha),
        tags: tags.length ? tags : ([] as MonthlyAuditTag[]),
        historicalAudit: ha,
      });
    }

    const statsOut = isHistorical
      ? {
          total: anyCount,
          colA,
          colB,
          duplicate: dup,
          budget,
        }
      : {
          total: anyCount,
          colA,
          duplicate: dup,
          budget,
          colB,
        };

    outRows.sort((a, b) => a.inv.vendor_name.localeCompare(b.inv.vendor_name));
    return { stats: statsOut, rows: outRows };
  }, [
    monthKey,
    monthList,
    l,
    ledgerMode,
    hybridAuditByInvoiceId,
    quoteVarianceByInvoiceId,
    aiAuditListMap,
    anomaliesByInvoiceId,
    historicalAuditByInvoiceId,
  ]);

  const drillFilteredRows = useMemo(() => {
    if (auditDrillFilter === 'all') return rows;
    return rows.filter((r) => r.tags.includes(auditDrillFilter));
  }, [rows, auditDrillFilter]);

  const pickDrillFilter = (next: MonthlyAuditFilter) => {
    setAuditDrillFilter((prev) => {
      if (next === 'all') return 'all';
      return prev === next ? 'all' : next;
    });
  };

  const historical = false;

  const bust = busyMonthKey === monthKey;

  return (
    <section
      className="mx-4 mb-3 rounded-xl border border-indigo-200 bg-indigo-50/75 px-4 py-4 shadow-sm sm:mx-8"
      aria-labelledby={`month-ai-audit-heading-${monthKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="text-sm font-semibold text-indigo-950"
            id={`month-ai-audit-heading-${monthKey.replace(/[^a-zA-Z0-9_-]/g, '-')}`}
          >
            {l ? 'Monthly Auto Audit' : 'AI月度自动审计'}
          </h3>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-indigo-800/85">
            {l ? 'Governance Enforcement Mode' : '正式治理模式'}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-indigo-900/80">
            {l
              ? 'Each invoice month after governance compares approved procurement envelopes, AGM budgets, and posted invoices with full enforcement—including missing-quote alerts.'
              : '治理启动日当月及之后的账本，系统将按批复采购范围与 AGM 预算对发票进行全面合规提示（含无采购记录告警）。'}
          </p>
        </div>
        <button
          type="button"
          disabled={!canAudit || bust}
          onClick={() => onRunForMonth(monthKey, monthList)}
          className="shrink-0 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {bust ? (l ? 'Running audits…' : '正在批量审计…') : l ? 'Run monthly audit' : '运行本月自动审计'}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-5">
        <button
          type="button"
          onClick={() => pickDrillFilter('all')}
          aria-pressed={auditDrillFilter === 'all'}
          className={`rounded-lg px-2 py-2 text-left shadow-sm ring-1 transition hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
            auditDrillFilter === 'all'
              ? 'bg-white ring-2 ring-indigo-600 ring-offset-1 ring-offset-indigo-50/50'
              : 'bg-white/90 ring-indigo-100'
          }`}
        >
          <div className="text-[10px] font-medium uppercase text-indigo-600">{l ? 'All risks' : '全部风险'}</div>
          <div className="text-lg font-bold tabular-nums text-indigo-950">{stats.total}</div>
        </button>
        {historical ? (
          <>
            <button
              type="button"
              onClick={() => pickDrillFilter('link')}
              aria-pressed={auditDrillFilter === 'link'}
              className={`rounded-lg px-2 py-2 text-left shadow-sm ring-1 transition hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                auditDrillFilter === 'link'
                  ? 'bg-blue-100 ring-2 ring-blue-600 ring-offset-1 ring-offset-indigo-50/50'
                  : 'bg-blue-50/90 text-blue-950 ring-blue-200'
              }`}
            >
              <div className="text-[10px] font-medium uppercase text-blue-800">{l ? 'Suggested linkage' : '建议补建采购记录'}</div>
              <div className="text-lg font-bold tabular-nums">{stats.colA}</div>
            </button>
            <button
              type="button"
              onClick={() => pickDrillFilter('price')}
              aria-pressed={auditDrillFilter === 'price'}
              className={`rounded-lg px-2 py-2 text-left shadow-sm ring-1 transition hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                auditDrillFilter === 'price'
                  ? 'bg-amber-100 ring-2 ring-amber-500 ring-offset-1 ring-offset-indigo-50/50'
                  : 'bg-amber-50/95 text-amber-950 ring-amber-200'
              }`}
            >
              <div className="text-[10px] font-medium uppercase text-amber-900">{l ? 'Historical Benchmark Review' : '历史补询价'}</div>
              <div className="text-lg font-bold tabular-nums">{stats.colB}</div>
            </button>
            <button
              type="button"
              onClick={() => pickDrillFilter('dup')}
              aria-pressed={auditDrillFilter === 'dup'}
              className={`rounded-lg px-2 py-2 text-left shadow-sm ring-1 transition hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                auditDrillFilter === 'dup'
                  ? 'bg-orange-100 ring-2 ring-orange-500 ring-offset-1 ring-offset-indigo-50/50'
                  : 'bg-orange-50/95 text-orange-950 ring-orange-200'
              }`}
            >
              <div className="text-[10px] font-medium uppercase text-orange-900">{l ? 'Duplicates' : '疑似重复'}</div>
              <div className="text-lg font-bold tabular-nums">{stats.duplicate}</div>
            </button>
            <button
              type="button"
              onClick={() => pickDrillFilter('budget')}
              aria-pressed={auditDrillFilter === 'budget'}
              className={`col-span-2 rounded-lg px-2 py-2 text-left shadow-sm ring-1 transition hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:col-span-1 ${
                auditDrillFilter === 'budget'
                  ? 'bg-red-100 ring-2 ring-red-600 ring-offset-1 ring-offset-indigo-50/50'
                  : 'bg-red-50/95 text-red-950 ring-red-200'
              }`}
            >
              <div className="text-[10px] font-medium uppercase text-red-800">{l ? 'Over budget' : '超预算'}</div>
              <div className="text-lg font-bold tabular-nums">{stats.budget}</div>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => pickDrillFilter('link')}
              aria-pressed={auditDrillFilter === 'link'}
              className={`rounded-lg px-2 py-2 text-left shadow-sm ring-1 transition hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                auditDrillFilter === 'link'
                  ? 'bg-red-100 ring-2 ring-red-600 ring-offset-1 ring-offset-indigo-50/50'
                  : 'bg-red-50/95 text-red-950 ring-red-200'
              }`}
            >
              <div className="text-[10px] font-medium uppercase text-red-800">{l ? 'No procurement' : '无采购记录'}</div>
              <div className="text-lg font-bold tabular-nums">{stats.colB}</div>
            </button>
            <button
              type="button"
              onClick={() => pickDrillFilter('price')}
              aria-pressed={auditDrillFilter === 'price'}
              className={`rounded-lg px-2 py-2 text-left shadow-sm ring-1 transition hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                auditDrillFilter === 'price'
                  ? 'bg-red-100 ring-2 ring-red-700 ring-offset-1 ring-offset-indigo-50/50'
                  : 'bg-red-50/95 text-red-950 ring-red-300'
              }`}
            >
              <div className="text-[10px] font-medium uppercase text-red-800">{l ? 'Procurement scope' : '超采购范围'}</div>
              <div className="text-lg font-bold tabular-nums">{stats.colA}</div>
            </button>
            <button
              type="button"
              onClick={() => pickDrillFilter('dup')}
              aria-pressed={auditDrillFilter === 'dup'}
              className={`rounded-lg px-2 py-2 text-left shadow-sm ring-1 transition hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                auditDrillFilter === 'dup'
                  ? 'bg-orange-100 ring-2 ring-orange-500 ring-offset-1 ring-offset-indigo-50/50'
                  : 'bg-orange-50/95 text-orange-950 ring-orange-200'
              }`}
            >
              <div className="text-[10px] font-medium uppercase text-orange-900">{l ? 'Duplicates' : '疑似重复'}</div>
              <div className="text-lg font-bold tabular-nums">{stats.duplicate}</div>
            </button>
            <button
              type="button"
              onClick={() => pickDrillFilter('budget')}
              aria-pressed={auditDrillFilter === 'budget'}
              className={`col-span-2 rounded-lg px-2 py-2 text-left shadow-sm ring-1 transition hover:brightness-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 sm:col-span-1 ${
                auditDrillFilter === 'budget'
                  ? 'bg-red-100 ring-2 ring-red-600 ring-offset-1 ring-offset-indigo-50/50'
                  : 'bg-red-50/95 text-red-950 ring-red-200'
              }`}
            >
              <div className="text-[10px] font-medium uppercase text-red-800">{l ? 'Over budget' : '超预算'}</div>
              <div className="text-lg font-bold tabular-nums">{stats.budget}</div>
            </button>
          </>
        )}
      </div>
      {auditDrillFilter !== 'all' && rows.length > 0 ? (
        <p className="mt-2 text-[11px] text-indigo-800/80">
          {l
            ? `Filtered: ${drillFilteredRows.length} of ${rows.length} · click the same card again to clear`
            : `当前筛选：${drillFilteredRows.length} / ${rows.length} 条 · 再次点击同一卡片可取消筛选`}
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-lg border border-indigo-100 bg-white shadow-sm">
        <div className="border-b border-indigo-100 bg-indigo-50/70 px-3 py-2 text-xs font-semibold text-indigo-950">
          {l
            ? `Ledger ${accountingYear}-${String(accountingMonth).padStart(2, '0')} · alert inbox`
            : `账本 ${accountingYear}年${accountingMonth}月 · 报警名单`}
        </div>
        {rows.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-indigo-800/75">
            {l ? 'No automated alerts matched for this accounting month.' : '该月份暂无匹配的自动报警条目。'}
          </div>
        ) : drillFilteredRows.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-indigo-800/75">
            {l ? 'No rows match this filter. Choose “All risks” or another card.' : '当前筛选下暂无条目，可点「全部风险」或其它卡片。'}
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto overscroll-contain">
            <table className="w-full min-w-0 border-collapse text-left text-xs">
              <thead className="sticky top-0 z-[1] border-b border-indigo-100 bg-white text-[10px] font-semibold uppercase tracking-wide text-indigo-900/80">
                <tr>
                  <th className="whitespace-nowrap px-3 py-2">{l ? 'Vendor' : '供应商'}</th>
                  <th className="whitespace-nowrap px-2 py-2">{l ? 'Invoice #' : '发票号'}</th>
                  <th className="whitespace-nowrap px-2 py-2">{l ? 'Amount' : '金额'}</th>
                  <th className="min-w-0 px-2 py-2">{l ? 'Risk' : '风险类型'}</th>
                  <th className="min-w-[160px] px-2 py-2">{l ? 'Details' : '风险说明'}</th>
                  <th className="whitespace-nowrap px-3 py-2 text-right">{l ? 'Actions' : '操作'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-50">
                {drillFilteredRows.map((row) => {
                  const pillTags = row.tags.length ? row.tags : ([] as MonthlyAuditTag[]);
                  const ha = row.historicalAudit;
                  const histCandidate = isHistoricalAuditCandidate(ha);
                  return (
                    <tr
                      key={row.inv.id}
                      className={`hover:opacity-95 ${rowRiskAccentClass(pillTags, historical, ha)}`}
                    >
                      <td
                        className="max-w-[130px] truncate px-3 py-2 font-medium text-gray-900"
                        title={row.inv.vendor_name}
                      >
                        {row.inv.vendor_name}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-gray-700">{row.inv.invoice_number || '—'}</td>
                      <td className="whitespace-nowrap px-2 py-2 font-semibold tabular-nums text-gray-900">
                        ${Number(row.inv.total_amount).toFixed(2)}
                      </td>
                      <td className="max-w-[200px] px-2 py-2 align-top text-[11px]">
                        <div className="flex flex-wrap gap-0.5">
                          {histCandidate ? (
                            <span
                              className={`inline-block max-w-full truncate rounded px-1.5 py-px text-[10px] font-semibold ${historicalAuditListPillClass(ha?.benchmarkStatus)}`}
                              title={historicalAuditListTooltip(ha?.benchmarkStatus, l)}
                            >
                              {historicalAuditProcurementSuggestLabel(l)}
                            </span>
                          ) : null}
                          {pillTags.map((tg) => (
                            <span
                              key={tg}
                              className={`inline-block max-w-full truncate rounded px-1.5 py-px text-[10px] font-semibold ${monthlyTagPillClass(tg, historical)}`}
                              title={monthlyTagLabel(tg, l, historical)}
                            >
                              {monthlyTagLabel(tg, l, historical)}
                            </span>
                          ))}
                          {!histCandidate && pillTags.length === 0 ? (
                            <span className="font-medium text-slate-700">
                              {l ? row.typeLabelEn : row.typeLabelZh}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="max-w-[220px] px-2 py-2 align-top text-[11px] text-gray-700">
                        <span className="line-clamp-3">{row.detail}</span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right align-top">
                        <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end sm:gap-2">
                          {histCandidate && historical && canAudit ? (
                            <button
                              type="button"
                              title={historicalAuditListTooltip(ha?.benchmarkStatus, l)}
                              onClick={() => onOpenHistoricalProcDraft(row.inv)}
                              className={`inline-flex items-center gap-0.5 rounded-md px-2 py-1 text-[11px] font-semibold ${historicalAuditListButtonClass(ha?.benchmarkStatus)}`}
                            >
                              {historicalAuditProcurementSuggestLabel(l)}
                              {ha?.benchmarkStatus === 'warning' ? (
                                <AlertTriangle className="size-3 shrink-0 opacity-90" aria-hidden />
                              ) : null}
                            </button>
                          ) : (
                            <>
                              {historical && canAudit && pillTags.includes('link') ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenHistoricalProcDraft(row.inv)}
                                  className="rounded-md px-2 py-1 text-[11px] font-semibold bg-indigo-50 text-indigo-800 hover:bg-indigo-100 ring-1 ring-indigo-200/80"
                                >
                                  {l ? 'Create draft' : 'AI补建草稿'}
                                </button>
                              ) : null}
                              {historical && pillTags.includes('price') ? (
                                <button
                                  type="button"
                                  onClick={() => onOpenBenchmarkReview(row.inv)}
                                  className="rounded-md px-2 py-1 text-[11px] font-semibold bg-amber-50 text-amber-950 hover:bg-amber-100 ring-1 ring-amber-200/80"
                                >
                                  {l ? 'Benchmark review' : '历史补询价'}
                                </button>
                              ) : null}
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => onPickInvoice(row.inv)}
                            className="rounded-md px-2 py-1 text-[11px] font-semibold text-indigo-700 hover:bg-indigo-100"
                          >
                            {l ? 'View invoice' : '查看发票'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!canAudit ? (
        <p className="mt-2 text-[10px] text-indigo-800/65">
          {l ? 'Council or property admins can rerun monthly audits from here.' : '业委会或管理处可在此处触发本月批量审计。'}
        </p>
      ) : null}
    </section>
  );
}

function HistoricalAuditBenchmarkBlock({
  audit,
  invoiceAmount,
  languageEn,
}: {
  audit: HistoricalAuditPayload;
  invoiceAmount: number;
  languageEn: boolean;
}) {
  const l = languageEn;
  const status = audit.benchmarkStatus;
  const rangeText = formatHistoricalBenchmarkRange(audit.benchmarkLow, audit.benchmarkHigh, l);
  const amt = Number.isFinite(invoiceAmount) ? invoiceAmount : 0;

  return (
    <div
      className={`rounded-xl p-4 space-y-3 ${historicalAuditPanelClass(status)}`}
      aria-labelledby="hist-audit-benchmark-heading"
    >
      <div id="hist-audit-benchmark-heading" className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900">
          {l ? 'Market benchmark' : 'AI市场核价'}
        </h4>
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${historicalAuditStatusBadgeClass(status)}`}
        >
          {historicalAuditStatusMessage(status, l)}
        </span>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <div>
          <dt className="text-xs text-gray-600">{l ? 'Service type' : '服务类型'}</dt>
          <dd className="font-medium text-gray-900">
            {historicalAuditServiceTypeLabel(audit.serviceType, l)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-gray-600">{l ? 'Market reference' : '市场参考'}</dt>
          <dd className="font-medium text-gray-900">{rangeText}</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-600">{l ? 'Invoice amount' : '当前发票金额'}</dt>
          <dd className="font-medium text-gray-900">${amt.toFixed(2)} CAD</dd>
        </div>
        <div>
          <dt className="text-xs text-gray-600">{l ? 'Assessment' : '判断'}</dt>
          <dd className="font-medium text-gray-900">{historicalAuditStatusMessage(status, l)}</dd>
        </div>
        {typeof audit.variancePct === 'number' && Number.isFinite(audit.variancePct) ? (
          <div className="sm:col-span-2">
            <dt className="text-xs text-gray-600">{l ? 'Vs. range midpoint' : '相对区间中位'}</dt>
            <dd className="font-medium text-gray-900">
              {audit.variancePct >= 0 ? '+' : ''}
              {audit.variancePct}%
            </dd>
          </div>
        ) : null}
      </dl>
      {audit.reasoning?.trim() ? (
        <div className="text-sm text-gray-700 border-t border-gray-200/80 pt-3">
          <span className="font-medium text-gray-900">{l ? 'Basis' : '依据'}: </span>
          <span className="leading-relaxed">{audit.reasoning.trim()}</span>
        </div>
      ) : null}
    </div>
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

export type InvoiceManagementHandle = {
  exportCsv: () => void;
  exportExcel: () => void;
  openUploadModal: () => void;
};

export type InvoiceManagementProps = {
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
  /** 隐藏列表页内嵌 CSV / Excel / 上传（由父级工具栏触发） */
  hideToolbar?: boolean;
  /** 上报上传进行中状态（供外部工具栏禁用按钮） */
  onUploadingChange?: (uploading: boolean) => void;
};

export const InvoiceManagement = forwardRef<InvoiceManagementHandle, InvoiceManagementProps>(function InvoiceManagement(
  {
    highlightInvoiceId,
    dangerFilterOnly = false,
    auditFilterOnly = false,
    abnormalFilterOnly = false,
    highRiskFilterOnly = false,
    rangeThisMonthOnly = false,
    hideToolbar = false,
    onUploadingChange,
  },
  ref,
) {
  const { profile } = useAuth();
  const { currentPropertyId, roleInProperty } = useProperty();
  const { language } = useLanguage();
  const l = language === 'en';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadFollowUpHint, setUploadFollowUpHint] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Invoice | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [archiveEditTarget, setArchiveEditTarget] = useState<Invoice | null>(null);
  const [archiveEditYear, setArchiveEditYear] = useState<number>(() => new Date().getFullYear());
  const [archiveEditMonth, setArchiveEditMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [archiveSaving, setArchiveSaving] = useState(false);
  const [invoiceTaskSource, setInvoiceTaskSource] = useState<
    Record<string, { taskId: string; title: string }>
  >({});
  const [quoteVarianceByInvoiceId, setQuoteVarianceByInvoiceId] = useState<Record<string, QuoteVarianceResult>>({});
  /** 关联报价是否超预算承诺（pending 审批时可读，用于必填审批理由） */
  const [quoteOverBudgetByInvoiceId, setQuoteOverBudgetByInvoiceId] = useState<Record<string, boolean>>({});
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadAccountingYear, setUploadAccountingYear] = useState(() => currentAccountingDefaults().year);
  const [uploadAccountingMonth, setUploadAccountingMonth] = useState(() => currentAccountingDefaults().month);
  const uploadPackagePdfInputRef = useRef<HTMLInputElement>(null);
  const uploadSupplementInputRef = useRef<HTMLInputElement>(null);
  const [payablePackageSummary, setPayablePackageSummary] = useState<PayablePackageResult | null>(null);
  const [expandedYears, setExpandedYears] = useState<Set<number>>(() => new Set());
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => new Set());
  const expandAccountingUiDone = useRef(false);

  const openUploadModal = useCallback(() => {
    if (!canUploadInvoicePackage(roleInProperty)) return;
    const d = currentAccountingDefaults();
    setUploadAccountingYear(d.year);
    setUploadAccountingMonth(d.month);
    setUploadModalOpen(true);
  }, [roleInProperty]);

  const canAudit = canManageInvoiceWorkflow(roleInProperty);
  const canUploadPkg = canUploadInvoicePackage(roleInProperty);

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

  const openArchiveModal = useCallback((inv: Invoice) => {
    setArchiveEditYear(effectiveAccountingYear(inv));
    setArchiveEditMonth(effectiveAccountingMonth(inv));
    setArchiveEditTarget(inv);
  }, []);

  const saveArchivePeriod = useCallback(async () => {
    if (!archiveEditTarget || !currentPropertyId || !profile?.id) return;
    if (!canManageInvoiceWorkflow(roleInProperty)) return;
    const y = Math.floor(Number(archiveEditYear));
    const m = Math.floor(Number(archiveEditMonth));
    if (!Number.isFinite(y) || y < 1900 || y > 2100) {
      window.alert(l ? 'Enter a valid year (1900–2100).' : '请输入有效年份（1900–2100）。');
      return;
    }
    if (!Number.isFinite(m) || m < 1 || m > 12) {
      window.alert(l ? 'Enter a valid month (1–12).' : '请输入有效月份（1–12）。');
      return;
    }
    setArchiveSaving(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          accounting_year: y,
          accounting_month: m,
          updated_at: new Date().toISOString(),
        })
        .eq('id', archiveEditTarget.id)
        .eq('property_id', currentPropertyId);
      if (error) {
        window.alert(error.message);
        return;
      }
      await supabase.from('invoice_audit_log').insert({
        property_id: currentPropertyId,
        invoice_id: archiveEditTarget.id,
        actor_id: profile.id,
        action: 'edit_details',
        notes: null,
        old_status: archiveEditTarget.status,
        new_status: archiveEditTarget.status,
      });
      setArchiveEditTarget(null);
      await loadInvoicesQuiet();
    } finally {
      setArchiveSaving(false);
    }
  }, [
    archiveEditTarget,
    archiveEditYear,
    archiveEditMonth,
    currentPropertyId,
    profile?.id,
    roleInProperty,
    loadInvoicesQuiet,
    l,
  ]);

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
        .eq('property_id', currentPropertyId)
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

  const [historicalAuditByInvoiceId, setHistoricalAuditByInvoiceId] = useState<
    Record<string, HistoricalAuditPayload | null>
  >({});

  useEffect(() => {
    if (!currentPropertyId || invoices.length === 0) {
      setHistoricalAuditByInvoiceId({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const ids = invoices.map((i) => i.id);
      const CHUNK = 100;
      const merged: Record<string, HistoricalAuditPayload | null> = {};
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from('invoice_ai_audit_contexts')
          .select('invoice_id, context_json')
          .eq('property_id', currentPropertyId)
          .in('invoice_id', slice);
        if (cancelled) return;
        if (error) {
          setHistoricalAuditByInvoiceId({});
          return;
        }
        for (const row of data ?? []) {
          const ctx = row.context_json;
          merged[row.invoice_id] =
            ctx && typeof ctx === 'object'
              ? parseHistoricalAuditFromContext(ctx as Record<string, unknown>)
              : null;
        }
      }
      if (cancelled) return;
      setHistoricalAuditByInvoiceId(merged);
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

  const [anomaliesByInvoiceId, setAnomaliesByInvoiceId] = useState<Record<string, InvoiceAnomalyLite[]>>({});
  const [anomaliesFetchTick, setAnomaliesFetchTick] = useState(0);
  const [monthlyAuditBusyKey, setMonthlyAuditBusyKey] = useState<string | null>(null);
  const [historicalProcDraftInv, setHistoricalProcDraftInv] = useState<Invoice | null>(null);
  const [benchmarkReviewInv, setBenchmarkReviewInv] = useState<Invoice | null>(null);
  const [historicalProcDraftBusy, setHistoricalProcDraftBusy] = useState(false);
  const [historicalProcDraftFeedback, setHistoricalProcDraftFeedback] = useState<string | null>(null);
  const [historicalProcSavedJobId, setHistoricalProcSavedJobId] = useState<string | null>(null);
  const [historicalProcDraftConfirmed, setHistoricalProcDraftConfirmed] = useState(false);
  const [historicalProcConfirmUnavailable, setHistoricalProcConfirmUnavailable] = useState(false);
  const [historicalProcConfirmBusy, setHistoricalProcConfirmBusy] = useState(false);

  /** `YYYY-MM-DD` from DB, or null if unset */
  const [governanceStartIso, setGovernanceStartIso] = useState<string | null>(null);

  /**
   * Historical ledger month invoices are archive-only — never offer approve/reject in lists.
   * Detail modal has its own `isHistoricalInvoice` check that gates the approval section.
   */
  const isHistoricalRow = useCallback(
    (inv: Invoice): boolean => {
      const { mode } = resolveLedgerGovernanceMode(
        effectiveAccountingYear(inv),
        effectiveAccountingMonth(inv),
        governanceStartIso,
      );
      return mode === 'historical';
    },
    [governanceStartIso],
  );

  useEffect(() => {
    if (!currentPropertyId) {
      setGovernanceStartIso(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('properties')
        .select('governance_start_date')
        .eq('id', currentPropertyId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setGovernanceStartIso(null);
        return;
      }
      const gd = (data as { governance_start_date?: string | null }).governance_start_date ?? null;
      setGovernanceStartIso(gd);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPropertyId]);

  useEffect(() => {
    if (!currentPropertyId || invoices.length === 0) {
      setAnomaliesByInvoiceId({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const ids = invoices.map((i) => i.id);
      const CHUNK = 100;
      const byInv: Record<string, InvoiceAnomalyLite[]> = {};
      for (let i = 0; i < ids.length; i += CHUNK) {
        const slice = ids.slice(i, i + CHUNK);
        const { data, error } = await supabase
          .from('invoice_anomalies')
          .select('invoice_id, rule_code, message_zh, message_en, severity')
          .eq('property_id', currentPropertyId)
          .in('invoice_id', slice);
        if (cancelled) return;
        if (error) {
          if (import.meta.env.DEV) {
            console.warn('[invoices] invoice_anomalies fetch', error.message);
          }
          setAnomaliesByInvoiceId({});
          return;
        }
        for (const row of data ?? []) {
          const invoiceId = String(row.invoice_id ?? '');
          if (!invoiceId) continue;
          if (!byInv[invoiceId]) byInv[invoiceId] = [];
          byInv[invoiceId].push({
            invoice_id: invoiceId,
            rule_code: String(row.rule_code ?? ''),
            message_zh: String(row.message_zh ?? ''),
            message_en: String(row.message_en ?? ''),
            severity: String(row.severity ?? ''),
          });
        }
      }
      if (cancelled) return;
      setAnomaliesByInvoiceId(byInv);
    })();
    return () => {
      cancelled = true;
    };
  }, [invoices, currentPropertyId, anomaliesFetchTick]);

  const runMonthAudit = useCallback(
    async (mk: string, list: Invoice[]) => {
      if (!profile || !canAudit || !currentPropertyId) return;
      const targets = list.filter((inv) => inv.status === 'pending_review' || inv.status === 'approved');
      if (targets.length === 0) {
        window.alert(l ? 'No pending or approved invoices this month.' : '该月没有「待审核」或「已批准」的发票。');
        return;
      }
      setMonthlyAuditBusyKey(mk);
      try {
        for (let i = 0; i < targets.length; i += 1) {
          const inv = targets[i]!;
          const r = await runInvoiceAudit(inv.id, currentPropertyId);
          if (!r.success && import.meta.env.DEV) {
            console.warn('[monthly audit]', inv.id, r.error);
          }
          // Light spacing so edge function / DB triggers can keep pace
          await new Promise((resolve) => setTimeout(resolve, 350));
        }
        await loadInvoicesQuiet();
        setHybridAuditTick((n) => n + 1);
        setAnomaliesFetchTick((n) => n + 1);
      } finally {
        setMonthlyAuditBusyKey(null);
      }
    },
    [profile, canAudit, currentPropertyId, loadInvoicesQuiet, l],
  );

  const persistHistoricalProcDraft = useCallback(async () => {
    const inv = historicalProcDraftInv;
    if (!inv || !profile?.id || !currentPropertyId || !canAudit) return;
    setHistoricalProcDraftBusy(true);
    setHistoricalProcDraftFeedback(null);
    setHistoricalProcConfirmUnavailable(false);
    try {
      const payload = buildHistoricalProcDraftInsertPayload(inv, profile.id, currentPropertyId);
      const { data, error } = await supabase.from('procurement_jobs').insert(payload).select('id').maybeSingle();
      if (error) {
        setHistoricalProcSavedJobId(null);
        setHistoricalProcDraftFeedback(
          l
            ? 'Could not save to procurement. Use Copy for procurement form.'
            : '未能写入采购草稿，可使用「复制为采购记录」。',
        );
        if (import.meta.env.DEV) {
          console.warn('[historical procurement draft]', error.message);
        }
        return;
      }
      const row = data as { id?: string } | null;
      const jid = row?.id ? String(row.id) : '';
      if (jid) setHistoricalProcSavedJobId(jid);
      else setHistoricalProcSavedJobId(null);
      setHistoricalProcDraftConfirmed(false);
      setHistoricalProcDraftFeedback(
        l
          ? jid
            ? `Draft saved (${jid}).`
            : 'Draft saved.'
          : jid
            ? `草稿已保存（${jid}）。`
            : '草稿已保存。',
      );
    } catch {
      setHistoricalProcSavedJobId(null);
      setHistoricalProcDraftFeedback(l ? 'Save failed. Use Copy instead.' : '保存失败，请使用复制。');
    } finally {
      setHistoricalProcDraftBusy(false);
    }
  }, [historicalProcDraftInv, profile?.id, currentPropertyId, canAudit, l]);

  const confirmHistoricalProcBaseline = useCallback(async () => {
    if (!historicalProcSavedJobId || !profile?.id || !currentPropertyId || !canAudit) return;
    setHistoricalProcConfirmBusy(true);
    try {
      const nowIso = new Date().toISOString();
      const { data: updated, error } = await supabase
        .from('procurement_jobs')
        .update({
          status: HISTORICAL_PROC_CONFIRMED_STATUS,
          approved_by: profile.id,
          approved_at: nowIso,
          updated_at: nowIso,
        })
        .eq('id', historicalProcSavedJobId)
        .eq('property_id', currentPropertyId)
        .eq('category', 'historical_inferred')
        .select('id')
        .maybeSingle();
      if (error) {
        const msgLow = error.message?.toLowerCase() ?? '';
        const looksLikeMissingStatusCapability =
          msgLow.includes('invalid input value for enum') ||
          msgLow.includes('procurement_status') ||
          msgLow.includes('violates check constraint');
        if (looksLikeMissingStatusCapability) setHistoricalProcConfirmUnavailable(true);
        setHistoricalProcDraftFeedback(
          l ? `Could not confirm: ${error.message}` : `确认失败：${error.message}`,
        );
        if (import.meta.env.DEV) console.warn('[historical procurement confirm]', error);
        return;
      }
      const rowId = updated && typeof updated === 'object' && updated !== null && 'id' in updated ? String((updated as { id: unknown }).id) : '';
      if (!rowId) {
        setHistoricalProcDraftFeedback(
          l
            ? 'No matching historical draft row to confirm (wrong property or category).'
            : '未找到可确认的历史补建草稿（物业或类别不匹配）。',
        );
        return;
      }
      setHistoricalProcDraftConfirmed(true);
      setHistoricalProcDraftFeedback(
        l ? 'Confirmed as procurement linkage baseline.' : '已确认为采购记录关联基线。',
      );
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setHistoricalProcDraftFeedback(l ? `Confirm failed: ${msg}` : `确认失败：${msg}`);
    } finally {
      setHistoricalProcConfirmBusy(false);
    }
  }, [historicalProcSavedJobId, profile?.id, currentPropertyId, canAudit, l]);

  useEffect(() => {
    if (historicalProcDraftInv && !canAudit) {
      setHistoricalProcDraftInv(null);
      setHistoricalProcDraftBusy(false);
      setHistoricalProcDraftFeedback(null);
      setHistoricalProcSavedJobId(null);
      setHistoricalProcDraftConfirmed(false);
      setHistoricalProcConfirmUnavailable(false);
      setHistoricalProcConfirmBusy(false);
    }
  }, [canAudit, historicalProcDraftInv]);

  useEffect(() => {
    if (!highlightInvoiceId || invoices.length === 0) return;
    const inv = invoices.find((i) => i.id === highlightInvoiceId);
    if (inv) setSelectedInvoice(inv);
  }, [highlightInvoiceId, invoices]);

  useEffect(() => {
    setSelectedInvoice((prev) => {
      if (!prev) return prev;
      const next = invoices.find((i) => i.id === prev.id);
      return next ?? prev;
    });
  }, [invoices]);

  const logAudit = async (
    invoiceId: string,
    action: string,
    opts?: { notes?: string; oldStatus?: string; newStatus?: string }
  ) => {
    if (!profile || !canAudit || !currentPropertyId) return;
    const safeNotes = typeof opts?.notes === 'string' ? sanitizeDbText(opts.notes) : null;
    await supabase.from('invoice_audit_log').insert({
      property_id: currentPropertyId,
      invoice_id: invoiceId,
      actor_id: profile.id,
      action,
      notes: safeNotes,
      old_status: opts?.oldStatus ?? null,
      new_status: opts?.newStatus ?? null,
    });
  };

  const handlePackagePdfSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputEl = e.target;
    if (!file || !profile || !currentPropertyId) return;
    if (!canUploadPkg) {
      inputEl.value = '';
      return;
    }

    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      alert(l ? 'Please choose a PDF payable package.' : '请选择 PDF 格式的发票包。');
      inputEl.value = '';
      return;
    }

    setUploadFollowUpHint('');
    setPayablePackageSummary(null);

    try {
      const pageCount = await getPdfPageCountFromFile(file);
      if (pageCount <= 1) {
        alert(
          l
            ? 'This PDF has only one page. Use “Single-file supplement” below for one-off uploads, or combine pages into a multi-page package.'
            : '该 PDF 仅 1 页。请使用「单张补录」做单笔补录，或将多页合并为发票包后从主入口上传。',
        );
        inputEl.value = '';
        return;
      }

      setUploadModalOpen(false);
      setUploading(true);

      setUploadProgress(
        l ? `Processing payable package (${pageCount} pages)…` : `正在处理发票包（共 ${pageCount} 页）…`,
      );
      const summary = await processPayablePdfPackage({
        file,
        profileId: profile.id,
        propertyId: currentPropertyId,
        accountingYear: uploadAccountingYear,
        accountingMonth: uploadAccountingMonth,
        langEn: l,
        onProgress: (p) => setUploadProgress(l ? p.messageEn : p.messageZh),
      });
      setPayablePackageSummary(summary);
      setUploadProgress(
        l
          ? `Processed ${summary.totalPages} pages · imported ${summary.recognizedInvoices} · skipped ${summary.skippedPages}.`
          : `已处理 ${summary.totalPages} 页，成功导入 ${summary.recognizedInvoices} 张，跳过 ${summary.skippedPages} 页。`,
      );
      await loadInvoices();
      setTimeout(() => setUploadProgress(''), 4000);
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
      alert((l ? 'Package upload failed: ' : '发票包上传失败：') + msg);
      setUploadProgress('');
    } finally {
      setUploading(false);
      inputEl.value = '';
    }
  };

  const handleSupplementFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const inputEl = e.target;
    if (!file || !profile || !currentPropertyId) return;
    if (!canUploadPkg) {
      inputEl.value = '';
      return;
    }

    if (!isAllowedInvoiceUploadFile(file)) {
      alert(l ? 'Please upload a PDF, JPG, or PNG file.' : '请上传 PDF、JPG 或 PNG 格式的文件。');
      inputEl.value = '';
      return;
    }

    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (isPdf) {
      const pageCount = await getPdfPageCountFromFile(file);
      if (pageCount > 1) {
        alert(
          l
            ? 'Multi-page PDFs should use “Upload PDF payable package” (main workflow).'
            : '多页 PDF 请使用主入口「上传 PDF 发票包」。',
        );
        inputEl.value = '';
        return;
      }
    }

    setUploadModalOpen(false);
    setUploading(true);
    setUploadFollowUpHint('');
    setPayablePackageSummary(null);

    try {
      setUploadProgress(l ? 'Uploading & scanning…' : '上传并识别中…');

      const { invoiceId, status } = await uploadInvoiceDocumentDirect({
        file,
        profileId: profile.id,
        propertyId: currentPropertyId,
        accountingYear: uploadAccountingYear,
        accountingMonth: uploadAccountingMonth,
        langEn: l,
      });

      setUploadFollowUpHint(
        status === 'pending_review'
          ? l
            ? 'OCR prefilled fields. Review in the list; use AI Review only for anomalies, duplicates, budgets, etc.'
            : '已从 OCR 预填。「AI审核」仅用于异常/重复/预算等辅助分析，不负责基础 OCR 预填。'
          : l
            ? 'Saved as draft (needs details)—not in the review queue yet. Open it, fill in fields, then submit for review.'
            : '已保存为「待补充信息」草稿，暂不进入待审核。请点开补齐后提交待审核。',
      );
      window.setTimeout(() => setUploadFollowUpHint(''), 12000);

      setUploadProgress(l ? 'Uploaded.' : '上传完成。');
      await loadInvoices();
      const row = (await supabase.from('invoices').select('*').eq('id', invoiceId).maybeSingle()).data as Invoice | null;
      if (row) setSelectedInvoice(row);
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
      inputEl.value = '';
    }
  };

  const applyInvoiceUpdate = async (
    id: string,
    patch: Record<string, unknown>,
    audit: { action: string; notes?: string; oldStatus: string; newStatus: string }
  ) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv || !currentPropertyId) return;
    const { error } = await supabase
      .from('invoices')
      .update({ ...patch, property_id: currentPropertyId })
      .eq('property_id', currentPropertyId)
      .eq('id', id);
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
    if (!inv || !profile || !currentPropertyId) return;
    let variance: QuoteVarianceResult | null = quoteVarianceByInvoiceId[inv.id] ?? null;
    let quoteOverBudget = inv.quote_id ? Boolean(quoteOverBudgetByInvoiceId[inv.id]) : false;
    if (inv.quote_id && (variance == null || !quoteOverBudget)) {
      const { data: q } = await supabase
        .from('procurement_quotes')
        .select('quoted_amount, is_budget_exceeded')
        .eq('property_id', currentPropertyId)
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
    const safeApprovalNote = trimmed ? sanitizeDbText(trimmed) : null;
    await applyInvoiceUpdate(
      id,
      {
        status: 'approved',
        approved: true,
        verified_by: profile.id,
        verified_at: new Date().toISOString(),
        approval_note: safeApprovalNote,
        review_notes: null,
        updated_at: new Date().toISOString(),
      },
      { action: 'approve', notes: safeApprovalNote || undefined, oldStatus: inv.status, newStatus: 'approved' }
    );
  };

  /** 列表快捷通过：红色预警或报价超预算必须先打开详情填写理由 */
  const approveInvoiceFromList = async (inv: Invoice) => {
    if (!currentPropertyId) return;
    let v: QuoteVarianceResult | null = quoteVarianceByInvoiceId[inv.id] ?? null;
    let quoteOverBudget = inv.quote_id ? Boolean(quoteOverBudgetByInvoiceId[inv.id]) : false;
    if (inv.quote_id && (v == null || !quoteOverBudget)) {
      const { data: q } = await supabase
        .from('procurement_quotes')
        .select('quoted_amount, is_budget_exceeded')
        .eq('property_id', currentPropertyId)
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
      const safeRejectNote = rejectNote.trim() ? sanitizeDbText(rejectNote.trim()) : null;
      await applyInvoiceUpdate(
        rejectTarget.id,
        {
          status: 'flagged',
          review_notes: safeRejectNote,
          verified_by: profile.id,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          action: 'reject',
          notes: safeRejectNote || undefined,
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
    if (!currentPropertyId) return;
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('property_id', currentPropertyId)
        .eq('id', invoice.id);
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
      return true;
    });
  }, [
    invoices,
    dangerFilterOnly,
    auditFilterOnly,
    abnormalFilterOnly,
    highRiskFilterOnly,
    rangeThisMonthOnly,
    quoteVarianceByInvoiceId,
  ]);

  const groupedByAccounting = useMemo(() => {
    const byYear = new Map<number, Map<number, Invoice[]>>();
    for (const inv of filtered) {
      const y = effectiveAccountingYear(inv);
      const m = effectiveAccountingMonth(inv);
      if (!byYear.has(y)) byYear.set(y, new Map());
      const ym = byYear.get(y)!;
      if (!ym.has(m)) ym.set(m, []);
      ym.get(m)!.push(inv);
    }
    const years = [...byYear.keys()].sort((a, b) => b - a);
    return { byYear, years };
  }, [filtered]);

  const hasActiveFilter = useMemo(
    () =>
      dangerFilterOnly ||
      auditFilterOnly ||
      abnormalFilterOnly ||
      highRiskFilterOnly ||
      rangeThisMonthOnly,
    [dangerFilterOnly, auditFilterOnly, abnormalFilterOnly, highRiskFilterOnly, rangeThisMonthOnly],
  );

  const accountingYearSelectOptions = useMemo(() => {
    const cy = new Date().getFullYear();
    return Array.from({ length: 16 }, (_, i) => cy - 12 + i);
  }, []);

  useEffect(() => {
    expandAccountingUiDone.current = false;
  }, [currentPropertyId]);

  useEffect(() => {
    if (invoices.length === 0 || expandAccountingUiDone.current) return;
    let maxY = -1;
    let maxM = -1;
    for (const inv of invoices) {
      const y = effectiveAccountingYear(inv);
      const m = effectiveAccountingMonth(inv);
      if (y > maxY || (y === maxY && m > maxM)) {
        maxY = y;
        maxM = m;
      }
    }
    if (maxY < 0 || maxM < 0) return;
    setExpandedYears(new Set([maxY]));
    setExpandedMonths(new Set([`${maxY}-${maxM}`]));
    expandAccountingUiDone.current = true;
  }, [invoices]);

  useEffect(() => {
    if (!hasActiveFilter || filtered.length === 0) return;
    setExpandedYears((prev) => {
      const n = new Set(prev);
      for (const inv of filtered) {
        n.add(effectiveAccountingYear(inv));
      }
      return n;
    });
    setExpandedMonths((prev) => {
      const n = new Set(prev);
      for (const inv of filtered) {
        const y = effectiveAccountingYear(inv);
        const m = effectiveAccountingMonth(inv);
        n.add(`${y}-${m}`);
      }
      return n;
    });
  }, [filtered, hasActiveFilter]);

  const exportRows = useCallback(
    (asExcel: boolean) => {
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
    },
    [filtered, l],
  );

  useImperativeHandle(
    ref,
    () => ({
      exportCsv: () => exportRows(false),
      exportExcel: () => exportRows(true),
      openUploadModal,
    }),
    [exportRows, openUploadModal],
  );

  useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const catLabel = (value: string | null | undefined) => {
    const c = CATEGORIES.find((x) => x.value === value);
    if (!c) return value || '-';
    return l ? c.labelEn : c.labelZh;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-clearstrata-ui-primary" size={32} />
      </div>
    );
  }

  const toggleAccountingYear = (y: number) => {
    setExpandedYears((prev) => {
      const n = new Set(prev);
      if (n.has(y)) n.delete(y);
      else n.add(y);
      return n;
    });
  };

  const toggleAccountingMonth = (y: number, m: number) => {
    const key = `${y}-${m}`;
    setExpandedMonths((prev) => {
      const n = new Set(prev);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  const fmtAccountingMoney = (n: number) =>
    `$${n.toLocaleString(l ? 'en-CA' : 'zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;

  return (
    <div className="mx-0 min-w-0 w-full max-w-none space-y-6">
      {dangerFilterOnly && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 flex flex-wrap items-center gap-2 justify-between">
          <span>
            {l
              ? 'Filtered: red-alert invoices only (≥20% above approved quote).'
              : '当前筛选：红色预警发票（发票金额较批复报价高出 ≥20%）。'}
          </span>
          <Link to="/finance?tab=invoices" className="font-semibold text-clearstrata-ui-primary hover:underline shrink-0">
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
          <Link to="/finance?tab=invoices" className="font-semibold text-clearstrata-ui-primary hover:underline shrink-0">
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
          <Link to="/finance?tab=invoices" className="font-semibold text-clearstrata-ui-primary hover:underline shrink-0">
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
          <Link to="/finance?tab=invoices" className="font-semibold text-clearstrata-ui-primary hover:underline shrink-0">
            {l ? 'Show all invoices' : '查看全部发票'}
          </Link>
        </div>
      )}
      {hideToolbar ? (
        <div className="mb-1">
          <h2 className="text-xl font-semibold tracking-tight text-gray-900">{l ? 'Invoice Details' : '发票明细'}</h2>
        </div>
      ) : null}

      {uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          {uploadProgress.includes('!') || uploadProgress.includes('Done') || uploadProgress.includes('完成') ? (
            <CheckCircle size={20} className="text-clearstrata-ui-primary shrink-0" />
          ) : (
            <Loader2 size={20} className="animate-spin text-blue-600 shrink-0" />
          )}
          <span className="text-sm font-medium text-blue-800">{uploadProgress}</span>
        </div>
      )}

      {uploadFollowUpHint ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-2.5 text-xs text-slate-700">
          {uploadFollowUpHint}
        </div>
      ) : null}

      {uploadModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="presentation"
          onClick={() => !uploading && setUploadModalOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-gray-200 bg-white p-5 shadow-lg"
            role="dialog"
            aria-modal="true"
            aria-labelledby="invoice-upload-modal-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 id="invoice-upload-modal-title" className="text-lg font-semibold text-gray-900">
              {l ? 'Upload invoices' : '上传发票'}
            </h2>
            <p className="mt-2 text-sm font-medium text-gray-900">
              {l ? 'Main workflow: monthly payable PDF package' : '主流程：整月 PDF payable 发票包'}
            </p>
            <p className="mt-1 text-sm text-gray-600">
              {l
                ? 'Upload a multi-page PDF exported by your property manager (typical 20–100 pages). Split, OCR, and pending-review rows are created automatically—no AI required for upload.'
                : '上传物业管理公司导出的多页 PDF 发票包（常见 20～100 页）。系统将拆页、识别并生成多条「待审核」记录；上传本身不依赖 AI。'}
            </p>
            <p className="mt-3 text-xs font-medium text-gray-700">
              {l ? 'Supplement: single-page PDF or image (one-off)' : '补录工具：单页 PDF 或图片（零散票据）'}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {l
                ? 'Use only for odd receipts. Multi-page PDFs must use the main package button.'
                : '仅用于零散补录；多页 PDF 必须使用上方「上传 PDF 发票包」。'}
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="upload-accounting-year">
                  {l ? 'Accounting year' : '归档年份'}
                </label>
                <select
                  id="upload-accounting-year"
                  value={uploadAccountingYear}
                  onChange={(ev) => setUploadAccountingYear(Number(ev.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-clearstrata-ui-primary"
                  disabled={uploading}
                >
                  {accountingYearSelectOptions.map((y) => (
                    <option key={y} value={y}>
                      {l ? y : `${y}年`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="upload-accounting-month">
                  {l ? 'Accounting month' : '归档月份'}
                </label>
                <select
                  id="upload-accounting-month"
                  value={uploadAccountingMonth}
                  onChange={(ev) => setUploadAccountingMonth(Number(ev.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-clearstrata-ui-primary"
                  disabled={uploading}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {l ? m : `${m}月`}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-xs text-gray-500">
                {l
                  ? 'Sets which yearly and monthly ledger this invoice belongs to. Unrelated to invoice date, payment date, or upload time.'
                  : '决定这张发票进入哪个年度/月度账本；与发票日期、付款日、上传时间无关。'}
              </p>
            </div>

            <input
              ref={uploadPackagePdfInputRef}
              type="file"
              className="hidden"
              accept="application/pdf,.pdf"
              onChange={handlePackagePdfSelected}
              disabled={uploading}
            />
            <input
              ref={uploadSupplementInputRef}
              type="file"
              className="hidden"
              accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
              onChange={handleSupplementFileSelected}
              disabled={uploading}
            />

            <div className="mt-5 flex flex-col gap-2">
              {canUploadPkg ? (
                <>
                  <button
                    type="button"
                    disabled={uploading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-clearstrata-ui-primary py-2.5 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
                    onClick={() => uploadPackagePdfInputRef.current?.click()}
                  >
                    <Upload size={16} aria-hidden />
                    {l ? 'Upload PDF payable package' : '上传 PDF 发票包（主流程）'}
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                    onClick={() => uploadSupplementInputRef.current?.click()}
                  >
                    <PenLine size={16} aria-hidden />
                    {l ? 'Single-file supplement (1-page PDF / image)' : '单张补录（单页 PDF / 图片）'}
                  </button>
                </>
              ) : (
                <p className="text-sm text-gray-600">
                  {l ? 'Upload is restricted to property staff.' : '仅物业工作人员可上传发票。'}
                </p>
              )}
              <button
                type="button"
                disabled={uploading}
                className="w-full rounded-lg py-2 text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                onClick={() => setUploadModalOpen(false)}
              >
                {l ? 'Cancel' : '取消'}
              </button>
            </div>
          </div>
        </div>
      )}

      {payablePackageSummary ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/45 p-4"
          role="presentation"
          onClick={() => setPayablePackageSummary(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-xl border border-gray-200 bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payable-package-summary-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="p-6 pb-3">
              <h2 id="payable-package-summary-title" className="text-lg font-bold text-gray-900">
                {l ? 'PDF upload complete' : 'PDF 上传完成'}
              </h2>
              <p className="mt-2 text-sm font-medium text-gray-800">
                {l
                  ? `Processed ${payablePackageSummary.totalPages} pages · imported ${payablePackageSummary.recognizedInvoices} · skipped ${payablePackageSummary.skippedPages}.`
                  : `已处理 ${payablePackageSummary.totalPages} 页，成功导入 ${payablePackageSummary.recognizedInvoices} 张，跳过 ${payablePackageSummary.skippedPages} 页。`}
              </p>
              <ul className="mt-3 space-y-2 text-sm text-gray-800">
                <li className="flex justify-between gap-3 border-b border-gray-100 pb-2">
                  <span className="text-gray-600">{l ? 'Total pages' : '总页数'}</span>
                  <span className="font-semibold tabular-nums">{payablePackageSummary.totalPages}</span>
                </li>
                <li className="flex justify-between gap-3 border-b border-gray-100 pb-2">
                  <span className="text-gray-600">{l ? 'Imported' : '成功入库'}</span>
                  <span className="font-semibold tabular-nums text-clearstrata-brand-700">
                    {payablePackageSummary.recognizedInvoices}
                  </span>
                </li>
                <li className="flex justify-between gap-3 pb-1">
                  <span className="text-gray-600">{l ? 'Skipped' : '跳过'}</span>
                  <span className="font-semibold tabular-nums text-amber-800">
                    {payablePackageSummary.skippedPages}
                  </span>
                </li>
              </ul>
            </div>
            {payablePackageSummary.skipped.length > 0 ? (
              <div className="flex-1 overflow-y-auto border-t border-gray-100 px-6 py-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {l ? 'Skipped pages' : '跳过页清单'}
                </h3>
                <ul className="space-y-2">
                  {payablePackageSummary.skipped.map((sk) => (
                    <li
                      key={`${sk.pageIndex}-${sk.reason}`}
                      className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2 text-xs"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md bg-white px-1.5 py-0.5 font-semibold text-amber-900 ring-1 ring-amber-200">
                          {l ? `Page ${sk.pageIndex}` : `第 ${sk.pageIndex} 页`}
                        </span>
                        <span className="font-medium text-amber-950">{l ? sk.reasonEn : sk.reasonZh}</span>
                      </div>
                      {sk.excerpt ? (
                        <p className="mt-1 line-clamp-2 break-words text-[11px] leading-relaxed text-gray-600">
                          {sk.excerpt}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            <div className="border-t border-gray-100 p-6 pt-4">
              <p className="text-xs leading-relaxed text-gray-500">
                {l
                  ? 'Skipped pages are not force-imported to avoid weak OCR data. To add one manually, upload that page with Single invoice upload.'
                  : '跳过页不会强行入库，避免引入弱 OCR 数据。如需补录，请用「单张补录」单独上传该页。'}
              </p>
              <button
                type="button"
                className="mt-4 w-full rounded-lg bg-clearstrata-ui-primary py-2.5 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive"
                onClick={() => setPayablePackageSummary(null)}
              >
                {l ? 'View invoices' : '查看发票列表'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="min-w-0 rounded-xl border border-gray-100 bg-white shadow-sm">
        {!hideToolbar ? (
          <div className="border-b border-gray-200 p-2.5 sm:p-3 md:p-4">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {canUploadPkg ? (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={openUploadModal}
                  className={`inline-flex items-center gap-1.5 rounded-lg bg-clearstrata-ui-primary px-2.5 py-1.5 text-xs font-medium text-white transition-colors sm:gap-2 sm:px-3 sm:py-2 sm:text-sm ${
                    uploading ? 'pointer-events-none opacity-50' : 'hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive'
                  }`}
                >
                  <Upload size={16} className="sm:h-[18px] sm:w-[18px]" />
                  {uploading ? (l ? 'Working…' : '处理中…') : l ? 'Upload package' : '上传发票包'}
                </button>
              ) : null}
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
            </div>
          </div>
        ) : null}

        {invoices.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">{l ? 'No invoices' : '暂无发票记录'}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">{l ? 'No invoices match filters.' : '暂无符合筛选的发票'}</p>
          </div>
        ) : (
          <>
            {groupedByAccounting.years.map((accYear) => {
              const monthMap = groupedByAccounting.byYear.get(accYear);
              const months = monthMap ? [...monthMap.keys()].sort((a, b) => b - a) : [];
              const yearInvoices = filtered.filter((i) => effectiveAccountingYear(i) === accYear);
              const yAgg = aggregateInvoiceFoldSummary(yearInvoices);
              const yearHistorical =
                yearInvoices.length === 0
                  ? isHistoricalLedgerMonth(accYear, 12, governanceStartIso)
                  : yearInvoices.every((inv) =>
                      isHistoricalLedgerMonth(
                        effectiveAccountingYear(inv),
                        effectiveAccountingMonth(inv),
                        governanceStartIso,
                      ),
                    );
              const yearOpen = expandedYears.has(accYear);
              return (
                <div key={accYear} className="border-b border-gray-100 last:border-b-0">
                  <button
                    type="button"
                    onClick={() => toggleAccountingYear(accYear)}
                    className="flex w-full items-start gap-2 px-3 py-3 text-left text-sm hover:bg-gray-50 sm:px-4"
                  >
                    {yearOpen ? (
                      <ChevronDown className="mt-0.5 size-4 shrink-0 text-gray-500" aria-hidden />
                    ) : (
                      <ChevronRight className="mt-0.5 size-4 shrink-0 text-gray-500" aria-hidden />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="font-semibold text-gray-900">{l ? String(accYear) : `${accYear}年`}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-gray-600">
                        {formatInvoiceFoldSummaryLine(yAgg, {
                          langEn: l,
                          fmtMoney: fmtAccountingMoney,
                          historical: yearHistorical,
                        })}
                      </span>
                    </span>
                  </button>
                  {yearOpen &&
                    months.map((accMonth) => {
                      const monthList = monthMap?.get(accMonth) ?? [];
                      const mAgg = aggregateInvoiceFoldSummary(monthList);
                      const monthHistorical = isHistoricalLedgerMonth(
                        accYear,
                        accMonth,
                        governanceStartIso,
                      );
                      const mk = `${accYear}-${accMonth}`;
                      const monthOpen = expandedMonths.has(mk);
                      return (
                        <div key={mk} className="border-t border-gray-100 bg-slate-50/25">
                          <button
                            type="button"
                            onClick={() => toggleAccountingMonth(accYear, accMonth)}
                            className="flex w-full items-start gap-2 px-3 py-2.5 pl-7 text-left text-sm hover:bg-slate-100/70 sm:px-4 sm:pl-9"
                          >
                            {monthOpen ? (
                              <ChevronDown className="mt-0.5 size-4 shrink-0 text-gray-500" aria-hidden />
                            ) : (
                              <ChevronRight className="mt-0.5 size-4 shrink-0 text-gray-500" aria-hidden />
                            )}
                            <span className="min-w-0 flex-1">
                              <span className="font-medium text-gray-900">
                                {l
                                  ? `${accYear}-${String(accMonth).padStart(2, '0')}`
                                  : `${accYear}年${accMonth}月`}
                              </span>
                              <span className="mt-0.5 block text-xs leading-relaxed text-gray-600">
                                {formatInvoiceFoldSummaryLine(mAgg, {
                                  langEn: l,
                                  fmtMoney: fmtAccountingMoney,
                                  historical: monthHistorical,
                                })}
                              </span>
                            </span>
                          </button>
                          {monthOpen && (
                            <>
                              <MonthlyAutoAuditPanel
                                monthKey={mk}
                                accountingYear={accYear}
                                accountingMonth={accMonth}
                                monthList={monthList}
                                governanceStartIso={governanceStartIso}
                                l={l}
                                canAudit={canAudit}
                                busyMonthKey={monthlyAuditBusyKey}
                                onRunForMonth={(key, list) => void runMonthAudit(key, list)}
                                onPickInvoice={setSelectedInvoice}
                                onOpenHistoricalProcDraft={(inv) => {
                                  setHistoricalProcDraftFeedback(null);
                                  setHistoricalProcSavedJobId(null);
                                  setHistoricalProcDraftConfirmed(false);
                                  setHistoricalProcConfirmUnavailable(false);
                                  setHistoricalProcConfirmBusy(false);
                                  setHistoricalProcDraftInv(inv);
                                }}
                                onOpenBenchmarkReview={(inv) => setBenchmarkReviewInv(inv)}
                                hybridAuditByInvoiceId={hybridAuditByInvoiceId}
                                quoteVarianceByInvoiceId={quoteVarianceByInvoiceId}
                                aiAuditListMap={aiAuditListMap}
                                anomaliesByInvoiceId={anomaliesByInvoiceId}
                                historicalAuditByInvoiceId={historicalAuditByInvoiceId}
                              />
                              <div className="hidden max-w-full overflow-x-auto md:block [scrollbar-width:thin]">
              <table className="w-full min-w-0 max-w-full table-fixed border-collapse text-xs">
                <colgroup>
                  <col style={{ width: '16%' }} />
                  <col style={{ width: '9%' }} />
                  <col style={{ width: '70px' }} />
                  <col style={{ width: '72px' }} />
                  <col style={{ width: '8%' }} />
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
                    <th className="whitespace-nowrap px-1 py-1.5 text-left text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:px-1.5 sm:py-2">
                      {l ? 'Book' : '归档'}
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
                    <th className="w-[104px] min-w-[104px] max-w-[116px] whitespace-nowrap px-0.5 py-1.5 text-center text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:py-2">
                      {l ? 'Actions' : '操作'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {monthList.map((inv) => {
                    const baseSt = statusStyle(inv.status);
                    const archivedHistorical = isHistoricalRow(inv);
                    const st = archivedHistorical
                      ? {
                          ...baseSt,
                          labelZh: '历史归档',
                          labelEn: 'Archived',
                          className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
                        }
                      : baseSt;
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
                        <td className="whitespace-nowrap px-1 py-1.5 text-[11px] tabular-nums text-gray-600 sm:px-1.5 sm:py-2">
                          {l
                            ? `${effectiveAccountingYear(inv)}-${String(effectiveAccountingMonth(inv)).padStart(2, '0')}`
                            : `${effectiveAccountingYear(inv)}年${effectiveAccountingMonth(inv)}月`}
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
                              className="block truncate text-xs font-medium text-clearstrata-ui-primary hover:underline"
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
                          className="w-[104px] min-w-[104px] max-w-[116px] overflow-visible px-0.5 py-1.5 text-center align-top sm:py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex w-full flex-col items-stretch gap-1">
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => setSelectedInvoice(inv)}
                                className="rounded-md p-1 text-gray-500 hover:bg-clearstrata-ui-soft hover:text-clearstrata-ui-primary"
                                title={l ? 'Details' : '详情'}
                              >
                                <Eye size={14} />
                              </button>
                              {canAudit && (
                                <button
                                  type="button"
                                  onClick={() => openArchiveModal(inv)}
                                  className="rounded-md p-1 text-gray-500 hover:bg-clearstrata-ui-soft hover:text-clearstrata-ui-primary"
                                  title={l ? 'Edit archive year / month' : '修改归档'}
                                >
                                  <PenLine size={14} aria-hidden />
                                </button>
                              )}
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
                            {canAudit && inv.status === 'pending_review' && !isHistoricalRow(inv) && (
                              <div className="flex flex-col gap-1">
                                <button
                                  type="button"
                                  onClick={() => void approveInvoiceFromList(inv)}
                                  className="rounded-md bg-clearstrata-ui-primary px-2 py-1.5 text-xs font-medium leading-none text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive"
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
                            {canAudit && inv.status === 'approved' && !isHistoricalRow(inv) && (
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
              {monthList.map((inv) => {
                const baseSt = statusStyle(inv.status);
                const archivedHistorical = isHistoricalRow(inv);
                const st = archivedHistorical
                  ? {
                      ...baseSt,
                      labelZh: '历史归档',
                      labelEn: 'Archived',
                      className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
                    }
                  : baseSt;
                const qv = quoteVarianceByInvoiceId[inv.id];
                return (
                  <button
                    type="button"
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-clearstrata-ui-primary/50 transition-colors bg-white shadow-sm"
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
                      <div className="text-xs text-gray-500">
                        {l ? 'Book: ' : '归档：'}
                        {l
                          ? `${effectiveAccountingYear(inv)}-${String(effectiveAccountingMonth(inv)).padStart(2, '0')}`
                          : `${effectiveAccountingYear(inv)}年${effectiveAccountingMonth(inv)}月`}
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
                            className="text-clearstrata-ui-primary font-medium hover:underline"
                          >
                            {invoiceTaskSource[inv.id].title}
                          </Link>
                        </div>
                      ) : null}
                    </div>
                    <div
                      className="mt-3 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {canAudit && (
                        <button
                          type="button"
                          onClick={() => openArchiveModal(inv)}
                          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-gray-800 hover:bg-gray-50"
                        >
                          <PenLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {l ? 'Edit archive' : '修改归档'}
                        </button>
                      )}
                      {canDeleteInvoice(roleInProperty, profile?.id, inv.uploaded_by) && (
                        <button
                          type="button"
                          onClick={() => setDeleteConfirm(inv)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-800 hover:bg-red-100"
                        >
                          <Trash2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {l ? 'Delete' : '删除'}
                        </button>
                      )}
                    </div>
                    {canAudit && inv.status === 'pending_review' && !isHistoricalRow(inv) && (
                      <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => void approveInvoiceFromList(inv)}
                          className="flex-1 py-2 text-xs font-medium rounded-lg bg-clearstrata-ui-primary text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive"
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
                    {canAudit && inv.status === 'approved' && !isHistoricalRow(inv) && (
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
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </>
        )}

        <div className="border-t border-gray-200 px-3 py-2 text-sm text-gray-500 sm:px-4 sm:py-2.5">
          {filtered.length} / {invoices.length} {l ? 'invoices' : '张发票'}
        </div>
        </div>

        {historicalProcDraftInv ? (
          <HistoricalInvoiceProcDraftModal
            invoice={historicalProcDraftInv}
            languageEn={l}
            busy={historicalProcDraftBusy}
            feedback={historicalProcDraftFeedback}
            canAudit={canAudit}
            savedJobId={historicalProcSavedJobId}
            isConfirmedBaseline={historicalProcDraftConfirmed}
            confirmUnavailable={historicalProcConfirmUnavailable}
            confirmBusy={historicalProcConfirmBusy}
            onConfirmBaseline={() => void confirmHistoricalProcBaseline()}
            onClose={() => {
              setHistoricalProcDraftInv(null);
              setHistoricalProcDraftBusy(false);
              setHistoricalProcDraftFeedback(null);
              setHistoricalProcSavedJobId(null);
              setHistoricalProcDraftConfirmed(false);
              setHistoricalProcConfirmUnavailable(false);
              setHistoricalProcConfirmBusy(false);
            }}
            onPersist={() => void persistHistoricalProcDraft()}
          />
        ) : null}

        {benchmarkReviewInv && currentPropertyId ? (
          <HistoricalBenchmarkReviewModal
            open
            invoice={benchmarkReviewInv}
            propertyId={currentPropertyId}
            languageEn={l}
            onClose={() => setBenchmarkReviewInv(null)}
          />
        ) : null}

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onRefresh={loadInvoicesQuiet}
          canAudit={canAudit}
          profile={profile}
          governanceStartIso={governanceStartIso}
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-clearstrata-ui-primary mb-4"
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

      {archiveEditTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-labelledby="invoice-archive-heading"
            className="max-h-[min(560px,calc(100vh-4rem))] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 shadow-xl"
          >
            <h3 id="invoice-archive-heading" className="mb-1 text-lg font-semibold text-gray-900">
              {l ? 'Edit archive period' : '修改归档年月'}
            </h3>
            <p className="mb-4 text-xs leading-relaxed text-gray-600">
              {archiveEditTarget.vendor_name}{' '}
              {archiveEditTarget.invoice_number ? `#${archiveEditTarget.invoice_number}` : ''}
            </p>
            <p className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {l
                ? 'Controls which bookkeeping year/month this invoice is grouped under. It does not change invoice date, payment date, or upload time.'
                : '决定这张发票进入哪个年度/月度账本；与发票日期、付款日、上传时间无关。'}
            </p>
            <div className="grid gap-4">
              <label className="block text-sm">
                <span className="font-medium text-gray-800">{l ? 'Accounting year' : '归档年份'}</span>
                <input
                  type="number"
                  min={1900}
                  max={2100}
                  value={archiveEditYear}
                  onChange={(e) => setArchiveEditYear(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-gray-800">{l ? 'Accounting month' : '归档月份'}</span>
                <select
                  value={archiveEditMonth}
                  onChange={(e) => setArchiveEditMonth(Number(e.target.value))}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  {MONTH_OPTS.map((m) => (
                    <option key={m} value={m}>
                      {l ? MONTH_LABEL_EN[m - 1] : `${m} 月`}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                disabled={archiveSaving}
                onClick={() => setArchiveEditTarget(null)}
                className="flex-1 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {l ? 'Cancel' : '取消'}
              </button>
              <button
                type="button"
                disabled={archiveSaving}
                onClick={() => void saveArchivePeriod()}
                className="flex-1 rounded-lg bg-clearstrata-ui-primary py-2.5 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50"
              >
                {archiveSaving ? (l ? 'Saving…' : '保存中…') : l ? 'Save' : '保存'}
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
});

function InvoiceDetailModal({
  invoice,
  onClose,
  onRefresh,
  canAudit,
  profile,
  governanceStartIso,
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
  governanceStartIso: string | null;
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
  const [editAccountingYear, setEditAccountingYear] = useState(() =>
    effectiveAccountingYear(invoice),
  );
  const [editAccountingMonth, setEditAccountingMonth] = useState(() =>
    effectiveAccountingMonth(invoice),
  );
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

  /** draft_manual — minimal ledger fields before moving to council queue */
  const [draftVendor, setDraftVendor] = useState('');
  const [draftInvoiceNumber, setDraftInvoiceNumber] = useState('');
  const [draftInvoiceDate, setDraftInvoiceDate] = useState('');
  const [draftSubtotal, setDraftSubtotal] = useState('');
  const [draftTax, setDraftTax] = useState('');
  const [draftTotal, setDraftTotal] = useState('');
  const [draftSubmitSaving, setDraftSubmitSaving] = useState(false);

  const aiData = invoice.ai_extracted_data as Record<string, unknown> | null;

  const historicalAudit = useMemo(
    () => parseHistoricalAuditFromContext(aiAuditContextRow?.context_json),
    [aiAuditContextRow],
  );
  const historicalCandidate = historicalAudit?.candidate === true;

  /**
   * True when this invoice's bookkeeping month is before the property's
   * governance_start_date (or governance start is not configured). Historical
   * invoices are archive-only and must not show AI audit / procurement-rebuild UI.
   */
  const isHistoricalInvoice = useMemo(() => {
    const { mode } = resolveLedgerGovernanceMode(
      effectiveAccountingYear(invoice),
      effectiveAccountingMonth(invoice),
      governanceStartIso,
    );
    return mode === 'historical';
  }, [invoice, governanceStartIso]);

  const st = useMemo(() => {
    const base = statusStyle(invoice.status);
    if (!isHistoricalInvoice) return base;
    return {
      ...base,
      labelZh: '历史归档',
      labelEn: 'Archived',
      className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    };
  }, [invoice.status, isHistoricalInvoice]);

  const loadAiAuditBundle = useCallback(async () => {
    if (!currentPropertyId) {
      setAiAudit(null);
      setAiAuditContextRow(null);
      setAiAuditLoading(false);
      return;
    }
    setAiAuditLoading(true);
    const [{ data: audits, error: auditErr }, { data: ctxRow }] = await Promise.all([
      supabase
        .from('invoice_ai_audits')
        .select('*')
        .eq('invoice_id', invoice.id)
        .eq('property_id', currentPropertyId),
      supabase
        .from('invoice_ai_audit_contexts')
        .select('context_json')
        .eq('invoice_id', invoice.id)
        .eq('property_id', currentPropertyId)
        .maybeSingle(),
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
  }, [invoice.id, currentPropertyId]);

  useEffect(() => {
    setEditCategory(invoice.category || 'general');
    setEditNotes(invoice.notes || '');
    setEditAccountingYear(effectiveAccountingYear(invoice));
    setEditAccountingMonth(effectiveAccountingMonth(invoice));
    setApprovalNote('');
  }, [invoice]);

  useEffect(() => {
    if (invoice.status !== 'draft_manual') return;
    setDraftVendor(invoice.vendor_name ?? '');
    setDraftInvoiceNumber(invoice.invoice_number ?? '');
    setDraftInvoiceDate((invoice.invoice_date ?? '').slice(0, 10));
    setDraftSubtotal(String(Number(invoice.subtotal ?? 0)));
    setDraftTax(String(Number(invoice.tax_amount ?? 0)));
    setDraftTotal(String(Number(invoice.total_amount ?? 0)));
  }, [
    invoice.id,
    invoice.status,
    invoice.vendor_name,
    invoice.invoice_number,
    invoice.invoice_date,
    invoice.subtotal,
    invoice.tax_amount,
    invoice.total_amount,
  ]);

  const accountingYearModalOptions = useMemo(() => {
    const cy = new Date().getFullYear();
    return Array.from({ length: 16 }, (_, i) => cy - 12 + i);
  }, []);

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
      if (!currentPropertyId) {
        setAuditBanner({ type: 'err', msg: l ? 'No property selected.' : '未选择物业。' });
        return;
      }
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
        body: JSON.stringify({ invoice_id: invoice.id, property_id: currentPropertyId }),
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
    if (!invoice.quote_id || !currentPropertyId) {
      setQuoteVarianceResult(null);
      setQuoteBudgetExceeded(false);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from('procurement_quotes')
        .select('quoted_amount, is_budget_exceeded')
        .eq('property_id', currentPropertyId)
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
  }, [invoice.quote_id, invoice.total_amount, currentPropertyId]);

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

  const submitDraftManualForReview = async () => {
    if (!profile || !canAudit || !currentPropertyId) return;
    const invoiceDateTrim = draftInvoiceDate.trim();
    if (!invoiceDateTrim) {
      alert(l ? 'Invoice date is required.' : '请填写开票日期。');
      return;
    }

    let hintBlob = '';
    const aid = invoice.ai_extracted_data;
    if (aid && typeof aid === 'object') {
      const oc = aid as Record<string, unknown>;
      const att = oc.ocr_attempt as { raw_text?: string } | undefined;
      hintBlob += typeof att?.raw_text === 'string' ? `${att.raw_text}\n` : '';
    }
    if (invoice.notes?.trim()) hintBlob += `${invoice.notes}\n`;

    const totalNum = Number(draftTotal);
    const subNum = Number(draftSubtotal);
    const taxNum = Number(draftTax);

    const cred = ocrPrefillCredibility({
      vendorName: draftVendor,
      invoiceNumber: draftInvoiceNumber,
      totalAmount: totalNum,
      langEn: l,
      combinedTextHint: hintBlob,
    });

    if (!cred) {
      alert(
        l
          ? 'Need a plausible amount: supplier + non‑zero total, or invoice # + non‑zero total, or credit memo wording with negative total.'
          : '金额需可信：供应商+非零总额，或发票号+非零总额，或为贷项且总额为负。',
      );
      return;
    }

    setDraftSubmitSaving(true);
    try {
      const aiBase =
        aid && typeof aid === 'object' ? ({ ...(aid as Record<string, unknown>) } as Record<string, unknown>) : {};
      aiBase.draft_submitted_for_review_at = new Date().toISOString();

      const safeDraftVendor = sanitizeDbText(draftVendor.trim() || invoice.vendor_name);
      const safeDraftInvoiceNumber = draftInvoiceNumber.trim()
        ? sanitizeDbText(draftInvoiceNumber.trim())
        : null;
      const { error } = await supabase
        .from('invoices')
        .update({
          property_id: currentPropertyId,
          vendor_name: safeDraftVendor,
          invoice_number: safeDraftInvoiceNumber,
          invoice_date: invoiceDateTrim,
          subtotal: subNum,
          tax_amount: taxNum,
          total_amount: totalNum,
          status: 'pending_review',
          ai_extracted_data: aiBase,
          updated_at: new Date().toISOString(),
        })
        .eq('property_id', currentPropertyId)
        .eq('id', invoice.id);

      if (error) {
        alert(error.message);
        return;
      }

      await supabase.from('invoice_audit_log').insert({
        property_id: currentPropertyId,
        invoice_id: invoice.id,
        actor_id: profile.id,
        action: 'draft_submit_review',
        notes: l ? 'Submitted manual draft for council review.' : '手工草稿提交待审核。',
        old_status: invoice.status,
        new_status: 'pending_review',
      });

      await onRefresh();
    } finally {
      setDraftSubmitSaving(false);
    }
  };

  const saveEdits = async () => {
    if (!profile || !canAudit || !currentPropertyId) return;
    setSaving(true);
    try {
      const safeEditNotes = editNotes ? sanitizeDbText(editNotes) : null;
      const { error } = await supabase
        .from('invoices')
        .update({
          property_id: currentPropertyId,
          category: sanitizeDbText(editCategory),
          notes: safeEditNotes,
          accounting_year: editAccountingYear,
          accounting_month: editAccountingMonth,
          updated_at: new Date().toISOString(),
        })
        .eq('property_id', currentPropertyId)
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
      draft_submit_review: { en: 'Draft → pending review', zh: '草稿提交待审核' },
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
                ? 'bg-clearstrata-ui-soft text-clearstrata-ui-softText border-clearstrata-ui-softBorder'
                : 'bg-red-50 text-red-800 border-red-100'
            }`}
            role="status"
          >
            {auditBanner.msg}
          </div>
        ) : null}

        {invoice.status === 'draft_manual' && canAudit ? (
          <div
            className="mx-4 mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-4 shadow-sm sm:mx-6"
            aria-labelledby="draft-manual-heading"
          >
            <h3 id="draft-manual-heading" className="text-sm font-semibold text-amber-950">
              {l ? 'Complete details — not yet in council review queue' : '待补充信息（尚未进入待审核队列）'}
            </h3>
            <p className="mt-1 text-xs text-amber-900/85 leading-relaxed">
              {l
                ? 'OCR could not pre-fill confidently. Fill key fields below, then submit—AI Review stays optional for anomalies, duplicates, and budgets.'
                : '系统自动识别未达到可信预填阈值。补齐下方字段后可提交「待审核」；「AI审核」仍为可选辅助，用于异常/重复/预算等。'}
            </p>
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block text-xs font-medium text-amber-950">
                {l ? 'Supplier' : '供应商'}
                <input
                  value={draftVendor}
                  onChange={(e) => setDraftVendor(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <label className="block text-xs font-medium text-amber-950">
                {l ? 'Invoice #' : '发票号'}
                <input
                  value={draftInvoiceNumber}
                  onChange={(e) => setDraftInvoiceNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <label className="block text-xs font-medium text-amber-950">
                {l ? 'Invoice date' : '开票日期'}
                <input
                  type="date"
                  value={draftInvoiceDate}
                  onChange={(e) => setDraftInvoiceDate(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <label className="block text-xs font-medium text-amber-950">
                {l ? 'Subtotal (pre-tax)' : '税前'}
                <input
                  inputMode="decimal"
                  value={draftSubtotal}
                  onChange={(e) => setDraftSubtotal(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <label className="block text-xs font-medium text-amber-950">
                {l ? 'GST / PST (tax)' : 'GST / PST 等税额'}
                <input
                  inputMode="decimal"
                  value={draftTax}
                  onChange={(e) => setDraftTax(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </label>
              <label className="block text-xs font-medium text-amber-950">
                {l ? 'Total (incl. tax)' : '总额（含税）'}
                <input
                  inputMode="decimal"
                  value={draftTotal}
                  onChange={(e) => setDraftTotal(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-gray-900"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={draftSubmitSaving}
                onClick={() => void submitDraftManualForReview()}
                className="rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50"
              >
                {draftSubmitSaving
                  ? '…'
                  : l
                    ? 'Submit for review (pending)'
                    : '保存并提交待审核'}
              </button>
            </div>
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
                label={l ? 'Accounting period' : '归档年月'}
                value={
                  l
                    ? `${effectiveAccountingYear(invoice)}-${String(effectiveAccountingMonth(invoice)).padStart(2, '0')}`
                    : `${effectiveAccountingYear(invoice)}年${effectiveAccountingMonth(invoice)}月`
                }
              />
              {canAudit && !editing && (
                <p className="col-span-full -mt-2 text-[11px] text-gray-500 sm:col-span-2">
                  {l
                    ? 'Until you edit and save ledger period here, grouping may follow upload/created time.'
                    : '若尚未写入归档年月，分组会暂时按上传/创建日期推算；点击「编辑」可写入归档年份与月份。'}
                </p>
              )}
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

          {/* AI 审计结论 — historical invoices are archive-only and skip AI audit UI */}
          {isHistoricalInvoice ? (
            <section
              aria-labelledby="inv-ai-audit-heading"
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
            >
              <h3 id="inv-ai-audit-heading" className="text-sm font-semibold text-slate-900">
                {l ? 'Historical invoice — archive only' : '历史发票 · 仅归档'}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-700">
                {l
                  ? 'Invoices before the governance start date are kept for records only and are not included in AI audit.'
                  : '治理启动前的历史发票仅用于留档和查看，不进行 AI 自动审计。'}
              </p>
            </section>
          ) : (
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
                    className="shrink-0 rounded-lg bg-clearstrata-ui-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50"
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
                {historicalCandidate && historicalAudit ? (
                  <HistoricalAuditBenchmarkBlock
                    audit={historicalAudit}
                    invoiceAmount={Number(invoice.total_amount)}
                    languageEn={l}
                  />
                ) : null}
                {historicalCandidate && historicalAudit ? (
                  <p
                    className={`text-sm sm:text-base leading-6 font-medium ${
                      historicalAudit.benchmarkStatus === 'warning'
                        ? 'text-amber-950'
                        : historicalAudit.benchmarkStatus === 'normal'
                          ? 'text-blue-950'
                          : 'text-gray-800'
                    }`}
                  >
                    {historicalAuditStatusMessage(historicalAudit.benchmarkStatus, l)}
                  </p>
                ) : (
                  <p className="text-sm sm:text-base leading-6 text-gray-700 whitespace-pre-wrap">
                    {l
                      ? aiAudit.ai_summary_en || aiAudit.ai_summary_zh
                      : aiAudit.ai_summary_zh || aiAudit.ai_summary_en}
                  </p>
                )}
                {(() => {
                  const reasonsRaw = Array.isArray(aiAudit.ai_reasons)
                    ? (aiAudit.ai_reasons as unknown[])
                    : [];
                  const parsed = reasonsRaw.map((r) => parseReasonItem(r, l));
                  const { primary, supplemental } = partitionReasonsForHistoricalCandidate(
                    parsed,
                    historicalCandidate,
                  );
                  const aiSummaryText = l
                    ? aiAudit.ai_summary_en || aiAudit.ai_summary_zh
                    : aiAudit.ai_summary_zh || aiAudit.ai_summary_en;
                  const deferredSummary =
                    historicalCandidate && isVendorHistoryComparisonText(aiSummaryText)
                      ? aiSummaryText
                      : null;
                  const primaryVisible = reasonsExpanded ? primary : primary.slice(0, 3);
                  const supplementalVisible = reasonsExpanded ? supplemental : [];
                  const hiddenPrimaryCount = reasonsExpanded ? 0 : Math.max(0, primary.length - 3);
                  const hiddenSupplementalCount = reasonsExpanded ? 0 : supplemental.length;
                  const hiddenSummaryCount = reasonsExpanded || !deferredSummary ? 0 : 1;
                  const hiddenTotal =
                    hiddenPrimaryCount + hiddenSupplementalCount + hiddenSummaryCount;
                  const hasVisible =
                    primaryVisible.length > 0 ||
                    supplementalVisible.length > 0 ||
                    (reasonsExpanded && deferredSummary);
                  if (!hasVisible && hiddenTotal === 0) return null;
                  return (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">
                        {historicalCandidate
                          ? l
                            ? 'Other risk factors'
                            : '其他风险因素'
                          : l
                            ? 'Risk factors'
                            : '风险原因'}
                      </h4>
                      <ul className="space-y-2">
                        {primaryVisible.map((item, idx) => (
                          <li
                            key={`p-${idx}`}
                            className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-800"
                          >
                            <div className="font-medium text-gray-900">{item.title}</div>
                            {item.detail ? (
                              <p className="mt-1 text-gray-600 leading-relaxed">{item.detail}</p>
                            ) : null}
                          </li>
                        ))}
                        {reasonsExpanded && deferredSummary ? (
                          <li className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-sm text-gray-800">
                            <div className="font-medium text-gray-900">
                              {l ? 'AI summary (vendor history)' : 'AI 摘要（供应商历史对比）'}
                            </div>
                            <p className="mt-1 text-gray-600 leading-relaxed whitespace-pre-wrap">
                              {deferredSummary}
                            </p>
                          </li>
                        ) : null}
                        {supplementalVisible.length > 0 ? (
                          <li className="list-none">
                            <p className="text-xs font-medium text-gray-500 mb-1.5 pt-1">
                              {l ? 'Vendor history comparison (reference)' : '供应商历史对比（参考）'}
                            </p>
                            <ul className="space-y-2">
                              {supplementalVisible.map((item, idx) => (
                                <li
                                  key={`s-${idx}`}
                                  className="rounded-lg bg-gray-50/80 border border-dashed border-gray-200 px-3 py-2 text-sm text-gray-700"
                                >
                                  <div className="font-medium text-gray-900">{item.title}</div>
                                  {item.detail ? (
                                    <p className="mt-1 text-gray-600 leading-relaxed">{item.detail}</p>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          </li>
                        ) : null}
                      </ul>
                      {hiddenTotal > 0 ? (
                        <button
                          type="button"
                          onClick={() => setReasonsExpanded(true)}
                          className="mt-2 text-xs font-medium text-clearstrata-ui-primary hover:underline"
                        >
                          {l ? `Show ${hiddenTotal} more` : `展开更多（${hiddenTotal}）`}
                        </button>
                      ) : reasonsExpanded &&
                        (primary.length > 3 || supplemental.length > 0 || deferredSummary) ? (
                        <button
                          type="button"
                          onClick={() => setReasonsExpanded(false)}
                          className="mt-2 text-xs font-medium text-clearstrata-ui-primary hover:underline"
                        >
                          {l ? 'Show less' : '收起'}
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
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50"
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
          )}

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
            <section className="rounded-xl border border-clearstrata-ui-softBorder bg-clearstrata-ui-soft/80 p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{l ? 'Source task' : '来源任务'}</h3>
              <p className="text-sm text-gray-800">
                <Link
                  to={`/property-admin/tasks/${invoice.related_task_id}`}
                  className="font-medium text-clearstrata-ui-primary hover:underline"
                >
                  {relatedSourceTaskTitle || (l ? 'View task' : '查看任务')}
                </Link>
              </p>
              <p className="mt-3 text-xs text-gray-600">
                <Link
                  to={`/property-admin/tasks/${invoice.related_task_id}`}
                  className="text-clearstrata-ui-primary font-medium hover:underline"
                >
                  {l
                    ? 'View execution trail (logs / photos / before–after)'
                    : '查看执行过程（日志 / 图片 / 前后对比）'}
                </Link>
              </p>
            </section>
          ) : null}

          {/* 5. 审批区（历史归档月份不进入审核流程，仅作查看） */}
          {canAudit && invoice.status === 'pending_review' && !isHistoricalInvoice ? (
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
                      className={`w-full px-3 py-2 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-clearstrata-ui-primary focus:border-transparent ${
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
                        className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-clearstrata-ui-primary px-3 py-2 text-sm font-medium text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive sm:w-auto sm:px-3.5 sm:py-2.5"
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
            <section className="rounded-xl border border-clearstrata-ui-softBorder bg-clearstrata-ui-soft/80 p-4">
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="edit-acc-year" className="block text-sm font-medium text-gray-700 mb-1">
                    {l ? 'Accounting year' : '归档年份'}
                  </label>
                  <select
                    id="edit-acc-year"
                    value={editAccountingYear}
                    onChange={(e) => setEditAccountingYear(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {accountingYearModalOptions.map((y) => (
                      <option key={y} value={y}>
                        {l ? y : `${y}年`}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="edit-acc-month" className="block text-sm font-medium text-gray-700 mb-1">
                    {l ? 'Accounting month' : '归档月份'}
                  </label>
                  <select
                    id="edit-acc-month"
                    value={editAccountingMonth}
                    onChange={(e) => setEditAccountingMonth(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {l ? m : `${m}月`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-500">
                {l
                  ? 'Sets which ledger year/month this invoice belongs to. Independent of invoice date, payment date, and upload time.'
                  : '决定这张发票计入哪一年度的哪个月账本；与开票日、付款日、上传时间无关。'}
              </p>
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
                  className="px-4 py-2 bg-clearstrata-ui-primary text-white rounded-lg text-sm font-medium hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50"
                >
                  {saving ? '…' : l ? 'Save' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditCategory(invoice.category || 'general');
                    setEditNotes(invoice.notes || '');
                    setEditAccountingYear(effectiveAccountingYear(invoice));
                    setEditAccountingMonth(effectiveAccountingMonth(invoice));
                  }}
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
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-clearstrata-ui-primary text-white rounded-lg text-sm font-medium hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive"
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
            {canAudit && invoice.status === 'approved' && !isHistoricalInvoice && (
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
      <div className={`text-sm ${highlight ? 'text-clearstrata-ui-primary font-bold text-lg' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
