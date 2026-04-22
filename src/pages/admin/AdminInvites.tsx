import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Check, Loader2, Ban, Plus } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';
import type { UserRole } from '../../lib/supabase';
import { BackButton } from '../../components/BackButton';

type InviteRow = {
  id: string;
  code: string;
  role: string;
  status: string;
  max_uses: number;
  used_count: number;
  expires_at: string | null;
  created_at: string;
};

/** DB status plus derived "used up" and time-based expired for display. */
type InviteDisplayStatus = 'active' | 'expired' | 'disabled' | 'used_up';

function inviteDisplayStatus(r: InviteRow): InviteDisplayStatus {
  if (r.status === 'disabled') return 'disabled';
  if (r.status === 'expired') return 'expired';
  if (r.max_uses > 0 && r.used_count >= r.max_uses) return 'used_up';
  if (r.expires_at) {
    const t = new Date(r.expires_at).getTime();
    if (!Number.isNaN(t) && t < Date.now()) return 'expired';
  }
  return 'active';
}

function inviteStatusLabel(s: InviteDisplayStatus, en: boolean): string {
  const map: Record<InviteDisplayStatus, [string, string]> = {
    active: ['Active', '可用'],
    expired: ['Expired', '已过期'],
    disabled: ['Disabled', '已停用'],
    used_up: ['Used up', '次数已用尽'],
  };
  return en ? map[s][0] : map[s][1];
}

function inviteStatusBadgeClass(s: InviteDisplayStatus): string {
  switch (s) {
    case 'active':
      return 'bg-emerald-100 text-emerald-800';
    case 'used_up':
      return 'bg-violet-100 text-violet-900';
    case 'disabled':
      return 'bg-gray-200 text-gray-700';
    case 'expired':
      return 'bg-amber-100 text-amber-900';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

/** `<input type="datetime-local" />` → timestamptz for `create_property_invite`; empty → null */
function expiresLocalToIsoOrNull(local: string): string | null {
  const t = local?.trim() ?? '';
  if (!t) return null;
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

/**
 * `property_invites.max_uses` is NOT NULL (see migrations). "Unlimited" is represented as 0 server-side;
 * RPC uses GREATEST(p_max_uses, 0). Do not send SQL NULL from the client for this column.
 */
function maxUsesForRpc(raw: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return 0;
  if (n === 0) return 0;
  return Math.floor(n);
}

const INVITE_ROLES: UserRole[] = ['owner', 'tenant', 'viewer', 'manager', 'council'];

export function AdminInvites() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { user } = useAuth();
  const { currentPropertyId, ready } = useProperty();

  const [rows, setRows] = useState<InviteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState<UserRole>('owner');
  const [maxUses, setMaxUses] = useState(5);
  const [expiresLocal, setExpiresLocal] = useState('');
  const [banner, setBanner] = useState<string | null>(null);
  const [lastLink, setLastLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [disablingId, setDisablingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('property_invites')
      .select('id, code, role, status, max_uses, used_count, expires_at, created_at')
      .eq('property_id', currentPropertyId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('load property_invites error:', error);
      setBanner(en ? 'Failed to load invites.' : '加载邀请码失败。');
    } else {
      setRows((data as InviteRow[]) ?? []);
      setBanner(null);
    }
    setLoading(false);
  }, [currentPropertyId, en]);

  useEffect(() => {
    void load();
  }, [load]);

  const inviteBase = typeof window !== 'undefined' ? `${window.location.origin}/invite` : '/invite';

  const create = async () => {
    if (!ready || !currentPropertyId || !user?.id) return;
    setCreating(true);
    setBanner(null);
    setLastLink(null);

    const pid = String(currentPropertyId).trim();
    console.log('[AdminInvites] create_property_invite property_id', pid, 'created_by (client session)', user.id);

    const uuid36 =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pid) && pid.length === 36;
    if (!uuid36) {
      setCreating(false);
      setBanner(
        en
          ? `Invalid property id: expected full UUID (36 chars). Got length ${pid.length}: ${pid}`
          : `物业 ID 无效：应为完整 UUID（36 个字符）。当前长度 ${pid.length}：${pid}`,
      );
      return;
    }

    const p_max_uses = maxUsesForRpc(maxUses);
    const p_expires_at = expiresLocalToIsoOrNull(expiresLocal);

    const payload = {
      p_property_id: pid,
      p_role: role,
      p_max_uses,
      p_expires_at,
    };

    console.log('create_property_invite payload', payload);
    const { data, error } = await supabase.rpc('create_property_invite', payload);
    console.log('create_property_invite result', { data, error });
    setCreating(false);

    if (error) {
      console.error('create invite error:', error);
      const full = [error.message, (error as { hint?: string }).hint, (error as { details?: string }).details]
        .filter(Boolean)
        .join('\n');
      setBanner(full);
      return;
    }
    const d = data as { ok?: boolean; code?: string; error?: string; id?: string };
    if (!d?.ok) {
      console.error('create_property_invite business error:', d);
      setBanner(d?.error ?? (en ? 'Create failed.' : '创建失败。'));
      return;
    }
    const link = `${inviteBase}?code=${encodeURIComponent(d.code ?? '')}`;
    setLastLink(link);
    setBanner(en ? 'Invite created. Copy the link below.' : '邀请码已创建，可复制下方链接。');
    await load();
  };

  const copyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setBanner(en ? 'Could not copy.' : '复制失败。');
    }
  };

  const disable = async (id: string) => {
    if (!currentPropertyId) return;
    setDisablingId(id);
    const { data, error } = await supabase.rpc('disable_property_invite', {
      p_invite_id: id,
      p_property_id: currentPropertyId,
    });
    setDisablingId(null);
    if (error) {
      console.error('disable_property_invite error:', error);
      alert(error.message);
      return;
    }
    const row = data as { ok?: boolean };
    if (!row?.ok) {
      alert(en ? 'Could not disable invite.' : '无法停用该邀请。');
      return;
    }
    void load();
  };

  const fmtDate = (iso: string | null) => {
    if (!iso) return '—';
    try {
      return new Date(iso).toLocaleString(en ? 'en-CA' : 'zh-CN');
    } catch {
      return iso;
    }
  };

  const canGenerate = ready && !!currentPropertyId && !!user?.id;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <BackButton />
      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {en ? 'Invite codes' : '邀请码管理'}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          {en ? 'Create shareable links for residents to join this property.' : '创建可分享的链接，供住户加入本物业。'}
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm mt-2">
          <Link to="/property-admin/people?tab=review" className="font-medium text-[#1D9E75] hover:underline">
            {en ? 'Join requests' : '加入申请'}
          </Link>
          <Link to="/property-admin/settings" className="font-medium text-[#1D9E75] hover:underline">
            {en ? 'Property settings' : '物业设置'}
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Plus size={20} className="text-[#1D9E75]" />
          {en ? 'New invite' : '新建邀请码'}
        </h2>
        <div className="flex flex-col lg:flex-row flex-wrap gap-4 items-end">
          <div className="min-w-[140px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">{en ? 'Role' : '角色'}</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#1D9E75]/30"
            >
              {INVITE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[100px]">
            <label className="block text-xs font-medium text-gray-500 mb-1">{en ? 'Max uses' : '最大次数'}</label>
            <input
              type="number"
              min={0}
              value={maxUses}
              onChange={(e) => setMaxUses(parseInt(e.target.value, 10) || 0)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <p className="text-[11px] text-gray-400 mt-0.5">{en ? '0 = unlimited' : '0 表示不限'}</p>
          </div>
          <div className="min-w-[200px] flex-1">
            <label className="block text-xs font-medium text-gray-500 mb-1">{en ? 'Expires (local)' : '过期时间（本地）'}</label>
            <input
              type="datetime-local"
              value={expiresLocal}
              onChange={(e) => setExpiresLocal(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={() => void create()}
            disabled={creating || !canGenerate}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1D9E75] text-white font-semibold text-sm hover:bg-[#178a66] disabled:opacity-50"
          >
            {creating ? <Loader2 className="animate-spin" size={18} /> : null}
            {en ? 'Generate' : '生成'}
          </button>
        </div>

        {banner && (
          <p className="mt-4 text-sm text-gray-700 whitespace-pre-wrap break-words" role="status">
            {banner}
          </p>
        )}

        {lastLink && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <p className="text-xs font-medium text-emerald-900 mb-2">{en ? 'Invite link' : '邀请链接'}</p>
            <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
              <code className="flex-1 text-xs sm:text-sm break-all bg-white border border-emerald-100 rounded-lg px-3 py-2 text-gray-800">
                {lastLink}
              </code>
              <button
                type="button"
                onClick={() => void copyLink(lastLink)}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#1D9E75] text-white text-sm font-medium hover:bg-[#178a66]"
              >
                {copied ? <Check size={18} /> : <Copy size={18} />}
                {copied ? (en ? 'Copied' : '已复制') : en ? 'Copy' : '复制'}
              </button>
            </div>
            <p className="text-[11px] text-emerald-800 mt-2">
              {en ? 'Codes are generated by the database (generate_invite_code).' : '邀请码由数据库函数 generate_invite_code 生成。'}
            </p>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 space-y-1">
          <h2 className="font-semibold text-gray-900">{en ? 'Active & past invites' : '邀请列表'}</h2>
          <p className="text-xs text-gray-500">
            {en
              ? 'Status: Active · Expired · Disabled · Used up (max uses reached).'
              : '状态：可用 · 已过期 · 已停用 · 次数已用尽（达到最大次数）。'}
          </p>
        </div>
        {loading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="animate-spin text-[#1D9E75]" size={28} />
          </div>
        ) : rows.length === 0 ? (
          <p className="p-8 text-center text-gray-500 text-sm">{en ? 'No invites yet.' : '暂无邀请码。'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-left text-gray-600">
                <tr>
                  <th className="px-3 py-2 font-medium">{en ? 'Code' : '邀请码'}</th>
                  <th className="px-3 py-2 font-medium">{en ? 'Role' : '角色'}</th>
                  <th className="px-3 py-2 font-medium">{en ? 'Status' : '状态'}</th>
                  <th className="px-3 py-2 font-medium">{en ? 'Uses' : '次数'}</th>
                  <th className="px-3 py-2 font-medium">{en ? 'Expires' : '过期'}</th>
                  <th className="px-3 py-2 font-medium">{en ? 'Created' : '创建时间'}</th>
                  <th className="px-3 py-2 font-medium" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r) => {
                  const disp = inviteDisplayStatus(r);
                  return (
                  <tr key={r.id} className="hover:bg-gray-50/80">
                    <td className="px-3 py-2 font-mono font-medium text-gray-900">{r.code}</td>
                    <td className="px-3 py-2">{r.role}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${inviteStatusBadgeClass(disp)}`}
                        title={en ? `DB status: ${r.status}` : `数据库状态：${r.status}`}
                      >
                        {inviteStatusLabel(disp, en)}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {r.used_count} / {r.max_uses === 0 ? '∞' : r.max_uses}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">{fmtDate(r.expires_at)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-gray-600">{fmtDate(r.created_at)}</td>
                    <td className="px-3 py-2">
                      {r.status === 'active' && (
                        <button
                          type="button"
                          disabled={disablingId === r.id}
                          onClick={() => void disable(r.id)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                        >
                          <Ban size={14} />
                          {en ? 'Disable' : '停用'}
                        </button>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
