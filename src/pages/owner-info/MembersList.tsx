import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
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
  status: PropertyMemberRowStatus | string;
  fullName: string;
  email: string;
  /** From `residents.unit_no` for this property + user (not `property_members`). */
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

/**
 * `property_members` directory joined with `profiles` for one property.
 * Mutations: `property_members.id` via RPC (`update_member_role` / `freeze_member` / `remove_member`).
 */
export function MembersList({ propertyId, language, canOperate, currentUserId, onMembershipUpdated }: MembersListProps) {
  const en = language === 'en';
  const [rows, setRows] = useState<MembersListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);

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
      const { data: pm, error: pmErr } = await withProperty(
        supabase.from('property_members').select('id, user_id, role, status') as any,
        propertyId,
      );
      if (pmErr) {
        setRows([]);
        setError(`${loadErrPrefix} ${pmErr.message}`);
        return;
      }
      const pmRows = (pm ?? []) as Array<{ id: string; user_id: string; role: UserRole; status: string }>;
      const userIds = pmRows.map((r) => r.user_id).filter(Boolean);
      if (userIds.length === 0) {
        setRows([]);
        return;
      }
      const { data: prof, error: pErr } = await supabase
        .from('profiles')
        .select('id, full_name_en, full_name_zh, email')
        .in('id', userIds);
      if (pErr) {
        setRows([]);
        setError(`${loadErrPrefix} ${pErr.message}`);
        return;
      }

      const { data: resRows, error: resErr } = await withProperty(
        supabase.from('residents').select('user_id, unit_no').not('user_id', 'is', null) as any,
        propertyId,
      );
      if (resErr) {
        setRows([]);
        setError(`${loadErrPrefix} ${resErr.message}`);
        return;
      }

      const unitByUserId = new Map<string, string>();
      for (const row of (resRows ?? []) as Array<{ user_id: string | null; unit_no: string | null }>) {
        const uid = row.user_id;
        if (!uid) continue;
        const u = String(row.unit_no ?? '').trim();
        if (u) unitByUserId.set(uid, u);
      }

      const byId = new Map((prof ?? []).map((p: any) => [p.id as string, p]));
      const merged: MembersListRow[] = pmRows.map((m) => {
        const p = byId.get(m.user_id);
        const email = (p?.email as string | undefined)?.trim() || '—';
        const unitRaw = unitByUserId.get(m.user_id);
        return {
          memberId: m.id,
          userId: m.user_id,
          role: m.role,
          status: String(m.status ?? 'active') as PropertyMemberRowStatus,
          fullName: resolveName(p?.full_name_zh, p?.full_name_en, email),
          email,
          unitNo: unitRaw && unitRaw.trim() ? unitRaw.trim() : null,
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
                <th className="px-4 py-3 min-w-[280px]">{labels.actions}</th>
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
  );
}
