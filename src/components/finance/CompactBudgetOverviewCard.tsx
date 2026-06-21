import { useState } from 'react';
import { ChevronDown, ChevronUp, PieChart } from 'lucide-react';
import { formatCurrency, type DashboardBudgetSummary } from '../../lib/budget/dashboardApi';
import { BudgetOverviewCard } from '../dashboard/BudgetOverviewCard';

type Lang = 'en' | 'zh';

export type CompactBudgetOverviewCardProps = {
  summary: DashboardBudgetSummary;
  language: Lang;
};

/**
 * One-line summary strip for the AGM budget tab. Collapsed by default; the
 * "Expand" toggle reveals the original detailed `BudgetOverviewCard` (embedded).
 * No data sourcing or business logic — purely a presentational wrapper.
 */
export function CompactBudgetOverviewCard({ summary, language }: CompactBudgetOverviewCardProps) {
  const en = language === 'en';
  const [expanded, setExpanded] = useState(false);
  const overBudget = summary.remaining_budget < 0 || summary.budget_utilization > 1;

  const metrics: { label: string; value: number; className: string }[] = [
    {
      label: en ? 'Revenue total' : '收入合计',
      value: summary.revenue_total ?? 0,
      className: 'text-emerald-700',
    },
    {
      label: en ? 'Expense total' : '支出合计',
      value: summary.expense_total ?? 0,
      className: 'text-rose-800',
    },
    {
      label: en ? 'Committed (selected quotes)' : '已承诺（选中报价）',
      value: summary.committed,
      className: 'text-gray-900',
    },
    {
      label: en ? 'Actual (approved)' : '实际（已批准）',
      value: summary.actual,
      className: 'text-gray-900',
    },
    {
      label: en ? 'Remaining (budget − actual)' : '结余（预算-实际）',
      value: summary.remaining_budget,
      className: overBudget ? 'text-rose-700' : 'text-emerald-700',
    },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-clearstrata-brand-100 text-clearstrata-brand-800">
            <PieChart size={18} aria-hidden />
          </span>
          <span className="text-sm font-semibold text-gray-900">{en ? 'Budget overview' : '预算概览'}</span>
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              overBudget ? 'bg-red-100 text-red-800' : 'bg-clearstrata-brand-100 text-clearstrata-brand-800'
            }`}
          >
            {overBudget ? (en ? 'Over budget' : '超支') : en ? 'Within budget' : '预算内'}
          </span>
        </div>

        <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-2 lg:flex-nowrap lg:justify-end">
          {metrics.map((m, i) => (
            <div
              key={m.label}
              className={`min-w-0 ${i > 0 ? 'lg:border-l lg:border-gray-200 lg:pl-4' : ''}`}
            >
              <div className="text-[11px] font-medium text-gray-500">{m.label}</div>
              <div className={`text-sm font-bold tabular-nums tracking-tight sm:text-base ${m.className}`}>
                {formatCurrency(m.value, language)}
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 lg:ml-2 lg:border-l lg:border-gray-200"
          >
            {expanded ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
            {expanded ? (en ? 'Collapse' : '收起') : en ? 'Expand' : '展开'}
          </button>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <BudgetOverviewCard summary={summary} language={language} embedded />
        </div>
      ) : null}
    </section>
  );
}
