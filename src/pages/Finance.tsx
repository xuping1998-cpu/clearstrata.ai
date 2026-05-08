import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FileText, Bot, TrendingUp, BarChart3, PieChart } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';
import { BackButton } from '../components/BackButton';
import { InvoiceManagement } from './finance/InvoiceManagement';
import InvoiceInterpreter from './finance/InvoiceInterpreter';
import { RevenueDashboard } from './finance/RevenueDashboard';
import { MonthlySummary } from './finance/MonthlySummary';
import { FinanceBudgetTab } from './finance/FinanceBudgetTab';
import { DemoPropertyMockFinancePanel } from '@/components/demoProperty/DemoPropertyMockFinancePanel';
import { DemoCreatePropertyCtaCard } from '@/components/onboarding/DemoCreatePropertyCta';

type FinanceTab = 'invoices' | 'budget' | 'interpreter' | 'revenue' | 'summary';

interface TabConfig {
  key: FinanceTab;
  labelEn: string;
  labelZh: string;
  icon: React.ReactNode;
}

const allTabs: TabConfig[] = [
  { key: 'invoices', labelEn: 'Invoice Management', labelZh: '发票管理', icon: <FileText size={18} /> },
  { key: 'budget', labelEn: 'Budget', labelZh: '年度预算', icon: <PieChart size={18} /> },
  { key: 'interpreter', labelEn: 'AI Interpreter', labelZh: 'AI发票解读', icon: <Bot size={18} /> },
  { key: 'revenue', labelEn: 'Revenue Dashboard', labelZh: '收入看板', icon: <TrendingUp size={18} /> },
  { key: 'summary', labelEn: 'Monthly Summary', labelZh: '月度摘要', icon: <BarChart3 size={18} /> },
];

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

  const [searchParams] = useSearchParams();
  const financeFullAccess =
    currentRole === 'council' ||
    currentRole === 'admin' ||
    currentRole === 'property_admin' ||
    currentRole === 'manager';

  const visibleTabs = useMemo(
    () => (financeFullAccess ? allTabs : allTabs.filter((t) => t.key === 'summary')),
    [financeFullAccess]
  );

  const [activeTab, setActiveTab] = useState<FinanceTab>('summary');
  const invoiceHighlightId = searchParams.get('invoice');
  const filterDanger = searchParams.get('filter') === 'danger';
  const filterAudit = searchParams.get('filter') === 'audit';
  const filterAbnormal = searchParams.get('filter') === 'abnormal';
  const filterHighRisk = searchParams.get('filter') === 'high_risk';
  const rangeThisMonth = searchParams.get('range') === 'this_month';

  useEffect(() => {
    const tab = searchParams.get('tab') as FinanceTab | null;
    if (
      (filterDanger || filterAudit || filterAbnormal || filterHighRisk) &&
      financeFullAccess
    ) {
      setActiveTab('invoices');
      return;
    }
    if (
      tab &&
      ['invoices', 'budget', 'interpreter', 'revenue', 'summary'].includes(tab) &&
      financeFullAccess
    ) {
      setActiveTab(tab);
    } else {
      setActiveTab(financeFullAccess ? 'invoices' : 'summary');
    }
  }, [
    financeFullAccess,
    searchParams,
    filterDanger,
    filterAudit,
    filterAbnormal,
    filterHighRisk,
  ]);

  if (isDemoMode) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          {l
            ? 'Demo mode: detailed ledgers and invoice tools are available after you register and join the property.'
            : '演示模式：完整账本与发票功能请在注册并加入物业后使用。'}
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
        <h1 className="text-3xl font-bold text-gray-900">
          {l ? 'Financial Reports' : '财务报表'}
        </h1>
        <p className="text-gray-600 mt-2">
          {financeFullAccess
            ? l
              ? 'Official invoices, approval workflow, and reports. Create tasks and quotes in other modules; link them here via task / quote fields.'
              : '正式发票、审批与统计。任务与报价在「物业经理任务」「采购询价」中创建，通过来源任务与 quote 字段在此闭环。'
            : l
              ? 'Published monthly financial summaries for owners'
              : '业主可查看已发布的月度财务摘要'}
        </p>
      </div>

      {visibleTabs.length > 1 && (
        <div className="mb-6 max-w-full overflow-x-auto border-b border-gray-200 [scrollbar-width:thin]">
          <nav className="flex min-w-0 flex-wrap gap-1 sm:min-w-max sm:flex-nowrap">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
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
      )}

      {financeFullAccess && activeTab === 'invoices' && (
        <InvoiceManagement
          highlightInvoiceId={invoiceHighlightId}
          dangerFilterOnly={filterDanger}
          auditFilterOnly={filterAudit}
          abnormalFilterOnly={filterAbnormal}
          highRiskFilterOnly={filterHighRisk}
          rangeThisMonthOnly={rangeThisMonth}
        />
      )}
      {financeFullAccess && activeTab === 'budget' && <FinanceBudgetTab />}
      {financeFullAccess && activeTab === 'interpreter' && <InvoiceInterpreter />}
      {financeFullAccess && activeTab === 'revenue' && <RevenueDashboard />}
      {(activeTab === 'summary' || !financeFullAccess) && <MonthlySummary />}
    </div>
  );
}
