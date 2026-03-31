import { useState, useEffect, useMemo } from 'react';
import { FileText, Bot, TrendingUp, BarChart3 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { BackButton } from '../components/BackButton';
import { InvoiceManagement } from './finance/InvoiceManagement';
import { InvoiceInterpreter } from './finance/InvoiceInterpreter';
import { RevenueDashboard } from './finance/RevenueDashboard';
import { MonthlySummary } from './finance/MonthlySummary';

type FinanceTab = 'invoices' | 'interpreter' | 'revenue' | 'summary';

interface TabConfig {
  key: FinanceTab;
  labelEn: string;
  labelZh: string;
  icon: React.ReactNode;
}

const allTabs: TabConfig[] = [
  { key: 'invoices', labelEn: 'Invoice Management', labelZh: '发票管理', icon: <FileText size={18} /> },
  { key: 'interpreter', labelEn: 'AI Interpreter', labelZh: 'AI发票解读', icon: <Bot size={18} /> },
  { key: 'revenue', labelEn: 'Revenue Dashboard', labelZh: '收入看板', icon: <TrendingUp size={18} /> },
  { key: 'summary', labelEn: 'Monthly Summary', labelZh: '月度摘要', icon: <BarChart3 size={18} /> },
];

export function Finance() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const financeFullAccess = profile?.role === 'council' || profile?.role === 'admin';

  const visibleTabs = useMemo(
    () => (financeFullAccess ? allTabs : allTabs.filter((t) => t.key === 'summary')),
    [financeFullAccess]
  );

  const [activeTab, setActiveTab] = useState<FinanceTab>('summary');

  useEffect(() => {
    setActiveTab(financeFullAccess ? 'invoices' : 'summary');
  }, [financeFullAccess]);

  const l = language === 'en';

  return (
    <div>
      <BackButton />
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          {l ? 'Financial Reports' : '财务报表'}
        </h1>
        <p className="text-gray-600 mt-2">
          {financeFullAccess
            ? l
              ? 'Manage invoices, track revenue, and review financial summaries'
              : '管理发票、追踪收入、查看财务摘要'
            : l
              ? 'Published monthly financial summaries for owners'
              : '业主可查看已发布的月度财务摘要'}
        </p>
      </div>

      {visibleTabs.length > 1 && (
        <div className="mb-6 border-b border-gray-200 overflow-x-auto">
          <nav className="flex gap-1 min-w-max">
            {visibleTabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`pb-3 px-4 border-b-2 font-medium transition-colors flex items-center gap-2 text-sm whitespace-nowrap ${
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

      {financeFullAccess && activeTab === 'invoices' && <InvoiceManagement />}
      {financeFullAccess && activeTab === 'interpreter' && <InvoiceInterpreter />}
      {financeFullAccess && activeTab === 'revenue' && <RevenueDashboard />}
      {(activeTab === 'summary' || !financeFullAccess) && <MonthlySummary />}
    </div>
  );
}
