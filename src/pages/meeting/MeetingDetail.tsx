import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Mail, RefreshCw, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  ballotTallies,
  castBallot,
  createAgendaItem,
  createVote,
  fetchMeetingCore,
  fetchMeetingExtras,
  invitationSummary,
  markMeetingInvitationOpened,
  meetingTitleZhFirst,
  resetFailedInvitations,
  sendMeetingInvitations,
  updateVote,
  type MeetingAgendaRow,
  type MeetingDetailBundle,
  type MeetingInvitationRow,
  type MeetingVoteOptionRow,
  type MeetingVoteRow,
} from '../../features/meetings/api';
import { supabase } from '../../lib/supabase';
import { shouldDeferAutoPropertyRedirects } from '../../lib/authRecovery';
import { labelFormat, labelMeetingType, labelStatus, labelVoteRule, labelVoteStatus, meetingUiStrings } from '../../features/meetings/labels';

const initialBundle = (): MeetingDetailBundle => ({
  meeting: null,
  agendaItems: [],
  votes: [],
  ballotsByVoteId: {},
  myBallotsByVoteId: {},
  invitations: [],
  resolutions: [],
});

export function MeetingDetail() {
  const { meetingId: meetingIdParam, id: legacyVotingId } = useParams<{ meetingId?: string; id?: string }>();
  const meetingId = meetingIdParam ?? legacyVotingId;
  const { user } = useAuth();
  const { currentPropertyId, roleInProperty } = useProperty();
  const { language } = useLanguage();
  const en = language === 'en';
  const location = useLocation();

  const [bundle, setBundle] = useState<MeetingDetailBundle>(initialBundle);
  const [coreDone, setCoreDone] = useState(false);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [actionErr, setActionErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [newAgendaZh, setNewAgendaZh] = useState('');
  const [newAgendaEn, setNewAgendaEn] = useState('');
  const [newAgendaVote, setNewAgendaVote] = useState(false);
  const [newVoteRule, setNewVoteRule] = useState<'simple_majority' | 'three_quarter' | 'unanimous'>('simple_majority');
  const [inviteProfileById, setInviteProfileById] = useState<
    Record<string, { full_name_en: string | null; full_name_zh: string | null; email: string | null }>
  >({});
  const [inviteToast, setInviteToast] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const openedTrackedRef = useRef<string | null>(null);

  const isStaff =
    roleInProperty === 'council' ||
    roleInProperty === 'manager' ||
    roleInProperty === 'property_admin' ||
    roleInProperty === 'admin';

  const propertyIdForAgenda = currentPropertyId ?? bundle.meeting?.property_id ?? null;

  const load = useCallback(async () => {
    if (shouldDeferAutoPropertyRedirects()) {
      setBundle(initialBundle());
      setCoreDone(true);
      setExtrasLoading(false);
      return;
    }
    if (!meetingId || !user) {
      setBundle(initialBundle());
      setCoreDone(true);
      return;
    }
    if (!currentPropertyId) {
      setBundle(initialBundle());
      setCoreDone(true);
      return;
    }

    setCoreDone(false);
    setBundle(initialBundle());

    const { meeting: m } = await fetchMeetingCore(meetingId, currentPropertyId);
    setBundle((prev) => ({ ...prev, meeting: m }));
    setCoreDone(true);

    if (!m) return;

    setExtrasLoading(true);
    const ex = await fetchMeetingExtras(meetingId, m.property_id);
    setBundle((prev) => (prev.meeting ? { ...prev, ...ex } : prev));
    setExtrasLoading(false);
  }, [meetingId, user, currentPropertyId, location.pathname, location.hash, location.search]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (shouldDeferAutoPropertyRedirects()) return;
    const ids = Array.from(new Set(bundle.invitations.map((i) => i.recipient_user_id).filter(Boolean)));
    if (ids.length === 0) {
      setInviteProfileById({});
      return;
    }
    let cancelled = false;
    void supabase
      .from('profiles')
      .select('id, full_name_en, full_name_zh, email')
      .in('id', ids)
      .then(({ data, error }) => {
        if (cancelled || error || !data) return;
        const next: Record<string, { full_name_en: string | null; full_name_zh: string | null; email: string | null }> = {};
        for (const p of data as {
          id: string;
          full_name_en: string | null;
          full_name_zh: string | null;
          email: string | null;
        }[]) {
          next[p.id] = {
            full_name_en: p.full_name_en,
            full_name_zh: p.full_name_zh,
            email: p.email,
          };
        }
        setInviteProfileById(next);
      });
    return () => {
      cancelled = true;
    };
  }, [bundle.invitations, location.pathname, location.hash, location.search]);

  const meeting = bundle.meeting;

  const isVotingRoute =
    location.pathname.startsWith('/voting') && !location.pathname.includes('/demo/voting');

  const backToListHref = useMemo(() => {
    if (location.pathname.includes('/demo/voting')) return '/demo/voting';
    const pid =
      currentPropertyId?.trim() ||
      meeting?.property_id ||
      new URLSearchParams(location.search).get('propertyId')?.trim();
    const base = location.pathname.startsWith('/voting') ? '/voting' : '/meetings';
    if (pid) return `${base}?${new URLSearchParams({ propertyId: pid }).toString()}`;
    return base;
  }, [location.pathname, location.search, currentPropertyId, meeting?.property_id]);

  useEffect(() => {
    if (shouldDeferAutoPropertyRedirects()) return;
    const mid = meeting?.id;
    if (!mid || !user?.id || !currentPropertyId) return;
    const key = `${mid}:${currentPropertyId}`;
    if (openedTrackedRef.current === key) return;
    openedTrackedRef.current = key;
    void (async () => {
      const { error } = await markMeetingInvitationOpened(mid, currentPropertyId);
      if (!error) await load();
    })();
  }, [meeting?.id, user?.id, currentPropertyId, load, location.pathname, location.hash, location.search]);

  const voteByAgendaId = useMemo(() => {
    const m = new Map<string, MeetingVoteRow & { options: MeetingVoteOptionRow[] }>();
    for (const v of bundle.votes) {
      m.set(v.agenda_item_id, v);
    }
    return m;
  }, [bundle.votes]);

  async function handleCreateVote(agenda: MeetingAgendaRow) {
    if (!meeting || !user) return;
    setBusy(true);
    setActionErr(null);
    const { voteId, error } = await createVote({
      propertyId: meeting.property_id,
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
    if (!meeting) return;
    setBusy(true);
    setActionErr(null);
    const { error } = await updateVote(voteId, meeting.property_id, {
      status: 'open',
      opens_at: new Date().toISOString(),
    });
    if (error) setActionErr(error.message);
    setBusy(false);
    await load();
  }

  async function handleCloseVote(voteId: string) {
    if (!meeting) return;
    setBusy(true);
    setActionErr(null);
    const { error } = await updateVote(voteId, meeting.property_id, {
      status: 'closed',
      closes_at: new Date().toISOString(),
    });
    if (error) setActionErr(error.message);
    setBusy(false);
    await load();
  }

  async function handleBallot(voteId: string, optionKey: string) {
    if (!user || !meeting) return;
    setBusy(true);
    setActionErr(null);
    const { error } = await castBallot(voteId, optionKey, meeting.property_id);
    if (error && 'message' in error) setActionErr(String(error.message));
    setBusy(false);
    await load();
  }

  async function handleAddAgenda(e: React.FormEvent) {
    e.preventDefault();
    if (!meeting || !propertyIdForAgenda) return;
    if (!newAgendaZh.trim() && !newAgendaEn.trim()) {
      setActionErr(en ? 'Enter an agenda title.' : '请填写议程标题。');
      return;
    }
    setBusy(true);
    setActionErr(null);
    const nextOrder = bundle.agendaItems.length + 1;
    const { error } = await createAgendaItem({
      propertyId: propertyIdForAgenda,
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

  useEffect(() => {
    if (!inviteToast) return;
    const t = window.setTimeout(() => setInviteToast(null), 8000);
    return () => window.clearTimeout(t);
  }, [inviteToast]);

  async function handleSendInvites() {
    console.log('🚨 BUILD VERSION', import.meta.env.VITE_BUILD_TIME || 'dev');
    if (!meeting) {
      console.warn('🚨 early return reason: handleSendInvites — meeting is null');
      return;
    }
    console.log('send invite clicked', { meetingId: meeting.id, propertyId: meeting.property_id });
    setBusy(true);
    setActionErr(null);
    setInviteToast(null);
    try {
      const result = await sendMeetingInvitations(meeting.id, meeting.property_id, en ? 'en' : 'zh');
      console.log('recipients count', result.attempted);
      if (result.attempted === 0) {
        const msg = en ? 'No property members to invite.' : '没有可邀请的成员。';
        setInviteToast({ kind: 'error', text: msg });
        setActionErr(msg);
        return;
      }
      if (result.failed > 0 && result.sent === 0) {
        const msg =
          result.errors[0]?.message ??
          (en ? 'All invitation emails failed. See console.' : '全部邀请发送失败，请查看控制台。');
        console.error('send-meeting-invite error (all failed)', result.errors);
        setActionErr(msg);
        setInviteToast({ kind: 'error', text: msg });
        return;
      }
      if (result.failed > 0) {
        const msg = en
          ? `Sent ${result.sent}, failed ${result.failed}. Check console for details.`
          : `已发送 ${result.sent} 封，失败 ${result.failed} 封。详情请查看控制台。`;
        setActionErr(msg);
        setInviteToast({ kind: 'error', text: msg });
        return;
      }
      const okMsg = en
        ? `Invitation emails sent: ${result.sent}`
        : `已成功发送 ${result.sent} 封会议邀请邮件`;
      console.log('send-meeting-invite success', { sent: result.sent });
      setInviteToast({ kind: 'success', text: okMsg });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('send invite failed', e);
      setActionErr(msg);
      setInviteToast({ kind: 'error', text: msg });
    } finally {
      setBusy(false);
      try {
        await load();
      } catch (loadErr) {
        console.warn('[MeetingDetail] load after send failed (non-blocking)', loadErr);
      }
    }
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

  if (!coreDone) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <div className="min-h-screen bg-slate-100 p-6">
        <Link
          to={backToListHref}
          className="inline-flex items-center gap-2 text-emerald-800 font-medium hover:underline mb-6"
        >
          <ArrowLeft size={18} /> {isVotingRoute ? (en ? 'Back to voting list' : '返回投票列表') : en ? 'Back to meetings' : '返回会议列表'}
        </Link>
        <p className="text-center text-gray-700 text-lg">{en ? meetingUiStrings.notFound.en : meetingUiStrings.notFound.zh}</p>
      </div>
    );
  }

  const inv = invitationSummary(bundle.invitations);
  const openRatePct = inv.total ? Math.min(100, Math.round((inv.openedCount / inv.total) * 100)) : 0;
  const voteRatePct = inv.total ? Math.min(100, Math.round((inv.voted / inv.total) * 100)) : 0;

  function inviteTrackingStatusLabel(row: MeetingInvitationRow) {
    if (row.delivery_status === 'voted') return en ? 'Voted' : '已投票';
    if (row.opened_at) return en ? 'Opened' : '已打开';
    return en ? 'Not opened' : '未打开';
  }

  function inviteVoteResultLabel(v: MeetingInvitationRow['vote']) {
    if (!v) return '—';
    if (v === 'approve') return en ? 'Approve' : '赞成';
    if (v === 'reject') return en ? 'Reject' : '反对';
    return en ? 'Abstain' : '弃权';
  }

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <div className="border-b border-emerald-950/40 bg-gradient-to-br from-slate-950 via-emerald-950 to-[#0a3d2e] text-white shadow-lg shadow-slate-900/20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1 space-y-4">
              <Link
                to={backToListHref}
                className="inline-flex w-fit items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/20 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft size={18} />
                {isVotingRoute ? (en ? 'Back to voting list' : '返回投票列表') : en ? 'Back to meetings' : '返回会议列表'}
              </Link>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300/90 mb-2">
                  {isVotingRoute ? (en ? 'Meeting voting' : '会议投票') : en ? 'Meeting details' : '会议详情'}
                </p>
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-white/15 text-white/95 ring-1 ring-white/10">
                    {labelMeetingType(meeting.meeting_type, en)}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-white/15 text-white/95 ring-1 ring-white/10">
                    {labelFormat(meeting.meeting_format, en)}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white leading-snug break-words">
                  {meetingTitleZhFirst(meeting) || (en ? meetingUiStrings.untitled.en : meetingUiStrings.untitled.zh)}
                </h1>
                <dl className="mt-4 space-y-2 text-sm text-white/90 border-t border-white/10 pt-4">
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    <dt className="text-white/60 shrink-0">{en ? 'Status' : '状态'}</dt>
                    <dd className="font-semibold text-white">{labelStatus(meeting.status, en)}</dd>
                  </div>
                  <div className="flex flex-wrap gap-x-2 gap-y-1">
                    <dt className="text-white/60 shrink-0">{en ? 'Time' : '时间'}</dt>
                    <dd>
                      {meeting.scheduled_at
                        ? new Date(meeting.scheduled_at).toLocaleString(en ? 'en-CA' : 'zh-CN', {
                            dateStyle: 'full',
                            timeStyle: 'short',
                          })
                        : en
                          ? 'Not scheduled'
                          : '未排期'}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
            {isStaff && (
              <Link
                to={`/meetings/${meeting.id}/edit`}
                className="shrink-0 self-start rounded-lg bg-white/15 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/25 hover:bg-white/25 transition-colors lg:mt-12"
              >
                {en ? 'Edit meeting' : '编辑会议'}
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-6 relative z-10">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-8 shadow-[0_16px_50px_-12px_rgba(15,23,42,0.18)] space-y-8">
        {inviteToast ? (
          <div
            className={`fixed bottom-6 left-1/2 z-50 max-w-lg -translate-x-1/2 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
              inviteToast.kind === 'success' ? 'bg-[#1D9E75]' : 'bg-red-700'
            }`}
            role="status"
          >
            {inviteToast.text}
          </div>
        ) : null}
        {actionErr ? <p className="text-sm text-red-600 mb-4">{actionErr}</p> : null}
        {extrasLoading ? (
          <p className="text-xs text-gray-500 mb-4">{en ? 'Loading agenda, votes, and invitations…' : '正在加载议程、投票与邀请…'}</p>
        ) : null}

        {/* Layer 1 — meeting core */}
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

        {/* Layer 2 — agenda & voting */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">
                {en ? meetingUiStrings.sectionAgenda.en : meetingUiStrings.sectionAgenda.zh}
              </h2>
              <div className="space-y-6">
                {bundle.agendaItems.map((agenda) => {
                  const vote = voteByAgendaId.get(agenda.id);
                  const ballots = vote ? bundle.ballotsByVoteId[vote.id] ?? [] : [];
                  const tallies = ballotTallies(ballots);
                  const my = vote ? bundle.myBallotsByVoteId[vote.id] : undefined;
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
                      <h3 className="font-medium text-gray-900">
                        {agenda.title_zh?.trim() || agenda.title_en || (en ? meetingUiStrings.untitled.en : meetingUiStrings.untitled.zh)}
                      </h3>
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
                {bundle.agendaItems.length === 0 && (
                  <p className="text-gray-600 text-sm">
                    {en ? 'No agenda items yet. Add items below when you have access.' : '暂无议程。有权限时可在下方添加。'}
                  </p>
                )}

                {isStaff && propertyIdForAgenda && (
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

        {/* Layer 3 — invitations & resolutions */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-8">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2 flex items-center gap-2">
              <Mail size={18} />
              {en ? meetingUiStrings.sectionInvite.en : meetingUiStrings.sectionInvite.zh}
            </h2>
            {bundle.invitations.length === 0 ? (
              <p className="text-sm text-gray-600 mb-4">
                {en
                  ? 'No invitations recorded for this meeting yet. Summary below will update when invites exist.'
                  : '暂无邀请记录。有邀请后下方统计会更新。'}
              </p>
            ) : null}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-sm mb-4">
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
                <p className="text-gray-500">{en ? 'Voted' : '已投票'}</p>
                <p className="text-xl font-semibold">{inv.voted}</p>
              </div>
              <div>
                <p className="text-gray-500">{en ? 'Failed' : '失败'}</p>
                <p className="text-xl font-semibold text-red-700">{inv.failed}</p>
              </div>
            </div>

            {bundle.invitations.length > 0 ? (
              <div className="mb-6 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900">
                  {en ? 'Invitation tracking' : '邀请明细'}
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{en ? 'Open rate' : '打开率'}</span>
                      <span>
                        {inv.openedCount}/{inv.total} · {openRatePct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all"
                        style={{ width: `${openRatePct}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>{en ? 'Vote rate' : '投票率'}</span>
                      <span>
                        {inv.voted}/{inv.total} · {voteRatePct}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className="h-full bg-[#1D9E75] rounded-full transition-all"
                        style={{ width: `${voteRatePct}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-3 py-2 font-medium">{en ? 'Owner' : '业主'}</th>
                        <th className="px-3 py-2 font-medium">{en ? 'Email' : '邮箱'}</th>
                        <th className="px-3 py-2 font-medium">{en ? 'Status' : '状态'}</th>
                        <th className="px-3 py-2 font-medium whitespace-nowrap">{en ? 'Opened at' : '打开时间'}</th>
                        <th className="px-3 py-2 font-medium">{en ? 'Vote' : '投票结果'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {bundle.invitations.map((row) => {
                        const prof = inviteProfileById[row.recipient_user_id];
                        const ownerName = en
                          ? prof?.full_name_en || prof?.full_name_zh || '—'
                          : prof?.full_name_zh || prof?.full_name_en || '—';
                        const email = row.email ?? prof?.email ?? '—';
                        return (
                          <tr key={row.id} className="bg-white">
                            <td className="px-3 py-2 text-gray-900">{ownerName}</td>
                            <td className="px-3 py-2 text-gray-700 break-all max-w-[200px]">{email}</td>
                            <td className="px-3 py-2 text-gray-800">{inviteTrackingStatusLabel(row)}</td>
                            <td className="px-3 py-2 text-gray-600 whitespace-nowrap">
                              {row.opened_at ? new Date(row.opened_at).toLocaleString(en ? 'en-CA' : 'zh-CN') : '—'}
                            </td>
                            <td className="px-3 py-2 text-gray-800">{inviteVoteResultLabel(row.vote)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

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
          </div>

          <div className="border-t border-gray-100 pt-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 border-b pb-2">{en ? 'Resolutions' : '决议'}</h2>
            {bundle.resolutions.length === 0 ? (
              <p className="text-sm text-gray-600">
                {en ? 'No resolutions recorded yet.' : '暂无决议记录。'}
              </p>
            ) : (
              <ul className="space-y-3 text-sm">
                {bundle.resolutions.map((r) => (
                  <li key={r.id} className="border-l-4 border-emerald-500 pl-3">
                    <p className="text-gray-900">{r.resolution_text}</p>
                    <p className="text-gray-500 mt-1">
                      {en ? 'Outcome' : '结果'}: {r.outcome}
                      {r.followup_required ? (en ? ' · Follow-up' : ' · 需跟进') : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}
