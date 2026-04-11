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
import { BudgetOverviewCard } from './BudgetOverviewCard';
import { DashboardKpiBar } from './DashboardKpiBar';
import { RiskStatusSection } from './RiskStatusSection';

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
  const [kpis, setKpis] = useState<DashboardKpi[]>([]);
  const riskStatusRef = useRef<HTMLDivElement | null>(null);

  const years = useMemo(() => yearOptions(anchorYear), [anchorYear]);

  const displayKpis = useMemo((): DashboardKpi[] => {
    if (kpis.length >= 4) return kpis;
    return buildDashboardKpisFromState(fiscalYear, language, summary, alerts, abnormalInvoices);
  }, [kpis, fiscalYear, language, summary, alerts, abnormalInvoices]);

  const monthlyAbnormalDisplay = useMemo(() => {
    const k = displayKpis.find((x) => x.key === 'monthly_abnormal_invoices');
    const v = k?.value;
    return typeof v === 'number' ? v : Number(v) || 0;
  }, [displayKpis]);

  const headerTitle = en ? 'Finance & risk overview' : '财务与风险概览';
  const headerSubtitle = en
    ? 'Live budget performance and open risk items'
    : '实时查看预算执行情况与待处理风险事项';
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
      setKpis([]);
      setLoadError(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(false);

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
      setKpis(kpiOut.items);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPropertyId, fiscalYear, language]);

  function handleKpiClick(key: DashboardKpi['key']) {
    if (key === 'high_risk_alerts' || key === 'monthly_abnormal_invoices') {
      requestAnimationFrame(() => {
        riskStatusRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      });
    }
  }

  if (!currentPropertyId) return null;

  return (
    <section className="mb-4" aria-labelledby="dashboard-page-h1">
      <div className="mx-auto w-full max-w-6xl space-y-5">
        {loading && (
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-5 py-4 text-sm text-gray-500 shadow-sm">
            <Loader2 className="size-5 shrink-0 animate-spin text-gray-400" aria-hidden />
            <span>{loadingMsg}</span>
          </div>
        )}

        {!loading && (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
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

            {loadError && (
              <div className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 shadow-sm">
                {errorMsg}
              </div>
            )}

            {summary && summary.budget_scope === 'package' && summary.active_package_id == null && (
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>{t('budget_home_no_active_package')}</span>
              </div>
            )}

            <div className="mt-6">
              <DashboardKpiBar
                compact
                items={displayKpis}
                viewLabel={en ? 'View' : '查看'}
                onKpiClick={handleKpiClick}
              />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-12">
              <div className="xl:col-span-8">
                {summary ? (
                  <BudgetOverviewCard summary={summary} language={language} embedded />
                ) : (
                  <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/90 p-4">
                    <h2 className="text-base font-semibold text-gray-900">{t('budget_home_title')}</h2>
                    <p className="mt-2 text-sm leading-relaxed text-gray-600">
                      {loadError
                        ? en
                          ? 'Budget summary could not be loaded.'
                          : '预算汇总暂无法加载。'
                        : en
                          ? 'No budget summary is available for this fiscal year yet.'
                          : '当前财年暂无预算汇总数据。'}
                    </p>
                  </div>
                )}
              </div>
              <div ref={riskStatusRef} className="scroll-mt-24 xl:col-span-4">
                <RiskStatusSection
                  en={en}
                  alerts={alerts}
                  summary={summary}
                  monthlyAbnormalCount={monthlyAbnormalDisplay}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default HomeBudgetPanel;
