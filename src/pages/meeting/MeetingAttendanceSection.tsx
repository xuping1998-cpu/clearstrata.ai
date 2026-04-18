import { useState, useEffect, useCallback } from 'react';
import { UserCheck, UserX, Clock, AlertCircle, Users, Plus, X, Mail, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import { withProperty } from '../../lib/supabaseTenant';

/** 参会者行数据（保持原有结构，不改动） */
interface Attendee {
  id: string;
  meeting_id: string;
  user_id: string;
  attendance_status: string;
  is_proxy: boolean;
  proxy_for_user_id?: string;
  signed_in_at?: string;
  profile?: {
    full_name_en: string;
    full_name_zh?: string;
    email: string;
  };
}

interface Props {
  meetingId: string;
  isCouncil: boolean;
}

/** 出席状态展示文案（中英，保持原有逻辑） */
const statusLabels: Record<string, Record<'en' | 'zh', string>> = {
  invited: { en: 'Invited', zh: '已邀请' },
  confirmed: { en: 'Confirmed', zh: '已确认' },
  attended: { en: 'Attended', zh: '已出席' },
  absent: { en: 'Absent', zh: '缺席' },
  proxy: { en: 'Proxy', zh: '委托代理' },
};

/** 出席状态徽章样式（保持原有） */
const statusColors: Record<string, string> = {
  invited: 'bg-gray-100 text-gray-700',
  confirmed: 'bg-blue-100 text-blue-700',
  attended: 'bg-green-100 text-green-700',
  absent: 'bg-red-100 text-red-700',
  proxy: 'bg-orange-100 text-orange-700',
};

/** 【新增】读取 Edge Function 非 2xx 时的 JSON 正文，便于控制台与弹窗提示 */
async function readFunctionErrorBody(err: FunctionsHttpError): Promise<Record<string, unknown>> {
  try {
    return (await err.context.clone().json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** 用户可见的补充说明（如 Resend 测试模式限制） */
function pickInviteFailureHint(body: Record<string, unknown>, en: boolean): string | undefined {
  if (body.code === 'RESEND_TESTING_RESTRICTION') {
    const zh = typeof body.message_zh === 'string' ? body.message_zh : '';
    const eng = typeof body.message_en === 'string' ? body.message_en : '';
    return en ? eng || zh : zh || eng;
  }
  const details = body.details;
  if (details && typeof details === 'object' && details !== null) {
    const d = details as Record<string, unknown>;
    const name = typeof d.name === 'string' ? d.name : '';
    const msg = typeof d.message === 'string' ? d.message : '';
    if (name === 'validation_error' && /testing email|only send|verify a domain|can only send/i.test(msg)) {
      return en
        ? 'Email sending is restricted. Verify your domain in Resend and enable production sending, or use an allowed test recipient until then.'
        : '当前邮箱发送受限，请先完成邮件服务正式发送权限开通';
    }
  }
  return undefined;
}

export function MeetingAttendanceSection({ meetingId, isCouncil }: Props) {
  const { currentPropertyId } = useProperty();
  const { user, session } = useAuth();
  const { language, t } = useLanguage();
  const l = language === 'en';

  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [allUsers, setAllUsers] = useState<{ id: string; full_name_en: string; full_name_zh?: string; email: string }[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [addError, setAddError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /**
   * 【新增】每用户邮件发送 UI 状态。
   * - idle：可点「发送邀请」
   * - sending：显示「发送中」，隐藏按钮
   * - sent：显示「已发送」，隐藏按钮
   * - error：显示「重试发送」，可再次点击
   * 未出现在 Record 中的 userId 视为 idle。
   */
  const [emailStatus, setEmailStatus] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({});
  /** 发送失败时的补充说明（如邮件服务未开通正式发送） */
  const [inviteFailureHints, setInviteFailureHints] = useState<Record<string, string | undefined>>({});

  /** 【新增】取某用户的当前邮件状态（缺省为 idle） */
  const getEmailUiState = (userId: string) => emailStatus[userId] ?? 'idle';

  /**
   * 【新增】发送会议邀请邮件：带 access_token、调用 Edge Function、完整错误处理与弹窗。
   * 参数为整行 attendee，便于取 user_id、展示名与 profile.email（传给后端作校验/日志，后端仍以库中 profile 为准）。
   */
  const handleSendInvite = async (attendee: Attendee) => {
    const userId = attendee.user_id;
    const userEmail = attendee.profile?.email;

    if (!currentPropertyId) {
      const msg = l ? 'No property selected.' : '未选择物业。';
      alert(msg);
      return;
    }

    console.log('send invite clicked', { meetingId, userId });
    console.log('recipients count', 1);
    console.log(
      '[MeetingInvite] 开始发送邀请给用户：',
      userId,
      userEmail ? `(${userEmail})` : '',
      '会议：',
      meetingId,
    );

    setEmailStatus((prev) => ({ ...prev, [userId]: 'sending' }));
    setInviteFailureHints((prev) => {
      const next = { ...prev };
      delete next[userId];
      return next;
    });

    const persistInviteDelivery = async (status: 'sent' | 'failed') => {
      const row = {
        meeting_id: meetingId,
        property_id: currentPropertyId,
        recipient_user_id: userId,
        email: userEmail ?? null,
        delivery_channel: 'email',
        delivery_status: status,
        sent_at: status === 'sent' ? new Date().toISOString() : null,
      };
      await withProperty(
        supabase.from('meeting_invitations').upsert(row, { onConflict: 'meeting_id,recipient_user_id' }) as any,
        currentPropertyId,
      );
    };

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        console.error('[MeetingInvite] getSession 错误:', sessionErr);
      }

      const accessToken = sessionData.session?.access_token ?? session?.access_token;
      if (!accessToken) {
        const msg = l ? 'Not signed in. Please log in again.' : '未登录或会话已过期，请重新登录。';
        console.error('[MeetingInvite] 无 access_token');
        setEmailStatus((prev) => ({ ...prev, [userId]: 'error' }));
        alert(msg);
        return;
      }

      console.log('invoking send-meeting-invite', { meetingId, property_id: currentPropertyId, userId });

      const { data, error } = await supabase.functions.invoke('send-meeting-invite', {
        body: {
          meeting_id: meetingId,
          user_id: userId,
          property_id: currentPropertyId,
          user_email: userEmail ?? undefined,
          locale: language,
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (error) {
        console.error('[MeetingInvite] invoke 返回 error:', error);
        let errBody: Record<string, unknown> = {};
        if (error instanceof FunctionsHttpError) {
          errBody = await readFunctionErrorBody(error);
          console.error('send-meeting-invite error', errBody);
          console.error('[MeetingInvite] HTTP', error.context.status, error.context.statusText, errBody);
        }
        setEmailStatus((prev) => ({ ...prev, [userId]: 'error' }));
        setInviteFailureHints((prev) => ({
          ...prev,
          [userId]: pickInviteFailureHint(errBody, l),
        }));
        await persistInviteDelivery('failed');
        const httpMsg =
          (typeof errBody.message === 'string' && errBody.message) ||
          (typeof errBody.error === 'string' && errBody.error) ||
          error.message;
        alert(l ? `发送失败：${httpMsg}` : `Send failed: ${httpMsg}`);
        return;
      }

      const payload = data as Record<string, unknown> | null;
      if (payload && payload.ok === false) {
        const msg =
          (typeof payload.message === 'string' && payload.message) ||
          (typeof payload.error === 'string' && payload.error) ||
          'send-meeting-invite failed';
        console.error('send-meeting-invite error', msg, payload.detail);
        setEmailStatus((prev) => ({ ...prev, [userId]: 'error' }));
        setInviteFailureHints((prev) => ({
          ...prev,
          [userId]: pickInviteFailureHint(payload, l) ?? msg,
        }));
        await persistInviteDelivery('failed');
        alert(l ? `发送失败：${msg}` : `Send failed: ${msg}`);
        return;
      }

      if (data && typeof data === 'object' && data !== null && 'error' in data && !('ok' in data)) {
        console.error('[MeetingInvite] 响应体含 error:', data);
        const errBody = data as Record<string, unknown>;
        setEmailStatus((prev) => ({ ...prev, [userId]: 'error' }));
        setInviteFailureHints((prev) => ({
          ...prev,
          [userId]: pickInviteFailureHint(errBody, l),
        }));
        await persistInviteDelivery('failed');
        return;
      }

      console.log('send-meeting-invite success', data);
      console.log('[MeetingInvite] 发送成功:', data);
      await persistInviteDelivery('sent');
      setEmailStatus((prev) => ({ ...prev, [userId]: 'sent' }));
      setInviteFailureHints((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (e) {
      console.error('[MeetingInvite] 未捕获异常:', e);
      setEmailStatus((prev) => ({ ...prev, [userId]: 'error' }));
      await persistInviteDelivery('failed');
    }
  };

  /** 【保持原有】加载参会列表与 profile */
  const loadAttendees = useCallback(async () => {
    if (!currentPropertyId) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('meeting_attendees')
        .select('*')
        .eq('property_id', currentPropertyId)
        .eq('meeting_id', meetingId)
        .order('created_at', { ascending: true });

      if (data) {
        const withProfiles = await Promise.all(
          data.map(async (att) => {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name_en, full_name_zh, email')
              .eq('id', att.user_id)
              .maybeSingle();
            return { ...att, profile: profile || undefined };
          })
        );
        setAttendees(withProfiles);
      }
    } catch (error) {
      console.error('Error loading attendees:', error);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    loadAttendees();
  }, [loadAttendees]);

  const openAddForm = async () => {
    if (!currentPropertyId) return;
    setShowAddForm(true);
    const { data: members } = await supabase
      .from('property_members')
      .select('user_id')
      .eq('property_id', currentPropertyId)
      .eq('status', 'active');
    const ids = [...new Set((members ?? []).map((m) => m.user_id as string))];
    if (ids.length === 0) {
      setAllUsers([]);
      return;
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name_en, full_name_zh, email')
      .in('id', ids)
      .order('full_name_en');
    if (data) {
      const existingIds = new Set(attendees.map(a => a.user_id));
      setAllUsers(data.filter(u => !existingIds.has(u.id)));
    }
  };

  const addAttendee = async () => {
    if (!selectedUserId) {
      setAddError(l ? 'Please select a user' : '请选择用户');
      return;
    }

    setSaving(true);
    setAddError(null);

    try {
      const { data, error } = await supabase
        .from('meeting_attendees')
        .insert({
          property_id: currentPropertyId,
          meeting_id: meetingId,
          user_id: selectedUserId,
          attendance_status: 'invited',
        })
        .select();

      if (error) {
        setAddError(l ? `Could not add: ${error.message}` : `添加失败：${error.message}`);
        return;
      }
      if (!data || data.length === 0) {
        setAddError(l ? 'Could not add: insufficient permission' : '添加失败：权限不足');
        return;
      }

      const row = data[0];
      const invitedUserId = selectedUserId;
      const fromPicker = allUsers.find((u) => u.id === invitedUserId);

      setShowAddForm(false);
      setSelectedUserId('');
      await loadAttendees();

      /**
       * 【新增】添加成功后自动发邀请：构造最小 Attendee 传给 handleSendInvite，
       * profile 优先用弹窗里选中的用户邮箱，避免等列表刷新后再点一次。
       */
      const syntheticAttendee: Attendee = {
        id: row.id,
        meeting_id: meetingId,
        user_id: invitedUserId,
        attendance_status: 'invited',
        is_proxy: false,
        profile: fromPicker
          ? {
              full_name_en: fromPicker.full_name_en,
              full_name_zh: fromPicker.full_name_zh,
              email: fromPicker.email,
            }
          : undefined,
      };
      void handleSendInvite(syntheticAttendee);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      setAddError(l ? `Could not add: ${msg}` : `添加失败：${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const signIn = async () => {
    if (!user || !currentPropertyId) return;

    const existingAttendee = attendees.find(a => a.user_id === user.id);
    if (!existingAttendee) return;

    try {
      const { error } = await supabase
        .from('meeting_attendees')
        .update({
          property_id: currentPropertyId,
          attendance_status: 'attended',
          signed_in_at: new Date().toISOString(),
        })
        .eq('id', existingAttendee.id)
        .eq('property_id', currentPropertyId);

      if (error) throw error;
      loadAttendees();
    } catch (error) {
      console.error('Error signing in:', error);
      alert(t('attendance_signin_failed'));
    }
  };

  const currentUserAttendee = attendees.find(a => a.user_id === user?.id);
  const canSignIn = currentUserAttendee && currentUserAttendee.attendance_status !== 'attended';
  const attendedCount = attendees.filter(a => a.attendance_status === 'attended').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {l ? 'Attendance' : '出席签到'} ({attendedCount}/{attendees.length})
        </h3>
        <div className="flex items-center gap-2">
          {canSignIn && (
            <button
              type="button"
              onClick={signIn}
              className="flex items-center gap-1.5 text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 transition-colors"
            >
              <UserCheck size={16} />
              {l ? 'Sign in' : '我要签到'}
            </button>
          )}
          {isCouncil && !showAddForm && (
            <button
              type="button"
              onClick={openAddForm}
              className="flex items-center gap-1.5 text-sm bg-[#1D9E75] text-white px-3 py-1.5 rounded-lg hover:bg-[#178a66] transition-colors"
            >
              <Plus size={16} />
              {l ? 'Invite' : '邀请参会'}
            </button>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">{l ? 'Invite attendees' : '邀请参会人员'}</h4>
            <button type="button" onClick={() => { setShowAddForm(false); setAddError(null); }} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">{l ? 'User' : '选择用户'}</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
              >
                <option value="">{l ? '-- Select --' : '-- 请选择 --'}</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name_zh || u.full_name_en} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {addError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                <p className="text-xs text-red-700">{addError}</p>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={addAttendee}
                disabled={saving}
                className="bg-[#1D9E75] text-white px-4 py-2 text-sm rounded-lg hover:bg-[#178a66] transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {saving && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                {saving ? (l ? 'Adding...' : '添加中...') : (l ? 'Send invite' : '确认邀请')}
              </button>
              <button
                type="button"
                onClick={() => { setShowAddForm(false); setAddError(null); }}
                className="bg-gray-200 text-gray-700 px-4 py-2 text-sm rounded-lg hover:bg-gray-300 transition-colors"
              >
                {l ? 'Cancel' : '取消'}
              </button>
            </div>
          </div>
        </div>
      )}

      {attendees.length === 0 ? (
        <div className="text-center py-12">
          <Users className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-500">{l ? 'No attendees yet' : '暂无参会人员'}</p>
          {isCouncil && (
            <p className="text-sm text-gray-400 mt-1">
              {l ? 'Use “Invite” to add attendees' : '点击“邀请参会”添加参会人员'}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {attendees.map((attendee) => {
            const mailState = getEmailUiState(attendee.user_id);
            const showInviteBtn =
              isCouncil &&
              attendee.attendance_status === 'invited' &&
              mailState !== 'sending' &&
              mailState !== 'sent';
            /** 邮件发送失败时不与「已邀请」出席状态徽章同时展示 */
            const showAttendanceStatusBadge =
              !(mailState === 'error' && attendee.attendance_status === 'invited');
            const failureHint = inviteFailureHints[attendee.user_id];

            return (
              <div key={attendee.id} className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  attendee.attendance_status === 'attended' ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  {attendee.attendance_status === 'attended' ? (
                    <UserCheck size={20} className="text-green-600" />
                  ) : (
                    <UserX size={20} className="text-gray-400" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">
                    {attendee.profile?.full_name_zh || attendee.profile?.full_name_en || (l ? 'Unknown user' : '未知用户')}
                  </p>
                  <p className="text-xs text-gray-500">{attendee.profile?.email}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {mailState === 'sending' && (
                      <span className="text-xs text-blue-500 flex items-center gap-1">
                        <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        {l ? 'Sending…' : '发送中'}
                      </span>
                    )}
                    {mailState === 'sent' && (
                      <span className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle size={12} aria-hidden />
                        {l ? 'Sent' : '已发送'}
                      </span>
                    )}
                    {mailState === 'error' && (
                      <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                        <AlertCircle size={12} aria-hidden />
                        {l ? 'Send failed' : '发送失败'}
                      </span>
                    )}

                    {showInviteBtn && (
                      <button
                        type="button"
                        onClick={() => handleSendInvite(attendee)}
                        className="text-xs text-[#1D9E75] hover:text-[#178a66] flex items-center gap-1 transition-colors font-medium"
                        title={l ? 'Send invitation email' : '发送邀请邮件'}
                      >
                        <Mail size={13} aria-hidden />
                        {mailState === 'error' ? (l ? 'Retry send' : '重试发送') : (l ? 'Send invite' : '发送邀请')}
                      </button>
                    )}

                    {showAttendanceStatusBadge && (
                      <span
                        className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[attendee.attendance_status] || 'bg-gray-100 text-gray-700'}`}
                      >
                        {statusLabels[attendee.attendance_status]?.[language] || attendee.attendance_status}
                      </span>
                    )}
                    {attendee.signed_in_at && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={12} aria-hidden />
                        {new Date(attendee.signed_in_at).toLocaleTimeString(l ? 'en-US' : 'zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    )}
                  </div>
                  {mailState === 'error' && failureHint ? (
                    <p className="text-[11px] text-red-600/90 text-right leading-snug max-w-[280px]">
                      {failureHint}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
