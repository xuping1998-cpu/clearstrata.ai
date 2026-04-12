import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { fetchDashboardBudgetSummary } from '../../lib/budget/dashboardApi';
import {
  buildDashboardKpisFromState,
  fetchDashboardKpis,
  fetchRecentAiAuditInvoices,
} from '../../lib/dashboard';
import { supabase } from '../../lib/supabase';
import type { DashboardAiRiskSummary, DashboardKpi, RecentAiAuditInvoiceItem } from '../../types/dashboard';
import { BudgetOverviewCard } from './BudgetOverviewCard';
import { DashboardKpiBar } from './DashboardKpiBar';
import { RecentAbnormalInvoicesCard } from './RecentAbnormalInvoicesCard';
import { RiskStatusSection } from './RiskStatusSection';
import { generateAuditReportForInvoice, getFirstHighRiskInvoiceId } from '../../lib/reportGenerator';
import { fetchVendorRiskHomeSummary, type VendorRiskHomeSummary } from '../../lib/vendorRiskAudit';

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
  const navigate = useNavigate();
  const { currentPropertyId } = useProperty();
  const anchorYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(anchorYear);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof fetchDashboardBudgetSummary>>['data']>(null);
  const [kpis, setKpis] = useState<DashboardKpi[]>([]);
  const [aiRiskData, setAiRiskData] = useState<DashboardAiRiskSummary | null>(null);
  const [aiRiskPending, setAiRiskPending] = useState(true);
  const [aiRiskFailed, setAiRiskFailed] = useState(false);
  const [recentAiItems, setRecentAiItems] = useState<RecentAiAuditInvoiceItem[]>([]);
  const [recentAiError, setRecentAiError] = useState(false);
  const [meetingReportBusy, setMeetingReportBusy] = useState(false);
  const [vendorRiskSummary, setVendorRiskSummary] = useState<VendorRiskHomeSummary | null>(null);
  const [vendorRiskPending, setVendorRiskPending] = useState(true);
  const riskStatusRef = useRef<HTMLDivElement | null>(null);

  const years = useMemo(() => yearOptions(anchorYear), [anchorYear]);

  const displayKpis = useMemo((): DashboardKpi[] => {
    if (kpis.length >= 6) return kpis;
    return buildDashboardKpisFromState(fiscalYear, language, summary);
  }, [kpis, fiscalYear, language, summary]);

  const headerTitle = en ? 'Finance & risk overview' : '财务与风险概览';
  const yearLabel = en ? 'Fiscal year' : '财年';
  const loadingMsg = en ? 'Loading dashboard budget data…' : '正在加载首页预算数据…';
  const errorMsg = en
    ? 'Could not load dashboard budget data. Please try again later.'
    : '无法加载首页预算数据，请稍后重试';

  useEffect(() => {
    if (!currentPropertyId) {
      setLoading(false);
      setSummary(null);
      setKpis([]);
      setLoadError(false);
      setAiRiskData(null);
      setAiRiskPending(false);
      setAiRiskFailed(false);
      setRecentAiItems([]);
      setRecentAiError(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setLoadError(false);
      setAiRiskPending(true);
      setAiRiskFailed(false);
      setRecentAiError(false);

      const kpiP = fetchDashboardKpis(currentPropertyId, fiscalYear, language).catch((e) => {
        console.error('fetchDashboardKpis failed', e);
        return { items: [] as DashboardKpi[], aiRisk: null as DashboardAiRiskSummary | null };
      });

      const recentP = (async () => {
        try {
          const r = await fetchRecentAiAuditInvoices(currentPropertyId, fiscalYear, 12);
          return { items: r.items, err: false };
        } catch (e) {
          console.error('fetchRecentAiAuditInvoices failed', e);
          return { items: [] as RecentAiAuditInvoiceItem[], err: true };
        }
      })();

      const [sRes, kpiOut, recentOut] = await Promise.all([
        fetchDashboardBudgetSummary(currentPropertyId, fiscalYear),
        kpiP,
        recentP,
      ]);

      if (cancelled) return;
      if (sRes.error) {
        console.error('Budget dashboard RPC failed', { summary: sRes.error?.message });
        setLoadError(true);
      } else {
        setLoadError(false);
      }
      setSummary(sRes.data);
      setKpis(kpiOut.items);
      if (kpiOut.aiRisk === null) {
        setAiRiskFailed(true);
        setAiRiskData(null);
      } else {
        setAiRiskFailed(false);
        setAiRiskData(kpiOut.aiRisk);
      }
      setAiRiskPending(false);
      setRecentAiItems(recentOut.items);
      setRecentAiError(recentOut.err);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPropertyId, fiscalYear, language]);

  useEffect(() => {
    if (!currentPropertyId) {
      setVendorRiskSummary(null);
      setVendorRiskPending(false);
      return;
    }
    let cancelled = false;
    setVendorRiskPending(true);
    void (async () => {
      const s = await fetchVendorRiskHomeSummary(currentPropertyId);
      if (!cancelled) {
        setVendorRiskSummary(s);
        setVendorRiskPending(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPropertyId]);

  useEffect(() => {
    if (!currentPropertyId) return;
    const channel = supabase
      .channel(`iar-home-${currentPropertyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'invoice_ai_audit_results',
          filter: `property_id=eq.${currentPropertyId}`,
        },
        () => {
          void (async () => {
            try {
              const kpiP = fetchDashboardKpis(currentPropertyId, fiscalYear, language).catch((e) => {
                console.error('fetchDashboardKpis (realtime)', e);
                return { items: [] as DashboardKpi[], aiRisk: null as DashboardAiRiskSummary | null };
              });
              const recentP = fetchRecentAiAuditInvoices(currentPropertyId, fiscalYear, 12).catch(() => ({
                items: [],
              }));
              const [kpiOut, recentOut] = await Promise.all([kpiP, recentP]);
              setKpis(kpiOut.items);
              if (kpiOut.aiRisk === null) {
                setAiRiskFailed(true);
                setAiRiskData(null);
              } else {
                setAiRiskFailed(false);
                setAiRiskData(kpiOut.aiRisk);
              }
              setRecentAiItems(recentOut.items);
            } catch (e) {
              console.error('realtime refresh dashboard', e);
            }
          })();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'vendor_risk_signals',
          filter: `property_id=eq.${currentPropertyId}`,
        },
        () => {
          void fetchVendorRiskHomeSummary(currentPropertyId).then(setVendorRiskSummary);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentPropertyId, fiscalYear, language]);

  function handleKpiClick(key: DashboardKpi['key']) {
    if (
      key === 'high_risk_alerts' ||
      key === 'monthly_abnormal_invoices' ||
      key === 'over_budget' ||
      key === 'bypass_approval'
    ) {
      requestAnimationFrame(() => {
        riskStatusRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
        });
      });
    }
  }

  async function handleGenerateMeetingReport() {
    if (!currentPropertyId) return;
    setMeetingReportBusy(true);
    try {
      const invoiceId = await getFirstHighRiskInvoiceId(currentPropertyId, fiscalYear);
      if (!invoiceId) {
        window.alert(
          en
            ? 'No high-risk invoice found for this fiscal year.'
            : '本财年未找到高风险或严重等级发票。',
        );
        return;
      }
      const res = await generateAuditReportForInvoice(invoiceId);
      if (res.error || !res.report_id) {
        window.alert(res.error ?? (en ? 'Could not generate report.' : '生成报告失败。'));
        return;
      }
      navigate(`/audit-reports/${res.report_id}`);
    } catch (e) {
      console.error(e);
      window.alert(en ? 'Could not generate report.' : '生成报告失败。');
    } finally {
      setMeetingReportBusy(false);
    }
  }

  if (!currentPropertyId) return null;

  return (
    <section className="mb-2 mt-0" aria-labelledby="dashboard-page-h1">
      <div className="mx-auto w-full max-w-5xl space-y-2">
        {loading && (
          <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
            <Loader2 className="size-5 shrink-0 animate-spin text-gray-400" aria-hidden />
            <span>{loadingMsg}</span>
          </div>
        )}

        {!loading && (
          <div className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div>
                <h1 id="dashboard-page-h1" className="text-xl font-bold text-gray-900 sm:text-2xl">
                  {headerTitle}
                </h1>
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
              <div className="mt-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700 shadow-sm">
                {errorMsg}
              </div>
            )}

            {summary && summary.budget_scope === 'package' && summary.active_package_id == null && (
              <div className="mt-1 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-950 shadow-sm">
                <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>{t('budget_home_no_active_package')}</span>
              </div>
            )}

            <div className="mt-2">
              <DashboardKpiBar
                compact
                en={en}
                items={displayKpis}
                viewLabel={en ? 'View' : '查看'}
                onKpiClick={handleKpiClick}
              />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-4 xl:grid-cols-12 xl:gap-5">
              <div className="xl:col-span-8 space-y-4">
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
                <RecentAbnormalInvoicesCard items={recentAiItems} loadError={recentAiError} />
              </div>
              <div ref={riskStatusRef} className="scroll-mt-24 xl:col-span-4">
                <RiskStatusSection
                  en={en}
                  aiRisk={aiRiskData}
                  aiRiskPending={aiRiskPending}
                  aiRiskFailed={aiRiskFailed}
                  onGenerateMeetingReport={handleGenerateMeetingReport}
                  generatingMeetingReport={meetingReportBusy}
                  vendorRiskSummary={vendorRiskSummary}
                  vendorRiskPending={vendorRiskPending}
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
