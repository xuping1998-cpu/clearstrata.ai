import { useLanguage } from '../../contexts/LanguageContext';
import { formatCurrency, type DashboardBudgetSummary } from '../../lib/budget/dashboardApi';

type Lang = 'en' | 'zh';

export type BudgetOverviewCardProps = {
  summary: DashboardBudgetSummary;
  language: Lang;
  /** Inside home mega-card: no outer frame, tighter layout, no footer narrative (risk panel covers it). */
  embedded?: boolean;
};

export function BudgetOverviewCard({ summary, language, embedded = false }: BudgetOverviewCardProps) {
  const { t } = useLanguage();
  const en = language === 'en';
  const overBudget = summary.remaining_budget < 0 || summary.budget_utilization > 1;
  const rawUtilPct = summary.budget_utilization * 100;
  const barWidth = Math.min(100, summary.budget_utilization * 100);

  const sectionTitle = en ? 'Budget execution' : '预算执行';

  const inner = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className={`font-semibold text-gray-900 ${embedded ? 'text-base' : 'text-lg'}`}>
          {embedded ? sectionTitle : t('budget_home_title')}
        </h2>
        {!embedded && (
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
              overBudget ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {overBudget ? (en ? 'Over budget' : '超支') : en ? 'On track' : '正常'}
          </span>
        )}
      </div>
      {!embedded && <p className="mt-1 text-sm text-gray-500">{t('budget_home_subtitle')}</p>}

      <div className={`grid grid-cols-2 gap-2 ${embedded ? 'mt-3' : 'mt-4 gap-2.5'}`}>
        <div
          className={`flex flex-col justify-center rounded-xl border border-gray-100 bg-white px-3 py-2 ${embedded ? 'min-h-[3.5rem]' : 'min-h-[4rem] py-2.5'}`}
        >
          <div className="text-xs font-medium text-gray-500">{t('budget_home_total_budget')}</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums tracking-tight text-gray-900 sm:text-xl">
            {formatCurrency(summary.total_budget, language)}
          </div>
        </div>
        <div
          className={`flex flex-col justify-center rounded-xl border border-gray-100 bg-white px-3 py-2 ${embedded ? 'min-h-[3.5rem]' : 'min-h-[4rem] py-2.5'}`}
        >
          <div className="text-xs font-medium text-gray-500">{t('budget_home_committed')}</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums tracking-tight text-gray-900 sm:text-xl">
            {formatCurrency(summary.committed, language)}
          </div>
        </div>
        <div
          className={`flex flex-col justify-center rounded-xl border border-gray-100 bg-white px-3 py-2 ${embedded ? 'min-h-[3.5rem]' : 'min-h-[4rem] py-2.5'}`}
        >
          <div className="text-xs font-medium text-gray-500">{t('budget_home_actual')}</div>
          <div className="mt-0.5 text-lg font-bold tabular-nums tracking-tight text-gray-900 sm:text-xl">
            {formatCurrency(summary.actual, language)}
          </div>
        </div>
        <div
          className={`flex flex-col justify-center rounded-xl border border-gray-100 bg-white px-3 py-2 ${embedded ? 'min-h-[3.5rem]' : 'min-h-[4rem] py-2.5'}`}
        >
          <div className="text-xs font-medium text-gray-500">{t('budget_home_remaining')}</div>
          <div
            className={`mt-0.5 text-lg font-bold tabular-nums tracking-tight sm:text-xl ${
              overBudget ? 'text-red-700' : 'text-emerald-800'
            }`}
          >
            {formatCurrency(summary.remaining_budget, language)}
          </div>
        </div>
      </div>

      <div className={embedded ? 'mt-3' : 'mt-5'}>
        <div className="mb-1.5 flex items-center justify-between text-xs text-gray-500">
          <span>{t('budget_home_util_actual_pct')}</span>
          <span className="font-semibold tabular-nums text-gray-700">{rawUtilPct.toFixed(1)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-[width] ${overBudget ? 'bg-red-500' : 'bg-emerald-500'}`}
            style={{ width: `${Number.isFinite(barWidth) ? barWidth : 0}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          {t('budget_home_util_committed_pct')}{' '}
          <span className="font-medium text-gray-700">
            {(summary.committed_utilization * 100).toFixed(1)}%
          </span>
        </p>
      </div>

      {!embedded && (
        <div className="mt-5 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
          {overBudget
            ? en
              ? 'Spending has exceeded the annual budget. Please take action.'
              : '当前支出已超过年度预算，请尽快处理'
            : en
              ? 'Overall budget execution is stable.'
              : '当前预算执行总体稳定'}
        </div>
      )}
    </>
  );

  if (embedded) {
    return <div className="flex min-h-0 flex-col">{inner}</div>;
  }

  return (
    <div className="flex min-h-[320px] flex-col rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      {inner}
    </div>
  );
}
