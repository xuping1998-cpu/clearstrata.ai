import { useCallback, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { canAccessPropertyPeoplePage } from '../../lib/propertyPermissions';
import { BackButton } from '../../components/BackButton';
import { UserManagementTab, type StaffTab } from '../owner-info/UserManagementTab';

function staffFromTabParam(raw: string | null): StaffTab | null {
  if (raw === 'review' || raw === 'anomaly' || raw === 'audits' || raw === 'members' || raw === 'invites') return raw;
  if (raw === 'join') return 'review';
  if (raw === 'audit') return 'audits';
  return null;
}

export function PropertyPeoplePage() {
  const { language } = useLanguage();
  const { currentPropertyId, currentRole, isDemoPropertyMock } = useProperty();
  const [searchParams, setSearchParams] = useSearchParams();
  const [staffTab, setStaffTab] = useState<StaffTab>('members');

  useEffect(() => {
    const t = staffFromTabParam(searchParams.get('tab'));
    if (t != null) setStaffTab(t);
  }, [searchParams]);

  const syncUrl = useCallback(
    (next: StaffTab) => {
      setStaffTab(next);
      setSearchParams({ tab: next }, { replace: true });
    },
    [setSearchParams],
  );

  if (!currentPropertyId || (!canAccessPropertyPeoplePage(currentRole) && !isDemoPropertyMock)) {
    return <Navigate to="/" replace />;
  }

  const en = language === 'en';

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <BackButton />
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{en ? 'People management' : '人员管理'}</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          {en
            ? 'Manage members, join requests, and invite codes for this property.'
            : '管理本物业成员、加入申请及邀请码。'}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {(
          [
            { key: 'members' as const, zh: '成员管理', en: 'Members' },
            { key: 'review' as const, zh: '加入申请', en: 'Join requests' },
            { key: 'anomaly' as const, zh: '待审核人员', en: 'Exception queue' },
            { key: 'audits' as const, zh: '入楼审计', en: 'Entry audit' },
            { key: 'invites' as const, zh: '邀请码管理', en: 'Invite codes' },
          ] as const
        ).map((row) => (
          <button
            key={row.key}
            type="button"
            role="tab"
            aria-selected={staffTab === row.key}
            onClick={() => syncUrl(row.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              staffTab === row.key
                ? 'bg-clearstrata-ui-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {en ? row.en : row.zh}
          </button>
        ))}
      </div>

      {currentPropertyId ? (
        <UserManagementTab
          readOnly={false}
          controlledStaffTab={staffTab}
          onStaffTabChange={syncUrl}
          hideStaffTabBar
          hidePageTitle
        />
      ) : null}
    </div>
  );
}
