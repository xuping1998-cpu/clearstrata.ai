/** 游客体验（Demo）填写的姓名/邮箱，供「创建物业」等步骤预填，不写入真实物业成员 */

const STORAGE_KEY = 'clearstrata_guest_experience_v1';

export type GuestExperienceDraft = {
  name: string;
  email: string;
  savedAt: string;
};

export function saveGuestExperienceDraft(input: { name: string; email: string }): void {
  const payload: GuestExperienceDraft = {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    savedAt: new Date().toISOString(),
  };
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore */
  }
}

export function readGuestExperienceDraft(): GuestExperienceDraft | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as GuestExperienceDraft;
    if (!o || typeof o.name !== 'string' || typeof o.email !== 'string') return null;
    return o;
  } catch {
    return null;
  }
}

export function clearGuestExperienceDraft(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
