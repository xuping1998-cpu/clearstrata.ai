import { useState, useEffect } from 'react';
import { User, Save, Loader2, Wrench, Scale, CalendarDays, DollarSign, Shield, Phone } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

interface Resident {
  id: string;
  unit_no: string;
  name_en: string;
  name_zh: string | null;
  email: string;
  phone: string;
  move_in_date: string | null;
  language_pref: string;
  role: string;
  status: string;
  committee_role: string | null;
  term_start: string | null;
  term_end: string | null;
  strata_fee_status: string;
  created_at: string;
}

interface Stats {
  maintenanceCount: number;
  disputeCount: number;
}

export function ResidentProfile() {
  const { language } = useLanguage();
  const { profile, refreshProfile } = useAuth();
  const [resident, setResident] = useState<Resident | null>(null);
  const [stats, setStats] = useState<Stats>({ maintenanceCount: 0, disputeCount: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    name_en: '',
    name_zh: '',
    phone: '',
    language_pref: 'en',
  });

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  const loadData = async () => {
    if (!profile) return;

    const [residentResult, maintenanceResult, disputeResult] = await Promise.all([
      supabase
        .from('residents')
        .select('*')
        .eq('user_id', profile.id)
        .maybeSingle(),
      supabase
        .from('procurement_jobs')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', profile.id),
      supabase
        .from('disputes')
        .select('id', { count: 'exact', head: true })
        .or(`submitted_by.eq.${profile.id},respondent_id.eq.${profile.id}`),
    ]);

    if (residentResult.data) {
      setResident(residentResult.data);
      setForm({
        name_en: residentResult.data.name_en,
        name_zh: residentResult.data.name_zh || '',
        phone: residentResult.data.phone,
        language_pref: residentResult.data.language_pref,
      });
    }

    setStats({
      maintenanceCount: maintenanceResult.count || 0,
      disputeCount: disputeResult.count || 0,
    });

    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile || !resident) return;

    setSaving(true);
    try {
      await supabase
        .from('residents')
        .update({
          name_en: form.name_en,
          name_zh: form.name_zh || null,
          phone: form.phone,
          language_pref: form.language_pref,
        })
        .eq('id', resident.id);

      await supabase
        .from('profiles')
        .update({
          full_name_en: form.name_en,
          full_name_zh: form.name_zh || null,
          phone: form.phone,
          preferred_language: form.language_pref,
        })
        .eq('id', profile.id);

      await refreshProfile();
      await loadData();
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; labelEn: string; labelZh: string }> = {
      active: { bg: 'bg-green-100', text: 'text-green-800', labelEn: 'Active', labelZh: '已激活' },
      pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', labelEn: 'Pending Review', labelZh: '待审核' },
      deregistered: { bg: 'bg-gray-100', text: 'text-gray-600', labelEn: 'Deregistered', labelZh: '已注销' },
    };
    const s = map[status] || map.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
        {language === 'en' ? s.labelEn : s.labelZh}
      </span>
    );
  };

  const feeBadge = (status: string) => {
    const map: Record<string, { bg: string; text: string; labelEn: string; labelZh: string }> = {
      current: { bg: 'bg-green-100', text: 'text-green-800', labelEn: 'Current', labelZh: '正常' },
      overdue: { bg: 'bg-red-100', text: 'text-red-800', labelEn: 'Overdue', labelZh: '逾期' },
      prepaid: { bg: 'bg-blue-100', text: 'text-blue-800', labelEn: 'Prepaid', labelZh: '预付' },
    };
    const s = map[status] || map.current;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
        {language === 'en' ? s.labelEn : s.labelZh}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-[#1D9E75]" size={32} />
      </div>
    );
  }

  if (!resident) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center">
        <User className="mx-auto text-gray-400 mb-4" size={48} />
        <p className="text-gray-500 text-lg">
          {language === 'en'
            ? 'No resident record found. Your registration may still be processing.'
            : '未找到住户记录。您的注册可能仍在处理中。'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-[#1D9E75]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <Shield size={20} className="text-[#1D9E75]" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{language === 'en' ? 'Status' : '状态'}</p>
              {statusBadge(resident.status)}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-blue-400">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <DollarSign size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{language === 'en' ? 'Strata Fee' : '物业费'}</p>
              {feeBadge(resident.strata_fee_status)}
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-orange-400">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-50 rounded-lg">
              <Wrench size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{language === 'en' ? 'Work Orders' : '维修工单'}</p>
              <p className="text-lg font-bold text-gray-900">{stats.maintenanceCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg">
              <Scale size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{language === 'en' ? 'Disputes' : '纠纷'}</p>
              <p className="text-lg font-bold text-gray-900">{stats.disputeCount}</p>
            </div>
          </div>
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm">
          {language === 'en' ? 'Profile updated successfully!' : '个人信息更新成功！'}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-[#1D9E75] to-[#178a66] p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
              <User className="text-white" size={32} />
            </div>
            <div className="text-white">
              <h2 className="text-xl font-bold">
                {language === 'en' ? resident.name_en : (resident.name_zh || resident.name_en)}
              </h2>
              <p className="text-white/80 text-sm">{resident.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="bg-white/20 px-2 py-0.5 rounded text-xs font-medium backdrop-blur-sm">
                  {language === 'en' ? 'Unit' : '单元'} {resident.unit_no}
                </span>
                {resident.committee_role && (
                  <span className="bg-yellow-400/30 text-yellow-100 px-2 py-0.5 rounded text-xs font-medium backdrop-blur-sm">
                    {resident.committee_role === 'chairperson'
                      ? (language === 'en' ? 'Chairperson' : '主席')
                      : resident.committee_role === 'secretary'
                      ? (language === 'en' ? 'Secretary' : '秘书')
                      : resident.committee_role === 'treasurer'
                      ? (language === 'en' ? 'Treasurer' : '财务')
                      : (language === 'en' ? 'Committee Member' : '委员')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6">
          {editing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'en' ? 'Name (English)' : '姓名（英文）'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={form.name_en}
                    onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'en' ? 'Name (Chinese)' : '姓名（中文）'}
                  </label>
                  <input
                    type="text"
                    value={form.name_zh}
                    onChange={(e) => setForm({ ...form, name_zh: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'en' ? 'Phone' : '电话'}
                </label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75]/20 focus:border-[#1D9E75]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'en' ? 'Language Preference' : '语言偏好'}
                </label>
                <div className="flex gap-3">
                  {(['en', 'zh'] as const).map((lang) => (
                    <label
                      key={lang}
                      className={`flex-1 flex items-center justify-center py-2.5 rounded-lg border-2 cursor-pointer transition-all ${
                        form.language_pref === lang
                          ? 'border-[#1D9E75] bg-emerald-50 text-[#1D9E75]'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      <input
                        type="radio"
                        name="langPref"
                        value={lang}
                        checked={form.language_pref === lang}
                        onChange={() => setForm({ ...form, language_pref: lang })}
                        className="sr-only"
                      />
                      <span className="font-medium">{lang === 'en' ? 'English' : '中文'}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 bg-[#1D9E75] text-white py-2.5 rounded-lg hover:bg-[#178a66] transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                  {language === 'en' ? 'Save' : '保存'}
                </button>
                <button
                  onClick={() => setEditing(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  {language === 'en' ? 'Cancel' : '取消'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoRow
                  label={language === 'en' ? 'English Name' : '英文名'}
                  value={resident.name_en}
                />
                <InfoRow
                  label={language === 'en' ? 'Chinese Name' : '中文名'}
                  value={resident.name_zh || '-'}
                />
                <InfoRow
                  label={language === 'en' ? 'Email' : '邮箱'}
                  value={resident.email}
                />
                <InfoRow
                  label={language === 'en' ? 'Phone' : '电话'}
                  value={resident.phone || '-'}
                  icon={<Phone size={14} className="text-gray-400" />}
                />
                <InfoRow
                  label={language === 'en' ? 'Move-in Date' : '入住日期'}
                  value={resident.move_in_date
                    ? new Date(resident.move_in_date).toLocaleDateString(language === 'en' ? 'en-AU' : 'zh-CN')
                    : '-'}
                  icon={<CalendarDays size={14} className="text-gray-400" />}
                />
                <InfoRow
                  label={language === 'en' ? 'Language' : '语言'}
                  value={resident.language_pref === 'en' ? 'English' : '中文'}
                />
                {resident.term_start && (
                  <InfoRow
                    label={language === 'en' ? 'Term' : '任期'}
                    value={`${new Date(resident.term_start).toLocaleDateString()} - ${
                      resident.term_end ? new Date(resident.term_end).toLocaleDateString() : '...'
                    }`}
                  />
                )}
                <InfoRow
                  label={language === 'en' ? 'Registered' : '注册时间'}
                  value={new Date(resident.created_at).toLocaleDateString(language === 'en' ? 'en-AU' : 'zh-CN')}
                />
              </div>
              <button
                onClick={() => setEditing(true)}
                className="mt-4 px-6 py-2.5 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors font-medium"
              >
                {language === 'en' ? 'Edit Profile' : '编辑信息'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
        {icon}
        {value}
      </p>
    </div>
  );
}
