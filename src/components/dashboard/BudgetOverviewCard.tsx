import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency, type DashboardBudgetSummary } from '../../lib/budget/dashboardApi';

type Lang = 'en' | 'zh';

export type BudgetOverviewCardProps = {
  summary: DashboardBudgetSummary;
  language: Lang;
};

export function BudgetOverviewCard({ summary, language }: BudgetOverviewCardProps) {
  const { t } = useLanguage();
  const en = language === 'en';
  const overBudget = summary.remaining_budget < 0 || summary.budget_utilization > 1;
  const rawUtilPct = summary.budget_utilization * 100;
  const barWidth = Math.min(100, summary.budget_utilization * 100);

  const footerStable = en
    ? 'Overall budget execution is stable.'
    : '当前预算执行总体稳定';
  const footerOver = en
    ? 'Spending has exceeded the annual budget. Please take action.'
    : '当前支出已超过年度预算，请尽快处理';

  return (
    <div className="flex min-h-[360px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-gray-900">{t('budget_home_title')}</h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            overBudget ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
          }`}
        >
          {overBudget ? (en ? 'Over budget' : '超支') : en ? 'On track' : '正常'}
        </span>
      </div>
      <p className="mt-1 text-sm text-gray-500">{t('budget_home_subtitle')}</p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="flex min-h-[4.5rem] flex-col justify-center rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
          <div className="text-xs font-medium text-gray-500">{t('budget_home_total_budget')}</div>
          <div className="mt-1 text-base font-bold tabular-nums tracking-tight text-gray-900 sm:text-lg">
            {formatCurrency(summary.total_budget, language)}
          </div>
        </div>
        <div className="flex min-h-[4.5rem] flex-col justify-center rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
          <div className="text-xs font-medium text-gray-500">{t('budget_home_committed')}</div>
          <div className="mt-1 text-base font-bold tabular-nums tracking-tight text-gray-900 sm:text-lg">
            {formatCurrency(summary.committed, language)}
          </div>
        </div>
        <div className="flex min-h-[4.5rem] flex-col justify-center rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
          <div className="text-xs font-medium text-gray-500">{t('budget_home_actual')}</div>
          <div className="mt-1 text-base font-bold tabular-nums tracking-tight text-gray-900 sm:text-lg">
            {formatCurrency(summary.actual, language)}
          </div>
        </div>
        <div className="flex min-h-[4.5rem] flex-col justify-center rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
          <div className="text-xs font-medium text-gray-500">{t('budget_home_remaining')}</div>
          <div
            className={`mt-1 text-base font-bold tabular-nums tracking-tight sm:text-lg ${
              overBudget ? 'text-red-700' : 'text-emerald-800'
            }`}
          >
            {formatCurrency(summary.remaining_budget, language)}
          </div>
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
          <span>{t('budget_home_util_actual_pct')}</span>
          <span className="font-semibold tabular-nums text-gray-700">{rawUtilPct.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-[width] ${overBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${Number.isFinite(barWidth) ? barWidth : 0}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-500">
          {t('budget_home_util_committed_pct')}{' '}
          <span className="font-medium text-gray-700">
            {(summary.committed_utilization * 100).toFixed(1)}%
          </span>
        </p>
      </div>

      <div className="mt-auto pt-6">
        <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">{overBudget ? footerOver : footerStable}</div>
      </div>
    </div>
  );
}
