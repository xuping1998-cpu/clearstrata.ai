import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
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
import { fetchDashboardKpis, fetchRecentAbnormalInvoices } from '../../lib/dashboard';
import type { AbnormalInvoiceItem, DashboardKpi } from '../../types/dashboard';
import { BudgetAlertsCard, type AlertFilter } from './BudgetAlertsCard';
import { BudgetOverviewCard } from './BudgetOverviewCard';
import { DashboardKpiBar } from './DashboardKpiBar';
import { RecentAbnormalInvoicesCard, type InvoiceFilter } from './RecentAbnormalInvoicesCard';

const YEARS_BACK = 3;
const YEARS_FORWARD = 2;

function yearOptions(anchor: number): number[] {
  const out: number[] = [];
  for (let y = anchor - YEARS_BACK; y <= anchor + YEARS_FORWARD; y++) out.push(y);
  return out;
}

export function HomeBudgetPanel() {
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
  const [abnormalInvoices, setAbnormalInvoices] = useState<AbnormalInvoiceItem[]>([]);
  const [abnormalLoadError, setAbnormalLoadError] = useState(false);
  const [kpis, setKpis] = useState<DashboardKpi[]>([]);
  const [alertFilter, setAlertFilter] = useState<AlertFilter>('all');
  const [alertsEmphasize, setAlertsEmphasize] = useState(false);
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>('all');
  const [invoiceEmphasize, setInvoiceEmphasize] = useState(false);
  const alertsSectionRef = useRef<HTMLDivElement | null>(null);
  const abnormalInvoicesSectionRef = useRef<HTMLDivElement | null>(null);

  const years = useMemo(() => yearOptions(anchorYear), [anchorYear]);

  const headerTitle = en ? 'Finance & risk overview' : '财务与风险概览';
  const headerSubtitle = en
    ? 'Live budget performance, risk alerts, and invoices to action'
    : '实时查看预算执行情况、异常提醒与待处理发票';
  const yearLabel = en ? 'Fiscal year' : '财年';
  const loadingMsg = en ? 'Loading dashboard budget data…' : '正在加载首页预算数据…';
  const errorMsg = en
    ? 'Could not load dashboard budget data. Please try again later.'
    : '无法加载首页预算数据，请稍后重试';

  useEffect(() => {
    if (!currentPropertyId) {
      setLoading(false);
      setSummary(null);
      setCategories([]);
      setAlerts([]);
      setAbnormalInvoices([]);
      setAbnormalLoadError(false);
      setKpis([]);
      setLoadError(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(false);
      setAbnormalLoadError(false);

      const abnormalP = (async () => {
        try {
          const r = await fetchRecentAbnormalInvoices(currentPropertyId, fiscalYear);
          return { ok: true as const, items: r.items };
        } catch (e) {
          console.error('Failed to load abnormal invoices', e);
          return { ok: false as const, items: [] as AbnormalInvoiceItem[] };
        }
      })();

      const kpiP = fetchDashboardKpis(currentPropertyId, fiscalYear, language).catch((e) => {
        console.error('fetchDashboardKpis failed', e);
        return { items: [] as DashboardKpi[] };
      });

      const [sRes, cRes, aRes] = await Promise.all([
        fetchDashboardBudgetSummary(currentPropertyId, fiscalYear),
        fetchDashboardBudgetCategories(currentPropertyId, fiscalYear),
        fetchDashboardBudgetAlerts(currentPropertyId, fiscalYear),
      ]);
      const [abnormalOut, kpiOut] = await Promise.all([abnormalP, kpiP]);
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
      setAbnormalInvoices(abnormalOut.items);
      setAbnormalLoadError(!abnormalOut.ok);
      setKpis(kpiOut.items);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPropertyId, fiscalYear, language]);

  useEffect(() => {
    setAlertFilter('all');
    setInvoiceFilter('all');
  }, [fiscalYear, currentPropertyId]);

  function handleKpiClick(key: DashboardKpi['key']) {
    if (key === 'high_risk_alerts') {
      setAlertFilter('high_risk');
      setAlertsEmphasize(true);
      window.setTimeout(() => setAlertsEmphasize(false), 1200);
      requestAnimationFrame(() => {
        alertsSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
      return;
    }

    if (key === 'monthly_abnormal_invoices') {
      setInvoiceFilter('this_month');
      setInvoiceEmphasize(true);
      window.setTimeout(() => setInvoiceEmphasize(false), 1200);
      requestAnimationFrame(() => {
        abnormalInvoicesSectionRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      });
    }
  }

  if (!currentPropertyId) return null;

  const topCategories = [...categories]
    .sort((a, b) => b.actual - a.actual || b.committed - a.committed)
    .slice(0, 6);

  return (
    <section className="mb-4" aria-labelledby="dashboard-page-h1">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h1 id="dashboard-page-h1" className="text-2xl font-bold text-gray-900">
              {headerTitle}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{headerSubtitle}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{yearLabel}</span>
            <select
              value={fiscalYear}
              onChange={(e) => setFiscalYear(Number(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-900 shadow-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && (
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-500 shadow-sm">
            <Loader2 className="size-5 shrink-0 animate-spin text-gray-400" aria-hidden />
            <span>{loadingMsg}</span>
          </div>
        )}

        {!loading && loadError && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700 shadow-sm">
            {errorMsg}
          </div>
        )}

        {!loading && !loadError && summary && (
          <>
            {summary.budget_scope === 'package' && summary.active_package_id == null && (
              <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>{t('budget_home_no_active_package')}</span>
              </div>
            )}

            {kpis.length > 0 && (
              <DashboardKpiBar
                items={kpis}
                viewLabel={en ? 'View' : '查看'}
                onKpiClick={handleKpiClick}
              />
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="xl:col-span-4">
                <BudgetOverviewCard summary={summary} language={language} />
              </div>
              <div
                ref={alertsSectionRef}
                className="scroll-mt-28 xl:col-span-8"
              >
                <BudgetAlertsCard
                  alerts={alerts}
                  en={en}
                  filter={alertFilter}
                  onFilterChange={setAlertFilter}
                  emphasize={alertsEmphasize}
                />
              </div>
            </div>

            {topCategories.length > 0 && (
              <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                <h3 className="text-lg font-semibold text-gray-900">{t('budget_home_categories')}</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {en ? 'Top spending categories for the selected fiscal year' : '所选财年支出占比较高的预算科目'}
                </p>
                <div className="mt-4 overflow-x-auto rounded-xl border border-gray-100">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-3 py-2">{t('budget_home_col_category')}</th>
                        <th className="px-3 py-2 text-right">{t('budget_home_col_budget')}</th>
                        <th className="px-3 py-2 text-right">{t('budget_home_col_committed')}</th>
                        <th className="px-3 py-2 text-right">{t('budget_home_col_actual')}</th>
                        <th className="px-3 py-2 text-center">{t('budget_home_col_status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {topCategories.map((row) => (
                        <tr key={row.category_id} className={row.over_budget ? 'bg-red-50/60' : ''}>
                          <td className="px-3 py-2 font-medium text-gray-900">
                            {en ? row.name_en : row.name_zh || row.name_en}
                            <span className="ml-1 text-xs font-normal text-gray-400">({row.code})</span>
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                            {formatCurrency(row.budget, language)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                            {formatCurrency(row.committed, language)}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                            {formatCurrency(row.actual, language)}
                          </td>
                          <td className="px-3 py-2 text-center text-xs">
                            {row.over_budget ? (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800">
                                {t('budget_home_status_over')}
                              </span>
                            ) : (
                              <span className="text-gray-500">{t('budget_home_status_ok')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {!loading && (
          <div ref={abnormalInvoicesSectionRef} className="grid grid-cols-1 scroll-mt-28">
            <RecentAbnormalInvoicesCard
              items={abnormalInvoices}
              loadError={abnormalLoadError}
              filter={invoiceFilter}
              onFilterChange={setInvoiceFilter}
              emphasize={invoiceEmphasize}
            />
          </div>
        )}
      </div>
    </section>
  );
}
