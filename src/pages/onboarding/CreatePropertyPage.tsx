import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Building2, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useProperty } from '@/contexts/PropertyContext';
import {
  createPropertyOnboarding,
  INVALID_CONTACT_EMAIL,
  INVALID_CONTACT_PHONE,
  MISSING_REQUIRED_FIELDS,
  type StarterRole,
} from '@/features/onboarding/createPropertyOnboarding';
import { readGuestExperienceDraft } from '@/lib/guestExperienceDraft';

type Toast = { kind: 'success' | 'error' | 'warn'; text: string } | null;

function normalizeCodeHint(name: string): string {
  const s = name.trim().toUpperCase();
  const compact = s.replace(/[^A-Z0-9]/g, '').slice(0, 8);
  return compact || 'CS0001';
}

export function CreatePropertyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { language } = useLanguage();
  const en = language === 'en';
  const { refreshMemberships, setCurrentPropertyId } = useProperty();

  const [propertyName, setPropertyName] = useState('');
  const [propertyCode, setPropertyCode] = useState('');
  const [city, setCity] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [strataPlan, setStrataPlan] = useState('');
  const [starterRole, setStarterRole] = useState<StarterRole>('council');
  const [unitNo, setUnitNo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const submitLock = useRef(false);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), toast.kind === 'success' ? 4200 : 7000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const redirectBackToSelf = useMemo(
    () => `/?redirect=${encodeURIComponent(location.pathname + location.search)}`,
    [location.pathname, location.search],
  );

  useEffect(() => {
    if (!profile) return;
    const name =
      (profile.full_name_zh && profile.full_name_zh.trim()) ||
      (profile.full_name_en && profile.full_name_en.trim()) ||
      '';
    if (!contactName.trim() && name) setContactName(name);
  }, [profile, contactName]);

  useEffect(() => {
    const em = (user?.email ?? profile?.email ?? '').trim();
    if (!contactEmail.trim() && em) setContactEmail(em);
  }, [user?.email, profile?.email, contactEmail]);

  /** 首页「游客体验」暂存的姓名/邮箱，创建物业时预填（仍须补电话与 Strata Plan） */
  useEffect(() => {
    const d = readGuestExperienceDraft();
    if (!d) return;
    setContactName((v) => (v.trim() ? v : d.name));
    setContactEmail((v) => (v.trim() ? v : d.email));
  }, [profile?.id]);

  useEffect(() => {
    if (!propertyCode.trim() && propertyName.trim().length >= 2) {
      setPropertyCode(normalizeCodeHint(propertyName));
    }
  }, [propertyName, propertyCode]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting || submitLock.current) return;
    setToast(null);

    if (!session?.user || !user?.id) {
      setToast({
        kind: 'error',
        text: en ? 'Please sign in before creating a property.' : '请先登录后再创建物业。',
      });
      navigate(redirectBackToSelf, { replace: false });
      return;
    }

    const name = propertyName.trim();
    const code = propertyCode.trim();
    const c = city.trim();
    const cn = contactName.trim();
    const em = contactEmail.trim();
    const ph = phone.trim();
    const sp = strataPlan.trim();
    if (!name || !code || !cn || !em || !ph) {
      setToast({
        kind: 'error',
        text: en
          ? 'Please fill in property name, code, contact name, email and phone.'
          : '请填写物业名称、代号、联系人、邮箱与电话（缺一不可）。',
      });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) {
      setToast({
        kind: 'error',
        text: en ? 'Please enter a valid contact email.' : '请输入有效的联系邮箱。',
      });
      return;
    }
    if (ph.replace(/\D/g, '').length < 8) {
      setToast({
        kind: 'error',
        text: en
          ? 'Invalid phone number (at least 8 digits).'
          : '电话格式不正确（至少包含 8 位数字）。',
      });
      return;
    }

    submitLock.current = true;
    setSubmitting(true);
    try {
      const res = await createPropertyOnboarding({
        propertyName: name,
        propertyCode: code,
        city: c,
        contactName: cn,
        contactEmail: em,
        phone: ph,
        strataPlan: sp || '待补充 / TBD',
        starterRole,
        unitNo: unitNo.trim() || null,
      });

      await refreshProfile();
      await refreshMemberships();
      setCurrentPropertyId(res.propertyId);

      setToast({
        kind: 'success',
        text: en
          ? 'Property created. Welcome to your dashboard.'
          : '物业创建成功，已进入你的后台。',
      });

      const q = new URLSearchParams();
      q.set('propertyId', res.propertyId);
      navigate(`/dashboard?${q.toString()}`, { replace: true });

      if (res.warnings.length > 0 && import.meta.env.DEV) {
        console.warn('[onboarding] init warnings', res.warnings);
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
      const msg =
        raw === MISSING_REQUIRED_FIELDS
          ? en
            ? 'Missing information: contact name, email and phone are required.'
            : '信息不完整：联系人、邮箱与电话均为必填。'
          : raw === INVALID_CONTACT_EMAIL
            ? en
              ? 'Contact email format is invalid.'
              : '联系邮箱格式不正确。'
            : raw === INVALID_CONTACT_PHONE
              ? en
                ? 'Invalid phone number (at least 8 digits).'
                : '电话格式不正确（至少包含 8 位数字）。'
              : typeof raw === 'string' && raw.includes('MISSING_REQUIRED_FIELDS')
                ? en
                  ? 'Incomplete: database validation failed. Please check contact name, email and phone.'
                  : '信息不完整：数据库校验未通过，请确认已填写联系人、邮箱与电话。'
                : raw || (en ? 'Creation failed, please try again later.' : '创建失败，请稍后重试。');
      setToast({ kind: 'error', text: msg });
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-clearstrata-ui-primary animate-spin" aria-hidden />
        <p className="mt-4 text-sm text-gray-500">{en ? 'Loading…' : '加载中…'}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 to-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-clearstrata-brand-100 text-clearstrata-brand-700">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">
                {en ? 'Create your property' : '创建你的物业'}
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                {en
                  ? 'To make sure you become the first administrator of this property, please sign in or register first.'
                  : '为了确保你将成为该物业的首位管理员，请先登录或注册。'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(redirectBackToSelf)}
            className="mt-5 w-full rounded-xl bg-clearstrata-ui-primary px-4 py-3 text-sm font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors"
          >
            {en ? 'Sign in / Register' : '去登录 / 注册'}
          </button>
          <p className="mt-3 text-xs text-gray-400">
            {en
              ? 'You will return here automatically after signing in.'
              : '登录后将自动返回本页继续创建。'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-clearstrata-ui-soft/40 via-gray-50 to-gray-50">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-10">
          <div className="rounded-3xl border border-clearstrata-ui-softBorder bg-white p-6 shadow-sm sm:p-8">
            <div className="flex items-start gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-clearstrata-ui-primary text-white shadow-sm">
                <Building2 size={22} />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-black tracking-tight text-gray-900">
                  {en ? 'Create My Property' : '创建我的物业'}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {en
                    ? 'Start a 90-day free trial and invite owners to experience ClearStrata.'
                    : '开启 90 天免费试用，邀请业主一起体验 ClearStrata。'}
                </p>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-clearstrata-ui-softBorder bg-clearstrata-ui-soft/80 p-4">
              <p className="text-sm font-medium text-clearstrata-brand-950">
                {en
                  ? 'You will become the first administrator of this property'
                  : '创建后你将成为该物业的首位管理员'}
              </p>
              <p className="mt-1 text-xs text-clearstrata-ui-softText/80">
                {en
                  ? 'You can invite members, import units and upload invoices right away — full features unlocked.'
                  : '你可以立刻邀请成员、导入房号、上传发票，开始使用完整功能。'}
              </p>
            </div>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {en ? 'Property name' : '物业名称'}
                </label>
                <input
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder={en ? 'e.g. BCS 3736 Strata' : '例如：BCS 3736 Strata'}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-clearstrata-brand-400/30 focus:ring-2"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {en ? 'Property code / short name' : '物业代号 / 简称'}
                  </label>
                  <input
                    value={propertyCode}
                    onChange={(e) => setPropertyCode(e.target.value)}
                    placeholder={en ? 'e.g. BCS3736' : '例如：BCS3736'}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-clearstrata-brand-400/30 focus:ring-2"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {en
                      ? 'Used for QR codes, invite links and quick search.'
                      : '用于二维码、邀请链接与快速搜索。'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {en ? 'City' : '城市'}
                  </label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder={en ? 'e.g. Vancouver' : '例如：Vancouver'}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-clearstrata-brand-400/30 focus:ring-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {en ? 'Contact name' : '联系人姓名'} <span className="text-red-600">*</span>
                  </label>
                  <input
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder={en ? 'e.g. John Smith' : '例如：王小明'}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-clearstrata-brand-400/30 focus:ring-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {en ? 'Your role' : '你的角色'}
                  </label>
                  <select
                    value={starterRole}
                    onChange={(e) => setStarterRole(e.target.value as StarterRole)}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-clearstrata-brand-400/30 focus:ring-2"
                  >
                    <option value="council">{en ? 'Council' : 'council（业委会）'}</option>
                    <option value="manager">{en ? 'Property manager' : 'manager（物业经理）'}</option>
                    <option value="admin">{en ? 'Administrator' : 'admin（管理员）'}</option>
                    <option value="owner">{en ? 'Owner' : 'owner（业主）'}</option>
                  </select>
                  {starterRole === 'owner' ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {en
                        ? 'You will receive property admin access to set up this property.'
                        : '创建后你将获得物业管理员权限，用于初始化物业。'}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {en ? 'Contact email' : '联系邮箱'} <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-clearstrata-brand-400/30 focus:ring-2"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {en
                      ? 'Can match your login email, or use a preferred work email.'
                      : '可与登录邮箱一致，也支持填写常用工作邮箱。'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {en ? 'Contact phone' : '联系电话'} <span className="text-red-600">*</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={en ? 'e.g. 604-555-0101' : '例如：604-555-0101'}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-clearstrata-brand-400/30 focus:ring-2"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {en
                      ? 'At least 8 digits (spaces and dashes allowed).'
                      : '至少包含 8 位数字（可含空格、横线）。'}
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  {en
                    ? 'Strata Plan / registration number (optional)'
                    : 'Strata Plan / 物业登记号（可稍后补充）'}
                </label>
                <textarea
                  value={strataPlan}
                  onChange={(e) => setStrataPlan(e.target.value)}
                  placeholder={
                    en
                      ? 'e.g. Type 1 / Bare Land Strata; or paste the plan number and key details'
                      : '例如：Type 1 / Bare Land Strata；或粘贴计划书编号与要点'
                  }
                  rows={3}
                  className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-clearstrata-brand-400/30 focus:ring-2"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    {en ? 'Your unit number (optional)' : '你的房号（可选）'}
                  </label>
                  <input
                    value={unitNo}
                    onChange={(e) => setUnitNo(e.target.value)}
                    placeholder={en ? 'e.g. 101' : '例如：101'}
                    className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm outline-none ring-clearstrata-brand-400/30 focus:ring-2"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-clearstrata-ui-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50 active:scale-[0.99]"
              >
                {submitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {submitting
                  ? en
                    ? 'Creating…'
                    : '创建中…'
                  : en
                    ? 'Create My Property'
                    : '立即创建我的物业'}
              </button>

              {toast ? (
                <div
                  role="status"
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    toast.kind === 'success'
                      ? 'border-clearstrata-ui-softBorder bg-clearstrata-ui-soft text-clearstrata-brand-950'
                      : toast.kind === 'warn'
                        ? 'border-amber-200 bg-amber-50 text-amber-950'
                        : 'border-red-200 bg-red-50 text-red-900'
                  }`}
                >
                  {toast.text}
                </div>
              ) : null}
            </form>
          </div>

          <div className="space-y-4">
            <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-gray-900">
                {en ? 'What will you see after creating?' : '创建后你会看到什么？'}
              </h2>
              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                <li className="flex gap-2">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-clearstrata-brand-500" />
                  <span>
                    {en
                      ? 'A setup task card appears on your dashboard to guide you through 3 steps.'
                      : '后台首页会出现“开通任务卡”，引导你完成 3 步开通。'}
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-clearstrata-brand-500" />
                  <span>
                    {en
                      ? 'The system will try to generate a default owner invite code.'
                      : '系统将尝试生成默认业主邀请码，方便你立刻邀请成员加入。'}
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-clearstrata-brand-500" />
                  <span>
                    {en
                      ? 'It will try to initialize basic budget categories and a welcome notice (if supported).'
                      : '系统会尝试初始化基础预算分类与欢迎公告（若当前数据库支持）。'}
                  </span>
                </li>
              </ul>
            </div>

            <div className="rounded-3xl border border-gray-200 bg-gradient-to-br from-white to-clearstrata-ui-soft/40 p-6 shadow-sm sm:p-8">
              <h2 className="text-lg font-bold text-gray-900">
                {en ? 'What do you need to prepare?' : '需要准备什么资料？'}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {en
                  ? 'Only minimal info is needed to get started. Units/residents import, budgets and invoices can be completed later.'
                  : '你只需提供最少信息即可开通。房号/住户导入、预算与发票等可以稍后再完善。'}
              </p>
              <div className="mt-4 rounded-2xl border border-clearstrata-ui-softBorder bg-clearstrata-ui-soft px-4 py-3 text-xs text-clearstrata-ui-softText">
                {en
                  ? 'Note: if you came from the Demo page, you will enter your real dashboard (not demo data) after creation.'
                  : '提示：如果你来自 Demo 页面，创建成功后会立即进入真实后台（非演示数据）。'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

