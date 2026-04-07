import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useProperty } from '../../contexts/PropertyContext';
import { canManagePropertyAdmin, canReviewJoinRequests, canManagePropertyInvites } from '../../lib/propertyPermissions';

type Tab = 'members' | 'requests' | 'settings';

export function PropertyAdminHub() {
  const { currentPropertyId, currentRole } = useProperty();
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
        </div>
      </div>
      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-2">
        <TabBtn active={tab === 'members'} onClick={() => setTab('members')} label="成员" show={showAdmin || showReview} />
        <TabBtn active={tab === 'requests'} onClick={() => setTab('requests')} label="加入申请" show={showReview} />
        <TabBtn active={tab === 'settings'} onClick={() => setTab('settings')} label="物业设置" show={showAdmin} />
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
  const [rows, setRows] = useState<
    { user_id: string; role: string; status: string; unit_number: string | null; email?: string; full_name_en?: string }[]
  >([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: mems } = await supabase
      .from('property_members')
      .select('user_id, role, status, unit_number')
      .eq('property_id', propertyId);
    const list = mems ?? [];
    const ids = list.map((m) => m.user_id as string);
    let profById: Record<string, { email: string; full_name_en: string }> = {};
    if (ids.length > 0) {
      const { data: profs } = await supabase.from('profiles').select('id, email, full_name_en').in('id', ids);
      for (const p of profs ?? []) {
        profById[p.id as string] = { email: p.email as string, full_name_en: p.full_name_en as string };
      }
    }
    setRows(
      list.map((m) => ({
        ...m,
        email: profById[m.user_id as string]?.email,
        full_name_en: profById[m.user_id as string]?.full_name_en,
      })) as typeof rows,
    );
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
              <td className="px-4 py-2">{r.unit_number ?? '—'}</td>
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
