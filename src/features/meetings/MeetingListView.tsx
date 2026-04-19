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

  /** 单会议详情：两 variant 各自固定前缀，统一透传 propertyId（有则必带）。 */
  const hrefForMeeting = (meetingId: string | null | undefined): string | null => {
    const id = typeof meetingId === 'string' ? meetingId.trim() : '';
    if (!id) return null;
    const path = variant === 'voting' ? `/voting/${encodeURIComponent(id)}` : `/meetings/${encodeURIComponent(id)}`;
    const pid = currentPropertyId?.trim();
    if (pid) {
      return `${path}?${new URLSearchParams({ propertyId: pid }).toString()}`;
    }
    return path;
  };

  const votingHubHref = currentPropertyId
    ? `/voting?${new URLSearchParams({ propertyId: currentPropertyId }).toString()}`
    : '/voting';

  const primaryCtaLabel =
    variant === 'voting'
      ? en
        ? 'Enter meeting voting'
        : '进入会议投票'
      : en
        ? 'View meeting details'
        : '查看会议详情';

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
                <p className={`text-lg font-semibold ${stats.agm === 'ok' ? 'text-[#157a5c]' : 'text-amber-700'}`}>
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

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100 overflow-hidden">
          {meetings.length === 0 ? (
            <div className="p-12 text-center text-gray-600">{en ? 'No meetings yet.' : '暂无会议。'}</div>
          ) : (
            meetings.map((m, idx) => {
              const rowId = m.id != null && String(m.id).trim() !== '' ? String(m.id).trim() : '';
              const detailHref = rowId ? hrefForMeeting(rowId) : null;
              const cardInteractive = detailHref !== null;
              const cardClass = [
                'group w-full text-left p-6 block transition-all duration-150',
                cardInteractive
                  ? 'cursor-pointer hover:bg-[#1D9E75]/[0.08] active:bg-[#1D9E75]/13 hover:shadow-[inset_4px_0_0_0_#1D9E75] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1D9E75]'
                  : 'cursor-not-allowed opacity-70',
              ].join(' ');

              const inner = (
                <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch sm:justify-between sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#1D9E75]/14 text-[#145a46]">
                        {labelMeetingType(m.meeting_type, en)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#1D9E75]/10 text-[#16694f]">
                        {labelFormat(m.meeting_format, en)}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-[#1D9E75]/12 text-[#0f4a3a]">
                        {labelStatus(m.status, en)}
                      </span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 truncate group-hover:text-[#126b54] transition-colors">
                      {meetingTitleZhFirst(m) || (en ? meetingUiStrings.untitled.en : meetingUiStrings.untitled.zh)}
                    </h2>
                    {(m.description_zh || m.description_en) && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                        {(m.description_zh || m.description_en || '').slice(0, 200)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0 sm:items-end sm:justify-between sm:min-w-[200px]">
                    <div className="text-sm text-gray-500 sm:text-right">
                      {m.scheduled_at
                        ? new Date(m.scheduled_at).toLocaleString(en ? 'en-CA' : 'zh-CN', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : en
                          ? 'No schedule'
                          : '未排期'}
                    </div>
                    <span
                      className={[
                        'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm sm:text-center min-w-[9rem]',
                        cardInteractive
                          ? 'bg-[#1D9E75] text-white group-hover:bg-[#178a66] group-active:scale-[0.98] transition-all'
                          : 'bg-gray-200 text-gray-500',
                      ].join(' ')}
                    >
                      {cardInteractive ? primaryCtaLabel : en ? 'Unavailable' : '无法进入'}
                    </span>
                  </div>
                </div>
              );

              return cardInteractive ? (
                <Link key={m.id || `row-${idx}`} to={detailHref} className={cardClass}>
                  {inner}
                </Link>
              ) : (
                <div key={m.id || `row-${idx}`} className={cardClass} role="group" aria-disabled="true">
                  {inner}
                </div>
              );
            })
          )}
        </div>

        {variant === 'meetings' && (
          <div className="mt-10 pt-6 border-t border-gray-200">
            <p className="text-center">
              <Link
                to={votingHubHref}
                className="text-xs text-gray-500 hover:text-[#157a5c] underline underline-offset-2 transition-colors"
              >
                {en ? 'Voting hub — all meetings in this property' : '投票专区 · 查看本物业全部会议'}
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
