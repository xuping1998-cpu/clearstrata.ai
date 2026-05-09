/** Hidden HTML comment blob in `meeting_agenda_items.description_zh`. Must match Postgres `try_extract_election_agenda_meta`. */

export const ELECTION_AGENDA_MARKER = '<!--clearstrata-election-agenda';

export type ElectionNominationStatus = 'open' | string;

export type ElectionCandidateDraft = {
  id: string;
  name: string;
  unit_no: string | null | undefined;
  statement: string | null | undefined;
  nominated_by: string | null | undefined;
  accepted: boolean;
  created_at: string | null | undefined;
};

export type ElectionAgendaMetaV1 = {
  v: 1;
  agenda_type: 'council_election';
  seats: number;
  allow_self_nomination: boolean;
  max_choices_per_unit: number;
  nomination_status: ElectionNominationStatus;
  candidates: ElectionCandidateDraft[];
};

export function defaultElectionMeta(overrides?: Partial<Omit<ElectionAgendaMetaV1, 'v' | 'agenda_type' | 'candidates'>>): ElectionAgendaMetaV1 {
  return {
    v: 1,
    agenda_type: 'council_election',
    seats: overrides?.seats ?? 3,
    allow_self_nomination: overrides?.allow_self_nomination ?? true,
    max_choices_per_unit: overrides?.max_choices_per_unit ?? 3,
    nomination_status: overrides?.nomination_status ?? 'open',
    candidates: [],
  };
}

export function stripElectionCommentFromZh(text?: string | null): string {
  return extractElectionAgendaMeta(text).cleanDescriptionZh.replace(/\s+$/u, '').trim();
}

/**
 * Parse election meta trailing block; strips one well-formed occurrence (same heuristic as migration).
 */
export function extractElectionAgendaMeta(descriptionZh: string | null | undefined): {
  cleanDescriptionZh: string;
  meta: ElectionAgendaMetaV1 | null;
} {
  const s = descriptionZh ?? '';
  const i = s.indexOf(ELECTION_AGENDA_MARKER);
  if (i < 0) return { cleanDescriptionZh: s.replace(/\s+$/u, '').trimEnd(), meta: null };

  const afterMarker = i + ELECTION_AGENDA_MARKER.length;
  let j = afterMarker;
  while (j < s.length && (s[j] === ' ' || s[j] === '\t' || s[j] === '\r')) j++;
  if (s[j] === '\n') j++;

  const endRel = s.indexOf('\n-->', j);
  if (endRel < 0) return { cleanDescriptionZh: s.replace(/\s+$/u, '').trimEnd(), meta: null };

  const raw = s.slice(j, endRel).trim();
  let meta: ElectionAgendaMetaV1 | null = null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    meta = coerceElectionMeta(o);
  } catch {
    /* ignore */
  }
  const clean = `${s.slice(0, i)}${s.slice(endRel + '\n-->'.length)}`.replace(/\s+$/u, '').trimEnd();
  return { cleanDescriptionZh: clean, meta };
}

export function finalizeElectionMeta(m: ElectionAgendaMetaV1): ElectionAgendaMetaV1 {
  const r = coerceElectionMeta({ ...(m as object), v: 1, agenda_type: 'council_election' } as ElectionAgendaMetaV1);
  return r ?? defaultElectionMeta({ candidates: Array.isArray(m?.candidates) ? m.candidates : [] });
}

/** Replace existing election block at end-of-field (or embed new). */
export function embedElectionAgendaMeta(visibleZh: string | null | undefined, meta: ElectionAgendaMetaV1): string {
  const base = stripElectionCommentFromZh(visibleZh ?? '').replace(/\s+$/u, '');
  const safe = finalizeElectionMeta(meta);
  const block = `${ELECTION_AGENDA_MARKER}\n${JSON.stringify(safe)}\n-->`;
  return base ? `${base}\n\n${block}` : block;
}

/** Safe display: user-visible portion of `description_zh` (meta comment removed). */
export function displayAgendaZhWithoutElection(descriptionZh?: string | null): string {
  return stripElectionCommentFromZh(descriptionZh ?? '');
}

function coerceElectionMeta(o: Partial<ElectionAgendaMetaV1> | Record<string, unknown>): ElectionAgendaMetaV1 | null {
  if (!o || (o as ElectionAgendaMetaV1).v !== 1 || (o as ElectionAgendaMetaV1).agenda_type !== 'council_election')
    return null;
  const seats = Math.max(1, Math.floor(Number((o as ElectionAgendaMetaV1).seats) || 1));
  const maxChoices = Math.max(1, Math.floor(Number((o as ElectionAgendaMetaV1).max_choices_per_unit) || 1));
  const allow =
    typeof (o as ElectionAgendaMetaV1).allow_self_nomination === 'boolean'
      ? (o as ElectionAgendaMetaV1).allow_self_nomination
      : true;
  const nomination_status =
    typeof (o as ElectionAgendaMetaV1).nomination_status === 'string'
      ? (o as ElectionAgendaMetaV1).nomination_status
      : 'open';
  const rawCands = Array.isArray((o as ElectionAgendaMetaV1).candidates) ? (o as ElectionAgendaMetaV1).candidates : [];
  const candidates: ElectionCandidateDraft[] = [];
  for (const c of rawCands as unknown[]) {
    if (!c || typeof c !== 'object') continue;
    const r = c as Record<string, unknown>;
    const id = String(r.id ?? '').trim();
    if (!id) continue;
    candidates.push({
      id,
      name: String(r.name ?? ''),
      unit_no: r.unit_no != null ? String(r.unit_no) : '',
      statement: r.statement != null ? String(r.statement) : '',
      nominated_by: r.nominated_by != null ? String(r.nominated_by) : '',
      accepted:
        typeof r.accepted === 'boolean'
          ? r.accepted
          : String(r.accepted ?? '').toLowerCase() === 'true' || String(r.accepted ?? '') === '1',
      created_at: r.created_at != null ? String(r.created_at) : new Date().toISOString(),
    });
  }

  return {
    v: 1,
    agenda_type: 'council_election',
    seats,
    allow_self_nomination: allow,
    max_choices_per_unit: maxChoices,
    nomination_status,
    candidates,
  };
}
