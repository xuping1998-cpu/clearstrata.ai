import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { GUEST_PROPERTY_STORAGE_KEY, useProperty } from '../contexts/PropertyContext';
import HomeBudgetPanel from '@/components/dashboard/HomeBudgetPanel';
import { DemoPropertyMockHomePanel } from '@/components/demoProperty/DemoPropertyMockHomePanel';
import { DemoCreatePropertyCtaCard } from '@/components/onboarding/DemoCreatePropertyCta';
import { PropertySetupChecklist } from '@/components/onboarding/PropertySetupChecklist';
import { TrialBanner } from '@/components/billing/TrialBanner';
import { TrialUpgradeCard } from '@/components/billing/TrialUpgradeCard';
import { supabase } from '@/lib/supabase';
import { getTrialDaysRemaining, getTrialState } from '@/lib/subscription';
import { demoEntryPath, realPropertyJoinPath } from '@/lib/propertyEntryRoutes';

export function Dashboard() {
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();
  const { isGuest, isDemoMode, guestPropertyCode, isDemoPropertyMock, currentPropertyId } = useProperty();

  const [trialRow, setTrialRow] = useState<{ subscription_status?: string | null; trial_ends_at?: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const pid = currentPropertyId ? String(currentPropertyId) : '';
    if (!pid || isDemoMode || isDemoPropertyMock) {
      setTrialRow(null);
      return;
    }
    setTrialRow(null);
    void (async () => {
      try {
        const { data, error } = await (supabase
          .from('properties')
          .select('subscription_status,trial_ends_at')
          .eq('id', pid)
          .maybeSingle() as any);
        if (cancelled) return;
        if (error) return; // silent downgrade (missing columns / RLS / etc.)
        setTrialRow(data ?? null);
      } catch {
        /* silent */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentPropertyId, isDemoMode, isDemoPropertyMock]);

  if (isDemoPropertyMock) {
    return <DemoPropertyMockHomePanel />;
  }

  if (isDemoMode && guestPropertyCode) {
    return (
      <>
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <p className="font-medium">{en ? 'Demo sample (read-only)' : '演示样板（只读）'}</p>
          <p className="mt-1 text-emerald-900/90">
            {en
              ? 'This screen showcases ClearStrata with sample data. It is not your real property back office.'
              : '当前为演示样板，仅用于展示 ClearStrata 的产品能力，不是真实物业后台。'}
          </p>
          <p className="mt-2 text-emerald-900/85">
            {en ? 'If you are a real member of this property, use the dedicated entry:' : '若你是该物业真实成员，请使用真实物业专属入口（需登录/审核），而非本页：'}
          </p>
          <p className="mt-1">
            <Link
              to={realPropertyJoinPath(guestPropertyCode)}
              className="font-semibold text-[#0f6b4f] underline-offset-2 hover:underline"
            >
              {en ? 'Real property entry' : `真实物业入口（${guestPropertyCode}）`}
            </Link>
            <span className="mx-2 text-emerald-800/70">·</span>
            <Link to={demoEntryPath(guestPropertyCode)} className="text-emerald-800/90 underline-offset-2 hover:underline">
              {en ? 'Stay on this demo' : '继续浏览本演示'}
            </Link>
          </p>
        </div>
        <div className="mb-4">
          <DemoCreatePropertyCtaCard />
        </div>
        <HomeBudgetPanel />
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
            className="mt-3 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white"
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
        <HomeBudgetPanel />
      </>
    );
  }

  return (
    <>
      <TrialBanner />
      {(() => {
        const st = trialRow?.subscription_status ?? null;
        const ends = trialRow?.trial_ends_at ?? null;
        const state = getTrialState(ends, st, 7);
        const daysLeft = getTrialDaysRemaining(ends);
        return <TrialUpgradeCard state={state} daysLeft={daysLeft} />;
      })()}
      <PropertySetupChecklist />
      <HomeBudgetPanel />
    </>
  );
}
