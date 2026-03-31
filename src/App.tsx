import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AnnouncementInboxProvider } from './contexts/AnnouncementInboxContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { Auth } from './components/Auth';
import { Layout } from './components/Layout';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { Dashboard } from './pages/Dashboard';
import { Procurement } from './pages/Procurement';
import { Voting } from './pages/Voting';
import { Finance } from './pages/Finance';
import { OwnerInfo } from './pages/OwnerInfo';
import { DisputeResolution } from './pages/DisputeResolution';
import { Admin } from './pages/Admin';
import { Profile } from './pages/Profile';
import { Hiring } from './pages/Hiring';
import { Compliance } from './pages/Compliance';
import { MeetingDetail } from './pages/meeting/MeetingDetail';

function AppContent() {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/procurement" element={<Procurement />} />
        <Route path="/voting" element={<Voting />} />
        <Route path="/voting/:id" element={<MeetingDetail />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/hiring" element={<Hiring />} />
        <Route path="/owner-info" element={<OwnerInfo />} />
        <Route path="/disputes" element={<DisputeResolution />} />
        <Route path="/compliance" element={<Compliance />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <LanguageProvider>
          <AnnouncementInboxProvider>
            <AppContent />
          </AnnouncementInboxProvider>
          <PWAInstallPrompt />
        </LanguageProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
