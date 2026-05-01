import { useCallback, useEffect, useState } from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import type { AnnouncementPriority } from '../../lib/supabase';

type DirectNotifRow = {
  id: string;
  title: string;
  message: string;
  priority: AnnouncementPriority;
  created_at: string;
  is_read: boolean;
  /** null = sent by system */
  created_by: string | null;
  /** null = sent to self (owner view); present in council/admin view */
  user_id: string | null;
  /** Resolved display name for council/admin view */
  recipientName?: string;
  senderName?: string;
};

function priorityChipClass(p: AnnouncementPriority): string {
  if (p === 'urgent') return 'bg-red-50 text-red-800 ring-red-200';
  if (p === 'important') return 'bg-amber-50 text-amber-900 ring-amber-200';
  return 'bg-gray-100 text-gray-600 ring-gray-200';
}

function priorityLabel(p: AnnouncementPriority, en: boolean): string {
  if (p === 'urgent') return en ? 'Urgent' : '紧急';
  if (p === 'important') return en ? 'Important' : '重要';
  return en ? 'Normal' : '普通';
}

function formatDate(iso: string, language: string): string {
  try {
    return new Date(iso).toLocaleString(language === 'en' ? 'en-CA' : 'zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

const STAFF_ROLES = new Set(['council', 'admin', 'manager', 'property_admin']);

/**
 * Shows direct_message notifications from `user_notifications`.
 * - Owner: sees only messages addressed to themselves for this property.
 * - Council/admin: sees ALL direct messages for this property (via RLS policy).
 */
export function DirectNotificationsSection() {
  const { user } = useAuth();
  const { currentPropertyId, roleInProperty } = useProperty();
  const { language } = useLanguage();
  const en = language === 'en';

  const isStaff = STAFF_ROLES.has(roleInProperty ?? '');

  const [rows, setRows] = useState<DirectNotifRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentPropertyId || !user?.id) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let q = supabase
        .from('user_notifications')
        .select('id, title, message, priority, created_at, is_read, user_id, created_by')
        .eq('related_property_id', currentPropertyId)
        .eq('type', 'direct_message')
        .order('created_at', { ascending: false })
        .limit(100);

      // Owners can only see their own; council/admin RLS policy exposes all property rows
      if (!isStaff) {
        q = q.eq('user_id', user.id);
      }

      const { data, error: qErr } = await q;
      if (qErr) {
        setError(en ? 'Could not load notifications.' : '无法加载通知。');
        setRows([]);
        return;
      }

      const rawRows = (data ?? []) as DirectNotifRow[];

      // For council/admin: resolve recipient and sender profile names
      if (isStaff && rawRows.length > 0) {
        const profileIds = new Set<string>();
        for (const r of rawRows) {
          if (r.user_id) profileIds.add(r.user_id);
          if (r.created_by) profileIds.add(r.created_by);
        }
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, full_name_zh, full_name_en, email')
          .in('id', [...profileIds]);

        const nameMap = new Map<string, string>();
        for (const p of (prof ?? []) as Array<{ id: string; full_name_zh: string | null; full_name_en: string | null; email: string }>) {
          const name = (p.full_name_zh?.trim() || p.full_name_en?.trim() || p.email?.trim() || '—');
          nameMap.set(p.id, name);
        }

        setRows(
          rawRows.map((r) => ({
            ...r,
            recipientName: r.user_id ? (nameMap.get(r.user_id) ?? r.user_id.slice(0, 8)) : '—',
            senderName: r.created_by ? (nameMap.get(r.created_by) ?? r.created_by.slice(0, 8)) : (en ? 'System' : '系统'),
          })),
        );
      } else {
        setRows(rawRows);
      }
    } finally {
      setLoading(false);
    }
  }, [currentPropertyId, user?.id, isStaff, en]);

  useEffect(() => {
    void load();
  }, [load]);

  const markRead = async (id: string) => {
    await supabase.from('user_notifications').update({ is_read: true }).eq('id', id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, is_read: true } : r)));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="w-8 h-8 text-[#1D9E75] animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <section className="mb-10 scroll-mt-24 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-transparent px-5 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
          <Bell size={20} aria-hidden />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">
            {en ? 'My notifications' : '我的通知'}
          </h2>
          <p className="text-sm text-gray-500">
            {isStaff
              ? en
                ? 'All direct notifications sent within this property.'
                : '本物业全部单人通知记录。'
              : en
                ? 'Notifications sent to you by the strata council or administrator.'
                : '由业委会或管理员发给您的通知。'}
          </p>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{error}</div>
        ) : rows.length === 0 ? (
          <p className="py-10 text-center text-sm text-gray-500 rounded-lg bg-gray-50 border border-dashed border-gray-200">
            {en ? 'No notifications yet.' : '暂无通知。'}
          </p>
        ) : (
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className={`rounded-lg border p-4 transition ${
                  row.is_read
                    ? 'border-gray-100 bg-gray-50/80'
                    : 'border-blue-100 bg-blue-50/60 shadow-sm'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 pr-2 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {!row.is_read && (
                        <span className="inline-block w-2 h-2 rounded-full bg-blue-500 shrink-0" aria-label={en ? 'Unread' : '未读'} />
                      )}
                      <h3 className="text-sm font-semibold text-gray-900">{row.title}</h3>
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${priorityChipClass(row.priority ?? 'normal')}`}
                      >
                        {priorityLabel(row.priority ?? 'normal', en)}
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-700">{row.message}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 pt-1">
                      {isStaff && row.recipientName && (
                        <span>
                          {en ? 'To: ' : '接收人：'}
                          <span className="font-medium text-gray-700">{row.recipientName}</span>
                        </span>
                      )}
                      {isStaff && row.senderName && (
                        <span>
                          {en ? 'From: ' : '发件人：'}
                          <span className="font-medium text-gray-700">{row.senderName}</span>
                        </span>
                      )}
                      <time dateTime={row.created_at}>{formatDate(row.created_at, language)}</time>
                    </div>
                  </div>
                  {!row.is_read && !isStaff && (
                    <button
                      type="button"
                      onClick={() => void markRead(row.id)}
                      className="shrink-0 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
                    >
                      {en ? 'Mark read' : '标为已读'}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
