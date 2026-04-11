import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { BudgetAlert, DashboardBudgetSummary } from '../../lib/budget/dashboardApi';

function severityRank(s: string): number {
  if (s === 'high') return 0;
  if (s === 'medium') return 1;
  if (s === 'low') return 2;
  return 3;
}

function alertTitle(a: BudgetAlert, en: boolean): string {
  return en ? a.title_en : a.title_zh || a.title_en;
}

export type RiskStatusSectionProps = {
  en: boolean;
  alerts: BudgetAlert[];
  summary: DashboardBudgetSummary | null;
  monthlyAbnormalCount: number;
};

export function RiskStatusSection({ en, alerts, summary, monthlyAbnormalCount }: RiskStatusSectionProps) {
  const overBudget = summary ? summary.remaining_budget < 0 || summary.budget_utilization > 1 : false;
  const totalAlerts = alerts.length;
  const highCount = alerts.filter((a) => a.severity === 'high').length;
  const hasRisk = totalAlerts > 0 || overBudget || monthlyAbnormalCount > 0;

  const top3 = [...alerts].sort((a, b) => severityRank(a.severity) - severityRank(b.severity)).slice(0, 3);

  const title = en ? 'Risk status' : '风险状态';
  const stableMain = en ? 'Overall budget execution is stable.' : '当前预算执行总体稳定';
  const stableSub = en
    ? 'No priority risks this month.'
    : '本月暂无需要优先处理的风险事项';
  const financeLink = en ? 'Finance' : '财务';

  const badgeNormal = en ? 'Normal' : '正常';
  const badgeWarn = en ? 'Attention' : '警告';
  const badgeHigh = en ? 'High risk' : '高风险';

  let badgeClass = 'bg-emerald-100 text-emerald-800';
  let badgeLabel = badgeNormal;
  if (hasRisk) {
    if (highCount > 0 || overBudget) {
      badgeClass = 'bg-red-100 text-red-800';
      badgeLabel = badgeHigh;
    } else {
      badgeClass = 'bg-amber-100 text-amber-900';
      badgeLabel = badgeWarn;
    }
  }

  return (
    <div
      className={`flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-gray-50/80 ${hasRisk ? 'h-full p-4' : 'p-3'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>{badgeLabel}</span>
      </div>

      {!hasRisk ? (
        <div className="mt-2 space-y-1 text-sm">
          <p className="font-medium leading-snug text-gray-900">{stableMain}</p>
          <p className="text-xs leading-relaxed text-gray-600">{stableSub}</p>
        </div>
      ) : (
        <div className="mt-3 flex min-h-0 flex-1 flex-col gap-3">
          <dl className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">{en ? 'Open risk items' : '待处理风险事项'}</dt>
              <dd className="font-semibold tabular-nums text-gray-900">{totalAlerts}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">{en ? 'High severity' : '高风险'}</dt>
              <dd className="font-semibold tabular-nums text-red-700">{highCount}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-gray-500">{en ? 'Abnormal invoices (this month)' : '本月异常发票'}</dt>
              <dd className="font-semibold tabular-nums text-amber-800">{monthlyAbnormalCount}</dd>
            </div>
          </dl>

          {top3.length > 0 && (
            <ul className="space-y-2 border-t border-gray-200/80 pt-3">
              {top3.map((a, i) => (
                <li key={`${a.type}-${a.invoice_id ?? a.quote_id ?? i}`} className="text-sm text-gray-700">
                  <span className="line-clamp-2">{alertTitle(a, en)}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-auto pt-2">
            <Link
              to="/finance"
              className="inline-flex items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              {financeLink}
              <ChevronRight className="size-4" aria-hidden />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
