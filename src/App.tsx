import { useEffect, useState, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { PropertyProvider, useProperty } from './contexts/PropertyContext';
import { PropertyEntry } from './pages/PropertyEntry';
import { Auth } from './components/Auth';
import { AdminLoginPage } from './pages/auth/AdminLoginPage';
import { ResetPassword } from './pages/ResetPassword';
import { Layout } from './components/Layout';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Dashboard } from './pages/Dashboard';
import { Procurement } from './pages/Procurement';
import { Voting } from './pages/Voting';
import { Finance } from './pages/Finance';
import { InvoiceAuditReportsPage } from './pages/finance/InvoiceAuditReportsPage';
import { InvoiceAuditReportDetailPage } from './pages/finance/InvoiceAuditReportDetailPage';
import { AuditReportDetail } from './pages/AuditReportDetail';
import { VendorRiskSignals } from './pages/VendorRiskSignals';
import { InvoiceUpload } from './pages/InvoiceUpload';
import { Meetings } from './pages/Meetings';
import { MeetingEditor } from './pages/MeetingEditor';
import { FinanceInvoiceDeepLink, FinanceInvoicesListDeepLink } from './pages/finance/FinanceInvoiceRoutes';
import { OwnerInfo } from './pages/OwnerInfo';
import { ManagerTasks } from './pages/ManagerTasks';
import { ManagerTaskDetail } from './pages/ManagerTaskDetail';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';
import { Hiring } from './pages/Hiring';
import { Compliance } from './pages/Compliance';
import { MeetingDetail } from './pages/meeting/MeetingDetail';
import { OwnerVotingCompatPage } from './pages/owner-voting/OwnerVotingCompatPage';
import { PricingPage } from './pages/PricingPage';
import { Contact } from './pages/Contact';
import { PropertyPicker } from './pages/PropertyPicker';
import JoinWithCode from '@/pages/JoinWithCode';
import { JoinRequestPage } from './pages/JoinRequestPage';
import { JoinPathRouter } from './pages/scan-join/JoinPathRouter';
import { BindUnitPage } from './pages/scan-join/BindUnitPage';
import { WelcomeAfterJoinPage } from './pages/scan-join/WelcomeAfterJoinPage';
import JoinPendingPage from './pages/join/JoinPendingPage';
import { JoinRouteSplit } from './pages/join/JoinRouteSplit';
import { DemoOverviewPage } from './pages/demo-overview/DemoOverviewPage';
import { PosterLandingPage } from './pages/marketing/PosterLandingPage';
import JoinRejectedPage from './pages/join/JoinRejectedPage';
import JoinInvalidPage from './pages/join/JoinInvalidPage';
import JoinInviteLandingPage from './pages/join/JoinInviteLandingPage';
import { CreatePropertyPage } from './pages/onboarding/CreatePropertyPage';
import { UpgradePage } from './pages/UpgradePage';
import { LeadsDashboardPage } from './pages/admin/LeadsDashboardPage';
import { PlatformAdminRoute } from './components/PlatformAdminRoute';
import { PlatformOverviewPage } from './pages/admin/PlatformOverviewPage';
import { PropertySettingsPage } from './pages/property-admin/PropertyAdminHub';
import { PropertyPeoplePage } from './pages/property-admin/PropertyPeoplePage';
import { PropertyAuditsPage } from './pages/property-admin/PropertyAuditsPage';
import { UnitWhitelistPage } from './pages/property-admin/UnitWhitelistPage';
import { PropertyAdminInvites } from './pages/property-admin/PropertyAdminInvites';
import { PropertyInviteAnalytics } from './pages/property-admin/PropertyInviteAnalytics';
import { PropertyTaskDetail } from './pages/property-admin/PropertyTaskDetail';
import { AdminInvites } from './pages/admin/AdminInvites';
import { AdminInviteCodes } from './pages/admin/AdminInviteCodes';
import AdminJoinRequests from './pages/admin/AdminJoinRequests';
import { JoinAccessGate } from './pages/JoinAccessGate';
import { PostLoginPropertyRedirect } from './components/PostLoginPropertyRedirect';
import { isMeetingDetailDeepLink, savePendingRedirect } from './lib/pendingRedirect';
import PasswordRecoveryUrlNormaliser from './components/PasswordRecoveryUrlNormaliser';
import { DemoDashboardRoute } from './components/DemoDashboardRoute';
import { DemoLandingPage } from './pages/DemoLandingPage';
import { QrPropertyEntryPage } from './pages/entry/QrPropertyEntryPage';
import { AuthCallback } from './pages/auth/AuthCallback';
import { EntryAutoLogin } from './pages/entry/EntryAutoLogin';
import { ManagerInviteAcceptPage } from './pages/ManagerInviteAcceptPage';
import { StaffInviteAcceptPage } from './pages/StaffInviteAcceptPage';
import { OwnerInviteAcceptPage } from './pages/OwnerInviteAcceptPage';
import {
  canAccessPropertyPeoplePage,
  canAccessPropertySettingsPage,
  canManagePropertyInvites,
  canManageUnitWhitelist,
  canReviewJoinRequests,
} from './lib/propertyPermissions';
import { isPlatformAdmin } from './lib/permissions';
import type { UserRole } from './lib/supabase';
import { supabase } from './lib/supabase';
import { useHasActivePropertyMembership } from './hooks/useHasActivePropertyMembership';
import { samePropertyId } from './lib/propertyIdMatch';

const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/register',
  '/pricing',
  '/upgrade',
  '/contact-sales',
  '/entry',
  '/invite',
  '/join',
  '/manager-invite',
  '/staff-invite',
  '/owner-invite',
  '/demo-property',
  '/onboarding/create-property',
];

function isPublicPath(pathname: string) {
  return pathname === '/' || PUBLIC_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function PropertyBootstrapLoading() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 border-4 border-clearstrata-ui-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-700 font-medium">正在载入物业资料…</p>
        <p className="text-sm text-gray-500 mt-1">Loading property records…</p>
      </div>
    </div>
  );
}

const PENDING_JOIN_STATUSES = new Set(['pending', 'submitted', 'under_review', 'reviewing']);

function NoActiveMembershipGate() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (isPublicPath(location.pathname)) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        console.log('[JoinAccessGate] no request');
        setChecking(false);
      }
    }, 6000);

    (async () => {
      console.log('[JoinAccessGate] start');
      if (!user?.id) {
        console.log('[JoinAccessGate] no request');
        if (!cancelled) setChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('join_requests')
          .select('property_id, unit_no, review_flag, review_reason, status, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (cancelled) return;
        if (error) {
          console.log('[JoinAccessGate] error', error);
          setChecking(false);
          return;
        }

        const status = String(data?.status ?? '');
        if (data && PENDING_JOIN_STATUSES.has(status)) {
          console.log('[JoinAccessGate] pending request found', data);
          window.clearTimeout(timeout);
          navigate('/join/pending', {
            replace: true,
            state: {
              propertyId: data.property_id,
              unitNo: data.unit_no || undefined,
              reviewFlag: data.review_flag || undefined,
              message: data.review_reason || undefined,
            },
          });
          return;
        }

        console.log('[JoinAccessGate] no request');
        setChecking(false);
      } catch (err) {
        if (!cancelled) {
          console.log('[JoinAccessGate] error', err);
          setChecking(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [location.pathname, navigate, user?.id]);

  if (isPublicPath(location.pathname)) {
    return null;
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-clearstrata-ui-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-500">Checking application status... / 正在检查申请状态...</p>
        </div>
      </div>
    );
  }

  return <JoinAccessGate />;
}

function PricingRoute() {
  const { session } = useAuth();
  const { memberships, currentPropertyId } = useProperty();
  if (session && memberships.length > 0 && !currentPropertyId) {
    return <Navigate to="/select-property" replace />;
  }
  if (session) {
    return (
      <Layout>
        <PricingPage />
      </Layout>
    );
  }
  return <PricingPage />;
}

function ContactRoute() {
  const { session } = useAuth();
  const { memberships, currentPropertyId } = useProperty();
  if (session && memberships.length > 0 && !currentPropertyId) {
    return <Navigate to="/select-property" replace />;
  }
  if (session) {
    return (
      <Layout>
        <Contact />
      </Layout>
    );
  }
  return <Contact />;
}

/**
 * Staff-only routes under /admin/*. Must select a property first (fixes null role when multi-property).
 * Resolves role with samePropertyId (UUID casing) so property_admin is never dropped.
 */
function AdminStaffRoute({
  children,
  canAccess,
}: {
  children: ReactNode;
  canAccess: (role: UserRole | null | undefined) => boolean;
}) {
  const { currentPropertyId, memberships, ready } = useProperty();

  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-clearstrata-ui-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentPropertyId) {
    return <Navigate to="/select-property" replace />;
  }

  const mem = memberships.find((m) => samePropertyId(m.propertyId, currentPropertyId));
  if (!mem) {
    return <Navigate to="/select-property" replace />;
  }

  const effectiveRole: UserRole | null = mem.role;

  if (!canAccess(effectiveRole)) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function AdminInvitesRoute() {
  return (
    <AdminStaffRoute canAccess={canManagePropertyInvites}>
      <AdminInvites />
    </AdminStaffRoute>
  );
}

function AdminInviteCodesRoute() {
  return (
    <AdminStaffRoute canAccess={canManagePropertyInvites}>
      <AdminInviteCodes />
    </AdminStaffRoute>
  );
}

function PropertyAdminInvitesRoute() {
  return (
    <AdminStaffRoute canAccess={canManagePropertyInvites}>
      <PropertyAdminInvites />
    </AdminStaffRoute>
  );
}

function PropertyInviteAnalyticsRoute() {
  return (
    <AdminStaffRoute canAccess={canManagePropertyInvites}>
      <PropertyInviteAnalytics />
    </AdminStaffRoute>
  );
}

function PropertyUnitWhitelistRoute() {
  return (
    <AdminStaffRoute canAccess={canManageUnitWhitelist}>
      <UnitWhitelistPage />
    </AdminStaffRoute>
  );
}

function AdminJoinRequestsRoute() {
  return (
    <AdminStaffRoute canAccess={canReviewJoinRequests}>
      <AdminJoinRequests />
    </AdminStaffRoute>
  );
}

/** Same shell as path="/*" branch: Layout + session + membership + current property. */
function SessionLayoutGate({ children }: { children: ReactNode }) {
  const { session, user } = useAuth();
  const { ready: propertyReady, currentPropertyId } = useProperty();
  const hasActiveMembership = useHasActivePropertyMembership(user?.id, propertyReady);

  if (!session) return <Auth />;
  if (hasActiveMembership === false) return <JoinAccessGate />;
  if (!currentPropertyId) return <Navigate to="/select-property" replace />;
  return <Layout>{children}</Layout>;
}

function SessionDashboardRoute() {
  const { session, loading } = useAuth();
  const { memberships, currentPropertyId, ready } = useProperty();
  if (!session) return <Navigate to="/" replace />;
  if (loading || !ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-clearstrata-ui-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (memberships.length === 0) return <Navigate to="/" replace />;
  if (!currentPropertyId) return <Navigate to="/select-property" replace />;
  return (
    <Layout>
      <Dashboard />
    </Layout>
  );
}

function AuthenticatedRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/procurement" element={<Procurement />} />
      <Route path="/voting" element={<Voting />} />
      <Route path="/voting/:id" element={<MeetingDetail />} />
      <Route path="/finance/invoices/:invoiceId" element={<FinanceInvoiceDeepLink />} />
      <Route path="/finance/invoices" element={<FinanceInvoicesListDeepLink />} />
      <Route path="/finance/invoice-audit-reports" element={<InvoiceAuditReportsPage />} />
      <Route path="/finance/invoice-audit-reports/:reportId" element={<InvoiceAuditReportDetailPage />} />
      <Route path="/audit-reports/:reportId" element={<AuditReportDetail />} />
      <Route path="/vendor-risk-signals" element={<VendorRiskSignals />} />
      <Route path="/invoices/upload" element={<InvoiceUpload />} />
      <Route path="/meetings" element={<Meetings />} />
      <Route path="/meetings/create" element={<Navigate to="/meetings/new" replace />} />
      <Route path="/meetings/new" element={<MeetingEditor />} />
      <Route path="/meetings/:meetingId/edit" element={<MeetingEditor />} />
      <Route path="/meetings/:meetingId" element={<MeetingDetail />} />
      <Route path="/owner-voting" element={<OwnerVotingCompatPage />} />
      <Route path="/finance" element={<Finance />} />
      <Route path="/hiring" element={<Hiring />} />
      <Route path="/owner-info" element={<OwnerInfo />} />
      <Route path="/disputes" element={<Navigate to="/manager-tasks?task_type=dispute" replace />} />
      <Route path="/manager-tasks" element={<ManagerTasks />} />
      <Route path="/manager-tasks/:taskId" element={<ManagerTaskDetail />} />
      <Route path="/compliance" element={<Compliance />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function PropertyAdminIndexRoute() {
  const { session } = useAuth();
  const { memberships, currentPropertyId, roleInProperty } = useProperty();
  if (!session) return <Navigate to="/" replace />;
  if (!memberships.length || !currentPropertyId) return <Navigate to="/" replace />;
  if (canAccessPropertySettingsPage(roleInProperty)) return <Navigate to="/property-admin/settings" replace />;
  if (canAccessPropertyPeoplePage(roleInProperty)) return <Navigate to="/property-admin/people" replace />;
  return <Navigate to="/" replace />;
}

/** Property staff or platform operators (`profiles.app_role`) may open People management (external contacts tab is platform-only inside the page). */
function PlatformOrStaffPeopleGate({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (isPlatformAdmin(profile as { app_role?: string | null } | null)) return <>{children}</>;
  return <AdminStaffRoute canAccess={canAccessPropertyPeoplePage}>{children}</AdminStaffRoute>;
}

function PropertyAdminPeopleLayoutRoute() {
  const { session } = useAuth();
  const { memberships, currentPropertyId } = useProperty();
  if (!session) return <Navigate to="/" replace />;
  if (!memberships.length || !currentPropertyId) return <Navigate to="/" replace />;
  return (
    <Layout>
      <PlatformOrStaffPeopleGate>
        <PropertyPeoplePage />
      </PlatformOrStaffPeopleGate>
    </Layout>
  );
}

function PropertyAdminSettingsLayoutRoute() {
  const { session } = useAuth();
  const { memberships, currentPropertyId } = useProperty();
  if (!session) return <Navigate to="/" replace />;
  if (!memberships.length || !currentPropertyId) return <Navigate to="/" replace />;
  return (
    <Layout>
      <AdminStaffRoute canAccess={canAccessPropertySettingsPage}>
        <PropertySettingsPage />
      </AdminStaffRoute>
    </Layout>
  );
}

function PropertyAdminAuditsLayoutRoute() {
  const { session } = useAuth();
  const { memberships, currentPropertyId } = useProperty();
  if (!session) return <Navigate to="/" replace />;
  if (!memberships.length || !currentPropertyId) return <Navigate to="/" replace />;
  return (
    <Layout>
      <AdminStaffRoute canAccess={canAccessPropertyPeoplePage}>
        <PropertyAuditsPage />
      </AdminStaffRoute>
    </Layout>
  );
}

/** 演示楼：无需登录；子路由 `/demo-property/*` 使用纯 mock，不写库。 */
function DemoPropertyLayout() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}

function SelectPropertyRoute() {
  const { session } = useAuth();
  const { memberships, currentPropertyId, ready } = useProperty();
  if (!session) return <Navigate to="/" replace />;
  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-clearstrata-ui-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (memberships.length === 0) return <Navigate to="/" replace />;
  if (memberships.length === 1) return <Navigate to="/" replace />;
  if (currentPropertyId) return <Navigate to="/" replace />;
  return <PropertyPicker />;
}

/** /demo — fallback for non-whitelist / non-member users. */
function DemoFallbackPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50 flex flex-col items-center justify-center p-6 gap-5 text-center">
      <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="w-20 h-auto" />
      <h1 className="text-xl font-bold text-gray-800">
        非本楼房号 / Not a resident unit
      </h1>
      <p className="text-sm text-gray-600 max-w-sm">
        你所在的房号不在本物业白名单内，无法进入首页。
        <br />
        Your unit is not registered in this property's whitelist.
      </p>
      <p className="text-sm text-gray-600 max-w-sm">
        请进入 Demo 浏览系统功能，或联系业委会确认入口。
        <br />
        Explore the Demo, or contact your strata council.
      </p>
      <div className="flex gap-3 flex-wrap justify-center">
        <a
          href="/demo-overview"
          className="px-5 py-2.5 rounded-xl bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#178a66] transition-colors"
        >
          进入 Demo / Explore Demo
        </a>
        <a
          href="/entry"
          className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors"
        >
          重新入楼 / Re-enter
        </a>
      </div>
    </div>
  );
}

function AppContent() {
  return (
    <>
      {/* Password recovery: normalize URL before any post-login / property logic */}
      <PasswordRecoveryUrlNormaliser />
      <PostLoginPropertyRedirect />
      <Routes>
      <Route path="/entry" element={<QrPropertyEntryPage />} />
      <Route path="/manager-invite" element={<ManagerInviteAcceptPage />} />
      <Route path="/staff-invite" element={<StaffInviteAcceptPage />} />
      <Route path="/owner-invite" element={<OwnerInviteAcceptPage />} />
      <Route path="/entry/auto-login" element={<EntryAutoLogin />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/demo" element={<DemoFallbackPage />} />
      <Route path="/demo/:propertyCode" element={<DemoLandingPage />} />
      <Route
        path="/demo-dashboard/:propertyCode"
        element={
          <DemoDashboardRoute>
            <Dashboard />
          </DemoDashboardRoute>
        }
      />
      <Route
        path="/demo-home"
        element={
          <DemoDashboardRoute>
            <Dashboard />
          </DemoDashboardRoute>
        }
      />
      <Route
        path="/demo/finance"
        element={
          <DemoDashboardRoute>
            <Finance />
          </DemoDashboardRoute>
        }
      />
      <Route
        path="/demo/voting"
        element={
          <DemoDashboardRoute>
            <Meetings />
          </DemoDashboardRoute>
        }
      />
      <Route
        path="/demo/voting/:meetingId"
        element={
          <DemoDashboardRoute>
            <MeetingDetail />
          </DemoDashboardRoute>
        }
      />
      <Route
        path="/demo/owner-info"
        element={
          <DemoDashboardRoute>
            <OwnerInfo />
          </DemoDashboardRoute>
        }
      />
      <Route
        path="/demo/compliance"
        element={
          <DemoDashboardRoute>
            <Compliance />
          </DemoDashboardRoute>
        }
      />
      <Route path="/p/:code" element={<PropertyEntry />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/login" element={<AdminLoginPage />} />
      <Route path="/pricing" element={<PricingRoute />} />
      <Route path="/contact" element={<ContactRoute />} />
      <Route path="/join/pending" element={<JoinPendingPage />} />
      <Route path="/join/rejected" element={<JoinRejectedPage />} />
      <Route path="/join/invalid" element={<JoinInvalidPage />} />
      <Route path="/join/welcome" element={<JoinInviteLandingPage />} />
      <Route path="/demo-property" element={<DemoPropertyLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="finance" element={<Finance />} />
        <Route path="members" element={<PropertyPeoplePage />} />
        <Route path="invoices" element={<Navigate to="/demo-property/finance" replace />} />
      </Route>
      <Route path="/join/:code" element={<JoinRouteSplit />} />
      <Route path="/demo-overview" element={<DemoOverviewPage />} />
      <Route path="/marketing/poster/:code" element={<PosterLandingPage />} />
      <Route path="/join" element={<JoinPathRouter />} />
      <Route path="/bind-unit" element={<BindUnitPage />} />
      <Route path="/welcome" element={<WelcomeAfterJoinPage />} />
      <Route path="/invite" element={<JoinWithCode />} />
      <Route path="/invite/*" element={<JoinWithCode />} />
      <Route path="/onboarding/create-property" element={<CreatePropertyPage />} />
      <Route path="/upgrade" element={<UpgradePage />} />
      <Route path="/contact-sales" element={<UpgradePage />} />
      <Route path="/dashboard" element={<SessionDashboardRoute />} />
      <Route path="/join-request" element={<JoinRequestPage />} />
      <Route path="/select-property" element={<SelectPropertyRoute />} />
      <Route path="/property-admin" element={<PropertyAdminIndexRoute />} />
      <Route path="/property-admin/people" element={<PropertyAdminPeopleLayoutRoute />} />
      <Route path="/property-admin/settings" element={<PropertyAdminSettingsLayoutRoute />} />
      <Route path="/property-admin/audits" element={<PropertyAdminAuditsLayoutRoute />} />
      <Route
        path="/property-admin/invites"
        element={
          <SessionLayoutGate>
            <PropertyAdminInvitesRoute />
          </SessionLayoutGate>
        }
      />
      <Route
        path="/property-admin/invite-analytics"
        element={
          <SessionLayoutGate>
            <PropertyInviteAnalyticsRoute />
          </SessionLayoutGate>
        }
      />
      <Route
        path="/property-admin/unit-whitelist"
        element={
          <SessionLayoutGate>
            <PropertyUnitWhitelistRoute />
          </SessionLayoutGate>
        }
      />
      <Route
        path="/property-admin/tasks/:taskId"
        element={
          <SessionLayoutGate>
            <PropertyTaskDetail />
          </SessionLayoutGate>
        }
      />
      <Route
        path="/admin/invites"
        element={
          <SessionLayoutGate>
            <AdminInvitesRoute />
          </SessionLayoutGate>
        }
      />
      <Route
        path="/admin/invite-codes"
        element={
          <SessionLayoutGate>
            <AdminInviteCodesRoute />
          </SessionLayoutGate>
        }
      />
      <Route
        path="/admin/leads"
        element={
          <SessionLayoutGate>
            <PlatformAdminRoute>
              <LeadsDashboardPage />
            </PlatformAdminRoute>
          </SessionLayoutGate>
        }
      />
      <Route
        path="/admin/overview"
        element={
          <SessionLayoutGate>
            <PlatformAdminRoute>
              <PlatformOverviewPage />
            </PlatformAdminRoute>
          </SessionLayoutGate>
        }
      />
      <Route
        path="/admin/join-requests"
        element={
          <SessionLayoutGate>
            <AdminJoinRequestsRoute />
          </SessionLayoutGate>
        }
      />
      <Route path="/property-admin/join-requests" element={<Navigate to="/property-admin/people?tab=review" replace />} />
      <Route path="/*" element={<AppMain />} />
    </Routes>
    </>
  );
}

function AppMain() {
  const { session, loading, user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const {
    ready: propertyReady,
    memberships,
    currentPropertyId,
    setCurrentPropertyId,
    isGuest,
    isDemoPropertyMock,
  } = useProperty();
  const hasActiveMembership = useHasActivePropertyMembership(user?.id, propertyReady);
  const publicPath = isPublicPath(location.pathname);

  useEffect(() => {
    if (publicPath) return;
    if (!session || isDemoPropertyMock || !propertyReady) return;
    if (currentPropertyId || memberships.length === 0) return;
    setCurrentPropertyId(memberships[0].propertyId);
  }, [publicPath, session, isDemoPropertyMock, propertyReady, currentPropertyId, memberships, setCurrentPropertyId]);

  if (
    !publicPath &&
    (loading ||
      (session && !isDemoPropertyMock && !propertyReady) ||
      (session && !isDemoPropertyMock && hasActiveMembership === null) ||
      (session && !isDemoPropertyMock && !currentPropertyId))
  ) {
    return <PropertyBootstrapLoading />;
  }

  // ── Home guard: default-deny for authenticated '/' access ──────────────
  // isGuest and isDemoPropertyMock are exempt.
  // NOTE: '/' is treated as a public path by isPublicPath(), so the generic
  // loading spinner does NOT cover it — this guard owns its own loading state.
  const urlPropertyId = (searchParams.get('propertyId') || '').trim();
  if (!isGuest && !isDemoPropertyMock && location.pathname === '/') {
    // 1a. No session + specific property in URL → /entry for OTP flow
    if (!session && urlPropertyId) {
      return <Navigate to={'/entry?propertyId=' + encodeURIComponent(urlPropertyId)} replace />;
    }
    // 1b. No session + no propertyId → fall through; existing `if (!session)` below renders <Auth />

    // 2. Session present: enforce active membership
    if (session) {
      // Wait for auth, membership, and current property — never default-allow
      if (
        loading ||
        !propertyReady ||
        hasActiveMembership === null ||
        !currentPropertyId
      ) {
        return <PropertyBootstrapLoading />;
      }

      // No active membership at all → /demo
      if (hasActiveMembership === false || memberships.length === 0) {
        return <Navigate to="/demo" replace />;
      }

      // Specific propertyId: must be a member of THAT property
      if (urlPropertyId) {
        const isMember = memberships.some((m) => samePropertyId(m.propertyId, urlPropertyId));
        if (!isMember) {
          return <Navigate to="/demo" replace />;
        }
      }
      // No urlPropertyId: ≥1 active membership → allow; PropertyContext picks default
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  const guestHome =
    !session &&
    isGuest &&
    currentPropertyId &&
    location.pathname === '/' &&
    searchParams.get('guest') === '1';

  if (guestHome) {
    return (
      <Layout>
        <Dashboard />
      </Layout>
    );
  }

  if (!session) {
    if (isMeetingDetailDeepLink(location.pathname)) {
      const target = location.pathname + location.search + location.hash;
      savePendingRedirect(target);
      return <Navigate to="/login" replace />;
    }
    return <Auth />;
  }

  if ((location.pathname === '/' || location.pathname === '/register') && (memberships.length === 0 || hasActiveMembership === false)) {
    return <Auth />;
  }

  if (!publicPath && !isDemoPropertyMock && (memberships.length === 0 || hasActiveMembership === false)) {
    return <NoActiveMembershipGate />;
  }

  if (
    !publicPath &&
    !isDemoPropertyMock &&
    location.pathname !== '/owner-voting' &&
    !currentPropertyId
  ) {
    return <PropertyBootstrapLoading />;
  }

  return (
    <Layout>
      <AuthenticatedRoutes />
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <PropertyProvider>
            <AppContent />
          </PropertyProvider>
          <PWAInstallPrompt />
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
