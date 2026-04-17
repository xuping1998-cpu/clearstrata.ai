/** 首页「进入物业」填写的资料，登录后在 join-request 页预填并提交（衔接白名单 / auto-approve） */

const STORAGE_KEY = 'clearstrata_property_entry_v1';

export type PropertyEntryDraft = {
  fullName: string;
  email: string;
  /** 可选；首页「进入物业」已不再收集，旧草稿可能仍有值 */
  strataPlan?: string;
  unitNumber: string;
  propertyId: string;
  propertyCode: string;
  savedAt: string;
};

export function savePropertyEntryDraft(input: Omit<PropertyEntryDraft, 'savedAt'>): void {
  const sp = input.strataPlan?.trim();
  const payload: PropertyEntryDraft = {
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    unitNumber: input.unitNumber.trim(),
    propertyId: input.propertyId.trim(),
    propertyCode: input.propertyCode.trim(),
    savedAt: new Date().toISOString(),
    ...(sp ? { strataPlan: sp } : {}),
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readPropertyEntryDraft(): PropertyEntryDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as PropertyEntryDraft;
    if (!o || typeof o.propertyId !== 'string') return null;
    return o;
  } catch {
    return null;
  }
}

export function clearPropertyEntryDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
