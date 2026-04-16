export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled';

export type TrialState = 'active' | 'expiring' | 'expired' | 'inactive';

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/** trial_ends_at 存在且当前时间未超过则返回 true */
export function isTrialActive(trialEndsAt?: string | null): boolean {
  const end = parseDate(trialEndsAt);
  if (!end) return false;
  return Date.now() < end.getTime();
}

/**
 * 返回剩余天数（向上取整）
 * - 若已过期或无日期：0
 */
export function getTrialDaysRemaining(trialEndsAt?: string | null): number {
  const end = parseDate(trialEndsAt);
  if (!end) return 0;
  const ms = end.getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

/** 剩余天数 <= days 返回 true */
export function isTrialExpiringSoon(trialEndsAt?: string | null, days = 7): boolean {
  const left = getTrialDaysRemaining(trialEndsAt);
  if (left <= 0) return false;
  return left <= Math.max(0, days);
}

/**
 * Trial state helper for UI:
 * - subscription_status !== 'trial' -> inactive
 * - daysRemaining > 7 -> active
 * - 1..7 -> expiring
 * - 0 -> expired
 */
export function getTrialState(
  trialEndsAt?: string | null,
  subscriptionStatus?: string | null,
  expiringDays = 7,
): TrialState {
  if (String(subscriptionStatus ?? '').toLowerCase() !== 'trial') return 'inactive';
  const left = getTrialDaysRemaining(trialEndsAt);
  if (left <= 0) return 'expired';
  if (left <= Math.max(0, expiringDays)) return 'expiring';
  return 'active';
}

export function formatTrialEndDate(trialEndsAt?: string | null): string {
  const end = parseDate(trialEndsAt);
  if (!end) return '';
  try {
    return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(end);
  } catch {
    return end.toISOString().slice(0, 10);
  }
}

