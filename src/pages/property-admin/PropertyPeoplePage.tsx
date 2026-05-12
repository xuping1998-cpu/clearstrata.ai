import { useCallback, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { canAccessPropertyPeoplePage } from '../../lib/propertyPermissions';
import { isPlatformAdmin } from '../../lib/permissions';
import { BackButton } from '../../components/BackButton';
import { UserManagementTab, type StaffTab } from '../owner-info/UserManagementTab';
import { ExternalContactsAdminTab } from './ExternalContactsAdminTab';

function staffFromTabParam(raw: string | null): StaffTab | null {
  if (raw === 'invites') return 'review';
  if (raw === 'review' || raw === 'anomaly' || raw === 'members') return raw;
  if (raw === 'join') return 'review';
  return null;
}

type ActivePeopleSection = StaffTab | 'external';

export function PropertyPeoplePage() {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const { currentPropertyId, currentRole, isDemoPropertyMock } = useProperty();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const redirectToAudits = tabParam === 'audits' || tabParam === 'audit';
  const [section, setSection] = useState<ActivePeopleSection>('members');

  const platformAdmin = isPlatformAdmin(profile);
  const staffPeopleAccess = canAccessPropertyPeoplePage(currentRole) || isDemoPropertyMock;
  const platformOnlyPeople = platformAdmin && !staffPeopleAccess;

  useEffect(() => {
    const raw = searchParams.get('tab');
    if (raw === 'external') {
      setSection('external');
      return;
    }
    const st = staffFromTabParam(raw);
    if (st != null) setSection(st);
  }, [searchParams]);

  const syncUrl = useCallback(
    (next: ActivePeopleSection) => {
      setSection(next);
      setSearchParams({ tab: next }, { replace: true });
    },
    [setSearchParams],
  );

  if (redirectToAudits) {
    return <Navigate to="/property-admin/audits" replace />;
  }

  if (!currentPropertyId || (!staffPeopleAccess && !platformAdmin)) {
    return <Navigate to="/" replace />;
  }

  if (!platformAdmin && section === 'external') {
    return <Navigate to="/property-admin/people?tab=members" replace />;
  }

  if (platformOnlyPeople && section !== 'external') {
    return <Navigate to="/property-admin/people?tab=external" replace />;
  }

  const en = language === 'en';

  const staffTabs = [
    { key: 'members' as const, zh: '成员管理', en: 'Members' },
    { key: 'review' as const, zh: '加入申请', en: 'Join requests' },
    { key: 'anomaly' as const, zh: '待审核人员', en: 'Exception queue' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <BackButton />
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{en ? 'People management' : '人员管理'}</h1>
        <p className="text-sm text-gray-600 mt-1 max-w-2xl">
          {platformOnlyPeople
            ? en
              ? 'External contacts for home-services partners. Member tools require property staff access.'
              : '居家服务合作方联系人。成员/申请等功能需具备本物业职员权限。'
            : en
              ? 'Members, join requests, and the exception review queue for this property.'
              : '本物业成员、加入申请与待审核人员。'}
        </p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {staffPeopleAccess
          ? staffTabs.map((row) => (
              <button
                key={row.key}
                type="button"
                role="tab"
                aria-selected={section === row.key}
                onClick={() => syncUrl(row.key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  section === row.key
                    ? 'bg-clearstrata-ui-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {en ? row.en : row.zh}
              </button>
            ))
          : null}
        {platformAdmin ? (
          <button
            type="button"
            role="tab"
            aria-selected={section === 'external'}
            onClick={() => syncUrl('external')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              section === 'external'
                ? 'bg-clearstrata-ui-primary text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {en ? 'External Contacts' : '外来成员管理'}
          </button>
        ) : null}
      </div>

      {section === 'external' && platformAdmin ? <ExternalContactsAdminTab /> : null}

      {staffPeopleAccess && section !== 'external' && currentPropertyId ? (
        <UserManagementTab
          readOnly={false}
          controlledStaffTab={section as StaffTab}
          onStaffTabChange={(t) => syncUrl(t)}
          hideStaffTabBar
          hidePageTitle
        />
      ) : null}
    </div>
  );
}
