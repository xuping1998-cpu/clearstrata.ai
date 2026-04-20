import { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Rocket } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { demoEntryPath, MARKETING_DEMO_PROPERTY_CODE, realPropertyJoinPath } from '@/lib/propertyEntryRoutes';

export function DemoCreatePropertyCtaButton({
  variant = 'primary',
  className = '',
}: {
  variant?: 'primary' | 'ghost';
  className?: string;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();

  const target = '/onboarding/create-property';
  const loginHref = useMemo(() => {
    const redir = `${target}?from=${encodeURIComponent(location.pathname)}`;
    return `/?redirect=${encodeURIComponent(redir)}`;
  }, [location.pathname]);

  return (
    <button
      type="button"
      onClick={() => {
        if (!session) {
          navigate(loginHref);
          return;
        }
        navigate(target);
      }}
      className={
        variant === 'primary'
          ? `inline-flex items-center justify-center gap-2 rounded-xl bg-clearstrata-ui-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive active:scale-[0.99] ${className}`
          : `inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-50 ${className}`
      }
    >
      <Rocket className="h-4 w-4" />
      创建我的物业
    </button>
  );
}

export function DemoCreatePropertyCtaCard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session } = useAuth();
  const target = '/onboarding/create-property';
  const loginHref = `/?redirect=${encodeURIComponent(target)}&from=${encodeURIComponent(location.pathname)}`;

  return (
    <div className="rounded-2xl border border-clearstrata-ui-softBorder bg-gradient-to-br from-white to-clearstrata-ui-soft/60 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-extrabold text-gray-900">5 分钟开通你自己的物业后台</p>
          <p className="mt-1 text-sm text-gray-700">立即开始透明管理每一笔支出</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            if (!session) {
              navigate(loginHref);
              return;
            }
            navigate(target);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-clearstrata-ui-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive active:scale-[0.99]"
        >
          <Rocket className="h-4 w-4" />
          立即创建我的物业
        </button>
        <p className="text-xs text-gray-500">创建后你将成为首位管理员</p>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-gray-500">
        演示样板见{' '}
        <Link to={demoEntryPath(MARKETING_DEMO_PROPERTY_CODE)} className="font-semibold text-clearstrata-ui-primary underline-offset-2 hover:underline">
          Demo（{MARKETING_DEMO_PROPERTY_CODE}）
        </Link>
        ；若你已是该物业真实成员，请走{' '}
        <Link to={realPropertyJoinPath(MARKETING_DEMO_PROPERTY_CODE)} className="font-semibold text-slate-700 underline-offset-2 hover:underline">
          真实物业入口
        </Link>
        ，勿与演示混淆。
      </p>
    </div>
  );
}

