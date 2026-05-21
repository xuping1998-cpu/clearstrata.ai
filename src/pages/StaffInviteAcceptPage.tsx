import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

/**
 * Phase 2C — Accept STAFF invitation (lawyer / auditor / finance / accountant).
 *
 * Four phases (mirrors `ManagerInviteAcceptPage` shape but staff semantics):
 *   1. loading     → POST preview { token }
 *   2. form        → user sets full name + password (8+ chars, twice)
 *   3. submitting  → POST accept { token, password, fullName }
 *   4. success     → CTA to `/login?email=...`
 *
 * Strictly separate from manager invite flow:
 *   - Distinct route `/staff-invite`.
 *   - Calls `accept-staff-invite` Edge Function only.
 *   - Never invokes `accept-manager-invite` / touches manager_invites.
 */

type StaffType = 'lawyer' | 'auditor' | 'finance' | 'accountant';

interface StaffTypeLabel {
  zh: string;
  en: string;
}

interface PreviewPayload {
  ok?: boolean;
  mode?: string;
  code?: string;
  message?: string;
  propertyId?: string;
  propertyName?: string;
  staffEmail?: string;
  staffName?: string;
  staffType?: StaffType | string;
  staffTypeLabel?: StaffTypeLabel;
  expiresAt?: string | null;
}

interface AcceptPayload {
  ok?: boolean;
  code?: string;
  message?: string;
  email?: string;
  propertyName?: string;
  staffType?: StaffType | string;
  staffTypeLabel?: StaffTypeLabel;
}

const STAFF_TYPE_LABELS: Record<StaffType, StaffTypeLabel> = {
  lawyer: { zh: '律师', en: 'Legal Counsel' },
  auditor: { zh: '审计', en: 'Auditor' },
  finance: { zh: '财务', en: 'Finance' },
  accountant: { zh: '会计', en: 'Accountant' },
};

function isStaffType(value: unknown): value is StaffType {
  return (
    value === 'lawyer' ||
    value === 'auditor' ||
    value === 'finance' ||
    value === 'accountant'
  );
}

function resolvePreviewErrorMessage(code: string | undefined, message: string | undefined): string {
  if (code === 'STAFF_INVITE_NOT_FOUND') return '邀请无效或不存在。';
  if (code === 'STAFF_INVITE_EXPIRED')
    return '邀请已过期，请联系业委会重新发送。';
  if (code === 'STAFF_INVITE_ALREADY_USED') return '邀请已被使用。';
  if (typeof message === 'string' && message) return message;
  return '接受职员邀请失败，请稍后再试。';
}

function resolveSubmitErrorMessage(code: string | undefined, message: string | undefined): string {
  if (code === 'PASSWORD_TOO_SHORT') return '密码至少需要 8 位。';
  if (code === 'EXISTING_OTHER_ROLE')
    return '此邮箱已是本物业成员，不能作为外部职员接受邀请。';
  if (code === 'EXISTING_OTHER_STAFF_TYPE')
    return '此邮箱已是其他类型职员，请联系业委会处理。';
  if (code === 'STAFF_INVITE_EXPIRED')
    return '邀请已过期，请联系业委会重新发送。';
  if (code === 'STAFF_INVITE_ALREADY_USED') return '邀请已被使用。';
  if (code === 'STAFF_INVITE_NOT_FOUND') return '邀请无效或不存在。';
  if (typeof message === 'string' && message) return message;
  return '接受职员邀请失败，请稍后再试。';
}

export function StaffInviteAcceptPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token')?.trim() ?? '';

  const [phase, setPhase] = useState<
    'loading' | 'form' | 'submitting' | 'success' | 'error'
  >('loading');
  const [propertyName, setPropertyName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [staffType, setStaffType] = useState<StaffType | null>(null);
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const inflightPreviewRef = useRef(false);
  const redirectedAfterSuccessRef = useRef(false);

  const fetchPreview = useCallback(async () => {
    if (!token || inflightPreviewRef.current) return;
    inflightPreviewRef.current = true;
    setPhase('loading');
    setErrorText(null);

    try {
      const { data } = await supabase.functions.invoke('accept-staff-invite', {
        body: { token, preview: true },
      });
      const p = (data ?? null) as PreviewPayload | null;

      if (p?.ok === true && p.mode === 'preview' && typeof p.staffEmail === 'string') {
        setInviteEmail(p.staffEmail);
        setPropertyName(typeof p.propertyName === 'string' ? p.propertyName : '');
        setFullName(typeof p.staffName === 'string' ? p.staffName : '');
        setStaffType(isStaffType(p.staffType) ? p.staffType : null);
        setPhase('form');
        return;
      }

      setPhase('error');
      setErrorText(resolvePreviewErrorMessage(p?.code, p?.message));
    } catch {
      setPhase('error');
      setErrorText('网络异常，请稍后重试');
    } finally {
      inflightPreviewRef.current = false;
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      setPhase('error');
      setErrorText('链接无效：缺少邀请 token');
      return;
    }
    void fetchPreview();
  }, [token, fetchPreview]);

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (password.length < 8) {
      setErrorText('密码至少 8 位');
      return;
    }
    if (password !== confirmPassword) {
      setErrorText('两次输入的密码不一致');
      return;
    }

    setPhase('submitting');
    try {
      const { data } = await supabase.functions.invoke('accept-staff-invite', {
        body: {
          token,
          password,
          fullName: fullName.trim() || undefined,
        },
      });
      const p = (data ?? null) as AcceptPayload | null;

      if (p?.ok === true) {
        const emailForLogin =
          typeof p.email === 'string' && p.email ? p.email : inviteEmail;
        setInviteEmail(emailForLogin);
        setPhase('success');

        const loginUrl = `/login?email=${encodeURIComponent(emailForLogin)}`;
        if (!redirectedAfterSuccessRef.current) {
          redirectedAfterSuccessRef.current = true;
          window.setTimeout(() => {
            navigate(loginUrl, { replace: true });
          }, 4000);
        }
        return;
      }

      setPhase('form');
      setErrorText(resolveSubmitErrorMessage(p?.code, p?.message));
    } catch {
      setPhase('form');
      setErrorText('网络异常，请稍后重试');
    }
  };

  const staffTypeLabel = staffType ? STAFF_TYPE_LABELS[staffType] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-4 text-center">
        <img
          src="/clearstrata-hero-logo.png"
          alt="ClearStrata"
          className="h-10 w-auto mx-auto"
        />

        {phase === 'loading' ? (
          <div className="flex flex-col items-center gap-2 py-6">
            <Loader2 className="w-8 h-8 text-clearstrata-ui-primary animate-spin" />
            <p className="text-sm text-gray-600">加载邀请…</p>
            <p className="text-xs text-gray-400">Loading invitation…</p>
          </div>
        ) : null}

        {phase === 'form' || phase === 'submitting' ? (
          <>
            <h1 className="text-lg font-bold text-gray-900">接受职员邀请</h1>
            <p className="text-xs text-gray-400">Accept Staff Invitation</p>

            <div className="text-left rounded-xl bg-gray-50 border border-gray-100 px-3 py-3 space-y-2 text-sm">
              <p>
                <span className="text-gray-500">物业 Property</span>
                <span className="block text-gray-900">{propertyName || '—'}</span>
              </p>
              <p>
                <span className="text-gray-500">邮箱 Email</span>
                <span className="block font-mono text-gray-900 break-all">
                  {inviteEmail}
                </span>
              </p>
              <p>
                <span className="text-gray-500">职员类型 Staff type</span>
                <span className="block text-gray-900">
                  {staffTypeLabel
                    ? `${staffTypeLabel.zh} / ${staffTypeLabel.en}`
                    : '—'}
                </span>
              </p>
            </div>

            <div className="text-left rounded-xl bg-amber-50 border border-amber-200 px-3 py-3 text-xs text-amber-900 leading-relaxed">
              <p className="font-medium">只读访问 / Read-only access</p>
              <p className="mt-1">
                接受后，您将获得本物业资料的只读访问权限，可能包括财务发票、会议资料、业主/住户资料等。
              </p>
              <p className="mt-1">
                After accepting, you will receive read-only access to this property’s records, which may include finance invoices, meeting materials, and owner/resident information.
              </p>
            </div>

            <form onSubmit={(e) => void handleAccept(e)} className="space-y-3 text-left">
              <div>
                <label
                  htmlFor="si-name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  姓名 Name
                </label>
                <input
                  id="si-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20 outline-none"
                  placeholder={staffTypeLabel ? `${staffTypeLabel.zh} / ${staffTypeLabel.en}` : ''}
                  disabled={phase === 'submitting'}
                />
              </div>
              <div>
                <label
                  htmlFor="si-pw1"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  设置密码
                </label>
                <input
                  id="si-pw1"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  minLength={8}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20 outline-none"
                  placeholder="至少 8 位"
                  disabled={phase === 'submitting'}
                />
                <p className="text-xs text-gray-400 mt-0.5">Set password (min 8 characters)</p>
              </div>
              <div>
                <label
                  htmlFor="si-pw2"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  确认密码
                </label>
                <input
                  id="si-pw2"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  minLength={8}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-clearstrata-ui-primary focus:ring-2 focus:ring-clearstrata-ui-primary/20 outline-none"
                  placeholder="再次输入密码"
                  disabled={phase === 'submitting'}
                />
                <p className="text-xs text-gray-400 mt-0.5">Confirm password</p>
              </div>

              {errorText ? (
                <div
                  role="alert"
                  className="rounded-xl px-3 py-2 text-sm bg-red-50 text-red-900 border border-red-200"
                >
                  {errorText}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={phase === 'submitting'}
                className="w-full py-3 rounded-xl bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#178a66] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {phase === 'submitting' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : null}
                设置密码并接受邀请
              </button>
              <p className="text-xs text-gray-400 text-center">
                Set password and accept invitation
              </p>
            </form>
          </>
        ) : null}

        {phase === 'success' ? (
          <div className="space-y-3 py-2 text-left">
            <p className="text-sm text-gray-900 font-medium text-center">
              您已加入本物业，权限为只读职员。
            </p>
            <p className="text-xs text-gray-500 text-center">
              You have joined this property as read-only staff.
            </p>
            {staffTypeLabel ? (
              <p className="text-xs text-gray-600 text-center">
                {staffTypeLabel.zh} / {staffTypeLabel.en}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() =>
                navigate(`/login?email=${encodeURIComponent(inviteEmail)}`, {
                  replace: true,
                })
              }
              className="w-full mt-2 py-3 rounded-xl bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#178a66]"
            >
              进入系统 / Enter ClearStrata
            </button>
            <p className="text-xs text-gray-400 text-center">
              页面将在 4 秒后自动跳转到登录。
              <br />
              Redirecting to sign-in in 4 seconds…
            </p>
          </div>
        ) : null}

        {phase === 'error' ? (
          <div className="space-y-3 py-2">
            <div className="rounded-xl px-3 py-2 text-sm bg-red-50 text-red-900 border border-red-200">
              {errorText ?? '无法接受邀请'}
            </div>
            <button
              type="button"
              onClick={() => navigate('/', { replace: true })}
              className="text-sm text-gray-500 hover:text-gray-800 underline"
            >
              返回首页
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
