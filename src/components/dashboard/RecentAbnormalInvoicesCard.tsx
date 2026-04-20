import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { RecentAiAuditInvoiceItem } from '../../types/dashboard';

export type InvoiceFilter = 'all' | 'high_risk' | 'this_month';

function formatMoney(value: number | null | undefined, locale: 'en' | 'zh') {
  const loc = locale === 'zh' ? 'zh-CN' : 'en-CA';
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDate(value: string | null | undefined, locale: 'en' | 'zh') {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-CA');
}

function isThisMonth(value?: string | null) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

function riskLevelLabel(level: string, en: boolean): string {
  const x = level.toLowerCase();
  if (en) {
    if (x === 'critical') return 'Critical';
    if (x === 'high') return 'High';
    if (x === 'medium') return 'Medium';
    if (x === 'low') return 'Low';
    return level || '—';
  }
  if (x === 'critical') return '严重';
  if (x === 'high') return '高';
  if (x === 'medium') return '中';
  if (x === 'low') return '低';
  return level || '—';
}

function isHighRiskAi(item: RecentAiAuditInvoiceItem): boolean {
  const x = item.risk_level.toLowerCase();
  return x === 'high' || x === 'critical';
}

function isAiScoreAbnormal(item: RecentAiAuditInvoiceItem): boolean {
  return item.risk_score > 0.6;
}

export type RecentAbnormalInvoicesCardProps = {
  items: RecentAiAuditInvoiceItem[];
  loadError?: boolean;
  filter?: InvoiceFilter;
  onFilterChange?: (filter: InvoiceFilter) => void;
  emphasize?: boolean;
};

export function RecentAbnormalInvoicesCard({
  items,
  loadError,
  filter: filterProp,
  onFilterChange,
  emphasize = false,
}: RecentAbnormalInvoicesCardProps) {
  const { language } = useLanguage();
  const en = language === 'en';
  const [internalFilter, setInternalFilter] = useState<InvoiceFilter>('all');
  const currentFilter = filterProp ?? internalFilter;

  function handleFilterChange(next: InvoiceFilter) {
    if (onFilterChange) {
      onFilterChange(next);
    } else {
      setInternalFilter(next);
    }
  }

  const filteredItems = useMemo(() => {
    let list = [...items];
    if (currentFilter === 'high_risk') {
      list = list.filter(isHighRiskAi);
    }
    if (currentFilter === 'this_month') {
      list = list.filter((item) => isThisMonth(item.invoice_date));
    }
    return list.slice(0, 3);
  }, [items, currentFilter]);

  const title = en ? 'Recent AI-flagged invoices' : '最近 AI 异常发票';
  const subtitle = en
    ? 'Hard flags (over budget / approval) or AI risk score > 0.6'
    : '硬约束（超预算/审批）或 AI 风险分数 > 0.6';
  const viewAll = en ? 'View all' : '查看全部';
  const loadErrText = en
    ? 'Could not load AI invoice list. Please try again later.'
    : '无法加载 AI 发票列表，请稍后重试。';

  const tabs: { key: InvoiceFilter; labelZh: string; labelEn: string }[] = [
    { key: 'all', labelZh: '全部', labelEn: 'All' },
    { key: 'high_risk', labelZh: '高风险', labelEn: 'High risk' },
    { key: 'this_month', labelZh: '本月新增', labelEn: 'This month' },
  ];

  const emptyAll = en ? 'No AI-flagged invoices in this fiscal year.' : '本财年暂无 AI 标记异常发票';
  const emptyHigh = en ? 'No high-risk AI items.' : '暂无高风险 AI 标记';
  const emptyMonth = en ? 'No new AI-flagged invoices this month.' : '本月暂无 AI 标记异常';
  const emptyAllSubtitle = en
    ? 'No items match the current filters for this fiscal year.'
    : '本财年在当前筛选下暂无符合条件的发票。';

  const emptyMessage =
    currentFilter === 'high_risk'
      ? emptyHigh
      : currentFilter === 'this_month'
        ? emptyMonth
        : emptyAll;

  const footerAll = en
    ? 'Review invoices with elevated AI risk scores.'
    : '建议复核 AI 风险分数较高的发票';
  const footerHigh = en
    ? 'Showing AI high / critical risk — please prioritize.'
    : '当前展示 AI 高风险/严重项，建议优先处理';
  const footerMonth = en
    ? 'Showing AI-flagged invoices from this month.'
    : '当前展示本月 AI 标记异常发票';

  const footerTip =
    currentFilter === 'high_risk'
      ? footerHigh
      : currentFilter === 'this_month'
        ? footerMonth
        : footerAll;

  const countSuffix = en ? 'items' : '条';

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-[box-shadow,ring] duration-300 ${
        emphasize ? 'ring-2 ring-amber-300/90 ring-offset-2 ring-offset-gray-50' : ''
      }`}
    >
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <div className="flex max-w-full rounded-full bg-gray-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleFilterChange(tab.key)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  currentFilter === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {en ? tab.labelEn : tab.labelZh}
              </button>
            ))}
          </div>

          {!loadError && items.length > 0 && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {filteredItems.length} {countSuffix}
            </span>
          )}

          <Link
            to="/finance?tab=invoices"
            className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {viewAll}
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      {loadError ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{loadErrText}</span>
        </div>
      ) : filteredItems.length === 0 ? (
        items.length === 0 ? (
          <div className="rounded-2xl border border-clearstrata-ui-softBorder bg-clearstrata-ui-soft px-4 py-5 text-center sm:py-6">
            <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-clearstrata-brand-600 shadow-sm">
              <CheckCircle2 className="size-5" aria-hidden />
            </div>
            <div className="text-base font-medium text-clearstrata-brand-800">{emptyAll}</div>
            <div className="mt-1 text-xs leading-relaxed text-clearstrata-brand-700 sm:text-sm">{emptyAllSubtitle}</div>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-center text-sm text-gray-600">
            {emptyMessage}
          </div>
        )
      ) : (
        <>
          <ul className="space-y-2.5">
            {filteredItems.map((item) => (
              <li key={item.invoice_id}>
                <Link
                  to={`/finance?tab=invoices&invoice=${encodeURIComponent(item.invoice_id)}`}
                  className="block rounded-xl border border-gray-200 bg-gray-50/50 p-3 transition-all hover:border-red-300 hover:bg-red-50/50 hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-semibold text-gray-900">
                        {item.vendor_name?.trim() || (en ? 'Unnamed vendor' : '未命名供应商')}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 line-clamp-2">{item.summary}</div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {riskLevelLabel(item.risk_level, en)}
                        </span>
                        {item.over_budget ? (
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
                            {en ? '🔴 Over budget' : '🔴 超预算'}
                          </span>
                        ) : null}
                        {item.bypass_approval ? (
                          <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
                            {en ? '🔴 Paid w/o approval' : '🔴 未审批执行'}
                          </span>
                        ) : null}
                        {isAiScoreAbnormal(item) ? (
                          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-950">
                            {en ? '🟡 AI anomaly' : '🟡 AI异常'}
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-row items-end justify-between gap-4 border-t border-gray-100 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                      <div className="text-xl font-bold tabular-nums text-gray-900">
                        {formatMoney(item.total_amount, language)}
                      </div>
                      <div className="text-sm tabular-nums text-gray-500">
                        {formatDate(item.invoice_date, language)}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700">{footerTip}</div>
        </>
      )}
    </div>
  );
}
