import { useMemo, useState } from 'react';
import type { MeetingAgendaRow } from '@/features/meetings/api';
import { updateMeetingAgendaItem } from '@/features/meetings/api';
import {
  embedElectionAgendaMeta,
  extractElectionAgendaMeta,
  finalizeElectionMeta,
  displayAgendaZhWithoutElection,
  type ElectionAgendaMetaV1,
  type ElectionCandidateDraft,
} from '@/features/meetings/electionAgendaModel';

export type MeetingElectionCandidatesPanelProps = {
  agenda: MeetingAgendaRow;
  propertyId: string;
  meetingId: string;
  canEdit: boolean;
  electionBallotCount: number;
  languageEn: boolean;
  t: (key: string) => string;
  onUpdated: () => void | Promise<void>;
};

function newCandidateId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export function MeetingElectionCandidatesPanel({
  agenda,
  propertyId,
  meetingId,
  canEdit,
  electionBallotCount,
  languageEn,
  t,
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

  const meta = meta0 ?? null;
  const candidatesSorted = useMemo(() => [...(meta?.candidates ?? [])].sort((a, b) => a.name.localeCompare(b.name)), [meta]);

  if (!meta) return null;

  async function persist(next: ElectionAgendaMetaV1) {
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
      if (error) console.error('[MeetingElectionCandidatesPanel]', error.message);
      await onUpdated();
    } finally {
      setBusy(false);
    }
  }

  async function updateCandidate(patch: ElectionCandidateDraft) {
    await persist({
      ...finalizeElectionMeta(meta),
      candidates: meta.candidates.map((c) => (c.id === patch.id ? { ...patch } : c)),
    });
  }

  async function removeCandidate(id: string) {
    if (electionBallotCount > 0) return;
    await persist({
      ...finalizeElectionMeta(meta),
      candidates: meta.candidates.filter((c) => c.id !== id),
    });
  }

  async function upsertCandidate() {
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

  const en = languageEn;

  return (
    <div className="mt-4 space-y-3 border-t border-amber-200/80 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-gray-900">{t('meeting_election_candidates')}</h4>
      </div>
      <dl className="grid gap-2 text-xs sm:grid-cols-3">
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200">
          <dt className="text-gray-500">{t('meeting_election_seats')}</dt>
          <dd className="font-medium text-gray-900">{meta.seats}</dd>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200">
          <dt className="text-gray-500">{t('meeting_election_max_choices')}</dt>
          <dd className="font-medium text-gray-900">{meta.max_choices_per_unit}</dd>
        </div>
        <div className="rounded-lg bg-white/70 px-2 py-1.5 ring-1 ring-gray-200">
          <dt className="text-gray-500">{t('meeting_election_allow_self_nomination')}</dt>
          <dd className="font-medium text-gray-900">{meta.allow_self_nomination ? (en ? 'Yes' : '是') : en ? 'No' : '否'}</dd>
        </div>
      </dl>

      {electionBallotCount > 0 ? (
        <p className="text-xs text-amber-800">
          {en ? `${electionBallotCount} unit(s) have submitted election ballots.` : `已有 ${electionBallotCount} 户提交了选举选票。`}
        </p>
      ) : null}

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
                {canEdit ? (
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
                      title={electionBallotCount > 0 ? (en ? 'Cannot delete after ballots submitted' : '已有选票记录，无法删除') : undefined}
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

      {canEdit ? (
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
