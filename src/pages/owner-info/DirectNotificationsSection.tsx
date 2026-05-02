/**
 * DirectNotificationsSection
 * Displays council→member single-user direct notifications (type = 'direct_message').
 * - Owners see only their own messages.
 * - Council/admin/manager see all direct messages for the property.
 * Data lives in `public.notifications` with the extra columns added in migration
 * 20260830120000_notifications_direct_message.sql.
 */
import { useCallback, useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';

type DirectMessage = {
  id: string;
  user_id: string;
  title: string | null;
  title_en: string | null;
  content: string | null;
  message_en: string | null;
  priority: string;
  read: boolean;
  created_at: string;
  created_by: string | null;
};

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

  const isStaff = memberRole === 'council' || memberRole === 'admin' || memberRole === 'manager' || memberRole === 'property_admin';

  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
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
      let query = supabase
        .from('notifications')
        .select('id, user_id, title, title_en, content, message_en, priority, read, created_at, created_by')
        .eq('type', 'direct_message')
        .eq('property_id', currentPropertyId)
        .order('created_at', { ascending: false })
        .limit(50);

      // Non-staff owners only see their own messages (RLS enforces this too).
      if (!isStaff) {
        query = query.eq('user_id', user.id);
      }

      const { data, error: err } = await query;
      if (err) {
        setError(en ? 'Could not load notifications.' : '无法加载通知。');
        console.warn('[DirectNotificationsSection] load error', err);
        return;
      }
      setMessages((data ?? []) as DirectMessage[]);
    } finally {
      setLoading(false);
    }
  }, [currentPropertyId, user?.id, isStaff, en]);

  useEffect(() => { void load(); }, [load]);

  const markRead = async (id: string) => {
    const { error: err } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    if (err) {
      console.warn('[DirectNotificationsSection] markRead error', err);
      return;
    }
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, read: true } : m)));
  };

  const getTitle = (m: DirectMessage) =>
    (m.title ?? m.title_en ?? (en ? 'Notification' : '通知')).trim() || (en ? 'Notification' : '通知');
  const getContent = (m: DirectMessage) =>
    (m.content ?? m.message_en ?? '').trim();
  const getPriorityLabel = (p: string) => {
    const pair = PRIORITY_LABEL[p];
    return pair ? (en ? pair[0] : pair[1]) : p;
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
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
      )}

      {!loading && !error && messages.length === 0 && (
        <p className="text-sm text-gray-500 py-4">
          {en ? 'No personal notifications yet.' : '暂无个人通知。'}
        </p>
      )}

      {!loading && !error && messages.length > 0 && (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className={`rounded-xl border px-4 py-3 text-sm transition-colors ${
                m.read ? 'bg-white border-gray-100' : 'bg-blue-50 border-blue-100'
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-gray-900 ${m.read ? '' : 'font-semibold'}`}>
                    {getTitle(m)}
                  </p>
                  {getContent(m) && (
                    <p className="mt-1 text-gray-700 whitespace-pre-wrap break-words">{getContent(m)}</p>
                  )}
                  <p className="mt-1.5 text-xs text-gray-400">{formatDate(m.created_at, language)}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
                      PRIORITY_CLASS[m.priority] ?? PRIORITY_CLASS.normal
                    }`}
                  >
                    {getPriorityLabel(m.priority)}
                  </span>
                  {!m.read && !isStaff && (
                    <button
                      type="button"
                      onClick={() => void markRead(m.id)}
                      className="text-xs text-blue-700 hover:underline"
                    >
                      {en ? 'Mark read' : '标为已读'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
