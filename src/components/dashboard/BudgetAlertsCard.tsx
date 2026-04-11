import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import type { BudgetAlert } from '../../lib/budget/dashboardApi';

export type AlertFilter = 'all' | 'high_risk' | 'budget' | 'invoice' | 'quote';

function severityRank(s: string): number {
  if (s === 'high') return 0;
  if (s === 'medium') return 1;
  if (s === 'low') return 2;
  return 3;
}

/** 与 dashboard_budget_alerts RPC 的 type 字段对齐（如 category_over_actual、invoice_*、quote_*） */
function isBudgetAlert(type?: string) {
  if (!type) return false;
  if (type.includes('quote')) return false;
  return (
    type.includes('budget') ||
    type.includes('category_over') ||
    type.includes('category_unmatched')
  );
}

function isInvoiceAlert(type?: string) {
  return type ? type.includes('invoice') : false;
}

function isQuoteAlert(type?: string) {
  return type ? type.includes('quote') : false;
}

function alertTitle(a: BudgetAlert, en: boolean): string {
  return en ? a.title_en : a.title_zh || a.title_en;
}

function alertMessage(a: BudgetAlert, en: boolean): string {
  const m = en ? a.message_en : a.message_zh ?? a.message_en;
  return m ?? '';
}

export type BudgetAlertsCardProps = {
  alerts: BudgetAlert[];
  en: boolean;
  filter?: AlertFilter;
  onFilterChange?: (filter: AlertFilter) => void;
  /** 短暂高亮外框（例如从 KPI 联动跳转时） */
  emphasize?: boolean;
};

export function BudgetAlertsCard({
  alerts,
  en,
  filter: filterProp,
  onFilterChange,
  emphasize = false,
}: BudgetAlertsCardProps) {
  const [internalFilter, setInternalFilter] = useState<AlertFilter>('all');
  const currentFilter = filterProp ?? internalFilter;

  function handleFilterChange(next: AlertFilter) {
    if (onFilterChange) {
      onFilterChange(next);
    } else {
      setInternalFilter(next);
    }
  }

  const sortedAlerts = useMemo(
    () => [...alerts].sort((a, b) => severityRank(a.severity) - severityRank(b.severity)),
    [alerts],
  );

  const filteredAlerts = useMemo(() => {
    let list = [...sortedAlerts];
    if (currentFilter === 'high_risk') {
      list = list.filter((item) => item.severity === 'high');
    }
    if (currentFilter === 'budget') {
      list = list.filter((item) => isBudgetAlert(item.type));
    }
    if (currentFilter === 'invoice') {
      list = list.filter((item) => isInvoiceAlert(item.type));
    }
    if (currentFilter === 'quote') {
      list = list.filter((item) => isQuoteAlert(item.type));
    }
    return list;
  }, [sortedAlerts, currentFilter]);

  const displayedAlerts = useMemo(() => filteredAlerts.slice(0, 5), [filteredAlerts]);

  const highCount = sortedAlerts.filter((a) => a.severity === 'high').length;
  const mediumCount = sortedAlerts.filter((a) => a.severity === 'medium').length;
  const lowCount = sortedAlerts.filter((a) => a.severity === 'low').length;

  const cardTitle = en ? 'Risk alerts' : '异常提醒';
  const cardSubtitle = en ? 'Budget, invoice, and quote anomalies' : '预算、发票与报价异常';
  const viewAll = en ? 'View all risks' : '查看全部风险';
  const viewDetail = en ? 'View details' : '查看详情';

  const tabs: { key: AlertFilter; labelZh: string; labelEn: string }[] = [
    { key: 'all', labelZh: '全部', labelEn: 'All' },
    { key: 'high_risk', labelZh: '高风险', labelEn: 'High' },
    { key: 'budget', labelZh: '预算', labelEn: 'Budget' },
    { key: 'invoice', labelZh: '发票', labelEn: 'Invoice' },
    { key: 'quote', labelZh: '报价', labelEn: 'Quote' },
  ];

  const emptyAll = en ? 'No alerts for this fiscal year.' : '当前没有异常提醒';
  const emptyHigh = en ? 'No high-severity alerts.' : '当前没有高风险提醒';
  const emptyBudget = en ? 'No budget-related alerts.' : '当前没有预算类提醒';
  const emptyInvoice = en ? 'No invoice-related alerts.' : '当前没有发票类提醒';
  const emptyQuote = en ? 'No quote-related alerts.' : '当前没有报价类提醒';

  const emptyMessage =
    currentFilter === 'high_risk'
      ? emptyHigh
      : currentFilter === 'budget'
        ? emptyBudget
        : currentFilter === 'invoice'
          ? emptyInvoice
          : currentFilter === 'quote'
            ? emptyQuote
            : emptyAll;

  const countSuffix = en ? 'items' : '条';

  return (
    <div
      className={`flex min-h-[320px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-[box-shadow,ring] duration-300 ${
        emphasize ? 'ring-2 ring-amber-300/90 ring-offset-2 ring-offset-gray-50' : ''
      }`}
    >
      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-start gap-2">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
              <AlertTriangle size={18} aria-hidden />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{cardTitle}</h2>
              <p className="mt-1 text-sm text-gray-500">{cardSubtitle}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs md:justify-end">
            <span className="rounded-full bg-red-100 px-2.5 py-1 font-medium text-red-700">
              {en ? 'High' : '高风险'} {highCount}
            </span>
            <span className="rounded-full bg-yellow-100 px-2.5 py-1 font-medium text-yellow-800">
              {en ? 'Medium' : '中风险'} {mediumCount}
            </span>
            <span className="rounded-full bg-blue-100 px-2.5 py-1 font-medium text-blue-800">
              {en ? 'Low' : '低风险'} {lowCount}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-full flex-wrap rounded-full bg-gray-100 p-1 w-fit">
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

          {alerts.length > 0 && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {filteredAlerts.length} {countSuffix}
            </span>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {filteredAlerts.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-6 text-center text-sm text-emerald-800">
            {emptyMessage}
          </div>
        ) : (
          <ul className="space-y-2.5">
            {displayedAlerts.map((a, i) => (
              <li key={`${a.type}-${a.quote_id ?? a.invoice_id ?? a.code ?? i}`}>
                <Link
                  to={a.link_hint ?? '/finance'}
                  className="block rounded-xl border border-gray-100 bg-gray-50/90 p-3 transition-all hover:border-amber-200/80 hover:bg-amber-50/40 hover:shadow-md"
                >
                  <p className="text-base font-semibold leading-snug text-gray-900">{alertTitle(a, en)}</p>
                  {alertMessage(a, en) && (
                    <p className="mt-1.5 text-sm leading-relaxed text-gray-600">{alertMessage(a, en)}</p>
                  )}
                  <div className="mt-3 flex justify-end border-t border-gray-100/80 pt-2">
                    <span className="inline-flex items-center gap-0.5 text-sm font-medium text-blue-600">
                      {viewDetail}
                      <ChevronRight className="size-4" aria-hidden />
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {sortedAlerts.length > 0 && (
          <div className="mt-4 flex justify-end border-t border-gray-100 pt-4">
            <Link
              to="/finance?tab=invoices"
              className="text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {viewAll}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
