import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  createAgendaItem,
  createMeeting,
  fetchOwnerVoteMeetingMetaForCouncilMeeting,
  getMeetingDetail,
  noticeReadiness,
  updateMeeting,
  updateMeetingAgendaItem,
  type MeetingAgendaRow,
  type MeetingBallotRow,
  type MeetingRow,
  type MeetingStatus,
  type MeetingType,
  type MeetingVoteRow,
  type VoteRule,
} from '../features/meetings/api';
import {
  embedGovernanceMeta,
  embedWrittenRemoteCanonFromMeetingStart,
  meetingFormatUiFromRow,
  dbFormatFromUi,
  isWrittenRemoteUi,
  peelMeetingDescriptionZhForEditor,
  stripWrittenRemoteMeta,
  MEETING_SGM_REQUISITION_PERCENT_DEFAULT,
  meetingSgmRequisitionRequiredUnits,
  type MeetingFormatUi,
  type MeetingGovernanceMetaV1,
  type MeetingInitiationType,
} from '../features/meetings/meetingFormatModel';
import {
  deriveAgmSgmCanonDisplayWindows,
  deriveCouncilElectionCanonFromScheduledAt,
} from '@/features/meetings/electionTimelineMath';
import { isOwnerVotingMeeting } from '../features/meetings/ownerVotingCouncil';
import { extractElectionAgendaMeta } from '../features/meetings/electionAgendaModel';
import { canManagePropertyMeetings } from '@/lib/meetingPermissions';
import { supabase } from '../lib/supabase';

function sliceDatetimeLocal(iso: string | null | undefined): string {
  if (!iso?.trim()) return '';
  return iso.slice(0, 16);
}

function isoFromDatetimeLocal(loc: string): string | null {
  if (!loc.trim()) return null;
  const t = new Date(loc).getTime();
  if (Number.isNaN(t)) return null;
  return new Date(loc).toISOString();
}

function nowDatetimeLocalSlice(): string {
  return sliceDatetimeLocal(new Date().toISOString());
}

/** Editor UI: only `hybrid` | `written_remote` options — map legacy in_person / live_remote to hybrid. */
function normalizeEditorMeetingFormatUi(ui: MeetingFormatUi): MeetingFormatUi {
  if (ui === 'written_remote') return 'written_remote';
  return 'hybrid';
}

/** Add whole days using local calendar date components (datetime-local UX). */
function addDaysDatetimeLocal(loc: string, days: number): string {
  if (!loc.trim()) return '';
  const d = new Date(loc);
  if (Number.isNaN(d.getTime())) return '';
  d.setDate(d.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function parseNonNegativeInt(s: string): number {
  const n = Number.parseInt(String(s).trim(), 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

const defaultForm = {
  meeting_type: 'council' as MeetingType,
  title_en: '',
  title_zh: '',
  description_en: '',
  description_zh: '',
  scheduled_at: '',
  meeting_format_ui: 'hybrid' as MeetingFormatUi,
  status: 'draft' as MeetingStatus,
  initiation_type: 'council_initiated' as MeetingInitiationType,
  total_voting_units: '',
  signed_units: '',
};

function buildGovernanceMetaForSave(form: typeof defaultForm): MeetingGovernanceMetaV1 {
  const init = form.initiation_type;
  if (init !== 'owner_requisitioned') {
    return { v: 1, initiation_type: init };
  }
  const total = parseNonNegativeInt(form.total_voting_units);
  const signed = parseNonNegativeInt(form.signed_units);
  const requiredUnits = meetingSgmRequisitionRequiredUnits(total);
  return {
    v: 1,
    initiation_type: 'owner_requisitioned',
    total_voting_units: total,
    required_percent: MEETING_SGM_REQUISITION_PERCENT_DEFAULT,
    required_units: requiredUnits,
    signed_units: signed,
  };
}

type AgendaKindUi = 'normal' | 'resolution' | 'election';

type MeetingEditorAgendaRow = {
  clientId: string;
  serverId: string | null;
  isNew: boolean;
  title_zh: string;
  title_en: string;
  kind: AgendaKindUi;
  vote_rule: VoteRule;
  description_zh: string | null;
  description_en: string | null;
};

function editorKindFromAgendaRow(row: MeetingAgendaRow): AgendaKindUi {
  const meta = extractElectionAgendaMeta(row.description_zh ?? '').meta;
  if (meta?.agenda_type === 'council_election') return 'election';
  return row.requires_vote ? 'resolution' : 'normal';
}

function editorRowFromAgendaItem(row: MeetingAgendaRow): MeetingEditorAgendaRow {
  return {
    clientId: row.id,
    serverId: row.id,
    isNew: false,
    title_zh: row.title_zh ?? '',
    title_en: row.title_en ?? '',
    kind: editorKindFromAgendaRow(row),
    vote_rule: (row.vote_rule ?? 'simple_majority') as VoteRule,
    description_zh: row.description_zh,
    description_en: row.description_en,
  };
}

function newTempAgendaRow(): MeetingEditorAgendaRow {
  return {
    clientId: `temp_${crypto.randomUUID()}`,
    serverId: null,
    isNew: true,
    title_zh: '',
    title_en: '',
    kind: 'normal',
    vote_rule: 'simple_majority',
    description_zh: null,
    description_en: null,
  };
}

function cloneAgendaRow(r: MeetingEditorAgendaRow): MeetingEditorAgendaRow {
  return { ...r };
}

function agendaHasMeaningfulContent(r: MeetingEditorAgendaRow): boolean {
  if (String(r.title_zh).trim() || String(r.title_en).trim()) return true;
  if (String(r.description_zh ?? '').trim() || String(r.description_en ?? '').trim()) return true;
  return false;
}

function descriptionZhForPersist(r: MeetingEditorAgendaRow): string | null {
  if (r.kind === 'election') return r.description_zh ?? null;
  const peeled = extractElectionAgendaMeta(r.description_zh ?? '').cleanDescriptionZh?.trim();
  return peeled ? peeled : null;
}

async function persistMeetingAgendaDrafts(options: {
  propertyId: string;
  meetingId: string;
  rows: MeetingEditorAgendaRow[];
  deleteServerIds: string[];
  languageEn: boolean;
}): Promise<{ error: string | null }> {
  const { propertyId, meetingId, rows, deleteServerIds, languageEn } = options;
  const uniqDeletes = [...new Set(deleteServerIds)];
  for (const id of uniqDeletes) {
    const { error } = await supabase
      .from('meeting_agenda_items')
      .delete()
      .eq('property_id', propertyId)
      .eq('meeting_id', meetingId)
      .eq('id', id);
    if (error) return { error: error.message };
  }
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const sortOrder = i + 1;
    const requiresVote = r.kind === 'resolution';
    const voteRule = requiresVote ? r.vote_rule : null;
    const descZh = descriptionZhForPersist(r);
    const descEn = r.description_en ?? null;
    if (r.serverId) {
      const { error } = await updateMeetingAgendaItem({
        propertyId,
        meetingId,
        agendaItemId: r.serverId,
        titleZh: String(r.title_zh).trim() || null,
        titleEn: String(r.title_en).trim() || null,
        descriptionEn: descEn,
        descriptionZh: descZh,
        requiresVote,
        voteRule: requiresVote ? voteRule : null,
      });
      if (error) return { error: error.message };
    } else {
      if (r.kind === 'election') {
        return {
          error: languageEn
            ? 'Election agendas cannot be created from this screen. Add them on the meeting detail page.'
            : '无法在本页创建选举议程，请在会议详情页添加。',
        };
      }
      const { error } = await createAgendaItem({
        propertyId,
        meetingId,
        sortOrder,
        titleZh: String(r.title_zh).trim() || null,
        titleEn: String(r.title_en).trim() || null,
        descriptionEn: descEn,
        descriptionZh: descZh,
        requiresVote,
        voteRule: requiresVote ? voteRule : null,
      });
      if (error) return { error: error.message };
    }
  }
  return { error: null };
}

export function MeetingEditor() {
  const { meetingId } = useParams<{ meetingId?: string }>();
  const isEdit = Boolean(meetingId);
  const { user } = useAuth();
  const { currentPropertyId, ready: propertyReady, roleInProperty } = useProperty();
  const { language, t } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();

  const [form, setForm] = useState(defaultForm);
  const [fiscalYear] = useState(() => new Date().getFullYear());
  const [agendaItems, setAgendaItems] = useState<MeetingEditorAgendaRow[]>([]);
  const [pendingDeleteServerIds, setPendingDeleteServerIds] = useState<string[]>([]);
  const [meetingVotes, setMeetingVotes] = useState<MeetingVoteRow[]>([]);
  const [ballotsByVoteId, setBallotsByVoteId] = useState<Record<string, MeetingBallotRow[]>>({});
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const editSnapshotsRef = useRef<Map<string, MeetingEditorAgendaRow>>(new Map());
  const [detailMeeting, setDetailMeeting] = useState<MeetingRow | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [voteLine, setVoteLine] = useState<'loading' | 'none' | string>('loading');

  const agendaCount = useMemo(() => agendaItems.filter(agendaHasMeaningfulContent).length, [agendaItems]);

  const agendaIdsWithCouncilBallots = useMemo(() => {
    const s = new Set<string>();
    for (const v of meetingVotes) {
      const ballots = ballotsByVoteId[v.id] ?? [];
      if (ballots.length > 0) s.add(v.agenda_item_id);
    }
    return s;
  }, [meetingVotes, ballotsByVoteId]);

  const agendaIdsWithCouncilVote = useMemo(() => new Set(meetingVotes.map((v) => v.agenda_item_id)), [meetingVotes]);

  useEffect(() => {
    if (!isEdit) {
      setAgendaItems([]);
      setPendingDeleteServerIds([]);
      setMeetingVotes([]);
      setBallotsByVoteId({});
      setEditingClientId(null);
      editSnapshotsRef.current = new Map();
    }
  }, [isEdit]);

  useEffect(() => {
    if (!isEdit || !meetingId || !currentPropertyId || !user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const bundle = await getMeetingDetail(meetingId, currentPropertyId);
      if (cancelled) return;
      const m = bundle.meeting;
      if (!m) {
        setErr(en ? 'Meeting not found.' : '未找到该会议。');
        setDetailMeeting(null);
        setAgendaItems([]);
        setMeetingVotes([]);
        setBallotsByVoteId({});
        setPendingDeleteServerIds([]);
        setLoading(false);
        return;
      }
      setDetailMeeting(m);
      setAgendaItems(bundle.agendaItems.map(editorRowFromAgendaItem));
      setMeetingVotes(bundle.votes);
      setBallotsByVoteId(bundle.ballotsByVoteId);
      setPendingDeleteServerIds([]);
      setEditingClientId(null);
      editSnapshotsRef.current = new Map();
      const uiFmt = meetingFormatUiFromRow(m);
      const layers = peelMeetingDescriptionZhForEditor(m.description_zh);
      const gov = layers.governanceMeta;
      let statusMapped: MeetingStatus = m.status === 'scheduled' ? 'open' : m.status;
      if (!(statusMapped === 'draft' || statusMapped === 'open' || statusMapped === 'closed' || statusMapped === 'archived')) {
        statusMapped = 'draft';
      }
      setForm({
        meeting_type: m.meeting_type,
        title_en: m.title_en ?? '',
        title_zh: m.title_zh ?? '',
        description_en: m.description_en ?? '',
        description_zh: layers.userText,
        scheduled_at: sliceDatetimeLocal(m.scheduled_at),
        meeting_format_ui: normalizeEditorMeetingFormatUi(uiFmt),
        status: statusMapped,
        initiation_type: gov?.initiation_type ?? 'council_initiated',
        total_voting_units:
          gov?.total_voting_units != null && Number.isFinite(gov.total_voting_units)
            ? String(Math.floor(gov.total_voting_units))
            : '',
        signed_units:
          gov?.signed_units != null && Number.isFinite(gov.signed_units)
            ? String(Math.floor(gov.signed_units))
            : '',
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, meetingId, currentPropertyId, user, en]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (
        !isEdit ||
        !detailMeeting ||
        !currentPropertyId ||
        !isOwnerVotingMeeting(detailMeeting) ||
        !detailMeeting.property_id ||
        detailMeeting.property_id.trim() !== currentPropertyId.trim()
      ) {
        setVoteLine('none');
        return;
      }
      setVoteLine('loading');
      const res = await fetchOwnerVoteMeetingMetaForCouncilMeeting({
        propertyId: currentPropertyId,
        meeting: detailMeeting,
      });
      if (cancelled) return;
      if (res.error) {
        console.warn('[MeetingEditor] owner vote meta for editor', res.error);
      }
      if (!res.meeting?.id) {
        setVoteLine('none');
        return;
      }
      const s = String(res.meeting.status ?? '').trim().toLowerCase();
      setVoteLine(s || 'draft');
    })();
    return () => {
      cancelled = true;
    };
  }, [isEdit, detailMeeting, currentPropertyId]);

  function beginEdit(clientId: string) {
    const row = agendaItems.find((r) => r.clientId === clientId);
    if (!row) return;
    editSnapshotsRef.current.set(clientId, cloneAgendaRow(row));
    setEditingClientId(clientId);
    setErr(null);
  }

  function patchAgendaRow(clientId: string, patch: Partial<MeetingEditorAgendaRow>) {
    setAgendaItems((prev) => prev.map((r) => (r.clientId === clientId ? { ...r, ...patch } : r)));
  }

  function handleCardSaveLocal(clientId: string) {
    const row = agendaItems.find((r) => r.clientId === clientId);
    if (!row) return;
    if (row.isNew && !agendaHasMeaningfulContent(row)) {
      setAgendaItems((prev) => prev.filter((r) => r.clientId !== clientId));
      editSnapshotsRef.current.delete(clientId);
      setEditingClientId((e) => (e === clientId ? null : e));
      return;
    }
    editSnapshotsRef.current.delete(clientId);
    setEditingClientId((e) => (e === clientId ? null : e));
  }

  function handleCancelEditOrRemoveNew(clientId: string) {
    const row = agendaItems.find((r) => r.clientId === clientId);
    if (!row) return;
    if (row.isNew) {
      setAgendaItems((prev) => prev.filter((r) => r.clientId !== clientId));
      editSnapshotsRef.current.delete(clientId);
      setEditingClientId((e) => (e === clientId ? null : e));
      return;
    }
    const snap = editSnapshotsRef.current.get(clientId);
    if (snap) {
      setAgendaItems((prev) => prev.map((r) => (r.clientId === clientId ? cloneAgendaRow(snap) : r)));
      editSnapshotsRef.current.delete(clientId);
    }
    setEditingClientId((e) => (e === clientId ? null : e));
  }

  function handleDeleteExisting(clientId: string) {
    const row = agendaItems.find((r) => r.clientId === clientId);
    if (!row?.serverId || row.isNew) return;
    if (row.kind === 'election') {
      setErr(en ? 'Remove election agendas on the meeting detail page.' : '请在会议详情页处理选举议程。');
      return;
    }
    if (agendaIdsWithCouncilBallots.has(row.serverId)) {
      setErr(en ? 'This agenda has council ballots and cannot be deleted here.' : '该议程已有会议表决投票记录，无法在此删除。');
      return;
    }
    if (agendaIdsWithCouncilVote.has(row.serverId)) {
      setErr(
        en
          ? 'This agenda still has a linked council vote. Remove or archive that vote on the meeting detail page first.'
          : '该议程仍关联会议表决，请先在会议详情中移除或归档表决后再删除议程。',
      );
      return;
    }
    setErr(null);
    setPendingDeleteServerIds((prev) => (prev.includes(row.serverId!) ? prev : [...prev, row.serverId!]));
    setAgendaItems((prev) => prev.filter((r) => r.clientId !== clientId));
    editSnapshotsRef.current.delete(clientId);
    setEditingClientId((e) => (e === clientId ? null : e));
  }

  function handleAddAgendaRow() {
    const row = newTempAgendaRow();
    editSnapshotsRef.current.set(row.clientId, cloneAgendaRow(row));
    setAgendaItems((prev) => [...prev, row]);
    setEditingClientId(row.clientId);
    setErr(null);
  }

  function handleRemoveNewDraft(clientId: string) {
    const row = agendaItems.find((r) => r.clientId === clientId);
    if (!row?.isNew) return;
    setAgendaItems((prev) => prev.filter((r) => r.clientId !== clientId));
    setEditingClientId((e) => (e === clientId ? null : e));
    editSnapshotsRef.current.delete(clientId);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !currentPropertyId) {
      setErr(en ? 'Not signed in or no property.' : '未登录或未选择物业。');
      return;
    }

    const written = isWrittenRemoteUi(form.meeting_format_ui);

    const scheduledIso = isoFromDatetimeLocal(
      written
        ? form.scheduled_at.trim()
          ? form.scheduled_at
          : ''
        : form.scheduled_at?.trim()
          ? form.scheduled_at
          : '',
    );
    let descriptionZhFinal = form.description_zh;
    let votingOpenIso: string | null = null;
    let votingCloseIso: string | null = null;

    const dbFormat = dbFormatFromUi(form.meeting_format_ui);

    if (written) {
      if (!scheduledIso) {
        setErr(en ? 'Set the meeting start (public notice opens).' : '请设置会议开始时间（公示开始）。');
        return;
      }
      const canon = deriveCouncilElectionCanonFromScheduledAt(scheduledIso);
      if (!canon) {
        setErr(en ? 'Meeting start date is invalid.' : '会议开始时间无效。');
        return;
      }
      votingOpenIso = canon.votingOpenIso;
      votingCloseIso = canon.votingCloseIso;
      const embedded = embedWrittenRemoteCanonFromMeetingStart(form.description_zh || '', scheduledIso);
      if (!embedded) {
        setErr(en ? 'Could not build written-remote schedule from meeting start.' : '无法根据会议开始生成书面远程时间安排。');
        return;
      }
      descriptionZhFinal = embedded;
    } else {
      descriptionZhFinal = stripWrittenRemoteMeta(form.description_zh);
      votingOpenIso = null;
      votingCloseIso = null;
    }

    descriptionZhFinal = embedGovernanceMeta(descriptionZhFinal, buildGovernanceMetaForSave(form));

    const readinessMeeting: Partial<MeetingRow> = {
      meeting_type: form.meeting_type,
      title_en: form.title_en,
      title_zh: form.title_zh,
      scheduled_at: scheduledIso,
      meeting_format: dbFormat,
      ...(written
        ? { voting_open_at: votingOpenIso, voting_close_at: votingCloseIso }
        : {}),
    };

    if (form.status !== 'draft') {
      const readiness = noticeReadiness(readinessMeeting, agendaCount, {
        writtenRemote: written,
        discussionClosesIso: written && scheduledIso ? deriveCouncilElectionCanonFromScheduledAt(scheduledIso)?.publicNoticeCloseIso ?? null : null,
      });
      if (!readiness.ok) {
        const key = written ? 'meeting_create_notice_ready_written_missing' : 'meeting_create_notice_ready_sync_missing';
        setErr(t(key));
        return;
      }
    }

    const rowsSnapshot = agendaItems;
    const pendingDeletesSnapshot = [...pendingDeleteServerIds];
    const meaningful = rowsSnapshot.filter(agendaHasMeaningfulContent);
    const blankServerIds = rowsSnapshot
      .filter((r) => r.serverId && !agendaHasMeaningfulContent(r))
      .map((r) => r.serverId as string);
    const deleteServerIds = [...new Set([...pendingDeletesSnapshot, ...blankServerIds])];

    setErr(null);
    setSaving(true);

    if (!isEdit) {
      const { id, error } = await createMeeting({
        propertyId: currentPropertyId,
        fiscalYear,
        meetingType: form.meeting_type,
        titleEn: form.title_en || null,
        titleZh: form.title_zh || null,
        descriptionEn: form.description_en || null,
        descriptionZh: descriptionZhFinal || null,
        scheduledAt: scheduledIso,
        votingOpenAt: written ? votingOpenIso : undefined,
        votingCloseAt: written ? votingCloseIso : undefined,
        meetingFormat: dbFormat,
        status: form.status,
        createdBy: user.id,
      });
      if (error || !id) {
        setSaving(false);
        setErr(error?.message ?? (en ? 'Create failed.' : '创建失败。'));
        return;
      }
      const persistResult = await persistMeetingAgendaDrafts({
        propertyId: currentPropertyId,
        meetingId: id,
        rows: meaningful,
        deleteServerIds: [],
        languageEn: en,
      });
      setSaving(false);
      if (persistResult.error) {
        setErr(
          en
            ? `Meeting created, but agendas did not save: ${persistResult.error}`
            : `会议已创建，但议程未保存：${persistResult.error}`,
        );
        navigate(`/meetings/${id}`);
        return;
      }
      navigate(`/meetings/${id}`);
      return;
    }

    const { error } = await updateMeeting(meetingId!, currentPropertyId, {
      meeting_type: form.meeting_type,
      title_en: form.title_en || null,
      title_zh: form.title_zh || null,
      description_en: form.description_en || null,
      description_zh: descriptionZhFinal || null,
      scheduled_at: scheduledIso,
      meeting_format: dbFormat,
      status: form.status,
      voting_open_at: votingOpenIso,
      voting_close_at: votingCloseIso,
    });
    if (error) {
      setSaving(false);
      setErr(error.message);
      return;
    }
    const persistResult = await persistMeetingAgendaDrafts({
      propertyId: currentPropertyId,
      meetingId: meetingId!,
      rows: meaningful,
      deleteServerIds,
      languageEn: en,
    });
    setSaving(false);
    if (persistResult.error) {
      setErr(
        en ? `Meeting saved, but agendas: ${persistResult.error}` : `会议已保存，议程同步失败：${persistResult.error}`,
      );
      return;
    }
    setPendingDeleteServerIds([]);
    setAgendaItems(meaningful);
    setEditingClientId(null);
    navigate(`/meetings/${meetingId}`);
  }

  function voteStatusReadLabel(): string {
    if (!isEdit) return '';
    if (voteLine === 'loading') return en ? '…' : '…';
    if (voteLine === 'none') return t('vote_not_enabled');
    switch (voteLine) {
      case 'draft':
        return t('vote_draft');
      case 'open':
        return t('vote_open');
      case 'closed':
        return t('vote_closed');
      case 'archived':
        return t('vote_archived');
      default:
        return voteLine || t('vote_not_enabled');
    }
  }

  if (!user) {
    return <div className="p-8 text-center text-gray-600">{en ? 'Sign in required.' : '请先登录。'}</div>;
  }

  if (!propertyReady || loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="size-8 animate-spin text-clearstrata-brand-700" />
      </div>
    );
  }

  if (!currentPropertyId) {
    return <div className="p-8 text-center text-gray-600">{en ? 'Select a property first.' : '请先选择物业。'}</div>;
  }

  if (!canManagePropertyMeetings(roleInProperty)) {
    return <Navigate to="/owner-voting" replace />;
  }

  const syncTimeModes = !(form.meeting_format_ui === 'written_remote');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link
        to="/meetings"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-clearstrata-brand-800 hover:underline"
      >
        <ChevronLeft className="size-4" />
        {t('nav_meetings_records')}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">
        {isEdit ? (en ? 'Edit meeting' : '编辑会议') : en ? 'New meeting' : '新建会议'}
      </h1>

      {form.meeting_format_ui === 'written_remote' ? (
        <p className="mt-3 text-sm leading-relaxed text-gray-600">{t('meeting_written_remote_intro')}</p>
      ) : null}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700">{en ? 'Meeting type' : '会议类型'}</label>
          <select
            value={form.meeting_type}
            onChange={(e) => setForm((f) => ({ ...f, meeting_type: e.target.value as MeetingType }))}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
          >
            <option value="council">{en ? 'Council' : '业委会'}</option>
            <option value="agm">AGM</option>
            <option value="sgm">SGM</option>
          </select>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">{en ? 'Title (English)' : '标题（英）'}</label>
            <input
              value={form.title_en}
              onChange={(e) => setForm((f) => ({ ...f, title_en: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{en ? 'Title (Chinese)' : '标题（中）'}</label>
            <input
              value={form.title_zh}
              onChange={(e) => setForm((f) => ({ ...f, title_zh: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">{en ? 'Description (EN)' : '说明（英）'}</label>
            <textarea
              value={form.description_en}
              onChange={(e) => setForm((f) => ({ ...f, description_en: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">{en ? 'Description (ZH)' : '说明（中）'}</label>
            <textarea
              value={form.description_zh}
              onChange={(e) => setForm((f) => ({ ...f, description_zh: e.target.value }))}
              rows={3}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">{t('meeting_initiation_type')}</label>
          <select
            value={form.initiation_type}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                initiation_type: e.target.value as MeetingInitiationType,
              }))
            }
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
          >
            <option value="council_initiated">{t('meeting_initiation_council')}</option>
            <option value="owner_requisitioned">{t('meeting_initiation_owner_requisitioned')}</option>
            <option value="annual_required">{t('meeting_initiation_annual_required')}</option>
          </select>
        </div>

        {form.initiation_type === 'owner_requisitioned' ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 space-y-3">
            <p className="text-sm font-medium text-gray-800">{t('meeting_initiation_owner_requisitioned')}</p>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('meeting_total_voting_units')}</label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.total_voting_units}
                onChange={(e) => setForm((f) => ({ ...f, total_voting_units: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
            <p className="text-sm text-gray-700">
              {t('meeting_required_percent')}: {MEETING_SGM_REQUISITION_PERCENT_DEFAULT}%
            </p>
            <p className="text-sm text-gray-700">
              {t('meeting_required_units')}:{' '}
              {meetingSgmRequisitionRequiredUnits(parseNonNegativeInt(form.total_voting_units))}
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('meeting_signed_units')}</label>
              <input
                type="number"
                min={0}
                step={1}
                value={form.signed_units}
                onChange={(e) => setForm((f) => ({ ...f, signed_units: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
              />
            </div>
            <p className="text-sm font-medium text-gray-900">
              {parseNonNegativeInt(form.signed_units) >=
              meetingSgmRequisitionRequiredUnits(parseNonNegativeInt(form.total_voting_units))
                ? t('meeting_requisition_met')
                : t('meeting_requisition_not_met')}
            </p>
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-medium text-gray-700">{en ? 'Meeting format' : '会议形式'}</label>
          <select
            value={form.meeting_format_ui}
            onChange={(e) => {
              const v = e.target.value as MeetingFormatUi;
              setForm((f) => {
                if (!isWrittenRemoteUi(f.meeting_format_ui) && isWrittenRemoteUi(v)) {
                  const discOpen = f.scheduled_at.trim() ? f.scheduled_at : nowDatetimeLocalSlice();
                  return {
                    ...f,
                    meeting_format_ui: v,
                    scheduled_at: discOpen,
                  };
                }
                if (isWrittenRemoteUi(f.meeting_format_ui) && !isWrittenRemoteUi(v)) {
                  return { ...f, meeting_format_ui: v, description_zh: stripWrittenRemoteMeta(f.description_zh) };
                }
                return { ...f, meeting_format_ui: v };
              });
            }}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
          >
            <option value="hybrid">{t('meeting_format_editor_option_hybrid')}</option>
            <option value="written_remote">{t('meeting_format_editor_option_written_remote')}</option>
          </select>
          <div className="mt-2 space-y-2 rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-2 text-xs text-gray-700 leading-relaxed">
            <p>{t('meeting_format_editor_legend_written')}</p>
            <p>{t('meeting_format_editor_legend_hybrid')}</p>
          </div>
        </div>

        {syncTimeModes ? (
          <div>
            <label className="block text-sm font-medium text-gray-700">{t('meeting_time_local')}</label>
            <input
              type="datetime-local"
              value={form.scheduled_at}
              onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">{t('public_notice_opens')}</label>
              <input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_at: e.target.value }))}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
              />
              <p className="mt-2 text-xs text-gray-600 leading-relaxed">{t('meeting_written_remote_auto_phases_hint')}</p>
            </div>
            {form.scheduled_at.trim() &&
            deriveAgmSgmCanonDisplayWindows(isoFromDatetimeLocal(form.scheduled_at) ?? '', agendaCount > 0) ? (
              <div className="rounded-lg border border-gray-100 bg-gray-50/90 px-3 py-3 text-xs text-gray-800 space-y-2">
                {(() => {
                  const disp = deriveAgmSgmCanonDisplayWindows(
                    isoFromDatetimeLocal(form.scheduled_at)!,
                    agendaCount > 0,
                  );
                  if (!disp) return null;
                  const fmt = (iso: string) =>
                    new Date(iso).toLocaleString(en ? 'en-CA' : 'zh-CN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    });
                  return (
                    <>
                      <p>
                        <span className="font-semibold">{t('meeting_election_phase_public_notice')}</span>{' '}
                        {fmt(disp.publicNoticeOpenIso)} – {fmt(disp.publicNoticeCloseIso)}
                      </p>
                      {disp.nominationOpenIso != null && disp.nominationCloseIso != null ? (
                        <p>
                          <span className="font-semibold">{t('meeting_election_phase_nomination')}</span>{' '}
                          {fmt(disp.nominationOpenIso)} – {fmt(disp.nominationCloseIso)}
                        </p>
                      ) : null}
                      <p>
                        <span className="font-semibold">{t('meeting_election_phase_voting')}</span>{' '}
                        {fmt(disp.votingOpenIso)} – {fmt(disp.votingCloseIso)}
                      </p>
                    </>
                  );
                })()}
              </div>
            ) : null}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">{t('meeting_status')}</label>
          <select
            value={form.status === 'scheduled' ? 'open' : form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MeetingStatus }))}
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-gray-900"
          >
            <option value="draft">{t('meeting_status_draft_label')}</option>
            <option value="open">{t('meeting_status_active_label')}</option>
            <option value="closed">{t('meeting_status_closed_label')}</option>
            <option value="archived">{t('meeting_status_archived_label')}</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            {en
              ? `Meaningful agenda count (for notice checks): ${agendaCount}`
              : `计入公示检查的有效议程条数：${agendaCount}`}
          </p>
          {isEdit && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <span className="text-xs font-medium text-gray-600">{t('voting_status')}</span>
              <p className="text-sm font-medium text-gray-900 mt-0.5">
                {voteLine === 'loading' ? (en ? '…' : '…') : voteStatusReadLabel()}
              </p>
            </div>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-gray-900">
              {en ? 'Agenda (local draft)' : '议程（本地草稿）'}
            </p>
            <button
              type="button"
              onClick={handleAddAgendaRow}
              className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50"
            >
              {en ? 'Add agenda item' : '添加议程'}
            </button>
          </div>
          <p className="text-xs text-gray-500">
            {en
              ? `Items with at least one title or description count toward notice checks (${agendaCount}). Saving the meeting writes changes to the database.`
              : `至少填写中/英标题或说明的议程会计入公示就绪检查（当前 ${agendaCount} 条）。保存会议时会将议程写入数据库。`}
          </p>
          <div className="space-y-3">
            {agendaItems.map((row, idx) => {
              const editing = editingClientId === row.clientId;
              const kindLabel =
                row.kind === 'normal'
                  ? t('meeting_agenda_type_normal')
                  : row.kind === 'resolution'
                    ? t('meeting_agenda_type_resolution')
                    : t('meeting_agenda_type_election');
              return (
                <div key={row.clientId} className="rounded-lg border border-gray-200 bg-gray-50/80 p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-medium text-gray-500">
                      #{idx + 1}
                      {row.isNew ? (
                        <span className="ml-2 text-amber-700">{en ? '· new' : '· 新建'}</span>
                      ) : null}
                    </span>
                    {!editing ? <span className="text-xs text-gray-600">{kindLabel}</span> : null}
                  </div>
                  {editing ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          value={row.title_zh}
                          onChange={(e) => patchAgendaRow(row.clientId, { title_zh: e.target.value })}
                          placeholder={en ? 'Title (Chinese)' : '标题（中文）'}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                        <input
                          value={row.title_en}
                          onChange={(e) => patchAgendaRow(row.clientId, { title_en: e.target.value })}
                          placeholder={en ? 'Title (English)' : '标题（英文）'}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                      </div>
                      <label className="block text-sm">
                        <span className="font-medium text-gray-800">{t('meeting_agenda_type')}</span>
                        <select
                          value={row.kind}
                          disabled={!row.isNew && row.kind === 'election'}
                          onChange={(e) => {
                            const nk = e.target.value as AgendaKindUi;
                            patchAgendaRow(row.clientId, { kind: nk });
                          }}
                          className="mt-1 w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="normal">{t('meeting_agenda_type_normal')}</option>
                          <option value="resolution">{t('meeting_agenda_type_resolution')}</option>
                          {!row.isNew && row.kind === 'election' ? (
                            <option value="election">{t('meeting_agenda_type_election')}</option>
                          ) : null}
                        </select>
                      </label>
                      {row.kind === 'resolution' ? (
                        <label className="block text-sm space-y-1">
                          <span className="font-medium text-gray-800">{en ? 'Vote threshold' : '表决门槛'}</span>
                          <select
                            value={row.vote_rule}
                            onChange={(e) =>
                              patchAgendaRow(row.clientId, { vote_rule: e.target.value as VoteRule })
                            }
                            className="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          >
                            <option value="simple_majority">{en ? 'Simple majority' : '普通多数'}</option>
                            <option value="three_quarter">{en ? 'Three-quarters' : '3/4 票'}</option>
                            <option value="unanimous">{en ? 'Unanimous' : '全票通过'}</option>
                          </select>
                        </label>
                      ) : null}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleCardSaveLocal(row.clientId)}
                          className="text-sm px-4 py-2 rounded-lg bg-clearstrata-ui-primary text-white hover:bg-clearstrata-ui-primaryHover"
                        >
                          {t('meeting_agenda_save')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancelEditOrRemoveNew(row.clientId)}
                          className="text-sm px-4 py-2 rounded-lg border border-gray-300 hover:bg-white"
                        >
                          {row.isNew ? t('meeting_agenda_cancel') : en ? 'Cancel edit' : '取消编辑'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-900">
                        {String(row.title_zh).trim() ||
                          String(row.title_en).trim() ||
                          (en ? 'Untitled agenda item' : '未命名议程')}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => beginEdit(row.clientId)}
                          className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-800 hover:bg-white"
                        >
                          {t('meeting_agenda_edit')}
                        </button>
                        {row.isNew ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveNewDraft(row.clientId)}
                            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-800 hover:bg-white"
                          >
                            {t('meeting_agenda_cancel')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDeleteExisting(row.clientId)}
                            className="text-sm px-3 py-1.5 rounded-lg border border-red-200 text-red-800 hover:bg-red-50"
                          >
                            {t('action_delete')}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          {agendaItems.length === 0 ? (
            <p className="text-sm text-gray-600">{en ? 'No agenda rows yet.' : '暂无议程条目。'}</p>
          ) : null}
        </div>

        <div className="text-sm text-gray-600 bg-amber-50 border border-amber-100 rounded-lg p-3 space-y-2">
          <p>{t('meeting_editor_schedule_guard_note')}</p>
          {!isEdit ? (
            <p className="pt-2 border-t border-amber-200">{t('meeting_create_save_then_agenda_hint')}</p>
          ) : null}
        </div>

        {err ? <p className="text-sm text-red-600">{err}</p> : null}

        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin inline" /> : null}{' '}
          {en ? 'Save' : '保存'}
        </button>
      </form>
    </div>
  );
}

export default MeetingEditor;
