/** Compare property UUIDs from DB / localStorage (case may differ). */
export function samePropertyId(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  if (a == null || b == null) return false;
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}
