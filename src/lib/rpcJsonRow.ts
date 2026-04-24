/** Shared helpers for PostgREST `RETURNS jsonb` RPC payloads (single object or one-element array). */

export function firstRpcJsonRow(data: unknown): Record<string, unknown> | null {
  if (data == null) return null;
  if (Array.isArray(data)) {
    const el = data[0];
    if (el != null && typeof el === 'object' && !Array.isArray(el)) return el as Record<string, unknown>;
    return null;
  }
  if (typeof data === 'object') return data as Record<string, unknown>;
  return null;
}

export function joinRpcSucceeded(data: unknown): boolean {
  const row = firstRpcJsonRow(data);
  return row?.ok === true;
}

export function joinRpcErrorCode(data: unknown): string | undefined {
  const row = firstRpcJsonRow(data);
  if (row?.ok === false && row.kind != null) return String(row.kind);
  return row?.error != null ? String(row.error) : undefined;
}
