import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import {
  fetchDashboardBudgetAlerts,
  fetchDashboardBudgetSummary,
  type BudgetAlert,
} from '../../lib/budget/dashboardApi';
import {
  buildDashboardKpisFromState,
  fetchDashboardKpis,
  fetchRecentAbnormalInvoices,
} from '../../lib/dashboard';
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

  const displayKpis = useMemo((): DashboardKpi[] => {
    if (kpis.length >= 4) return kpis;
    return buildDashboardKpisFromState(fiscalYear, language, summary, alerts, abnormalInvoices);
  }, [kpis, fiscalYear, language, summary, alerts, abnormalInvoices]);

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

      const [sRes, aRes] = await Promise.all([
        fetchDashboardBudgetSummary(currentPropertyId, fiscalYear),
        fetchDashboardBudgetAlerts(currentPropertyId, fiscalYear),
      ]);
      const [abnormalOut, kpiOut] = await Promise.all([abnormalP, kpiP]);
      if (cancelled) return;
      if (sRes.error || aRes.error) {
        console.error('Budget dashboard RPC failed', {
          summary: sRes.error?.message,
          alerts: aRes.error?.message,
        });
        setLoadError(true);
      } else {
        setLoadError(false);
      }
      setSummary(sRes.data);
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

  return (
    <section className="mb-4" aria-labelledby="dashboard-page-h1">
      <div className="space-y-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white px-6 py-5 shadow-sm md:flex-row md:items-center md:justify-between">
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
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
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
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-500 shadow-sm">
            <Loader2 className="size-5 shrink-0 animate-spin text-gray-400" aria-hidden />
            <span>{loadingMsg}</span>
          </div>
        )}

        {!loading && (
          <>
            <DashboardKpiBar
              items={displayKpis}
              viewLabel={en ? 'View' : '查看'}
              onKpiClick={handleKpiClick}
            />

            {loadError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                {errorMsg}
              </div>
            )}

            {summary && summary.budget_scope === 'package' && summary.active_package_id == null && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>{t('budget_home_no_active_package')}</span>
              </div>
            )}

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="xl:col-span-4">
                {summary ? (
                  <BudgetOverviewCard summary={summary} language={language} />
                ) : (
                  <div className="flex min-h-[320px] flex-col rounded-2xl border border-dashed border-gray-200 bg-gray-50/90 p-5 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900">{t('budget_home_title')}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-gray-600">
                      {loadError
                        ? en
                          ? 'Budget summary could not be loaded. Other sections below may still update after the issue is resolved.'
                          : '预算汇总暂无法加载。问题解决后，下方区块可能会自动恢复。'
                        : en
                          ? 'No budget summary is available for this fiscal year yet.'
                          : '当前财年暂无预算汇总数据。'}
                    </p>
                  </div>
                )}
              </div>
              <div ref={alertsSectionRef} className="scroll-mt-28 xl:col-span-8">
                <BudgetAlertsCard
                  alerts={alerts}
                  en={en}
                  filter={alertFilter}
                  onFilterChange={setAlertFilter}
                  emphasize={alertsEmphasize}
                />
              </div>
            </div>

            <div ref={abnormalInvoicesSectionRef} className="scroll-mt-28">
              <RecentAbnormalInvoicesCard
                items={abnormalInvoices}
                loadError={abnormalLoadError}
                filter={invoiceFilter}
                onFilterChange={setInvoiceFilter}
                emphasize={invoiceEmphasize}
              />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
