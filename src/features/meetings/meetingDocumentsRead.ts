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

/** Real uploads only — excludes auto-generated 03/04/05 archive snapshots. */
export function filterSupportingDocumentsOnly<T extends { title_en?: string | null }>(
  rows: T[],
): T[] {
  return rows.filter((d) => !isGeneratedArchiveSnapshot(d.title_en));
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
