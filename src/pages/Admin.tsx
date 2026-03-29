import { useState, useEffect } from 'react';
import { Shield, Users, Crown, Printer } from 'lucide-react';
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
  const { language } = useLanguage();
  const { profile } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});

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

  const councilMembers = profiles.filter((p) => p.role === 'council');
  const owners = profiles.filter((p) => p.role === 'owner');
  const caretakers = profiles.filter((p) => p.role === 'caretaker');
  const listedIds = new Set(
    [...councilMembers, ...owners, ...caretakers].map((p) => p.id),
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
              ? 'Manage roles and permissions for all users'
              : '管理所有用户的角色和权限'}
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

      <div className="space-y-6">
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
                user={member}
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
                  member.id !== profile.id && (
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
                user={owner}
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
                  <button
                    onClick={() => updateRole(owner.id, 'council')}
                    disabled={updating === owner.id}
                    className="px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors disabled:opacity-50"
                  >
                    {updating === owner.id
                      ? (language === 'en' ? 'Updating...' : '更新中...')
                      : (language === 'en' ? 'Promote to Council' : '提升为理事')}
                  </button>
                }
              />
            ))}
          </div>
        </div>

        {caretakers.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="text-green-600" size={24} />
              <h2 className="text-xl font-semibold text-gray-900">
                {language === 'en' ? 'Caretakers' : '管家'}
              </h2>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {caretakers.length}
              </span>
            </div>

            <div className="space-y-3">
              {caretakers.map((caretaker) => (
                <UserCard
                  key={caretaker.id}
                  user={caretaker}
                  language={language}
                  isEditing={editingId === caretaker.id}
                  editForm={editForm}
                  updating={updating === caretaker.id}
                  onStartEdit={() => startEdit(caretaker)}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={() => saveEdit(caretaker.id)}
                  onFormChange={(field, value) =>
                    setEditForm({ ...editForm, [field]: value })
                  }
                  className="bg-green-50 border-green-200"
                  actions={
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateRole(caretaker.id, 'council')}
                        disabled={updating === caretaker.id}
                        className="px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors disabled:opacity-50"
                      >
                        {updating === caretaker.id
                          ? (language === 'en' ? 'Updating...' : '更新中...')
                          : (language === 'en' ? 'Promote to Council' : '提升为理事')}
                      </button>
                      <button
                        onClick={() => updateRole(caretaker.id, 'owner')}
                        disabled={updating === caretaker.id}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                      >
                        {updating === caretaker.id
                          ? (language === 'en' ? 'Updating...' : '更新中...')
                          : (language === 'en' ? 'Change to Owner' : '改为业主')}
                      </button>
                    </div>
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
                  user={u}
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
