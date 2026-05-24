import { supabase } from '@/lib/supabase';

/** Subset of `meeting_documents` rows — same source as MeetingDocumentsSection. */
export type MeetingSupportingDocumentRow = {
  id: string;
  title_en: string | null;
  title_zh: string | null;
  document_type: string;
  document_url: string;
  mime_type: string | null;
};

/** Full row for meeting archive folder (00–06) including generated snapshots. */
export type MeetingArchiveDocumentRow = {
  id: string;
  meeting_id: string;
  property_id: string;
  document_type: string;
  title_en: string | null;
  title_zh: string | null;
  document_url: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  uploaded_at: string | null;
  uploaded_by: string | null;
};

const GENERATED_SNAPSHOT_TITLES = new Set([
  '03 Discussion Record',
  '04 Voting Record',
  '05 Resolution Results',
]);

export function isGeneratedArchiveSnapshot(
  titleEn: string | null | undefined,
  titleZh?: string | null | undefined,
): boolean {
  const check = (raw: string | null | undefined): boolean => {
    const t = raw?.trim() ?? '';
    if (!t) return false;
    if (GENERATED_SNAPSHOT_TITLES.has(t)) return true;
    return t.startsWith('03 ') || t.startsWith('04 ') || t.startsWith('05 ');
  };
  return check(titleEn) || check(titleZh);
}

export const FINALIZED_MINUTES_TITLE_EN = '06 Meeting Minutes';

const MINUTES_VERSION_TITLE_VN_RE = /^06 Meeting Minutes v(\d+)$/;

/** Extract version from slot 06 title; legacy unversioned title = v1. */
export function extractMeetingMinutesVersion(titleEn: string | null | undefined): number | null {
  const t = titleEn?.trim() ?? '';
  if (!t) return null;
  if (t === FINALIZED_MINUTES_TITLE_EN) return 1;
  const m = t.match(MINUTES_VERSION_TITLE_VN_RE);
  if (!m) return null;
  const v = Number.parseInt(m[1], 10);
  return Number.isFinite(v) && v > 0 ? v : null;
}

export function isMeetingMinutesDocument(titleEn: string | null | undefined): boolean {
  return extractMeetingMinutesVersion(titleEn) !== null;
}

/** @deprecated use isMeetingMinutesDocument */
export function isFinalizedMeetingMinutesDocument(titleEn: string | null | undefined): boolean {
  return isMeetingMinutesDocument(titleEn);
}

function compareMeetingMinutesDocuments<T extends { title_en?: string | null; uploaded_at?: string | null }>(
  a: T,
  b: T,
): number {
  const va = extractMeetingMinutesVersion(a.title_en) ?? 0;
  const vb = extractMeetingMinutesVersion(b.title_en) ?? 0;
  if (vb !== va) return vb - va;
  const ta = a.uploaded_at ? Date.parse(a.uploaded_at) : 0;
  const tb = b.uploaded_at ? Date.parse(b.uploaded_at) : 0;
  return tb - ta;
}

/** Latest finalized minutes document (highest version). */
export function findLatestMeetingMinutesDocument(
  rows: MeetingArchiveDocumentRow[],
): MeetingArchiveDocumentRow | undefined {
  return rows
    .filter((d) => isMeetingMinutesDocument(d.title_en))
    .sort(compareMeetingMinutesDocuments)[0];
}

/** All finalized minutes documents for a meeting, ascending by version. */
export function listMeetingMinutesDocuments(
  rows: MeetingArchiveDocumentRow[],
): MeetingArchiveDocumentRow[] {
  return rows
    .filter((d) => isMeetingMinutesDocument(d.title_en))
    .sort((a, b) => {
      const va = extractMeetingMinutesVersion(a.title_en) ?? 0;
      const vb = extractMeetingMinutesVersion(b.title_en) ?? 0;
      if (va !== vb) return va - vb;
      const ta = a.uploaded_at ? Date.parse(a.uploaded_at) : 0;
      const tb = b.uploaded_at ? Date.parse(b.uploaded_at) : 0;
      return ta - tb;
    });
}

/** Finalized version numbers only (actual existing versions, ascending; gaps preserved). */
export function listMeetingMinutesFinalizedVersions(rows: MeetingArchiveDocumentRow[]): number[] {
  return listMeetingMinutesDocuments(rows)
    .map((d) => extractMeetingMinutesVersion(d.title_en))
    .filter((v): v is number => v != null);
}

/** @deprecated use findLatestMeetingMinutesDocument */
export function findFinalizedMinutesDocument(
  rows: MeetingArchiveDocumentRow[],
): MeetingArchiveDocumentRow | undefined {
  return findLatestMeetingMinutesDocument(rows);
}

/** Archive folder slots 03–06 — excluded from 02 supporting documents only. */
export function isArchiveFolderDocument(
  doc: { title_en?: string | null; title_zh?: string | null } | string | null | undefined,
): boolean {
  if (typeof doc === 'string' || doc == null) {
    const t = typeof doc === 'string' ? doc : '';
    return isGeneratedArchiveSnapshot(t) || isMeetingMinutesDocument(t);
  }
  return (
    isGeneratedArchiveSnapshot(doc.title_en, doc.title_zh) ||
    isMeetingMinutesDocument(doc.title_en) ||
    isMeetingMinutesDocument(doc.title_zh)
  );
}

/** Real uploads only — excludes auto-generated archive folder documents. */
export function filterSupportingDocumentsOnly<T extends { title_en?: string | null; title_zh?: string | null }>(
  rows: T[],
): T[] {
  return rows.filter((d) => !isArchiveFolderDocument(d));
}

/** Display title for generated snapshot rows — avoids duplicated slot prefix in UI. */
export function displayArchiveSnapshotTitle(titleEn: string | null | undefined): string {
  const t = titleEn?.trim() ?? '';
  const m = t.match(/^(0[345])\s+(.*)$/);
  if (!m) return t;
  let rest = m[2].trim();
  const dup = rest.match(/^(0[345])\s+(.*)$/);
  if (dup && dup[1] === m[1]) {
    rest = dup[2].trim();
  }
  return `${m[1]} ${rest}`.trim();
}

const GENERATED_AT_LINE = /^Generated at:\s*(.+)$/m;

/** Known Chinese structural labels → English (archive viewer labels stay English-only). */
const ARCHIVE_VIEWER_LABEL_REPLACEMENTS: ReadonlyArray<[RegExp, string]> = [
  [/^会议[：:]\s*/gm, 'Meeting: '],
  [/^议程\s*#\s*(\d+)\s*[：:]/gm, 'Agenda #$1:'],
  [/^议程[：:]\s*/gm, 'Agenda: '],
  [/^生成时间[：:]\s*/gm, 'Generated: '],
  [/^生成于[：:]\s*/gm, 'Generated: '],
  [/^决议投票[：:]\s*/gm, 'Resolution votes: '],
  [/^选举投票[：:]\s*/gm, 'Election votes: '],
];

function normalizeArchiveViewerLabels(body: string): string {
  let out = body;
  for (const [pattern, replacement] of ARCHIVE_VIEWER_LABEL_REPLACEMENTS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

/** Prettier viewer body — English structural labels; reformats ISO `Generated at:` lines only. */
export function formatArchiveSnapshotViewerBody(body: string, languageEn: boolean): string {
  if (!body.trim()) return body;
  let out = normalizeArchiveViewerLabels(body);
  const locale = languageEn ? 'en-US' : 'zh-CN';
  out = out.replace(GENERATED_AT_LINE, (_line, iso: string) => {
    const d = new Date(iso.trim());
    if (Number.isNaN(d.getTime())) return `Generated: ${iso.trim()}`;
    const formatted = new Intl.DateTimeFormat(locale, {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(d);
    return `Generated: ${formatted}`;
  });
  return out;
}

export function decodeDataTextUrl(url: string): string {
  const comma = url.indexOf(',');
  if (comma < 0) return '';
  const meta = url.slice(0, comma);
  const data = url.slice(comma + 1);
  if (meta.includes(';base64')) {
    try {
      return new TextDecoder('utf-8').decode(Uint8Array.from(atob(data), (c) => c.charCodeAt(0)));
    } catch {
      return atob(data);
    }
  }
  return decodeURIComponent(data);
}

export async function fetchMeetingSupportingDocuments(
  propertyId: string,
  meetingId: string,
): Promise<{ rows: MeetingSupportingDocumentRow[]; error: Error | null }> {
  const pid = propertyId.trim();
  const mid = meetingId.trim();
  if (!pid || !mid) return { rows: [], error: null };
  const { data, error } = await supabase
    .from('meeting_documents')
    .select('id,title_en,title_zh,document_type,document_url,mime_type')
    .eq('property_id', pid)
    .eq('meeting_id', mid)
    .order('uploaded_at', { ascending: false });
  if (error) return { rows: [], error: new Error(error.message) };
  return {
    rows: filterSupportingDocumentsOnly((data ?? []) as MeetingSupportingDocumentRow[]),
    error: null,
  };
}

export async function fetchMeetingArchiveDocuments(
  propertyId: string,
  meetingId: string,
): Promise<{ rows: MeetingArchiveDocumentRow[]; error: Error | null }> {
  const pid = propertyId.trim();
  const mid = meetingId.trim();
  if (!pid || !mid) return { rows: [], error: null };
  const { data, error } = await supabase
    .from('meeting_documents')
    .select(
      'id,meeting_id,property_id,document_type,title_en,title_zh,document_url,mime_type,file_size_bytes,uploaded_at,uploaded_by',
    )
    .eq('property_id', pid)
    .eq('meeting_id', mid)
    .order('uploaded_at', { ascending: false });
  if (error) return { rows: [], error: new Error(error.message) };
  return { rows: (data ?? []) as MeetingArchiveDocumentRow[], error: null };
}

/** Latest finalized slot 06 minutes document (highest version). */
export async function fetchLatestMeetingMinutesDocument(
  propertyId: string,
  meetingId: string,
): Promise<{ row: MeetingArchiveDocumentRow | null; error: Error | null }> {
  const pid = propertyId.trim();
  const mid = meetingId.trim();
  if (!pid || !mid) return { row: null, error: null };

  const { data, error } = await supabase
    .from('meeting_documents')
    .select(
      'id,meeting_id,property_id,document_type,title_en,title_zh,document_url,mime_type,file_size_bytes,uploaded_at,uploaded_by',
    )
    .eq('property_id', pid)
    .eq('meeting_id', mid)
    .or(`title_en.eq.${FINALIZED_MINUTES_TITLE_EN},title_en.like.06 Meeting Minutes v%`)
    .order('uploaded_at', { ascending: false });

  if (error) return { row: null, error: new Error(error.message) };
  const row = findLatestMeetingMinutesDocument((data ?? []) as MeetingArchiveDocumentRow[]) ?? null;
  return { row, error: null };
}

/** @deprecated use fetchLatestMeetingMinutesDocument */
export async function fetchFinalizedMeetingMinutesDocument(
  propertyId: string,
  meetingId: string,
): Promise<{ row: MeetingArchiveDocumentRow | null; error: Error | null }> {
  return fetchLatestMeetingMinutesDocument(propertyId, meetingId);
}

export type MeetingAgendaNoticeRow = {
  id: string;
  sort_order: number | null;
  title_en: string | null;
  title_zh: string | null;
  description_zh: string | null;
  requires_vote: boolean | null;
};

export async function fetchMeetingAgendaNoticeRows(
  meetingId: string,
): Promise<{ rows: MeetingAgendaNoticeRow[]; error: Error | null }> {
  const mid = meetingId.trim();
  if (!mid) return { rows: [], error: null };
  const { data, error } = await supabase
    .from('meeting_agenda_items')
    .select('id,sort_order,title_en,title_zh,description_zh,requires_vote')
    .eq('meeting_id', mid)
    .order('sort_order', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: true });
  if (error) return { rows: [], error: new Error(error.message) };
  return { rows: (data ?? []) as MeetingAgendaNoticeRow[], error: null };
}

/** Dispatched after silent archive snapshot regenerate (04/05) succeeds. */
export const MEETING_ARCHIVE_SNAPSHOTS_UPDATED_EVENT = 'clearstrata:meeting-archive-snapshots-updated';

export type MeetingArchiveSnapshotSlot = '03' | '04' | '05';

const VOTE_ARCHIVE_REFRESH_SLOTS: MeetingArchiveSnapshotSlot[] = ['04', '05'];

/**
 * Background refresh of archive vote/result snapshots after owner vote submit.
 * Uses existing `generate_meeting_archive_snapshots` RPC; failures are console.warn only.
 */
export async function silentRegenerateMeetingArchiveVoteSnapshots(
  councilMeetingId: string,
): Promise<void> {
  const mid = councilMeetingId.trim();
  if (!mid) return;

  try {
    const { data, error } = await supabase.rpc('generate_meeting_archive_snapshots', {
      p_meeting_id: mid,
      p_slots: VOTE_ARCHIVE_REFRESH_SLOTS,
    });
    if (error) {
      console.warn('[silentRegenerateMeetingArchiveVoteSnapshots]', error.message);
      return;
    }
    const payload = data as { ok?: boolean; error?: string } | null;
    if (payload?.ok === false) {
      console.warn('[silentRegenerateMeetingArchiveVoteSnapshots]', payload.error ?? 'unknown');
      return;
    }
    window.dispatchEvent(
      new CustomEvent(MEETING_ARCHIVE_SNAPSHOTS_UPDATED_EVENT, { detail: { meetingId: mid } }),
    );
  } catch (e) {
    console.warn('[silentRegenerateMeetingArchiveVoteSnapshots]', e);
  }
}
