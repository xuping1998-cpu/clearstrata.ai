import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, Crown, Printer, UserCheck } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, type UserRole } from '../lib/supabase';
import { invokeUpdateUserRole } from '../lib/invokeUpdateUserRole';
import { profileRoleToMetadataRole } from '../lib/userRoleMetadata';
import { BackButton } from '../components/BackButton';
import { UserCard } from '../components/UserCard';

interface Profile {
  id: string;
  full_name_en: string;
  full_name_zh?: string;
  email: string;
  phone?: string;
  role: UserRole;
}

export function Admin() {
  const { language, t } = useLanguage();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const canManageRoles = profile?.role === 'admin';
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [pendingResidents, setPendingResidents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});

  const roleLabel = (role: UserRole) => {
    const en: Record<UserRole, string> = {
      owner: 'Owner',
      council: 'Council member',
      admin: 'System administrator',
      manager: 'Property manager',
    };
    const zh: Record<UserRole, string> = {
      owner: '业主',
      council: '业委会成员',
      admin: '系统管理员',
      manager: '物业经理',
    };
    return language === 'en' ? en[role] : zh[role];
  };

  const toCardUser = (p: Profile) => ({
    id: p.id,
    full_name_en: p.full_name_en,
    full_name_zh: p.full_name_zh,
    email: p.email,
    phone: p.phone,
    roleLabel: roleLabel(p.role),
  });

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('full_name_en');

      if (error) {
        console.error('Error loading profiles:', error);
        return;
      }

      setProfiles(data || []);

      const { count } = await supabase
        .from('residents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (count != null) setPendingResidents(count);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (user: Profile) => {
    setEditingId(user.id);
    setEditForm({
      full_name_en: user.full_name_en,
      full_name_zh: user.full_name_zh,
      phone: user.phone,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
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
      console.error('Error updating profile:', error);
      alert(
        language === 'en'
          ? 'Failed to update user information. Please try again.'
          : '更新用户信息失败，请重试。'
      );
    } else {
      await loadProfiles();
      setEditingId(null);
      setEditForm({});
    }

    setUpdating(null);
  };

  const updateRole = async (userId: string, newRole: UserRole) => {
    if (!canManageRoles) {
      alert(
        language === 'en'
          ? 'Only site administrators can change user roles.'
          : '只有系统管理员可以更改用户角色。'
      );
      return;
    }
    if (newRole === 'admin') {
      alert(
        language === 'en'
          ? 'Admin accounts can only be set directly in the database.'
          : '管理员（Admin）账号只能在数据库中直接设置，不能通过网页分配。'
      );
      return;
    }
    const target = profiles.find((p) => p.id === userId);
    if (target?.role === 'admin') {
      alert(
        language === 'en'
          ? 'Administrator roles cannot be changed from this page.'
          : '不能在此页面修改系统管理员角色。'
      );
      return;
    }

    setUpdating(userId);

    const metaRole = profileRoleToMetadataRole(newRole);
    const { data, error } = await invokeUpdateUserRole(userId, metaRole);

    if (error) {
      console.error('Error updating role:', error);
      alert(
        language === 'en'
          ? 'Failed to update role. Deploy update-user-role Edge Function and migrations, or try again.'
          : '更新角色失败。请部署 update-user-role 函数与数据库迁移，或稍后重试。',
      );
    } else {
      const payload = data as { error?: string } | null;
      if (payload?.error) {
        alert(payload.error);
      } else {
        await loadProfiles();
      }
    }

    setUpdating(null);
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    if (profile?.role === 'council' || profile?.role === 'admin') {
      loadProfiles();
    }
  }, [profile]);

  if (profile?.role !== 'council' && profile?.role !== 'admin') {
    return (
      <div className="text-center py-12">
        <Shield className="mx-auto h-16 w-16 text-gray-400 mb-4" />
        <p className="text-xl text-gray-600">
          {language === 'en' ? 'Access Denied' : '访问被拒绝'}
        </p>
        <p className="text-gray-500 mt-2">
          {language === 'en'
            ? 'Only council members or admins can access this page.'
            : '只有理事会成员或管理员才能访问此页面。'}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        {language === 'en' ? 'Loading...' : '加载中...'}
      </div>
    );
  }

  const admins = profiles.filter((p) => p.role === 'admin');
  const councilMembers = profiles.filter((p) => p.role === 'council');
  const owners = profiles.filter((p) => p.role === 'owner');
  const managers = profiles.filter((p) => p.role === 'manager');
  const listedIds = new Set(
    [...admins, ...councilMembers, ...owners, ...managers].map((p) => p.id),
  );
  const otherRoles = profiles.filter((p) => !listedIds.has(p.id));

  return (
    <div>
      <BackButton />
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {language === 'en' ? 'User Management' : '用户管理'}
          </h1>
          <p className="text-gray-600">
            {language === 'en'
              ? 'Accounts, roles, and access: assign council or property manager here (admins only). Use the sidebar for finance, meetings, disputes, and all council tools.'
              : '账号与权限：在此指定业委会或物业经理（仅管理员可操作角色）。财务、会议、纠纷及业委会功能请使用左侧导航。'}
          </p>
          <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-3 max-w-2xl">
            {language === 'en'
              ? 'New sign-ups get profile role Owner with a pending resident record until activated under Owner Information → User Management. Admin accounts stay database-only.'
              : '新注册用户为业主并带有「待激活」居住人档案，请在「业主信息 → 用户管理」中批准。系统管理员（Admin）仅能通过数据库设置。'}
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors print:hidden"
        >
          <Printer size={20} />
          {language === 'en' ? 'Print' : '打印'}
        </button>
      </div>

      {pendingResidents > 0 && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-2 text-amber-950">
            <UserCheck className="shrink-0 mt-0.5" size={20} />
            <div>
              <p className="font-medium">
                {t('admin_pending_residents_banner').replace('{n}', String(pendingResidents))}
              </p>
              <p className="text-sm text-amber-900/90 mt-1">{t('admin_review_residents_hint')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/owner-info?tab=users')}
            className="shrink-0 px-4 py-2 rounded-lg bg-amber-800 text-white text-sm font-medium hover:bg-amber-900 transition-colors"
          >
            {t('admin_review_residents_cta')}
          </button>
        </div>
      )}

      <div className="space-y-6">
        {admins.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-purple-700" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">
                {language === 'en' ? 'System administrators' : '系统管理员'}
              </h2>
              <span className="px-2 py-1 bg-purple-100 text-purple-900 rounded-full text-sm font-medium">
                {admins.length}
              </span>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {language === 'en'
                ? 'Admin roles are not editable from this app.'
                : '管理员角色不可在本应用中修改。'}
            </p>
            <div className="space-y-3">
              {admins.map((a) => (
                <UserCard
                  key={a.id}
                  user={toCardUser(a)}
                  language={language}
                  isEditing={editingId === a.id}
                  editForm={editForm}
                  updating={updating === a.id}
                  onStartEdit={() => startEdit(a)}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={() => saveEdit(a.id)}
                  onFormChange={(field, value) => setEditForm({ ...editForm, [field]: value })}
                  className="bg-purple-50/60 border-purple-200"
                />
              ))}
            </div>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="text-yellow-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">
              {language === 'en' ? 'Council Members' : '理事会成员'}
            </h2>
            <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
              {councilMembers.length}
            </span>
          </div>

          <div className="space-y-3">
            {councilMembers.map((member) => (
                <UserCard
                  key={member.id}
                  user={toCardUser(member)}
                language={language}
                isEditing={editingId === member.id}
                editForm={editForm}
                updating={updating === member.id}
                onStartEdit={() => startEdit(member)}
                onCancelEdit={cancelEdit}
                onSaveEdit={() => saveEdit(member.id)}
                onFormChange={(field, value) =>
                  setEditForm({ ...editForm, [field]: value })
                }
                className="bg-yellow-50 border-yellow-200"
                actions={
                  canManageRoles &&
                  member.id !== profile?.id && (
                    <button
                      onClick={() => updateRole(member.id, 'owner')}
                      disabled={updating === member.id}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      {updating === member.id
                        ? (language === 'en' ? 'Updating...' : '更新中...')
                        : (language === 'en' ? 'Demote to Owner' : '降为业主')}
                    </button>
                  )
                }
              />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-900">
              {language === 'en' ? 'Property Owners' : '业主'}
            </h2>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {owners.length}
            </span>
          </div>

          <div className="space-y-3">
            {owners.map((owner) => (
                <UserCard
                  key={owner.id}
                  user={toCardUser(owner)}
                language={language}
                isEditing={editingId === owner.id}
                editForm={editForm}
                updating={updating === owner.id}
                onStartEdit={() => startEdit(owner)}
                onCancelEdit={cancelEdit}
                onSaveEdit={() => saveEdit(owner.id)}
                onFormChange={(field, value) =>
                  setEditForm({ ...editForm, [field]: value })
                }
                className="bg-gray-50 border-gray-200"
                actions={
                  canManageRoles ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => updateRole(owner.id, 'council')}
                        disabled={updating === owner.id}
                        className="px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors disabled:opacity-50"
                      >
                        {updating === owner.id
                          ? (language === 'en' ? 'Updating...' : '更新中...')
                          : (language === 'en' ? 'Promote to Council' : '提升为理事')}
                      </button>
                      <button
                        onClick={() => updateRole(owner.id, 'manager')}
                        disabled={updating === owner.id}
                        className="px-4 py-2 bg-teal-700 text-white rounded-lg hover:bg-teal-800 transition-colors disabled:opacity-50"
                      >
                        {updating === owner.id
                          ? (language === 'en' ? 'Updating...' : '更新中...')
                          : (language === 'en'
                            ? 'Assign as Property Manager'
                            : '设为物业经理')}
                      </button>
                    </div>
                  ) : undefined
                }
              />
            ))}
          </div>
        </div>

        {managers.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-teal-600" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">
                {language === 'en' ? 'Property Managers' : '物业经理'}
              </h2>
              <span className="px-2 py-1 bg-teal-100 text-teal-900 rounded-full text-sm font-medium">
                {managers.length}
              </span>
            </div>

            <div className="space-y-3">
              {managers.map((mgr) => (
                <UserCard
                  key={mgr.id}
                  user={toCardUser(mgr)}
                  language={language}
                  isEditing={editingId === mgr.id}
                  editForm={editForm}
                  updating={updating === mgr.id}
                  onStartEdit={() => startEdit(mgr)}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={() => saveEdit(mgr.id)}
                  onFormChange={(field, value) =>
                    setEditForm({ ...editForm, [field]: value })
                  }
                  className="bg-teal-50 border-teal-200"
                  actions={
                    canManageRoles ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => updateRole(mgr.id, 'council')}
                          disabled={updating === mgr.id}
                          className="px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors disabled:opacity-50"
                        >
                          {updating === mgr.id
                            ? (language === 'en' ? 'Updating...' : '更新中...')
                            : (language === 'en' ? 'Promote to Council' : '提升为理事')}
                        </button>
                        <button
                          onClick={() => updateRole(mgr.id, 'owner')}
                          disabled={updating === mgr.id}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          {updating === mgr.id
                            ? (language === 'en' ? 'Updating...' : '更新中...')
                            : (language === 'en' ? 'Change to Owner' : '改为业主')}
                        </button>
                      </div>
                    ) : undefined
                  }
                />
              ))}
            </div>
          </div>
        )}

        {otherRoles.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Users className="text-gray-600" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">
                {language === 'en' ? 'Other roles' : '其他角色'}
              </h2>
              <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">
                {otherRoles.length}
              </span>
            </div>
            <div className="space-y-3">
              {otherRoles.map((u) => (
                <UserCard
                  key={u.id}
                  user={toCardUser(u)}
                  language={language}
                  isEditing={editingId === u.id}
                  editForm={editForm}
                  updating={updating === u.id}
                  onStartEdit={() => startEdit(u)}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={() => saveEdit(u.id)}
                  onFormChange={(field, value) =>
                    setEditForm({ ...editForm, [field]: value })
                  }
                  className="bg-gray-50 border-gray-200"
                  actions={
                    <span className="text-xs text-gray-500 px-2">
                      {language === 'en' ? `Role: ${u.role}` : `角色：${u.role}`}
                    </span>
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
