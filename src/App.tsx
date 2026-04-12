import type { ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useSearchParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { PropertyProvider, useProperty } from './contexts/PropertyContext';
import { PropertyEntry } from './pages/PropertyEntry';
import { Auth } from './components/Auth';
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
import { FinanceInvoiceDeepLink, FinanceInvoicesListDeepLink } from './pages/finance/FinanceInvoiceRoutes';
import { OwnerInfo } from './pages/OwnerInfo';
import { ManagerTasks } from './pages/ManagerTasks';
import { ManagerTaskDetail } from './pages/ManagerTaskDetail';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';
import { Hiring } from './pages/Hiring';
import { Compliance } from './pages/Compliance';
import { MeetingDetail } from './pages/meeting/MeetingDetail';
import { Pricing } from './pages/Pricing';
import { Contact } from './pages/Contact';
import { PropertyPicker } from './pages/PropertyPicker';
import JoinWithCode from '@/pages/JoinWithCode';
import { JoinRequestPage } from './pages/JoinRequestPage';
import JoinPendingPage from './pages/join/JoinPendingPage';
import JoinRejectedPage from './pages/join/JoinRejectedPage';
import JoinInvalidPage from './pages/join/JoinInvalidPage';
import JoinInviteLandingPage from './pages/join/JoinInviteLandingPage';
import { PropertyAdminHub } from './pages/property-admin/PropertyAdminHub';
import { PropertyAdminInvites } from './pages/property-admin/PropertyAdminInvites';
import { PropertyInviteAnalytics } from './pages/property-admin/PropertyInviteAnalytics';
import { PropertyTaskDetail } from './pages/property-admin/PropertyTaskDetail';
import { AdminInvites } from './pages/admin/AdminInvites';
import { AdminInviteCodes } from './pages/admin/AdminInviteCodes';
import AdminJoinRequests from './pages/admin/AdminJoinRequests';
import { JoinAccessGate } from './pages/JoinAccessGate';
import { PostLoginPropertyRedirect } from './components/PostLoginPropertyRedirect';
import { canManagePropertyInvites, canReviewJoinRequestsAsStaff } from './lib/propertyPermissions';
import type { UserRole } from './lib/supabase';
import { useHasActivePropertyMembership } from './hooks/useHasActivePropertyMembership';
import { samePropertyId } from './lib/propertyIdMatch';

function PricingRoute() {
  const { session } = useAuth();
  const { memberships, currentPropertyId } = useProperty();
  if (session && memberships.length > 0 && !currentPropertyId) {
    return <Navigate to="/select-property" replace />;
  }
  if (session) {
    return (
      <Layout>
        <Pricing />
      </Layout>
    );
  }
  return <Pricing />;
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
        <div className="w-12 h-12 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
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

function AdminJoinRequestsRoute() {
  return (
    <AdminStaffRoute canAccess={canReviewJoinRequestsAsStaff}>
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
        <div className="w-12 h-12 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
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

function PropertyAdminLayoutRoute() {
  const { session } = useAuth();
  const { memberships, currentPropertyId } = useProperty();
  if (!session) return <Navigate to="/" replace />;
  if (!memberships.length || !currentPropertyId) {
    return <Navigate to="/" replace />;
  }
  return (
    <Layout>
      <PropertyAdminHub />
    </Layout>
  );
}

function JoinRequestRoute() {
  return <JoinRequestPage />;
}

function SelectPropertyRoute() {
  const { session } = useAuth();
  const { memberships, currentPropertyId, ready } = useProperty();
  if (!session) return <Navigate to="/" replace />;
  if (!ready) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (memberships.length === 0) return <Navigate to="/" replace />;
  if (memberships.length === 1) return <Navigate to="/" replace />;
  if (currentPropertyId) return <Navigate to="/" replace />;
  return <PropertyPicker />;
}

function AppContent() {
  return (
    <>
      <PostLoginPropertyRedirect />
      <Routes>
      <Route path="/p/:code" element={<PropertyEntry />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/pricing" element={<PricingRoute />} />
      <Route path="/contact" element={<ContactRoute />} />
      <Route path="/join/pending" element={<JoinPendingPage />} />
      <Route path="/join/rejected" element={<JoinRejectedPage />} />
      <Route path="/join/invalid" element={<JoinInvalidPage />} />
      <Route path="/join/welcome" element={<JoinInviteLandingPage />} />
      <Route path="/join" element={<JoinRequestRoute />} />
      <Route path="/invite" element={<JoinWithCode />} />
      <Route path="/dashboard" element={<SessionDashboardRoute />} />
      <Route path="/join-request" element={<JoinRequestRoute />} />
      <Route path="/select-property" element={<SelectPropertyRoute />} />
      <Route path="/property-admin" element={<PropertyAdminLayoutRoute />} />
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
        path="/admin/join-requests"
        element={
          <SessionLayoutGate>
            <AdminJoinRequestsRoute />
          </SessionLayoutGate>
        }
      />
      <Route
        path="/property-admin/join-requests"
        element={
          <SessionLayoutGate>
            <AdminJoinRequestsRoute />
          </SessionLayoutGate>
        }
      />
      <Route path="/*" element={<AppMain />} />
    </Routes>
    </>
  );
}

function AppMain() {
  const { session, loading, user } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { ready: propertyReady, currentPropertyId, memberships, isGuest } = useProperty();
  const hasActiveMembership = useHasActivePropertyMembership(user?.id, propertyReady);

  if (loading || (session && !propertyReady) || (session && hasActiveMembership === null)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

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

  return (
    <>
      {session ? (
        hasActiveMembership === false ? (
          <JoinAccessGate />
        ) : !currentPropertyId ? (
          <Navigate to="/select-property" replace />
        ) : (
          <Layout>
            <AuthenticatedRoutes />
          </Layout>
        )
      ) : (
        <Auth />
      )}
    </>
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
