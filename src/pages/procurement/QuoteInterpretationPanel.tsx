import { FileSearch, AlertTriangle, AlertCircle, Info, CheckCircle2, Layers } from 'lucide-react';
import { buildSearchQuoteContext } from '../../lib/procurement/buildQuoteContext';
import { validateInterpretationConsistency } from '../../lib/procurement/quoteInterpretationConsistency';
import {
  reconcileTaxBasis,
  resolveInvoicePackageTotal,
} from '../../lib/procurement/taxBasisReconciliation';

interface QuoteInterpretationPanelProps {
  parsedQuoteJson: Record<string, unknown> | null | undefined;
  language: string;
  authorizedAmount?: number | null;
  jobCategory?: string | null;
}

type LineItem = { description: string; amount: number | null };

const SCOPE_MAX = 500;
const SUMMARY_MAX = 300;
const MAX_LINE_ITEMS = 5;

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

/** First non-empty string among the given keys. */
function pick(pq: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const v = str(pq[key]);
    if (v) return v;
  }
  return '';
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseFloat(v.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function formatAmount(amount: number, currency: string): string {
  const cur = currency || 'CAD';
  return `${cur} $${amount.toLocaleString()}`;
}

/** Cents-precise amount for tax reconciliation (e.g. CAD $93,187.50). */
function formatAmount2(amount: number, currency: string): string {
  const cur = currency || 'CAD';
  return `${cur} $${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const TOTAL_SOURCE_LABELS: Record<string, { en: string; zh: string }> = {
  balance_due: { en: 'Balance Due', zh: 'Balance Due（应付余额）' },
  amount_due: { en: 'Amount Due', zh: 'Amount Due（应付金额）' },
  total_due: { en: 'Total Due', zh: 'Total Due（应付总额）' },
  grand_total: { en: 'Grand Total', zh: 'Grand Total（总计）' },
  invoice_total: { en: 'Invoice Total', zh: 'Invoice Total（发票总额）' },
  total: { en: 'Total', zh: 'Total（合计）' },
  subtotal_plus_tax: { en: 'Subtotal + tax', zh: '小计 + 税额' },
  line_items_sum: { en: 'Sum of line items', zh: '明细金额合计' },
};

/** Friendly label for a single total_source value (e.g. balance_due → "Balance Due"). */
function sourceLabel(source: string, en: boolean): string {
  const hit = TOTAL_SOURCE_LABELS[source];
  if (!hit) return source;
  return en ? hit.en : hit.zh;
}

/** Human label for which figure the page/package total was resolved from (Phase 2A.10). */
function resolveTotalSourceLabel(pq: Record<string, unknown>, en: boolean): string {
  if (str(pq.total_mode) === 'sum_invoices') {
    const count = num(pq.package_parts_count);
    return en
      ? `Sum of ${count ?? ''} invoices (Balance Due)`.replace('  ', ' ')
      : `${count ?? ''} 张发票合计（按 Balance Due）`.trim();
  }
  const source = str(pq.total_source);
  if (!TOTAL_SOURCE_LABELS[source]) return '';
  return sourceLabel(source, en);
}

interface InvoiceAuditConsistency {
  hasWarning: boolean;
  warnings: string[];
  expectedInvoiceTotal: number | null;
  dueAmount: number | null;
  diff: number | null;
}

interface InvoiceAuditPart {
  source_file_name: string;
  document_number: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  invoice_total: number | null;
  payments_credits: number | null;
  balance_due: number | null;
  amount_due: number | null;
  total_due: number | null;
  total_source: string;
  field_sources: Record<string, string>;
  consistency: InvoiceAuditConsistency | null;
  /** True when the model returned a dedicated totals-block transcription (Phase 3). */
  hasTotalsBlock: boolean;
  /** Which transcription the selected totals came from (Phase 3A). */
  selectedFinancialTextSource: 'totals_block_text' | 'raw_text_original' | 'none' | '';
  /** Dual-OCR cross-check disagreed between the two transcriptions (Phase 3A). */
  ocrConflict: boolean;
  /** Field keys that disagreed across transcriptions (Phase 3A). */
  conflictFields: string[];
  /** Which totals-block transcription fed dual verification (Phase 3B). */
  totalsBlockInputSource: string;
  /** Dual-verification reason code (Phase 4A.2 explicit-due protection). */
  verificationReason: string;
  /** Invoice boundary detection for this part's PDF (Phase 4B.1). */
  boundary: BoundarySnapshotView | null;
}

function readFieldSources(row: Record<string, unknown>): Record<string, string> {
  const fs = row.financial_field_sources;
  if (!fs || typeof fs !== 'object') return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(fs as Record<string, unknown>)) {
    const s = str(v);
    if (s) out[k] = s;
  }
  return out;
}

function ocrSourceLabel(
  part: {
    selectedFinancialTextSource: string;
    ocrConflict: boolean;
    hasTotalsBlock: boolean;
    totalsBlockInputSource?: string;
    verificationReason?: string;
  },
  en: boolean,
): string {
  // Phase 4A.2 — an explicit Due-label win takes precedence in the label.
  if (part.verificationReason && part.verificationReason.includes('explicit_due')) {
    return en ? 'Selected explicit due amount' : '已采用明确应付金额';
  }
  const independent = part.totalsBlockInputSource === 'independent_totals_block_text';
  const totalsBlockLabel = independent
    ? en
      ? 'Independent totals OCR'
      : '独立合计区 OCR'
    : en
      ? 'Totals block OCR'
      : 'Totals block OCR（合计区原文）';
  if (part.selectedFinancialTextSource === 'raw_text_original') {
    return en ? 'Full raw text OCR' : '全文 OCR';
  }
  if (part.selectedFinancialTextSource === 'totals_block_text') {
    if (!part.ocrConflict && independent) return en ? 'Dual verified' : '双路验证一致';
    return totalsBlockLabel;
  }
  if (part.hasTotalsBlock) return totalsBlockLabel;
  return en ? 'Full raw text OCR' : '全文 OCR';
}

const CONFLICT_FIELD_LABELS: Record<string, { en: string; zh: string }> = {
  subtotal: { en: 'Subtotal', zh: '小计' },
  sales_tax: { en: 'Sales Tax', zh: '税额' },
  payments_credits: { en: 'Payments/Credits', zh: '已付/抵扣' },
  invoice_total: { en: 'Invoice Total', zh: '发票总额' },
  total_due: { en: 'Total Due', zh: '应付总额' },
  amount_due: { en: 'Amount Due', zh: '应付金额' },
  balance_due: { en: 'Balance Due', zh: '应付余额' },
  total_amount: { en: 'Total', zh: '总额' },
};

function conflictFieldLabel(field: string, en: boolean): string {
  const m = CONFLICT_FIELD_LABELS[field];
  if (!m) return field;
  return en ? m.en : m.zh;
}

function readVerification(row: Record<string, unknown>): {
  source: 'totals_block_text' | 'raw_text_original' | 'none' | '';
  conflict: boolean;
  conflictFields: string[];
  reason: string;
} {
  const v = row.financial_totals_verification;
  const selected = str(row.selected_financial_text_source);
  const source =
    selected === 'totals_block_text' || selected === 'raw_text_original' || selected === 'none'
      ? selected
      : '';
  if (!v || typeof v !== 'object') {
    return { source, conflict: false, conflictFields: [], reason: '' };
  }
  const obj = v as Record<string, unknown>;
  const vSource = str(obj.selected_source);
  return {
    source:
      source ||
      (vSource === 'totals_block_text' || vSource === 'raw_text_original' || vSource === 'none'
        ? (vSource as 'totals_block_text' | 'raw_text_original' | 'none')
        : ''),
    conflict: obj.conflict === true,
    conflictFields: Array.isArray(obj.conflict_fields)
      ? obj.conflict_fields.map((f) => String(f))
      : [],
    reason: str(obj.reason),
  };
}

function readConsistency(row: Record<string, unknown>): InvoiceAuditConsistency | null {
  const audit = row.consistency_audit;
  if (!audit || typeof audit !== 'object') return null;
  const a = audit as Record<string, unknown>;
  return {
    hasWarning: a.hasWarning === true,
    warnings: Array.isArray(a.warnings) ? a.warnings.map((w) => String(w)) : [],
    expectedInvoiceTotal: num(a.expectedInvoiceTotal),
    dueAmount: num(a.dueAmount),
    diff: num(a.diff),
  };
}

type CoverageStatus = 'complete' | 'partial' | 'duplicate_detected' | 'failed' | 'unknown' | '';

type FailedAttachmentView = {
  url: string;
  name: string | null;
  error: string | null;
};

type CoverageView = {
  status: CoverageStatus;
  inputCount: number | null;
  parsedCount: number | null;
  failedCount: number | null;
  duplicateCount: number | null;
  failed: FailedAttachmentView[];
};

/** Read the Phase 4A.3 package-coverage fields. Returns null for old jobs with no info. */
function readCoverage(pq: Record<string, unknown>): CoverageView | null {
  const rawStatus = str(pq.coverage_status);
  const hasAny =
    rawStatus !== '' ||
    pq.package_input_count != null ||
    Array.isArray(pq.failed_attachments);
  if (!hasAny) return null;
  const status: CoverageStatus =
    rawStatus === 'complete' ||
    rawStatus === 'partial' ||
    rawStatus === 'duplicate_detected' ||
    rawStatus === 'failed' ||
    rawStatus === 'unknown'
      ? rawStatus
      : '';
  const failed: FailedAttachmentView[] = Array.isArray(pq.failed_attachments)
    ? pq.failed_attachments
        .filter((f): f is Record<string, unknown> => Boolean(f) && typeof f === 'object')
        .map((f) => ({
          url: str(f.url),
          name: str(f.name) || null,
          error: str(f.error) || null,
        }))
    : [];
  return {
    status,
    inputCount: num(pq.package_input_count),
    parsedCount: num(pq.package_parsed_count),
    failedCount: num(pq.package_failed_count),
    duplicateCount: num(pq.package_duplicate_count),
    failed,
  };
}

/** Short, readable attachment label: prefer name, else the file part of the URL. */
function attachmentLabel(att: FailedAttachmentView): string {
  if (att.name) return att.name;
  const url = att.url || '';
  const tail = url.split('/').pop() || url;
  return tail || '(unknown file)';
}

type BoundaryGroupView = {
  invoice_number: string | null;
  pages: number[];
};

type BoundarySnapshotView = {
  page_count: number;
  status: 'single_invoice' | 'multi_invoice_grouped' | 'ambiguous' | 'failed' | '';
  hasMultipleGroups: boolean;
  hasMultiPageInvoice: boolean;
  multipleTotalsDetected: boolean;
  groups: BoundaryGroupView[];
};

/** Read the Phase 4B.1 invoice-boundary snapshot off a parsed-quote / invoice-part row. */
function readBoundarySnapshot(row: Record<string, unknown>): BoundarySnapshotView | null {
  const snap = row.pdf_boundary_snapshot;
  if (!snap || typeof snap !== 'object') return null;
  const s = snap as Record<string, unknown>;
  const statusRaw = str(s.boundary_status);
  const status =
    statusRaw === 'single_invoice' ||
    statusRaw === 'multi_invoice_grouped' ||
    statusRaw === 'ambiguous' ||
    statusRaw === 'failed'
      ? statusRaw
      : '';
  const groups: BoundaryGroupView[] = Array.isArray(s.groups)
    ? s.groups
        .filter((g): g is Record<string, unknown> => Boolean(g) && typeof g === 'object')
        .map((g) => ({
          invoice_number: str(g.invoice_number) || null,
          pages: Array.isArray(g.pages)
            ? g.pages.map((p) => Number(p)).filter((p) => Number.isFinite(p))
            : [],
        }))
    : [];
  return {
    page_count: num(s.page_count) ?? 0,
    status,
    hasMultipleGroups: s.has_multiple_invoice_groups === true,
    hasMultiPageInvoice: s.has_multi_page_invoice === true,
    multipleTotalsDetected: s.multiple_totals_detected === true,
    groups,
  };
}

/** "1–2" / "3" / "1, 3–4" page-range string from 1-based page numbers. */
function formatPageRange(pages: number[]): string {
  const sorted = [...new Set(pages)].sort((a, b) => a - b);
  if (sorted.length === 0) return '';
  const parts: string[] = [];
  let start = sorted[0]!;
  let prev = sorted[0]!;
  for (let i = 1; i <= sorted.length; i += 1) {
    const cur = sorted[i];
    if (cur === prev + 1) {
      prev = cur;
      continue;
    }
    parts.push(start === prev ? `${start}` : `${start}\u2013${prev}`);
    if (cur != null) {
      start = cur;
      prev = cur;
    }
  }
  return parts.join(', ');
}

function BoundaryAudit({ snap, en }: { snap: BoundarySnapshotView; en: boolean }) {
  if (!snap.status || snap.status === 'failed') return null;

  if (snap.status === 'single_invoice') {
    if (!snap.hasMultiPageInvoice && !snap.multipleTotalsDetected) return null;
    const g = snap.groups[0];
    const inv = g?.invoice_number ? `Invoice #${g.invoice_number}` : en ? 'this invoice' : '该发票';
    const range = g ? formatPageRange(g.pages) : '';
    return (
      <div className="mt-2 flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 p-2 text-[11px] text-sky-800">
        <Layers size={13} className="mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          {snap.hasMultiPageInvoice && (
            <p>
              {en
                ? `Detected a single invoice spanning ${snap.page_count} pages: ${inv}, Pages ${range}.`
                : `检测到单张发票跨 ${snap.page_count} 页：${inv}，Pages ${range}。`}
            </p>
          )}
          {snap.multipleTotalsDetected && (
            <p>
              {en
                ? 'Multiple totals blocks were detected on these pages. Please verify the package total covers the whole invoice.'
                : '这些页面中检测到多个合计区，请确认包总额已覆盖整张发票。'}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (snap.status === 'multi_invoice_grouped') {
    return (
      <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
        <AlertTriangle size={13} className="mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p>
            {en
              ? 'This PDF appears to contain multiple invoices, but the current version parsed it as a single invoice entry. The package total may be incomplete.'
              : '检测到此 PDF 可能包含多张发票，但当前版本仅解析为 1 个发票条目，包总额可能不完整。'}
          </p>
          {snap.groups.map((g, i) => (
            <p key={i} className="font-medium">
              {g.invoice_number ? `Invoice #${g.invoice_number}` : en ? 'Unlabeled' : '未标注'} ·{' '}
              {en ? 'pages' : '页'} {formatPageRange(g.pages) || '—'}
            </p>
          ))}
        </div>
      </div>
    );
  }

  // ambiguous
  return (
    <div className="mt-2 flex items-start gap-2 rounded-md border border-slate-200 bg-slate-50 p-2 text-[11px] text-slate-600">
      <Info size={13} className="mt-0.5 shrink-0" />
      <p>
        {en
          ? 'Could not reliably determine invoice boundaries within this PDF.'
          : '无法可靠判断 PDF 内发票边界。'}
      </p>
    </div>
  );
}

function CoverageAudit({ cov, en }: { cov: CoverageView; en: boolean }) {
  const input = cov.inputCount ?? 0;
  const parsed = cov.parsedCount ?? 0;
  const failed = cov.failedCount ?? cov.failed.length;

  if (cov.status === 'complete') {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
        <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="font-medium">
            {en ? 'All uploaded files parsed' : '已解析全部上传文件'}
          </p>
          <p>
            {en ? `Uploaded: ${input} · Parsed: ${parsed}` : `已上传：${input} · 成功解析：${parsed}`}
          </p>
        </div>
      </div>
    );
  }

  if (cov.status === 'failed') {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        <div className="space-y-0.5">
          <p className="font-medium">
            {en
              ? 'None of the uploaded files could be parsed; the package total cannot be computed.'
              : '所有上传文件均未成功解析，无法计算包总额。'}
          </p>
          <p>{en ? `Uploaded: ${input}` : `已上传：${input}`}</p>
        </div>
      </div>
    );
  }

  if (cov.status === 'duplicate_detected') {
    if ((cov.duplicateCount ?? 0) <= 0) return null;
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-2.5 text-xs text-orange-800">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <p>
          {en
            ? 'Possible duplicate files detected in this package.'
            : '检测到此报价包中可能存在重复文件。'}
        </p>
      </div>
    );
  }

  if (cov.status === 'partial') {
    return (
      <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
        <div className="space-y-1">
          <p className="font-medium">
            {en
              ? 'Incomplete file coverage — the current total only reflects the files that were parsed successfully.'
              : '文件覆盖不完整，当前金额仅基于已成功解析的文件。'}
          </p>
          <p>
            {en
              ? `Uploaded: ${input} · Parsed: ${parsed} · Failed: ${failed}`
              : `已上传：${input} · 成功解析：${parsed} · 失败：${failed}`}
          </p>
          {cov.failed.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {cov.failed.map((att, i) => (
                <li key={i} className="break-all">
                  <span className="font-medium">{attachmentLabel(att)}</span>
                  {att.error && <span className="text-amber-700"> — {clip(att.error, 120)}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // unknown / '' — old job without coverage info: a light, non-alarming note.
  return (
    <div className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-[11px] text-slate-500">
      <Info size={13} className="mt-0.5 shrink-0" />
      <p>{en ? 'No coverage audit for this (older) job.' : '旧工单无覆盖审计信息。'}</p>
    </div>
  );
}

/** Read the per-invoice audit trail for a summed multi-invoice package (Phase 2B/2C). */
function readInvoiceParts(pq: Record<string, unknown>): InvoiceAuditPart[] {
  const raw = Array.isArray(pq.invoice_parts) ? pq.invoice_parts : null;
  if (!raw) return [];
  const out: InvoiceAuditPart[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    out.push({
      source_file_name: str(row.source_file_name),
      document_number: str(row.document_number) || null,
      subtotal: num(row.subtotal),
      tax_amount: num(row.tax_amount),
      total_amount: num(row.total_amount),
      invoice_total: num(row.invoice_total),
      payments_credits: num(row.payments_credits),
      balance_due: num(row.balance_due),
      amount_due: num(row.amount_due),
      total_due: num(row.total_due),
      total_source: str(row.total_source) || 'balance_due',
      field_sources: readFieldSources(row),
      consistency: readConsistency(row),
      hasTotalsBlock: Boolean(str(row.totals_block_text)),
      ...(() => {
        const ver = readVerification(row);
        return {
          selectedFinancialTextSource: ver.source,
          ocrConflict: ver.conflict,
          conflictFields: ver.conflictFields,
          totalsBlockInputSource: str(row.totals_block_input_source),
          verificationReason: ver.reason,
        };
      })(),
      boundary: readBoundarySnapshot(row),
    });
  }
  return out;
}

function clip(value: string, max: number): string {
  const v = value.trim();
  return v.length > max ? `${v.slice(0, max)}…` : v;
}

/** Resolve the displayed quoted amount, avoiding a double "$" on pre-formatted strings. */
function resolveAmount(pq: Record<string, unknown>, currency: string): string {
  const numeric = num(pq.total_amount ?? pq.totalAmount ?? pq.amount);
  if (numeric != null) return formatAmount(numeric, currency);

  const cp = str(pq.currentPrice);
  if (cp) {
    if (cp.includes('$')) return cp;
    const n = num(cp);
    return n != null ? formatAmount(n, currency) : cp;
  }
  return '—';
}

const PRICING_BASIS_RULES: { match: string[]; en: string; zh: string }[] = [
  { match: ['one-time', 'one_time', 'onetime', 'project', 'lump_sum', 'lump sum'], en: 'One-time', zh: '一次性授权' },
  { match: ['cubic_yard', 'cubic yard', 'yard'], en: 'Per cubic yard', zh: '按立方码' },
  { match: ['per_visit', 'per visit', 'visit'], en: 'Per visit', zh: '单次服务' },
  { match: ['monthly', 'month'], en: 'Monthly', zh: '月度服务' },
  { match: ['annual', 'yearly', 'year'], en: 'Annual', zh: '年度合同' },
  { match: ['hourly', 'hour'], en: 'Hourly', zh: '小时计费' },
  { match: ['daily', 'day'], en: 'Daily', zh: '日计费' },
];

/** Map a raw pricing-basis/billing-period/price-unit value to a friendly label. No default to monthly. */
function resolvePricingBasis(pq: Record<string, unknown>, langEn: boolean): string {
  const raw = pick(pq, ['pricing_basis', 'billing_period', 'price_unit']).toLowerCase();
  if (!raw || raw === 'unknown') return '—';
  for (const rule of PRICING_BASIS_RULES) {
    if (rule.match.some((m) => raw.includes(m))) {
      return langEn ? rule.en : rule.zh;
    }
  }
  // Unknown unit: show the raw value as-is rather than mislabelling it.
  return raw;
}

/** Tolerant line-item reader: supports string[] and several object shapes. */
function readLineItems(pq: Record<string, unknown>): LineItem[] {
  const raw = Array.isArray(pq.line_items)
    ? pq.line_items
    : Array.isArray(pq.items)
      ? pq.items
      : null;
  if (!raw) return [];

  const out: LineItem[] = [];
  for (const item of raw) {
    if (out.length >= MAX_LINE_ITEMS) break;
    if (typeof item === 'string') {
      const description = item.trim();
      if (description) out.push({ description, amount: null });
      continue;
    }
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const description = pick(row, ['description', 'item', 'name', 'service', 'text']);
    if (!description) continue;
    out.push({ description, amount: num(row.amount) });
  }
  return out;
}

/** Human-friendly label for the grand_total_recovered_from source. */
function recoveredFromLabel(source: string, langEn: boolean): string {
  switch (source) {
    case 'keyword_match':
      return langEn
        ? 'Grand Total / Contract Price / Balance Due'
        : '报价单总价栏位（Grand Total / Contract Price / Balance Due）';
    case 'line_items_plus_tax':
      return langEn ? 'Line items + tax' : '明细项合计 + 税额';
    case 'authorized_match':
      return langEn ? 'Closest document figure' : '报价单中最接近的金额';
    default:
      return '';
  }
}

/** Compressed search basis summary; never raw_text. */
function comparisonSummary(pq: Record<string, unknown>): string {
  const fromContext = str(pq.quote_context);
  const summary = fromContext || buildSearchQuoteContext(pq);
  return clip(summary, SUMMARY_MAX);
}

export function QuoteInterpretationPanel({
  parsedQuoteJson,
  language,
  authorizedAmount,
  jobCategory,
}: QuoteInterpretationPanelProps) {
  const l = language === 'en';

  if (!parsedQuoteJson || typeof parsedQuoteJson !== 'object') return null;

  const pq = parsedQuoteJson;

  const consistency = validateInterpretationConsistency({
    parsedQuoteJson,
    authorizedAmount,
    jobCategory,
  });
  const warn = consistency.warnings;
  const grandTotalRecovered = pq.grand_total_recovered === true;
  const grandTotalRecoveredFrom = str(pq.grand_total_recovered_from);

  // Tax Basis Reconciliation (Phase 2A.8): authorization is pre-tax, the OCR
  // package total is after-tax. A GST-only gap is reconciled, not flagged.
  const reconciliation = reconcileTaxBasis({
    authorizationAmount: authorizedAmount ?? null,
    invoicePackageTotal: resolveInvoicePackageTotal(pq),
  });
  // Suppress the yellow amount warning once the two tax bases agree.
  const showAmountMismatch = warn.includes('amount_mismatch') && !reconciliation.reconciled;

  const vendor = pick(pq, ['vendor_name', 'vendorName', 'supplier_name', 'supplierName']);
  const category = pick(pq, ['category', 'service_category', 'serviceType']);
  const currency = str(pq.currency) || 'CAD';
  const amountDisplay = resolveAmount(pq, currency);
  const pricingBasis = resolvePricingBasis(pq, l);
  const scopeRaw = pick(pq, ['service_scope', 'scope', 'analysis_description', 'description']);
  const scope = scopeRaw ? clip(scopeRaw, SCOPE_MAX) : '';
  const lineItems = readLineItems(pq);
  // Phase 2B: for a summed multi-invoice package, AI line items are not reliable
  // payment figures — show the per-invoice audit trail instead and hide them.
  const invoiceParts = readInvoiceParts(pq);
  const showInvoiceAudit = str(pq.total_mode) === 'sum_invoices' && invoiceParts.length > 0;
  const topBoundary = readBoundarySnapshot(pq);
  const coverage = readCoverage(pq);
  // Phase 4A.3 — a partial/failed package must not display a full green "reconciled".
  const coverageIncomplete =
    coverage != null && (coverage.status === 'partial' || coverage.status === 'failed');
  const packageTotal = num(pq.total_amount ?? pq.totalAmount ?? pq.amount);
  const summary = comparisonSummary(pq);

  const vendorLabel = vendor || (l ? 'Not identified' : '未识别');

  const hasContent = Boolean(
    vendor || category || scope || lineItems.length > 0 ||
    (amountDisplay && amountDisplay !== '—') ||
    (pricingBasis && pricingBasis !== '—'),
  );

  if (!hasContent) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-slate-600">
          <FileSearch size={18} />
          <span className="text-sm font-semibold">
            {l ? 'Quote Interpretation' : '报价解读'}
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          {l ? 'No quote interpretation available.' : '暂无报价解读。'}
        </p>
      </div>
    );
  }

  const rows: { label: string; value: string; wide?: boolean }[] = [
    { label: l ? 'Current vendor' : '当前供应商', value: vendorLabel },
  ];
  if (category) rows.push({ label: l ? 'Service category' : '服务类别', value: category });
  rows.push({ label: l ? 'Quoted amount' : '报价金额', value: amountDisplay });
  const totalSourceLabel = resolveTotalSourceLabel(pq, l);
  if (totalSourceLabel) {
    rows.push({ label: l ? 'Total source' : '总额来源', value: totalSourceLabel });
  }
  const topVerification = readVerification(pq);
  if (topVerification.source) {
    rows.push({
      label: l ? 'OCR source' : 'OCR 来源',
      value: ocrSourceLabel(
        {
          selectedFinancialTextSource: topVerification.source,
          ocrConflict: topVerification.conflict,
          hasTotalsBlock: Boolean(str(pq.totals_block_text)),
          totalsBlockInputSource: str(pq.totals_block_input_source),
          verificationReason: topVerification.reason,
        },
        l,
      ),
    });
  }
  if (pricingBasis && pricingBasis !== '—') {
    rows.push({ label: l ? 'Pricing basis' : '计费方式', value: pricingBasis });
  }
  if (scope) rows.push({ label: l ? 'Service scope' : '工作范围', value: scope, wide: true });

  return (
    <div className="bg-gradient-to-r from-slate-50 to-sky-50 border border-sky-200 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <FileSearch className="text-sky-600" size={18} />
        <span className="text-sm font-semibold text-sky-900">
          {l ? 'Quote Interpretation' : '报价解读'}
        </span>
        <span className="text-[11px] text-sky-600/70">
          {l ? '(from uploaded quote)' : '（来自上传报价单）'}
        </span>
      </div>

      {(warn.includes('missing_vendor') || warn.includes('missing_scope')) && (
        <div className="mb-3 space-y-2">
          {warn.includes('missing_vendor') && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>
                {l
                  ? 'Current vendor could not be identified. Please re-upload the quote or confirm the vendor name before market comparison.'
                  : '无法识别当前供应商。请重新上传报价单，或手动确认供应商名称后再进行市场比较。'}
              </span>
            </div>
          )}
          {warn.includes('missing_scope') && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>
                {l
                  ? 'Service scope could not be identified. Please add a service description before market comparison.'
                  : '无法识别工作范围。请补充工作描述后再进行市场比较。'}
              </span>
            </div>
          )}
        </div>
      )}

      {topVerification.conflict && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <div className="space-y-0.5">
            <p>
              {l
                ? 'Totals block OCR and full-text OCR disagree. The system selected the more internally consistent set. Please verify the original invoice.'
                : '检测到 totals block OCR 与全文 OCR 的金额不一致，系统已选择更自洽的一组。请核对原始发票。'}
            </p>
            {topVerification.conflictFields.length > 0 && (
              <p>
                {l ? 'Conflicting fields: ' : '冲突字段：'}
                {topVerification.conflictFields.map((f) => conflictFieldLabel(f, l)).join(', ')}
              </p>
            )}
            <p>
              {l ? 'Selected: ' : '已采用：'}
              {ocrSourceLabel(
                {
                  selectedFinancialTextSource: topVerification.source,
                  ocrConflict: topVerification.conflict,
                  hasTotalsBlock: Boolean(str(pq.totals_block_text)),
                  totalsBlockInputSource: str(pq.totals_block_input_source),
                  verificationReason: topVerification.reason,
                },
                l,
              )}
            </p>
          </div>
        </div>
      )}

      {grandTotalRecovered && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-2.5 text-xs text-blue-700">
          <Info size={14} className="mt-0.5 shrink-0" />
          <div>
            <p>
              {l
                ? 'The quoted amount has been corrected based on the quote document.'
                : '报价总金额已根据报价单内容自动校正。'}
            </p>
            {recoveredFromLabel(grandTotalRecoveredFrom, l) && (
              <p className="mt-1">
                {l ? 'Recovered from: ' : '校正来源：'}
                <span className="font-medium">
                  {recoveredFromLabel(grandTotalRecoveredFrom, l)}
                </span>
              </p>
            )}
          </div>
        </div>
      )}

      {reconciliation.reconciled && reconciliation.invoicePackageTotal != null && coverageIncomplete && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <p>
            {l
              ? 'File coverage is incomplete — this amount is for reference only; some files are not included in the total.'
              : '文件覆盖不完整，当前金额仅供参考；部分文件未进入合计，请核对上传包。'}
          </p>
        </div>
      )}

      {reconciliation.reconciled && reconciliation.invoicePackageTotal != null && !coverageIncomplete && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">
              {reconciliation.basis === 'gst_adjusted'
                ? l
                  ? 'Amount reconciled (GST adjusted)'
                  : '金额已对账（GST 调整）'
                : l
                  ? 'Amount reconciled'
                  : '金额已对账'}
            </p>
            {reconciliation.basis === 'gst_adjusted' && (
              <div className="mt-1 space-y-0.5">
                {reconciliation.authorizationAmount != null && (
                  <p>
                    {l ? 'Authorized amount (pre-tax): ' : '授权金额（税前）：'}
                    <span className="font-medium">
                      {formatAmount2(reconciliation.authorizationAmount, currency)}
                    </span>
                  </p>
                )}
                {reconciliation.gstAdjustedAmount != null && (
                  <p>
                    {l ? 'GST-adjusted amount: ' : 'GST 调整金额：'}
                    <span className="font-medium">
                      {formatAmount2(reconciliation.gstAdjustedAmount, currency)}
                    </span>
                  </p>
                )}
                <p>
                  {l ? 'Invoice total: ' : '发票总额：'}
                  <span className="font-medium">
                    {formatAmount2(reconciliation.invoicePackageTotal, currency)}
                  </span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {(showAmountMismatch || warn.includes('category_mismatch')) && (
        <div className="mb-3 space-y-2">
          {showAmountMismatch && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <div>
                <p>
                  {l
                    ? 'Authorized amount differs from the OCR total. Please confirm the amount used for comparison.'
                    : '授权金额与报价单总额不一致，请确认比较依据。'}
                </p>
                <p className="mt-1">
                  {l ? 'Authorized amount: ' : '授权金额：'}
                  <span className="font-medium">
                    {formatAmount(authorizedAmount as number, currency)}
                  </span>
                </p>
                {consistency.ocrAmount != null && (
                  <p>
                    {l ? 'OCR amount: ' : 'OCR 金额：'}
                    <span className="font-medium">
                      {formatAmount(consistency.ocrAmount, currency)}
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
          {warn.includes('category_mismatch') && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              <div>
                <p>
                  {l
                    ? 'The OCR category differs from the job category. Market search will use the job category.'
                    : 'OCR 识别类别与工单分类不同。市场搜索将以工单分类为准。'}
                </p>
                <p className="mt-1">
                  {l ? 'Job category: ' : '工单分类：'}
                  <span className="font-medium">{jobCategory}</span>
                </p>
                {consistency.ocrCategory && (
                  <p>
                    {l ? 'OCR category: ' : 'OCR 分类：'}
                    <span className="font-medium">{consistency.ocrCategory}</span>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className={row.wide ? 'md:col-span-2' : ''}>
            <dt className="text-xs font-medium text-slate-500">{row.label}</dt>
            <dd className="text-slate-800 whitespace-pre-wrap break-words">{row.value}</dd>
          </div>
        ))}
      </dl>

      {coverage && <CoverageAudit cov={coverage} en={l} />}

      {!showInvoiceAudit && topBoundary && <BoundaryAudit snap={topBoundary} en={l} />}

      {showInvoiceAudit && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-white/70 p-3">
          <p className="text-xs font-semibold text-slate-700 mb-2">
            {l ? 'Invoice audit trail' : '发票明细'}
          </p>
          <div className="space-y-2.5">
            {invoiceParts.map((part, idx) => (
              <div
                key={idx}
                className="rounded-md border border-slate-100 bg-slate-50/70 p-2.5 text-xs text-slate-700"
              >
                <p className="font-medium text-slate-800">
                  {l ? 'Invoice #' : '发票号'}: {part.document_number || '—'}
                </p>
                <div className="mt-1 space-y-1">
                  {[
                    { label: l ? 'Subtotal' : '小计', amount: part.subtotal, src: part.field_sources.subtotal },
                    { label: l ? 'Sales Tax' : '税', amount: part.tax_amount, src: part.field_sources.sales_tax },
                    {
                      label: l ? 'Payments/Credits' : '已付/抵扣',
                      amount: part.payments_credits,
                      src: part.field_sources.payments_credits,
                      optional: true,
                    },
                    {
                      label: l ? 'Invoice Total' : '发票总额',
                      amount: part.invoice_total ?? part.total_due,
                      src: part.field_sources.invoice_total ?? part.field_sources.total_due ?? part.field_sources.total,
                      optional: true,
                    },
                    {
                      label: l ? 'Balance Due' : '应付金额',
                      amount: part.balance_due ?? part.amount_due ?? part.total_amount,
                      src:
                        part.field_sources.balance_due ??
                        part.field_sources.amount_due ??
                        part.field_sources.total_due,
                      strong: true,
                    },
                  ]
                    .filter((row) => !row.optional || row.amount != null)
                    .map((row) => (
                      <div key={row.label}>
                        <p
                          className={`flex justify-between gap-3 ${
                            row.strong ? 'font-medium text-slate-800' : ''
                          }`}
                        >
                          <span className={row.strong ? '' : 'text-slate-500'}>{row.label}</span>
                          <span className="whitespace-nowrap">
                            {row.amount != null ? formatAmount2(row.amount, currency) : '—'}
                          </span>
                        </p>
                        {row.src && (
                          <p className="text-[10px] text-slate-400 break-all">
                            {l ? 'Source: ' : '来源：'}
                            {row.src}
                          </p>
                        )}
                      </div>
                    ))}
                  <p className="flex justify-between gap-3 pt-0.5">
                    <span className="text-slate-500">{l ? 'Total source' : '总额来源'}</span>
                    <span className="whitespace-nowrap">{sourceLabel(part.total_source, l)}</span>
                  </p>
                  {(part.selectedFinancialTextSource || part.hasTotalsBlock) && (
                    <p className="flex justify-between gap-3">
                      <span className="text-slate-500">{l ? 'OCR source' : 'OCR 来源'}</span>
                      <span className="whitespace-nowrap text-slate-500">
                        {ocrSourceLabel(part, l)}
                      </span>
                    </p>
                  )}
                </div>
                {part.source_file_name && (
                  <p className="mt-1 text-[11px] text-slate-400 break-all">
                    {l ? 'Source file' : '文件名'}: {part.source_file_name}
                  </p>
                )}
                {part.boundary && <BoundaryAudit snap={part.boundary} en={l} />}
                {part.ocrConflict && (
                  <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p>
                        {l
                          ? 'Totals block OCR and full-text OCR disagree. The system selected the more internally consistent set. Please verify the original invoice.'
                          : '检测到 totals block OCR 与全文 OCR 的金额不一致，系统已选择更自洽的一组。请核对原始发票。'}
                      </p>
                      {part.conflictFields.length > 0 && (
                        <p>
                          {l ? 'Conflicting fields: ' : '冲突字段：'}
                          {part.conflictFields.map((f) => conflictFieldLabel(f, l)).join(', ')}
                        </p>
                      )}
                      <p>
                        {l ? 'Selected: ' : '已采用：'}
                        {ocrSourceLabel(part, l)}
                      </p>
                    </div>
                  </div>
                )}
                {part.consistency?.hasWarning && (
                  <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                    <AlertTriangle size={13} className="mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <p>
                        {l
                          ? 'OCR detected inconsistent subtotal, tax or total values. Please verify the original invoice. Do not change the package total unless Balance Due is affected.'
                          : 'OCR 数字存在内部不一致，请核对原始发票。除非 Balance Due 受影响，否则不要更改包总额。'}
                      </p>
                      {part.consistency.expectedInvoiceTotal != null && (
                        <p className="flex justify-between gap-3">
                          <span>{l ? 'Subtotal + Tax' : '小计 + 税额'}</span>
                          <span className="whitespace-nowrap font-medium">
                            {formatAmount2(part.consistency.expectedInvoiceTotal, currency)}
                          </span>
                        </p>
                      )}
                      {part.invoice_total != null && (
                        <p className="flex justify-between gap-3">
                          <span>{l ? 'Invoice Total' : '发票总额'}</span>
                          <span className="whitespace-nowrap font-medium">
                            {formatAmount2(part.invoice_total, currency)}
                          </span>
                        </p>
                      )}
                      {part.consistency.dueAmount != null && (
                        <p className="flex justify-between gap-3">
                          <span>{l ? 'Balance Due' : '应付金额'}</span>
                          <span className="whitespace-nowrap font-medium">
                            {formatAmount2(part.consistency.dueAmount, currency)}
                          </span>
                        </p>
                      )}
                      {part.consistency.diff != null && (
                        <p className="flex justify-between gap-3">
                          <span>{l ? 'Difference' : '差额'}</span>
                          <span className="whitespace-nowrap font-medium">
                            {formatAmount2(Math.abs(part.consistency.diff), currency)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {packageTotal != null && (
            <p className="mt-2.5 border-t border-slate-200 pt-2 text-sm font-semibold text-slate-800 flex justify-between gap-3">
              <span>
                {l ? 'Invoice package total (by Balance Due)' : '发票合计（按 Balance Due）'}
              </span>
              <span className="whitespace-nowrap">{formatAmount2(packageTotal, currency)}</span>
            </p>
          )}
        </div>
      )}

      {!showInvoiceAudit && lineItems.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-medium text-slate-500 mb-1">
            {l ? 'Key line items' : '关键项目'}
          </p>
          <ul className="space-y-0.5">
            {lineItems.map((it, idx) => (
              <li key={idx} className="text-sm text-slate-700 flex justify-between gap-3">
                <span className="break-words">{it.description}</span>
                {it.amount != null && (
                  <span className="text-slate-500 whitespace-nowrap">
                    {formatAmount(it.amount, currency)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {summary && (
        <div className="mt-3 rounded-lg border border-sky-100 bg-white/70 p-2.5">
          <p className="text-[11px] font-medium text-sky-700 mb-1">
            {l ? 'Used for market comparison' : '用于市场比较'}
          </p>
          <pre className="text-[11px] text-slate-600 whitespace-pre-wrap break-words font-sans leading-relaxed">
            {summary}
          </pre>
        </div>
      )}
    </div>
  );
}
