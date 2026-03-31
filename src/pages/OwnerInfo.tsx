import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Home, Phone, Receipt, FileText, UserCog, Users, UserMinus, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BackButton } from '../components/BackButton';
import { OwnerInfoTab } from './owner-info/OwnerInfoTab';
import { EmergencyTab } from './owner-info/EmergencyTab';
import { LedgerTab } from './owner-info/LedgerTab';
import { FormsTab } from './owner-info/FormsTab';
import { UserManagementTab } from './owner-info/UserManagementTab';
import { ResidentProfile } from './owner-info/ResidentProfile';
import { CommitteeManagement } from './owner-info/CommitteeManagement';
import { DeregistrationRequest } from './owner-info/DeregistrationRequest';

type TabType = 'profile' | 'owners' | 'emergency' | 'ledger' | 'forms' | 'users' | 'residents' | 'deregister';

interface TabConfig {
  key: TabType;
  label: string;
  icon: React.ReactNode;
  councilOnly?: boolean;
}

const tabs: TabConfig[] = [
  { key: 'profile', label: '我的资料', icon: <User size={18} /> },
  { key: 'owners', label: '单元信息', icon: <Home size={18} /> },
  { key: 'emergency', label: '紧急联系', icon: <Phone size={18} /> },
  { key: 'ledger', label: '账务记录', icon: <Receipt size={18} /> },
  { key: 'forms', label: '表单', icon: <FileText size={18} /> },
  { key: 'residents', label: '居住人', icon: <Users size={18} />, councilOnly: true },
  { key: 'deregister', label: '注销', icon: <UserMinus size={18} /> },
  { key: 'users', label: '用户管理', icon: <UserCog size={18} />, councilOnly: true },
];

export function OwnerInfo() {
  const { profile } = useAuth();
  const [searchParams] = useSearchParams();
  const canManageRestrictedTabs = profile?.role === 'council' || profile?.role === 'admin';

  const tabKeys = useMemo(() => tabs.map((x) => x.key), []);
  const [activeTab, setActiveTab] = useState<TabType>('profile');

  useEffect(() => {
    const raw = searchParams.get('tab');
    if (!raw || !tabKeys.includes(raw as TabType)) return;
    const next = raw as TabType;
    const cfg = tabs.find((t) => t.key === next);
    if (cfg?.councilOnly && !canManageRestrictedTabs) return;
    setActiveTab(next);
  }, [searchParams, canManageRestrictedTabs, tabKeys]);

  const visibleTabs = tabs.filter((tab) => !tab.councilOnly || canManageRestrictedTabs);

  return (
    <div>
      <BackButton />
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

      {activeTab === 'profile' && <ResidentProfile />}
      {activeTab === 'owners' && <OwnerInfoTab />}
      {activeTab === 'emergency' && <EmergencyTab />}
      {activeTab === 'ledger' && <LedgerTab />}
      {activeTab === 'forms' && <FormsTab />}
      {activeTab === 'residents' && canManageRestrictedTabs && <CommitteeManagement />}
      {activeTab === 'deregister' && <DeregistrationRequest />}
      {activeTab === 'users' && canManageRestrictedTabs && <UserManagementTab />}
    </div>
  );
}
