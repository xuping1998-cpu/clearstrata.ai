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

export function isGeneratedArchiveSnapshot(titleEn: string | null | undefined): boolean {
  const t = titleEn?.trim() ?? '';
  return t.startsWith('03 ') || t.startsWith('04 ') || t.startsWith('05 ');
}

export const FINALIZED_MINUTES_TITLE_EN = '06 Meeting Minutes';

const MINUTES_VERSION_TITLE_RE = /^06 Meeting Minutes(?: v(\d+))?$/;

/** Extract version from slot 06 title; legacy unversioned title = v1. */
export function extractMeetingMinutesVersion(titleEn: string | null | undefined): number | null {
  const t = titleEn?.trim() ?? '';
  if (!t) return null;
  const m = t.match(MINUTES_VERSION_TITLE_RE);
  if (!m) return null;
  if (!m[1]) return 1;
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

/** All minutes versions for a meeting, newest first. */
export function listMeetingMinutesDocuments(
  rows: MeetingArchiveDocumentRow[],
): MeetingArchiveDocumentRow[] {
  return rows.filter((d) => isMeetingMinutesDocument(d.title_en)).sort(compareMeetingMinutesDocuments);
}

/** @deprecated use findLatestMeetingMinutesDocument */
export function findFinalizedMinutesDocument(
  rows: MeetingArchiveDocumentRow[],
): MeetingArchiveDocumentRow | undefined {
  return findLatestMeetingMinutesDocument(rows);
}

/** Archive folder slots 03–06 — excluded from 02 supporting documents only. */
export function isArchiveFolderDocument(titleEn: string | null | undefined): boolean {
  const t = titleEn?.trim() ?? '';
  return (
    t.startsWith('03 ') ||
    t.startsWith('04 ') ||
    t.startsWith('05 ') ||
    isFinalizedMeetingMinutesDocument(t)
  );
}

/** Real uploads only — excludes auto-generated archive folder documents. */
export function filterSupportingDocumentsOnly<T extends { title_en?: string | null }>(
  rows: T[],
): T[] {
  return rows.filter((d) => !isArchiveFolderDocument(d.title_en));
}

/** Display title for generated snapshot rows — avoids duplicated slot prefix in UI. */
export function displayArchiveSnapshotTitle(titleEn: string | null | undefined): string {
  const t = titleEn?.trim() ?? '';
  const m = t.match(/^(0[345])\s+(.*)$/);
  if (m) return `${m[1]} ${m[2]}`.trim();
  return t;
}

const GENERATED_AT_LINE = /^Generated at:\s*(.+)$/m;

/** Prettier viewer body — reformats ISO `Generated at:` lines only; storage unchanged. */
export function formatArchiveSnapshotViewerBody(body: string, languageEn: boolean): string {
  if (!body.trim()) return body;
  const locale = languageEn ? 'en-US' : 'zh-CN';
  return body.replace(GENERATED_AT_LINE, (_line, iso: string) => {
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
