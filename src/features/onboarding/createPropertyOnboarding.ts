import { supabase } from '@/lib/supabase';

export type StarterRole = 'owner' | 'council' | 'manager' | 'admin';

/** 与数据库 / 触发器约定一致：缺字段时抛出 */
export const MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS';
export const INVALID_CONTACT_EMAIL = 'INVALID_CONTACT_EMAIL';
export const INVALID_CONTACT_PHONE = 'INVALID_CONTACT_PHONE';

export type CreatePropertyOnboardingInput = {
  propertyName: string;
  propertyCode: string;
  city: string;
  /** 写入 properties.contact_name 与 leads.name */
  contactName: string;
  /** 写入 properties.contact_email 与 leads.email（可与登录邮箱一致） */
  contactEmail: string;
  /** 写入 properties.contact_phone 与 leads.phone */
  phone: string;
  /** 写入 properties.strata_plan */
  strataPlan: string;
  starterRole: StarterRole;
  unitNo?: string | null;
};

export type CreatePropertyOnboardingResult = {
  propertyId: string;
  warnings: string[];
};

function persistCurrentPropertyId(propertyId: string) {
  try {
    localStorage.setItem('currentPropertyId', propertyId);
    localStorage.setItem('clearstrata-current-property-id', propertyId);
  } catch {
    /* ignore */
  }
}

function normalizeCode(raw: string): string {
  const up = raw.trim().toUpperCase();
  // Keep it URL/QR friendly.
  return up.replace(/[^A-Z0-9_-]/g, '').slice(0, 24);
}

function asDbWarning(err: unknown): string {
  if (!err) return 'unknown';
  if (typeof err === 'string') return err;
  if (typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const msg = typeof o.message === 'string' ? o.message : '';
    const code = typeof o.code === 'string' ? o.code : '';
    return [code, msg].filter(Boolean).join(' ');
  }
  return String(err);
}

function isMissingTableError(err: unknown): boolean {
  const msg = asDbWarning(err).toLowerCase();
  return (
    msg.includes('does not exist') ||
    msg.includes('relation') ||
    msg.includes('undefined table') ||
    msg.includes('42p01')
  );
}

function isMissingColumnError(err: unknown): boolean {
  const msg = asDbWarning(err).toLowerCase();
  return msg.includes('column') && msg.includes('does not exist');
}

function throwNormalizedPropertyInsertError(error: unknown): never {
  const w = asDbWarning(error);
  if (w.includes('MISSING_REQUIRED_FIELDS')) {
    throw new Error(MISSING_REQUIRED_FIELDS);
  }
  if (error instanceof Error) throw error;
  throw new Error(w);
}

function mapStarterRoleToMembershipRole(role: StarterRole): 'admin' | 'council' | 'manager' | 'property_admin' {
  if (role === 'manager') return 'manager';
  if (role === 'council') return 'council';
  // Ensure can enter backend even if user chose owner.
  return 'admin';
}

async function ensureProfile(userId: string, email: string, fullName: string): Promise<void> {
  const { data: prof, error } = await supabase.from('profiles').select('id, full_name_en').eq('id', userId).maybeSingle();
  if (error) {
    // Don't block; still try to insert a profile row if missing.
    console.warn('[onboarding] profiles select', error);
  }
  if (!prof?.id) {
    const { error: insErr } = await supabase.from('profiles').insert({
      id: userId,
      email,
      full_name_en: fullName,
      full_name_zh: '',
      role: 'owner',
      status: 'active',
      unit_number: '',
      preferred_language: 'en',
    } as any);
    if (insErr) throw insErr;
    return;
  }
  if (!String(prof.full_name_en ?? '').trim() && fullName.trim()) {
    const { error: upErr } = await supabase.from('profiles').update({ full_name_en: fullName.trim() }).eq('id', userId);
    if (upErr) console.warn('[onboarding] profiles update name', upErr);
  }
}

function assertCreatePropertyRequiredFields(input: CreatePropertyOnboardingInput): void {
  const name = input.propertyName?.trim() ?? '';
  const code = input.propertyCode?.trim() ?? '';
  const contactName = input.contactName?.trim() ?? '';
  const email = input.contactEmail?.trim() ?? '';
  const phone = input.phone?.trim() ?? '';
  const strataPlan = input.strataPlan?.trim() ?? '';
  if (!name || !code || !contactName || !email || !phone || !strataPlan) {
    throw new Error(MISSING_REQUIRED_FIELDS);
  }
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) throw new Error(INVALID_CONTACT_EMAIL);
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8) throw new Error(INVALID_CONTACT_PHONE);
}

async function insertLeadForNewProperty(input: {
  propertyId: string;
  propertyName: string;
  contactName: string;
  email: string;
  phone: string;
  userId: string;
  warnings: string[];
}): Promise<void> {
  const { propertyId, propertyName, contactName, email, phone, userId, warnings } = input;
  try {
    const { data: dup, error: dupErr } = await (supabase
      .from('leads')
      .select('id')
      .eq('email', email)
      .eq('property_name', propertyName.trim())
      .limit(1)
      .maybeSingle() as any);
    if (!dupErr && dup?.id) return;

    const { error } = await (supabase.from('leads').insert({
      name: contactName,
      email,
      phone,
      property_name: propertyName.trim(),
      property_id: propertyId,
      selected_plan: 'unknown',
      status: 'new',
      source: 'create_property',
      created_by: userId,
    }) as any);
    if (error) {
      warnings.push(`lead: ${asDbWarning(error)}`);
      console.warn('[onboarding] lead insert', error);
    }
  } catch (e) {
    warnings.push(`lead: ${asDbWarning(e)}`);
    console.warn('[onboarding] lead insert exception', e);
  }
}

async function insertPropertyRow(input: CreatePropertyOnboardingInput): Promise<string> {
  const nowIso = new Date().toISOString();
  const contactPayload: Record<string, unknown> = {
    contact_name: input.contactName.trim(),
    contact_email: input.contactEmail.trim().toLowerCase(),
    contact_phone: input.phone.trim(),
    strata_plan: input.strataPlan.trim(),
  };
  const payloadBase: Record<string, unknown> = {
    name: input.propertyName.trim(),
    code: normalizeCode(input.propertyCode),
    city: input.city.trim() || null,
    ...contactPayload,
  };

  const trialPayload: Record<string, unknown> = (() => {
    const started = new Date(nowIso);
    const ends = new Date(started.getTime() + 90 * 24 * 60 * 60 * 1000);
    return {
      subscription_status: 'trial',
      trial_started_at: nowIso,
      trial_ends_at: ends.toISOString(),
    };
  })();

  // Prefer subscription trial fields if schema supports them.
  {
    const { data, error } = await supabase
      .from('properties')
      .insert({ ...payloadBase, ...trialPayload })
      .select('id')
      .maybeSingle();
    if (!error && data?.id) return String(data.id);
    if (error && isMissingColumnError(error)) {
      // Retry without trial fields.
    } else if (error) {
      throwNormalizedPropertyInsertError(error);
    }
  }

  // Fallback without trial fields if schema does not support them.
  const { data, error } = await supabase.from('properties').insert(payloadBase).select('id').maybeSingle();
  if (error) throwNormalizedPropertyInsertError(error);
  const pid = data?.id ? String(data.id) : '';
  if (!pid) throw new Error('Property created but id missing.');
  return pid;
}

async function initWelcomeNotification(propertyId: string, userId: string, warnings: string[]) {
  try {
    // Idempotent: create only if not exists.
    const { data: existing, error: selErr } = await (supabase
      .from('community_notifications')
      .select('id')
      .eq('property_id', propertyId)
      .eq('title', '欢迎使用 ClearStrata')
      .limit(1) as any);
    if (!selErr && Array.isArray(existing) && existing.length > 0) return;
    if (selErr && isMissingTableError(selErr)) return;
    if (selErr) {
      console.warn('[onboarding] community_notifications select', selErr);
    }

    const { error: insErr } = await (supabase.from('community_notifications').insert({
      property_id: propertyId,
      title: '欢迎使用 ClearStrata',
      content:
        '你的物业已成功创建。下一步建议先导入房号、邀请成员、上传第一张发票。',
      priority: 'normal',
      created_by: userId,
    }) as any);
    if (insErr) {
      if (isMissingTableError(insErr)) return;
      warnings.push(`welcome_notification: ${asDbWarning(insErr)}`);
      console.warn('[onboarding] welcome notification insert', insErr);
    }
  } catch (e) {
    warnings.push(`welcome_notification: ${asDbWarning(e)}`);
    console.warn('[onboarding] welcome notification init', e);
  }
}

function randomInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < 8; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

async function initDefaultInviteCode(propertyId: string, warnings: string[]) {
  try {
    const { data: existing, error: selErr } = await (supabase
      .from('property_invite_codes')
      .select('id')
      .eq('property_id', propertyId)
      .eq('is_active', true)
      .limit(1) as any);
    if (!selErr && Array.isArray(existing) && existing.length > 0) return;
    if (selErr && isMissingTableError(selErr)) return;
    if (selErr) console.warn('[onboarding] property_invite_codes select', selErr);

    // Try a few times to avoid unique(code) collision.
    for (let i = 0; i < 5; i++) {
      const code = randomInviteCode();
      const { error: insErr } = await (supabase.from('property_invite_codes').insert({
        property_id: propertyId,
        code,
        label: '默认业主邀请码',
        role: 'owner',
        max_uses: 50,
        is_active: true,
      }) as any);
      if (!insErr) return;
      const msg = asDbWarning(insErr);
      if (isMissingTableError(insErr)) return;
      // 23505 duplicate key.
      if (msg.includes('23505') || msg.toLowerCase().includes('duplicate')) continue;
      warnings.push(`invite_code: ${msg}`);
      console.warn('[onboarding] invite code insert', insErr);
      return;
    }
  } catch (e) {
    warnings.push(`invite_code: ${asDbWarning(e)}`);
    console.warn('[onboarding] invite code init', e);
  }
}

async function initBudgetCategories(propertyId: string, warnings: string[]) {
  const base = [
    { code: 'maintenance', name_en: 'Maintenance', name_zh: '维修', sort_order: 1 },
    { code: 'cleaning', name_en: 'Cleaning', name_zh: '清洁', sort_order: 2 },
    { code: 'landscaping', name_en: 'Landscaping', name_zh: '园艺', sort_order: 3 },
    { code: 'insurance', name_en: 'Insurance', name_zh: '保险', sort_order: 4 },
    { code: 'utilities', name_en: 'Utilities', name_zh: '水电', sort_order: 5 },
    { code: 'management_fees', name_en: 'Management fees', name_zh: '管理费', sort_order: 6 },
  ];
  try {
    const rows = base.map((c) => ({
      property_id: propertyId,
      code: c.code,
      name_en: c.name_en,
      name_zh: c.name_zh,
      sort_order: c.sort_order,
      is_active: true,
    }));
    const { error } = await (supabase
      .from('budget_categories')
      .upsert(rows, { onConflict: 'property_id,code' }) as any);
    if (error) {
      if (isMissingTableError(error)) return;
      warnings.push(`budget_categories: ${asDbWarning(error)}`);
      console.warn('[onboarding] budget_categories upsert', error);
    }
  } catch (e) {
    warnings.push(`budget_categories: ${asDbWarning(e)}`);
    console.warn('[onboarding] budget_categories init', e);
  }
}

export async function createPropertyOnboarding(
  input: CreatePropertyOnboardingInput
): Promise<CreatePropertyOnboardingResult> {
  const warnings: string[] = [];
  assertCreatePropertyRequiredFields(input);

  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user?.id) {
    throw new Error('请先登录后再创建物业。');
  }
  const sessionEmail = (user.email ?? '').trim().toLowerCase();
  const contactEmail = input.contactEmail.trim().toLowerCase();
  if (!sessionEmail && !contactEmail) {
    throw new Error('当前账号缺少邮箱信息，请重新登录后再试。');
  }

  await ensureProfile(user.id, contactEmail || sessionEmail, input.contactName.trim() || contactEmail || sessionEmail);

  const propertyId = await insertPropertyRow(input);

  await insertLeadForNewProperty({
    propertyId,
    propertyName: input.propertyName,
    contactName: input.contactName.trim(),
    email: contactEmail,
    phone: input.phone.trim(),
    userId: user.id,
    warnings,
  });

  const role = mapStarterRoleToMembershipRole(input.starterRole);
  const unit = input.unitNo?.trim() ? input.unitNo.trim() : null;

  // Bootstrap creator membership via SECURITY DEFINER RPC (authenticated INSERT revoked).
  const { error: memErr } = await supabase.rpc('bootstrap_property_creator_membership', {
    p_property_id: propertyId,
    p_role: role,
    p_unit_no: unit,
  });
  if (memErr) throw memErr;

  // Minimal baseline data (best-effort).
  await initWelcomeNotification(propertyId, user.id, warnings);
  await initDefaultInviteCode(propertyId, warnings);
  await initBudgetCategories(propertyId, warnings);

  persistCurrentPropertyId(propertyId);

  return { propertyId, warnings };
}

