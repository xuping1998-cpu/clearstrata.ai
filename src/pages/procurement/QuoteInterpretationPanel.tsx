import { FileSearch } from 'lucide-react';
import { buildQuoteContext } from '../../lib/procurement/buildQuoteContext';

interface QuoteInterpretationPanelProps {
  parsedQuoteJson: Record<string, unknown> | null | undefined;
  language: string;
}

type LineItem = { description: string; amount: number | null };

function str(v: unknown): string {
  if (v == null) return '';
  return String(v).trim();
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = parseFloat(v.replace(/[^\d.-]/g, ''));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function formatAmount(amount: number | null, currency: string): string {
  if (amount == null) return '';
  const cur = currency || 'CAD';
  return `${cur} $${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function readLineItems(raw: unknown): LineItem[] {
  if (!Array.isArray(raw)) return [];
  const out: LineItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const row = item as Record<string, unknown>;
    const description = str(row.description);
    if (!description) continue;
    out.push({ description, amount: num(row.amount) });
  }
  return out;
}

/** quote_context summary used for downstream market comparison, with raw_text tail stripped. */
function comparisonSummary(pq: Record<string, unknown>): string {
  const ctx = buildQuoteContext(pq);
  if (!ctx) return '';
  const idx = ctx.indexOf('raw_text (truncated):');
  const head = (idx >= 0 ? ctx.slice(0, idx) : ctx).trim();
  return head;
}

export function QuoteInterpretationPanel({
  parsedQuoteJson,
  language,
}: QuoteInterpretationPanelProps) {
  const l = language === 'en';

  if (!parsedQuoteJson || typeof parsedQuoteJson !== 'object') return null;

  const pq = parsedQuoteJson;

  const vendor = str(pq.vendor_name);
  const category = str(pq.category);
  const scope = str(pq.service_scope) || str(pq.analysis_description) || str(pq.description);
  const currency = str(pq.currency) || 'CAD';
  const totalAmount = num(pq.total_amount);
  const amountDisplay = totalAmount != null ? formatAmount(totalAmount, currency) : str(pq.currentPrice);
  const pricingBasis = str(pq.billing_period) || str(pq.pricing_basis);
  const lineItems = readLineItems(pq.line_items);
  const summary = comparisonSummary(pq);

  const hasContent =
    Boolean(vendor || category || scope || amountDisplay || pricingBasis || lineItems.length > 0);

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

  const rows: { label: string; value: string; wide?: boolean }[] = [];
  if (vendor) rows.push({ label: l ? 'Current vendor' : '当前供应商', value: vendor });
  if (category) rows.push({ label: l ? 'Service category' : '服务类别', value: category });
  if (amountDisplay) rows.push({ label: l ? 'Quoted amount' : '报价金额', value: amountDisplay });
  if (pricingBasis) rows.push({ label: l ? 'Pricing basis' : '计费方式', value: pricingBasis });
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
