/**
 * Sanitize OCR / invoice JSON payloads before Supabase insert / update.
 *
 * Postgres rejects NUL (\u0000) inside `text` and `jsonb` with:
 *   code:    22P05
 *   message: unsupported Unicode escape sequence
 *   detail:  \u0000 cannot be converted to text
 *
 * Unpaired UTF-16 surrogates also produce invalid \uXXXX escapes on the wire
 * and trigger the same class of error in strict JSON / jsonb paths.
 *
 * All free-form strings (file_name, vendor_name, invoice_number, notes,
 * raw OCR text, structured OCR JSON, ai_extracted_data, skip excerpts, …)
 * MUST flow through `sanitizeDbText` / `deepSanitizeJsonStrings` before
 * leaving the client.
 */

/** Replace unpaired UTF-16 surrogates with U+FFFD. */
export function stripUnpairedSurrogates(s: string): string {
  return s.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/gu, '\uFFFD');
}

/**
 * Unified text sanitizer for any string sent to Supabase as `text` or stored
 * inside `jsonb`. Strips:
 *  - NUL bytes (\u0000 / \x00) — Postgres 22P05
 *  - C0 control chars except tab/newline/carriage return — invalid in jsonb strings
 *  - DEL (U+007F)
 *  - Unpaired UTF-16 surrogates
 */
export function sanitizeDbText(input: string): string {
  if (typeof input !== 'string' || input.length === 0) return input;
  const noSurrogates = stripUnpairedSurrogates(input);
  // eslint-disable-next-line no-control-regex
  return noSurrogates.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export function deepSanitizeJsonStrings<T>(v: T): T {
  if (v == null) return v;
  if (typeof v === 'string') return sanitizeDbText(v) as T;
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
