import { useEffect, useMemo, useState, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Loader2, PieChart } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { BudgetOverviewCard } from '../../components/dashboard/BudgetOverviewCard';
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-clearstrata-ui-primary text-white">
            <PieChart size={20} aria-hidden />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {en ? 'AGM Approved Budget overview' : 'AGM 批准预算概览'}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {en
                ? 'Fiscal-year totals approved at AGM for the selected property.'
                : '当前物业所选财年由 AGM 批准的预算额度与执行情况。'}
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

      {!summary ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-950 shadow-sm">
          {en ? 'AGM-approved budget summary is unavailable for this year.' : '暂无法加载该财年的 AGM 批准预算摘要。'}
        </div>
      ) : (
        <BudgetOverviewCard summary={summary} language={language} />
      )}

      <AgmBudgetDocumentsPanel
        propertyId={currentPropertyId}
        fiscalYear={fiscalYear}
        canUpload={canUploadBudget}
        canApprove={canSetGovernance}
        en={en}
        onApproved={() => void reloadSummary()}
      />

      <BudgetCategoryMappingsPanel
        propertyId={currentPropertyId}
        fiscalYear={fiscalYear}
        canManage={canSetGovernance}
        en={en}
      />

      <BudgetExpenseVarianceDashboard
        propertyId={currentPropertyId}
        fiscalYear={fiscalYear}
        en={en}
      />

      <RevenueReconciliationDashboard
        propertyId={currentPropertyId}
        fiscalYear={fiscalYear}
        en={en}
      />

      <BudgetRiskAlertsPanel
        propertyId={currentPropertyId}
        fiscalYear={fiscalYear}
        en={en}
      />

      <section className="rounded-2xl border border-violet-200 bg-violet-50/70 p-5 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900">
          {en ? 'Governance Start Date' : '治理启动日期'}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-gray-700">
          {en
            ? 'Before this date — historical invoices use AI retrospective mode. On or after this date — formal governance enforcement applies to new postings.'
            : '该日期前的历史发票将采用 AI 倒查模式；该日期后的新发票将采用正式治理模式。'}
        </p>
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
          {canSetGovernance ? (
            <button
              type="button"
              disabled={govSaving || govLoading}
              onClick={() => void saveGovernanceDate()}
              className="shrink-0 rounded-lg bg-violet-700 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {govSaving ? (en ? 'Saving…' : '保存中…') : en ? 'Save' : '保存'}
            </button>
          ) : null}
        </div>
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
