import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { DEFAULT_STRATA_ID } from '../lib/strataConfig';
import { fetchLatestStrataNotifications, type NotificationPriority } from '../lib/strataNotificationsApi';

function priorityLabel(p: NotificationPriority, en: boolean) {
  if (p === 'urgent') return en ? 'Urgent' : '紧急';
  if (p === 'important') return en ? 'Important' : '重要';
  return en ? 'Normal' : '普通';
}

function priorityClass(p: NotificationPriority) {
  if (p === 'urgent') return 'bg-red-100 text-red-800';
  if (p === 'important') return 'bg-orange-100 text-orange-800';
  return 'bg-gray-100 text-gray-700';
}

export function DashboardNotifications() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const en = language === 'en';
  const [rows, setRows] = useState<
    { id: string; title: string; priority: NotificationPriority; created_at: string; is_pinned: boolean }[]
  >([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchLatestStrataNotifications(3, DEFAULT_STRATA_ID);
        setRows(data as typeof rows);
        setError(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
        setRows([]);
      }
    })();
  }, []);

  if (error) {
    return (
      <div className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {en ? 'Could not load notifications.' : '无法加载通知。'}
      </div>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Bell className="text-[#1D9E75]" size={22} aria-hidden />
          <h2 className="text-lg font-bold text-gray-900">{en ? 'Latest notifications' : '最新通知'}</h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/owner-info?tab=notify')}
          className="text-sm font-medium text-[#1D9E75] hover:text-[#188a66]"
        >
          {en ? 'View all' : '查看全部'}
        </button>
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start gap-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
            {r.is_pinned && <span className="text-amber-600 shrink-0">📌</span>}
            <div className="min-w-0 flex-1">
              <p className="font-medium text-gray-900 truncate">{r.title}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span className={`rounded-full px-2 py-0.5 font-semibold ${priorityClass(r.priority)}`}>
                  {priorityLabel(r.priority, en)}
                </span>
                <time dateTime={r.created_at}>
                  {new Date(r.created_at).toLocaleString(en ? 'en-CA' : 'zh-CN', {
                    dateStyle: 'medium',
                    timeStyle: 'short',
                  })}
                </time>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
