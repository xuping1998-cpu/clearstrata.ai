/**
 * List/detail display: some deployments omit legacy columns (e.g. scheduled_date).
 * Prefer scheduled_date when present; otherwise fall back to created_at.
 */
export function meetingTimeIso(row: {
  scheduled_date?: string | null;
  created_at?: string | null;
}): string {
  const s = row.scheduled_date;
  const c = row.created_at;
  if (s != null && String(s).trim() !== '') return String(s);
  if (c != null && String(c).trim() !== '') return String(c);
  return '';
}
