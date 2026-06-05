const APP_BASE_DEFAULT = 'https://app.clearstrata.ai';

const MARKETING_HOSTS = new Set(['clearstrata.ai', 'www.clearstrata.ai']);

/**
 * Public app origin for invite QR / deep links.
 * Never use marketing www/clearstrata.ai — always app.clearstrata.ai unless localhost/preview.
 */
export function getAppPublicOrigin(): string {
  const fromEnv =
    typeof import.meta !== 'undefined' ? import.meta.env.VITE_APP_BASE_URL : undefined;
  if (typeof fromEnv === 'string' && fromEnv.trim()) {
    return fromEnv.trim().replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    try {
      const host = new URL(window.location.origin).hostname;
      if (MARKETING_HOSTS.has(host)) {
        return APP_BASE_DEFAULT;
      }
      return window.location.origin.replace(/\/$/, '');
    } catch {
      return APP_BASE_DEFAULT;
    }
  }

  return APP_BASE_DEFAULT;
}
