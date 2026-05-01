import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Printer, CheckCircle, XCircle, Loader2, Pencil, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase, type UserRole, type ProfileAccountStatus } from '../../lib/supabase';
import { withProperty } from '../../lib/supabaseTenant';
import { UserCard } from '../../components/UserCard';
import {
  canCouncilManagePropertyMembers,
  canEditPropertyMemberRoles,
  canManageUsersOnProperty,
  canReviewJoinRequests,
} from '../../lib/propertyPermissions';
import { JoinRequestsReviewPanel } from '../../features/join-requests/JoinRequestsReviewPanel';
import { MembersList } from './MembersList';

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

/** Per-property membership (role/status) from `property_members`. Unit lives on `residents.unit_no`. */
interface PropertyMemberMeta {
  role: UserRole;
  status: string;
}

export type StaffTab = 'review' | 'anomaly' | 'members';

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

export function UserManagementTab({
  readOnly = false,
  controlledStaffTab,
  onStaffTabChange,
  hideStaffTabBar = false,
  hidePageTitle = false,
}: {
  readOnly?: boolean;
  /** 由「人员管理」等父级控制当前分区（加入申请、待审核、成员）。 */
  controlledStaffTab?: StaffTab;
  onStaffTabChange?: (t: StaffTab) => void;
  hideStaffTabBar?: boolean;
  hidePageTitle?: boolean;
}) {
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
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  // ── Unit-no edit modal state
  type UnitEditTarget = {
    userId: string;
    userName: string;
    email: string;
    currentUnitNo: string;
  };
  const [unitEditTarget, setUnitEditTarget] = useState<UnitEditTarget | null>(null);
  const [newUnitNo, setNewUnitNo] = useState('');
  const [unitSaving, setUnitSaving] = useState(false);
  const unitInputRef = useRef<HTMLInputElement>(null);

  const [internalStaffTab, setInternalStaffTab] = useState<StaffTab>('review');
  const staffTab = controlledStaffTab ?? internalStaffTab;
  const setStaffTab = (t: StaffTab) => {
    onStaffTabChange?.(t);
    if (controlledStaffTab === undefined) setInternalStaffTab(t);
  };

  /** All gates use `property_members.role` for this property (`currentRole`). */
  const canEditMembers = canEditPropertyMemberRoles(currentRole);
  const canModerateActivation = !readOnly && canEditMembers;
  /** Only council/admin may change a member's unit_no; manager/owner cannot. */
  const canEditUnitNo = !readOnly && canCouncilManagePropertyMembers(currentRole);
  /** 加入申请与待审核相关：与 `canReviewJoinRequests` 一致（含 manager；不含纯 owner） */
  const canStaffJoinInvites = !readOnly && canReviewJoinRequests(currentRole);
  const canViewMembersTab = !readOnly && canManageUsersOnProperty(currentRole);
  const canShowStaffToolbar = canStaffJoinInvites || canViewMembersTab;

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
    const pmRowsRaw = (pm ?? []) as Array<{
      user_id: string;
      role: string;
      status: string;
    }>;
    console.log('[UserManagementTab] property_members count (raw)', pmRowsRaw.length, pmErr ?? '');

    const metaFull: Record<string, PropertyMemberMeta> = {};
    for (const row of pmRowsRaw) {
      if (!row.user_id) continue;
      metaFull[row.user_id] = {
        role: row.role as UserRole,
        status: String(row.status ?? ''),
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

  }, [currentPropertyId, user?.id, profile?.id, readOnly, currentRole]);

  useEffect(() => {
    if (profile && currentPropertyId) void loadData();
  }, [profile, currentPropertyId, loadData]);

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

  const sortedProfiles = useMemo(() => {
    const copy = [...profiles];
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

  const formatDbError = (err: { message: string; hint?: string | null }) => {
    const hint = err.hint ? ` ${err.hint}` : '';
    return `${err.message}${hint}`;
  };

  /** Maps RPC errors to user-friendly Chinese messages. */
  const mapUnitUpdateError = (
    error: { code?: string; message?: string },
    unit: string,
  ): string => {
    const code = String(error.code ?? '');
    const msg = String(error.message ?? '').toLowerCase();
    if (code === 'unit_already_occupied' || msg.includes('occupied')) {
      return `房号 ${unit} 已被其他业主占用`;
    }
    if (code === 'not_authorized' || msg.includes('not authorized') || msg.includes('permission')) {
      return '权限不足，无法修改';
    }
    if (code === 'member_not_found' || msg.includes('member not found')) {
      return '找不到该成员';
    }
    if (code === 'invalid_unit_no' || msg.includes('invalid') || msg.includes('empty')) {
      return '房号不能为空';
    }
    return '保存失败，请重试';
  };

  const openUnitEdit = (p: Profile) => {
    const res = residentByUserId[p.id];
    setUnitEditTarget({
      userId: p.id,
      userName: p.full_name_zh || p.full_name_en || p.email,
      email: p.email,
      currentUnitNo: res?.unit_no ?? '',
    });
    setNewUnitNo(res?.unit_no ?? '');
    setTimeout(() => unitInputRef.current?.focus(), 80);
  };

  const closeUnitEdit = () => {
    setUnitEditTarget(null);
    setNewUnitNo('');
  };

  const handleUpdateUnitNo = async () => {
    if (!unitEditTarget || !currentPropertyId) return;
    const trimmed = newUnitNo.trim();
    if (!trimmed) {
      setToast({ kind: 'error', message: '房号不能为空' });
      return;
    }
    setUnitSaving(true);
    try {
      const { error } = await supabase.rpc('update_member_unit_no', {
        p_property_id: currentPropertyId,
        p_member_user_id: unitEditTarget.userId,
        p_unit_no: trimmed,
      });
      if (error) {
        setToast({ kind: 'error', message: mapUnitUpdateError(error, trimmed) });
        return;
      }
      setToast({ kind: 'success', message: `房号已更新为 ${trimmed}` });
      closeUnitEdit();
      await loadData();
    } catch (e) {
      setToast({ kind: 'error', message: '保存失败，请重试' });
      console.error('[UserManagementTab] handleUpdateUnitNo', e);
    } finally {
      setUnitSaving(false);
    }
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
        .eq('property_id', currentPropertyId)
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
        .eq('id', rid)
        .eq('property_id', currentPropertyId);

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
        .eq('property_id', currentPropertyId)
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
        .eq('id', rid)
        .eq('property_id', currentPropertyId);

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
        {!hidePageTitle ? (
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {readOnly
                ? language === 'en'
                  ? 'Property members'
                  : '本物业成员'
                : language === 'en'
                  ? 'People management'
                  : '人员管理'}
            </h2>
            <p className="text-gray-600 text-sm mt-1 max-w-2xl">
              {readOnly
                ? language === 'en'
                  ? 'Members and profiles for the current property (read-only).'
                  : '当前物业下的成员与资料（只读）。'
                : t('user_mgmt_subtitle')}
            </p>
            {canShowStaffToolbar && !hideStaffTabBar && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <div
                  className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5"
                  role="tablist"
                  aria-label={language === 'en' ? 'People management sections' : '人员管理分区'}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={staffTab === 'review'}
                    onClick={() => setStaffTab('review')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      staffTab === 'review'
                        ? 'bg-white text-[#1D9E75] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {language === 'en' ? 'Join requests' : '加入申请'}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={staffTab === 'anomaly'}
                    onClick={() => setStaffTab('anomaly')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      staffTab === 'anomaly'
                        ? 'bg-white text-[#1D9E75] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {language === 'en' ? 'Exception queue' : '待审核人员'}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={staffTab === 'members'}
                    onClick={() => setStaffTab('members')}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      staffTab === 'members'
                        ? 'bg-white text-[#1D9E75] shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {language === 'en' ? 'Members' : '成员管理'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="min-h-0" />
        )}
        {!hidePageTitle || staffTab === 'members' ? (
          <button
            type="button"
            onClick={() => void printUserList()}
            className="flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-lg hover:bg-[#178a66] transition-colors shrink-0"
          >
            <Printer size={20} />
            {language === 'en' ? 'Print User List' : '打印用户列表'}
          </button>
        ) : null}
      </div>

      {canStaffJoinInvites && currentPropertyId && staffTab === 'review' && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <JoinRequestsReviewPanel embedded />
        </div>
      )}

      {canStaffJoinInvites && currentPropertyId && staffTab === 'anomaly' && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <JoinRequestsReviewPanel embedded anomalyOnly />
        </div>
      )}

      {canViewMembersTab && currentPropertyId && staffTab === 'members' && (
        <div className="space-y-4">
          <MembersList
            propertyId={currentPropertyId}
            language={language}
            canOperate={canCouncilManagePropertyMembers(currentRole)}
            currentUserId={user?.id ?? profile?.id}
            onMembershipUpdated={async () => {
              await loadData();
              await refreshMemberships();
              await refreshProfile();
            }}
          />
        </div>
      )}

      <div className="space-y-4">
        {(readOnly || !canStaffJoinInvites || staffTab === 'members') &&
          sortedProfiles.map((user) => {
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
                />
                {canEditUnitNo && (
                  <div className="px-4 pb-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => openUnitEdit(user)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 text-xs font-medium hover:bg-gray-50 hover:text-gray-900 transition-colors"
                    >
                      <Pencil size={12} />
                      修改房号
                    </button>
                  </div>
                )}
              </div>
            );
          })}
      </div>

      {/* ── 修改房号 Modal ── */}
      {unitEditTarget && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 px-4"
          role="dialog"
          aria-modal="true"
          aria-label="修改房号"
          onClick={(e) => { if (e.target === e.currentTarget) closeUnitEdit(); }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900">修改房号</h3>
              <button
                type="button"
                onClick={closeUnitEdit}
                className="text-gray-400 hover:text-gray-600"
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1 text-sm text-gray-600">
              <p>
                <span className="font-medium text-gray-800">{unitEditTarget.userName}</span>
              </p>
              <p className="text-xs text-gray-400">{unitEditTarget.email}</p>
              {unitEditTarget.currentUnitNo && (
                <p>当前房号：<span className="font-medium text-gray-800">{unitEditTarget.currentUnitNo}</span></p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700" htmlFor="unit-no-input">
                新房号
              </label>
              <input
                id="unit-no-input"
                ref={unitInputRef}
                type="text"
                value={newUnitNo}
                onChange={(e) => setNewUnitNo(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !unitSaving) void handleUpdateUnitNo(); }}
                disabled={unitSaving}
                placeholder="请输入新房号"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D9E75]/50 focus:border-[#1D9E75] disabled:opacity-50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeUnitEdit}
                disabled={unitSaving}
                className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => void handleUpdateUnitNo()}
                disabled={unitSaving}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-medium hover:bg-[#178a66] disabled:opacity-50 transition-colors"
              >
                {unitSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    保存中...
                  </>
                ) : (
                  '保存'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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
