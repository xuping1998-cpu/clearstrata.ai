import { useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Loader2, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useProperty } from '@/contexts/PropertyContext';
import { samePropertyId } from '@/lib/propertyIdMatch';
import { demoEntryPath, realPropertyJoinPath } from '@/lib/propertyEntryRoutes';

export type JoinPropertyResolved = {
  id: string;
  name: string;
  slug: string | null;
  property_code: string | null;
};

type Props = {
  resolved: JoinPropertyResolved;
  /** URL 段原始值，用于展示与 Demo 链接 */
  codeParam: string;
};

/**
 * 真实物业入口（非 Demo）：成员登录进入后台，非成员走加入申请 / 邀请码。
 * Demo 样板请使用 `/demo/:propertyCode`。
 */
export function JoinPropertyPage({ resolved, codeParam }: Props) {
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuth();
  const { memberships, setCurrentPropertyId, refreshMemberships } = useProperty();

  const displayCode = codeParam.trim().toUpperCase();
  const propertyLabel = resolved.name?.trim() || displayCode;

  const isMember = useMemo(
    () => memberships.some((m) => samePropertyId(m.propertyId, resolved.id)),
    [memberships, resolved.id],
  );

  const loginHref = useMemo(() => {
    const back = realPropertyJoinPath(codeParam);
    return `/?redirect=${encodeURIComponent(back)}`;
  }, [codeParam]);

  const signupHref = useMemo(() => `/?mode=signup&redirect=${encodeURIComponent(realPropertyJoinPath(codeParam))}`, [codeParam]);

  const joinRequestHref = `/join-request?propertyId=${encodeURIComponent(resolved.id)}`;
  const inviteHref = '/invite';

  const enterDashboard = useCallback(async () => {
    setCurrentPropertyId(resolved.id);
    await refreshMemberships();
    navigate(`/dashboard?propertyId=${encodeURIComponent(resolved.id)}`, { replace: true });
  }, [navigate, refreshMemberships, resolved.id, setCurrentPropertyId]);

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-10 w-10 animate-spin text-[#1D9E75]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-gray-100 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">真实物业入口</p>
              <h1 className="mt-1 text-xl font-black text-slate-900 sm:text-2xl">进入真实物业：{propertyLabel}</h1>
              <p className="mt-1 font-mono text-xs text-slate-500">代号 {displayCode}</p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-slate-700">
            此入口仅供该物业<strong className="text-slate-900">真实业主、委员与管理员</strong>
            使用，需登录并经过身份/权限校验后进入实际物业数据。
          </p>
          <p className="mt-2 text-sm text-slate-600">
            若你只是想了解 ClearStrata 产品，请先查看演示样板（只读展示），
            <Link to={demoEntryPath(displayCode)} className="font-semibold text-[#1D9E75] underline-offset-2 hover:underline">
              前往 Demo
            </Link>
            。
          </p>

          <div className="mt-6 space-y-3">
            {session && isMember ? (
              <button
                type="button"
                onClick={() => void enterDashboard()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D9E75] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#178a66]"
              >
                <LogIn className="h-4 w-4" />
                进入物业设置
              </button>
            ) : session && !isMember ? (
              <>
                <p className="text-sm text-slate-700">
                  当前账号尚未加入该物业。请提交加入申请或使用业委会发放的邀请码。
                </p>
                <Link
                  to={joinRequestHref}
                  className="flex w-full items-center justify-center rounded-xl bg-[#1D9E75] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#178a66]"
                >
                  提交加入申请
                </Link>
                <Link
                  to={inviteHref}
                  className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  使用邀请码加入
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={loginHref}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1D9E75] px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#178a66]"
                >
                  <LogIn className="h-4 w-4" />
                  登录后继续
                </Link>
                <Link
                  to={signupHref}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 hover:bg-slate-50"
                >
                  <UserPlus className="h-4 w-4" />
                  注册账号后加入
                </Link>
              </>
            )}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500">还不是该物业成员？</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Link
                to={demoEntryPath(displayCode)}
                className="inline-flex items-center rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-950 hover:bg-amber-100"
              >
                查看演示样板（Demo）
              </Link>
              <Link to="/pricing" className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                查看定价
              </Link>
              <Link to="/upgrade" className="inline-flex items-center rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                联系开通
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
