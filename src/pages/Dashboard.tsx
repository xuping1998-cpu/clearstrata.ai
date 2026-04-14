import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { GUEST_PROPERTY_STORAGE_KEY, useProperty } from '../contexts/PropertyContext';
import HomeBudgetPanel from '@/components/dashboard/HomeBudgetPanel';
import { DemoPropertyMockHomePanel } from '@/components/demoProperty/DemoPropertyMockHomePanel';

export function Dashboard() {
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();
  const { isGuest, isDemoMode, guestPropertyCode, isDemoPropertyMock } = useProperty();

  if (isDemoPropertyMock) {
    return <DemoPropertyMockHomePanel />;
  }

  if (isDemoMode && guestPropertyCode) {
    return (
      <>
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <p className="font-medium">{en ? 'Demo mode (read-only)' : '演示模式（只读）'}</p>
          <p className="mt-1 text-emerald-900/90">
            {en
              ? `You are viewing ${guestPropertyCode} as a demo. Register to join this property and use full features.`
              : `你正在查看 ${guestPropertyCode} 的演示模式。注册后可加入该物业并使用完整功能。`}
          </p>
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
        <HomeBudgetPanel />
      </>
    );
  }

  return <HomeBudgetPanel />;
}
