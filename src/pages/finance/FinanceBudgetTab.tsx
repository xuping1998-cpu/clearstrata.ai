import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BarChart3, Loader2, Map, ShieldAlert, Wallet } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { CompactBudgetOverviewCard } from '../../components/finance/CompactBudgetOverviewCard';
import { AgmBudgetDocumentsPanel } from '../../components/finance/AgmBudgetDocumentsPanel';
import { BudgetCategoryMappingsPanel } from '../../components/finance/BudgetCategoryMappingsPanel';
import { BudgetExpenseVarianceDashboard } from '../../components/finance/BudgetExpenseVarianceDashboard';
import { RevenueReconciliationDashboard } from '../../components/finance/RevenueReconciliationDashboard';
import { BudgetRiskAlertsPanel } from '../../components/finance/BudgetRiskAlertsPanel';
import { fetchDashboardBudgetSummary } from '../../lib/budget/dashboardApi';
import { supabase } from '../../lib/supabase';
import { canManageInvoiceReview, canUploadInvoicePackage } from '../../lib/financePermissions';

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
  const { currentPropertyId, roleInProperty } = useProperty();
  const canSetGovernance = canManageInvoiceReview(roleInProperty);
  const canUploadBudget = canUploadInvoicePackage(roleInProperty);
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

  /** `YYYY-MM-DD` for `<input type="date" />`; empty clears to DB null */
  const [govDateInput, setGovDateInput] = useState('');
  const [govLoading, setGovLoading] = useState(false);
  const [govSaving, setGovSaving] = useState(false);
  const [govMessage, setGovMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [activeBudgetPanel, setActiveBudgetPanel] = useState<
    'mapping' | 'variance' | 'revenue' | 'alerts' | null
  >(null);
  const [govExpanded, setGovExpanded] = useState(false);

  const years = useMemo(() => yearOptions(anchorYear), [anchorYear]);

  const reloadSummary = useCallback(async () => {
    if (!currentPropertyId) {
      setSummary(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const res = await fetchDashboardBudgetSummary(currentPropertyId, fiscalYear);
    setSummary(res.data);
    setLoading(false);
  }, [currentPropertyId, fiscalYear]);

  useEffect(() => {
    const y = Number(searchParams.get('year'));
    if (Number.isFinite(y) && years.includes(y)) setFiscalYear(y);
  }, [searchParams, years]);

  useEffect(() => {
    void reloadSummary();
  }, [reloadSummary]);

  useEffect(() => {
    if (!currentPropertyId) {
      setGovDateInput('');
      return;
    }
    let cancelled = false;
    void (async () => {
      setGovLoading(true);
      setGovMessage(null);
      const { data, error } = await supabase
        .from('properties')
        .select('governance_start_date')
        .eq('id', currentPropertyId)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setGovDateInput('');
        setGovLoading(false);
        return;
      }
      const raw = (data as { governance_start_date?: string | null }).governance_start_date;
      const slice = typeof raw === 'string' ? raw.slice(0, 10) : '';
      setGovDateInput(slice);
      setGovLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPropertyId]);

  const saveGovernanceDate = async () => {
    if (!currentPropertyId || !canSetGovernance) return;
    setGovSaving(true);
    setGovMessage(null);
    const trimmed = govDateInput.trim();
    const pl = trimmed === '' ? { governance_start_date: null } : { governance_start_date: trimmed };

    const { error } = await supabase.from('properties').update(pl).eq('id', currentPropertyId);
    if (error) {
      setGovMessage({ ok: false, text: error.message });
      setGovSaving(false);
      return;
    }
    setGovMessage({
      ok: true,
      text: en ? 'Governance start date saved.' : '治理启动日期已保存。',
    });
    setGovSaving(false);
  };

  if (!currentPropertyId) {
    return (
      <p className="text-sm text-gray-500">
        {en ? 'Select a property to view AGM-approved budget.' : '请先选择物业以查看 AGM 批准预算。'}
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-16 text-gray-500 shadow-sm">
        <Loader2 className="size-6 animate-spin" aria-hidden />
        <span>{en ? 'Loading AGM-approved budget…' : '正在加载 AGM 批准预算…'}</span>
      </div>
    );
  }

  const budgetPanels = [
    {
      key: 'mapping' as const,
      icon: <Map size={20} aria-hidden />,
      title: en ? 'Budget category mapping' : '预算科目映射',
      desc: en
        ? 'AI maps AGM budget categories to system accounts.'
        : 'AI 识别 AGM 预算科目并映射到系统科目。',
      cta: en ? 'View mapping' : '查看映射',
    },
    {
      key: 'variance' as const,
      icon: <BarChart3 size={20} aria-hidden />,
      title: en ? 'Expense variance analysis' : '支出差异分析',
      desc: en
        ? 'Compare budget vs actual spend and analyze variances.'
        : '对比预算与实际支出，分析差异与原因。',
      cta: en ? 'View variance' : '查看差异',
    },
    {
      key: 'revenue' as const,
      icon: <Wallet size={20} aria-hidden />,
      title: en ? 'Revenue reconciliation' : '收入对账',
      desc: en
        ? 'Compare budgeted vs actual revenue collection.'
        : '对比预算收入与实际收入收缴情况。',
      cta: en ? 'View reconciliation' : '查看对账',
    },
    {
      key: 'alerts' as const,
      icon: <ShieldAlert size={20} aria-hidden />,
      title: en ? 'Budget risk alerts' : '预算风险预警',
      desc: en
        ? 'Flag material deviations between budget and actuals.'
        : '预警预算与实际的重大偏差风险。',
      cta: en ? 'View alerts' : '查看预警',
    },
  ];

  const fiscalYearControl = (
    <label className="flex items-center gap-2 text-sm text-gray-600">
      <span className="whitespace-nowrap">{en ? 'Fiscal year' : '财年'}</span>
      <select
        className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm"
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
  );

  return (
    <div className="space-y-6">
      {!summary ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-semibold text-gray-900">
              {en ? 'Budget overview' : '预算概览'}
            </span>
            {fiscalYearControl}
          </div>
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            {en ? 'AGM-approved budget summary is unavailable for this year.' : '暂无法加载该财年的 AGM 批准预算摘要。'}
          </p>
        </div>
      ) : (
        <CompactBudgetOverviewCard summary={summary} language={language} headerRight={fiscalYearControl} />
      )}

      <AgmBudgetDocumentsPanel
        propertyId={currentPropertyId}
        fiscalYear={fiscalYear}
        canUpload={canUploadBudget}
        canApprove={canSetGovernance}
        en={en}
        onApproved={() => void reloadSummary()}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {budgetPanels.map((p) => {
          const active = activeBudgetPanel === p.key;
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setActiveBudgetPanel(active ? null : p.key)}
              className={`flex h-full flex-col items-start rounded-2xl border bg-white p-4 text-left shadow-sm transition-colors ${
                active
                  ? 'border-clearstrata-ui-primary ring-1 ring-clearstrata-ui-primary'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-clearstrata-brand-100 text-clearstrata-brand-800">
                {p.icon}
              </span>
              <h3 className="mt-3 text-sm font-semibold text-gray-900">{p.title}</h3>
              <p className="mt-1 flex-1 text-xs leading-relaxed text-gray-500">{p.desc}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-clearstrata-ui-primary">
                {active ? (en ? 'Collapse' : '收起') : p.cta}
              </span>
            </button>
          );
        })}
      </div>

      {activeBudgetPanel === 'mapping' ? (
        <BudgetCategoryMappingsPanel
          propertyId={currentPropertyId}
          fiscalYear={fiscalYear}
          canManage={canSetGovernance}
          en={en}
        />
      ) : null}

      {activeBudgetPanel === 'variance' ? (
        <BudgetExpenseVarianceDashboard
          propertyId={currentPropertyId}
          fiscalYear={fiscalYear}
          en={en}
        />
      ) : null}

      {activeBudgetPanel === 'revenue' ? (
        <RevenueReconciliationDashboard
          propertyId={currentPropertyId}
          fiscalYear={fiscalYear}
          en={en}
        />
      ) : null}

      {activeBudgetPanel === 'alerts' ? (
        <BudgetRiskAlertsPanel
          propertyId={currentPropertyId}
          fiscalYear={fiscalYear}
          en={en}
          canManage={canSetGovernance}
        />
      ) : null}

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">
              {en ? 'Governance Start Date' : '治理启动日期'}
            </h3>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-gray-600">
              {en
                ? 'The governance start date is the baseline for statutory and governance deadlines, including council meeting notices, resolution archiving, and budget allocation cutoffs.'
                : '治理启动日期将用于计算各项法定或治理期限的起点，包括业委会会议通知、决议归档、预算分配截止日等。'}
            </p>
          </div>
          {canSetGovernance ? (
            <button
              type="button"
              onClick={() => setGovExpanded((v) => !v)}
              className="shrink-0 rounded-lg border border-violet-300 bg-white px-4 py-2 text-sm font-semibold text-violet-800 shadow-sm hover:bg-violet-50"
            >
              {govExpanded
                ? en
                  ? 'Close'
                  : '收起'
                : en
                  ? 'Set governance start date'
                  : '设置治理启动日期'}
            </button>
          ) : null}
        </div>

        {govExpanded && canSetGovernance ? (
          <div className="mt-4 flex max-w-xl flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm text-gray-700">
              <span className="font-medium">{en ? 'Date' : '日期'}</span>
              <input
                type="date"
                disabled={govLoading || !canSetGovernance}
                value={govDateInput}
                onChange={(e) => setGovDateInput(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 shadow-sm disabled:cursor-not-allowed disabled:bg-gray-100"
              />
            </label>
            <button
              type="button"
              disabled={govSaving || govLoading}
              onClick={() => void saveGovernanceDate()}
              className="shrink-0 rounded-lg bg-violet-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {govSaving ? (en ? 'Saving…' : '保存中…') : en ? 'Save' : '保存'}
            </button>
          </div>
        ) : null}

        {!canSetGovernance ? (
          <p className="mt-3 text-xs text-gray-600">
            {en
              ? 'Only council or property admins can change this setting.'
              : '仅业委会或物业管理员可修改该设置。'}
          </p>
        ) : null}
        {govMessage ? (
          <p className={`mt-2 text-sm ${govMessage.ok ? 'text-green-800' : 'text-red-700'}`}>{govMessage.text}</p>
        ) : null}
      </section>

      <div className="flex flex-wrap gap-3 text-sm">
        <Link
          to="/finance?tab=invoices"
          className="font-medium text-clearstrata-brand-700 hover:text-clearstrata-brand-900 hover:underline"
        >
          {en ? 'Open invoice details' : '前往发票明细'}
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
