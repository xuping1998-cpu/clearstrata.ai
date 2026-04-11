import { ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
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

function isModulePathActive(location: ReturnType<typeof useLocation>, path: string): boolean {
  if (path === '/manager-tasks?task_type=dispute') {
    return (
      location.pathname === '/manager-tasks' &&
      new URLSearchParams(location.search).get('task_type') === 'dispute'
    );
  }
  return location.pathname === path;
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

  const isDashboardHome = location.pathname === '/' || location.pathname === '/dashboard';
  const homeActive = isDashboardHome;

  const quickModules = useMemo(
    () =>
      [
        { path: '/procurement', icon: ShoppingCart, label: t('nav_procurement'), iconBg: 'bg-blue-500' },
        { path: '/voting', icon: Vote, label: t('nav_voting'), iconBg: 'bg-purple-500' },
        { path: '/finance', icon: DollarSign, label: t('nav_finance'), iconBg: 'bg-green-500' },
        { path: '/owner-info', icon: Users, label: t('nav_owner_info'), iconBg: 'bg-sky-500' },
        {
          path: '/manager-tasks?task_type=dispute',
          icon: Scale,
          label: t('nav_disputes'),
          iconBg: 'bg-red-500',
        },
        { path: '/compliance', icon: FileText, label: t('nav_help_compliance'), iconBg: 'bg-indigo-500' },
      ] as Array<{ path: string; icon: LucideIcon; label: string; iconBg: string }>,
    [t],
  );

  const systemNavItems = useMemo(
    () =>
      [
        ...(showJoinRequestsNav && !showJoinRequestReviewCoreNav
          ? [{ path: '/admin/join-requests', icon: ClipboardList, label: t('nav_join_requests') }]
          : []),
        ...(showInviteCodesNav
          ? [{ path: '/admin/invites', icon: KeyRound, label: t('nav_invite_codes') }]
          : []),
        ...(showPropertyAdmin
          ? [{ path: '/property-admin', icon: Users, label: t('nav_property_admin_sidebar') }]
          : []),
      ] as Array<{ path: string; icon: LucideIcon; label: string }>,
    [
      showJoinRequestsNav,
      showJoinRequestReviewCoreNav,
      showInviteCodesNav,
      showPropertyAdmin,
      t,
    ],
  );

  const showSystemSection = systemNavItems.length > 0;

  const renderSystemNavButton = useCallback(
    (path: string, Icon: LucideIcon, label: string) => {
      const active = location.pathname === path;
      return (
        <button
          key={path}
          type="button"
          onClick={() => {
            navigate(path);
            setMobileMenuOpen(false);
          }}
          className={`
          flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] font-medium
          transition-colors
          ${active ? 'bg-[#1D9E75] text-white' : 'text-gray-700 hover:bg-gray-100'}
        `}
        >
          <Icon size={18} />
          <span className="leading-snug">{label}</span>
        </button>
      );
    },
    [location.pathname, navigate],
  );

  const renderModuleCard = useCallback(
    (path: string, Icon: LucideIcon, label: string, iconBg: string) => {
      const active = isModulePathActive(location, path);
      return (
        <button
          key={path}
          type="button"
          onClick={() => {
            navigate(path);
            setMobileMenuOpen(false);
          }}
          className={`
            flex min-h-[54px] w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left shadow-sm transition-all
            ${
              active
                ? 'border-emerald-300 bg-emerald-50/80 ring-1 ring-emerald-200'
                : 'border-gray-200 bg-white hover:border-emerald-200 hover:shadow-sm'
            }
          `}
        >
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className="h-4 w-4 text-white" size={16} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-semibold leading-snug text-gray-900">{label}</div>
          </div>
        </button>
      );
    },
    [location, navigate],
  );

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="text-2xl font-bold text-[#1D9E75] transition-opacity hover:opacity-90"
              >
                {language === 'en' ? 'clearstrata.ai' : '清涟.ai'}
              </button>
            </div>

            <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
              <PWAInstallButton />
              {memberships.length >= 1 && currentPropertyId && (
                <div className="flex min-w-0 shrink items-center border-r border-gray-200 pr-2 text-sm text-gray-600 sm:pr-3">
                  {memberships.length === 1 ? (
                    <span
                      className="inline max-w-[min(140px,28vw)] truncate text-xs font-medium text-gray-800 sm:max-w-[200px] sm:text-sm"
                      title={currentPropertyDisplayName}
                    >
                      {currentPropertyDisplayName}
                    </span>
                  ) : (
                    <label className="flex min-w-0 items-center gap-1.5 sm:gap-2">
                      <span className="hidden shrink-0 whitespace-nowrap text-xs text-gray-500 md:inline">
                        {t('select_property')}
                      </span>
                      <select
                        value={currentPropertyId}
                        onChange={(e) => setCurrentPropertyId(e.target.value)}
                        className="min-w-0 max-w-[min(160px,42vw)] rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-900 sm:max-w-[220px] sm:text-sm"
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
                className="hidden rounded-lg p-2 text-left transition-colors hover:bg-gray-100 sm:flex sm:items-center sm:gap-2"
              >
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {language === 'en' ? profile?.full_name_en : profile?.full_name_zh || profile?.full_name_en}
                  </div>
                  <div
                    className="text-xs text-gray-500"
                    title={language === 'en' ? 'Role in current property' : '当前物业中的角色'}
                  >
                    {roleInProperty ? t(roleInProperty) : language === 'en' ? '—' : '未选择'}
                  </div>
                </div>
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100 sm:hidden"
                title={language === 'en' ? 'Profile' : '个人信息'}
              >
                <UserCircle size={20} />
              </button>
              <button
                onClick={toggleLanguage}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-200"
              >
                {language === 'en' ? '中文' : 'EN'}
              </button>
              <button
                onClick={handleLogout}
                className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                title={t('auth_logout')}
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-w-0 lg:items-start">
        <aside
          className={`
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)]
          w-52 shrink-0 border-r border-gray-200 bg-white
          transition-transform duration-200 ease-in-out
          z-30 overflow-hidden
        `}
        >
          <div className="flex h-full min-h-0 flex-col lg:min-h-0">
            <div className={`shrink-0 px-2.5 sm:px-3 ${isDashboardHome ? 'pt-3 pb-0' : 'pt-5 pb-0'}`}>
              <button
                type="button"
                onClick={() => {
                  navigate('/');
                  setMobileMenuOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors sm:gap-2.5 sm:px-3.5 ${
                  homeActive ? 'bg-[#1D9E75] text-white shadow-md' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                <Home className="h-5 w-5 shrink-0" size={20} />
                <span className="text-[15px] font-semibold sm:text-base">{t('nav_dashboard')}</span>
              </button>
            </div>

            <div className="shrink-0 px-2.5 pt-2 sm:px-3">
              <div className="space-y-1">
                {quickModules.map((m) => renderModuleCard(m.path, m.icon, m.label, m.iconBg))}
                {showJoinRequestReviewCoreNav && (
                  <button
                    type="button"
                    onClick={() => {
                      navigate('/admin/join-requests');
                      setMobileMenuOpen(false);
                    }}
                    className={`
                      flex min-h-[54px] w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left shadow-sm transition-all
                      ${
                        location.pathname === '/admin/join-requests'
                          ? 'border-emerald-300 bg-emerald-50/80 ring-1 ring-emerald-200'
                          : 'border-gray-200 bg-white hover:border-emerald-200 hover:shadow-sm'
                      }
                    `}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500">
                      <ClipboardList className="h-4 w-4 text-white" size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[15px] font-semibold leading-snug text-gray-900">
                        {t('nav_review_applications')}
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            {showSystemSection ? (
              <div className="mt-2 min-h-0 flex-1 overflow-y-auto border-t border-gray-100 px-2.5 pt-3 sm:px-3">
                <p className="mb-1 px-1 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                  {t('nav_group_system')}
                </p>
                <div className="space-y-0.5">
                  {systemNavItems.map((item) => renderSystemNavButton(item.path, item.icon, item.label))}
                </div>
              </div>
            ) : (
              <div className="min-h-0 flex-1" aria-hidden />
            )}

            <div className="mt-auto shrink-0 px-3 pb-4 pt-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-4">
                <div className="mb-2 text-center text-base font-medium leading-snug text-gray-900">
                  {language === 'en' ? 'Scan to view spending' : '扫码查看支出'}
                </div>
                <img
                  src="/qr-code.png"
                  alt=""
                  className="mx-auto h-28 w-28 object-contain"
                />
                <div className="mt-2 text-center text-xs text-gray-500">
                  {language === 'en' ? 'Make every expense transparent' : '让每一笔支出透明'}
                </div>
              </div>
            </div>
          </div>
        </aside>

        {mobileMenuOpen && (
          <div
            className="fixed inset-0 top-16 z-20 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <main
          className={`min-w-0 w-full max-w-7xl flex-1 ${
            isDashboardHome
              ? 'px-3 pb-5 pt-0 sm:px-4 sm:pb-6 lg:pb-6 lg:pl-2 lg:pr-5 lg:pt-0'
              : 'px-3 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8'
          }`}
        >
          <UserNotificationToast />
          {children}
        </main>
      </div>
    </div>
  );
}
