import { FileSearch, AlertTriangle, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
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

/** Human label for which figure the page/package total was resolved from (Phase 2A.10). */
function resolveTotalSourceLabel(pq: Record<string, unknown>, en: boolean): string {
  if (str(pq.total_mode) === 'sum_invoices') {
    const count = num(pq.package_parts_count);
    return en
      ? `Sum of ${count ?? ''} invoices (Balance Due)`.replace('  ', ' ')
      : `${count ?? ''} 张发票合计（按 Balance Due）`.trim();
  }
  const source = str(pq.total_source);
  const labels: Record<string, { en: string; zh: string }> = {
    balance_due: { en: 'Balance Due', zh: 'Balance Due（应付余额）' },
    amount_due: { en: 'Amount Due', zh: 'Amount Due（应付金额）' },
    total_due: { en: 'Total Due', zh: 'Total Due（应付总额）' },
    grand_total: { en: 'Grand Total', zh: 'Grand Total（总计）' },
    invoice_total: { en: 'Invoice Total', zh: 'Invoice Total（发票总额）' },
    total: { en: 'Total', zh: 'Total（合计）' },
    subtotal_plus_tax: { en: 'Subtotal + tax', zh: '小计 + 税额' },
    line_items_sum: { en: 'Sum of line items', zh: '明细金额合计' },
  };
  const hit = labels[source];
  if (!hit) return '';
  return en ? hit.en : hit.zh;
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

      {reconciliation.reconciled && reconciliation.invoicePackageTotal != null && (
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

      {lineItems.length > 0 && (
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
