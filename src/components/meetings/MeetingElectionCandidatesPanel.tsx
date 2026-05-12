import { useMemo, useState } from 'react';
import type { MeetingAgendaRow } from '@/features/meetings/api';
import { updateMeetingAgendaItem } from '@/features/meetings/api';
import type { MeetingRow } from '@/features/meetings/api';
import {
  embedElectionAgendaMeta,
  extractElectionAgendaMeta,
  finalizeElectionMeta,
  displayAgendaZhWithoutElection,
  formatElectionNominationUiStatus,
  getElectionNominationStatus,
  type ElectionAgendaMetaV1,
  type ElectionCandidateDraft,
  type ElectionNominationUiStatus,
} from '@/features/meetings/electionAgendaModel';
import { supabase } from '@/lib/supabase';

export type MeetingElectionCandidatesPanelProps = {
  agenda: MeetingAgendaRow;
  propertyId: string;
  /** Council `meetings.id` — used when staff updates `meeting_agenda_items`. */
  meetingId: string;
  /** Owner Vote `owner_vote_meetings.id`, required for owner self‑nomination RPC. */
  ownerVoteMeetingId?: string | null;
  /** Snapshot `unit_no` for the viewer (owner). */
  eligibleUnitNo?: string | null;
  canEdit: boolean;
  electionBallotCount: number;
  languageEn: boolean;
  t: (key: string) => string;
  /** Council meeting row (AGM/SGM) — drives nomination phase from auto 7+7+7 schedule. */
  councilElectionMeeting?: MeetingRow | null;
  onUpdated: () => void | Promise<void>;
};

function newCandidateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

function fmtTs(iso: string | undefined | null, languageEn: boolean): string {
  const t = iso?.trim();
  if (!t) return '—';
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(languageEn ? 'en-CA' : 'zh-CN', { dateStyle: 'medium', timeStyle: 'short' });
}

export function MeetingElectionCandidatesPanel({
  agenda,
  propertyId,
  meetingId,
  ownerVoteMeetingId,
  eligibleUnitNo,
  canEdit,
  electionBallotCount,
  languageEn,
  t,
  councilElectionMeeting = null,
  onUpdated,
}: MeetingElectionCandidatesPanelProps) {
  const parsed = extractElectionAgendaMeta(agenda.description_zh ?? '');
  const meta0 = parsed.meta;
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    unit: '',
    statement: '',
    nominated_by: '',
    accepted: true,
  });
  const [selfBusy, setSelfBusy] = useState(false);
  const [showSelfNom, setShowSelfNom] = useState(false);
  const [selfForm, setSelfForm] = useState({ name: '', statement: '' });

  const meta = meta0 ?? null;
  const candidatesSorted = useMemo(() => [...(meta?.candidates ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [meta]);
  const en = languageEn;
  /** Recomputed each render so open/closed flips correctly when nomination deadlines pass. */
  const now = new Date();
  const metaFinal = meta ? finalizeElectionMeta(meta, now) : null;
  const nomStatus: ElectionNominationUiStatus | null =
    metaFinal !== null ? getElectionNominationStatus(now, metaFinal, councilElectionMeeting ?? null) : null;

  const unitAlreadyCandidate = useMemo(() => {
    const u = eligibleUnitNo?.trim().toLowerCase();
    if (!u || !metaFinal) return false;
    return metaFinal.candidates.some((c) => String(c.unit_no ?? '').trim().toLowerCase() === u);
  }, [eligibleUnitNo, metaFinal]);

  const nominationOpenPhase = nomStatus === 'open';
  const staffNominationWritesEnabled = !!canEdit && nominationOpenPhase;

  const canOwnerSelfNom =
    !!ownerVoteMeetingId?.trim() &&
    !!eligibleUnitNo?.trim() &&
    !!metaFinal &&
    metaFinal.allow_self_nomination === true &&
    nominationOpenPhase &&
    !unitAlreadyCandidate &&
    !canEdit;

  async function persist(next: ElectionAgendaMetaV1) {
    if (!meta || !staffNominationWritesEnabled) return;
    const visible = displayAgendaZhWithoutElection(agenda.description_zh);
    const merged = finalizeElectionMeta(next);
    const descZh = embedElectionAgendaMeta(visible, merged);
    setBusy(true);
    try {
      const { error } = await updateMeetingAgendaItem({
        propertyId,
        meetingId,
        agendaItemId: agenda.id,
        titleZh: agenda.title_zh,
        titleEn: agenda.title_en,
        descriptionEn: agenda.description_en,
        descriptionZh: descZh,
        requiresVote: false,
        voteRule: null,
      });
      if (error) {
        const lc = error.message.toLowerCase();
        if (lc.includes('invalid_election_timeline')) alert(t('meeting_election_invalid_timeline'));
        else if (lc.includes('nomination_not_open')) alert(t('meeting_election_persist_nomination_not_open'));
        else if (lc.includes('nomination_closed')) alert(t('meeting_election_persist_nomination_closed'));
        console.error('[MeetingElectionCandidatesPanel]', error.message);
        return;
      }
      await onUpdated();
    } finally {
      setBusy(false);
    }
  }

  async function updateCandidate(patch: ElectionCandidateDraft) {
    if (!meta || !staffNominationWritesEnabled) return;
    await persist({
      ...finalizeElectionMeta(meta),
      candidates: meta.candidates.map((c) => (c.id === patch.id ? { ...patch } : c)),
    });
  }

  async function removeCandidate(id: string) {
    if (!meta || !staffNominationWritesEnabled || electionBallotCount > 0) return;
    await persist({
      ...finalizeElectionMeta(meta),
      candidates: meta.candidates.filter((c) => c.id !== id),
    });
  }

  async function upsertCandidate() {
    if (!staffNominationWritesEnabled || !meta) return;
    const name = form.name.trim();
    const unit_no = form.unit.trim();
    if (!name) return;
    const base: ElectionCandidateDraft = {
      id: editingId ?? newCandidateId(),
      name,
      unit_no,
      statement: form.statement.trim(),
      nominated_by: form.nominated_by.trim(),
      accepted: form.accepted,
      created_at: editingId ? meta.candidates.find((x) => x.id === editingId)?.created_at ?? new Date().toISOString() : new Date().toISOString(),
    };
    let nextList: ElectionCandidateDraft[];
    if (editingId) {
      nextList = meta.candidates.map((c) => (c.id === editingId ? base : c));
    } else {
      nextList = [...meta.candidates, base];
    }
    await persist({ ...finalizeElectionMeta(meta), candidates: nextList });
    setForm({ name: '', unit: '', statement: '', nominated_by: '', accepted: true });
    setEditingId(null);
  }

  async function submitSelfNomination() {
    const name = selfForm.name.trim();
    if (!ownerVoteMeetingId || !eligibleUnitNo || !name) return;
    setSelfBusy(true);
    try {
      const { data, error } = await supabase.rpc('submit_owner_election_nomination', {
        p_meeting_id: ownerVoteMeetingId,
        p_agenda_item_id: agenda.id,
        p_name: name,
        p_statement: selfForm.statement.trim(),
      });
      if (error) throw error;
      const payload = data as { ok?: boolean; error?: string } | null;
      if (payload && typeof payload === 'object' && payload.ok === false) {
        const code = String(payload.error ?? '').toLowerCase();
        if (code === 'duplicate_candidate') {
          alert(t('meeting_election_duplicate_candidate'));
          return;
        }
        if (code === 'nomination_not_open' || code === 'nomination_not_started') {
          alert(t('meeting_election_nomination_not_open_owner'));
          return;
        }
        if (code === 'nomination_closed') {
          alert(t('meeting_election_self_nomination_closed'));
          return;
        }
        alert(en ? String(payload.error) : code || '自荐失败');
        return;
      }
      setSelfForm({ name: '', statement: '' });
      setShowSelfNom(false);
      await onUpdated();
    } catch (e) {
      const raw = e instanceof Error ? e.message : String(e);
      const lc = raw.toLowerCase();
      if (lc.includes('duplicate_candidate')) alert(t('meeting_election_duplicate_candidate'));
      else if (lc.includes('nomination_not_open') || lc.includes('nomination_not_started'))
        alert(t('meeting_election_nomination_not_open_owner'));
      else if (lc.includes('nomination_closed')) alert(t('meeting_election_self_nomination_closed'));
      else console.error('[MeetingElectionCandidatesPanel] submit_owner_election_nomination', raw);
    } finally {
      setSelfBusy(false);
    }
  }

  const nominationStatusLabel =
    nomStatus !== null ? formatElectionNominationUiStatus(nomStatus, { t, languageEn: en }) : '—';

  if (!metaFinal || nomStatus === null) {
    return null;
  }

  return (
    <div className="mt-4 space-y-4 border-t border-amber-200/80 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900">{t('meeting_election_nomination')}</h4>
      </div>

      {nomStatus === 'invalid' ? (
        <p className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">
          {t('meeting_election_time_overlap_admin_warn')}
        </p>
      ) : null}

      {canEdit && nomStatus === 'before_open' ? (
        <p className="text-sm text-gray-700">{t('meeting_election_staff_nomination_before_open')}</p>
      ) : null}

      {canEdit && nomStatus === 'closed' ? (
        <p className="text-sm text-gray-700">{t('meeting_election_staff_nomination_closed_readonly')}</p>
      ) : null}
      <dl className="grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200 sm:col-span-2 lg:col-span-3">
          <dt className="text-gray-500">{en ? 'Nomination status' : '提名状态'}</dt>
          <dd className="font-medium text-gray-900">{nominationStatusLabel}</dd>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200">
          <dt className="text-gray-500">{t('meeting_election_nomination_opens')}</dt>
          <dd className="font-medium text-gray-900">{fmtTs(metaFinal?.nomination_opens_at, en)}</dd>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200">
          <dt className="text-gray-500">{t('meeting_election_nomination_closes')}</dt>
          <dd className="font-medium text-gray-900">{fmtTs(metaFinal?.nomination_closes_at, en)}</dd>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200">
          <dt className="text-gray-500">{t('meeting_election_candidates')}</dt>
          <dd className="font-medium text-gray-900">{metaFinal?.candidates.length ?? 0}</dd>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200">
          <dt className="text-gray-500">{t('meeting_election_seats')}</dt>
          <dd className="font-medium text-gray-900">{metaFinal?.seats ?? 0}</dd>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200">
          <dt className="text-gray-500">{t('meeting_election_max_choices')}</dt>
          <dd className="font-medium text-gray-900">{metaFinal?.max_choices_per_unit ?? 0}</dd>
        </div>
      </dl>

      {electionBallotCount > 0 ? (
        <p className="text-xs text-amber-800">
          {en ? `${electionBallotCount} unit(s) have submitted election ballots.` : `已有 ${electionBallotCount} 户提交了选举选票。`}
        </p>
      ) : null}

      <div>
        <h5 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">{t('meeting_election_candidates')}</h5>
        {candidatesSorted.length === 0 ? (
          <p className="text-sm text-gray-600">{en ? 'No candidates listed yet.' : '暂无候选人。'}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {candidatesSorted.map((c) => (
              <li key={c.id} className="rounded-lg bg-white px-3 py-2 ring-1 ring-gray-100">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {c.name}
                      {c.unit_no ? <span className="ml-1 text-xs font-normal text-gray-500">· {c.unit_no}</span> : null}
                    </p>
                    {c.statement ? <p className="mt-1 whitespace-pre-wrap text-xs text-gray-600">{c.statement}</p> : null}
                    <p className="mt-1 text-xs text-gray-500">
                      {t('meeting_election_nominated_by')}: {c.nominated_by?.trim() || '—'}{' '}
                    </p>
                    <p className="mt-1 text-xs text-gray-700">
                      {t('meeting_election_accepted')}:{' '}
                      <span className="font-semibold">{c.accepted ? (en ? 'Yes' : '是') : en ? 'No' : '否'}</span>
                    </p>
                  </div>
                  {staffNominationWritesEnabled ? (
                    <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                      <label className="flex items-center gap-1 text-xs text-gray-800">
                        <input
                          type="checkbox"
                          checked={Boolean(c.accepted)}
                          disabled={busy}
                          onChange={(ev) =>
                            void updateCandidate({ ...c, accepted: ev.target.checked }).catch(console.error)
                          }
                        />
                        {t('meeting_election_accepted')}
                      </label>
                      <button
                        type="button"
                        disabled={busy}
                        className="text-xs font-medium text-clearstrata-ui-primary hover:underline"
                        onClick={() => {
                          setEditingId(c.id);
                          setForm({
                            name: c.name,
                            unit: String(c.unit_no ?? ''),
                            statement: String(c.statement ?? ''),
                            nominated_by: String(c.nominated_by ?? ''),
                            accepted: c.accepted,
                          });
                        }}
                      >
                        {t('meeting_agenda_edit')}
                      </button>
                      <button
                        type="button"
                        disabled={busy || electionBallotCount > 0}
                        className="text-xs font-medium text-red-700 hover:underline disabled:opacity-40 disabled:hover:no-underline"
                        title={
                          electionBallotCount > 0 ? (en ? 'Cannot delete after ballots submitted' : '已有选票记录，无法删除') : undefined
                        }
                        onClick={() => void removeCandidate(c.id).catch(console.error)}
                      >
                        {en ? 'Delete' : '删除'}
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {canOwnerSelfNom ? (
        <div className="rounded-lg bg-white/70 px-3 py-3 ring-1 ring-amber-100">
          {!showSelfNom ? (
            <button
              type="button"
              disabled={selfBusy}
              onClick={() =>
                setSelfForm({
                  name: '',
                  statement: '',
                }) || setShowSelfNom(true)
              }
              className="text-sm font-semibold text-clearstrata-ui-primary hover:underline disabled:opacity-50"
            >
              {t('meeting_election_self_nominate')}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-800">{t('meeting_election_self_nominate')}</p>
              <input
                placeholder={t('meeting_election_candidate_name')}
                value={selfForm.name}
                disabled={selfBusy}
                onChange={(e) => setSelfForm((s) => ({ ...s, name: e.target.value }))}
                className="w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
              />
              <label className="block text-xs text-gray-600">
                {t('meeting_election_candidate_unit')}
                <input
                  value={eligibleUnitNo?.trim() ?? ''}
                  readOnly
                  className="mt-0.5 w-full rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-xs text-gray-700"
                />
              </label>
              <textarea
                placeholder={t('meeting_election_candidate_statement')}
                value={selfForm.statement}
                disabled={selfBusy}
                onChange={(e) => setSelfForm((s) => ({ ...s, statement: e.target.value }))}
                className="min-h-[72px] w-full rounded border border-gray-300 px-2 py-1.5 text-xs"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={selfBusy || !selfForm.name.trim()}
                  onClick={() => void submitSelfNomination()}
                  className="rounded-lg bg-clearstrata-ui-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
                >
                  {t('meeting_agenda_save')}
                </button>
                <button
                  type="button"
                  disabled={selfBusy}
                  onClick={() => {
                    setShowSelfNom(false);
                    setSelfForm({ name: '', statement: '' });
                  }}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
                >
                  {t('meeting_agenda_cancel')}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {!canEdit && meta.allow_self_nomination && nomStatus === 'before_open' ? (
        <p className="text-xs text-gray-600">{t('meeting_election_nomination_not_open_owner')}</p>
      ) : null}

      {!canEdit && meta.allow_self_nomination && nomStatus === 'closed' ? (
        <p className="text-xs text-gray-600">{t('meeting_election_self_nomination_closed')}</p>
      ) : null}

      {!canEdit && meta.allow_self_nomination && nominationOpenPhase && unitAlreadyCandidate ? (
        <p className="text-xs text-gray-600">{t('meeting_election_duplicate_candidate')}</p>
      ) : null}

      {staffNominationWritesEnabled ? (
        <div className="rounded-lg bg-amber-50/40 px-3 py-3 ring-1 ring-amber-200/60 space-y-2">
          <p className="text-xs font-medium text-gray-800">{t('meeting_election_add_candidate')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              placeholder={t('meeting_election_candidate_name')}
              value={form.name}
              disabled={busy}
              onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-xs"
            />
            <input
              placeholder={t('meeting_election_candidate_unit')}
              value={form.unit}
              disabled={busy}
              onChange={(e) => setForm((s) => ({ ...s, unit: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-xs"
            />
            <input
              placeholder={t('meeting_election_nominated_by')}
              value={form.nominated_by}
              disabled={busy}
              onChange={(e) => setForm((s) => ({ ...s, nominated_by: e.target.value }))}
              className="rounded border border-gray-300 px-2 py-1.5 text-xs sm:col-span-2"
            />
            <textarea
              placeholder={t('meeting_election_candidate_statement')}
              value={form.statement}
              disabled={busy}
              onChange={(e) => setForm((s) => ({ ...s, statement: e.target.value }))}
              className="min-h-[72px] rounded border border-gray-300 px-2 py-1.5 text-xs sm:col-span-2"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-800">
            <input
              type="checkbox"
              checked={form.accepted}
              disabled={busy}
              onChange={(ev) => setForm((s) => ({ ...s, accepted: ev.target.checked }))}
            />
            {t('meeting_election_accepted')}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !form.name.trim()}
              onClick={() => void upsertCandidate().catch(console.error)}
              className="rounded-lg bg-clearstrata-ui-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-clearstrata-ui-primaryHover disabled:opacity-50"
            >
              {editingId ? t('meeting_agenda_save') : t('meeting_election_add_candidate')}
            </button>
            {editingId ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setEditingId(null);
                  setForm({ name: '', unit: '', statement: '', nominated_by: '', accepted: true });
                }}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
              >
                {t('meeting_agenda_cancel')}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

