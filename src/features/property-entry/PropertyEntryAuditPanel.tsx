import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, FileSearch, X } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useProperty } from '../../contexts/PropertyContext';
import { canReviewJoinRequests } from '../../lib/propertyPermissions';
import { supabase } from '../../lib/supabase';
import { StatusAlert } from '@/components/status';

export type PropertyEntryEventRow = {
  id: string;
  property_id: string;
  user_id: string | null;
  email: string | null;
  display_name: string | null;
  unit_no: string | null;
  invite_code: string | null;
  event_type: string;
  result_status: string | null;
  review_flag: string | null;
  whitelist_matched: boolean | null;
  unit_occupied: boolean | null;
  join_request_id: string | null;
  member_id: string | null;
  actor_user_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

const EVENT_TYPE_ZH: Record<string, string> = {
  entry_opened: '打开入楼链接',
  entry_form_submitted: '提交入楼资料',
  invite_invalid: '邀请码无效',
  auto_approved: '白名单自动通过',
  pending_review: '转入人工审核',
  duplicate_pending: '重复待审核',
  already_member: '已是成员',
  join_request_approved: '人工批准',
  join_request_rejected: '人工拒绝',
};

const EVENT_TYPE_EN: Record<string, string> = {
  entry_opened: 'Opened link',
  entry_form_submitted: 'Submitted form',
  invite_invalid: 'Invalid invite',
  auto_approved: 'Auto-approved',
  pending_review: 'Queue for review',
  duplicate_pending: 'Duplicate pending',
  already_member: 'Already member',
  join_request_approved: 'Manually approved',
  join_request_rejected: 'Manually rejected',
};

const FLAG_ZH: Record<string, string> = {
  auto_approved: '白名单命中，自动通过',
  not_in_whitelist: '房号不在白名单',
  unit_occupied: '房号已被占用',
  manual_review: '人工审核',
  invalid_invite: '邀请码无效',
  duplicate_pending: '已有待审核申请',
  already_member: '已是本物业成员',
};

const FLAG_EN: Record<string, string> = {
  auto_approved: 'Auto-approved (whitelist)',
  not_in_whitelist: 'Not on whitelist',
  unit_occupied: 'Unit occupied',
  manual_review: 'Manual review',
  invalid_invite: 'Invalid invite',
  duplicate_pending: 'Duplicate pending',
  already_member: 'Already a member',
};

const RESULT_ZH: Record<string, string> = {
  success: '通过',
  pending: '待审核',
  rejected: '已拒绝',
  invalid: '无效',
  error: '错误',
};

const RESULT_EN: Record<string, string> = {
  success: 'Success',
  pending: 'Pending',
  rejected: 'Rejected',
  invalid: 'Invalid',
  error: 'Error',
};

const FILTER_KEY = {
  all: 'all',
  success_auto: 'success_auto',
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected',
  invalid: 'invalid',
  unit_occupied: 'unit_occupied',
  not_wl: 'not_wl',
} as const;

type FilterId = (typeof FILTER_KEY)[keyof typeof FILTER_KEY];

function resultLabel(r: PropertyEntryEventRow, en: boolean): string {
  if (r.event_type === 'join_request_approved') {
    return en ? 'Manually approved' : '已批准';
  }
  if (r.event_type === 'join_request_rejected') {
    return en ? 'Manually rejected' : '已拒绝';
  }
  if (r.event_type === 'auto_approved' || (r.review_flag === 'auto_approved' && r.result_status === 'success')) {
    return en ? 'Auto approved' : '自动通过';
  }
  if (r.event_type === 'invite_invalid' || r.review_flag === 'invalid_invite' || r.result_status === 'invalid') {
    return en ? 'Invalid invite' : '无效邀请码';
  }
  if (r.review_flag === 'unit_occupied' && (r.event_type === 'pending_review' || r.event_type === 'duplicate_pending')) {
    return en ? 'Unit taken' : '房号重复/占用';
  }
  if (r.review_flag === 'not_in_whitelist' && (r.event_type === 'pending_review' || r.event_type === 'duplicate_pending')) {
    return en ? 'Not on whitelist' : '白名单未命中';
  }
  if (r.result_status === 'pending' || r.event_type === 'pending_review' || r.event_type === 'duplicate_pending') {
    return en ? 'Pending' : '待审核';
  }
  if (r.event_type === 'already_member') {
    return en ? 'Already member' : '已是成员';
  }
  if (r.result_status === 'success') {
    return en ? 'Success' : '成功';
  }
  return '—';
}

function passFilter(row: PropertyEntryEventRow, q: string, f: FilterId): boolean {
  const t = (s: string | null | undefined) => (s ? s.toLowerCase() : '');
  if (q.trim()) {
    const m = (v: string | null | undefined) => t(v).includes(q);
    if (!m(row.email) && !m(row.display_name) && !m(row.unit_no) && !m(row.invite_code)) {
      return false;
    }
  }
  if (f === 'all') return true;
  if (f === 'success_auto') {
    return row.event_type === 'auto_approved' || (row.review_flag === 'auto_approved' && row.result_status === 'success');
  }
  if (f === 'pending') {
    return (
      row.result_status === 'pending' ||
      row.event_type === 'pending_review' ||
      row.event_type === 'duplicate_pending' ||
      row.event_type === 'entry_form_submitted'
    );
  }
  if (f === 'approved') return row.event_type === 'join_request_approved';
  if (f === 'rejected') return row.event_type === 'join_request_rejected';
  if (f === 'invalid') return row.event_type === 'invite_invalid' || row.review_flag === 'invalid_invite' || row.result_status === 'invalid';
  if (f === 'unit_occupied') return row.review_flag === 'unit_occupied' && row.event_type === 'pending_review';
  if (f === 'not_wl') return row.review_flag === 'not_in_whitelist' && (row.event_type === 'pending_review' || row.event_type === 'duplicate_pending');
  return true;
}

export function PropertyEntryAuditPanel({ embedded = false }: { embedded?: boolean }) {
  const { language } = useLanguage();
  const en = language === 'en';
  const { currentPropertyId, roleInProperty, ready } = useProperty();
  const [rows, setRows] = useState<PropertyEntryEventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [detail, setDetail] = useState<PropertyEntryEventRow | null>(null);
  const [joinRequestReason, setJoinRequestReason] = useState<string | null | undefined>(undefined);
  const [actors, setActors] = useState<Record<string, { name: string; email: string | null }>>({});

  const can = canReviewJoinRequests(roleInProperty);

  const load = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoading(true);
    setErr(null);
    const { data, error } = await supabase
      .from('property_entry_events')
      .select(
        'id, property_id, user_id, email, display_name, unit_no, invite_code, event_type, result_status, review_flag, whitelist_matched, unit_occupied, join_request_id, member_id, actor_user_id, metadata, created_at',
      )
      .eq('property_id', currentPropertyId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      setErr(error.message);
      setRows([]);
      setLoading(false);
      return;
    }
    const list = (data as PropertyEntryEventRow[]) ?? [];
    setRows(list);
    const actorIds = [
      ...new Set(list.map((r) => r.actor_user_id).filter((x): x is string => x != null && x.length > 0)),
    ];
    if (actorIds.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, full_name_en, full_name_zh, email')
        .in('id', actorIds);
      const m: Record<string, { name: string; email: string | null }> = {};
      (profs as { id: string; full_name_en?: string; full_name_zh?: string; email?: string }[] | null)?.forEach(
        (p) => {
          m[p.id] = {
            name: (p.full_name_zh || p.full_name_en || '').trim() || p.id.slice(0, 8) + '…',
            email: p.email ?? null,
          };
        },
      );
      setActors(m);
    } else {
      setActors({});
    }
    setLoading(false);
  }, [currentPropertyId]);

  useEffect(() => {
    if (!ready) return;
    if (!currentPropertyId || !can) {
      setLoading(false);
      return;
    }
    void load();
  }, [ready, currentPropertyId, can, load]);

  const filtered = useMemo(() => {
    return rows
      .filter((r) => passFilter(r, search, filter))
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  }, [rows, search, filter]);

  useEffect(() => {
    if (!detail?.join_request_id) {
      setJoinRequestReason(undefined);
      return;
    }
    let cancel = false;
    void (async () => {
      const { data, error } = await supabase
        .from('join_requests')
        .select('review_reason')
        .eq('id', detail.join_request_id!)
        .maybeSingle();
      if (cancel) return;
      if (error) {
        setJoinRequestReason(null);
        return;
      }
      setJoinRequestReason(
        (data as { review_reason?: string } | null)?.review_reason != null
          ? String((data as { review_reason: string }).review_reason)
          : null,
      );
    })();
    return () => {
      cancel = true;
    };
  }, [detail?.join_request_id]);

  if (!ready) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 text-clearstrata-ui-primary animate-spin" />
      </div>
    );
  }
  if (!currentPropertyId) {
    return <StatusAlert tone="warning">{en ? 'No property context.' : '未选择物业。'}</StatusAlert>;
  }
  if (!can) {
    return (
      <StatusAlert tone="warning">
        {en ? 'You do not have permission to view this audit log.' : '你无权查看入楼审计。'}
      </StatusAlert>
    );
  }

  return (
    <div className={embedded ? 'space-y-3' : 'max-w-6xl mx-auto space-y-3'}>
      <div className="flex flex-col sm:flex-row sm:items-end gap-2 flex-wrap">
        <label className="text-sm text-gray-600 min-w-0">
          {en ? 'Search' : '搜索'}
          <input
            type="search"
            className="mt-1 w-full min-w-0 sm:w-64 border border-gray-200 rounded-lg px-2 py-1.5 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={en ? 'Email, name, unit, code' : '邮箱、姓名、房号、邀请码'}
          />
        </label>
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              [FILTER_KEY.all, en ? 'All' : '全部'] as [FilterId, string],
              [FILTER_KEY.success_auto, en ? 'Auto-approved' : '自动通过'] as [FilterId, string],
              [FILTER_KEY.pending, en ? 'Pending' : '待审核'] as [FilterId, string],
              [FILTER_KEY.approved, en ? 'Approved' : '已批准'] as [FilterId, string],
              [FILTER_KEY.rejected, en ? 'Rejected' : '已拒绝'] as [FilterId, string],
              [FILTER_KEY.invalid, en ? 'Invalid invite' : '无效邀请码'] as [FilterId, string],
              [FILTER_KEY.unit_occupied, en ? 'Unit taken' : '房号重复'] as [FilterId, string],
              [FILTER_KEY.not_wl, en ? 'Not on whitelist' : '白名单未命中'] as [FilterId, string],
            ] as [FilterId, string][]
          ).map(([k, lab]) => (
            <button
              type="button"
              key={k}
              onClick={() => setFilter(k)}
              className={`px-2 py-1 text-xs font-medium rounded-md ${
                filter === k
                  ? 'bg-clearstrata-ui-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {lab}
            </button>
          ))}
        </div>
      </div>

      {err && <StatusAlert tone="danger">{err}</StatusAlert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 text-clearstrata-ui-primary animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">{en ? 'No events.' : '暂无记录。'}</p>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg bg-white text-sm">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-xs">
                <th className="px-2 py-2 whitespace-nowrap">{en ? 'Time' : '时间'}</th>
                <th className="px-2 py-2 whitespace-nowrap">{en ? 'Event' : '事件'}</th>
                <th className="px-2 py-2 whitespace-nowrap">{en ? 'Name' : '姓名'}</th>
                <th className="px-2 py-2 whitespace-nowrap">Email</th>
                <th className="px-2 py-2 whitespace-nowrap">{en ? 'Unit' : '房号'}</th>
                <th className="px-2 py-2 whitespace-nowrap">{en ? 'Code' : '邀请码'}</th>
                <th className="px-2 py-2 whitespace-nowrap">{en ? 'WL' : '白名单'}</th>
                <th className="px-2 py-2 whitespace-nowrap">{en ? 'Unit' : '房号状态'}</th>
                <th className="px-2 py-2 whitespace-nowrap">{en ? 'Outcome' : '结果'}</th>
                <th className="px-2 py-2 whitespace-nowrap">{en ? 'Reviewer' : '审核人'}</th>
                <th className="px-2 py-2 whitespace-nowrap" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const et = (en ? EVENT_TYPE_EN : EVENT_TYPE_ZH)[r.event_type] || r.event_type;
                const wl =
                  r.whitelist_matched === null
                    ? '—'
                    : r.whitelist_matched
                      ? en
                        ? 'on list'
                        : '命中'
                      : en
                        ? 'not listed'
                        : '未命中';
                const uo =
                  r.unit_occupied == null
                    ? '—'
                    : r.unit_occupied
                      ? en
                        ? 'taken'
                        : '已占用'
                      : en
                        ? 'ok'
                        : '正常';
                const actor = r.actor_user_id ? actors[r.actor_user_id] : null;
                return (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50/80">
                    <td className="px-2 py-1.5 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString(en ? 'en-CA' : 'zh-CN')}
                    </td>
                    <td className="px-2 py-1.5 text-gray-800 max-w-[10rem] truncate" title={r.event_type}>
                      {et}
                    </td>
                    <td className="px-2 py-1.5">{r.display_name || '—'}</td>
                    <td className="px-2 py-1.5 text-xs break-all max-w-[8rem]">{r.email || '—'}</td>
                    <td className="px-2 py-1.5 font-mono text-xs">{r.unit_no || '—'}</td>
                    <td className="px-2 py-1.5 font-mono text-xs">{r.invite_code || '—'}</td>
                    <td className="px-2 py-1.5 text-xs">{wl}</td>
                    <td className="px-2 py-1.5 text-xs">{uo}</td>
                    <td className="px-2 py-1.5 text-xs text-gray-800 max-w-[8rem]">{resultLabel(r, en)}</td>
                    <td className="px-2 py-1.5 text-xs">
                      {actor
                        ? `${actor.name}${actor.email ? ` — ${actor.email}` : ''}`
                        : r.actor_user_id
                          ? r.actor_user_id.slice(0, 8) + '…'
                          : '—'}
                    </td>
                    <td className="px-2 py-1.5">
                      <button
                        type="button"
                        onClick={() => setDetail(r)}
                        className="text-clearstrata-ui-primary text-xs font-medium inline-flex items-center gap-0.5"
                      >
                        <FileSearch className="w-3.5 h-3.5" />
                        {en ? 'View' : '详情'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40" role="dialog">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-5 sm:p-6 text-sm text-gray-800">
            <div className="flex justify-between items-start gap-2 mb-3">
              <h3 className="font-semibold text-base">{en ? 'Entry audit detail' : '入楼审计详情'}</h3>
              <button type="button" className="p-1 text-gray-500" onClick={() => setDetail(null)} aria-label="close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <dl className="space-y-1.5 text-gray-600">
              <div>
                <dt className="text-gray-500 text-xs">{en ? 'Flag' : 'Review 标记'}</dt>
                <dd>
                  {detail.review_flag
                    ? (en ? FLAG_EN : FLAG_ZH)[detail.review_flag] || detail.review_flag
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">Result / status</dt>
                <dd>
                  {detail.result_status
                    ? (en ? RESULT_EN : RESULT_ZH)[detail.result_status] || detail.result_status
                    : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs">user_id / join_request_id / member_id / actor</dt>
                <dd className="font-mono break-all text-xs">
                  {detail.user_id || '—'}
                  <br />
                  {detail.join_request_id || '—'}
                  <br />
                  {detail.member_id || '—'}
                  <br />
                  {detail.actor_user_id || '—'}
                </dd>
              </div>
            </dl>
            {joinRequestReason !== undefined && joinRequestReason !== null && (
              <p className="text-xs text-gray-700 mt-1">
                <span className="text-gray-500">review_reason: </span>
                {joinRequestReason}
              </p>
            )}
            {joinRequestReason === null && detail?.join_request_id && (
              <p className="text-xs text-gray-400 mt-1">
                {en ? 'Could not load review_reason (empty or RLS).' : '未读到 review_reason（空值或 RLS）。'}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              {en
                ? 'Full rejection message may live on the join request row; metadata shows RPC context.'
                : '完整原因见 join_requests；metadata 为当时 RPC 附加上下文。'}
            </p>
            <pre className="mt-3 p-2 bg-gray-50 rounded-lg text-xs overflow-x-auto text-gray-700 max-h-48">
              {JSON.stringify(detail.metadata || {}, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
