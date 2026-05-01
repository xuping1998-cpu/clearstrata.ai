import { useState, useEffect, useMemo, Component, type ErrorInfo, type ReactNode } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { User, Receipt, FileText, Megaphone } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { BackButton } from '../components/BackButton';
import { MyProfileTab } from './owner-info/MyProfileTab';
import { LedgerTab } from './owner-info/LedgerTab';
import { FormsTab } from './owner-info/FormsTab';
import { OwnerNotificationsSection } from './owner-info/OwnerNotificationsSection';
import { DirectNotificationsSection } from './owner-info/DirectNotificationsSection';
import { AnnouncementList } from '../components/AnnouncementList';

type TabType = 'profile' | 'ledger' | 'forms' | 'announcements';

interface TabConfig {
  key: TabType;
  label: string;
  icon: React.ReactNode;
}

const tabs: TabConfig[] = [
  { key: 'profile', label: '我的资料', icon: <User size={18} /> },
  { key: 'ledger', label: '账务记录', icon: <Receipt size={18} /> },
  { key: 'forms', label: '表单', icon: <FileText size={18} /> },
  { key: 'announcements', label: '公告', icon: <Megaphone size={18} /> },
];

/** 隔离子 Tab 运行时错误，避免整页白屏（「我的资料」等仍可用）。 */
class OwnerInfoSectionErrorBoundary extends Component<
  { children: ReactNode; title: string },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[owner-info tab]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950" role="alert">
          <p className="font-medium">{this.props.title}</p>
          <p className="mt-1 text-amber-900/90">请刷新页面或稍后再试。若问题持续，请联系技术支持。</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function OwnerInfo() {
  const { language } = useLanguage();
  const { currentPropertyId, isDemoMode, propertyHasManagementStaff } = useProperty();
  const [searchParams] = useSearchParams();
  const location = useLocation();

  const tabKeys = useMemo(() => tabs.map((x) => x.key), []);
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  useEffect(() => {
    const raw = searchParams.get('tab');
    if (!raw) return;
    const legacyToProfile = ['owners', 'emergency', 'residents', 'deregister'];
    if (legacyToProfile.includes(raw)) {
      setActiveTab('profile');
      return;
    }
    const normalized = raw === 'notify' ? 'announcements' : raw;
    if (!tabKeys.includes(normalized as TabType)) return;
    setActiveTab(normalized as TabType);
  }, [searchParams, tabKeys]);

  useEffect(() => {
    if (location.pathname !== '/owner-info' || location.hash !== '#owner-announcements') return;
    const timer = window.setTimeout(() => {
      document.getElementById('owner-announcements')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  if (isDemoMode) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-700">
        <p>
          演示模式：业主与个人敏感信息不在此展示。注册并加入物业后，可按权限查看公告与公开信息。
        </p>
      </div>
    );
  }

  return (
    <div>
      <BackButton />
      <AnnouncementList />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">业主信息</h1>
        <p className="text-gray-600 mt-2">管理您的资料、单元信息和账户详情</p>
        {currentPropertyId &&
          propertyHasManagementStaff === false && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950"
            >
              {language === 'en'
                ? 'This property has no management role assigned (no admin, council, or manager in property members). Ask your strata to restore roles in the database or promote staff under People management (System).'
                : '系统无管理角色：当前物业在成员表中没有管理员、业委会或物业经理。请联系业委会或通过数据库恢复角色，或由已有权限人员在「系统管理 → 人员管理」中处理。'}
            </div>
          )}
      </div>

      <div className="mb-6 border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`pb-3 px-3 border-b-2 font-medium transition-colors flex items-center gap-2 text-sm whitespace-nowrap ${
                activeTab === tab.key
                  ? 'border-[#1D9E75] text-[#1D9E75]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === 'profile' && (
        <OwnerInfoSectionErrorBoundary title={language === 'en' ? 'Could not load profile tab.' : '「我的资料」加载失败。'}>
          <MyProfileTab />
        </OwnerInfoSectionErrorBoundary>
      )}
      {activeTab === 'ledger' && <LedgerTab />}
      {activeTab === 'forms' && <FormsTab />}
      {activeTab === 'announcements' && (
        <>
          <DirectNotificationsSection />
          <OwnerNotificationsSection />
        </>
      )}
    </div>
  );
}
