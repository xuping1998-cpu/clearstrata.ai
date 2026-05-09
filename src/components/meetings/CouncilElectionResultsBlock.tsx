import { useMemo } from 'react';
import type { MeetingAgendaRow } from '@/features/meetings/api';
import { finalizeElectionMeta, type ElectionAgendaMetaV1 } from '@/features/meetings/electionAgendaModel';

export type OwnerElectionBallotLite = {
  agenda_item_id: string;
  selected_candidate_ids: unknown;
};

type Props = {
  ownerVoteStatus: string;
  eligibleFallback: number;
  electionAgendas: Array<{ agenda: MeetingAgendaRow; meta: ElectionAgendaMetaV1 }>;
  ballots: OwnerElectionBallotLite[];
  languageEn: boolean;
  t: (key: string) => string;
};

function parseCandidateIds(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x === 'string' && x.trim()) out.push(x.trim());
  }
  return out;
}

export function CouncilElectionResultsBlock({
  ownerVoteStatus,
  eligibleFallback,
  electionAgendas,
  ballots,
  languageEn,
  t,
}: Props) {
  const en = languageEn;

  const ballotsFor = useMemo(() => {
    const m = new Map<string, OwnerElectionBallotLite[]>();
    for (const b of ballots) {
      const id = String(b.agenda_item_id ?? '');
      if (!id) continue;
      if (!m.has(id)) m.set(id, []);
      m.get(id)!.push(b);
    }
    return m;
  }, [ballots]);

  const st = ownerVoteStatus.trim().toLowerCase();
  const tentative = st === 'open';

  if (electionAgendas.length === 0) return null;

  return (
    <div className="mt-6 space-y-4 border-t border-gray-200 pt-5">
      <h3 className="text-base font-semibold text-gray-900">{t('meeting_election_title')}</h3>
      <ul className="space-y-6">
        {electionAgendas.map(({ agenda: a, meta: raw }) => {
          const meta = finalizeElectionMeta(raw);
          const agendaBallots = ballotsFor.get(a.id) ?? [];
          const castUnits = agendaBallots.length;
          const eligible = eligibleFallback > 0 ? eligibleFallback : castUnits || 1;
          const participation = eligible > 0 ? Math.min(100, (castUnits / eligible) * 100) : 0;

          const tally = new Map<string, number>();
          for (const c of meta.candidates) tally.set(c.id, 0);
          for (const b of agendaBallots) {
            const ids = parseCandidateIds(b.selected_candidate_ids);
            for (const id of ids) {
              tally.set(id, (tally.get(id) ?? 0) + 1);
            }
          }

          const ranked = [...meta.candidates].sort((x, y) => {
            const dy = tally.get(y.id) ?? 0;
            const dx = tally.get(x.id) ?? 0;
            if (dy !== dx) return dy - dx;
            return x.name.localeCompare(y.name);
          });

          return (
            <li key={a.id} className="rounded-2xl border border-amber-200/80 bg-amber-50/30 px-4 py-4 shadow-sm sm:px-5">
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/90">
                  {en ? `Election agenda #${a.sort_order}` : `选举议程 · #${a.sort_order}`}
                </p>
                <h4 className="text-base font-semibold text-gray-900">
                  {a.title_zh?.trim() || a.title_en?.trim() || '—'}
                </h4>
              </div>
              <dl className="mt-4 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-5">
                <div>
                  <dt className="text-gray-500">{t('meeting_election_seats')}</dt>
                  <dd className="font-semibold text-gray-900">{meta.seats}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t('meeting_election_max_choices')}</dt>
                  <dd className="font-semibold text-gray-900">{meta.max_choices_per_unit}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t('meeting_vote_eligible')}</dt>
                  <dd className="font-semibold text-gray-900">{eligible}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t('meeting_vote_cast')}</dt>
                  <dd className="font-semibold text-gray-900">{castUnits}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">{t('meeting_vote_participation')}</dt>
                  <dd className="font-semibold text-gray-900">{participation.toFixed(1)}%</dd>
                </div>
              </dl>
              <ol className="mt-4 divide-y divide-amber-100">
                {ranked.map((c, idx) => {
                  const votes = tally.get(c.id) ?? 0;
                  const isTop = idx < meta.seats;
                  const label = tentative ? t('meeting_election_tentative_winner') : t('meeting_election_winner');

                  return (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 first:pt-0">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">
                          {idx + 1}. {c.name}
                          <span className="ml-1 text-xs font-normal text-gray-500">
                            ({c.unit_no?.trim() || '—'})
                          </span>
                        </p>
                        {!c.accepted ? (
                          <p className="text-[11px] text-amber-900/80">{en ? 'Not accepted (not selectable)' : '未接受提名（不计入选票校验）'}</p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-900 px-2.5 py-0.5 text-xs font-semibold text-white">{votes}</span>
                        {isTop ? (
                          <span className="rounded-full bg-clearstrata-ui-primary px-2.5 py-0.5 text-xs font-semibold text-white">{label}</span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {ranked.length === 0 ? (
                <p className="mt-3 text-xs text-gray-600">{en ? 'No candidate records embedded.' : '元数据中暂无候选人列表。'}</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
