/** 首页「进入物业」填写的资料，登录后在 join-request 页预填并提交（衔接白名单 / auto-approve） */

const STORAGE_KEY = 'clearstrata_property_entry_v1';

export type PropertyEntryDraft = {
  fullName: string;
  email: string;
  strataPlan: string;
  unitNumber: string;
  propertyId: string;
  propertyCode: string;
  savedAt: string;
};

export function savePropertyEntryDraft(input: Omit<PropertyEntryDraft, 'savedAt'>): void {
  const payload: PropertyEntryDraft = {
    ...input,
    fullName: input.fullName.trim(),
    email: input.email.trim().toLowerCase(),
    strataPlan: input.strataPlan.trim(),
    unitNumber: input.unitNumber.trim(),
    propertyId: input.propertyId.trim(),
    propertyCode: input.propertyCode.trim(),
    savedAt: new Date().toISOString(),
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
