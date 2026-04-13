import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  getMeetingsByPropertyAndYear,
  getMeetingDashboardStats,
  meetingTitleZhFirst,
  type MeetingRow,
} from './api';
import { labelFormat, labelMeetingType, labelStatus, meetingUiStrings } from './labels';

type Variant = 'voting' | 'meetings';

interface Props {
  variant: Variant;
}

export function MeetingListView({ variant }: Props) {
  const { user } = useAuth();
  const { currentPropertyId, roleInProperty, ready: propertyReady } = useProperty();
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();

  const fiscalYear = new Date().getFullYear();
  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [stats, setStats] = useState<{
    used: number;
    quota: number;
    remaining: number;
    agm: 'ok' | 'missing_agm';
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const isStaff =
    roleInProperty === 'council' ||
    roleInProperty === 'manager' ||
    roleInProperty === 'property_admin' ||
    roleInProperty === 'admin';

  const load = useCallback(async () => {
    if (!user || !propertyReady) return;
    if (!currentPropertyId) {
      setMeetings([]);
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    const [{ meetings: rows, error: e1 }, { stats: dash, error: e2 }] = await Promise.all([
      getMeetingsByPropertyAndYear(currentPropertyId, fiscalYear),
      getMeetingDashboardStats(currentPropertyId, fiscalYear),
    ]);
    if (e1) setErr(e1.message);
    if (e2 && !e1) setErr(e2.message);
    setMeetings(rows);
    if (dash) {
      setStats({
        used: dash.used_meetings,
        quota: dash.quota_meetings,
        remaining: dash.remaining_meetings,
        agm: dash.agm_status,
      });
    } else {
      setStats(null);
    }
    setLoading(false);
  }, [user, propertyReady, currentPropertyId, fiscalYear]);

  useEffect(() => {
    if (!user) {
      setMeetings([]);
      setLoading(false);
      return;
    }
    load();
  }, [user, load]);

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-600">
        {en ? 'Please sign in.' : '请先登录。'}
      </div>
    );
  }

  if (!propertyReady || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentPropertyId) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 text-center text-gray-600">
        {en ? 'Select a property to view meetings.' : '请先选择物业以查看会议。'}
      </div>
    );
  }

  const title =
    variant === 'voting'
      ? en
        ? 'Meetings & Voting'
        : '会议投票'
      : en
        ? 'Meetings'
        : '会议';

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-gradient-to-r from-[#1D9E75] to-[#178a66] text-white p-6">
        <div className="flex items-center gap-3 mb-2 max-w-7xl mx-auto">
          {variant === 'meetings' ? (
            <Link to="/" className="hover:bg-white/20 p-2 rounded-lg transition-colors">
              <ArrowLeft size={24} />
            </Link>
          ) : (
            <button type="button" onClick={() => navigate(-1)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
              <ArrowLeft size={24} />
            </button>
          )}
          <Users size={32} />
          <h1 className="text-3xl font-bold">{title}</h1>
        </div>
        <p className="text-white/90 ml-14 max-w-7xl mx-auto">
          {en ? 'Property-scoped meetings for the current fiscal year.' : '当前财政年度、按物业隔离的会议列表。'}
        </p>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {err ? <p className="text-sm text-red-600">{err}</p> : null}

        {stats && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-sm text-gray-600">{en ? 'Fiscal year' : '财政年度'}</p>
                <p className="text-2xl font-bold text-gray-900">{fiscalYear}</p>
              </div>
              <div className="h-10 w-px bg-gray-200 hidden sm:block" />
              <div>
                <p className="text-sm text-gray-600">{en ? 'General meetings used / quota' : '大会类已用 / 配额'}</p>
                <p className="text-2xl font-bold text-[#1D9E75]">
                  {stats.used} / {stats.quota}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {en
                    ? `Remaining (product default): ${Number(stats.remaining ?? 0)}`
                    : `剩余（产品默认配额）：${Number(stats.remaining ?? 0)}`}
                </p>
              </div>
              <div className="h-10 w-px bg-gray-200 hidden sm:block" />
              <div>
                <p className="text-sm text-gray-600">{en ? 'AGM status' : 'AGM 状态'}</p>
                <p className={`text-lg font-semibold ${stats.agm === 'ok' ? 'text-green-700' : 'text-amber-700'}`}>
                  {stats.agm === 'ok' ? (en ? 'OK — AGM on file' : '正常 — 本年度已有 AGM') : en ? 'Missing AGM' : '缺 AGM'}
                </p>
              </div>
              {isStaff && (
                <div className="ml-auto">
                  <Link
                    to="/meetings/new"
                    className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-4 py-2 rounded-lg hover:bg-[#178a66] transition-colors"
                  >
                    <Plus size={20} />
                    {en ? 'New meeting' : '新建会议'}
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {!stats && isStaff && (
          <div className="flex justify-end">
            <Link
              to="/meetings/new"
              className="inline-flex items-center gap-2 bg-[#1D9E75] text-white px-4 py-2 rounded-lg hover:bg-[#178a66] transition-colors"
            >
              <Plus size={20} />
              {en ? 'New meeting' : '新建会议'}
            </Link>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100">
          {meetings.length === 0 ? (
            <div className="p-12 text-center text-gray-600">{en ? 'No meetings yet.' : '暂无会议。'}</div>
          ) : (
            meetings.map((m) => (
              <Link
                key={m.id}
                to={variant === 'voting' ? `/voting/${m.id}` : `/meetings/${m.id}`}
                className="w-full text-left p-6 hover:bg-gray-50 transition-colors flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D9E75]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-800">
                      {labelMeetingType(m.meeting_type, en)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {labelFormat(m.meeting_format, en)}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {labelStatus(m.status, en)}
                    </span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 truncate">
                    {meetingTitleZhFirst(m) || (en ? meetingUiStrings.untitled.en : meetingUiStrings.untitled.zh)}
                  </h2>
                  {(m.description_zh || m.description_en) && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {(m.description_zh || m.description_en || '').slice(0, 200)}
                    </p>
                  )}
                </div>
                <div className="text-sm text-gray-500 shrink-0">
                  {m.scheduled_at
                    ? new Date(m.scheduled_at).toLocaleString(en ? 'en-CA' : 'zh-CN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })
                    : en
                      ? 'No schedule'
                      : '未排期'}
                </div>
              </Link>
            ))
          )}
        </div>

        {variant === 'meetings' && (
          <p className="text-sm text-gray-500 text-center">
            <Link to="/voting" className="text-emerald-700 hover:underline">
              {en ? 'Open meetings & voting hub' : '前往会议与投票'}
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
