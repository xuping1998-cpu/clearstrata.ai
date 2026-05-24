import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';

type NotificationRow = {
  id: string;
  type: string | null;
  title: string;
  message: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

const POLL_MS = 10_000;

/** Extract property name from RPC-written Chinese join notification messages. */
function parsePropertyNameFromJoinMessage(message: string): string | null {
  const m = message.trim();
  const approved = m.match(/您已获准加入\s*(.+?)(?:\s*$|[。\n])/);
  if (approved?.[1]) return approved[1].trim();
  const rejected = m.match(/您加入\s*(.+?)\s*的申请未通过/);
  if (rejected?.[1]) return rejected[1].trim();
  return null;
}

function displayNotificationCopy(
  row: NotificationRow,
  en: boolean,
): { title: string; message: string } {
  if (!en) {
    return { title: row.title, message: row.message };
  }

  const type = String(row.type ?? '').toLowerCase();
  const propertyName = parsePropertyNameFromJoinMessage(row.message);

  if (type === 'join_request_approved') {
    return {
      title: 'Application approved',
      message: propertyName
        ? `You have been approved to join ${propertyName}`
        : row.message,
    };
  }

  if (type === 'join_request_rejected') {
    return {
      title: 'Application not approved',
      message: propertyName
        ? `Your request to join ${propertyName} was not approved.`
        : row.message,
    };
  }

  return { title: row.title, message: row.message };
}

/**
 * Unread user_notifications as stacked toasts; polls every 10s; dedupes by surfaced id.
 */
export function UserNotificationToast() {
  const navigate = useNavigate();
  const { session, user } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';

  const [visible, setVisible] = useState<NotificationRow[]>([]);
  /** ids already surfaced as a toast this session — avoids re-popping the same row on each poll */
  const surfacedIdsRef = useRef<Set<string>>(new Set());

  const fetchAndMerge = useCallback(async () => {
    if (!user?.id) return;

    const { data, error } = await supabase
      .from('user_notifications')
      .select('id, type, title, message, link, is_read, created_at')
      .eq('user_id', user.id)
      .eq('is_read', false)
      // Direct messages are shown in the owner-info announcements tab, not as toasts
      .neq('type', 'direct_message')
      .order('created_at', { ascending: false })
      .limit(5);

    console.log('notifications:', data);

    if (error) {
      console.error('user_notifications load', error);
      return;
    }

    const rows = (data ?? []) as NotificationRow[];
    const rowIds = new Set(rows.map((r) => r.id));

    setVisible((prev) => {
      let merged = prev.filter((p) => rowIds.has(p.id));

      for (const row of rows) {
        const alreadyInMerged = merged.some((m) => m.id === row.id);
        if (!surfacedIdsRef.current.has(row.id)) {
          surfacedIdsRef.current.add(row.id);
          if (!alreadyInMerged) merged.push(row);
          continue;
        }
        // Surfaced before but missing from local list (e.g. state reset) — restore
        if (!alreadyInMerged) merged.push(row);
      }
      return merged.slice(0, 5);
    });
  }, [user?.id]);

  useEffect(() => {
    if (!session || !user?.id) {
      setVisible([]);
      surfacedIdsRef.current.clear();
      return;
    }

    void fetchAndMerge();
    const t = window.setInterval(() => {
      void fetchAndMerge();
    }, POLL_MS);
    return () => window.clearInterval(t);
  }, [session, user?.id, fetchAndMerge]);

  const markRead = useCallback(async (id: string) => {
    const { error } = await supabase.from('user_notifications').update({ is_read: true }).eq('id', id);
    if (error) {
      console.error('user_notifications mark read', error);
    }
    setVisible((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleToastClick = (row: NotificationRow) => {
    void (async () => {
      await markRead(row.id);
      if (row.link && String(row.link).trim()) {
        const dest = String(row.link).trim();
        if (/^https?:\/\//i.test(dest)) {
          window.location.href = dest;
        } else {
          navigate(dest.startsWith('/') ? dest : `/${dest}`);
        }
      }
    })();
  };

  const handleClose = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    void markRead(id);
  };

  if (!session || !user?.id || visible.length === 0) {
    return null;
  }

  return (
    <div className="mb-4 space-y-2" aria-live="polite">
      {visible.map((row) => {
        const { title: displayTitle, message: displayMessage } = displayNotificationCopy(row, en);
        return (
        <div
          key={row.id}
          role="button"
          tabIndex={0}
          onClick={() => handleToastClick(row)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleToastClick(row);
            }
          }}
          className="w-full text-left rounded-xl border border-emerald-200 bg-emerald-50/95 px-4 py-3 pr-10 text-sm text-emerald-950 shadow-sm relative cursor-pointer hover:bg-emerald-50 transition-colors"
        >
          <p className="font-semibold text-emerald-900 pr-6">{displayTitle}</p>
          <p className="mt-1 whitespace-pre-line text-emerald-800/95">{displayMessage}</p>
          {row.link ? (
            <p className="mt-2 text-xs text-emerald-700/90">
              {en ? 'Click to open' : '点击查看'}
            </p>
          ) : (
            <p className="mt-2 text-xs text-emerald-700/80">
              {en ? 'Click to dismiss' : '点击关闭'}
            </p>
          )}
          <button
            type="button"
            onClick={(e) => handleClose(e, row.id)}
            className="absolute top-2 right-2 p-1.5 rounded-lg text-emerald-800 hover:bg-emerald-100/80"
            aria-label={en ? 'Dismiss' : '关闭'}
          >
            <X size={18} />
          </button>
        </div>
        );
      })}
    </div>
  );
}
