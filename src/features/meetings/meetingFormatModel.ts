import type { MeetingFormat, MeetingRow } from './api';

export type MeetingFormatUi = 'in_person' | 'live_remote' | 'hybrid' | 'written_remote';

const META_START = '<!--clearstrata-written-remote\n';
const META_END = '\n-->';

export type WrittenRemoteMetaV1 = { v: 1; discussion_closes_at: string };

export function extractWrittenRemoteMeta(descriptionZh: string | null | undefined): {
  cleanDescriptionZh: string;
  meta: WrittenRemoteMetaV1 | null;
} {
  const s = descriptionZh ?? '';
  const i = s.lastIndexOf(META_START);
  if (i < 0) return { cleanDescriptionZh: s, meta: null };
  const end = s.indexOf(META_END, i + META_START.length);
  if (end < 0) return { cleanDescriptionZh: s, meta: null };
  const raw = s.slice(i + META_START.length, end).trim();
  let meta: WrittenRemoteMetaV1 | null = null;
  try {
    const o = JSON.parse(raw) as WrittenRemoteMetaV1;
    if (o && o.v === 1 && typeof o.discussion_closes_at === 'string') meta = o;
  } catch {
    /* ignore */
  }
  const clean = `${s.slice(0, i)}${s.slice(end + META_END.length)}`.replace(/\s+$/u, '');
  return { cleanDescriptionZh: clean, meta };
}

export function embedWrittenRemoteMeta(cleanDescriptionZh: string | null | undefined, discussionClosesIso: string): string {
  const base = (cleanDescriptionZh ?? '').replace(/\s+$/u, '');
  const payload: WrittenRemoteMetaV1 = { v: 1, discussion_closes_at: discussionClosesIso };
  const block = `${META_START}${JSON.stringify(payload)}${META_END}`;
  return base ? `${base}\n\n${block}` : block;
}

export function meetingFormatUiFromRow(m: Pick<MeetingRow, 'meeting_format' | 'description_zh'>): MeetingFormatUi {
  const fmt = m.meeting_format;
  if (fmt === 'in_person') return 'in_person';
  if (fmt === 'electronic') return 'live_remote';
  if (fmt === 'hybrid') {
    const { meta } = extractWrittenRemoteMeta(m.description_zh);
    if (meta) return 'written_remote';
    return 'hybrid';
  }
  return 'hybrid';
}

export function dbFormatFromUi(ui: MeetingFormatUi): MeetingFormat {
  if (ui === 'in_person') return 'in_person';
  if (ui === 'live_remote') return 'electronic';
  return 'hybrid';
}

export function isWrittenRemoteUi(ui: MeetingFormatUi): boolean {
  return ui === 'written_remote';
}

/** Discussion window for written-remote council meetings (Model Refactor). */
export function councilWrittenRemoteWindows(m: MeetingRow): {
  discussionOpens: string | null;
  discussionCloses: string | null;
} {
  const ui = meetingFormatUiFromRow(m);
  if (!isWrittenRemoteUi(ui)) {
    return { discussionOpens: null, discussionCloses: null };
  }
  const { meta } = extractWrittenRemoteMeta(m.description_zh);
  return {
    discussionOpens: m.scheduled_at?.trim() ? m.scheduled_at : null,
    discussionCloses: meta?.discussion_closes_at?.trim() ? meta.discussion_closes_at : null,
  };
}

/** Fallback voting window from `meetings` row when `owner_vote_meetings` is absent. */
export function councilMeetingVotingWindowFallback(m: MeetingRow): {
  votingOpens: string | null;
  votingCloses: string | null;
} {
  const vo = m.voting_open_at?.trim() ? m.voting_open_at : null;
  const vc = m.voting_close_at?.trim() ? m.voting_close_at : null;
  if (vo || vc) return { votingOpens: vo, votingCloses: vc };
  const w = councilWrittenRemoteWindows(m);
  if (w.discussionOpens || w.discussionCloses) {
    return {
      votingOpens: w.discussionOpens ?? w.discussionCloses,
      votingCloses: w.discussionCloses ?? w.discussionOpens,
    };
  }
  return { votingOpens: null, votingCloses: null };
}
