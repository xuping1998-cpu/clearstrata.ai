import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  evaluateOwnerVoteOpenGate,
  fetchOwnerVoteMeetingMetaForCouncilMeeting,
  ownerVoteMeetingTypeForInsert,
  translationKeyForOwnerVoteOpenGate,
  type MeetingAgendaRow,
  type MeetingRow,
  type OwnerVoteMeetingLite,
} from '@/features/meetings/api';
import { councilMeetingTitleForOwnerVoteBinding } from '@/features/meetings/ownerVotingCouncil';
import {
  councilMeetingVotingWindowFallback,
  deriveOwnerVoteMeetingVotingTimes,
} from '@/features/meetings/meetingFormatModel';
import { extractElectionAgendaMeta } from '@/features/meetings/electionAgendaModel';
import { StatusBadge } from '@/components/status/StatusBadge';

type OvMeetingRow = {
  id: string;
  property_id: string;
  title: string;
  description: string | null;
  meeting_type: string;
  status: string;
  scheduled_at: string | null;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  snapshot_frozen_at: string | null;
  created_at: string;
};

type OvResolution = {
  id: string;
  meeting_id: string;
  title: string;
  description: string | null;
  threshold: string;
  display_order: number | null;
};

function mapLiteToOvCouncilRow(
  lite: OwnerVoteMeetingLite,
  propertyId: string,
  titleBind: string,
  meetingFallbackType: string,
): OvMeetingRow {
  return {
    id: lite.id,
    property_id: propertyId,
    title: titleBind,
    description: null,
    meeting_type: lite.meeting_type ?? meetingFallbackType,
    status: lite.status,
    scheduled_at: lite.scheduled_at ?? null,
    voting_opens_at: lite.voting_opens_at,
    voting_closes_at: lite.voting_closes_at,
    snapshot_frozen_at: lite.snapshot_frozen_at,
    created_at: lite.created_at,
  };
}

type OvToast = { kind: 'success' | 'error'; text: string } | null;

type ResolutionResultNorm = {
  resolution_id: string;
  yes: number;
  no: number;
  abstain: number;
  total_cast: number;
  eligible_count: number;
  passed: boolean | null;
};

function pickResolutionId(raw: Record<string, unknown>): string {
  const v =
    raw.resolution_id ??
    raw.resolutionId ??
    raw.owner_vote_resolution_id ??
    raw.id ??
    '';
  return String(v);
}

function normResultRow(raw: Record<string, unknown>): ResolutionResultNorm | null {
  const resolution_id = pickResolutionId(raw);
  if (!resolution_id) return null;

  function num(...keys: string[]): number {
    for (const k of keys) {
      const v = raw[k];
      if (typeof v === 'number' && Number.isFinite(v)) return v;
      if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Number(v))) return Number(v);
    }
    return 0;
  }

  const yes = num('yes_count', 'yesCount');
  const no = num('no_count', 'noCount');
  const abstain = num('abstain_count', 'abstainCount');
  const total_cast = num('total_cast', 'totalCast', 'votes_cast');
  let eligible_count = num('eligible_count', 'eligibleCount');
  if (!eligible_count) eligible_count = num('eligible_voters');

  let passedVal: boolean | null = null;
  const pv = raw.passed ?? raw.is_passed;
  if (typeof pv === 'boolean') passedVal = pv;
  else if (pv === null || pv === undefined) passedVal = null;
  else if (pv === 't' || pv === 'true' || pv === 1) passedVal = true;
  else if (pv === 'f' || pv === 'false' || pv === 0) passedVal = false;

  return { resolution_id, yes, no, abstain, total_cast, eligible_count, passed: passedVal };
}

function descriptionForInsert(meeting: MeetingRow, agendaItems: MeetingAgendaRow[]): string | null {
  const parts: string[] = [];
  const dzh = meeting.description_zh?.trim();
  const den = meeting.description_en?.trim();
  if (dzh) parts.push(dzh);
  if (den) parts.push(den);
  const agendaTitles = agendaItems
    .slice(0, 16)
    .map((a) => (a.title_zh || a.title_en || '').trim())
    .filter(Boolean);
  if (agendaTitles.length) {
    parts.push(`${agendaTitles.join('\n')}`);
  }
  const merged = parts.join('\n\n').trim();
  return merged.length ? merged.slice(0, 24000) : null;
}

function ownerVoteMeetingStatusTone(
  status: string,
): 'neutral' | 'success' | 'warning' {
  const s = status.trim().toLowerCase();
  if (s === 'open') return 'success';
  if (s === 'closed' || s === 'archived') return 'warning';
  return 'neutral';
}

function statusLabelZhEn(statusRaw: string, en: boolean): string {
  const s = statusRaw.trim().toLowerCase();
  const map: Record<string, [string, string]> = {
    draft: ['草稿', 'Draft'],
    open: ['开放表决', 'Open'],
    closed: ['已截止', 'Closed'],
    archived: ['已归档', 'Archived'],
  };
  const hit = map[s];
  if (!hit) return statusRaw || (en ? '—' : '—');
  return en ? hit[1] : hit[0];
}

function thresholdUiLabel(threshold: string, en: boolean): string {
  if (threshold === 'majority') return en ? 'Majority' : '普通多数';
  if (threshold === 'three_quarter') return en ? '3/4' : '3/4 票';
  if (threshold === 'unanimous') return en ? 'Unanimous' : '全票通过';
  return threshold;
}

interface Props {
  meeting: MeetingRow;
  agendaItems: MeetingAgendaRow[];
  isStaff: boolean;
}

export function MeetingOwnerVoteCouncilSection({ meeting, agendaItems, isStaff }: Props) {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const en = language === 'en';

  const bindingTitle = councilMeetingTitleForOwnerVoteBinding(meeting);
  const plannedVotingWindow = councilMeetingVotingWindowFallback(meeting);

  const electionAgendaCount = useMemo(
    () =>
      agendaItems.filter(
        (a) => extractElectionAgendaMeta(a.description_zh ?? '').meta?.agenda_type === 'council_election',
      ).length,
    [agendaItems],
  );

  const [loading, setLoading] = useState(true);
  const [ovMeeting, setOvMeeting] = useState<OvMeetingRow | null>(null);
  const [resolutions, setResolutions] = useState<OvResolution[]>([]);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [resultByResolution, setResultByResolution] = useState<Record<string, ResolutionResultNorm>>({});
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<OvToast>(null);

  const [newResTitle, setNewResTitle] = useState('');
  const [newResDesc, setNewResDesc] = useState('');
  const [newResThreshold, setNewResThreshold] = useState<'majority' | 'three_quarter' | 'unanimous'>('majority');
  const [newResOrder, setNewResOrder] = useState(1);

  useEffect(() => {
    if (!toast) return;
    const h = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(h);
  }, [toast]);

  const reload = useCallback(async () => {
    const titleTrim = bindingTitle.trim();
    setOvMeeting(null);
    setResolutions([]);
    if (!meeting.property_id || !titleTrim) {
      setEligibleCount(0);
      setResultByResolution({});
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const r = await fetchOwnerVoteMeetingMetaForCouncilMeeting({
        propertyId: meeting.property_id,
        meeting,
      });
      if (r.error) throw r.error;

      const lite = r.meeting;
      if (!lite) {
        setOvMeeting(null);
        setResolutions([]);
        setEligibleCount(0);
        setResultByResolution({});
        return;
      }

      setOvMeeting(
        mapLiteToOvCouncilRow(lite, meeting.property_id, titleTrim, String(meeting.meeting_type ?? 'sgm')),
      );

      const mid = lite.id;

      const resMapped: OvResolution[] = r.resolutions.map((res) => ({
        id: res.id,
        meeting_id: mid,
        title: res.title,
        description: null,
        threshold: res.threshold,
        display_order: res.display_order,
      }));
      setResolutions(resMapped);
      setEligibleCount(r.eligibleCount);

      const { data: resultRows, error: e4 } = await supabase
        .from('owner_vote_resolution_results')
        .select('*')
        .eq('property_id', meeting.property_id)
        .eq('meeting_id', mid);

      if (e4) {
        console.warn('[ownerVote council] owner_vote_resolution_results', e4.message);
        setResultByResolution({});
      } else {
        const byId: Record<string, ResolutionResultNorm> = {};
        for (const raw of (resultRows ?? []) as Record<string, unknown>[]) {
          const n = normResultRow(raw);
          if (n) byId[n.resolution_id] = n;
        }
        setResultByResolution(byId);
      }

      const nextOrder =
        r.resolutions.length === 0
          ? 1
          : Math.max(
              ...r.resolutions.map((x) => (typeof x.display_order === 'number' ? x.display_order : 0)),
              0,
            ) + 1;
      setNewResOrder(nextOrder);
    } catch (e: unknown) {
      console.error('[MeetingOwnerVoteCouncilSection]', e);
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : en ? 'Failed to load owner voting' : '加载业主表决失败',
      });
    } finally {
      setLoading(false);
    }
  }, [bindingTitle, meeting, en]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const fmtTs = (iso: string | null | undefined) => {
    if (!iso) return en ? '—' : '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return en ? '—' : '—';
    return d.toLocaleString(en ? 'en-CA' : 'zh-CN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  };

  const draftOpenVoteGate = useMemo(() => {
    if (!ovMeeting || ovMeeting.status?.trim().toLowerCase() !== 'draft')
      return { ok: false as const, reason: 'no_snapshot' as const };

    const ov: OwnerVoteMeetingLite = {
      id: ovMeeting.id,
      status: ovMeeting.status,
      voting_opens_at: ovMeeting.voting_opens_at,
      voting_closes_at: ovMeeting.voting_closes_at,
      snapshot_frozen_at: ovMeeting.snapshot_frozen_at,
      scheduled_at: ovMeeting.scheduled_at ?? undefined,
      meeting_type: ovMeeting.meeting_type,
      created_at: ovMeeting.created_at,
    };
    return evaluateOwnerVoteOpenGate({
      ov,
      eligibleCount,
      resolutionCount: resolutions.length,
      electionAgendaCount,
    });
  }, [ovMeeting, eligibleCount, resolutions.length, electionAgendaCount]);

  const handleEnable = async () => {
    if (!user?.id || !meeting.property_id) return;
    const tit = bindingTitle.trim() || (meeting.title_zh || meeting.title_en || '').trim();
    if (!tit) {
      setToast({
        kind: 'error',
        text: en ? 'Meeting needs a title to enable Owner Voting.' : '请先为本次会议填写标题后再启用。',
      });
      return;
    }

    const scheduledIso = meeting.scheduled_at ? new Date(meeting.scheduled_at).toISOString() : null;
    const { voting_opens_at, voting_closes_at } = deriveOwnerVoteMeetingVotingTimes(meeting);

    const row = {
      property_id: meeting.property_id,
      meeting_type: ownerVoteMeetingTypeForInsert(meeting),
      title: tit,
      description: descriptionForInsert(meeting, agendaItems),
      scheduled_at: scheduledIso,
      voting_opens_at,
      voting_closes_at,
      status: 'draft',
      created_by: user.id,
    };

    setBusy(true);
    try {
      const { error } = await supabase.from('owner_vote_meetings').insert(row as Record<string, unknown>);
      if (error) throw error;
      setToast({ kind: 'success', text: t('meeting_ov_enabled_toast') });
      await reload();
    } catch (e: unknown) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : en ? 'Could not enable' : '启用失败',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleFreeze = async () => {
    if (!ovMeeting?.id) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc('freeze_owner_vote_snapshot', { p_meeting_id: ovMeeting.id });
      if (error) throw error;
      setToast({ kind: 'success', text: t('meeting_ov_freeze_toast') });
      await reload();
    } catch (e: unknown) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAddResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ovMeeting?.id) return;
    const title = newResTitle.trim();
    if (!title) {
      setToast({
        kind: 'error',
        text: en ? 'Resolution title is required.' : '请填写决议标题。',
      });
      return;
    }
    setBusy(true);
    try {
      const ins = {
        meeting_id: ovMeeting.id,
        title,
        description: newResDesc.trim() || null,
        threshold: newResThreshold,
        display_order: newResOrder > 0 ? newResOrder : 1,
      };
      const { error } = await supabase.from('owner_vote_resolutions').insert(ins);
      if (error) throw error;
      setToast({ kind: 'success', text: t('meeting_ov_resolution_added') });
      setNewResTitle('');
      setNewResDesc('');
      await reload();
    } catch (e: unknown) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : en ? 'Failed to add' : '添加失败',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleOpenVoting = async () => {
    if (!ovMeeting?.id) return;
    const ov: OwnerVoteMeetingLite = {
      id: ovMeeting.id,
      status: ovMeeting.status,
      voting_opens_at: ovMeeting.voting_opens_at,
      voting_closes_at: ovMeeting.voting_closes_at,
      snapshot_frozen_at: ovMeeting.snapshot_frozen_at,
      scheduled_at: ovMeeting.scheduled_at ?? undefined,
      meeting_type: ovMeeting.meeting_type,
      created_at: ovMeeting.created_at,
    };
    const gate = evaluateOwnerVoteOpenGate({
      ov,
      eligibleCount,
      resolutionCount: resolutions.length,
      electionAgendaCount,
    });
    if (!gate.ok) {
      setToast({ kind: 'error', text: t(translationKeyForOwnerVoteOpenGate(gate.reason)) });
      return;
    }

    setBusy(true);
    try {
      const { error } = await supabase
        .from('owner_vote_meetings')
        .update({ status: 'open', updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', ovMeeting.id);
      if (error) throw error;
      await reload();
    } catch (e: unknown) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  const handleCloseVoting = async () => {
    if (!ovMeeting?.id || ovMeeting.status?.trim().toLowerCase() !== 'open') return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from('owner_vote_meetings')
        .update({ status: 'closed', updated_at: new Date().toISOString() } as Record<string, unknown>)
        .eq('id', ovMeeting.id);
      if (error) throw error;
      await reload();
    } catch (e: unknown) {
      setToast({
        kind: 'error',
        text: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  };

  if (!isStaff) {
    return (
      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">{t('nav_owner_voting')}</h2>
        <p className="text-sm leading-relaxed text-gray-700 mb-4">{t('meeting_ov_owner_notice')}</p>
        <Link
          to="/owner-voting"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-clearstrata-ui-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive"
        >
          {t('meeting_ov_go_vote')}
        </Link>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      {toast ? (
        <div
          className={`mb-4 rounded-lg border px-3 py-2 text-sm ${
            toast.kind === 'success'
              ? 'border-clearstrata-state-success-border bg-clearstrata-state-success-surface text-clearstrata-state-success-text'
              : 'border-clearstrata-state-danger-border bg-clearstrata-state-danger-surface text-clearstrata-state-danger-text'
          }`}
          role="status"
        >
          {toast.text}
        </div>
      ) : null}

      <h2 className="mb-3 text-lg font-semibold text-gray-900 border-b border-gray-100 pb-2">{t('nav_owner_voting')}</h2>
      <p className="text-sm leading-relaxed text-gray-700 mb-4">{t('meeting_ov_staff_intro')}</p>

      {loading ? (
        <div className="flex items-center gap-2 py-8 text-gray-600">
          <Loader2 className="h-8 w-8 animate-spin text-clearstrata-brand-700" aria-hidden />
          <span>{t('meeting_ov_loading')}</span>
        </div>
      ) : ovMeeting === null ? (
        <div className="space-y-3">
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {!bindingTitle.trim()
              ? en
                ? 'Set a Chinese or English title on this meeting to enable Owner Voting.'
                : '请先为本次会议填写中英文标题后再启用业主电子表决。'
              : null}
          </p>
          {bindingTitle.trim() ? (
            <>
              <div className="text-sm space-y-1 text-gray-700 mb-3">
                <p>
                  <span className="text-gray-600">{t('meeting_ov_vote_opens')}:</span>{' '}
                  <span className="font-medium text-gray-900">{fmtTs(plannedVotingWindow.votingOpens)}</span>
                </p>
                <p>
                  <span className="text-gray-600">{t('meeting_ov_vote_closes')}:</span>{' '}
                  <span className="font-medium text-gray-900">{fmtTs(plannedVotingWindow.votingCloses)}</span>
                </p>
              </div>
              <button
                type="button"
                disabled={busy || !user?.id}
                onClick={() => void handleEnable()}
                className="rounded-xl bg-clearstrata-ui-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
              >
                {t('meeting_ov_enable')}
              </button>
            </>
          ) : null}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500">{t('meeting_ov_status_label')}</p>
              <div className="mt-1">
                <StatusBadge tone={ownerVoteMeetingStatusTone(ovMeeting.status)} size="sm">
                  {statusLabelZhEn(ovMeeting.status, en)}
                </StatusBadge>
              </div>
            </div>
            <div className="text-sm space-y-1">
              <p>
                <span className="text-gray-600">{t('meeting_ov_vote_opens')}:</span>{' '}
                <span className="font-medium text-gray-900">{fmtTs(ovMeeting.voting_opens_at)}</span>
              </p>
              <p>
                <span className="text-gray-600">{t('meeting_ov_vote_closes')}:</span>{' '}
                <span className="font-medium text-gray-900">{fmtTs(ovMeeting.voting_closes_at)}</span>
              </p>
              <p>
                <span className="text-gray-600">{t('meeting_ov_snapshot_frozen')}:</span>{' '}
                <span className="font-medium text-gray-900">{fmtTs(ovMeeting.snapshot_frozen_at)}</span>
              </p>
              <p>
                <span className="text-gray-600">{t('meeting_ov_eligible_count')}:</span>{' '}
                <span className="font-semibold text-gray-900">{eligibleCount}</span>
              </p>
              <p>
                <span className="text-gray-600">{t('meeting_ov_resolution_count')}:</span>{' '}
                <span className="font-semibold text-gray-900">{resolutions.length}</span>
              </p>
            </div>
          </div>

          {ovMeeting.status?.trim().toLowerCase() === 'draft' &&
          (!String(ovMeeting.snapshot_frozen_at ?? '').trim() || eligibleCount <= 0) ? (
            <p className="text-sm text-amber-800 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              {t('meeting_ov_flow_hint_freeze_snap')}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {!ovMeeting.snapshot_frozen_at && ovMeeting.status?.trim().toLowerCase() === 'draft' ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleFreeze()}
                className="rounded-lg border border-gray-800 bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {t('meeting_ov_freeze')}
              </button>
            ) : null}

            <button
              type="button"
              disabled={busy || ovMeeting.status?.trim().toLowerCase() !== 'draft' || !draftOpenVoteGate.ok}
              title={
                ovMeeting.status?.trim().toLowerCase() === 'draft' && !draftOpenVoteGate.ok
                  ? t(translationKeyForOwnerVoteOpenGate(draftOpenVoteGate.reason))
                  : undefined
              }
              onClick={() => void handleOpenVoting()}
              className="rounded-lg border border-clearstrata-ui-primary bg-clearstrata-ui-soft px-4 py-2 text-sm font-semibold text-clearstrata-brand-900 ring-1 ring-clearstrata-ui-softBorder hover:bg-clearstrata-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t('meeting_ov_open_voting')}
            </button>

            <button
              type="button"
              disabled={busy || ovMeeting.status?.trim().toLowerCase() !== 'open'}
              onClick={() => void handleCloseVoting()}
              className="rounded-lg border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-900 hover:bg-red-100 disabled:opacity-40"
            >
              {t('meeting_ov_close_voting')}
            </button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">{t('meeting_ov_add_resolution')}</h3>
            <form onSubmit={handleAddResolution} className="grid gap-3 sm:grid-cols-2">
              <label className="sm:col-span-2 space-y-1">
                <span className="text-xs text-gray-600">{t('meeting_ov_res_title_placeholder')} *</span>
                <input
                  required
                  value={newResTitle}
                  onChange={(e) => setNewResTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder={t('meeting_ov_res_title_placeholder')}
                />
              </label>
              <label className="sm:col-span-2 space-y-1">
                <span className="text-xs text-gray-600">{t('meeting_ov_res_desc_placeholder')}</span>
                <textarea
                  value={newResDesc}
                  onChange={(e) => setNewResDesc(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder={t('meeting_ov_res_desc_placeholder')}
                />
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-600">{en ? 'Threshold' : '表决门槛'} *</span>
                <select
                  required
                  value={newResThreshold}
                  onChange={(e) => setNewResThreshold(e.target.value as typeof newResThreshold)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="majority">{thresholdUiLabel('majority', en)}</option>
                  <option value="three_quarter">{thresholdUiLabel('three_quarter', en)}</option>
                  <option value="unanimous">{thresholdUiLabel('unanimous', en)}</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-xs text-gray-600">{t('meeting_ov_res_display_order')}</span>
                <input
                  type="number"
                  min={1}
                  value={newResOrder || 1}
                  onChange={(e) => setNewResOrder(Math.max(1, Number(e.target.value) || 1))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={busy || ovMeeting.status?.trim().toLowerCase() === 'archived'}
                  className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
                >
                  {t('meeting_ov_add_resolution')}
                </button>
              </div>
            </form>
          </div>

          {resolutions.length > 0 ? (
            <div className="border-t border-gray-100 pt-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">{en ? 'Tallies' : '统计结果'}</h3>
              <ul className="space-y-4">
                {resolutions.map((r) => {
                  const tally = resultByResolution[r.id];
                  const eco = tally?.eligible_count ?? eligibleCount;
                  const turnout = eco > 0 && tally?.total_cast != null ? (tally.total_cast / eco) * 100 : null;
                  return (
                    <li key={r.id} className="rounded-lg border border-gray-100 bg-gray-50/80 p-4">
                      <p className="font-medium text-gray-900">{r.title}</p>
                      {r.description ? (
                        <p className="mt-1 text-sm text-gray-600 whitespace-pre-wrap">{r.description}</p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-3 text-xs sm:text-sm text-gray-800">
                        <span>
                          {t('meeting_ov_yes')}: <strong>{tally?.yes ?? 0}</strong>
                        </span>
                        <span>
                          {t('meeting_ov_no')}: <strong>{tally?.no ?? 0}</strong>
                        </span>
                        <span>
                          {t('meeting_ov_abstain')}: <strong>{tally?.abstain ?? 0}</strong>
                        </span>
                        <span>
                          {en ? 'Voted units' : '已投户数'}: <strong>{tally?.total_cast ?? 0}</strong>
                          {eco ? (
                            <>
                              {' '}
                              / {eco}{' '}
                              {turnout !== null ? (
                                <>
                                  （{t('meeting_ov_turnout')}: {turnout.toFixed(1)}%）
                                </>
                              ) : null}
                            </>
                          ) : null}
                        </span>
                      </div>
                      <div className="mt-2 text-sm">
                        {tally?.passed === true ? (
                          <StatusBadge tone="success" size="sm">
                            {t('meeting_ov_passed')}
                          </StatusBadge>
                        ) : tally?.passed === false ? (
                          <StatusBadge tone="warning" size="sm">
                            {t('meeting_ov_failed')}
                          </StatusBadge>
                        ) : (
                          <span className="text-gray-500">{t('meeting_ov_outcome_pending')}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
