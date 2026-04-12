import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { meetingTimeIso } from '../lib/meetingDisplay';

type MeetingRow = {
  id: string;
  title_en: string;
  title_zh?: string | null;
  scheduled_date?: string | null;
  created_at?: string | null;
  status: string;
};

export function Meetings() {
  const { user } = useAuth();
  const { currentPropertyId, isDemoMode, guestPropertyCode } = useProperty();
  const { language } = useLanguage();
  const en = language === 'en';
  const [rows, setRows] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentPropertyId) {
      setRows([]);
      setLoading(false);
      return;
    }
    if (isDemoMode && guestPropertyCode) {
      let cancelled = false;
      setLoading(true);
      void (async () => {
        const { data, error } = await supabase.rpc('demo_meetings_preview', {
          p_code: guestPropertyCode,
          p_limit: 40,
        });
        if (cancelled) return;
        if (error) {
          console.error(error);
          setRows([]);
        } else {
          const raw = data as { ok?: boolean; items?: MeetingRow[] } | null;
          setRows((raw?.items ?? []) as MeetingRow[]);
        }
        setLoading(false);
      })();
      return () => {
        cancelled = true;
      };
    }
    if (!user) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('property_id', currentPropertyId)
        .order('created_at', { ascending: false })
        .limit(80);
      if (!cancelled) {
        if (error) {
          console.error(error);
          setRows([]);
        } else {
          setRows((data ?? []) as MeetingRow[]);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, currentPropertyId, isDemoMode, guestPropertyCode]);

  if (!currentPropertyId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 text-center text-gray-600">
        {en ? 'Select a property first.' : '请先选择物业。'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline"
        >
          <ChevronLeft className="size-4" />
          {en ? 'Home' : '首页'}
        </Link>
        {!isDemoMode && (
          <Link to="/meetings/create" className="btn-primary">
            {en ? 'New meeting' : '新建会议'}
          </Link>
        )}
      </div>

      <h1 className="text-2xl font-bold text-gray-900">{en ? 'Meetings' : '会议'}</h1>
      <p className="mt-1 text-sm text-gray-600">
        {en ? 'Open a meeting to vote and view agenda.' : '进入会议可查看议程并投票。'}
      </p>

      {loading ? (
        <div className="mt-10 flex justify-center">
          <Loader2 className="size-8 animate-spin text-gray-400" />
        </div>
      ) : rows.length === 0 ? (
        <p className="mt-8 text-gray-600">{en ? 'No meetings yet.' : '暂无会议。'}</p>
      ) : (
        <ul className="mt-6 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
          {rows.map((m) => {
            const timeIso = meetingTimeIso(m);
            const when = timeIso
              ? new Date(timeIso).toLocaleString(en ? 'en-CA' : 'zh-CN', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })
              : '—';
            return (
              <li key={m.id}>
                {isDemoMode ? (
                  <div className="flex items-center justify-between gap-3 px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{m.title_zh?.trim() || m.title_en}</div>
                      <div className="text-xs text-gray-500">
                        {when} · {m.status}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    to={`/voting/${m.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-4 hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{m.title_zh?.trim() || m.title_en}</div>
                      <div className="text-xs text-gray-500">
                        {when} · {m.status}
                      </div>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-gray-400" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!isDemoMode && (
        <p className="mt-8 text-sm text-gray-500">
          {en ? 'Full voting UI: ' : '完整投票界面：'}
          <Link to="/voting" className="text-emerald-700 hover:underline">
            /voting
          </Link>
        </p>
      )}
    </div>
  );
}

export default Meetings;
