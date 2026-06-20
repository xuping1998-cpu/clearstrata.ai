import { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, TrendingUp, PieChart, FileSpreadsheet, Upload, Landmark, ClipboardList } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';
import { BackButton } from '../components/BackButton';
import { InvoiceManagement, type InvoiceManagementHandle } from './finance/InvoiceManagement';
import InvoiceInterpreter from './finance/InvoiceInterpreter';
import { RevenueDashboard } from './finance/RevenueDashboard';
import { FinanceBudgetTab } from './finance/FinanceBudgetTab';
import { FinanceCouncilActionsTab } from './finance/FinanceCouncilActionsTab';
import { BankTransactionsTab } from './finance/BankTransactionsTab';
import { DemoPropertyMockFinancePanel } from '@/components/demoProperty/DemoPropertyMockFinancePanel';
import { DemoCreatePropertyCtaCard } from '@/components/onboarding/DemoCreatePropertyCta';
import { canViewInvoiceReview, canUploadInvoicePackage, canManageInvoiceReview } from '../lib/financePermissions';

type FinanceTab = 'invoices' | 'bank' | 'budget' | 'interpreter' | 'revenue' | 'council-actions';

interface TabConfig {
  key: FinanceTab;
  labelEn: string;
  labelZh: string;
  icon: React.ReactNode;
}

/** Financial Oversight tabs. `/finance?tab=interpreter` still mounts `InvoiceInterpreter` without a nav entry. */
const mainNavTabs: TabConfig[] = [
  { key: 'invoices', labelEn: 'Invoice Review', labelZh: '发票审核', icon: <FileText size={18} /> },
  { key: 'bank', labelEn: 'Bank Transactions', labelZh: '银行流水', icon: <Landmark size={18} /> },
  { key: 'budget', labelEn: 'AGM Approved Budget', labelZh: 'AGM批准预算', icon: <PieChart size={18} /> },
  { key: 'revenue', labelEn: 'Revenue Dashboard', labelZh: '收入看板', icon: <TrendingUp size={18} /> },
  { key: 'council-actions', labelEn: 'Council Action Center', labelZh: '业委会行动中心', icon: <ClipboardList size={18} /> },
];

const FINANCE_SUBTITLE = {
  en: 'View income, expenses, budgets and bank transactions to ensure every expense is clean and transparent.',
  zh: '公开展示物业收入、支出、预算与银行流水，让每一笔支出干净透明。',
};

export function Finance() {
  const { language } = useLanguage();
  const { currentRole, isDemoMode, isDemoPropertyMock } = useProperty();
  const l = language === 'en';

  if (isDemoPropertyMock) {
    return (
      <div className="mx-0 min-w-0 w-full max-w-none">
        <BackButton />
        <div className="mb-4">
          <DemoCreatePropertyCtaCard />
        </div>
        <DemoPropertyMockFinancePanel />
      </div>
    );
  }

  const [searchParams, setSearchParams] = useSearchParams();
  const canView = canViewInvoiceReview(currentRole);
  const canUploadPkg = canUploadInvoicePackage(currentRole);
  const canManageMatch = canManageInvoiceReview(currentRole);
  const canRespondExplanation = currentRole === 'manager';

  const visibleTabs = useMemo(() => (canView ? mainNavTabs : []), [canView]);

  const [activeTab, setActiveTab] = useState<FinanceTab>('invoices');
  const handleTabClick = (key: FinanceTab) => {
    setActiveTab(key);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', key);
        return next;
      },
      { replace: true },
    );
  };
  const invoiceLedgerRef = useRef<InvoiceManagementHandle>(null);
  const [invoiceToolbarUploading, setInvoiceToolbarUploading] = useState(false);

  const invoiceHighlightId = searchParams.get('invoice');
  const bankFilter = searchParams.get('filter');
  const filterDanger = searchParams.get('filter') === 'danger';
  const filterAudit = searchParams.get('filter') === 'audit';
  const filterAbnormal = searchParams.get('filter') === 'abnormal';
  const filterHighRisk = searchParams.get('filter') === 'high_risk';
  const rangeThisMonth = searchParams.get('range') === 'this_month';

  useEffect(() => {
    if (!canView) return;

    const tab = searchParams.get('tab') as FinanceTab | null;
    const validTabs = ['invoices', 'bank', 'budget', 'interpreter', 'revenue', 'council-actions'] as const;

    if ((filterDanger || filterAudit || filterAbnormal || filterHighRisk) && canView) {
      setActiveTab('invoices');
      return;
    }
    if (tab && (validTabs as readonly string[]).includes(tab)) {
      setActiveTab(tab);
    } else {
      setActiveTab('invoices');
    }
  }, [canView, searchParams, filterDanger, filterAudit, filterAbnormal, filterHighRisk]);

  if (isDemoMode) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          {l
            ? 'Demo mode: full financial oversight tools unlock after you register and join the property.'
            : '演示模式：完整财务监督工具请在注册并加入物业后使用。'}
        </div>
        <DemoCreatePropertyCtaCard />
        <p className="text-sm text-gray-600">
          {l ? 'Financial overview and risk KPIs are on the demo home page.' : '财务与风险概览请见演示首页。'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-0 min-w-0 w-full max-w-none">
      <BackButton />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{l ? 'Financial Oversight' : '财务监督'}</h1>
        <p className="mt-2 text-gray-600">
          {!canView
            ? l
              ? 'Financial oversight is available to owners and property staff after you join a property.'
              : '加入物业后，业主与物业工作人员可使用财务监督。'
            : l
              ? FINANCE_SUBTITLE.en
              : FINANCE_SUBTITLE.zh}
        </p>
      </div>

      {canView && visibleTabs.length > 0 && (
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex flex-wrap gap-1 sm:gap-2">
              {visibleTabs.map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => handleTabClick(tab.key)}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 pb-3 text-sm font-medium transition-colors sm:gap-2 sm:px-4 ${
                    activeTab === tab.key
                      ? 'border-[#1D9E75] text-[#1D9E75]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.icon}
                  {l ? tab.labelEn : tab.labelZh}
                </button>
              ))}
            </nav>
          </div>
          {activeTab === 'invoices' && (
            <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
              {canUploadPkg ? (
                <button
                  type="button"
                  disabled={invoiceToolbarUploading}
                  onClick={() => invoiceLedgerRef.current?.openUploadModal()}
                  className={`inline-flex items-center gap-1.5 rounded-lg bg-clearstrata-ui-primary px-2.5 py-1.5 text-xs font-medium text-white transition-colors sm:gap-2 sm:px-3 sm:py-2 sm:text-sm ${
                    invoiceToolbarUploading
                      ? 'pointer-events-none opacity-50'
                      : 'hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive'
                  }`}
                >
                  <Upload size={16} className="sm:h-[18px] sm:w-[18px]" />
                  {invoiceToolbarUploading ? (l ? 'Working…' : '处理中…') : l ? 'Upload package' : '上传发票包'}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => invoiceLedgerRef.current?.exportCsv()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
              >
                <FileText size={14} />
                CSV
              </button>
              <button
                type="button"
                onClick={() => invoiceLedgerRef.current?.exportExcel()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 sm:gap-2 sm:px-3 sm:py-2 sm:text-sm"
              >
                <FileSpreadsheet size={14} />
                Excel
              </button>
            </div>
          )}
        </div>
      )}

      {!canView && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-gray-50/90 px-4 py-12 text-center text-sm text-gray-600">
          {l
            ? 'Financial oversight is available to owners and property staff (council, property admin, or manager).'
            : '财务监督面向业主与物业工作人员（业委会、物业管理员或物业经理）。'}
        </div>
      )}

      {canView && activeTab === 'invoices' && (
        <InvoiceManagement
          ref={invoiceLedgerRef}
          hideToolbar
          onUploadingChange={setInvoiceToolbarUploading}
          highlightInvoiceId={invoiceHighlightId}
          dangerFilterOnly={filterDanger}
          auditFilterOnly={filterAudit}
          abnormalFilterOnly={filterAbnormal}
          highRiskFilterOnly={filterHighRisk}
          rangeThisMonthOnly={rangeThisMonth}
        />
      )}
      {canView && activeTab === 'bank' && (
        <BankTransactionsTab
          canImport={canUploadPkg}
          canManageMatch={canManageMatch}
          canRespondExplanation={canRespondExplanation}
          initialFilter={bankFilter}
        />
      )}
      {canView && activeTab === 'budget' && <FinanceBudgetTab />}
      {canView && activeTab === 'interpreter' && <InvoiceInterpreter />}
      {canView && activeTab === 'revenue' && <RevenueDashboard />}
      {canView && activeTab === 'council-actions' && <FinanceCouncilActionsTab />}
    </div>
  );
}
