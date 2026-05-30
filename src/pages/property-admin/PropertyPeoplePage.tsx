import { useCallback, useEffect, useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  canAccessPropertyPeoplePage,
  canInvitePropertyManager,
} from '../../lib/propertyPermissions';
import { isPlatformAdmin } from '../../lib/permissions';
import { BackButton } from '../../components/BackButton';
import { UserManagementTab, type StaffTab } from '../owner-info/UserManagementTab';
import { ExternalContactsAdminTab } from './ExternalContactsAdminTab';
import { StaffInviteSection } from '../../components/property/StaffInviteSection';
import { OwnerInviteSection } from '../../components/property/OwnerInviteSection';

function staffFromTabParam(raw: string | null): StaffTab | null {
  if (raw === 'invites') return 'review';
  if (raw === 'review' || raw === 'anomaly' || raw === 'members') return raw;
  if (raw === 'join') return 'review';
  return null;
}

type ActivePeopleSection = StaffTab | 'external' | 'owner';

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
    if (raw === 'owner') {
      setSection('owner');
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

  const canOwnerInvite = canInvitePropertyManager(currentRole) && !isDemoPropertyMock;

  const staffTabs: { key: ActivePeopleSection; zh: string; en: string }[] = [
    { key: 'members', zh: '成员管理', en: 'Members' },
    { key: 'review', zh: '待审核人员', en: 'Pending Reviews' },
    { key: 'anomaly', zh: '职员邀请', en: 'Staff Invitations' },
  ];
  if (canOwnerInvite) {
    staffTabs.push({ key: 'owner', zh: '业主邀请', en: 'Owner Invite' });
  }

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
              ? 'Members, pending reviews, and staff invitations for this property.'
              : '本物业成员、待审核人员与职员邀请。'}
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

      {staffPeopleAccess && section === 'anomaly' && currentPropertyId ? (
        canInvitePropertyManager(currentRole) && !isDemoPropertyMock ? (
          <StaffInviteSection propertyId={currentPropertyId} />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
            {en
              ? 'You do not have permission to invite staff for this property.'
              : '您没有权限邀请本物业职员。'}
          </div>
        )
      ) : null}

      {staffPeopleAccess && section === 'owner' && currentPropertyId ? (
        canOwnerInvite ? (
          <OwnerInviteSection propertyId={currentPropertyId} />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
            {en
              ? 'You do not have permission to invite owners for this property.'
              : '您没有权限邀请本物业业主。'}
          </div>
        )
      ) : null}

      {staffPeopleAccess && section !== 'external' && section !== 'anomaly' && section !== 'owner' && currentPropertyId ? (
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
