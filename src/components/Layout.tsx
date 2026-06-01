import { ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  ShoppingCart,
  Vote,
  DollarSign,
  Users,
  Menu,
  X,
  LogOut,
  CircleUser as UserCircle,
  Settings,
  FileText,
  Briefcase,
  CalendarDays,
  FileSearch,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import {
  canAccessPropertyPeoplePageFromContext,
  canAccessPropertySettingsPageFromContext,
  canReviewJoinRequestsFromContext,
} from '../lib/propertyPermissions';
import { useLanguage, LANGUAGE_USER_STORAGE_KEY } from '../contexts/LanguageContext';
import { samePropertyId } from '../lib/propertyIdMatch';
import { PWAInstallButton } from './PWAInstallButton';
import { SidebarPromoCard } from './SidebarPromoCard';
import { UserNotificationToast } from './UserNotificationToast';
import { DemoGeneratedDataProvider } from '../contexts/DemoGeneratedDataContext';
import { DemoCreatePropertyCtaButton } from './onboarding/DemoCreatePropertyCta';
import { realPropertyJoinPath } from '@/lib/propertyEntryRoutes';
import { isPlatformAdmin } from '@/lib/permissions';
import { meetingsNavHref } from '@/lib/meetingPermissions';

interface LayoutProps {
  children: ReactNode;
}

function isModulePathActive(location: ReturnType<typeof useLocation>, path: string): boolean {
  if (path === '/meetings' || path === '/owner-voting') {
    const p = location.pathname;
    return (
      p === '/meetings' ||
      p.startsWith('/meetings/') ||
      p === '/owner-voting' ||
      p === '/voting' ||
      p.startsWith('/voting/')
    );
  }
  if (path === '/procurement') {
    return location.pathname === '/procurement' || location.pathname.startsWith('/procurement/');
  }
  if (path === '/manager-tasks') {
    return location.pathname === '/manager-tasks';
  }
  if (path === '/manager-tasks?task_type=dispute') {
    return (
      location.pathname === '/manager-tasks' &&
      new URLSearchParams(location.search).get('task_type') === 'dispute'
    );
  }
  if (path.includes('?')) {
    const [p, query] = path.split('?');
    if (location.pathname !== p) return false;
    const want = new URLSearchParams(query);
    const have = new URLSearchParams(location.search);
    for (const [k, v] of want.entries()) {
      if (have.get(k) !== v) return false;
    }
    return true;
  }
  return location.pathname === path;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { profile, signOut, session } = useAuth();
  const {
    memberships,
    currentPropertyId,
    setCurrentPropertyId,
    roleInProperty,
    isDemoMode,
    guestPropertyCode,
    isDemoPropertyMock,
  } = useProperty();
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

  const showPeopleNav = canAccessPropertyPeoplePageFromContext(roleInProperty, memberships);
  const showSettingsNav = canAccessPropertySettingsPageFromContext(roleInProperty, memberships);
  const showAuditLogNav = canReviewJoinRequestsFromContext(roleInProperty, memberships);

  const isDashboardHome =
    location.pathname === '/' ||
    location.pathname === '/dashboard' ||
    location.pathname === '/demo-home' ||
    location.pathname === '/demo-property' ||
    location.pathname === '/demo-property/' ||
    (location.pathname === '/' && new URLSearchParams(location.search).get('mode') === 'demo');
  const homeActive = isDashboardHome;
  const onDemoPropertyRoute = location.pathname.startsWith('/demo-property');

  const quickModules = useMemo(() => {
    if (isDemoPropertyMock) {
      if (location.pathname.startsWith('/demo-property')) {
        return [
          { path: '/demo-property', icon: Home, label: language === 'en' ? 'Overview' : '总览', iconBg: 'bg-clearstrata-brand-500' },
          {
            path: '/demo-property/finance',
            icon: DollarSign,
            label: language === 'en' ? 'Expense Transparency' : '支出透明',
            iconBg: 'bg-clearstrata-brand-600',
          },
          {
            path: '/demo-property#demo-council-decisions',
            icon: Vote,
            label: language === 'en' ? 'Council Decisions' : 'Council 决策',
            iconBg: 'bg-violet-600',
          },
          {
            path: '/demo-property#demo-local-services',
            icon: Briefcase,
            label: language === 'en' ? 'Local Services' : '物业服务',
            iconBg: 'bg-sky-500',
          },
        ] as Array<{ path: string; icon: LucideIcon; label: string; iconBg: string }>;
      }
      return [
        { path: '/?mode=demo', icon: Home, label: t('nav_dashboard'), iconBg: 'bg-clearstrata-brand-500' },
        { path: '/finance?mode=demo', icon: DollarSign, label: t('nav_finance'), iconBg: 'bg-clearstrata-brand-600' },
        {
          path: '/property-admin?mode=demo',
          icon: Users,
          label: language === 'en' ? 'Members' : '成员',
          iconBg: 'bg-sky-500',
        },
      ] as Array<{ path: string; icon: LucideIcon; label: string; iconBg: string }>;
    }
    if (isDemoMode) {
      return [
        { path: '/demo/voting', icon: Vote, label: t('nav_voting'), iconBg: 'bg-purple-500' },
        { path: '/demo/finance', icon: DollarSign, label: t('nav_finance'), iconBg: 'bg-clearstrata-brand-600' },
        { path: '/demo/owner-info', icon: Users, label: t('nav_owner_info'), iconBg: 'bg-sky-500' },
        { path: '/demo/compliance', icon: FileText, label: t('nav_help_compliance'), iconBg: 'bg-indigo-500' },
      ] as Array<{ path: string; icon: LucideIcon; label: string; iconBg: string }>;
    }
    return [
      { path: '/owner-info', icon: Users, label: t('nav_owner_info'), iconBg: 'bg-sky-500' },
      { path: '/manager-tasks', icon: Briefcase, label: t('nav_disputes'), iconBg: 'bg-clearstrata-brand-700' },
      { path: '/procurement', icon: ShoppingCart, label: t('nav_procurement'), iconBg: 'bg-blue-500' },
      { path: '/compliance', icon: FileText, label: t('nav_help_compliance'), iconBg: 'bg-indigo-500' },
      { path: '/finance', icon: DollarSign, label: t('nav_finance'), iconBg: 'bg-clearstrata-brand-600' },
      { path: meetingsNavHref(roleInProperty), icon: CalendarDays, label: t('nav_meetings_records'), iconBg: 'bg-violet-600' },
    ] as Array<{ path: string; icon: LucideIcon; label: string; iconBg: string }>;
  }, [t, isDemoMode, isDemoPropertyMock, location.pathname, language, roleInProperty]);

  const systemNavItems = useMemo(
    () =>
      [
        ...(showPeopleNav
          ? [{ path: '/property-admin/people', icon: Users, label: t('nav_people_management') }]
          : []),
        ...(showSettingsNav
          ? [{ path: '/property-admin/settings', icon: Settings, label: t('nav_property_settings') }]
          : []),
        ...(showAuditLogNav
          ? [{ path: '/property-admin/audits', icon: FileSearch, label: t('nav_audit_log') }]
          : []),
      ] as Array<{ path: string; icon: LucideIcon; label: string }>,
    [showPeopleNav, showSettingsNav, showAuditLogNav, t],
  );

  const showSystemSection = !isDemoMode && !isDemoPropertyMock && systemNavItems.length > 0;
  const showPlatformSection = Boolean(session) && isPlatformAdmin(profile as any);

  const platformSection = showPlatformSection ? (
    <div className="border-t border-gray-200 px-3 py-5 pb-8">
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-gray-400 text-center">
        {language === 'en' ? 'Platform admin' : '平台管理'}
      </p>
      <div className="mt-2 flex flex-wrap justify-center gap-2">
        <Link
          to="/admin/overview"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50"
          onClick={() => setMobileMenuOpen(false)}
        >
          {language === 'en' ? 'Overview' : '平台总览'}
        </Link>
        <Link
          to="/admin/leads"
          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 hover:bg-gray-50"
          onClick={() => setMobileMenuOpen(false)}
        >
          {language === 'en' ? 'Sales leads' : '销售线索'}
        </Link>
      </div>
    </div>
  ) : null;

  const renderSystemNavButton = useCallback(
    (path: string, Icon: LucideIcon, label: string) => {
      const active =
        path === '/property-admin/people'
          ? location.pathname === '/property-admin/people' ||
            location.pathname === '/property-admin/join-requests'
          : path === '/property-admin/audits'
            ? location.pathname.startsWith('/property-admin/audits')
            : path === '/property-admin/settings'
              ? location.pathname === '/property-admin/settings' ||
                location.pathname.startsWith('/property-admin/unit-whitelist') ||
                location.pathname.startsWith('/property-admin/invite-analytics') ||
                location.pathname.startsWith('/property-admin/invites') ||
                location.pathname.startsWith('/property-admin/tasks')
              : location.pathname === path;
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
          ${active ? 'bg-clearstrata-ui-primary text-white' : 'text-gray-700 hover:bg-gray-100'}
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
            flex min-h-[48px] w-full items-center gap-2.5 rounded-[10px] border px-[14px] py-[10px] text-left transition-colors
            ${
              active
                ? 'border-clearstrata-ui-softBorder bg-clearstrata-ui-soft/90'
                : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50/80'
            }
          `}
        >
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${iconBg}`}>
            <Icon className="text-white" size={18} strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <span className="text-base font-semibold leading-none text-gray-900">{label}</span>
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
      {isDemoMode && guestPropertyCode ? (
        <div className="border-b border-amber-200/80 bg-amber-50 px-4 py-2 text-center text-xs font-semibold text-amber-950 sm:text-sm">
          演示数据，仅供体验
          <span className="mx-2 text-amber-800/80">·</span>
          <Link to={realPropertyJoinPath(guestPropertyCode)} className="font-semibold text-amber-950 underline-offset-2 hover:underline">
            真实成员入口
          </Link>
        </div>
      ) : null}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center gap-2 sm:gap-3 lg:gap-4">
            <div className="flex min-w-0 shrink-0 grow-0 items-center gap-2 lg:gap-4">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="shrink-0 rounded-lg p-2 hover:bg-gray-100 lg:hidden"
              >
                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isDemoPropertyMock && location.pathname.startsWith('/demo-property')) {
                    navigate('/demo-property');
                  } else if (isDemoPropertyMock) {
                    navigate('/?mode=demo');
                  } else if (isDemoMode) {
                    navigate('/demo-home');
                  } else {
                    navigate('/');
                  }
                }}
                className="flex shrink-0 items-center overflow-hidden rounded transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-clearstrata-ui-primary/35 focus-visible:ring-offset-2 max-lg:max-w-[min(7.25rem,42vw)] lg:max-w-none"
              >
                <img
                  src="/clearstrata-hero-logo.png"
                  alt="ClearStrata"
                  className="h-7 w-auto max-h-7 max-w-full object-contain object-left sm:h-8 sm:max-h-8 lg:h-9 lg:max-h-9 lg:max-w-[11rem]"
                />
              </button>
            </div>

            <div className="ml-auto flex min-w-0 shrink items-center justify-end gap-2 overflow-hidden sm:gap-3 lg:min-w-0 lg:flex-1">
              <PWAInstallButton />
              {(isDemoMode || isDemoPropertyMock) && (
                <div className="hidden shrink-0 sm:block">
                  <DemoCreatePropertyCtaButton variant="ghost" />
                </div>
              )}
              {(isDemoMode || (isDemoPropertyMock && !session)) && (
                <div className="hidden shrink-0 items-center gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={() => navigate('/?mode=signup')}
                    className="rounded-lg bg-clearstrata-ui-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive sm:text-sm"
                  >
                    {language === 'en' ? 'Register' : '注册加入'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/')}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-800 sm:text-sm"
                  >
                    {language === 'en' ? 'Log in' : '登录'}
                  </button>
                </div>
              )}
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
              {!isDemoMode && !isDemoPropertyMock && (
                <>
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
                </>
              )}
              <button
                onClick={toggleLanguage}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-gray-200"
              >
                {language === 'en' ? '中文' : 'EN'}
              </button>
              {!isDemoMode && !isDemoPropertyMock && (
                <button
                  onClick={handleLogout}
                  className="rounded-lg p-2 transition-colors hover:bg-gray-100"
                  title={t('auth_logout')}
                >
                  <LogOut size={20} />
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {isDemoPropertyMock && (
        <div className="border-b border-amber-300 bg-amber-50">
          <div className="mx-auto max-w-7xl px-4 py-2.5 text-center text-sm font-medium text-amber-950 sm:px-6 lg:px-8">
            {language === 'en'
              ? 'You are viewing the Demo Property — data is illustrative only, not real.'
              : '当前为演示楼（Demo Property），非真实数据'}
          </div>
        </div>
      )}

      {isDemoMode && !isDemoPropertyMock && (
        <div className="border-b border-clearstrata-ui-softBorder bg-clearstrata-ui-soft">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-clearstrata-brand-950 sm:text-sm sm:px-6 lg:px-8">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="rounded-full bg-clearstrata-brand-600 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white sm:text-xs">
                {language === 'en' ? 'Demo' : '演示'}
              </span>
              <span className="font-medium">
                {language === 'en' ? 'Read-only preview' : '只读体验'}
                {guestPropertyCode ? ` · ${guestPropertyCode}` : ''}
              </span>
            </div>
            <div className="flex shrink-0 gap-2 sm:hidden">
              {(isDemoMode || isDemoPropertyMock) && (
                <DemoCreatePropertyCtaButton variant="ghost" className="px-2.5 py-1 text-xs" />
              )}
              <button
                type="button"
                onClick={() => navigate('/?mode=signup')}
                className="rounded-lg bg-clearstrata-ui-primary px-2.5 py-1 text-xs font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive"
              >
                {language === 'en' ? 'Register' : '注册'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/')}
                className="rounded-lg border border-clearstrata-brand-300 bg-white px-2.5 py-1 text-xs font-medium text-clearstrata-brand-900"
              >
                {language === 'en' ? 'Log in' : '登录'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex min-w-0 lg:items-stretch">
        <aside
          className={`
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
          fixed lg:sticky top-16 left-0 h-[calc(100vh-4rem)]
          w-[15.5rem] shrink-0 border-r border-gray-200 bg-white sm:w-60 lg:w-64
          transition-transform duration-200 ease-in-out
          z-30 overflow-hidden
        `}
        >
          <div className="flex h-full min-h-0 flex-col">
            {!isDemoMode && !isDemoPropertyMock ? (
              <>
                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:thin]">
                  <div className="px-3 pt-2 pb-2">
                    <button
                      type="button"
                      onClick={() => {
                        navigate('/');
                        setMobileMenuOpen(false);
                      }}
                      className={`
                        flex h-14 w-full items-center gap-2.5 rounded-xl px-4 text-left text-[18px] font-semibold transition-colors
                        ${
                          homeActive
                            ? 'bg-clearstrata-ui-primary text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive'
                            : 'bg-gray-100 text-gray-800 hover:bg-[#e8ebea]'
                        }
                      `}
                    >
                      <Home
                        className="shrink-0 text-current"
                        size={20}
                        strokeWidth={2}
                        aria-hidden
                      />
                      <span className="leading-none">{t('nav_dashboard')}</span>
                    </button>
                    <div className="mt-2 space-y-2 pb-2">
                      {quickModules.map((m) => renderModuleCard(m.path, m.icon, m.label, m.iconBg))}
                    </div>
                  </div>

                  {showSystemSection ? (
                    <div className="border-t border-gray-200 px-3 py-5 pb-8">
                      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-400">
                        {t('nav_group_system')}
                      </p>
                      <div className="space-y-1">
                        {systemNavItems.map((item) => renderSystemNavButton(item.path, item.icon, item.label))}
                      </div>
                    </div>
                  ) : null}

                  {platformSection}
                </div>
                <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-2">
                  <SidebarPromoCard language={language} />
                </div>
              </>
            ) : (
              <>
                <div
                  className={`shrink-0 px-2.5 sm:px-3 lg:pb-0 ${
                    isDashboardHome ? 'pt-2 pb-0 lg:pt-3' : 'pt-3 pb-0 lg:pt-5'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      if (isDemoPropertyMock && location.pathname.startsWith('/demo-property')) {
                        navigate('/demo-property');
                      } else if (isDemoPropertyMock) {
                        navigate('/?mode=demo');
                      } else if (isDemoMode) {
                        navigate('/demo-home');
                      } else {
                        navigate('/');
                      }
                      setMobileMenuOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left transition-colors sm:gap-2.5 sm:px-3.5 ${
                      homeActive ? 'bg-clearstrata-ui-primary text-white shadow-md hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    <Home className="h-5 w-5 shrink-0" size={20} />
                    <span className="text-[15px] font-semibold sm:text-base">{t('nav_dashboard')}</span>
                  </button>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain [scrollbar-width:thin] max-lg:max-h-[min(60vh,28rem)]">
                  <div className="shrink-0 px-2.5 pt-1 sm:px-3 lg:pt-2">
                    <div className="space-y-0.5 pb-3 lg:space-y-1">
                      {quickModules.map((m) => renderModuleCard(m.path, m.icon, m.label, m.iconBg))}
                    </div>
                  </div>
                </div>

                {platformSection}

                <div className="shrink-0 border-t border-gray-100 px-3 py-3 lg:px-3">
                  <SidebarPromoCard language={language} />
                </div>
              </>
            )}
          </div>
        </aside>

        {mobileMenuOpen && (
          <div
            className="fixed inset-0 top-16 z-20 bg-black bg-opacity-50 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <main
          className={`min-w-0 w-full flex-1 ${
            isDashboardHome
              ? 'max-w-7xl px-4 pb-5 pt-0 sm:px-5 sm:pb-6 lg:pb-6 lg:pl-8 lg:pr-8 lg:pt-0'
              : 'max-w-none px-4 py-4 sm:px-5 sm:py-5 lg:pl-8 lg:pr-8 lg:py-6'
          }`}
        >
          <UserNotificationToast />
          {(isDemoPropertyMock || onDemoPropertyRoute) ? (
            <DemoGeneratedDataProvider>{children}</DemoGeneratedDataProvider>
          ) : (
            children
          )}
        </main>
      </div>
    </div>
  );
}
