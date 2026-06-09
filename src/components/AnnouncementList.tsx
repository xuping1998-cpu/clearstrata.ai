import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Megaphone } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';
import { supabase, type AnnouncementPriority } from '../lib/supabase';

function priorityLabel(p: AnnouncementPriority, en: boolean) {
  if (p === 'urgent') return en ? 'Urgent' : '紧急';
  if (p === 'important') return en ? 'Important' : '重要';
  return en ? 'Normal' : '普通';
}

function priorityClass(p: AnnouncementPriority) {
  if (p === 'urgent') return 'bg-red-100 text-red-800';
  if (p === 'important') return 'bg-orange-100 text-orange-800';
  return 'bg-gray-100 text-gray-700';
}

type Row = {
  id: string;
  title: string;
  priority: AnnouncementPriority;
  created_at: string;
};

export interface AnnouncementListProps {
  /** Max items to show; default 3 to match former dashboard. */
  limit?: number;
}

export function AnnouncementList({ limit = 3 }: AnnouncementListProps) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const { currentPropertyId } = useProperty();
  const en = language === 'en';
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentPropertyId) return;
    (async () => {
      const { data, error: qErr } = await supabase
        .from('community_notifications')
        .select('id, title, priority, created_at')
        .eq('property_id', currentPropertyId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (qErr) {
        setError(qErr.message);
        setRows([]);
        return;
      }
      setRows((data as Row[]) || []);
      setError(null);
    })();
  }, [limit, currentPropertyId]);

  if (error) {
    return (
      <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        {en ? 'Could not load announcements.' : '无法加载公告。'}
      </div>
    );
  }

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <Megaphone className="text-[#1D9E75]" size={22} aria-hidden />
          <h2 className="text-lg font-bold text-gray-900">{en ? 'Important Announcements' : '重大公告'}</h2>
        </div>
        <button
          type="button"
          onClick={() => navigate('/owner-info?tab=announcements#owner-announcements')}
          className="text-sm font-medium text-[#1D9E75] hover:text-[#188a66]"
        >
          {en ? 'View all' : '查看全部'}
        </button>
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-start gap-2 border-b border-gray-100 pb-3 last:border-0 last:pb-0">
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
