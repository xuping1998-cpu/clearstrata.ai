import { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase, type UserRole } from '../../lib/supabase';
import { invokeUpdateUserRole } from '../../lib/invokeUpdateUserRole';
import { type AppMetadataRole, profileRoleToMetadataRole } from '../../lib/userRoleMetadata';
import { UserCard } from '../../components/UserCard';

interface Profile {
  id: string;
  full_name_en: string;
  full_name_zh?: string;
  email: string;
  phone?: string;
  role: UserRole;
}

interface OwnerInfoRecord {
  user_id: string;
  unit_number: string;
}

interface UserWithDetails extends Profile {
  unit_number?: string;
  balance?: number;
}

export function UserManagementTab() {
  const { language } = useLanguage();
  const { profile, refreshProfile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [ownerInfos, setOwnerInfos] = useState<OwnerInfoRecord[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (profile) loadData();
  }, [profile]);

  const loadData = async () => {
    const [{ data: profileData }, { data: ownerData }] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name_en'),
      supabase.from('owner_info').select('user_id, unit_number').order('unit_number'),
    ]);
    setProfiles(profileData || []);
    setOwnerInfos(ownerData || []);
  };

  const startEdit = (user: Profile) => {
    setEditingUserId(user.id);
    setEditForm({
      full_name_en: user.full_name_en,
      full_name_zh: user.full_name_zh,
      phone: user.phone,
    });
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditForm({});
  };

  const saveEdit = async (userId: string) => {
    setUpdating(userId);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name_en: editForm.full_name_en,
        full_name_zh: editForm.full_name_zh,
        phone: editForm.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);

    if (error) {
      alert(language === 'en' ? 'Failed to update user information.' : '更新用户信息失败。');
    } else {
      await loadData();
      setEditingUserId(null);
      setEditForm({});
    }
    setUpdating(null);
  };

  const updateEditForm = (field: string, value: string) => {
    setEditForm({ ...editForm, [field]: value });
  };

  /** Only admins may change profile roles (council / manager); council can still edit names. */
  const canSelectRoles = profile?.role === 'admin';

  const canShowRoleSelector = (user: Profile) => {
    if (!canSelectRoles || user.role === 'admin') return false;
    if (profile?.role === 'council' && user.role === 'manager') return false;
    return true;
  };

  const updateUserRole = async (userId: string, metaRole: AppMetadataRole) => {
    if (!canSelectRoles) return;
    const current = profiles.find((p) => p.id === userId);
    if (current && profileRoleToMetadataRole(current.role) === metaRole) return;

    setUpdating(userId);
    const { data, error } = await invokeUpdateUserRole(userId, metaRole);

    if (error) {
      console.error('[UserManagementTab] update-user-role:', error);
      alert(
        language === 'en'
          ? 'Failed to update role. Deploy the update-user-role Edge Function and apply DB migrations, or try again.'
          : '更新角色失败。请部署 update-user-role 边缘函数并执行数据库迁移，或稍后重试。',
      );
      setUpdating(null);
      return;
    }

    const payload = data as { error?: string } | null;
    if (payload?.error) {
      alert(payload.error);
      setUpdating(null);
      return;
    }

    await loadData();
    if (profile?.id === userId) await refreshProfile();
    setUpdating(null);
  };

  const printUserList = async () => {
    try {
      const usersWithDetails: UserWithDetails[] = await Promise.all(
        profiles.map(async (user) => {
          const ownerInfo = ownerInfos.find((info) => info.user_id === user.id);
          let balance: number | undefined;

          if (user.role === 'owner') {
            const { data: latestTransaction } = await supabase
              .from('ledger_transactions')
              .select('balance')
              .eq('user_id', user.id)
              .order('transaction_date', { ascending: false })
              .limit(1)
              .maybeSingle();
            balance = latestTransaction?.balance;
          }

          return { ...user, unit_number: ownerInfo?.unit_number, balance };
        })
      );

      const roleTranslation = (role: string) => {
        const map: Record<string, Record<string, string>> = {
          en: {
            owner: 'Owner',
            council: 'Council',
            manager: 'Property manager',
            admin: 'Admin',
          },
          zh: { owner: '业主', council: '理事会', manager: '物业经理', admin: '管理员' },
        };
        return map[language]?.[role] || role;
      };

      const escapeHtml = (text: string) => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      const formatBalance = (balance: number | undefined) => {
        if (balance === undefined) return '-';
        return '$' + balance.toFixed(2);
      };

      const getBalanceClass = (balance: number | undefined) => {
        if (balance === undefined) return '';
        return balance >= 0 ? 'balance-positive' : 'balance-negative';
      };

      const l = language === 'en';
      const labels = {
        title: l ? 'User List' : '用户列表',
        total: l ? 'Total Users' : '总用户数',
        date: l ? 'Print Date' : '打印日期',
        nameEn: l ? 'Name (English)' : '姓名（英文）',
        nameZh: l ? 'Name (Chinese)' : '姓名（中文）',
        email: l ? 'Email' : '电子邮箱',
        phone: l ? 'Phone' : '电话',
        role: l ? 'Role' : '角色',
        unit: l ? 'Unit #' : '房间号',
        balance: l ? 'Balance' : '物业费余额',
      };

      const tableRows = usersWithDetails.map(
        (user) =>
          '<tr>' +
          '<td>' + escapeHtml(user.full_name_en) + '</td>' +
          '<td>' + escapeHtml(user.full_name_zh || '-') + '</td>' +
          '<td>' + escapeHtml(user.email) + '</td>' +
          '<td>' + escapeHtml(user.phone || '-') + '</td>' +
          '<td>' + escapeHtml(roleTranslation(user.role)) + '</td>' +
          '<td>' + escapeHtml(user.unit_number || '-') + '</td>' +
          '<td class="' + getBalanceClass(user.balance) + '">' + formatBalance(user.balance) + '</td>' +
          '</tr>'
      ).join('');

      const html =
        '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' + labels.title + '</title>' +
        '<style>' +
        'body{font-family:Arial,sans-serif;padding:20px;max-width:1400px;margin:0 auto}' +
        'h1{color:#1D9E75;text-align:center;margin-bottom:10px}' +
        '.meta{text-align:center;color:#666;margin-bottom:30px}' +
        'table{width:100%;border-collapse:collapse;margin-top:20px;font-size:12px}' +
        'th,td{border:1px solid #ddd;padding:10px;text-align:left}' +
        'th{background-color:#1D9E75;color:white;font-weight:bold}' +
        'tr:nth-child(even){background-color:#f9f9f9}' +
        '.balance-positive{color:#059669;font-weight:bold}' +
        '.balance-negative{color:#DC2626;font-weight:bold}' +
        '@media print{body{padding:0}}' +
        '</style></head><body>' +
        '<h1>' + labels.title + '</h1>' +
        '<div class="meta"><p><strong>' + labels.total + ':</strong> ' + usersWithDetails.length + '</p>' +
        '<p><strong>' + labels.date + ':</strong> ' + new Date().toLocaleDateString(l ? 'en-CA' : 'zh-CN') + '</p></div>' +
        '<table><thead><tr>' +
        '<th>' + labels.nameEn + '</th><th>' + labels.nameZh + '</th>' +
        '<th>' + labels.email + '</th><th>' + labels.phone + '</th>' +
        '<th>' + labels.role + '</th><th>' + labels.unit + '</th>' +
        '<th>' + labels.balance + '</th>' +
        '</tr></thead><tbody>' + tableRows + '</tbody></table></body></html>';

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert(l ? 'Please allow pop-ups to print.' : '请允许弹出窗口以打印。');
        return;
      }
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => printWindow.print(), 250);
    } catch {
      alert(language === 'en' ? 'Failed to generate user list.' : '生成用户列表失败。');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">
          {language === 'en' ? 'User Management' : '用户管理'}
        </h2>
        <button
          onClick={printUserList}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors"
        >
          <Printer size={20} />
          {language === 'en' ? 'Print User List' : '打印用户列表'}
        </button>
      </div>
      <div className="space-y-4">
        {profiles.map((user) => (
          <UserCard
            key={user.id}
            user={user}
            language={language}
            isEditing={editingUserId === user.id}
            editForm={editForm}
            updating={updating === user.id}
            onStartEdit={() => startEdit(user)}
            onCancelEdit={cancelEdit}
            onSaveEdit={() => saveEdit(user.id)}
            onFormChange={updateEditForm}
            roleSelector={
              canShowRoleSelector(user) ? (
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <span className="whitespace-nowrap text-xs font-medium text-gray-500">
                    {language === 'en' ? 'Role' : '角色'}
                  </span>
                  <select
                    value={profileRoleToMetadataRole(user.role)}
                    onChange={(e) =>
                      updateUserRole(user.id, e.target.value as AppMetadataRole)
                    }
                    disabled={updating === user.id}
                    className="min-w-[140px] px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75] disabled:opacity-50"
                  >
                    <option value="user">
                      {language === 'en' ? 'Owner' : '业主'}
                    </option>
                    <option value="council">
                      {language === 'en' ? 'Council' : '业委会成员'}
                    </option>
                    {profile?.role === 'admin' && (
                      <option value="manager">
                        {language === 'en' ? 'Property Manager' : '物业经理'}
                      </option>
                    )}
                  </select>
                </label>
              ) : undefined
            }
          />
        ))}
      </div>
    </div>
  );
}
