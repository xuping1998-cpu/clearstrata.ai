import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { GUEST_PROPERTY_STORAGE_KEY, useProperty } from '../contexts/PropertyContext';
import { DemoPropertyMockHomePanel } from '@/components/demoProperty/DemoPropertyMockHomePanel';
import { DemoCreatePropertyCtaCard } from '@/components/onboarding/DemoCreatePropertyCta';
import { TrialUpgradeCard } from '@/components/billing/TrialUpgradeCard';
import { ImportantUpdatesDashboardCard } from '@/components/dashboard/ImportantUpdatesDashboardCard';
import { QuickAccessDashboardCard } from '@/components/dashboard/QuickAccessDashboardCard';
import { HomeServicesDashboardCard } from '@/components/dashboard/HomeServicesDashboardCard';
import { supabase } from '@/lib/supabase';
import { getTrialDaysRemaining, getTrialState } from '@/lib/subscription';
import { realPropertyJoinPath } from '@/lib/propertyEntryRoutes';
import { samePropertyId } from '@/lib/propertyIdMatch';
import { meetingsNavHref } from '@/lib/meetingPermissions';
import { useImportantUpdatesBullets } from '@/hooks/useImportantUpdatesBullets';

export function Dashboard() {
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();
  const location = useLocation();
  const { session, user } = useAuth();
  const {
    isGuest,
    isDemoMode,
    guestPropertyCode,
    isDemoPropertyMock,
    currentPropertyId,
    memberships,
    ready: propertyReady,
    roleInProperty,
  } = useProperty();

  const [trialRow, setTrialRow] = useState<{ subscription_status?: string | null; trial_ends_at?: string | null } | null>(null);
  const [trialLoading, setTrialLoading] = useState(false);

  const { bullets: importantUpdatesBullets } = useImportantUpdatesBullets({
    propertyId: currentPropertyId,
    userId: user?.id,
    propertyReady,
    langEn: en,
    meetingsHref: meetingsNavHref(roleInProperty),
  });

  useEffect(() => {
    let cancelled = false;
    const pid = currentPropertyId ? String(currentPropertyId) : '';
    if (!pid || !propertyReady || isDemoMode || isDemoPropertyMock) {
      setTrialRow(null);
      setTrialLoading(false);
      return;
    }
    setTrialRow(null);
    setTrialLoading(true);
    void (async () => {
      try {
        const { data, error } = await (supabase
          .from('properties')
          .select('subscription_status,trial_ends_at')
          .eq('id', pid)
          .maybeSingle() as any);
        if (cancelled) return;
        if (error) {
          setTrialRow(null);
          return;
        }
        setTrialRow(data ?? null);
      } catch {
        /* silent */
      } finally {
        if (!cancelled) setTrialLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPropertyId, propertyReady, isDemoMode, isDemoPropertyMock]);

  const onDemoPropertyRoute = location.pathname.startsWith('/demo-property');

  if (isDemoPropertyMock || onDemoPropertyRoute) {
    return <DemoPropertyMockHomePanel />;
  }

  if (isDemoMode && guestPropertyCode) {
    return (
      <>
        <div className="mb-4">
          <DemoCreatePropertyCtaCard />
        </div>
      </>
    );
  }

  if (isGuest) {
    return (
      <>
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p>{en ? 'You are viewing this property as a guest.' : '您正在以访客模式查看该物业'}</p>
          <p className="mt-1 text-amber-900/90">
            {en ? 'Register to participate in voting and approvals.' : '注册后可参与投票与审批'}
          </p>
          <button
            type="button"
            className="mt-3 rounded-lg bg-clearstrata-ui-primary px-4 py-2 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive"
            onClick={() => {
              try {
                localStorage.removeItem(GUEST_PROPERTY_STORAGE_KEY);
              } catch {
                /* ignore */
              }
              navigate({ pathname: '/', search: '' }, { replace: true });
            }}
          >
            {en ? 'Register as an owner' : '注册成为业主'}
          </button>
        </div>
        <div className="mb-4">
          <DemoCreatePropertyCtaCard />
        </div>
      </>
    );
  }

  // demo/mock/guest early-returns above — only real Home reaches this gate
  // ── Dashboard hard gate: second enforcer after App.tsx guard ─────────────
  {
    const urlPropertyId = new URLSearchParams(location.search).get('propertyId');

    if (!session) {
      return <Navigate to="/login" replace />;
    }

    if (!propertyReady || memberships == null || !currentPropertyId) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-10 h-10 border-4 border-clearstrata-ui-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-gray-700">{en ? 'Loading property records…' : '正在载入物业资料…'}</p>
        </div>
      );
    }

    if (!memberships.length) {
      return <Navigate to="/demo" replace />;
    }

    if (urlPropertyId) {
      const isMember = memberships.some((m) => samePropertyId(m.propertyId, urlPropertyId));
      if (!isMember) {
        return <Navigate to="/demo" replace />;
      }
    }
  }
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="mb-1.5 rounded-lg border border-clearstrata-ui-softBorder bg-clearstrata-ui-soft px-3 py-2 shadow-sm sm:mb-3 sm:rounded-xl sm:px-4 sm:py-2.5 xl:rounded-2xl">
        <div className="flex flex-col gap-1 sm:gap-1.5 lg:flex-row lg:flex-wrap lg:items-center lg:gap-x-4 lg:gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 sm:gap-x-2 sm:gap-y-1.5">
            <p className="text-xs font-semibold leading-tight text-gray-900 sm:text-sm sm:leading-snug">
              {en ? 'Your property was created successfully' : '你的物业已经创建成功'}
            </p>
            <button
              type="button"
              onClick={() => navigate('/property-admin/unit-whitelist')}
              className="inline-flex h-8 min-h-8 shrink-0 items-center justify-center rounded border border-clearstrata-ui-softBorder bg-white px-2 py-0 text-[11px] font-semibold leading-none text-clearstrata-brand-900 hover:bg-clearstrata-brand-50 sm:min-h-[2.25rem] sm:rounded-lg sm:px-2.5 sm:py-1.5 sm:text-sm sm:leading-normal"
            >
              {en ? 'Import units' : '导入房号'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/property-admin/invites')}
              className="inline-flex h-8 min-h-8 shrink-0 items-center justify-center rounded border border-clearstrata-ui-softBorder bg-white px-2 py-0 text-[11px] font-semibold leading-none text-clearstrata-brand-900 hover:bg-clearstrata-brand-50 sm:min-h-[2.25rem] sm:rounded-lg sm:px-2.5 sm:py-1.5 sm:text-sm sm:leading-normal"
            >
              {en ? 'Invite members' : '邀请成员'}
            </button>
          </div>

          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-0.5 sm:flex-wrap sm:gap-x-2 sm:gap-y-1.5 sm:justify-between lg:justify-end xl:flex-nowrap xl:gap-x-3">
            <div className="flex min-w-0 flex-wrap items-baseline gap-x-1.5 gap-y-0 sm:gap-x-2 sm:gap-y-0.5 sm:gap-x-2.5">
              <p className="text-xs font-semibold leading-tight text-gray-900 sm:text-sm sm:leading-snug">
                {en ? "You're on a free ClearStrata trial" : '你正在免费试用 ClearStrata'}
              </p>
              {trialLoading ? (
                <div className="h-4 w-40 animate-pulse rounded bg-gray-200/80" aria-hidden />
              ) : (
                <p className="text-[11px] leading-tight text-gray-700 sm:text-sm sm:leading-snug">
                  {(() => {
                    const ends = trialRow?.trial_ends_at ?? null;
                    const daysLeft = getTrialDaysRemaining(ends);
                    const d = ends ? new Date(String(ends)) : null;
                    const endText =
                      d && !Number.isNaN(d.getTime())
                        ? `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
                        : en
                          ? 'Pending'
                          : '加载中';
                    return en
                      ? `${daysLeft} days left (expires ${endText})`
                      : `剩余 ${daysLeft} 天（到期日 ${endText}）`;
                  })()}
                </p>
              )}
            </div>
            <Link
              to="/upgrade"
              className="inline-flex h-8 min-h-8 shrink-0 items-center justify-center rounded border border-clearstrata-ui-softBorder bg-white px-2 py-0 text-[11px] font-semibold leading-none text-clearstrata-brand-900 hover:bg-clearstrata-brand-50 sm:min-h-[2.25rem] sm:rounded-lg sm:px-3 sm:py-1.5 sm:text-sm sm:leading-normal"
            >
              {en ? 'View pricing' : '查看定价'}
            </Link>
          </div>
        </div>
      </div>
      <ImportantUpdatesDashboardCard langEn={en} bullets={importantUpdatesBullets} />
      <QuickAccessDashboardCard langEn={en} meetingsHref={meetingsNavHref(roleInProperty)} />
      <HomeServicesDashboardCard langEn={en} />
      {(() => {
        const st = trialRow?.subscription_status ?? null;
        const ends = trialRow?.trial_ends_at ?? null;
        const state = getTrialState(ends, st, 7);
        const daysLeft = getTrialDaysRemaining(ends);
        return <TrialUpgradeCard state={state} daysLeft={daysLeft} />;
      })()}
    </>
  );
}
