import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Loader2, PieChart } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import {
  fetchDashboardBudgetAlerts,
  fetchDashboardBudgetCategories,
  fetchDashboardBudgetSummary,
  formatCurrency,
  type BudgetAlert,
  type DashboardBudgetCategoryRow,
} from '../../lib/budget/dashboardApi';

const YEARS_BACK = 3;
const YEARS_FORWARD = 2;

function yearOptions(anchor: number): number[] {
  const out: number[] = [];
  for (let y = anchor - YEARS_BACK; y <= anchor + YEARS_FORWARD; y++) out.push(y);
  return out;
}

function alertTitle(a: BudgetAlert, en: boolean): string {
  return en ? a.title_en : a.title_zh || a.title_en;
}

function alertMessage(a: BudgetAlert, en: boolean): string {
  const m = en ? a.message_en : a.message_zh ?? a.message_en;
  return m ?? '';
}

export function BudgetDashboardSection() {
  const { t, language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId } = useProperty();
  const anchorYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(anchorYear);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchDashboardBudgetSummary>>['data']>(null);
  const [categories, setCategories] = useState<DashboardBudgetCategoryRow[]>([]);
  const [alerts, setAlerts] = useState<BudgetAlert[]>([]);

  const years = useMemo(() => yearOptions(anchorYear), [anchorYear]);

  useEffect(() => {
    if (!currentPropertyId) {
      setLoading(false);
      setSummary(null);
      setCategories([]);
      setAlerts([]);
      setLoadError(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(false);
      const [sRes, cRes, aRes] = await Promise.all([
        fetchDashboardBudgetSummary(currentPropertyId, fiscalYear),
        fetchDashboardBudgetCategories(currentPropertyId, fiscalYear),
        fetchDashboardBudgetAlerts(currentPropertyId, fiscalYear),
      ]);
      if (cancelled) return;
      if (sRes.error || cRes.error || aRes.error) {
        console.error('Budget dashboard RPC failed', {
          summary: sRes.error?.message,
          categories: cRes.error?.message,
          alerts: aRes.error?.message,
        });
        setLoadError(true);
      } else {
        setLoadError(false);
      }
      setSummary(sRes.data);
      setCategories(cRes.data?.categories ?? []);
      setAlerts(aRes.data?.alerts ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPropertyId, fiscalYear]);

  if (!currentPropertyId) return null;

  const topCategories = [...categories]
    .sort((a, b) => b.actual - a.actual || b.committed - a.committed)
    .slice(0, 6);

  return (
    <section
      className="mb-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="dashboard-page-h1"
    >
      <h1 id="dashboard-page-h1" className="mb-3 text-2xl font-bold text-gray-900">
        {t('dashboard_page_h1')}
      </h1>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <PieChart size={20} aria-hidden />
          </div>
          <div>
            <h2 id="budget-dashboard-heading" className="text-base font-semibold text-slate-900">
              {t('budget_home_title')}
            </h2>
            <p className="text-xs text-slate-500">{t('budget_home_subtitle')}</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="whitespace-nowrap">{t('budget_home_fiscal_year')}</span>
          <select
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm font-medium text-slate-800 shadow-sm"
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

      {loading && (
        <div className="flex items-center gap-2 py-8 text-slate-500">
          <Loader2 className="animate-spin" size={20} aria-hidden />
          <span>{t('loading')}</span>
        </div>
      )}

      {!loading && loadError && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {t('budget_home_load_error_retry')}
        </div>
      )}

      {!loading && !loadError && summary && (
        <>
          {summary.budget_scope === 'package' && summary.active_package_id == null && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} aria-hidden />
              <span>{t('budget_home_no_active_package')}</span>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-xs font-medium text-slate-500">{t('budget_home_total_budget')}</div>
              <div className="text-lg font-semibold tabular-nums text-slate-900">
                {formatCurrency(summary.total_budget, language)}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-xs font-medium text-slate-500">{t('budget_home_committed')}</div>
              <div className="text-lg font-semibold tabular-nums text-slate-900">
                {formatCurrency(summary.committed, language)}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-xs font-medium text-slate-500">{t('budget_home_actual')}</div>
              <div className="text-lg font-semibold tabular-nums text-slate-900">
                {formatCurrency(summary.actual, language)}
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <div className="text-xs font-medium text-slate-500">{t('budget_home_remaining')}</div>
              <div className="text-lg font-semibold tabular-nums text-emerald-800">
                {formatCurrency(summary.remaining_budget, language)}
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-slate-500">
            {t('budget_home_utilization')}:{' '}
            <span className="font-medium text-slate-700">
              {t('budget_home_util_actual_pct')} {(summary.budget_utilization * 100).toFixed(1)}% ·{' '}
              {t('budget_home_util_committed_pct')} {(summary.committed_utilization * 100).toFixed(1)}%
            </span>
          </div>

          {topCategories.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 text-sm font-semibold text-slate-800">{t('budget_home_categories')}</h3>
              <div className="overflow-x-auto rounded-lg border border-slate-100">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2">{t('budget_home_col_category')}</th>
                      <th className="px-3 py-2 text-right">{t('budget_home_col_budget')}</th>
                      <th className="px-3 py-2 text-right">{t('budget_home_col_committed')}</th>
                      <th className="px-3 py-2 text-right">{t('budget_home_col_actual')}</th>
                      <th className="px-3 py-2 text-center">{t('budget_home_col_status')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {topCategories.map((row) => (
                      <tr key={row.category_id} className={row.over_budget ? 'bg-red-50/60' : ''}>
                        <td className="px-3 py-2 font-medium text-slate-900">
                          {en ? row.name_en : row.name_zh || row.name_en}
                          <span className="ml-1 text-xs font-normal text-slate-400">({row.code})</span>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                          {formatCurrency(row.budget, language)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                          {formatCurrency(row.committed, language)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-700">
                          {formatCurrency(row.actual, language)}
                        </td>
                        <td className="px-3 py-2 text-center text-xs">
                          {row.over_budget ? (
                            <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800">
                              {t('budget_home_status_over')}
                            </span>
                          ) : (
                            <span className="text-slate-500">{t('budget_home_status_ok')}</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {alerts.length > 0 && (
            <div className="mt-5">
              <h3 className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-800">
                <AlertTriangle size={16} className="text-amber-600" aria-hidden />
                {t('budget_home_alerts')}
              </h3>
              <ul className="space-y-2">
                {alerts.slice(0, 8).map((a, i) => (
                  <li key={`${a.type}-${a.quote_id ?? a.invoice_id ?? a.code ?? i}`}>
                    <Link
                      to={a.link_hint ?? '/finance'}
                      className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm text-slate-800 transition-colors hover:bg-slate-100"
                    >
                      <span>
                        <span className="font-medium">{alertTitle(a, en)}</span>
                        {alertMessage(a, en) && (
                          <span className="mt-0.5 block text-xs text-slate-600">{alertMessage(a, en)}</span>
                        )}
                      </span>
                      <ChevronRight className="mt-0.5 shrink-0 text-slate-400" size={18} aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  );
}
