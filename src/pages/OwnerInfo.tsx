import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { User, Receipt, FileText, UserCog, Megaphone } from 'lucide-react';
import { useProperty } from '../contexts/PropertyContext';
import { BackButton } from '../components/BackButton';
import { MyProfileTab } from './owner-info/MyProfileTab';
import { LedgerTab } from './owner-info/LedgerTab';
import { FormsTab } from './owner-info/FormsTab';
import { UserManagementTab } from './owner-info/UserManagementTab';
import { OwnerNotificationsSection } from './owner-info/OwnerNotificationsSection';
import { AnnouncementList } from '../components/AnnouncementList';

type TabType = 'profile' | 'ledger' | 'forms' | 'users' | 'announcements';

interface TabConfig {
  key: TabType;
  label: string;
  icon: React.ReactNode;
  councilOnly?: boolean;
}

const tabs: TabConfig[] = [
  { key: 'profile', label: '我的资料', icon: <User size={18} /> },
  { key: 'ledger', label: '账务记录', icon: <Receipt size={18} /> },
  { key: 'forms', label: '表单', icon: <FileText size={18} /> },
  { key: 'announcements', label: '公告', icon: <Megaphone size={18} /> },
  { key: 'users', label: '用户管理', icon: <UserCog size={18} />, councilOnly: true },
];

export function OwnerInfo() {
  const { currentRole } = useProperty();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const canManageRestrictedTabs =
    currentRole === 'council' ||
    currentRole === 'admin' ||
    currentRole === 'property_admin' ||
    currentRole === 'manager';

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
    const next = normalized as TabType;
    const cfg = tabs.find((t) => t.key === next);
    if (cfg?.councilOnly && !canManageRestrictedTabs) return;
    setActiveTab(next);
  }, [searchParams, canManageRestrictedTabs, tabKeys]);

  useEffect(() => {
    if (location.pathname !== '/owner-info' || location.hash !== '#owner-announcements') return;
    const timer = window.setTimeout(() => {
      document.getElementById('owner-announcements')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.pathname, location.hash]);

  const visibleTabs = tabs.filter((tab) => !tab.councilOnly || canManageRestrictedTabs);

  return (
    <div>
      <BackButton />
      <AnnouncementList />

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">业主信息</h1>
        <p className="text-gray-600 mt-2">管理您的资料、单元信息和账户详情</p>
      </div>

      <div className="mb-6 border-b border-gray-200 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
          {visibleTabs.map((tab) => (
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

      {activeTab === 'profile' && <MyProfileTab />}
      {activeTab === 'ledger' && <LedgerTab />}
      {activeTab === 'forms' && <FormsTab />}
      {activeTab === 'announcements' && <OwnerNotificationsSection />}
      {activeTab === 'users' && canManageRestrictedTabs && <UserManagementTab />}
    </div>
  );
}
