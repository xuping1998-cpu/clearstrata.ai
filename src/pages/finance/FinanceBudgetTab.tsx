import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, PieChart } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { BudgetOverviewCard } from '../../components/dashboard/BudgetOverviewCard';
import { fetchDashboardBudgetSummary } from '../../lib/budget/dashboardApi';

const YEARS_BACK = 3;
const YEARS_FORWARD = 2;

function yearOptions(anchor: number): number[] {
  const out: number[] = [];
  for (let y = anchor - YEARS_BACK; y <= anchor + YEARS_FORWARD; y++) out.push(y);
  return out;
}

export function FinanceBudgetTab() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId } = useProperty();
  const [searchParams] = useSearchParams();
  const anchorYear = new Date().getFullYear();
  const yearFromUrl = Number(searchParams.get('year'));
  const initialYear =
    Number.isFinite(yearFromUrl) && yearFromUrl >= anchorYear - YEARS_BACK && yearFromUrl <= anchorYear + YEARS_FORWARD
      ? yearFromUrl
      : anchorYear;

  const [fiscalYear, setFiscalYear] = useState(initialYear);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchDashboardBudgetSummary>>['data']>(null);

  const years = useMemo(() => yearOptions(anchorYear), [anchorYear]);

  useEffect(() => {
    const y = Number(searchParams.get('year'));
    if (Number.isFinite(y) && years.includes(y)) setFiscalYear(y);
  }, [searchParams, years]);

  useEffect(() => {
    if (!currentPropertyId) {
      setSummary(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const res = await fetchDashboardBudgetSummary(currentPropertyId, fiscalYear);
      if (cancelled) return;
      setSummary(res.data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPropertyId, fiscalYear]);

  if (!currentPropertyId) {
    return (
      <p className="text-sm text-gray-500">
        {en ? 'Select a property to view budget.' : '请先选择物业以查看预算。'}
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-16 text-gray-500 shadow-sm">
        <Loader2 className="size-6 animate-spin" aria-hidden />
        <span>{en ? 'Loading budget…' : '正在加载预算…'}</span>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 shadow-sm">
        {en ? 'Budget summary is unavailable for this year.' : '暂无法加载该财年的预算摘要。'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-clearstrata-ui-primary text-white">
            <PieChart size={20} aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {en ? 'Annual budget overview' : '年度预算概览'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {en ? 'Fiscal year totals and utilization for the selected property.' : '当前物业所选财年的预算与执行概况。'}
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="whitespace-nowrap">{en ? 'Fiscal year' : '财年'}</span>
          <select
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm"
            value={fiscalYear}
            onChange={(e) => setFiscalYear(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <BudgetOverviewCard summary={summary} language={language} />

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          to="/finance?tab=invoices"
          className="font-medium text-clearstrata-brand-700 hover:text-clearstrata-brand-900 hover:underline"
        >
          {en ? 'Open invoice management' : '前往发票管理'}
        </Link>
        <span className="text-gray-300" aria-hidden>
          |
        </span>
        <Link to="/" className="font-medium text-gray-600 hover:text-gray-900 hover:underline">
          {en ? 'Home dashboard' : '返回首页仪表盘'}
        </Link>
      </div>
    </div>
  );
}
