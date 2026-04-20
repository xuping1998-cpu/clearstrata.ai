import { useState, useEffect } from 'react';
import { User, Save, Loader2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';
import type { UserRole } from '../lib/supabase';
import { BackButton } from '../components/BackButton';
import { NotificationSettings } from '../components/NotificationSettings';
import { PWAInstructions } from '../components/PWAInstructions';

function propertyRoleLabel(role: UserRole | null, language: string): string {
  const en: Record<UserRole, string> = {
    owner: 'Owner',
    tenant: 'Tenant',
    viewer: 'Viewer',
    council: 'Council Member',
    admin: 'Administrator',
    manager: 'Property Manager',
    property_admin: 'Property Administrator',
  };
  const zh: Record<UserRole, string> = {
    owner: '业主',
    tenant: '租户',
    viewer: '访客',
    council: '理事会成员',
    admin: '系统管理员',
    manager: '物业经理',
    property_admin: '物业管理员',
  };
  if (!role) return language === 'en' ? '—' : '—';
  return language === 'en' ? en[role] : zh[role];
}

export function Profile() {
  const { language, setLanguage } = useLanguage();
  const { profile, refreshProfile } = useAuth();
  const { currentRole } = useProperty();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    full_name_en: '',
    full_name_zh: '',
    phone: '',
    preferred_language: 'en' as 'en' | 'zh',
  });

  useEffect(() => {
    if (profile) {
      setFormData({
        full_name_en: profile.full_name_en || '',
        full_name_zh: profile.full_name_zh || '',
        phone: profile.phone || '',
        preferred_language: (profile.preferred_language === 'zh' ? 'zh' : 'en') as 'en' | 'zh',
      });
    }
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name_en: formData.full_name_en,
          full_name_zh: formData.full_name_zh,
          phone: formData.phone,
          preferred_language: formData.preferred_language,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile?.id);

      if (error) {
        throw error;
      }

      await refreshProfile();
      setLanguage(formData.preferred_language);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert(
        language === 'en'
          ? 'Failed to update profile. Please try again.'
          : '更新个人信息失败，请重试。'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <BackButton />
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {language === 'en' ? 'My Profile' : '我的个人信息'}
          </h1>
          <p className="text-gray-600">
            {language === 'en'
              ? 'Update your personal information'
              : '更新您的个人信息'}
          </p>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-gray-200">
              <div className="w-16 h-16 bg-clearstrata-ui-primary rounded-full flex items-center justify-center">
                <User className="text-white" size={32} />
              </div>
              <div>
                <div className="font-semibold text-gray-900">{profile?.email}</div>
                <div className="text-sm text-gray-500">
                  {language === 'en' ? 'Role in this property' : '本物业角色'}:{' '}
                  {propertyRoleLabel(currentRole, language)}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {language === 'en' ? 'Full Name (English)' : '姓名（英文）'}
                <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.full_name_en}
                onChange={(e) =>
                  setFormData({ ...formData, full_name_en: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clearstrata-ui-primary"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {language === 'en' ? 'Full Name (Chinese)' : '姓名（中文）'}
              </label>
              <input
                type="text"
                value={formData.full_name_zh}
                onChange={(e) =>
                  setFormData({ ...formData, full_name_zh: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clearstrata-ui-primary"
                placeholder="张三"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {language === 'en' ? 'Phone Number' : '电话号码'}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-clearstrata-ui-primary"
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {language === 'en' ? 'Preferred Language' : '首选语言'}
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="language"
                    value="en"
                    checked={formData.preferred_language === 'en'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferred_language: e.target.value as 'en' | 'zh',
                      })
                    }
                    className="w-4 h-4 text-clearstrata-ui-primary focus:ring-clearstrata-ui-primary"
                  />
                  <span>English</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="language"
                    value="zh"
                    checked={formData.preferred_language === 'zh'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        preferred_language: e.target.value as 'en' | 'zh',
                      })
                    }
                    className="w-4 h-4 text-clearstrata-ui-primary focus:ring-clearstrata-ui-primary"
                  />
                  <span>中文</span>
                </label>
              </div>
            </div>

            {success && (
              <div className="p-4 bg-clearstrata-ui-soft border border-clearstrata-ui-softBorder rounded-lg text-clearstrata-ui-softText">
                {language === 'en'
                  ? 'Profile updated successfully!'
                  : '个人信息更新成功！'}
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-clearstrata-ui-primary text-white rounded-lg hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    {language === 'en' ? 'Saving...' : '保存中...'}
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    {language === 'en' ? 'Save Changes' : '保存更改'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {language === 'en' ? 'Notification Settings' : '通知设置'}
          </h2>
          <NotificationSettings />
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {language === 'en' ? 'Install App' : '安装应用'}
          </h2>
          <PWAInstructions />
        </div>
      </div>
    </div>
  );
}
