import { supabase } from './supabase';
import { isJoinableProperty } from './joinPropertyStatus';

/** Minimal property info for join landing / QR flows. */
export type JoinPropertyBrief = {
  id: string;
  name: string;
  slug: string | null;
  code: string | null;
  status?: string | null;
};

function normalizePropertyRow(row: Record<string, unknown> | null | undefined): JoinPropertyBrief | null {
  if (!row || typeof row.id !== 'string') return null;
  const codeVal = row.code ?? row.property_code;
  return {
    id: row.id,
    name: typeof row.name === 'string' ? row.name : '',
    slug: (row.slug as string | null) ?? null,
    code: typeof codeVal === 'string' ? codeVal : codeVal == null ? null : String(codeVal),
    status: (row.status as string | null) ?? null,
  };
}

/**
 * Resolve `code` / `slug` against `properties` (same rules as JoinRequestPage QR path).
 */
export async function resolveJoinCodeFromProperties(joinCode: string): Promise<
  | { ok: true; property: JoinPropertyBrief }
  | { ok: false; reason: 'invalid' | 'expired' }
> {
  const trimmed = joinCode.trim();
  if (!trimmed) return { ok: false, reason: 'invalid' };

  const { data, error } = await supabase.from('properties').select('*');
  if (error) return { ok: false, reason: 'invalid' };

  const rows = Array.isArray(data) ? data : [];
  const normalized = trimmed.toLowerCase();
  const matched = rows.find((raw) => {
    const row = raw as Record<string, unknown>;
    const c = String(row.code ?? row.property_code ?? '').trim().toLowerCase();
    const s = String(row.slug ?? '').trim().toLowerCase();
    return c === normalized || s === normalized;
  });

  if (!matched) return { ok: false, reason: 'invalid' };

  const prop = normalizePropertyRow(matched as Record<string, unknown>);
  if (!prop) return { ok: false, reason: 'invalid' };

  if (!isJoinableProperty(prop.status)) {
    return { ok: false, reason: 'expired' };
  }

  return { ok: true, property: prop };
}
