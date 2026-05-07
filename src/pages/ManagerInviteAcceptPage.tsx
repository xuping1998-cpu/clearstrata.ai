import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

type InvitePayload = {
  ok?: boolean;
  code?: string;
  message?: string;
  propertyId?: string;
  propertyName?: string;
  inviteEmail?: string;
};

/** Edge function returns HTTP 200 for business outcomes so `invoke()` always parses `data`. */

export function ManagerInviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const token = searchParams.get('token')?.trim() ?? '';

  const [phase, setPhase] = useState<'checking' | 'needAuth' | 'emailMismatch' | 'error'>('checking');
  const [errorText, setErrorText] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<{ propertyName?: string; inviteEmail?: string }>({});
  const inflightRef = useRef(false);
  const doneRef = useRef(false);

  const redirectToLogin = useCallback(() => {
    const back = `/manager-invite?token=${encodeURIComponent(token)}`;
    navigate(`/login?redirect=${encodeURIComponent(back)}`);
  }, [navigate, token]);

  const runAccept = useCallback(async () => {
    if (!token || inflightRef.current || doneRef.current) return;
    inflightRef.current = true;
    setPhase('checking');
    setErrorText(null);

    try {
      const { data } = await supabase.functions.invoke('accept-manager-invite', {
        body: { token },
      });
      const p = data as InvitePayload | null;

      if (p?.ok === true && p.propertyId) {
        doneRef.current = true;
        navigate(`/?propertyId=${encodeURIComponent(p.propertyId)}`, { replace: true });
        return;
      }

      if (p?.code === 'NEED_AUTH') {
        setSnapshot({ propertyName: p.propertyName, inviteEmail: p.inviteEmail });
        setPhase('needAuth');
        return;
      }

      if (p?.code === 'EMAIL_MISMATCH') {
        setPhase('emailMismatch');
        setSnapshot({ inviteEmail: p.inviteEmail });
        setErrorText('请使用被邀请的邮箱登录');
        return;
      }

      if (p?.code === 'EXISTING_OTHER_ROLE') {
        setPhase('error');
        setErrorText(
          typeof p.message === 'string' && p.message
            ? p.message
            : '该账号在本物业已是其他角色，无法接受物业经理邀请',
        );
        return;
      }

      setPhase('error');
      setErrorText(
        typeof p?.message === 'string' && p.message
          ? p.message
          : '邀请无效或已过期，请稍后重试或联系业委会。',
      );
    } catch {
      setPhase('error');
      setErrorText('网络异常，请稍后重试');
    } finally {
      inflightRef.current = false;
    }
  }, [navigate, token]);

  useEffect(() => {
    if (!token) {
      setPhase('error');
      setErrorText('链接无效：缺少邀请 token');
      return;
    }
    void runAccept();
  }, [token, session?.access_token, runAccept]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-4 text-center">
        <img src="/clearstrata-hero-logo.png" alt="ClearStrata" className="h-10 w-auto mx-auto" />
        <h1 className="text-lg font-bold text-gray-900">物业经理邀请</h1>
        <p className="text-xs text-gray-400">Property Manager Invitation</p>

        {phase === 'checking' ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <Loader2 className="w-8 h-8 text-clearstrata-ui-primary animate-spin" />
            <p className="text-sm text-gray-600">正在处理邀请…</p>
          </div>
        ) : null}

        {phase === 'needAuth' ? (
          <div className="text-left space-y-3 py-2">
            <p className="text-sm text-gray-700">
              请先登录或注册，并使用<strong>被邀请的邮箱</strong>完成验证后返回本页以接受邀请。
            </p>
            {snapshot.inviteEmail ? (
              <p className="text-xs text-gray-500">
                邀请邮箱 Invited email: <span className="font-mono text-gray-800">{snapshot.inviteEmail}</span>
              </p>
            ) : null}
            {snapshot.propertyName ? (
              <p className="text-xs text-gray-500">物业 Property: {snapshot.propertyName}</p>
            ) : null}
            <button
              type="button"
              onClick={redirectToLogin}
              className="w-full py-2.5 rounded-xl bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#178a66]"
            >
              继续登录 / Continue
            </button>
          </div>
        ) : null}

        {(phase === 'emailMismatch' || phase === 'error') && (
          <div className="rounded-xl px-3 py-2 text-sm bg-red-50 text-red-900 border border-red-200">
            {errorText ?? '无法接受邀请'}
          </div>
        )}

        {phase === 'error' || phase === 'emailMismatch' ? (
          <button
            type="button"
            onClick={() => navigate('/', { replace: true })}
            className="text-sm text-gray-500 hover:text-gray-800 underline"
          >
            返回首页
          </button>
        ) : null}
      </div>
    </div>
  );
}
