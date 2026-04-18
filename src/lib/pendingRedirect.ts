const KEY = 'pending_post_login_redirect';

/** Only same-origin path redirects (pathname + search + hash), no open redirects. */
export function isSafeInternalRedirect(url: string): boolean {
  if (!url.startsWith('/') || url.startsWith('//')) return false;
  if (url.includes('://')) return false;
  return true;
}

export function savePendingRedirect(url: string): void {
  try {
    sessionStorage.setItem(KEY, url);
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadPendingRedirect(): string | null {
  try {
    return sessionStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function clearPendingRedirect(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Read and clear pending URL in one step. Returns null if missing or unsafe.
 */
export function consumePendingRedirect(): string | null {
  const raw = loadPendingRedirect();
  clearPendingRedirect();
  if (!raw || !isSafeInternalRedirect(raw)) return null;
  return raw;
}

/** `/meetings/:meetingId` only (excludes `new`, `create`, and paths with extra segments like `/edit`). */
export function isMeetingDetailDeepLink(pathname: string): boolean {
  const m = pathname.match(/^\/meetings\/([^/]+)$/);
  if (!m) return false;
  const seg = m[1];
  if (seg === 'new' || seg === 'create') return false;
  return true;
}
