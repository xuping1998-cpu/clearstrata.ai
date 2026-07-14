/**
 * RC-004 — Canonical CDS page state model.
 * Presentation projection only; does not alter data loading or workflow logic.
 */

export type PageStateKind =
  | 'loading'
  | 'refreshing'
  | 'success'
  | 'empty'
  | 'partial'
  | 'warning'
  | 'error'
  | 'permission'
  | 'offline'
  | 'archived';

export type StateMessage = {
  en: string;
  zh: string;
};

export type PageStateAction = {
  label: StateMessage;
  onClick?: () => void;
  to?: string;
  href?: string;
};

export type PartialFailure = {
  id: string;
  message: StateMessage;
};

export type PageState = {
  kind: PageStateKind;
  title?: StateMessage;
  description?: StateMessage;
  reason?: StateMessage;
  action?: PageStateAction;
  partialFailures?: PartialFailure[];
};

export type PageStateInput = {
  /** Prior successful content is on screen */
  hasContent: boolean;
  loading?: boolean;
  refreshing?: boolean;
  permissionDenied?: boolean;
  offline?: boolean;
  error?: string | null;
  /** Query succeeded with zero records */
  empty?: boolean;
  archived?: boolean;
  partialFailures?: PartialFailure[];
  warning?: boolean;
};

const UUID_PATTERN =
  /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/gi;

/** Resolve user-facing text from bilingual or plain string. */
export function stateText(value: StateMessage | string, langEn: boolean): string {
  if (typeof value === 'string') return value;
  return langEn ? value.en : value.zh;
}

/** Strip stack traces, UUIDs, and low-level errors from user-visible copy. */
export function sanitizeUserErrorMessage(
  raw: string | null | undefined,
  fallback: StateMessage,
): StateMessage {
  if (!raw?.trim()) return fallback;
  const trimmed = raw.trim();
  if (
    trimmed.length > 180 ||
    trimmed.includes('\n') ||
    trimmed.includes(' at ') ||
    trimmed.includes('PGRST') ||
    trimmed.includes('JWT') ||
    UUID_PATTERN.test(trimmed)
  ) {
    return fallback;
  }
  UUID_PATTERN.lastIndex = 0;
  return { en: trimmed, zh: trimmed };
}

/**
 * Engineering rules:
 * - loading without content → loading (never empty)
 * - error without content → error (never empty)
 * - permission → permission (never error)
 * - refreshing with content → refreshing (preserve children)
 * - partial failures with content → partial
 */
export function resolvePrimaryPageState(input: PageStateInput): PageStateKind {
  if (input.permissionDenied) return 'permission';
  if (input.offline && !input.hasContent) return 'offline';
  if (input.loading && !input.hasContent) return 'loading';
  if (input.refreshing && input.hasContent) return 'refreshing';
  if (input.error && !input.hasContent) return 'error';
  if (input.partialFailures && input.partialFailures.length > 0 && input.hasContent) {
    return 'partial';
  }
  if (input.empty && !input.loading && !input.error) return 'empty';
  if (input.archived && input.hasContent) return 'archived';
  if (input.warning && input.hasContent) return 'warning';
  return 'success';
}

export function shouldBlockContent(state: PageStateKind): boolean {
  return state === 'loading' || state === 'permission' || state === 'offline' || state === 'error' || state === 'empty';
}

export const DEFAULT_ERROR: StateMessage = {
  en: 'Something went wrong. Please try again.',
  zh: '出现问题，请稍后重试。',
};

export const DEFAULT_OFFLINE: StateMessage = {
  en: 'Network unavailable. Showing the most recently synced data when available.',
  zh: '网络不可用。将尽可能显示最近同步的数据。',
};

export const DEFAULT_PERMISSION: StateMessage = {
  en: 'You do not have permission to perform this action.',
  zh: '您没有权限执行此操作。',
};

export const DEFAULT_ARCHIVED: StateMessage = {
  en: 'This information is archived and read-only.',
  zh: '此信息已归档，仅供阅读。',
};
