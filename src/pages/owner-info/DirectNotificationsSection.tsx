/**
 * DirectNotificationsSection
 * Personal notifications for the current user at the current property:
 * - `notifications` rows with type = direct_message (council→member)
 * - `user_notifications` rows with types in PERSONAL_USER_NOTIFICATION_TYPES (e.g. sgm_pause)
 *
 * Council/admin/manager also see all property direct messages with recipient + sender labels.
 */
import { useCallback, useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import {
  displayUserNotificationMessage,
  displayUserNotificationTitle,
  PERSONAL_USER_NOTIFICATION_TYPES,
} from '@/lib/notifications/userNotificationDisplay';

type DirectMessage = {
  id: string;
  user_id: string;
  created_by: string | null;
  title: string | null;
  content: string | null;
  priority: string;
  read: boolean;
  created_at: string;
  source: 'notifications';
};

type UserInboxMessage = {
  id: string;
  user_id: string;
  title: string | null;
  content: string | null;
  read: boolean;
  created_at: string;
  source: 'user_notifications';
  notification_type: string;
};

type PersonalNotification = DirectMessage | UserInboxMessage;

const PRIORITY_LABEL: Record<string, [string, string]> = {
  normal:    ['Normal',    '普通'],
  important: ['Important', '重要'],
  urgent:    ['Urgent',    '紧急'],
};

const PRIORITY_CLASS: Record<string, string> = {
  normal:    'bg-gray-50 text-gray-700 border-gray-200',
  important: 'bg-amber-50 text-amber-900 border-amber-200',
  urgent:    'bg-red-50 text-red-900 border-red-200',
};

function formatDate(iso: string, lang: string) {
  try {
    return new Date(iso).toLocaleString(lang === 'en' ? 'en-CA' : 'zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

export function DirectNotificationsSection() {
  const { user } = useAuth();
  const { currentPropertyId, memberRole } = useProperty();
  const { language } = useLanguage();
  const en = language === 'en';

  const isStaff =
    memberRole === 'council' ||
    memberRole === 'admin' ||
    memberRole === 'manager' ||
    memberRole === 'property_admin';

  const [messages, setMessages] = useState<PersonalNotification[]>([]);
  const [userMap, setUserMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentPropertyId || !user?.id) {
      setMessages([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Step 1: load notifications
      let query = supabase
        .from('notifications')
        .select('id, user_id, created_by, title, content, priority, read, created_at')
        .eq('type', 'direct_message')
        .eq('property_id', currentPropertyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (!isStaff) {
        query = query.eq('user_id', user.id);
      }

      const { data: notifData, error: notifErr } = await query;
      if (notifErr) {
        setError(en ? 'Could not load notifications.' : '无法加载通知。');
        console.warn('[DirectNotificationsSection] load error', notifErr);
        return;
      }

      const rows = (notifData ?? []) as Omit<DirectMessage, 'source'>[];
      const directRows: DirectMessage[] = rows.map((row) => ({ ...row, source: 'notifications' }));

      const { data: inboxData, error: inboxErr } = await supabase
        .from('user_notifications')
        .select('id, user_id, title, message, type, is_read, created_at')
        .eq('user_id', user.id)
        .eq('related_property_id', currentPropertyId)
        .in('type', [...PERSONAL_USER_NOTIFICATION_TYPES])
        .order('created_at', { ascending: false })
        .limit(50);

      if (inboxErr) {
        setError(en ? 'Could not load notifications.' : '无法加载通知。');
        console.warn('[DirectNotificationsSection] user_notifications load error', inboxErr);
        return;
      }

      const inboxRows: UserInboxMessage[] = (inboxData ?? []).map((row) => {
        const r = row as {
          id: string;
          user_id: string;
          title?: string | null;
          message?: string | null;
          type?: string | null;
          is_read?: boolean;
          created_at: string;
        };
        const nType = String(r.type ?? '').toLowerCase();
        return {
          id: r.id,
          user_id: r.user_id,
          title: displayUserNotificationTitle(nType, r.title ?? '', en),
          content: displayUserNotificationMessage(nType, r.message ?? ''),
          read: Boolean(r.is_read),
          created_at: r.created_at,
          source: 'user_notifications',
          notification_type: nType,
        };
      });

      const merged = [...directRows, ...inboxRows].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setMessages(merged);

      const profileSourceRows = directRows;

      // Step 2: collect user ids for direct-message sender/recipient labels
      const allIds = Array.from(
        new Set([
          ...profileSourceRows.map((n) => n.user_id),
          ...profileSourceRows.map((n) => n.created_by).filter((id): id is string => Boolean(id)),
        ]),
      );

      if (allIds.length > 0) {
      // Step 3: batch query profiles — only real columns: full_name_zh, full_name_en, email
      setLoadingProfiles(true);
      try {
        const { data: profileData, error: profileErr } = await supabase
          .from('profiles')
          .select('id, full_name_zh, full_name_en, email')
          .in('id', allIds);

        if (profileErr) {
          console.warn('[DirectNotificationsSection] profiles load error', profileErr);
          return;
        }

        console.log('[direct-message] profiles loaded', profileData);

        // Step 4: build display-name map
        const map = new Map<string, string>();
        for (const p of profileData ?? []) {
          const displayName =
            (p.full_name_zh as string | null)?.trim() ||
            (p.full_name_en as string | null)?.trim() ||
            (p.email as string | null)?.trim() ||
            (p.id as string);
          map.set(p.id as string, displayName);
        }
        setUserMap(map);
        console.log('[direct-message] userMap size', map.size);
      } finally {
        setLoadingProfiles(false);
      }
      }
    } finally {
      setLoading(false);
    }
  }, [currentPropertyId, user?.id, isStaff, en]);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (item: PersonalNotification) => {
    if (item.source === 'user_notifications') {
      const { error: err } = await supabase
        .from('user_notifications')
        .update({ is_read: true })
        .eq('id', item.id);
      if (err) {
        console.warn('[DirectNotificationsSection] markRead user_notifications error', err);
        return;
      }
    } else {
      const { error: err } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', item.id);
      if (err) {
        console.warn('[DirectNotificationsSection] markRead error', err);
        return;
      }
    }
    setMessages((prev) => prev.map((m) => (m.id === item.id && m.source === item.source ? { ...m, read: true } : m)));
  };

  const getPriorityLabel = (p: string) => {
    const pair = PRIORITY_LABEL[p];
    return pair ? (en ? pair[0] : pair[1]) : p;
  };

  const getDisplayName = (userId: string | null | undefined): string => {
    if (!userId) return '—';
    if (loadingProfiles) return en ? 'Loading…' : '加载中...';
    const name = userMap.get(userId);
    if (name) return name;
    return en ? 'Unknown user' : '未知用户';
  };

  if (!currentPropertyId) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Bell size={16} className="text-blue-600" />
        <h2 className="text-base font-semibold text-gray-900">
          {en ? 'Personal notifications' : '个人通知'}
        </h2>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <Loader2 className="w-7 h-7 text-[#1D9E75] animate-spin" />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          {error}
        </div>
      )}

      {!loading && !error && messages.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">
          {en ? 'No notifications yet.' : '暂无通知'}
        </p>
      )}

      {!loading && !error && messages.length > 0 && (
        <ul className="space-y-3">
          {messages.map((m) => {
            const isInbox = m.source === 'user_notifications';
            const priorityKey = isInbox ? 'important' : m.priority;
            return (
            <li
              key={`${m.source}-${m.id}`}
              className={`rounded-xl border px-4 py-3 text-sm transition-colors ${
                m.read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-gray-900 ${m.read ? '' : 'font-semibold'}`}>
                    {(m.title ?? '').trim() || (en ? 'Notification' : '通知')}
                  </p>
                  {(m.content ?? '').trim() && (
                    <p className="mt-1 text-gray-700 whitespace-pre-wrap break-words">
                      {m.content}
                    </p>
                  )}

                  <p className="mt-1.5 text-xs text-gray-400 space-x-2">
                    {!isInbox && isStaff && (
                      <span>
                        {en ? 'To:' : '接收人：'}
                        <span className="font-medium text-gray-600 ml-1">{getDisplayName(m.user_id)}</span>
                      </span>
                    )}
                    {!isInbox && (
                      <span>
                        {en ? 'From:' : '发送人：'}
                        <span className="font-medium text-gray-600 ml-1">{getDisplayName(m.created_by)}</span>
                      </span>
                    )}
                    {isInbox && (
                      <span>{en ? 'Property notice' : '物业通知'}</span>
                    )}
                    <span>{formatDate(m.created_at, language)}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      PRIORITY_CLASS[priorityKey] ?? PRIORITY_CLASS.normal
                    }`}
                  >
                    {getPriorityLabel(priorityKey)}
                  </span>
                  {!m.read && !isStaff && (
                    <button
                      type="button"
                      onClick={() => void markRead(m)}
                      className="text-xs text-blue-700 hover:underline"
                    >
                      {en ? 'Mark read' : '标为已读'}
                    </button>
                  )}
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
