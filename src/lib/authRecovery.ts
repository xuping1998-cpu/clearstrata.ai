/**
 * Detect Supabase auth callback / recovery payloads in the URL so business logic
 * (property auto-select, join redirects, meeting loads) does not run until the client finishes.
 */

function rawUrlSignals(): string {
  if (typeof window === 'undefined') return '';
  try {
    const h = window.location.hash?.replace(/^#/, '') ?? '';
    const s = window.location.search?.replace(/^\?/, '') ?? '';
    return decodeURIComponent(`${h}&${s}`);
  } catch {
    return `${window.location.hash ?? ''}&${window.location.search ?? ''}`;
  }
}

/** Password reset email link (implicit grant fragment). */
export function urlIndicatesPasswordRecoveryIntent(): boolean {
  const raw = rawUrlSignals();
  return /(^|&)type=recovery(&|$)/i.test(raw) || /type%3[dD]recovery/i.test(window.location?.hash ?? '');
}

/** Any implicit-grant style fragment Supabase may consume (recovery, magic link, etc.). */
export function urlIndicatesSupabaseImplicitGrantFragment(): boolean {
  const h = typeof window !== 'undefined' ? window.location.hash : '';
  return Boolean(h && (h.includes('access_token=') || h.includes('refresh_token=')));
}

/** PKCE / OAuth code exchange in query string. */
export function urlIndicatesSupabasePkceOrOAuthCode(): boolean {
  const s = typeof window !== 'undefined' ? window.location.search : '';
  return /[?&]code=/.test(s);
}

/**
 * When true, defer auto property / join / meeting side effects until the URL is handled
 * or the hash/query no longer carries auth tokens.
 */
export function shouldDeferAutoPropertyRedirects(): boolean {
  return (
    urlIndicatesPasswordRecoveryIntent() ||
    urlIndicatesSupabaseImplicitGrantFragment() ||
    urlIndicatesSupabasePkceOrOAuthCode()
  );
}

/**
 * Narrow URL hints for getSession() unlock alongside PASSWORD_RECOVERY — not an arbitrary session.
 * - Implicit recovery fragment (`type=recovery`)
 * - PKCE-style `?code=` on the dedicated reset page only
 */
export function urlSupportsPasswordRecoveryGetSessionFallback(): boolean {
  if (typeof window === 'undefined') return false;
  if (urlIndicatesPasswordRecoveryIntent()) return true;
  if (window.location.pathname !== '/reset-password') return false;
  return /[?&]code=/.test(window.location.search || '');
}
