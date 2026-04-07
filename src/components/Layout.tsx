import { ReactNode, useState, useEffect, useMemo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  ShoppingCart,
  Vote,
  DollarSign,
  Users,
  Scale,
  Menu,
  X,
  LogOut,
  CircleUser as UserCircle,
  KeyRound,
  ClipboardList,
  FileText,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import {
  canManagePropertyAdminFromContext,
  canReviewJoinRequestsFromContext,
  canManagePropertyInvitesFromContext,
  canShowJoinRequestReviewNavFromContext,
} from '../lib/propertyPermissions';
import { useLanguage, LANGUAGE_USER_STORAGE_KEY } from '../contexts/LanguageContext';
import { samePropertyId } from '../lib/propertyIdMatch';
import { PWAInstallButton } from './PWAInstallButton';
import { UserNotificationToast } from './UserNotificationToast';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { profile, signOut } = useAuth();
  const { memberships, currentPropertyId, setCurrentPropertyId, roleInProperty } = useProperty();
  const { t, language, toggleLanguage, setLanguage } = useLanguage();

  const currentMembership = useMemo(
    () =>
      currentPropertyId
        ? memberships.find((m) => samePropertyId(m.propertyId, currentPropertyId))
        : undefined,
    [memberships, currentPropertyId],
  );
  const currentPropertyDisplayName = currentMembership?.name ?? memberships[0]?.name;

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

  const showPropertyAdmin =
    canManagePropertyAdminFromContext(roleInProperty, memberships) ||
    canReviewJoinRequestsFromContext(roleInProperty, memberships);
  const showInviteCodesNav = canManagePropertyInvitesFromContext(roleInProperty, memberships);
  const showJoinRequestsNav = canReviewJoinRequestsFromContext(roleInProperty, memberships);
  const showJoinRequestReviewCoreNav = canShowJoinRequestReviewNavFromContext(roleInProperty, memberships);
  const showSystemSection = showPropertyAdmin || showInviteCodesNav || showJoinRequestsNav;

  const isDashboardHome = location.pathname === '/' || location.pathname === '/dashboard';

  const coreNavItems = [
    { path: '/', icon: Home, label: t('nav_dashboard') },
    { path: '/procurement', icon: ShoppingCart, label: t('nav_procurement') },
    { path: '/voting', icon: Vote, label: t('nav_voting') },
    { path: '/finance', icon: DollarSign, label: t('nav_finance') },
    { path: '/owner-info', icon: Users, label: t('nav_owner_info') },
    ...(showJoinRequestReviewCoreNav
      ? [{ path: '/admin/join-requests', icon: ClipboardList, label: t('nav_review_applications') }]
      : []),
    { path: '/manager-tasks?task_type=dispute', icon: Scale, label: t('nav_disputes') },
    { path: '/compliance', icon: FileText, label: t('nav_help_compliance') },
  ];

  const systemNavItems = [
    ...(showInviteCodesNav
      ? [{ path: '/admin/invites', icon: KeyRound, label: t('nav_invite_codes') }]
      : []),
    ...(showPropertyAdmin
      ? [{ path: '/property-admin', icon: Users, label: t('nav_property_admin_sidebar') }]
      : []),
  ];

  const isNavActive = (path: string) => {
    if (path === '/') return location.pathname === '/' || location.pathname === '/dashboard';
    if (path === '/manager-tasks?task_type=dispute') {
      return (
        location.pathname === '/manager-tasks' &&
        new URLSearchParams(location.search).get('task_type') === 'dispute'
      );
    }
    return location.pathname === path;
  };

  const renderNavButton = (path: string, Icon: LucideIcon, label: string) => {
    const active = isNavActive(path);
    return (
      <button
        key={path === '/' ? 'home' : path}
        type="button"
        onClick={() => {
          navigate(path);
          setMobileMenuOpen(false);
        }}
        className={`
          w-full flex items-center gap-3 px-4 py-3 rounded-lg
          transition-colors text-left
          ${active ? 'bg-[#1D9E75] text-white' : 'text-gray-700 hover:bg-gray-100'}
        `}
      >
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </button>
    );
  };

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
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-2xl font-bold text-[#1D9E75] hover:opacity-90 transition-opacity"
              >
                {language === 'en' ? 'clearstrata.ai' : '清涟.ai'}
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 justify-end">
              <PWAInstallButton />
              {memberships.length >= 1 && currentPropertyId && (
                <div className="flex min-w-0 items-center shrink text-sm text-gray-600 border-r border-gray-200 pr-2 sm:pr-3">
                  {memberships.length === 1 ? (
                    <span
                      className="inline max-w-[min(140px,28vw)] sm:max-w-[200px] truncate font-medium text-gray-800 text-xs sm:text-sm"
                      title={currentPropertyDisplayName}
                    >
                      {currentPropertyDisplayName}
                    </span>
                  ) : (
                    <label className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                      <span className="hidden md:inline whitespace-nowrap shrink-0 text-xs text-gray-500">
                        {t('select_property')}
                      </span>
                      <select
                        value={currentPropertyId}
                        onChange={(e) => setCurrentPropertyId(e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-1.5 min-w-0 max-w-[min(160px,42vw)] sm:max-w-[220px] text-gray-900 bg-white text-xs sm:text-sm"
                        aria-label={t('select_property')}
                      >
                        {memberships.map((m) => (
                          <option key={m.propertyId} value={m.propertyId}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>
              )}
              <button
                onClick={() => navigate('/profile')}
                className="hidden sm:flex items-center gap-2 text-left hover:bg-gray-100 rounded-lg p-2 transition-colors"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {language === 'en' ? profile?.full_name_en : profile?.full_name_zh || profile?.full_name_en}
                  </div>
                  <div className="text-xs text-gray-500" title={language === 'en' ? 'Role in current property' : '当前物业中的角色'}>
                    {roleInProperty ? t(roleInProperty) : language === 'en' ? '—' : '未选择'}
                  </div>
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
          <nav className="p-4 space-y-6">
            <div className="space-y-1">
              {coreNavItems.map((item) => renderNavButton(item.path, item.icon, item.label))}
            </div>

            {showSystemSection && (
              <div>
                <p className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  {t('nav_group_system')}
                </p>
                <div className="space-y-1">
                  {systemNavItems.map((item) => renderNavButton(item.path, item.icon, item.label))}
                </div>
              </div>
            )}
          </nav>
        </aside>

        {mobileMenuOpen && (
          <div
            className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20 top-16"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <main
          className={`flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 ${
            isDashboardHome
              ? 'pt-1 sm:pt-2 lg:pt-3 pb-3 sm:pb-5 lg:pb-7'
              : 'p-4 sm:p-6 lg:p-8'
          }`}
        >
          <UserNotificationToast />
          {children}
        </main>
      </div>
    </div>
  );
}
