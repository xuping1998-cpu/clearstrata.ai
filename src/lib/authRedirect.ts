/**
 * Origin used in Supabase `redirectTo` for auth email links (password recovery, etc.).
 * - Prefer `VITE_AUTH_REDIRECT_ORIGIN` when the app is opened via a different host than the API
 *   (e.g. preview URL vs production Site URL in Supabase).
 * - Otherwise use the current browser origin (local dev and normal deploys).
 */
export function getAuthRedirectOrigin(): string {
  const fromEnv = typeof import.meta !== 'undefined' ? import.meta.env.VITE_AUTH_REDIRECT_ORIGIN : undefined;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/$/, '');
  }
  return '';
}

/** Full URL for password recovery (must match Supabase redirect allow list). */
export function getPasswordRecoveryRedirectTo(): string {
  const base = getAuthRedirectOrigin();
  return `${base}/reset-password`;
}
