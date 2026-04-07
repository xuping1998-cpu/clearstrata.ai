import type { AuthError } from '@supabase/supabase-js';

/**
 * Map Supabase / network errors to user-facing Chinese (primary) or English.
 */
export function getAuthErrorMessage(error: unknown, lang: 'zh' | 'en' = 'zh'): string {
  const zh = (s: string) => s;
  const pick = (z: string, e: string) => (lang === 'zh' ? z : e);

  if (error == null) {
    return pick(zh('发生未知错误，请重试'), 'Something went wrong. Please try again.');
  }

  if (typeof error === 'object' && error !== null && 'message' in error) {
    const msg = String((error as { message: unknown }).message ?? '').trim();
    const lower = msg.toLowerCase();

    if (!msg) {
      return pick(zh('发生未知错误，请重试'), 'Something went wrong. Please try again.');
    }

    // Supabase Auth
    if (lower.includes('invalid login credentials') || lower.includes('invalid_credentials')) {
      return pick(zh('邮箱或密码错误，请重试'), 'Incorrect email or password. Please try again.');
    }
    if (lower.includes('email not confirmed') || lower.includes('email_not_confirmed')) {
      return pick(zh('邮箱尚未验证，请先查收验证邮件'), 'Please confirm your email before signing in.');
    }
    if (lower.includes('too many requests') || lower.includes('over_email_send_rate_limit')) {
      return pick(zh('操作过于频繁，请稍后再试'), 'Too many attempts. Please try again later.');
    }
    if (lower.includes('user already registered') || lower.includes('already registered')) {
      return pick(zh('该邮箱已注册'), 'This email is already registered.');
    }
    if (lower.includes('password') && lower.includes('least')) {
      return pick(zh('密码不符合要求，请按要求设置'), 'Password does not meet requirements.');
    }
    if (lower.includes('jwt') || lower.includes('expired') || lower.includes('session')) {
      return pick(zh('登录已过期或无效，请重新登录或再次申请重置邮件'), 'Session expired or invalid. Please sign in again or request a new reset link.');
    }

    const auth = error as Partial<AuthError>;
    if (auth.code === 'invalid_credentials') {
      return pick(zh('邮箱或密码错误，请重试'), 'Incorrect email or password. Please try again.');
    }
    if (auth.code === 'email_not_confirmed') {
      return pick(zh('邮箱尚未验证，请先查收验证邮件'), 'Please confirm your email before signing in.');
    }

    if (/[\u4e00-\u9fff]/.test(msg)) return msg;
    return pick(zh('操作失败，请重试'), msg);
  }

  if (error instanceof Error) {
    const m = error.message;
    if (/[\u4e00-\u9fff]/.test(m)) return m;
    return pick(zh('操作失败，请重试'), m);
  }

  return pick(zh('操作失败，请重试'), String(error));
}
