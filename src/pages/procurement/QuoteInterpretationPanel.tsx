import { FileSearch } from 'lucide-react';
import { buildSearchQuoteContext } from '../../lib/procurement/buildQuoteContext';

interface QuoteInterpretationPanelProps {
  parsedQuoteJson: Record<string, unknown> | null | undefined;
  language: string;
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

/** Compressed search basis summary; never raw_text. */
function comparisonSummary(pq: Record<string, unknown>): string {
  const fromContext = str(pq.quote_context);
  const summary = fromContext || buildSearchQuoteContext(pq);
  return clip(summary, SUMMARY_MAX);
}

export function QuoteInterpretationPanel({
  parsedQuoteJson,
  language,
}: QuoteInterpretationPanelProps) {
  const l = language === 'en';

  if (!parsedQuoteJson || typeof parsedQuoteJson !== 'object') return null;

  const pq = parsedQuoteJson;

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
