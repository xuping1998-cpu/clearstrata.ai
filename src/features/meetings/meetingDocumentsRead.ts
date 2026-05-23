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
  return { rows: (data ?? []) as MeetingSupportingDocumentRow[], error: null };
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
