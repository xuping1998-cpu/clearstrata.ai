import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, Loader2, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { submitUnifiedPropertyEntry } from '../lib/propertyEntryUnified';

type InviteRow = {
  id: string;
  property_id: string;
  code: string;
  role: string;
  status: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_at: string;
};

function translateInviteError(message: string | undefined, en: boolean): string {
  const m = (message || 'UNKNOWN').trim();
  const table: Record<string, [string, string]> = {
    INVALID_INVITE: [
      'This invite code is invalid, expired, disabled, or no longer available.',
      '邀请码无效、已过期、已停用或不可用。',
    ],
    INVITE_NOT_FOUND: ['This invite could not be found.', '未找到该邀请码。'],
    INVITE_NOT_ACTIVE: ['This invite is no longer active.', '该邀请已停用。'],
    INVITE_EXPIRED: ['This invite has expired.', '该邀请已过期。'],
    INVITE_LIMIT_REACHED: ['This invite has reached its use limit.', '该邀请已达到使用次数上限。'],
    NOT_AUTHENTICATED: ['Please sign in to continue.', '请先登录后再操作。'],
    ALREADY_MEMBER: ['You are already a member of this property.', '您已是该物业成员。'],
    PENDING_EXISTS: [
      'You already have a pending join request for this property.',
      '您对该物业的加入申请正在审核中。',
    ],
    UNKNOWN: ['Something went wrong. Please try again.', '操作未成功，请稍后再试。'],
  };
  const row = table[m] ?? table.UNKNOWN;
  return en ? row[0] : row[1];
}

function friendlySubmitFailure(en: boolean): string {
  return en ? 'Could not submit your request. Please try again.' : '无法提交申请，请稍后再试。';
}

function roleLabel(role: string | undefined, en: boolean): string {
  if (!role) return '—';
  const labels: Record<string, [string, string]> = {
    owner: ['Owner', '业主'],
    tenant: ['Tenant', '租户'],
    viewer: ['Viewer', '访客'],
    manager: ['Property manager', '物业经理'],
    council: ['Council', '业委会'],
    admin: ['Administrator', '管理员'],
    property_admin: ['Property admin', '物业管理员'],
  };
  const pair = labels[role] ?? [role, role];
  return en ? pair[0] : pair[1];
}

function isInviteExpired(inv: InviteRow): boolean {
  if (inv.expires_at) {
    const t = new Date(inv.expires_at).getTime();
    if (!Number.isNaN(t) && t < Date.now()) return true;
  }
  if (inv.status === 'expired') return true;
  if (inv.max_uses > 0 && inv.used_count >= inv.max_uses) return true;
  return false;
}

type MyJoinRequestRow = {
  status: string;
  rejection_reason: string | null;
};

export function JoinInvitePage() {
  const [searchParams] = useSearchParams();
  const { session } = useAuth();
  const { language, t } = useLanguage();
  const en = language === 'en';
  const { memberships } = useProperty();

  const cleanCode = useMemo(
    () => (searchParams.get('code') || '').trim().toUpperCase(),
    [searchParams],
  );

  const [invite, setInvite] = useState<InviteRow | null>(null);
  const [propertyName, setPropertyName] = useState<string | null>(null);
  /** True when invite lookup failed for reasons other than “not found” (e.g. permission). */
  const [inviteLookupFailed, setInviteLookupFailed] = useState(false);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [myLatestRequest, setMyLatestRequest] = useState<MyJoinRequestRow | null>(null);

  const loadInvite = useCallback(async () => {
    if (!cleanCode) {
      setInvite(null);
      setPropertyName(null);
      setInviteLookupFailed(false);
      setAlreadyMember(false);
      setMyLatestRequest(null);
      setLoadingInvite(false);
      return;
    }

    setLoadingInvite(true);
    setInviteLookupFailed(false);

    const { data: raw, error } = await supabase.rpc('get_invite_preview', { invite_code: cleanCode });

    if (error) {
      setInvite(null);
      setPropertyName(null);
      setAlreadyMember(false);
      setMyLatestRequest(null);
      setInviteLookupFailed(true);
      setLoadingInvite(false);
      return;
    }

    const preview = raw as {
      found?: boolean;
      property_id?: string;
      property_name?: string;
      role?: string;
      code?: string;
      expires_at?: string | null;
      status?: string;
      max_uses?: number;
      used_count?: number;
    };

    if (!preview?.found || !preview.property_id || !preview.code) {
      setInvite(null);
      setPropertyName(null);
      setAlreadyMember(false);
      setMyLatestRequest(null);
      setLoadingInvite(false);
      return;
    }

    const row: InviteRow = {
      id: `preview-${preview.code}`,
      property_id: preview.property_id,
      code: preview.code,
      role: preview.role ?? 'owner',
      status: preview.status ?? 'active',
      max_uses: preview.max_uses ?? 0,
      used_count: preview.used_count ?? 0,
      expires_at: preview.expires_at ?? null,
      created_at: '',
    };
    setInvite(row);
    setPropertyName(preview.property_name?.trim() ? preview.property_name : null);

    const uid = session?.user?.id;
    if (uid) {
      const { data: pm } = await supabase
        .from('property_members')
        .select('user_id')
        .eq('property_id', row.property_id)
        .eq('user_id', uid)
        .eq('status', 'active')
        .maybeSingle();
      setAlreadyMember(!!pm);

      const { data: jr } = await supabase
        .from('join_requests')
        .select('status, rejection_reason')
        .eq('property_id', row.property_id)
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setMyLatestRequest((jr as MyJoinRequestRow | null) ?? null);
    } else {
      setAlreadyMember(false);
      setMyLatestRequest(null);
    }

    setLoadingInvite(false);
  }, [cleanCode, session?.user?.id]);

  useEffect(() => {
    void loadInvite();
  }, [loadInvite]);

  const loginHref = `/?redirect=${encodeURIComponent(`/invite?code=${encodeURIComponent(cleanCode)}`)}`;

  const expired = invite ? isInviteExpired(invite) : false;

  const hasPendingRequest = myLatestRequest?.status === 'pending';
  const showRejectedNote =
    !!session &&
    !alreadyMember &&
    myLatestRequest?.status === 'rejected' &&
    !hasPendingRequest;

  const canSubmit =
    !!session &&
    !!invite &&
    invite.status === 'active' &&
    !expired &&
    !alreadyMember &&
    !hasPendingRequest;

  const submitInviteLockRef = useRef(false);

  const submitJoinRequest = async () => {
    if (!cleanCode || !session) {
      setMsg(translateInviteError('NOT_AUTHENTICATED', en));
      return;
    }
    if (submitting || submitInviteLockRef.current) return;
    submitInviteLockRef.current = true;
    setSubmitting(true);
    setMsg(null);
    try {
      const result = await submitUnifiedPropertyEntry(supabase, {
        userId: session.user.id,
        p_property_id: null,
        p_requested_role: 'owner',
        p_unit_number: null,
        p_note: null,
        p_full_name: null,
        p_email: null,
        p_phone: null,
        p_invite_code: cleanCode,
        p_direct_invite_id: null,
        p_inferred_role: null,
        p_inferred_unit_number: null,
        p_move_in_date: null,
        p_language_pref: en ? 'en' : 'zh',
      });

      if (result.kind === 'rpc_error') {
        setMsg(friendlySubmitFailure(en));
        return;
      }

      if (result.kind === 'business_reject') {
        setMsg(translateInviteError(result.message ?? result.errorKey, en));
        return;
      }

      if (result.kind === 'auto_approved') {
        setSuccess(true);
        await loadInvite();
        return;
      }

      if (result.kind === 'pending_submitted') {
        setMyLatestRequest({ status: 'pending', rejection_reason: null });
        setSuccess(true);
        return;
      }
    } catch {
      setMsg(translateInviteError('UNKNOWN', en));
    } finally {
      submitInviteLockRef.current = false;
      setSubmitting(false);
    }
  };

  if (loadingInvite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Loader2 className="w-10 h-10 text-clearstrata-ui-primary animate-spin" aria-hidden />
      </div>
    );
  }

  if (!cleanCode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center">
          <Building2 className="w-12 h-12 text-clearstrata-ui-primary mx-auto mb-3" />
          <p className="text-gray-800 font-medium text-sm sm:text-base leading-relaxed">
            {en
              ? 'Open this page using the invite link from your administrator (it should include a code).'
              : '请使用管理员发送的邀请链接打开本页（链接中应包含邀请码）。'}
          </p>
          <Link to="/" className="mt-6 inline-block text-clearstrata-ui-primary font-semibold text-sm">
            {en ? 'Home' : '返回首页'}
          </Link>
        </div>
      </div>
    );
  }

  if (inviteLookupFailed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center">
          <p className="text-gray-800 text-sm sm:text-base leading-relaxed">
            {en
              ? 'We could not load this invite. Sign in and try again, or check that the link is correct.'
              : '无法加载邀请信息。请先登录后重试，或确认邀请链接是否完整。'}
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-2 justify-center">
            <Link
              to={loginHref}
              className="inline-flex justify-center rounded-xl bg-clearstrata-ui-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive"
            >
              {en ? 'Sign in' : '去登录'}
            </Link>
            <Link to="/" className="inline-flex justify-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50">
              {en ? 'Home' : '返回首页'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-gray-100 p-6 text-center">
          <p className="text-gray-800 text-sm sm:text-base">{translateInviteError('INVITE_NOT_FOUND', en)}</p>
          <Link to="/" className="mt-6 inline-block text-clearstrata-ui-primary font-semibold text-sm">
            {en ? 'Home' : '返回首页'}
          </Link>
        </div>
      </div>
    );
  }

  const showExpiredOrDisabled = expired || invite.status === 'disabled';

  return (
    <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/80 to-gray-50 flex flex-col items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-md min-w-0">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-clearstrata-ui-primary px-4 sm:px-5 py-4 text-white">
            <div className="flex items-center gap-2 min-w-0">
              <Building2 size={22} className="shrink-0" />
              <span className="font-bold text-base sm:text-lg truncate">{en ? 'Join a property' : '加入物业'}</span>
            </div>
          </div>

          <div className="p-4 sm:p-5 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500">
                {en ? 'Property name' : '物业名称'}
              </p>
              <p className="text-base sm:text-lg font-semibold text-gray-900 mt-0.5 break-words">
                {propertyName || '—'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="min-w-0">
                <p className="text-gray-500">{en ? 'Role' : '邀请角色'}</p>
                <p className="font-medium text-gray-900 break-words">{roleLabel(invite.role, en)}</p>
              </div>
              <div className="min-w-0">
                <p className="text-gray-500">{en ? 'Invite code' : '邀请码'}</p>
                <p className="font-mono font-semibold text-gray-900 tracking-wider break-all">{invite.code}</p>
              </div>
            </div>

            <div
              className={`rounded-xl px-3 py-2 text-sm ${
                showExpiredOrDisabled
                  ? 'bg-amber-50 text-amber-900 border border-amber-200'
                  : 'bg-clearstrata-ui-soft text-clearstrata-ui-softText border border-clearstrata-ui-softBorder'
              }`}
            >
              {invite.status === 'disabled' ? (
                <span>{en ? 'This invite is no longer active.' : '该邀请已停用。'}</span>
              ) : expired ? (
                <span>{en ? 'This invite has expired or reached its use limit.' : '该邀请已过期或已达使用上限。'}</span>
              ) : (
                <span>
                  {en
                    ? 'You can submit a join request. A staff member will review it.'
                    : '您可以提交加入申请，物业人员审核通过后即可加入。'}
                </span>
              )}
            </div>

            {session && alreadyMember && (
              <div className="rounded-xl bg-clearstrata-ui-soft border border-clearstrata-ui-softBorder px-3 py-3 text-sm text-clearstrata-ui-softText">
                <p className="font-medium">
                  {en ? 'You are already a member of this property.' : '您已是该物业成员。'}
                </p>
                <Link
                  to="/dashboard"
                  className="mt-2 inline-block text-clearstrata-ui-primary font-semibold hover:underline"
                >
                  {en ? 'Open dashboard' : '进入工作台'}
                </Link>
              </div>
            )}

            {session && hasPendingRequest && !alreadyMember && !success && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 px-3 py-3 text-sm text-blue-900">
                {en
                  ? 'Your join request is pending review. We will notify you when it has been processed.'
                  : '您的加入申请正在审核中，处理完成后我们会通知您。'}
              </div>
            )}

            {session && showRejectedNote && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-3 text-sm text-amber-950">
                <p className="font-medium">{en ? 'Previous request was not approved.' : '您此前的申请未通过审核。'}</p>
                {myLatestRequest.rejection_reason?.trim() ? (
                  <p className="mt-1.5 text-amber-900/90 break-words">{myLatestRequest.rejection_reason}</p>
                ) : (
                  <p className="mt-1.5 text-amber-900/80">
                    {en ? 'You may submit a new request below.' : '您可以在下方重新提交申请。'}
                  </p>
                )}
              </div>
            )}

            {!session && (
              <div className="rounded-xl bg-gray-50 border border-gray-200 p-4 text-sm text-gray-700">
                <p className="mb-3 text-sm leading-relaxed">
                  {en ? 'Sign in or register to submit a join request.' : '请先登录或注册后再提交加入申请。'}
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Link
                    to={loginHref}
                    className="flex-1 text-center py-2.5 rounded-xl bg-clearstrata-ui-primary text-white font-semibold text-sm hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive"
                  >
                    {en ? 'Sign in' : '登录'}
                  </Link>
                  <Link
                    to={loginHref}
                    className="flex-1 text-center py-2.5 rounded-xl border border-gray-300 bg-white text-gray-800 font-semibold text-sm hover:bg-gray-50"
                  >
                    {en ? 'Register' : '注册账号'}
                  </Link>
                </div>
              </div>
            )}

            {session && (
              <>
                {!canSubmit && !success && !alreadyMember && !hasPendingRequest && (
                  <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 leading-relaxed">
                    {en ? 'This invite cannot be used right now.' : '当前无法使用此邀请。'}
                  </p>
                )}
                {canSubmit && !success && (
                  <button
                    type="button"
                    onClick={() => void submitJoinRequest()}
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl bg-clearstrata-ui-primary text-white font-semibold hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="animate-spin" size={20} />
                        {en ? 'Submitting…' : '提交中…'}
                      </>
                    ) : (
                      t('join_invite_submit_btn')
                    )}
                  </button>
                )}
                {success && (
                  <div className="space-y-3 text-center">
                    <div className="flex items-center justify-center gap-2 text-clearstrata-brand-700 font-medium py-1">
                      <CheckCircle size={22} />
                      {t('join_invite_success_title')}
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{t('join_invite_success_detail')}</p>
                    {memberships.length > 0 ? (
                      <Link
                        to="/dashboard"
                        className="inline-block w-full py-3 rounded-xl border border-gray-200 bg-white text-gray-800 font-semibold text-sm hover:bg-gray-50"
                      >
                        {en ? 'Go to dashboard' : '进入工作台'}
                      </Link>
                    ) : (
                      <Link
                        to="/"
                        className="inline-block w-full py-3 rounded-xl border border-gray-200 bg-white text-gray-800 font-semibold text-sm hover:bg-gray-50"
                      >
                        {en ? 'Back to home' : '返回首页'}
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}

            {msg && (
              <p className="text-sm text-center text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {msg}
              </p>
            )}
          </div>
        </div>

        <p className="text-center mt-4 text-xs text-gray-500">ClearStrata</p>
      </div>
    </div>
  );
}
