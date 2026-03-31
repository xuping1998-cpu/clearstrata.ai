import { ReactNode, useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, ShoppingCart, Vote, Wrench, DollarSign, Users, MessageSquare, Menu, X, LogOut, CircleUser as UserCircle, Shield } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage, LANGUAGE_USER_STORAGE_KEY } from '../contexts/LanguageContext';
import { PWAInstallButton } from './PWAInstallButton';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const { t, language, toggleLanguage, setLanguage } = useLanguage();

  useEffect(() => {
    if (!profile?.id) return;
    try {
      const lastUser = localStorage.getItem(LANGUAGE_USER_STORAGE_KEY);
      if (lastUser !== profile.id) {
        localStorage.setItem(LANGUAGE_USER_STORAGE_KEY, profile.id);
        if (profile.preferred_language === 'zh' || profile.preferred_language === 'en') {
          setLanguage(profile.preferred_language);
        }
      }
    } catch {
      /* ignore */
    }
  }, [profile?.id, profile?.preferred_language, setLanguage]);

  const menuItems = [
    { path: '/', icon: Home, label: t('nav_dashboard') },
    { path: '/procurement', icon: ShoppingCart, label: t('nav_procurement') },
    { path: '/voting', icon: Vote, label: t('nav_voting') },
    { path: '/maintenance', icon: Wrench, label: t('nav_maintenance') },
    { path: '/finance', icon: DollarSign, label: t('nav_finance') },
    { path: '/owner-info', icon: Users, label: t('nav_owner_info') },
    { path: '/disputes', icon: MessageSquare, label: t('nav_communication') },
    ...(profile?.role === 'admin' || profile?.role === 'council'
      ? [{ path: '/admin', icon: Shield, label: t('nav_admin') }]
      : []),
  ];

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <h1 className="text-2xl font-bold text-[#1D9E75]">
                {language === 'en' ? 'clearstrata.ai' : '清涟.ai'}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <PWAInstallButton />
              <button
                onClick={() => navigate('/profile')}
                className="hidden sm:flex items-center gap-2 text-left hover:bg-gray-100 rounded-lg p-2 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {language === 'en' ? profile?.full_name_en : profile?.full_name_zh || profile?.full_name_en}
                  </div>
                  <div className="text-xs text-gray-500">{t(profile?.role || 'owner')}</div>
                </div>
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="sm:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={language === 'en' ? 'Profile' : '个人信息'}
              >
                <UserCircle size={20} />
              </button>
              <button
                onClick={toggleLanguage}
                className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-medium"
              >
                {language === 'en' ? '中文' : 'EN'}
              </button>
              <button
                onClick={handleLogout}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                title={t('auth_logout')}
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)]
          w-64 bg-white border-r border-gray-200
          transition-transform duration-200 ease-in-out
          z-30 overflow-y-auto
        `}>
          <nav className="p-4 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setMobileMenuOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-lg
                    transition-colors text-left
                    ${isActive
                      ? 'bg-[#1D9E75] text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                    }
                  `}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20 top-16"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
