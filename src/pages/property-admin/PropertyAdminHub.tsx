import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, NavLink } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useDemoGeneratedDataOptional } from '../../contexts/DemoGeneratedDataContext';
import { buildDemoGenerationSeed } from '../../lib/demoProperty/demoStorage';
import { generateDemoData } from '../../lib/demoProperty/generateDemoData';
import { useProperty } from '../../contexts/PropertyContext';
import {
  canManagePropertyAdmin,
  canReviewJoinRequests,
  canManagePropertyInvites,
  canManageUnitWhitelist,
} from '../../lib/propertyPermissions';

type Tab = 'members' | 'requests' | 'settings';

export function PropertyAdminHub() {
  const { currentPropertyId, currentRole, isDemoPropertyMock } = useProperty();
  const [tab, setTab] = useState<Tab>('members');

  if (
    !currentPropertyId ||
    (!canManagePropertyAdmin(currentRole) && !canReviewJoinRequests(currentRole))
  ) {
    return <Navigate to="/" replace />;
  }

  const showAdmin = canManagePropertyAdmin(currentRole);
  const showReview = canReviewJoinRequests(currentRole);
  const showInvitesLink = canManagePropertyInvites(currentRole);
  const showUnitWhitelist = canManageUnitWhitelist(currentRole);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">物业后台</h1>
        <div className="text-sm text-gray-600 mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {showInvitesLink && (
            <>
              <Link to="/property-admin/invites" className="font-medium text-[#1D9E75] hover:underline">
                邀请管理（公开+定向）
              </Link>
              <Link to="/property-admin/invite-analytics" className="font-medium text-[#1D9E75] hover:underline">
                邀请码统计
              </Link>
              <Link to="/admin/invites" className="font-medium text-[#1D9E75] hover:underline">
                经典邀请码
              </Link>
            </>
          )}
          {showReview && (
            <Link to="/property-admin/join-requests" className="font-medium text-[#1D9E75] hover:underline">
              加入申请审批
            </Link>
          )}
          {showUnitWhitelist && !isDemoPropertyMock && (
            <Link to="/property-admin/unit-whitelist" className="font-medium text-[#1D9E75] hover:underline">
              房号白名单
            </Link>
          )}
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-2">
        <TabBtn active={tab === 'members'} onClick={() => setTab('members')} label="成员" show={showAdmin || showReview} />
        <TabBtn
          active={tab === 'requests'}
          onClick={() => setTab('requests')}
          label="加入申请"
          show={showReview && !isDemoPropertyMock}
        />
        <TabBtn
          active={tab === 'settings'}
          onClick={() => setTab('settings')}
          label="物业设置"
          show={showAdmin && !isDemoPropertyMock}
        />
        {showUnitWhitelist && !isDemoPropertyMock ? (
          <NavLink
            to="/property-admin/unit-whitelist"
            className={({ isActive }) =>
              `px-4 py-2 rounded-lg text-sm font-medium ${
                isActive ? 'bg-[#1D9E75] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`
            }
          >
            房号管理
          </NavLink>
        ) : null}
      </div>

      {tab === 'members' && (showAdmin || showReview) && (
        <MembersSection propertyId={currentPropertyId} />
      )}
      {tab === 'requests' && showReview && <RequestsSection />}
      {tab === 'settings' && showAdmin && <SettingsSection propertyId={currentPropertyId} />}
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  label,
  show,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  show: boolean;
}) {
  if (!show) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-medium ${
        active ? 'bg-[#1D9E75] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

function MembersSection({ propertyId }: { propertyId: string }) {
  const { isDemoPropertyMock } = useProperty();
  const demoGen = useDemoGeneratedDataOptional();
  const [rows, setRows] = useState<
    { user_id: string; role: string; status: string; unit_no: string | null; email?: string; full_name_en?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  if (isDemoPropertyMock) {
    const src =
      demoGen?.memberList ??
      generateDemoData({
        seed: buildDemoGenerationSeed(),
        unitCount: 48,
      }).memberList;
    const mockRows = src.map((m) => ({
      user_id: m.user_id,
      role: m.role,
      status: m.status,
      unit_no: m.unit_no,
      email: m.email,
      full_name_en: m.full_name_en,
    }));
    return (
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2">用户</th>
              <th className="px-4 py-2">角色</th>
              <th className="px-4 py-2">状态</th>
              <th className="px-4 py-2">房号</th>
            </tr>
          </thead>
          <tbody>
            {mockRows.map((r) => (
              <tr key={r.user_id} className="border-t border-gray-100">
                <td className="px-4 py-2">{r.full_name_en || r.email || r.user_id}</td>
                <td className="px-4 py-2">{r.role}</td>
                <td className="px-4 py-2">{r.status}</td>
                <td className="px-4 py-2">{r.unit_no?.trim() ? r.unit_no.trim() : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-gray-100 px-4 py-2 text-xs text-gray-500">演示成员数据 · propertyId: {propertyId}</p>
      </div>
    );
  }

  const load = useCallback(async () => {
    const { data: mems, error: memErr } = await supabase
      .from('property_members')
      .select('user_id, role, status')
      .eq('property_id', propertyId);
    if (memErr) {
      console.error('[property-admin] property_members load error', memErr);
    }
    const list = mems ?? [];

    const memberUserIds = list.map((m) => m.user_id as string).filter(Boolean);

    let resRows: { user_id: string | null; unit_no: string | null }[] | null = null;
    let resErr: { message?: string } | null = null;
    if (memberUserIds.length === 0) {
      resRows = [];
    } else {
      const res = await supabase
        .from('residents')
        .select('user_id, unit_no')
        .eq('property_id', propertyId)
        .in('user_id', memberUserIds);
      resRows = res.data;
      resErr = res.error;
    }
    if (resErr) {
      console.error('[property-admin] residents load error (房号将无法合并)', resErr);
    }

    const unitByUserId = new Map<string, string>();
    for (const row of resRows ?? []) {
      const uid = row.user_id as string | null | undefined;
      if (!uid) continue;
      const u = String(row.unit_no ?? '').trim();
      if (u) unitByUserId.set(uid, u);
    }

    const ids = memberUserIds;
    let profById: Record<string, { email: string; full_name_en: string }> = {};
    if (ids.length > 0) {
      const { data: profs, error: profErr } = await supabase.from('profiles').select('id, email, full_name_en').in('id', ids);
      if (profErr) {
        console.error('[property-admin] profiles load error', profErr);
      }
      for (const p of profs ?? []) {
        profById[p.id as string] = { email: p.email as string, full_name_en: p.full_name_en as string };
      }
    }

    const finalRows = list.map((m) => {
      const uid = m.user_id as string;
      return {
        user_id: uid,
        role: String(m.role ?? ''),
        status: String(m.status ?? ''),
        unit_no: unitByUserId.get(uid) ?? null,
        email: profById[uid]?.email,
        full_name_en: profById[uid]?.full_name_en,
      };
    });

    console.log('[property-admin] mems =', mems);
    console.log('[property-admin] resRows =', resRows);
    console.log('[property-admin] finalRows =', finalRows);

    setRows(finalRows);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <p className="text-gray-600">加载中…</p>;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-4 py-2">用户</th>
            <th className="px-4 py-2">角色</th>
            <th className="px-4 py-2">状态</th>
            <th className="px-4 py-2">房号</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.user_id} className="border-t border-gray-100">
              <td className="px-4 py-2">{r.full_name_en || r.email || r.user_id}</td>
              <td className="px-4 py-2">{r.role}</td>
              <td className="px-4 py-2">{r.status}</td>
              <td className="px-4 py-2">{r.unit_no?.trim() ? r.unit_no.trim() : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RequestsSection() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center space-y-3">
      <p className="text-gray-700 text-sm">在此页可快速跳转至「加入申请审批」完整列表，进行通过 / 拒绝操作。</p>
      <Link
        to="/property-admin/join-requests"
        className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-[#1D9E75] text-white text-sm font-semibold hover:bg-[#178a66]"
      >
        打开加入申请审批
      </Link>
    </div>
  );
}

function SettingsSection({ propertyId }: { propertyId: string }) {
  const [name, setName] = useState('');
  const [allowPublic, setAllowPublic] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from('properties').select('name, allow_public_join_requests').eq('id', propertyId).maybeSingle();
      if (data) {
        setName((data as { name: string }).name);
        setAllowPublic((data as { allow_public_join_requests?: boolean }).allow_public_join_requests ?? true);
      }
    })();
  }, [propertyId]);

  const save = async () => {
    setMsg(null);
    const { error } = await supabase
      .from('properties')
      .update({ name, allow_public_join_requests: allowPublic })
      .eq('id', propertyId);
    if (error) setMsg(error.message);
    else setMsg('已保存');
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
      <label className="block text-sm font-medium text-gray-700 mb-1">物业名称</label>
      <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded-lg px-3 py-2 mb-4" />
      <label className="flex items-center gap-2 mb-4">
        <input type="checkbox" checked={allowPublic} onChange={(e) => setAllowPublic(e.target.checked)} />
        <span className="text-sm text-gray-700">允许公开申请加入（显示在申请页列表）</span>
      </label>
      <button type="button" onClick={save} className="px-4 py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-medium">
        保存
      </button>
      {msg && <p className="mt-3 text-sm">{msg}</p>}
    </div>
  );
}
