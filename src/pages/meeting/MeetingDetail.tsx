import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ballotTallies,
  castBallot,
  createAgendaItem,
  createVote,
  getMeetingDetail,
  invitationSummary,
  markInvitationsSent,
  meetingTitleZhFirst,
  resetFailedInvitations,
  sendMeetingInvitations,
  updateVote,
  type MeetingAgendaRow,
  type MeetingVoteOptionRow,
  type MeetingVoteRow,
} from '../../features/meetings/api';
import { labelFormat, labelMeetingType, labelStatus, labelVoteRule, labelVoteStatus, meetingUiStrings } from '../../features/meetings/labels';

export function MeetingDetail() {
  const { id: meetingId } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { currentPropertyId, roleInProperty, ready: propertyReady } = useProperty();
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();

  const [bundle, setBundle] = useState<Awaited<ReturnType<typeof getMeetingDetail>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newAgendaZh, setNewAgendaZh] = useState('');
  const [newAgendaEn, setNewAgendaEn] = useState('');
  const [newAgendaVote, setNewAgendaVote] = useState(false);
  const [newVoteRule, setNewVoteRule] = useState<'simple_majority' | 'three_quarter' | 'unanimous'>('simple_majority');

  const isStaff =
    roleInProperty === 'council' ||
    roleInProperty === 'manager' ||
    roleInProperty === 'property_admin' ||
    roleInProperty === 'admin';

  const load = useCallback(async () => {
    if (!meetingId || !currentPropertyId || !user) {
      setBundle(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const b = await getMeetingDetail(meetingId, currentPropertyId);
    setBundle(b);
    setLoading(false);
  }, [meetingId, currentPropertyId, user]);

  useEffect(() => {
    if (!propertyReady) return;
    load();
  }, [propertyReady, load]);

  const meeting = bundle?.meeting;

  const voteByAgendaId = useMemo(() => {
    const m = new Map<string, MeetingVoteRow & { options: MeetingVoteOptionRow[] }>();
    for (const v of bundle?.votes ?? []) {
      m.set(v.agenda_item_id, v);
    }
    return m;
  }, [bundle?.votes]);

  async function handleCreateVote(agenda: MeetingAgendaRow) {
    if (!meeting || !user) return;
    setBusy(true);
    setActionErr(null);
    const { voteId, error } = await createVote({
      meetingId: meeting.id,
      agendaItemId: agenda.id,
      voteRule: (agenda.vote_rule as 'simple_majority' | 'three_quarter' | 'unanimous' | null) || 'simple_majority',
      titleEn: agenda.title_en,
      titleZh: agenda.title_zh,
      descriptionEn: agenda.description_en,
      descriptionZh: agenda.description_zh,
      status: 'draft',
    });
    if (error || !voteId) setActionErr(error?.message ?? (en ? 'Could not create vote.' : '无法创建表决。'));
    setBusy(false);
    await load();
  }

  async function handleOpenVote(voteId: string) {
    setBusy(true);
    setActionErr(null);
    const { error } = await updateVote(voteId, { status: 'open', opens_at: new Date().toISOString() });
    if (error) setActionErr(error.message);
    setBusy(false);
    await load();
  }

  async function handleCloseVote(voteId: string) {
    setBusy(true);
    setActionErr(null);
    const { error } = await updateVote(voteId, { status: 'closed', closes_at: new Date().toISOString() });
    if (error) setActionErr(error.message);
    setBusy(false);
    await load();
  }

  async function handleBallot(voteId: string, optionKey: string) {
    if (!meeting || !user) return;
    setBusy(true);
    setActionErr(null);
    const { error } = await castBallot({
      voteId,
      propertyId: meeting.property_id,
      voterUserId: user.id,
      selectedOptionKey: optionKey,
    });
    if (error) setActionErr(error.message);
    setBusy(false);
    await load();
  }

  async function handleAddAgenda(e: React.FormEvent) {
    e.preventDefault();
    if (!meeting || !currentPropertyId) return;
    if (!newAgendaZh.trim() && !newAgendaEn.trim()) {
      setActionErr(en ? 'Enter an agenda title.' : '请填写议程标题。');
      return;
    }
    setBusy(true);
    setActionErr(null);
    const nextOrder = (bundle?.agendaItems.length ?? 0) + 1;
    const { error } = await createAgendaItem({
      propertyId: currentPropertyId,
      meetingId: meeting.id,
      sortOrder: nextOrder,
      titleEn: newAgendaEn.trim() || null,
      titleZh: newAgendaZh.trim() || null,
      requiresVote: newAgendaVote,
      voteRule: newAgendaVote ? newVoteRule : null,
    });
    if (error) setActionErr(error.message);
    else {
      setNewAgendaZh('');
      setNewAgendaEn('');
      setNewAgendaVote(false);
    }
    setBusy(false);
    await load();
  }

  async function handleSendInvites() {
    if (!meeting) return;
    setBusy(true);
    setActionErr(null);
    const { error } = await sendMeetingInvitations(meeting.id, meeting.property_id);
    if (error) setActionErr(error.message);
    else {
      const r = await markInvitationsSent(meeting.id, meeting.property_id);
      if (r.error) setActionErr(r.error.message);
    }
    setBusy(false);
    await load();
  }

  async function handleRetryFailedInvites() {
    if (!meeting) return;
    setBusy(true);
    setActionErr(null);
    const { error } = await resetFailedInvitations(meeting.id, meeting.property_id);
    if (error) setActionErr(error.message);
    setBusy(false);
    await load();
  }

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">{en ? 'Sign in required.' : '请先登录。'}</div>;
  }

  if (!propertyReady || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!currentPropertyId) {
    return <div className="p-6 text-center text-gray-600">{en ? 'Select a property.' : '请选择物业。'}</div>;
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <button type="button" onClick={() => navigate('/voting')} className="text-emerald-800 flex items-center gap-1 mb-4">
          <ArrowLeft size={18} /> {en ? 'Back' : '返回'}
        </button>
        <p className="text-center text-gray-700 text-lg">{en ? meetingUiStrings.notFound.en : meetingUiStrings.notFound.zh}</p>
      </div>
    );
  }

  const inv = invitationSummary(bundle?.invitations ?? []);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gradient-to-r from-[#1D9E75] to-[#178a66] text-white p-6">
        <div className="max-w-5xl mx-auto flex items-start gap-3">
          <button type="button" onClick={() => navigate('/voting')} className="hover:bg-white/20 p-2 rounded-lg shrink-0">
            <ArrowLeft size={22} />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/20">{labelMeetingType(meeting.meeting_type, en)}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/20">{labelFormat(meeting.meeting_format, en)}</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-white/20">{labelStatus(meeting.status, en)}</span>
            </div>
            <h1 className="text-2xl font-bold truncate">
              {meetingTitleZhFirst(meeting) || (en ? meetingUiStrings.untitled.en : meetingUiStrings.untitled.zh)}
            </h1>
            {meeting.scheduled_at && (
              <p className="text-white/90 text-sm mt-1">
                {new Date(meeting.scheduled_at).toLocaleString(en ? 'en-CA' : 'zh-CN', { dateStyle: 'full', timeStyle: 'short' })}
              </p>
            )}
          </div>
          {isStaff && (
            <Link
              to={`/meetings/${meeting.id}/edit`}
              className="ml-auto shrink-0 text-sm bg-white/15 hover:bg-white/25 px-3 py-2 rounded-lg"
            >
              {en ? 'Edit' : '编辑'}
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 space-y-8">
        {actionErr ? <p className="text-sm text-red-600">{actionErr}</p> : null}

        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
            {en ? meetingUiStrings.sectionInfo.en : meetingUiStrings.sectionInfo.zh}
          </h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">{en ? 'Description (EN)' : '说明（英）'}</dt>
              <dd className="text-gray-900 whitespace-pre-wrap">{meeting.description_en || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{en ? 'Description (ZH)' : '说明（中）'}</dt>
              <dd className="text-gray-900 whitespace-pre-wrap">{meeting.description_zh || '—'}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{en ? meetingUiStrings.format.en : meetingUiStrings.format.zh}</dt>
              <dd>{labelFormat(meeting.meeting_format, en)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{en ? 'Notice sent' : '通知发出时间'}</dt>
              <dd>{meeting.notice_sent_at ? new Date(meeting.notice_sent_at).toLocaleString() : '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
            {en ? meetingUiStrings.sectionAgenda.en : meetingUiStrings.sectionAgenda.zh}
          </h2>
          <div className="space-y-6">
            {(bundle?.agendaItems ?? []).map((agenda) => {
              const vote = voteByAgendaId.get(agenda.id);
              const ballots = vote ? bundle?.ballotsByVoteId[vote.id] ?? [] : [];
              const tallies = ballotTallies(ballots);
              const my = vote ? bundle?.myBallotsByVoteId[vote.id] : undefined;
              return (
                <div key={agenda.id} className="border border-gray-100 rounded-lg p-4 bg-gray-50/50">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="text-xs text-gray-500">#{agenda.sort_order}</span>
                    {agenda.requires_vote ? (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">{en ? 'Vote required' : '需要表决'}</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">{en ? 'Discussion' : '讨论'}</span>
                    )}
                    {agenda.vote_rule && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-900">
                        {labelVoteRule(agenda.vote_rule, en)}
                      </span>
                    )}
                  </div>
                  <h3 className="font-medium text-gray-900">{agenda.title_zh?.trim() || agenda.title_en || (en ? meetingUiStrings.untitled.en : meetingUiStrings.untitled.zh)}</h3>
                  {(agenda.description_zh || agenda.description_en) && (
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{agenda.description_zh || agenda.description_en}</p>
                  )}

                  {agenda.requires_vote && !vote && isStaff && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleCreateVote(agenda)}
                      className="mt-3 text-sm px-3 py-1.5 rounded-lg bg-[#1D9E75] text-white hover:bg-[#178a66] disabled:opacity-50"
                    >
                      {en ? 'Create vote' : '创建表决'}
                    </button>
                  )}

                  {vote && (
                    <div className="mt-4 space-y-3 border-t border-gray-200 pt-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium text-gray-700">{en ? 'Vote status' : '表决状态'}:</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200">{labelVoteStatus(vote.status, en)}</span>
                        <span className="text-xs text-gray-600">
                          {en ? 'Vote rule' : '投票规则'}: {labelVoteRule(vote.vote_rule, en)}
                        </span>
                      </div>

                      {isStaff && vote.status === 'draft' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleOpenVote(vote.id)}
                          className="text-sm px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {en ? 'Open voting' : '开放投票'}
                        </button>
                      )}
                      {isStaff && vote.status === 'open' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleCloseVote(vote.id)}
                          className="text-sm px-3 py-1.5 rounded-lg bg-gray-800 text-white hover:bg-black disabled:opacity-50"
                        >
                          {en ? 'Close voting' : '关闭投票'}
                        </button>
                      )}

                      {vote.status === 'open' && (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-700">{en ? 'Cast your ballot' : '投票'}</p>
                          <div className="flex flex-wrap gap-2">
                            {vote.options.map((opt) => (
                              <button
                                key={opt.id}
                                type="button"
                                disabled={busy}
                                onClick={() => handleBallot(vote.id, opt.option_key)}
                                className={`px-3 py-2 rounded-lg border text-sm ${
                                  my?.selected_option_key === opt.option_key
                                    ? 'border-[#1D9E75] bg-emerald-50 text-emerald-900'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }`}
                              >
                                {en ? opt.label_en || opt.option_key : opt.label_zh || opt.label_en || opt.option_key}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {(vote.status === 'closed' || vote.status === 'passed' || vote.status === 'failed') && (
                        <div className="text-sm text-gray-800">
                          <p className="font-medium mb-1">{en ? 'Results' : '结果汇总'}</p>
                          <ul className="list-disc pl-5">
                            {Object.entries(tallies).map(([k, n]) => (
                              <li key={k}>
                                {k}: {n}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {(bundle?.agendaItems ?? []).length === 0 && (
              <p className="text-gray-600 text-sm">{en ? 'No agenda items.' : '暂无议程。'}</p>
            )}

            {isStaff && meeting && (
              <form onSubmit={handleAddAgenda} className="mt-6 border border-dashed border-gray-300 rounded-lg p-4 space-y-3 bg-white">
                <p className="text-sm font-medium text-gray-800">{en ? 'Add agenda item' : '添加议程'}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    value={newAgendaZh}
                    onChange={(e) => setNewAgendaZh(e.target.value)}
                    placeholder={en ? 'Title (Chinese)' : '标题（中文）'}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                  <input
                    value={newAgendaEn}
                    onChange={(e) => setNewAgendaEn(e.target.value)}
                    placeholder={en ? 'Title (English)' : '标题（英文）'}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={newAgendaVote} onChange={(e) => setNewAgendaVote(e.target.checked)} />
                  {en ? 'Requires vote' : '需要表决'}
                </label>
                {newAgendaVote && (
                  <select
                    value={newVoteRule}
                    onChange={(e) => setNewVoteRule(e.target.value as typeof newVoteRule)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="simple_majority">{labelVoteRule('simple_majority', en)}</option>
                    <option value="three_quarter">{labelVoteRule('three_quarter', en)}</option>
                    <option value="unanimous">{labelVoteRule('unanimous', en)}</option>
                  </select>
                )}
                <button type="submit" disabled={busy} className="text-sm px-4 py-2 rounded-lg bg-gray-900 text-white disabled:opacity-50">
                  {en ? 'Add' : '添加'}
                </button>
              </form>
            )}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
            <Mail size={18} />
            {en ? meetingUiStrings.sectionInvite.en : meetingUiStrings.sectionInvite.zh}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-500">{en ? 'Total' : '邀请数'}</p>
              <p className="text-xl font-semibold">{inv.total}</p>
            </div>
            <div>
              <p className="text-gray-500">{en ? 'Sent' : '已发送'}</p>
              <p className="text-xl font-semibold">{inv.sent}</p>
            </div>
            <div>
              <p className="text-gray-500">{en ? 'Opened' : '已打开'}</p>
              <p className="text-xl font-semibold">{inv.opened}</p>
            </div>
            <div>
              <p className="text-gray-500">{en ? 'Failed' : '失败'}</p>
              <p className="text-xl font-semibold text-red-700">{inv.failed}</p>
            </div>
          </div>
          {isStaff && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={handleSendInvites}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1D9E75] text-white text-sm hover:bg-[#178a66] disabled:opacity-50"
              >
                <Users size={16} />
                {en ? 'Send / refresh in-app invites' : '发送或刷新站内邀请'}
              </button>
              {inv.failed > 0 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRetryFailedInvites}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
                >
                  <RefreshCw size={16} />
                  {en ? 'Reset failed → pending' : '失败标为待重发'}
                </button>
              )}
            </div>
          )}
        </section>

        {(bundle?.resolutions ?? []).length > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">{en ? 'Resolutions' : '决议记录'}</h2>
            <ul className="space-y-3 text-sm">
              {bundle!.resolutions.map((r) => (
                <li key={r.id} className="border-l-4 border-emerald-500 pl-3">
                  <p className="text-gray-900">{r.resolution_text}</p>
                  <p className="text-gray-500 mt-1">
                    {en ? 'Outcome' : '结果'}: {r.outcome}
                    {r.followup_required ? (en ? ' · Follow-up' : ' · 需跟进') : ''}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
