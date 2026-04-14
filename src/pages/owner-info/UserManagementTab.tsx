import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Printer, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase, type UserRole, type ProfileAccountStatus } from '../../lib/supabase';
import { withProperty } from '../../lib/supabaseTenant';
import { invokeUpdateUserRole } from '../../lib/invokeUpdateUserRole';
import { type AppMetadataRole, profileRoleToMetadataRole } from '../../lib/userRoleMetadata';
import { UserCard } from '../../components/UserCard';
import { canEditPropertyMemberRoles } from '../../lib/propertyPermissions';
import { CLEARSTRATA_PROPERTY_MEMBERS_CHANGED } from '../../lib/unifiedPropertyEntry';
import { approvePendingUser, type PendingApplicant } from '../../lib/approvePendingUser';

interface Profile {
  id: string;
  full_name_en: string;
  full_name_zh?: string;
  email: string;
  phone?: string;
  role: UserRole;
  status?: ProfileAccountStatus;
  preferred_language?: string | null;
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
  name_en?: string | null;
  name_zh?: string | null;
  updated_at?: string;
}

/** Display name: profiles zh/en first, then residents name fields, then email. */
function resolveDirectoryDisplayName(
  p: Profile | null | undefined,
  r: ResidentBrief | null | undefined,
  emailFallback: string,
): string {
  const fromProfile =
    (p?.full_name_zh && String(p.full_name_zh).trim()) ||
    (p?.full_name_en && String(p.full_name_en).trim()) ||
    '';
  const fromResident =
    (r?.name_zh && String(r.name_zh).trim()) || (r?.name_en && String(r.name_en).trim()) || '';
  return fromProfile || fromResident || (emailFallback && emailFallback.trim()) || '—';
}

/** Per-property membership (role/status) from `property_members`. */
interface PropertyMemberMeta {
  role: UserRole;
  status: string;
  unit_number?: string | null;
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
  const { currentPropertyId, roleInProperty: currentRole, refreshMemberships } = useProperty();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [memberMetaByUserId, setMemberMetaByUserId] = useState<Record<string, PropertyMemberMeta>>({});
  const [residentByUserId, setResidentByUserId] = useState<Record<string, ResidentBrief>>({});
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>({});
  const [updating, setUpdating] = useState<string | null>(null);
  const [activationBusy, setActivationBusy] = useState<string | null>(null);
  const [membershipReviewBusy, setMembershipReviewBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  /** All gates use `property_members.role` for this property (`currentRole`). */
  const canEditMembers = canEditPropertyMemberRoles(currentRole);
  const canSelectRoles = !readOnly && canEditMembers;
  const canModerateActivation = !readOnly && canEditMembers;
  const canShowStaffToolbar = !readOnly && canEditMembers;
  /** Pending membership approval: admin / council only (not property_admin). */
  const canReviewPending =
    !readOnly && (currentRole === 'admin' || currentRole === 'council');

  const loadData = useCallback(async () => {
    if (!currentPropertyId) return;

    const uid = user?.id ?? profile?.id ?? null;
    console.log('[UserManagementTab] loadData', {
      currentPropertyId,
      currentUserId: uid,
      readOnly,
    });

    const { data: pm, error: pmErr } = await withProperty(
      supabase.from('property_members').select('user_id, role, status, unit_number') as any,
      currentPropertyId,
    );

    if (pmErr) {
      console.error('[UserManagementTab] property_members error', pmErr);
    }
    const pmRowsRaw = (pm ?? []) as Array<{
      user_id: string;
      role: string;
      status: string;
      unit_number?: string | null;
    }>;
    console.log('[UserManagementTab] property_members count (raw)', pmRowsRaw.length, pmErr ?? '');

    const metaFull: Record<string, PropertyMemberMeta> = {};
    for (const row of pmRowsRaw) {
      if (!row.user_id) continue;
      metaFull[row.user_id] = {
        role: row.role as UserRole,
        status: String(row.status ?? ''),
        unit_number: row.unit_number ?? null,
      };
    }
    setMemberMetaByUserId(metaFull);

    const resRes = await withProperty(
      supabase
        .from('residents')
        .select('id, user_id, status, unit_no, name_en, name_zh, updated_at') as any,
      currentPropertyId,
    );

    if (resRes.error) {
      console.error('[UserManagementTab] residents error', resRes.error);
    }

    const resData = (resRes.data ?? []) as ResidentBrief[];

    const rmap: Record<string, ResidentBrief> = {};
    for (const row of resData) {
      rmap[row.user_id] = {
        id: row.id,
        user_id: row.user_id,
        status: row.status,
        unit_no: row.unit_no,
        name_en: row.name_en,
        name_zh: row.name_zh,
        updated_at: row.updated_at,
      };
    }

    /** Member list is driven only by `property_members` (trigger keeps it aligned with residents). */
    const pmUserIds = new Set(
      pmRowsRaw
        .filter((row) => {
          if (!row.user_id) return false;
          if (readOnly && String(row.status).toLowerCase() === 'suspended') return false;
          return true;
        })
        .map((row) => row.user_id),
    );
    const userIds = [...pmUserIds];

    if (userIds.length === 0) {
      setProfiles([]);
      setResidentByUserId({});
      console.log('[UserManagementTab] merged user id set empty');
      return;
    }

    const profRes = await supabase
      .from('profiles')
      .select(
        'id, full_name_en, full_name_zh, email, phone, role, status, preferred_language, created_at, updated_at',
      )
      .in('id', userIds)
      .order('full_name_en');
    if (profRes.error) {
      console.error('[UserManagementTab] profiles error', profRes.error);
    }
    const profileData = (profRes.data ?? []) as Profile[];
    const profileById = new Map(profileData.map((row) => [row.id, row]));

    const merged: Profile[] = userIds.map((uid) => {
      const p = profileById.get(uid);
      const r = rmap[uid];
      const m = metaFull[uid];
      const email = (p?.email ?? '').trim();
      const fzh = (p?.full_name_zh?.trim() || r?.name_zh?.trim() || '') as string;
      const fen = (p?.full_name_en?.trim() || r?.name_en?.trim() || '') as string;
      const fallback = resolveDirectoryDisplayName(p, r, email);
      let full_name_zh = fzh;
      let full_name_en = fen;
      if (!fzh && !fen) {
        full_name_zh = fallback;
        full_name_en = fallback;
      }
      const base: Profile = p
        ? {
            ...p,
            full_name_zh,
            full_name_en,
            role: (m?.role as UserRole) ?? p.role,
          }
        : {
            id: uid,
            full_name_zh,
            full_name_en,
            email: email || '—',
            phone: '',
            role: (m?.role as UserRole) ?? 'owner',
          };
      return base;
    });

    setProfiles(merged);
    setResidentByUserId(rmap);
    console.log('[UserManagementTab] fetched counts', {
      property_members: pmRowsRaw.length,
      profiles: profileData.length,
      residents: resData.length,
      merged_users: merged.length,
    });

    const pendingPmCount = pmRowsRaw.filter(
      (r) => String(r.status ?? '').toLowerCase() === 'pending',
    ).length;
    if (!readOnly && (currentRole === 'admin' || currentRole === 'council')) {
      console.log('[PropertyMemberReview]', {
        currentRole,
        pendingUsersCount: pendingPmCount,
      });
    }
  }, [currentPropertyId, user?.id, profile?.id, readOnly, currentRole]);

  useEffect(() => {
    if (profile && currentPropertyId) void loadData();
  }, [profile, currentPropertyId, loadData]);

  useEffect(() => {
    const on = () => void loadData();
    window.addEventListener(CLEARSTRATA_PROPERTY_MEMBERS_CHANGED, on);
    return () => window.removeEventListener(CLEARSTRATA_PROPERTY_MEMBERS_CHANGED, on);
  }, [loadData]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

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
      const memberStatusLabel =
        pm?.status && language === 'en'
          ? `Status: ${pm.status}`
          : pm?.status
            ? `状态: ${pm.status}`
            : language === 'en'
              ? 'Status: —'
              : '状态: —';
      return `${roleName} · ${memberStatusLabel} · ${act}${unit}`;
    },
    [activationText, residentByUserId, memberMetaByUserId, t, language],
  );

  const pendingMembershipProfiles = useMemo(
    () =>
      profiles.filter(
        (p) => String(memberMetaByUserId[p.id]?.status ?? '').toLowerCase() === 'pending',
      ),
    [profiles, memberMetaByUserId],
  );

  const sortedProfiles = useMemo(() => {
    let copy = [...profiles];
    if (canReviewPending) {
      copy = copy.filter(
        (p) => String(memberMetaByUserId[p.id]?.status ?? '').toLowerCase() !== 'pending',
      );
    }
    copy.sort((a, b) => {
      const sa = residentByUserId[a.id]?.status;
      const sb = residentByUserId[b.id]?.status;
      const pa = sa === 'pending' ? 0 : 1;
      const pb = sb === 'pending' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      const da = resolveDirectoryDisplayName(a, residentByUserId[a.id], a.email);
      const db = resolveDirectoryDisplayName(b, residentByUserId[b.id], b.email);
      return da.localeCompare(db);
    });
    return copy;
  }, [profiles, residentByUserId, canReviewPending, memberMetaByUserId]);

  const approvePendingMember = async (row: Profile) => {
    if (!canReviewPending || !currentPropertyId) return;
    const uid = normalizeUuid(row.id);
    if (!uid) {
      setToast({
        kind: 'error',
        message: language === 'en' ? 'Invalid user id.' : '用户 ID 无效。',
      });
      return;
    }
    const meta = memberMetaByUserId[row.id];
    const res = residentByUserId[row.id];
    const unitRaw =
      (meta?.unit_number && String(meta.unit_number).trim()) ||
      (res?.unit_no && String(res.unit_no).trim()) ||
      '';
    const email = (row.email ?? '').trim();
    if (!email || email === '—') {
      setToast({
        kind: 'error',
        message: language === 'en' ? 'Applicant email is required.' : '申请人邮箱不能为空。',
      });
      return;
    }

    setMembershipReviewBusy(uid);
    try {
      const applicant: PendingApplicant = {
        email,
        unit_no: unitRaw,
        name_en: row.full_name_en ?? null,
        name_zh: row.full_name_zh ?? null,
        phone: row.phone ?? null,
        language_pref: row.preferred_language ?? 'en',
      };

      const { data, error } = await approvePendingUser(supabase, {
        userId: uid,
        propertyId: currentPropertyId,
        applicant,
        context: { currentPropertyId, currentRole },
      });

      if (error) {
        console.error('[approvePendingMember]', error);
        setToast({
          kind: 'error',
          message:
            language === 'en'
              ? `Approval failed: ${error.message}`
              : `审批失败：${error.message}`,
        });
        return;
      }

      const rpcRow = data as { ok?: boolean; error?: string } | null;
      if (!rpcRow?.ok) {
        console.error('[approvePendingMember] rpc', data);
        setToast({
          kind: 'error',
          message:
            language === 'en'
              ? `Could not approve: ${rpcRow?.error ?? 'unknown'}`
              : `无法完成审批：${rpcRow?.error ?? 'unknown'}`,
        });
        return;
      }

      await loadData();
      await refreshMemberships();
      setToast({
        kind: 'success',
        message: language === 'en' ? 'Approved — user is now on the property.' : '审批通过，用户已加入物业',
      });
    } finally {
      setMembershipReviewBusy(null);
    }
  };

  const reviewMembership = async (userId: string, action: 'suspend' | 'remove') => {
    if (!canReviewPending || !currentPropertyId) return;
    const uid = normalizeUuid(userId);
    if (!uid) {
      alert(language === 'en' ? 'Invalid user id.' : '用户 ID 无效。');
      return;
    }

    const pendingCount = profiles.filter(
      (p) => String(memberMetaByUserId[p.id]?.status ?? '').toLowerCase() === 'pending',
    ).length;

    setMembershipReviewBusy(uid);
    console.log('[PropertyMemberReview]', {
      currentRole,
      pendingUsersCount: pendingCount,
      approveTargetUserId: uid,
    });

    const pAction = action === 'suspend' ? 'suspend' : 'remove';
    const { data, error } = await supabase.rpc('review_property_member_membership' as any, {
      p_property_id: currentPropertyId,
      p_user_id: uid,
      p_action: pAction,
    });

    console.log('[PropertyMemberReview] approve result', data);
    if (error) {
      console.error('[PropertyMemberReview] approve error', error);
    }

    setMembershipReviewBusy(null);

    if (error) {
      alert(
        language === 'en'
          ? `Request failed: ${error.message}`
          : `操作失败：${error.message}`,
      );
      return;
    }

    const row = data as { ok?: boolean; error?: string } | null;
    if (!row?.ok) {
      alert(
        language === 'en'
          ? `Could not complete: ${row?.error ?? 'unknown'}`
          : `无法完成：${row?.error ?? 'unknown'}`,
      );
      return;
    }

    await loadData();
    await refreshMemberships();
  };

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
    if (!currentPropertyId) {
      alert(language === 'en' ? 'No property selected.' : '未选择物业。');
      setUpdating(null);
      return;
    }

    const { data, error } = await invokeUpdateUserRole(userId, metaRole, currentPropertyId);

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
    await refreshMemberships();
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
          const resRow = residentByUserId[user.id];
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

          return { ...user, unit_number: resRow?.unit_no, balance };
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
        .sort((a, b) =>
          resolveDirectoryDisplayName(a, residentByUserId[a.id], a.email).localeCompare(
            resolveDirectoryDisplayName(b, residentByUserId[b.id], b.email),
          ),
        )
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
    <div className="space-y-6 relative">
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
          {canShowStaffToolbar && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Link
                to="/admin/join-requests"
                className="inline-flex items-center rounded-lg border border-[#1D9E75] bg-white px-3 py-1.5 text-sm font-medium text-[#1D9E75] hover:bg-emerald-50"
              >
                {language === 'en' ? 'Review' : '审核'}
              </Link>
              <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700">
                {language === 'en' ? 'Edit roles' : '修改角色'}
              </span>
              <span className="inline-flex items-center rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700">
                {language === 'en' ? 'Member admin' : '成员管理'}
              </span>
            </div>
          )}
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

      {pendingMembershipProfiles.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-3">
          <h3 className="text-lg font-semibold text-amber-950">
            {language === 'en' ? 'Pending members (property)' : '待审批成员（物业成员）'}
          </h3>
          <p className="text-sm text-amber-900/90">
            {language === 'en'
              ? 'These users have membership status pending on this property (property_members).'
              : '以下用户在当前物业的 property_members 表中为待审批（pending）状态。'}
          </p>
          <div className="overflow-x-auto rounded-lg border border-amber-100 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-3 py-2 font-medium text-gray-700">
                    {language === 'en' ? 'Name' : '姓名'}
                  </th>
                  <th className="px-3 py-2 font-medium text-gray-700">
                    {language === 'en' ? 'Email' : '邮箱'}
                  </th>
                  <th className="px-3 py-2 font-medium text-gray-700">
                    {language === 'en' ? 'Unit' : '单元号'}
                  </th>
                  <th className="px-3 py-2 font-medium text-gray-700">
                    {language === 'en' ? 'Role' : '角色'}
                  </th>
                  <th className="px-3 py-2 font-medium text-gray-700">
                    {language === 'en' ? 'Status' : '状态'}
                  </th>
                  {canReviewPending && (
                    <th className="px-3 py-2 font-medium text-gray-700">
                      {language === 'en' ? 'Actions' : '操作'}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {pendingMembershipProfiles.map((row) => {
                  const meta = memberMetaByUserId[row.id];
                  const res = residentByUserId[row.id];
                  const unit =
                    (meta?.unit_number && String(meta.unit_number).trim()) ||
                    (res?.unit_no && String(res.unit_no).trim()) ||
                    '—';
                  const displayName = resolveDirectoryDisplayName(row, res, row.email);
                  const busy = membershipReviewBusy === row.id;
                  return (
                    <tr key={row.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-3 py-2 text-gray-900">{displayName}</td>
                      <td className="px-3 py-2 text-gray-700">{row.email || '—'}</td>
                      <td className="px-3 py-2 text-gray-700">{unit}</td>
                      <td className="px-3 py-2 text-gray-700">{t(row.role)}</td>
                      <td className="px-3 py-2 text-gray-700">{meta?.status ?? 'pending'}</td>
                      {canReviewPending && (
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void approvePendingMember(row)}
                              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
                            >
                              {busy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                              {language === 'en' ? 'Approve' : '审批通过'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => void reviewMembership(row.id, 'suspend')}
                              className="inline-flex items-center gap-1 rounded-lg bg-amber-700 px-2.5 py-1 text-xs font-medium text-white hover:bg-amber-800 disabled:opacity-50"
                            >
                              {language === 'en' ? 'Reject (suspend)' : '拒绝（暂停）'}
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => {
                                const ok =
                                  language === 'en'
                                    ? window.confirm(
                                        'Remove this pending membership? The user will lose access to this property.',
                                      )
                                    : window.confirm(
                                        '确定移除该待审批成员？用户将失去本物业访问权限。',
                                      );
                                if (ok) void reviewMembership(row.id, 'remove');
                              }}
                              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                            >
                              <XCircle size={12} />
                              {language === 'en' ? 'Reject (remove)' : '拒绝（移除）'}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {sortedProfiles.map((user) => {
          const res = residentByUserId[user.id];
          const pending = res?.status === 'pending';
          const pmPending =
            String(memberMetaByUserId[user.id]?.status ?? '').toLowerCase() === 'pending';
          const hideResidentActivationStrip = canReviewPending && pmPending;
          const busyResidentId = res?.id != null ? normalizeUuid(res.id) : null;

          return (
            <div
              key={user.id}
              className="rounded-xl border border-gray-200 overflow-hidden bg-white shadow-sm"
            >
              {pending && !hideResidentActivationStrip && (
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
                        {(currentRole === 'admin' ||
                          currentRole === 'property_admin' ||
                          currentRole === 'council') && (
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

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-[100] max-w-md -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.kind === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}
