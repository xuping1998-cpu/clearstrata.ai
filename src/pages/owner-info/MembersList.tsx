import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Pencil, X } from 'lucide-react';
import { supabase, type UserRole } from '../../lib/supabase';
import { withProperty } from '../../lib/supabaseTenant';
import {
  type PropertyMemberDirectoryRole,
  type PropertyMemberRowStatus,
  formatPropertyMemberGuardError,
  freezeMember,
  isLastActiveCouncilRow,
  kickMember,
  rowActionsDisabled,
  setMemberCouncil,
  setMemberRole,
} from '../../lib/propertyMemberManage';

const DROPDOWN_ROLES: PropertyMemberDirectoryRole[] = ['owner', 'council', 'manager'];

export type MembersListRow = {
  memberId: string;
  userId: string;
  role: UserRole;
  /** Sourced from `property_members.status`. */
  status: PropertyMemberRowStatus | string;
  fullName: string;
  email: string;
  /** From `property_members.unit_no` (primary), falls back to `residents.unit_no`. */
  unitNo: string | null;
};

function resolveName(
  fullNameZh: string | null | undefined,
  fullNameEn: string | null | undefined,
  email: string,
): string {
  const zh = fullNameZh?.trim();
  const en = fullNameEn?.trim();
  if (zh) return zh;
  if (en) return en;
  return email.trim() || '—';
}

function isDropdownRole(r: UserRole): r is PropertyMemberDirectoryRole {
  return r === 'owner' || r === 'council' || r === 'manager';
}

export type MembersListProps = {
  propertyId: string;
  language: 'en' | 'zh';
  /** Only active `council` on this property may mutate rows (RLS enforces the same). */
  canOperate: boolean;
  currentUserId: string | undefined;
  onMembershipUpdated?: () => void | Promise<void>;
};

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active') return 'bg-emerald-50 text-emerald-900 border-emerald-100';
  if (s === 'pending') return 'bg-amber-50 text-amber-900 border-amber-100';
  if (s === 'suspended') return 'bg-orange-50 text-orange-900 border-orange-100';
  if (s === 'inactive') return 'bg-slate-100 text-slate-800 border-slate-200';
  if (s === 'removed') return 'bg-red-50 text-red-900 border-red-100';
  return 'bg-gray-50 text-gray-700 border-gray-200';
}

function mapUnitUpdateError(error: { code?: string; message?: string }, unit: string): string {
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
}

type UnitEditTarget = {
  userId: string;
  memberId: string;
  fullName: string;
  email: string;
  currentUnitNo: string;
};

/**
 * `property_members` directory joined with `profiles` for one property.
 * - `role` and `status` come exclusively from `property_members`.
 * - `unit_no` comes from `property_members.unit_no` (primary), falling back to `residents.unit_no`.
 * Mutations: `property_members.id` via RPC.
 */
export function MembersList({ propertyId, language, canOperate, currentUserId, onMembershipUpdated }: MembersListProps) {
  const en = language === 'en';
  const [rows, setRows] = useState<MembersListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);

  // Unit-edit modal state
  const [unitEditTarget, setUnitEditTarget] = useState<UnitEditTarget | null>(null);
  const [newUnitNo, setNewUnitNo] = useState('');
  const [unitSaving, setUnitSaving] = useState(false);
  const unitInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(t);
  }, [toast]);

  const labels = useMemo(
    () => ({
      title: en ? 'Property members' : '本物业成员',
      name: en ? 'Name' : '姓名',
      email: en ? 'Email' : '邮箱',
      role: en ? 'Role' : '角色',
      status: en ? 'Status' : '状态',
      unit: en ? 'Unit' : '房号',
      actions: en ? 'Actions' : '操作',
      empty: en ? 'No members found for this property.' : '暂无成员。',
      loadErr: en ? 'Could not load members.' : '无法加载成员列表。',
      setCouncil: en ? 'Set as council' : '设为业委会',
      freeze: en ? 'Freeze' : '冻结',
      kick: en ? 'Remove' : '踢出',
      editUnit: en ? 'Edit unit' : '修改房号',
      readOnlyHint: en ? 'Only active council members can manage this list.' : '仅业委会（council）可管理成员。',
      notEditableRole: en ? 'Role managed elsewhere' : '此类角色不在此编辑',
      lastCouncilHint: en ? 'Last active council member' : '唯一在任业委会成员',
      selfHint: en ? 'Cannot change yourself' : '不可操作本人',
      removedHint: en ? 'Removed' : '已移除',
    }),
    [en],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const loadErrPrefix = en ? 'Could not load members.' : '无法加载成员列表。';
    try {
      // 1. property_members — role, status, unit_no (canonical source)
      const { data: pm, error: pmErr } = await withProperty(
        supabase.from('property_members').select('id, user_id, role, status, unit_no') as any,
        propertyId,
      );
      if (pmErr) {
        setRows([]);
        setError(`${loadErrPrefix} ${pmErr.message}`);
        return;
      }
      const pmRows = (pm ?? []) as Array<{
        id: string;
        user_id: string;
        role: UserRole;
        status: string;
        unit_no: string | null;
      }>;
      const userIds = pmRows.map((r) => r.user_id).filter(Boolean);
      if (userIds.length === 0) {
        setRows([]);
        return;
      }

      // 2. profiles — display names / emails
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name_en, full_name_zh, email')
        .in('id', userIds);
      if (pErr) {
        setRows([]);
        setError(`${loadErrPrefix} ${pErr.message}`);
        return;
      }

      // 3. residents — unit_no fallback only (used when property_members.unit_no is empty)
      const { data: resRows } = await withProperty(
        supabase.from('residents').select('user_id, unit_no').not('user_id', 'is', null) as any,
        propertyId,
      );
      const residentUnitByUserId = new Map<string, string>();
      for (const row of (resRows ?? []) as Array<{ user_id: string | null; unit_no: string | null }>) {
        if (!row.user_id) continue;
        const u = String(row.unit_no ?? '').trim();
        if (u) residentUnitByUserId.set(row.user_id, u);
      }

      const byId = new Map((prof ?? []).map((p: any) => [p.id as string, p]));
      const merged: MembersListRow[] = pmRows.map((m) => {
        const p = byId.get(m.user_id);
        const email = (p?.email as string | undefined)?.trim() || '—';
        // property_members.unit_no is canonical; residents.unit_no is a fallback only
        const pmUnit = (m.unit_no ?? '').trim();
        const unitNo = pmUnit || residentUnitByUserId.get(m.user_id) || null;
        return {
          memberId: m.id,
          userId: m.user_id,
          role: m.role,
          status: String(m.status ?? 'active') as PropertyMemberRowStatus,
          fullName: resolveName(p?.full_name_zh, p?.full_name_en, email),
          email,
          unitNo: unitNo && unitNo.trim() ? unitNo.trim() : null,
        };
      });
      merged.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setRows(merged);
    } finally {
      setLoading(false);
    }
  }, [propertyId, en]);

  useEffect(() => {
    void load();
  }, [load]);

  // ── Unit edit modal handlers ──────────────────────────────────────────────

  const openUnitEdit = (row: MembersListRow) => {
    setUnitEditTarget({
      userId: row.userId,
      memberId: row.memberId,
      fullName: row.fullName,
      email: row.email,
      currentUnitNo: row.unitNo ?? '',
    });
    setNewUnitNo(row.unitNo ?? '');
    setTimeout(() => unitInputRef.current?.focus(), 80);
  };

  const closeUnitEdit = () => {
    setUnitEditTarget(null);
    setNewUnitNo('');
  };

  const handleUpdateUnitNo = async () => {
    if (!unitEditTarget) return;
    const trimmed = newUnitNo.trim();
    if (!trimmed) {
      setToast({ kind: 'error', message: '房号不能为空' });
      return;
    }
    setUnitSaving(true);
    try {
      const { error: rpcErr } = await supabase.rpc('update_member_unit_no', {
        p_property_id: propertyId,
        p_member_user_id: unitEditTarget.userId,
        p_unit_no: trimmed,
      });
      if (rpcErr) {
        setToast({ kind: 'error', message: mapUnitUpdateError(rpcErr, trimmed) });
        return;
      }
      setToast({ kind: 'success', message: `房号已更新为 ${trimmed}` });
      closeUnitEdit();
      await load();
      await onMembershipUpdated?.();
    } catch (e) {
      setToast({ kind: 'error', message: '保存失败，请重试' });
      console.error('[MembersList] handleUpdateUnitNo', e);
    } finally {
      setUnitSaving(false);
    }
  };

  // ── Role / membership mutation handlers ──────────────────────────────────

  const roleOptionLabel = (r: PropertyMemberDirectoryRole) => {
    if (en) {
      if (r === 'owner') return 'Owner';
      if (r === 'council') return 'Council';
      return 'Property manager';
    }
    if (r === 'owner') return '业主';
    if (r === 'council') return '业委会';
    return '物业经理';
  };

  const roleCellLabel = (r: UserRole) => {
    if (isDropdownRole(r)) return roleOptionLabel(r);
    const map: Record<string, [string, string]> = {
      admin: ['Administrator', '管理员'],
      property_admin: ['Property admin', '物业管理员'],
      tenant: ['Tenant', '租户'],
      viewer: ['Viewer', '访客'],
    };
    const pair = map[r];
    if (pair) return en ? pair[0] : pair[1];
    return r;
  };

  const statusLabel = (status: string) => {
    const s = status.toLowerCase();
    const map: Record<string, [string, string]> = {
      active: ['Active', '在册'],
      pending: ['Pending', '待审核'],
      suspended: ['Suspended', '暂停'],
      inactive: ['Inactive', '已冻结'],
      removed: ['Removed', '已踢出'],
    };
    const pair = map[s];
    if (pair) return en ? pair[0] : pair[1];
    return status || '—';
  };

  const applyMutation = async (memberId: string, fn: () => Promise<{ error: { message?: string } | null }>) => {
    if (!canOperate) return;
    setBusyMemberId(memberId);
    setError(null);
    const { error: upErr } = await fn();
    if (upErr) {
      setError(formatPropertyMemberGuardError(upErr.message, en));
      setBusyMemberId(null);
      return;
    }
    await load();
    setBusyMemberId(null);
    await onMembershipUpdated?.();
  };

  const handleRoleChange = async (newRole: PropertyMemberDirectoryRole, row: MembersListRow) => {
    if (!canOperate || newRole === row.role) return;
    await applyMutation(row.memberId, () => setMemberRole(row.memberId, newRole, row.status));
  };

  const handleSetCouncil = (row: MembersListRow) => {
    void applyMutation(row.memberId, () => setMemberCouncil(row.memberId));
  };

  const handleFreeze = (row: MembersListRow) => {
    void applyMutation(row.memberId, () => freezeMember(row.memberId));
  };

  const handleKick = (row: MembersListRow) => {
    void applyMutation(row.memberId, () => kickMember(row.memberId));
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16 rounded-xl border border-gray-200 bg-white">
        <Loader2 className="w-10 h-10 text-[#1D9E75] animate-spin" aria-hidden />
      </div>
    );
  }

  return (
    <>
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{labels.title}</h3>
          {!canOperate && (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-md px-2 py-1">{labels.readOnlyHint}</p>
          )}
        </div>
        {error && (
          <div className="mx-4 my-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">{error}</div>
        )}
        {rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">{labels.empty}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-100">
                  <th className="px-4 py-3">{labels.name}</th>
                  <th className="px-4 py-3">{labels.email}</th>
                  <th className="px-4 py-3">{labels.role}</th>
                  <th className="px-4 py-3">{labels.status}</th>
                  <th className="px-4 py-3">{labels.unit}</th>
                  <th className="px-4 py-3 min-w-[300px]">{labels.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => {
                  const guard = rowActionsDisabled(row, currentUserId, rows);
                  const opDisabled = !canOperate || guard.disabled;
                  const busy = busyMemberId === row.memberId;
                  const dropdownRole = isDropdownRole(row.role) ? row.role : 'owner';
                  const showDropdown = isDropdownRole(row.role) && row.status !== 'removed';
                  const lastCouncil = isLastActiveCouncilRow(row, rows);
                  const alreadyCouncilActive = row.role === 'council' && row.status === 'active';

                  let hint = '';
                  if (guard.reason === 'self') hint = labels.selfHint;
                  else if (guard.reason === 'last_council') hint = labels.lastCouncilHint;
                  else if (guard.reason === 'terminal') hint = labels.removedHint;

                  return (
                    <tr key={row.userId} className="text-gray-800 hover:bg-gray-50/80 align-top">
                      <td className="px-4 py-3 font-medium">{row.fullName}</td>
                      <td className="px-4 py-3 text-gray-600">{row.email}</td>
                      <td className="px-4 py-3">{roleCellLabel(row.role)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass(String(row.status))}`}
                        >
                          {statusLabel(String(row.status))}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-700">{row.unitNo?.trim() ? row.unitNo.trim() : '—'}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {showDropdown ? (
                              <select
                                value={dropdownRole}
                                disabled={opDisabled || busy || lastCouncil}
                                onChange={(e) => {
                                  const v = e.target.value as PropertyMemberDirectoryRole;
                                  void handleRoleChange(v, row);
                                }}
                                className="min-w-[140px] px-2 py-1.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1D9E75] disabled:opacity-50"
                              >
                                {DROPDOWN_ROLES.map((r) => (
                                  <option key={r} value={r}>
                                    {roleOptionLabel(r)}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-xs text-gray-400">{labels.notEditableRole}</span>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              disabled={opDisabled || busy || row.status === 'removed' || alreadyCouncilActive}
                              onClick={() => handleSetCouncil(row)}
                              className="inline-flex items-center rounded-lg border border-[#1D9E75] bg-white px-2.5 py-1 text-xs font-medium text-[#1D9E75] hover:bg-emerald-50 disabled:opacity-45"
                            >
                              {labels.setCouncil}
                            </button>
                            <button
                              type="button"
                              disabled={opDisabled || busy || row.status === 'removed' || row.status === 'inactive'}
                              onClick={() => handleFreeze(row)}
                              className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-45"
                            >
                              {labels.freeze}
                            </button>
                            <button
                              type="button"
                              disabled={opDisabled || busy || row.status === 'removed'}
                              onClick={() => handleKick(row)}
                              className="inline-flex items-center rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-800 hover:bg-red-100 disabled:opacity-45"
                            >
                              {labels.kick}
                            </button>
                            {/* 修改房号 — only for council/admin (canOperate) */}
                            {canOperate && (
                              <button
                                type="button"
                                disabled={busy}
                                onClick={() => openUnitEdit(row)}
                                className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-45"
                              >
                                <Pencil size={11} />
                                {labels.editUnit}
                              </button>
                            )}
                          </div>
                          {hint ? <p className="text-[11px] text-gray-500 max-w-xs">{hint}</p> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
              <button type="button" onClick={closeUnitEdit} className="text-gray-400 hover:text-gray-600" aria-label="关闭">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium text-gray-800">{unitEditTarget.fullName}</span></p>
              <p className="text-xs text-gray-400">{unitEditTarget.email}</p>
              {unitEditTarget.currentUnitNo && (
                <p>当前房号：<span className="font-medium text-gray-800">{unitEditTarget.currentUnitNo}</span></p>
              )}
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700" htmlFor="ml-unit-no-input">
                新房号
              </label>
              <input
                id="ml-unit-no-input"
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
                  <><Loader2 size={14} className="animate-spin" />保存中...</>
                ) : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-[300] max-w-md -translate-x-1/2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
            toast.kind === 'success'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-950'
              : 'border border-red-200 bg-red-50 text-red-900'
          }`}
        >
          {toast.message}
        </div>
      )}
    </>
  );
}
