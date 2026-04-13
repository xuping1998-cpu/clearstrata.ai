import { useState, useEffect, useMemo, useCallback } from 'react';
import { Printer, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase, type UserRole, type ProfileAccountStatus } from '../../lib/supabase';
import { withProperty } from '../../lib/supabaseTenant';
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
  status?: ProfileAccountStatus;
}

interface OwnerInfoRecord {
  user_id: string;
  unit_number: string;
}

interface UserWithDetails extends Profile {
  unit_number?: string;
  balance?: number;
}

interface ResidentBrief {
  id: string;
  user_id: string;
  status: string;
  unit_no: string;
  updated_at?: string;
}

/** Per-property membership (role/status) from `property_members`. */
interface PropertyMemberMeta {
  role: UserRole;
  status: string;
}

/** Lowercase canonical UUID string, or null if invalid (avoids PostgREST 400 on bad filter values). */
function normalizeUuid(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim().toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(s)) {
    return null;
  }
  return s;
}

function alertThenReload(message: string) {
  alert(message);
  window.location.reload();
}

export function UserManagementTab({ readOnly = false }: { readOnly?: boolean }) {
  const { language, t } = useLanguage();
  const { profile, user, refreshProfile } = useAuth();
  const { currentPropertyId, roleInProperty: currentRole } = useProperty();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [memberMetaByUserId, setMemberMetaByUserId] = useState<Record<string, PropertyMemberMeta>>({});
  const [residentByUserId, setResidentByUserId] = useState<Record<string, ResidentBrief>>({});
  const [ownerInfos, setOwnerInfos] = useState<OwnerInfoRecord[]>([]);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [activationBusy, setActivationBusy] = useState<string | null>(null);

  const canSelectRoles =
    !readOnly && (profile?.role === 'admin' || currentRole === 'property_admin');
  const canModerateActivation = !readOnly && profile?.role === 'admin';

  const loadData = useCallback(async () => {
    if (!currentPropertyId) return;

    const uid = user?.id ?? profile?.id ?? null;
    console.log('[UserManagementTab] loadData', {
      currentPropertyId,
      currentUserId: uid,
      readOnly,
    });

    const { data: pm, error: pmErr } = await withProperty(
      supabase.from('property_members').select('user_id, role, status') as any,
      currentPropertyId,
    );

    if (pmErr) {
      console.error('[UserManagementTab] property_members error', pmErr);
    }
    const pmRowsRaw = (pm ?? []) as Array<{ user_id: string; role: string; status: string }>;
    const pmRows = readOnly
      ? pmRowsRaw.filter((r) => String(r.status).toLowerCase() !== 'suspended')
      : pmRowsRaw;
    console.log('[UserManagementTab] property_members count', pmRows.length, pmErr ?? '');

    const meta: Record<string, PropertyMemberMeta> = {};
    for (const row of pmRows) {
      if (!row.user_id) continue;
      meta[row.user_id] = { role: row.role as UserRole, status: String(row.status ?? '') };
    }
    setMemberMetaByUserId(meta);

    const userIds = [...new Set(pmRows.map((p) => p.user_id).filter(Boolean))];
    if (userIds.length === 0) {
      setProfiles([]);
      setOwnerInfos([]);
      setResidentByUserId({});
      console.log('[UserManagementTab] no member user_ids after property_members query');
      return;
    }

    const [profRes, ownRes, resRes] = await Promise.all([
      supabase.from('profiles').select('*').in('id', userIds).order('full_name_en'),
      withProperty(
        supabase.from('owner_info').select('user_id, unit_number').order('unit_number') as any,
        currentPropertyId,
      ),
      withProperty(
        supabase.from('residents').select('id, user_id, status, unit_no, updated_at') as any,
        currentPropertyId,
      ),
    ]);

    if (profRes.error) {
      console.error('[UserManagementTab] profiles error', profRes.error);
    }
    if (ownRes.error) {
      console.error('[UserManagementTab] owner_info error', ownRes.error);
    }
    if (resRes.error) {
      console.error('[UserManagementTab] residents error', resRes.error);
    }

    const profileData = profRes.data ?? [];
    const ownerData = ownRes.data ?? [];
    const resData = resRes.data ?? [];

    console.log('[UserManagementTab] fetched counts', {
      profiles: profileData.length,
      owner_info: ownerData.length,
      residents: resData.length,
    });

    const merged = profileData.map((row: Profile) => ({
      ...row,
      role: (meta[row.id]?.role as UserRole) ?? row.role,
    }));
    setProfiles(merged);
    setOwnerInfos(ownerData as OwnerInfoRecord[]);
    const rmap: Record<string, ResidentBrief> = {};
    for (const row of resData as ResidentBrief[]) {
      rmap[row.user_id] = {
        id: row.id,
        user_id: row.user_id,
        status: row.status,
        unit_no: row.unit_no,
        updated_at: row.updated_at,
      };
    }
    setResidentByUserId(rmap);
    console.log('[UserManagementTab] final merged users count', merged.length);
  }, [currentPropertyId, user?.id, profile?.id, readOnly]);

  useEffect(() => {
    if (profile && currentPropertyId) void loadData();
  }, [profile, currentPropertyId, loadData]);

  const activationText = useCallback(
    (userId: string) => {
      const r = residentByUserId[userId];
      if (!r) return t('user_mgmt_activation_none');
      if (r.status === 'pending') return t('user_mgmt_activation_pending');
      if (r.status === 'active') return t('user_mgmt_activation_active');
      if (r.status === 'deregistered') return t('user_mgmt_activation_deregistered');
      return r.status;
    },
    [residentByUserId, t],
  );

  const cardRoleLabel = useCallback(
    (p: Profile) => {
      const roleName = t(p.role);
      const act = activationText(p.id);
      const r = residentByUserId[p.id];
      const unit = r?.unit_no ? ` · ${t('user_mgmt_unit')} ${r.unit_no}` : '';
      const pm = memberMetaByUserId[p.id];
      const membership =
        pm?.status && language === 'en'
          ? ` · Membership: ${pm.status}`
          : pm?.status
            ? ` · 成员状态: ${pm.status}`
            : '';
      return `${roleName} · ${act}${unit}${membership}`;
    },
    [activationText, residentByUserId, memberMetaByUserId, t, language],
  );

  const sortedProfiles = useMemo(() => {
    const copy = [...profiles];
    copy.sort((a, b) => {
      const sa = residentByUserId[a.id]?.status;
      const sb = residentByUserId[b.id]?.status;
      const pa = sa === 'pending' ? 0 : 1;
      const pb = sb === 'pending' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return a.full_name_en.localeCompare(b.full_name_en);
    });
    return copy;
  }, [profiles, residentByUserId]);

  const startEdit = (user: Profile) => {
    if (readOnly) return;
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
    if (readOnly) return;
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

  const canShowRoleSelector = (user: Profile) => canSelectRoles && user.role !== 'admin';

  const updateUserRole = async (userId: string, metaRole: AppMetadataRole) => {
    if (readOnly || !canSelectRoles) return;
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

  const formatDbError = (err: { message: string; hint?: string | null }) => {
    const hint = err.hint ? ` ${err.hint}` : '';
    return `${err.message}${hint}`;
  };

  const approveActivation = async (residentId: string, profileUserId: string) => {
    if (readOnly) return;
    const rid = normalizeUuid(residentId);
    const uid = normalizeUuid(profileUserId);
    if (!rid || !uid) {
      alert(
        language === 'en'
          ? 'Invalid resident or user id. Please refresh the page and try again.'
          : '居住人或用户 ID 无效，请刷新页面后重试。',
      );
      return;
    }

    setActivationBusy(rid);
    try {
      const { data: row, error: fetchErr } = await supabase
        .from('residents')
        .select('id, user_id')
        .eq('id', rid)
        .maybeSingle();

      if (fetchErr) {
        console.error('[UserManagementTab] approve fetch resident:', fetchErr);
        alert(`${t('user_mgmt_activate_fail')} ${formatDbError(fetchErr)}`);
        return;
      }
      const rowUid = row?.user_id != null ? normalizeUuid(row.user_id) : null;
      if (!row || rowUid !== uid) {
        alert(
          language === 'en'
            ? 'Resident record not found or does not match this user.'
            : '未找到居住人记录或与该用户不匹配。',
        );
        return;
      }

      const now = new Date().toISOString();
      const { error: resErr } = await supabase
        .from('residents')
        .update({ status: 'active', updated_at: now })
        .eq('id', rid);

      if (resErr) {
        console.error('[UserManagementTab] approve residents update:', resErr);
        alert(`${t('user_mgmt_activate_fail')} ${formatDbError(resErr)}`);
        return;
      }

      const { error: profErr } = await supabase
        .from('profiles')
        .update({ status: 'active', updated_at: now })
        .eq('id', uid);

      if (profErr) {
        console.error('[UserManagementTab] approve profiles update:', profErr);
        alertThenReload(`${t('user_mgmt_profile_partial')} ${formatDbError(profErr)}`);
        return;
      }

      alertThenReload(t('user_mgmt_activate_success'));
    } finally {
      setActivationBusy(null);
    }
  };

  const rejectActivation = async (residentId: string, profileUserId: string) => {
    if (readOnly) return;
    const rid = normalizeUuid(residentId);
    const uid = normalizeUuid(profileUserId);
    if (!rid || !uid) {
      alert(
        language === 'en'
          ? 'Invalid resident or user id. Please refresh the page and try again.'
          : '居住人或用户 ID 无效，请刷新页面后重试。',
      );
      return;
    }

    setActivationBusy(rid);
    try {
      const { data: row, error: fetchErr } = await supabase
        .from('residents')
        .select('id, user_id')
        .eq('id', rid)
        .maybeSingle();

      if (fetchErr) {
        console.error('[UserManagementTab] reject fetch resident:', fetchErr);
        alert(`${t('user_mgmt_reject_fail')} ${formatDbError(fetchErr)}`);
        return;
      }
      const rowUid = row?.user_id != null ? normalizeUuid(row.user_id) : null;
      if (!row || rowUid !== uid) {
        alert(
          language === 'en'
            ? 'Resident record not found or does not match this user.'
            : '未找到居住人记录或与该用户不匹配。',
        );
        return;
      }

      const now = new Date().toISOString();
      const { error: resErr } = await supabase
        .from('residents')
        .update({ status: 'deregistered', updated_at: now })
        .eq('id', rid);

      if (resErr) {
        console.error('[UserManagementTab] reject residents update:', resErr);
        alert(`${t('user_mgmt_reject_fail')} ${formatDbError(resErr)}`);
        return;
      }

      const { error: profErr } = await supabase
        .from('profiles')
        .update({ status: 'suspended', updated_at: now })
        .eq('id', uid);

      if (profErr) {
        console.error('[UserManagementTab] reject profiles update:', profErr);
        alertThenReload(`${t('user_mgmt_profile_partial')} ${formatDbError(profErr)}`);
        return;
      }

      alertThenReload(t('user_mgmt_reject_success'));
    } finally {
      setActivationBusy(null);
    }
  };

  const printUserList = async () => {
    try {
      console.log('[UserManagementTab] printUserList', {
        currentPropertyId,
        currentUserId: user?.id ?? profile?.id,
        profilesCount: profiles.length,
      });
      const usersWithDetails: UserWithDetails[] = await Promise.all(
        profiles.map(async (user) => {
          const ownerInfo = ownerInfos.find((info) => info.user_id === user.id);
          let balance: number | undefined;

          if (user.role === 'owner') {
            let q = supabase
              .from('ledger_transactions')
              .select('balance')
              .eq('user_id', user.id)
              .order('transaction_date', { ascending: false })
              .limit(1);
            if (currentPropertyId) {
              q = q.eq('property_id', currentPropertyId);
            }
            const { data: latestTransaction, error: ledgerErr } = await q.maybeSingle();
            if (ledgerErr) {
              console.warn('[UserManagementTab] print ledger row', user.id, ledgerErr);
            }
            balance = latestTransaction?.balance as number | undefined;
          }

          return { ...user, unit_number: ownerInfo?.unit_number, balance };
        }),
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
        activation: l ? t('user_mgmt_col_activation') : t('user_mgmt_col_activation'),
        unit: l ? 'Unit #' : '房间号',
        balance: l ? 'Balance' : '物业费余额',
      };

      const tableRows = usersWithDetails
        .sort((a, b) => a.full_name_en.localeCompare(b.full_name_en))
        .map(
          (user) =>
            '<tr>' +
            '<td>' +
            escapeHtml(user.full_name_en) +
            '</td>' +
            '<td>' +
            escapeHtml(user.full_name_zh || '-') +
            '</td>' +
            '<td>' +
            escapeHtml(user.email) +
            '</td>' +
            '<td>' +
            escapeHtml(user.phone || '-') +
            '</td>' +
            '<td>' +
            escapeHtml(roleTranslation(user.role)) +
            '</td>' +
            '<td>' +
            escapeHtml(activationText(user.id)) +
            '</td>' +
            '<td>' +
            escapeHtml(user.unit_number || '-') +
            '</td>' +
            '<td class="' +
            getBalanceClass(user.balance) +
            '">' +
            formatBalance(user.balance) +
            '</td>' +
            '</tr>',
        )
        .join('');

      const html =
        '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>' +
        labels.title +
        '</title>' +
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
        '<h1>' +
        labels.title +
        '</h1>' +
        '<div class="meta"><p><strong>' +
        labels.total +
        ':</strong> ' +
        usersWithDetails.length +
        '</p>' +
        '<p><strong>' +
        labels.date +
        ':</strong> ' +
        new Date().toLocaleDateString(l ? 'en-CA' : 'zh-CN') +
        '</p></div>' +
        '<table><thead><tr>' +
        '<th>' +
        labels.nameEn +
        '</th><th>' +
        labels.nameZh +
        '</th>' +
        '<th>' +
        labels.email +
        '</th><th>' +
        labels.phone +
        '</th>' +
        '<th>' +
        labels.role +
        '</th><th>' +
        labels.activation +
        '</th><th>' +
        labels.unit +
        '</th>' +
        '<th>' +
        labels.balance +
        '</th>' +
        '</tr></thead><tbody>' +
        tableRows +
        '</tbody></table></body></html>';

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
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {readOnly
              ? language === 'en'
                ? 'Property members'
                : '本物业成员'
              : language === 'en'
                ? 'User Management'
                : '用户管理'}
          </h2>
          <p className="text-gray-600 text-sm mt-1 max-w-2xl">
            {readOnly
              ? language === 'en'
                ? 'Members and profiles for the current property (read-only).'
                : '当前物业下的成员与资料（只读）。'
              : t('user_mgmt_subtitle')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void printUserList()}
          className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors shrink-0"
        >
          <Printer size={20} />
          {language === 'en' ? 'Print User List' : '打印用户列表'}
        </button>
      </div>
      <div className="space-y-4">
        {sortedProfiles.map((user) => {
          const res = residentByUserId[user.id];
          const pending = res?.status === 'pending';
          const busyResidentId = res?.id != null ? normalizeUuid(res.id) : null;

          return (
            <div
              key={user.id}
              className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm"
            >
              {pending && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-amber-50 border-b border-amber-100">
                  <span className="text-sm font-medium text-amber-900">
                    {t('user_mgmt_activation_pending')}
                    {res?.unit_no ? ` · ${t('user_mgmt_unit')} ${res.unit_no}` : ''}
                  </span>
                  {canModerateActivation && res && (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => void approveActivation(res.id, user.id)}
                        disabled={busyResidentId != null && activationBusy === busyResidentId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                      >
                        {busyResidentId != null && activationBusy === busyResidentId ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        {t('user_mgmt_approve')}
                      </button>
                      <button
                        type="button"
                        onClick={() => void rejectActivation(res.id, user.id)}
                        disabled={busyResidentId != null && activationBusy === busyResidentId}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                      >
                        <XCircle size={14} />
                        {t('user_mgmt_reject')}
                      </button>
                    </div>
                  )}
                  {!canModerateActivation && pending && (
                    <span className="text-xs text-amber-800">
                      {language === 'en' ? 'Awaiting admin activation' : '待管理员激活'}
                    </span>
                  )}
                </div>
              )}
              <UserCard
                user={{
                  id: user.id,
                  full_name_en: user.full_name_en,
                  full_name_zh: user.full_name_zh,
                  email: user.email,
                  phone: user.phone,
                  roleLabel: cardRoleLabel(user),
                }}
                readOnly={readOnly}
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
