import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { GUEST_PROPERTY_STORAGE_KEY, useProperty } from '../contexts/PropertyContext';
import HomeBudgetPanel from '@/components/dashboard/HomeBudgetPanel';
import { DemoPropertyMockHomePanel } from '@/components/demoProperty/DemoPropertyMockHomePanel';
import { DemoCreatePropertyCtaCard } from '@/components/onboarding/DemoCreatePropertyCta';
import { TrialUpgradeCard } from '@/components/billing/TrialUpgradeCard';
import { supabase } from '@/lib/supabase';
import { getTrialDaysRemaining, getTrialState } from '@/lib/subscription';
import { realPropertyJoinPath } from '@/lib/propertyEntryRoutes';

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
        <HomeBudgetPanel />
      </>
    );
  }

  return (
    <>
      <div className="mb-4 rounded-2xl border border-clearstrata-ui-softBorder bg-clearstrata-ui-soft px-4 py-3 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm font-semibold text-gray-900">你的物业已经创建成功</p>
            <button
              type="button"
              onClick={() => navigate('/property-admin/unit-whitelist')}
              className="inline-flex items-center justify-center rounded-xl border border-clearstrata-ui-softBorder bg-white px-3 py-2 text-sm font-semibold text-clearstrata-brand-900 hover:bg-clearstrata-brand-50"
            >
              导入房号
            </button>
            <button
              type="button"
              onClick={() => navigate('/property-admin/invites')}
              className="inline-flex items-center justify-center rounded-xl border border-clearstrata-ui-softBorder bg-white px-3 py-2 text-sm font-semibold text-clearstrata-brand-900 hover:bg-clearstrata-brand-50"
            >
              邀请成员
            </button>
            <button
              type="button"
              onClick={() => navigate('/invoices/upload')}
              className="inline-flex items-center justify-center rounded-xl border border-clearstrata-ui-softBorder bg-white px-3 py-2 text-sm font-semibold text-clearstrata-brand-900 hover:bg-clearstrata-brand-50"
            >
              上传第一张发票
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-sm font-semibold text-gray-900">你正在免费试用 ClearStrata</p>
              <p className="text-sm text-gray-700">
                {(() => {
                  const ends = trialRow?.trial_ends_at ?? null;
                  const daysLeft = getTrialDaysRemaining(ends);
                  const d = ends ? new Date(String(ends)) : null;
                  const endText =
                    d && !Number.isNaN(d.getTime())
                      ? `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`
                      : '—';
                  return `剩余 ${daysLeft} 天（到期日 ${endText}）`;
                })()}
              </p>
            </div>
            <Link
              to="/upgrade"
              className="inline-flex items-center justify-center rounded-xl border border-clearstrata-ui-softBorder bg-white px-4 py-2 text-sm font-semibold text-clearstrata-brand-900 hover:bg-clearstrata-brand-50"
            >
              查看定价
            </Link>
          </div>
        </div>
      </div>
      {(() => {
        const st = trialRow?.subscription_status ?? null;
        const ends = trialRow?.trial_ends_at ?? null;
        const state = getTrialState(ends, st, 7);
        const daysLeft = getTrialDaysRemaining(ends);
        return <TrialUpgradeCard state={state} daysLeft={daysLeft} />;
      })()}
      <HomeBudgetPanel />
    </>
  );
}
