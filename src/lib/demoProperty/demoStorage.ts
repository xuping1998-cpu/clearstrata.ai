/** sessionStorage：从真实 join 入口带入的邀请码，用于演示 seed 与「转真实楼」跳转 */
export const DEMO_INVITE_CODE_STORAGE_KEY = 'clearstrata_demo_property_invite_code';

/** localStorage：匿名访客稳定 id，使不同访客 demo 数据不同、同一访客刷新一致 */
export const DEMO_VISITOR_ID_STORAGE_KEY = 'clearstrata_demo_visitor_id';

export function demoUnitDraftKey(inviteCode: string): string {
  return `clearstrata_demo_unit_draft_${inviteCode}`;
}

/** 演示楼无房号草稿时，跳转真实 join 使用的默认房号（仅前端 session，不写库） */
export const DEMO_SUGGESTED_DEFAULT_UNIT = '304';

/**
 * 解析跳转 /join 时使用的房号：优先已有草稿；否则写入默认房号到 session 并返回。
 */
export function resolveJoinPrefillUnit(inviteCode: string, existingDraft: string | null | undefined): string {
  const trimmed = existingDraft?.trim();
  if (trimmed) return trimmed;
  if (typeof window === 'undefined') return DEMO_SUGGESTED_DEFAULT_UNIT;
  try {
    sessionStorage.setItem(demoUnitDraftKey(inviteCode), DEMO_SUGGESTED_DEFAULT_UNIT);
  } catch {
    /* ignore */
  }
  return DEMO_SUGGESTED_DEFAULT_UNIT;
}

export function getOrCreateVisitorId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    let id = localStorage.getItem(DEMO_VISITOR_ID_STORAGE_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `v-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      localStorage.setItem(DEMO_VISITOR_ID_STORAGE_KEY, id);
    }
    return id;
  } catch {
    return 'visitor-fallback';
  }
}

export function getStoredDemoInviteCode(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return sessionStorage.getItem(DEMO_INVITE_CODE_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredDemoInviteCode(code: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (code) sessionStorage.setItem(DEMO_INVITE_CODE_STORAGE_KEY, code);
    else sessionStorage.removeItem(DEMO_INVITE_CODE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * 组合用于 generateDemoData 的 seed。
 * - 有邀请码：同楼不同访客仍可有差异（visitor）
 * - 成交页：用 propertyId + unit + visitor
 */
export function buildDemoGenerationSeed(opts?: { urlSeed?: string | null; propertyId?: string; unit?: string }): string {
  const visitor = getOrCreateVisitorId();
  const urlSeed = opts?.urlSeed?.trim();
  if (urlSeed) return `url:${urlSeed}|v:${visitor}`;

  const pid = opts?.propertyId?.trim();
  const unit = opts?.unit?.trim();
  if (pid || unit) return `overview:${pid ?? ''}|u:${unit ?? ''}|v:${visitor}`;

  const inv = getStoredDemoInviteCode();
  if (inv) return `invite:${inv}|v:${visitor}`;
  return `visitor:${visitor}`;
}
