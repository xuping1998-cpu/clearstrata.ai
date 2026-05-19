/**
 * Sanitize OCR / invoice JSON payloads before Supabase jsonb insert.
 * Unpaired UTF-16 surrogates can produce invalid \\u escapes on the wire and
 * trigger "unsupported Unicode escape sequence" in strict JSON / PostgreSQL jsonb.
 */

/** Replace unpaired UTF-16 surrogates with U+FFFD. */
export function stripUnpairedSurrogates(s: string): string {
  return s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/gu, '\uFFFD');
}

export function deepSanitizeJsonStrings<T>(v: T): T {
  if (v == null) return v;
  if (typeof v === 'string') return stripUnpairedSurrogates(v) as T;
  if (typeof v === 'number' || typeof v === 'boolean') return v;
  if (Array.isArray(v)) return v.map((x) => deepSanitizeJsonStrings(x)) as T;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(o)) {
      out[k] = deepSanitizeJsonStrings(val);
    }
    return out as T;
  }
  return v;
}
