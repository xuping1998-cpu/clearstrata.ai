import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, ThumbsUp, ThumbsDown, AlertCircle, CheckCircle, Users, Calendar, ArrowLeft, Clock, DollarSign, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { localDateTimeToIso } from '../utils/meetingDateTime';

interface Meeting {
  id: string;
  meeting_type: 'agm' | 'council_regular' | 'ad_hoc' | 'sgm';
  title_en: string;
  title_zh?: string;
  description_en: string;
  description_zh?: string;
  scheduled_date: string;
  scheduled_end_date?: string;
  actual_start_time?: string;
  actual_end_time?: string;
  duration_minutes?: number;
  location?: string;
  is_virtual: boolean;
  meeting_link?: string;
  status: 'draft' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  counts_against_quota: boolean;
  is_overtime: boolean;
  overtime_fee?: number;
  fiscal_year: number;
  created_at: string;
  agenda_items?: AgendaItem[];
}

interface AgendaItem {
  id: string;
  meeting_id: string;
  item_number: number;
  title_en: string;
  title_zh?: string;
  description_en?: string;
  description_zh?: string;
  requires_vote: boolean;
  vote_passed?: boolean;
  vote_for: number;
  vote_against: number;
  vote_abstain: number;
  discussion_notes?: string;
  decision_text?: string;
  user_voted?: boolean;
  user_vote?: 'for' | 'against' | 'abstain';
}

interface MeetingQuota {
  fiscal_year: number;
  agm_count: number;
  council_regular_count: number;
  ad_hoc_count: number;
  sgm_count: number;
  total_quota_used: number;
  free_quota_limit: number;
  overtime_meetings: number;
  total_overtime_fees: number;
}

export function Voting() {
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const l = language === 'en';

  const [activeTab, setActiveTab] = useState<'meetings' | 'minutes' | 'quota'>('meetings');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [quota, setQuota] = useState<MeetingQuota | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewMeetingModal, setShowNewMeetingModal] = useState(false);
  const [isCouncil, setIsCouncil] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [newMeeting, setNewMeeting] = useState({
    meeting_type: 'council_regular' as Meeting['meeting_type'],
    title_en: '',
    title_zh: '',
    description_en: '',
    description_zh: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 120,
    location: '',
    is_virtual: false,
    meeting_link: '',
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      setIsCouncil(profile?.role === 'council' || profile?.role === 'manager');

      const currentYear = new Date().getFullYear();

      const { data: meetingsData } = await supabase
        .from('meetings')
        .select(`
          *,
          agenda_items:meeting_agenda_items(*)
        `)
        .order('scheduled_date', { ascending: false });

      if (meetingsData) {
        const meetingsWithVotes = await Promise.all(
          meetingsData.map(async (meeting) => {
            if (meeting.agenda_items) {
              const itemsWithUserVotes = await Promise.all(
                meeting.agenda_items.map(async (item: AgendaItem) => {
                  const { data: userVote } = await supabase
                    .from('meeting_votes')
                    .select('vote_decision')
                    .eq('agenda_item_id', item.id)
                    .eq('voter_id', user.id)
                    .maybeSingle();

                  return {
                    ...item,
                    user_voted: !!userVote,
                    user_vote: userVote?.vote_decision,
                  };
                })
              );
              meeting.agenda_items = itemsWithUserVotes;
            }
            return meeting;
          })
        );
        setMeetings(meetingsWithVotes);
      }

      const { data: quotaData } = await supabase
        .from('meeting_quota_tracker')
        .select('*')
        .eq('fiscal_year', currentYear)
        .maybeSingle();

      if (quotaData) {
        setQuota(quotaData);
      } else {
        setQuota({
          fiscal_year: currentYear,
          agm_count: 0,
          council_regular_count: 0,
          ad_hoc_count: 0,
          sgm_count: 0,
          total_quota_used: 0,
          free_quota_limit: 8,
          overtime_meetings: 0,
          total_overtime_fees: 0,
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createMeeting = async () => {
    if (!user || !newMeeting.title_en || !newMeeting.scheduled_date) {
      setCreateError(l ? 'Title (English) and date are required.' : '请填写必填字段（英文标题和日期）');
      return;
    }

    setCreateError(null);
    setCreating(true);

    try {
      const scheduledDateTimeIso = localDateTimeToIso(newMeeting.scheduled_date, newMeeting.scheduled_time || '00:00');
      const currentYear = new Date().getFullYear();

      const quotaUsed = quota?.total_quota_used || 0;
      const isOvertime = quotaUsed >= (quota?.free_quota_limit || 8);

      if (newMeeting.meeting_type === 'agm' && (quota?.agm_count || 0) >= 1) {
        setCreateError(
          l
            ? 'Only one AGM is allowed per year. The quota for this year is already used.'
            : '每年仅允许召开1次AGM。本年度AGM配额已使用。',
        );
        setCreating(false);
        return;
      }

      if (newMeeting.meeting_type === 'ad_hoc' && (quota?.ad_hoc_count || 0) >= 1) {
        setCreateError(
          l
            ? 'Only one ad hoc meeting is allowed per year. The quota for this year is already used.'
            : '每年仅允许召开1次机动会议。本年度机动会议配额已使用。',
        );
        setCreating(false);
        return;
      }

      if (isOvertime) {
        const confirmOvertime = window.confirm(
          l
            ? `Warning: free meeting quota (${quota?.free_quota_limit}) is used up. This meeting will incur overtime fees of $100/hour. Continue?`
            : `警告：免费会议配额（${quota?.free_quota_limit}次）已用完。此会议将产生加班费用$100/小时。是否继续？`,
        );
        if (!confirmOvertime) {
          setCreating(false);
          return;
        }
      }

      const overtimeFee = isOvertime ? (newMeeting.duration_minutes / 60) * 100 : 0;

      const { data: inserted, error } = await supabase.from('meetings').insert({
        meeting_type: newMeeting.meeting_type,
        title_en: newMeeting.title_en,
        title_zh: newMeeting.title_zh || null,
        description_en: newMeeting.description_en || null,
        description_zh: newMeeting.description_zh || null,
        scheduled_date: scheduledDateTimeIso,
        duration_minutes: newMeeting.duration_minutes,
        location: newMeeting.location || null,
        is_virtual: newMeeting.is_virtual,
        meeting_link: newMeeting.meeting_link || null,
        status: 'scheduled',
        created_by: user.id,
        counts_against_quota: true,
        is_overtime: isOvertime,
        overtime_fee: overtimeFee,
        fiscal_year: currentYear,
      }).select();

      if (error) {
        console.error('Meeting insert error:', error);
        setCreateError(l ? `Could not create meeting: ${error.message}` : `创建失败：${error.message}`);
        setCreating(false);
        return;
      }

      if (!inserted || inserted.length === 0) {
        console.error('Meeting insert returned no data - likely RLS rejection');
        setCreateError(
          l
            ? 'Could not create meeting: insufficient permission. Your role must be council or property manager.'
            : '创建失败：权限不足，请确认您的账户角色为业委会成员或物业经理。',
        );
        setCreating(false);
        return;
      }

      setShowNewMeetingModal(false);
      setCreateError(null);
      setNewMeeting({
        meeting_type: 'council_regular',
        title_en: '',
        title_zh: '',
        description_en: '',
        description_zh: '',
        scheduled_date: '',
        scheduled_time: '',
        duration_minutes: 120,
        location: '',
        is_virtual: false,
        meeting_link: '',
      });
      loadData();
    } catch (error: unknown) {
      console.error('Error creating meeting:', error);
      const msg = error instanceof Error ? error.message : '';
      setCreateError(
        l
          ? `Could not create meeting: ${msg || 'Please try again.'}`
          : `创建失败：${msg || '未知错误，请重试'}`,
      );
    } finally {
      setCreating(false);
    }
  };

  const castVote = async (agendaItemId: string, decision: 'for' | 'against' | 'abstain') => {
    if (!user) return;

    try {
      const { error } = await supabase.from('meeting_votes').insert({
        agenda_item_id: agendaItemId,
        voter_id: user.id,
        vote_decision: decision,
        is_proxy_vote: false,
      });

      if (error) throw error;

      alert(t('vote_success'));
      loadData();
    } catch (error) {
      console.error('Error casting vote:', error);
      alert(t('vote_failed'));
    }
  };

  const getMeetingTypeLabel = (type: Meeting['meeting_type']) => {
    const labels = {
      agm: l ? 'AGM' : '年度大会 (AGM)',
      council_regular: l ? 'Council Meeting' : '业委会例会',
      ad_hoc: l ? 'Ad Hoc Meeting' : '机动会议',
      sgm: l ? 'SGM' : '特别大会 (SGM)',
    };
    return labels[type];
  };

  const getMeetingTypeColor = (type: Meeting['meeting_type']) => {
    const colors = {
      agm: 'bg-purple-100 text-purple-800',
      council_regular: 'bg-blue-100 text-blue-800',
      ad_hoc: 'bg-orange-100 text-orange-800',
      sgm: 'bg-red-100 text-red-800',
    };
    return colors[type];
  };

  const getStatusLabel = (status: Meeting['status']) => {
    const labels = {
      draft: l ? 'Draft' : '草稿',
      scheduled: l ? 'Scheduled' : '已排期',
      in_progress: l ? 'In Progress' : '进行中',
      completed: l ? 'Completed' : '已完成',
      cancelled: l ? 'Cancelled' : '已取消',
    };
    return labels[status];
  };

  const mt = (en: string | undefined, zh: string | undefined) => {
    if (l) return en || zh || '';
    return zh || en || '';
  };

  const getStatusColor = (status: Meeting['status']) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-800',
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-green-100 text-green-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">{l ? 'Loading...' : '加载中...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-[#1D9E75] to-[#178a66] text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <button onClick={() => navigate(-1)} className="hover:bg-white/20 p-2 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </button>
          <Users size={32} />
          <h1 className="text-3xl font-bold">{l ? 'Meetings & Voting' : '会议投票'}</h1>
        </div>
        <p className="text-white/90 ml-14">{l ? 'Manage meetings, cast votes, track resolutions' : '管理会议、参与投票、跟踪决议'}</p>
      </div>

      {quota && (
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-gray-600">{l ? 'Fiscal Year' : '财政年度'}</p>
                  <p className="text-2xl font-bold text-gray-900">{quota.fiscal_year}</p>
                </div>
                <div className="h-12 w-px bg-gray-200"></div>
                <div>
                  <p className="text-sm text-gray-600">{l ? 'Used' : '已用次数'}</p>
                  <p className="text-2xl font-bold text-[#1D9E75]">
                    {quota.total_quota_used} / {quota.free_quota_limit}
                  </p>
                </div>
                {quota.overtime_meetings > 0 && (
                  <>
                    <div className="h-12 w-px bg-gray-200"></div>
                    <div>
                      <p className="text-sm text-gray-600">{l ? 'Overtime Fees' : '超时费用'}</p>
                      <p className="text-2xl font-bold text-red-600">
                        ${quota.total_overtime_fees.toFixed(2)}
                      </p>
                    </div>
                  </>
                )}
              </div>
              {isCouncil && (
                <button
                  onClick={() => setShowNewMeetingModal(true)}
                  className="flex items-center gap-2 bg-[#1D9E75] text-white px-4 py-2 rounded-lg hover:bg-[#178a66] transition-colors"
                >
                  <Plus size={20} />
                  {l ? 'New Meeting' : '新建会议'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto p-6">
        {quota && quota.total_quota_used >= quota.free_quota_limit - 1 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-yellow-900">{l ? 'Meeting Quota Warning' : '会议配额警告'}</p>
                <p className="text-sm text-yellow-800 mt-1">
                  {l
                    ? `Only ${quota.free_quota_limit - quota.total_quota_used} free meetings remaining this year. Additional meetings will incur $100/hour overtime fees.`
                    : `本年度仅剩 ${quota.free_quota_limit - quota.total_quota_used} 次免费会议。额外会议将产生$100/小时的超时费用。`
                  }
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('meetings')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'meetings'
                    ? 'text-[#1D9E75] border-b-2 border-[#1D9E75]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {l ? 'Meetings' : '会议列表'}
              </button>
              <button
                onClick={() => setActiveTab('quota')}
                className={`flex-1 px-6 py-4 font-medium transition-colors ${
                  activeTab === 'quota'
                    ? 'text-[#1D9E75] border-b-2 border-[#1D9E75]'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {l ? 'Quota Details' : '次数详情'}
              </button>
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'meetings' && (
              <div className="space-y-4">
                {meetings.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="mx-auto text-gray-400 mb-4" size={48} />
                    <p className="text-gray-600">{l ? 'No meetings yet' : '暂无会议'}</p>
                  </div>
                ) : (
                  meetings.map((meeting) => (
                    <div key={meeting.id} onClick={() => navigate(`/voting/${meeting.id}`)} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getMeetingTypeColor(meeting.meeting_type)}`}>
                              {getMeetingTypeLabel(meeting.meeting_type)}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(meeting.status)}`}>
                              {getStatusLabel(meeting.status)}
                            </span>
                            {meeting.is_overtime && (
                              <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 flex items-center gap-1">
                                <DollarSign size={14} />
                                {t('meeting_overtime_badge')}
                              </span>
                            )}
                          </div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            {mt(meeting.title_en, meeting.title_zh)}
                          </h3>
                          {mt(meeting.description_en, meeting.description_zh) && (
                            <p className="text-gray-600 mb-3">
                              {mt(meeting.description_en, meeting.description_zh)}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <Calendar size={16} />
                              {new Date(meeting.scheduled_date).toLocaleDateString(l ? 'en-US' : 'zh-CN')}
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock size={16} />
                              {meeting.duration_minutes} {l ? 'min' : '分钟'}
                            </div>
                            {meeting.is_virtual && meeting.meeting_link && (
                              <a
                                href={meeting.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#1D9E75] hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {l ? 'Join Online' : '加入在线会议'}
                              </a>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); navigate(`/voting/${meeting.id}`); }}
                          className="shrink-0 self-start flex items-center gap-1 px-4 py-2 text-sm font-medium text-[#1D9E75] bg-[#1D9E75]/10 rounded-lg hover:bg-[#1D9E75]/20 transition-colors"
                        >
                          {l ? 'View Details' : '查看详情'}
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      {meeting.agenda_items && meeting.agenda_items.length > 0 && (
                        <div className="border-t border-gray-200 pt-4 mt-4">
                          <h4 className="font-semibold text-gray-900 mb-3">{l ? 'Agenda Items' : '议程项目'}</h4>
                          <div className="space-y-3">
                            {meeting.agenda_items.map((item) => (
                              <div key={item.id} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <p className="font-medium text-gray-900">
                                      {item.item_number}. {mt(item.title_en, item.title_zh)}
                                    </p>
                                    {mt(item.description_en, item.description_zh) && (
                                      <p className="text-sm text-gray-600 mt-1">
                                        {mt(item.description_en, item.description_zh)}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                {item.requires_vote && (
                                  <div className="mt-3">
                                    <div className="flex items-center gap-4 mb-2">
                                      <div className="flex items-center gap-2">
                                        <ThumbsUp size={16} className="text-green-600" />
                                        <span className="text-sm font-medium text-gray-900">{item.vote_for}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <ThumbsDown size={16} className="text-red-600" />
                                        <span className="text-sm font-medium text-gray-900">{item.vote_against}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-sm text-gray-600">
                                          {l ? 'Abstain' : '弃权'}：{item.vote_abstain}
                                        </span>
                                      </div>
                                    </div>

                                    {!item.user_voted && meeting.status === 'in_progress' && (
                                      <div className="flex gap-2">
                                        <button
                                          onClick={(e) => { e.stopPropagation(); castVote(item.id, 'for'); }}
                                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                                        >
                                          <ThumbsUp size={16} />
                                          {l ? 'For' : '赞成'}
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); castVote(item.id, 'against'); }}
                                          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                                        >
                                          <ThumbsDown size={16} />
                                          {l ? 'Against' : '反对'}
                                        </button>
                                        <button
                                          onClick={(e) => { e.stopPropagation(); castVote(item.id, 'abstain'); }}
                                          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                                        >
                                          {l ? 'Abstain' : '弃权'}
                                        </button>
                                      </div>
                                    )}

                                    {item.user_voted && (
                                      <div className="flex items-center gap-2 text-sm">
                                        <CheckCircle size={16} className="text-green-600" />
                                        <span className="text-gray-600">
                                          {l ? 'You voted: ' : '您已投票：'}
                                          <span className="font-medium ml-1">
                                            {item.user_vote === 'for' && (l ? 'For' : '赞成')}
                                            {item.user_vote === 'against' && (l ? 'Against' : '反对')}
                                            {item.user_vote === 'abstain' && (l ? 'Abstain' : '弃权')}
                                          </span>
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'quota' && quota && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2">{l ? 'AGM (Annual General Meeting)' : 'AGM（年度大会）'}</h3>
                    <p className="text-3xl font-bold text-blue-600">{quota.agm_count} / 1</p>
                    <p className="text-sm text-blue-700 mt-1">{l ? 'Once per year' : '每年一次'}</p>
                  </div>

                  <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                    <h3 className="font-semibold text-teal-900 mb-2">{l ? 'Council Meetings' : '业委会例会'}</h3>
                    <p className="text-3xl font-bold text-teal-600">{quota.council_regular_count} / 6</p>
                    <p className="text-sm text-teal-700 mt-1">{l ? 'Bimonthly' : '每两月一次'}</p>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h3 className="font-semibold text-orange-900 mb-2">{l ? 'Ad Hoc Meetings' : '机动会议'}</h3>
                    <p className="text-3xl font-bold text-orange-600">{quota.ad_hoc_count} / 1</p>
                    <p className="text-sm text-orange-700 mt-1">{l ? 'For urgent matters' : '用于紧急事项'}</p>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h3 className="font-semibold text-red-900 mb-2">{l ? 'SGM (Special General Meeting)' : 'SGM（特别大会）'}</h3>
                    <p className="text-3xl font-bold text-red-600">{quota.sgm_count}</p>
                    <p className="text-sm text-red-700 mt-1">{l ? 'Triggered by owner petition' : '业主请愿触发'}</p>
                  </div>
                </div>

                {quota.overtime_meetings > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                    <h3 className="font-semibold text-yellow-900 mb-4 flex items-center gap-2">
                      <DollarSign size={20} />
                      {l ? 'Overtime Fees' : '超时费用'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-yellow-700">{l ? 'Overtime Meetings' : '超时会议'}</p>
                        <p className="text-2xl font-bold text-yellow-900">{quota.overtime_meetings}</p>
                      </div>
                      <div>
                        <p className="text-sm text-yellow-700">{l ? 'Total Fees' : '总费用'}</p>
                        <p className="text-2xl font-bold text-yellow-900">${quota.total_overtime_fees.toFixed(2)}</p>
                      </div>
                    </div>
                    <p className="text-sm text-yellow-700 mt-3">
                      {l ? 'Overtime rate: $100/hour, collected by property manager' : '超时费用：$100/小时，由物业经理收取'}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showNewMeetingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{l ? 'New Meeting' : '新建会议'}</h2>
              <button onClick={() => setShowNewMeetingModal(false)} className="text-gray-500 hover:text-gray-700">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Meeting Type' : '会议类型'}</label>
                <select
                  value={newMeeting.meeting_type}
                  onChange={(e) => setNewMeeting({ ...newMeeting, meeting_type: e.target.value as Meeting['meeting_type'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                >
                  <option value="agm">{l ? 'AGM - Annual General Meeting' : 'AGM - 年度大会'}</option>
                  <option value="council_regular">{l ? 'Council Meeting' : '业委会例会'}</option>
                  <option value="ad_hoc">{l ? 'Ad Hoc Meeting' : '机动会议'}</option>
                  <option value="sgm">{l ? 'SGM - Special General Meeting' : 'SGM - 特别大会'}</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Title (English)' : '标题 (English)'}</label>
                <input
                  type="text"
                  value={newMeeting.title_en}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title_en: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  placeholder="e.g., 2024 Annual General Meeting"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Title (Chinese)' : '标题 (中文)'}</label>
                <input
                  type="text"
                  value={newMeeting.title_zh}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title_zh: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  placeholder="例如：2024年度大会"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Description (English)' : '描述 (English)'}</label>
                <textarea
                  value={newMeeting.description_en}
                  onChange={(e) => setNewMeeting({ ...newMeeting, description_en: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Description (Chinese)' : '描述 (中文)'}</label>
                <textarea
                  value={newMeeting.description_zh}
                  onChange={(e) => setNewMeeting({ ...newMeeting, description_zh: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Date' : '日期'}</label>
                  <input
                    type="date"
                    value={newMeeting.scheduled_date}
                    onChange={(e) => setNewMeeting({ ...newMeeting, scheduled_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Time' : '时间'}</label>
                  <input
                    type="time"
                    value={newMeeting.scheduled_time}
                    onChange={(e) => setNewMeeting({ ...newMeeting, scheduled_time: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Duration (minutes)' : '时长（分钟）'}</label>
                <input
                  type="number"
                  value={newMeeting.duration_minutes}
                  onChange={(e) => setNewMeeting({ ...newMeeting, duration_minutes: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                  min="30"
                  step="15"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_virtual"
                  checked={newMeeting.is_virtual}
                  onChange={(e) => setNewMeeting({ ...newMeeting, is_virtual: e.target.checked })}
                  className="w-5 h-5 text-[#1D9E75] border-gray-300 rounded focus:ring-[#1D9E75]"
                />
                <label htmlFor="is_virtual" className="text-sm text-gray-700">{l ? 'Virtual Meeting' : '在线会议'}</label>
              </div>

              {newMeeting.is_virtual && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Meeting Link' : '会议链接'}</label>
                  <input
                    type="url"
                    value={newMeeting.meeting_link}
                    onChange={(e) => setNewMeeting({ ...newMeeting, meeting_link: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                    placeholder="https://zoom.us/j/..."
                  />
                </div>
              )}

              {!newMeeting.is_virtual && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Location' : '地点'}</label>
                  <input
                    type="text"
                    value={newMeeting.location}
                    onChange={(e) => setNewMeeting({ ...newMeeting, location: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
                    placeholder={l ? 'e.g. Clubhouse' : '例如：楼宇会所'}
                  />
                </div>
              )}

              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle size={18} className="text-red-600 mt-0.5 shrink-0" />
                  <p className="text-sm text-red-700">{createError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={createMeeting}
                  disabled={creating}
                  className="flex-1 bg-[#1D9E75] text-white py-3 rounded-lg hover:bg-[#178a66] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {creating && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {creating ? (l ? 'Creating...' : '创建中...') : (l ? 'Create Meeting' : '创建会议')}
                </button>
                <button
                  onClick={() => { setShowNewMeetingModal(false); setCreateError(null); }}
                  disabled={creating}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50"
                >
                  {l ? 'Cancel' : '取消'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
