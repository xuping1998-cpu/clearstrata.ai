import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, Loader2, Plus, Send, Star } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { supabase } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────────

export type ManagerTaskType =
  | 'owner_request'
  | 'repair'
  | 'procurement'
  | 'invoice_upload'
  | 'dispute'
  | 'vendor'
  | 'invoice_review'
  | 'maintenance';

export type ManagerTaskRow = {
  id: string;
  property_id: string;
  task_type: ManagerTaskType;
  title: string;
  description: string;
  status: string;
  dispute_status: string | null;
  dispute_result: string | null;
  created_at: string;
};

type OwnerRequest = {
  id: string;
  property_id: string;
  created_by: string | null;
  unit_no: string | null;
  title: string;
  content: string;
  contact: string | null;
  attachment_urls: string[];
  category: string;
  status: string;
  manager_email: string;
  sent_to_manager_at: string | null;
  manager_result: string | null;
  manager_result_by: string | null;
  manager_result_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

type OwnerRequestReview = {
  id: string;
  request_id: string;
  property_id: string;
  reviewer_id: string;
  reviewer_role: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

// ── Tabs config ────────────────────────────────────────────────────────────────

const TASK_TABS = [
  { key: 'owner_request',  label: '业主诉求', labelEn: 'Owner request'  },
  { key: 'repair',         label: '报修维修', labelEn: 'Repair'         },
  { key: 'procurement',    label: '采购申报', labelEn: 'Procurement'    },
  { key: 'invoice_upload', label: '发票上传', labelEn: 'Invoice upload' },
] as const;

type TabKey = (typeof TASK_TABS)[number]['key'];

const LEGACY_TO_TAB: Record<string, TabKey> = {
  maintenance:    'repair',
  vendor:         'procurement',
  invoice_review: 'invoice_upload',
  dispute:        'owner_request',
};

const TAB_DB_VALUES: Record<TabKey, string[]> = {
  owner_request:  ['owner_request', 'dispute'],
  repair:         ['repair', 'maintenance'],
  procurement:    ['procurement', 'vendor'],
  invoice_upload: ['invoice_upload', 'invoice_review'],
};

function taskTypeLabel(kind: string, en: boolean): string {
  const canonical = (LEGACY_TO_TAB[kind] ?? kind) as TabKey;
  const tab = TASK_TABS.find((t) => t.key === canonical);
  if (!tab) return kind;
  return en ? tab.labelEn : tab.label;
}

const STATUS_ZH: Record<string, string> = {
  pending:     '待处理',
  sent:        '已发送物业经理',
  in_progress: '处理中',
  resolved:    '已处理',
  rejected:    '无法处理',
};

// ── Simple toast ───────────────────────────────────────────────────────────────

type Toast = { id: number; msg: string; ok: boolean };

function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counter = useRef(0);
  const show = useCallback((msg: string, ok = true) => {
    const id = ++counter.current;
    setToasts((prev) => [...prev, { id, msg, ok }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);
  return { toasts, show };
}

// ── OwnerRequest card ──────────────────────────────────────────────────────────

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`text-xl ${n <= value ? 'text-amber-400' : 'text-gray-300'} hover:text-amber-400`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

type OwnerRequestCardProps = {
  req: OwnerRequest;
  reviews: OwnerRequestReview[];
  currentUserId: string;
  currentRole: string | null;
  currentPropertyId: string;
  onRefresh: () => void;
  showToast: (msg: string, ok?: boolean) => void;
};

function OwnerRequestCard({
  req, reviews, currentUserId, currentRole, currentPropertyId, onRefresh, showToast,
}: OwnerRequestCardProps) {
  const [sending, setSending] = useState(false);
  const [editStatus, setEditStatus] = useState(req.status);
  const [editResult, setEditResult] = useState(req.manager_result ?? '');
  const [saving, setSaving] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setEditStatus(req.status);
    setEditResult(req.manager_result ?? '');
  }, [req.id, req.status, req.manager_result]);

  const avgRating = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  const attachments = Array.isArray(req.attachment_urls) ? req.attachment_urls : [];

  const isSubmittingUser = Boolean(
    currentUserId && req.created_by && req.created_by === currentUserId,
  );
  const isPropertyManagerRole = currentRole === 'manager';

  /** 公共监督：是否已向物业经理递交（与时间戳或流程状态一致） */
  const deliveredToManager =
    req.status !== 'pending' || Boolean(req.sent_to_manager_at);

  const sendToManager = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-owner-request-to-manager', {
        body: { requestId: req.id },
      });
      if (error || !(data as { ok?: boolean })?.ok) {
        const msg = (error as Error | null)?.message ?? JSON.stringify(data);
        console.error('[ManagerTasks] send-to-manager failed', msg);
        showToast(`发送失败：${msg}`, false);
      } else {
        showToast('已发送给物业经理');
        onRefresh();
      }
    } catch (e) {
      console.error('[ManagerTasks] send-to-manager error', e);
      showToast(`发送失败：${String(e)}`, false);
    } finally {
      setSending(false);
    }
  };

  const saveResult = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('property_manager_requests')
      .update({
        status: editStatus,
        manager_result: editResult.trim() || null,
        manager_result_by: currentUserId,
        manager_result_updated_at: new Date().toISOString(),
      })
      .eq('id', req.id);
    setSaving(false);
    if (error) {
      showToast(`保存失败：${error.message}`, false);
    } else {
      showToast('处理结果已公开保存');
      onRefresh();
    }
  };

  const submitReview = async () => {
    if (!myRating) return;
    setSubmittingReview(true);
    const { error } = await supabase.from('property_manager_request_reviews').upsert(
      {
        request_id: req.id,
        property_id: currentPropertyId,
        reviewer_id: currentUserId,
        reviewer_role: currentRole,
        rating: myRating,
        comment: myComment.trim() || null,
      },
      { onConflict: 'request_id,reviewer_id' },
    );
    setSubmittingReview(false);
    if (error) {
      showToast(`评价失败：${error.message}`, false);
    } else {
      showToast('公开评价已提交');
      setMyRating(0);
      setMyComment('');
      onRefresh();
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-900">{req.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              req.status === 'resolved' ? 'bg-green-100 text-green-700' :
              req.status === 'rejected' ? 'bg-red-100 text-red-700' :
              req.status === 'sent' ? 'bg-blue-100 text-blue-700' :
              req.status === 'in_progress' ? 'bg-amber-100 text-amber-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {STATUS_ZH[req.status] ?? req.status}
            </span>
            {avgRating && (
              <span className="text-xs text-amber-500">★ {avgRating}（{reviews.length} 评）</span>
            )}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {req.unit_no && <span className="mr-3">房号：{req.unit_no}</span>}
            {req.contact && <span className="mr-3">联系：{req.contact}</span>}
            <span>{new Date(req.created_at).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      </div>

      {/* 递交物业经理状态（全员可见，不做 created_by / manager 限制） */}
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 space-y-2">
        <div className="text-xs font-semibold text-gray-600">
          递交物业经理状态（公共监督）
        </div>
        {!deliveredToManager ? (
          <p className="text-sm text-gray-800">尚未递交物业经理</p>
        ) : (
          <div className="text-sm text-gray-800 space-y-1">
            <p className="font-medium text-[#1D9E75]">✅ 已递交物业经理</p>
            <p className="text-xs text-gray-600">
              递交时间：
              {req.sent_to_manager_at
                ? new Date(req.sent_to_manager_at).toLocaleString('zh-CN')
                : '—'}
            </p>
            <p className="text-xs text-gray-600 break-all">
              物业经理邮箱：{req.manager_email?.trim() ? req.manager_email : '—'}
            </p>
          </div>
        )}
        {isSubmittingUser && req.status === 'pending' && (
          <button
            type="button"
            disabled={sending}
            onClick={() => void sendToManager()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
          >
            {sending ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
            发送给物业经理
          </button>
        )}
      </div>

      {/* Content */}
      <div className="px-5 py-4 space-y-3">
        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{req.content}</p>

        {attachments.length > 0 && (
          <div className="text-xs">
            <span className="text-gray-500 mr-1">附件：</span>
            {attachments.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer"
                className="mr-2 text-[#1D9E75] hover:underline break-all">
                {url.length > 50 ? url.slice(0, 50) + '…' : url}
              </a>
            ))}
          </div>
        )}

        {req.manager_result && (
          <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-3">
            <div className="text-xs font-semibold text-green-700 mb-1">处理结果</div>
            <p className="text-sm text-green-900 whitespace-pre-wrap">{req.manager_result}</p>
            {req.manager_result_updated_at && (
              <div className="text-xs text-green-500 mt-1">
                更新时间：{new Date(req.manager_result_updated_at).toLocaleString('zh-CN')}
              </div>
            )}
          </div>
        )}

        {/* Property manager only: edit status & result */}
        {isPropertyManagerRole && (
          <details className="group">
            <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 select-none">
              ▸ 编辑处理状态与结果
            </summary>
            <div className="mt-3 space-y-2 pl-2 border-l-2 border-gray-100">
              <select
                value={editStatus}
                onChange={(e) => setEditStatus(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                {Object.entries(STATUS_ZH).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              <textarea
                value={editResult}
                onChange={(e) => setEditResult(e.target.value)}
                rows={3}
                placeholder="公开处理结果（业主可见）"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={saving}
                onClick={() => void saveResult()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                保存处理结果
              </button>
            </div>
          </details>
        )}
      </div>

      {/* Reviews */}
      <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50">
        <div className="text-xs font-semibold text-gray-500 mb-3 flex items-center gap-1">
          <Star size={12} className="text-amber-400" />
          公共评价与监督
        </div>

        {reviews.length > 0 && (
          <div className="space-y-2 mb-4">
            {reviews.map((rv) => (
              <div key={rv.id} className="rounded-xl bg-white border border-gray-100 px-4 py-3">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span className="text-amber-400">{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</span>
                  <span>{rv.reviewer_role ?? '业主'}</span>
                  <span className="text-gray-300">·</span>
                  <span>{rv.reviewer_id.slice(0, 8)}</span>
                  <span className="ml-auto">{new Date(rv.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
                {rv.comment && <p className="mt-1 text-sm text-gray-700">{rv.comment}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          <StarRating value={myRating} onChange={setMyRating} />
          <textarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            rows={2}
            placeholder="公开发表评价（所有业主可见）"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={submittingReview || !myRating}
            onClick={() => void submitReview()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-amber-600"
          >
            {submittingReview ? <Loader2 size={14} className="animate-spin" /> : null}
            提交公开评价
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ManagerTasks() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { session, profile } = useAuth();
  const { currentPropertyId, roleInProperty } = useProperty();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toasts, show: showToast } = useToast();

  // ── Filter tab ───────────────────────────────────────────────────────────────

  const filterType = useMemo(() => {
    const raw = searchParams.get('task_type');
    if (raw && TASK_TABS.some((t) => t.key === raw)) return raw as TabKey;
    return 'all' as const;
  }, [searchParams]);

  const setFilter = (next: 'all' | TabKey) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'all') nextParams.delete('task_type');
    else nextParams.set('task_type', next);
    setSearchParams(nextParams, { replace: true });
  };

  // ── Manager tasks (repair / procurement / invoice_upload / all) ──────────────

  const [rows, setRows] = useState<ManagerTaskRow[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTask, setNewTask] = useState({
    task_type: 'owner_request' as ManagerTaskType,
    title: '',
    description: '',
  });

  const loadTasks = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoadingTasks(true);
    setTaskError(null);
    let q = supabase
      .from('manager_tasks')
      .select('id, property_id, task_type, title, description, status, dispute_status, dispute_result, created_at')
      .eq('property_id', currentPropertyId)
      .order('created_at', { ascending: false });
    if (filterType !== 'all') {
      const dbValues = TAB_DB_VALUES[filterType] ?? [filterType];
      q = q.in('task_type', dbValues);
    }
    const { data, error } = await q;
    if (error) {
      console.error(error);
      setTaskError(error.message);
      setRows([]);
    } else {
      setRows((data as ManagerTaskRow[]) ?? []);
    }
    setLoadingTasks(false);
  }, [currentPropertyId, filterType]);

  // ── Owner requests ────────────────────────────────────────────────────────────

  const [ownerRequests, setOwnerRequests] = useState<OwnerRequest[]>([]);
  const [reviews, setReviews] = useState<OwnerRequestReview[]>([]);
  const [loadingOR, setLoadingOR] = useState(false);

  const loadOwnerRequests = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoadingOR(true);
    const [{ data: reqs }, { data: revs }] = await Promise.all([
      supabase
        .from('property_manager_requests')
        .select('*')
        .eq('property_id', currentPropertyId)
        .order('created_at', { ascending: false }),
      supabase
        .from('property_manager_request_reviews')
        .select('*')
        .eq('property_id', currentPropertyId),
    ]);
    setOwnerRequests((reqs as OwnerRequest[]) ?? []);
    setReviews((revs as OwnerRequestReview[]) ?? []);
    setLoadingOR(false);
  }, [currentPropertyId]);

  // ── Submit new owner request ──────────────────────────────────────────────────

  const [orForm, setOrForm] = useState({
    title: '', content: '', unit_no: '', contact: '', attachment_urls: '',
  });
  const [submittingOR, setSubmittingOR] = useState(false);

  const submitOwnerRequest = async () => {
    if (!session?.user?.id || !currentPropertyId || !orForm.title.trim() || !orForm.content.trim()) return;
    setSubmittingOR(true);
    const urls = orForm.attachment_urls
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const { error } = await supabase.from('property_manager_requests').insert({
      property_id: currentPropertyId,
      created_by: session.user.id,
      unit_no: orForm.unit_no.trim() || null,
      title: orForm.title.trim(),
      content: orForm.content.trim(),
      contact: orForm.contact.trim() || null,
      attachment_urls: urls,
      category: 'owner_request',
      status: 'pending',
      manager_email: 'gani.xhepa@dwellproperty.ca',
    });
    setSubmittingOR(false);
    if (error) {
      showToast(`提交失败：${error.message}`, false);
    } else {
      showToast('诉求已公开提交');
      setOrForm({ title: '', content: '', unit_no: '', contact: '', attachment_urls: '' });
      void loadOwnerRequests();
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (filterType !== 'owner_request') {
      void loadTasks();
    }
  }, [loadTasks, filterType]);

  useEffect(() => {
    if (filterType === 'owner_request' || filterType === 'all') {
      void loadOwnerRequests();
    }
  }, [loadOwnerRequests, filterType]);

  const createTask = async () => {
    if (!profile?.id || !currentPropertyId || !newTask.title.trim()) return;
    setCreating(true);
    const payload: Record<string, unknown> = {
      property_id: currentPropertyId,
      task_type: newTask.task_type,
      title: newTask.title.trim(),
      description: newTask.description.trim() || '—',
      status: 'open',
      created_by: profile.id,
    };
    if (newTask.task_type === 'dispute' || newTask.task_type === 'owner_request') {
      payload.dispute_status = 'pending';
    }
    const { error: insErr } = await supabase.from('manager_tasks').insert(payload);
    setCreating(false);
    if (insErr) {
      alert(en ? insErr.message : `创建失败：${insErr.message}`);
      return;
    }
    setShowModal(false);
    setNewTask({ task_type: 'owner_request', title: '', description: '' });
    void loadTasks();
  };

  const isOwnerRequestTab = filterType === 'owner_request';
  const showTaskTable = !isOwnerRequestTab;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((t) => (
          <div key={t.id} className={`rounded-xl px-4 py-3 text-sm font-medium shadow-lg text-white transition-all ${
            t.ok ? 'bg-[#1D9E75]' : 'bg-red-500'
          }`}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {en ? 'Property manager tasks' : '物业经理任务'}
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            {en
              ? 'Unified entry for owner requests, repairs, procurement and invoice uploads — progress and reviews are publicly visible to all members.'
              : '物业事项统一处理入口，公开记录业主诉求、报修维修、物业经理采购与发票上传，处理进程和评价接受业主公共监督。'}
          </p>
        </div>
        {!isOwnerRequestTab && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white shadow hover:bg-[#178a66]"
          >
            <Plus size={18} />
            {en ? 'New task' : '新建任务'}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
            filterType === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          全部
        </button>
        {TASK_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filterType === t.key ? 'bg-[#1D9E75] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {en ? t.labelEn : t.label}
          </button>
        ))}
      </div>

      {/* ── Owner Request Tab ─────────────────────────────────────────────────── */}
      {isOwnerRequestTab && (
        <div className="space-y-6">
          {/* Submit form */}
          <div className="rounded-2xl border border-[#1D9E75]/30 bg-white shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">提交业主诉求</h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">诉求标题 <span className="text-red-500">*</span></label>
                <input
                  value={orForm.title}
                  onChange={(e) => setOrForm({ ...orForm, title: e.target.value })}
                  placeholder="简要描述诉求"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">诉求内容 <span className="text-red-500">*</span></label>
                <textarea
                  value={orForm.content}
                  onChange={(e) => setOrForm({ ...orForm, content: e.target.value })}
                  rows={4}
                  placeholder="详细说明诉求内容（提交后公开可见）"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">房号</label>
                  <input
                    value={orForm.unit_no}
                    onChange={(e) => setOrForm({ ...orForm, unit_no: e.target.value })}
                    placeholder="如：105"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系方式</label>
                  <input
                    value={orForm.contact}
                    onChange={(e) => setOrForm({ ...orForm, contact: e.target.value })}
                    placeholder="电话或邮箱"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">附件链接</label>
                <textarea
                  value={orForm.attachment_urls}
                  onChange={(e) => setOrForm({ ...orForm, attachment_urls: e.target.value })}
                  rows={2}
                  placeholder="每行一个链接（图片/PDF 等）"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-xs"
                />
              </div>
              <button
                type="button"
                disabled={submittingOR || !orForm.title.trim() || !orForm.content.trim()}
                onClick={() => void submitOwnerRequest()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1D9E75] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#178a66]"
              >
                {submittingOR ? <Loader2 size={14} className="animate-spin" /> : null}
                提交诉求
              </button>
            </div>
          </div>

          {/* List */}
          {loadingOR ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-[#1D9E75]" />
            </div>
          ) : ownerRequests.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-500">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="font-medium">暂无公开业主诉求。</p>
              <p className="mt-1 text-sm text-gray-400">业主提交后，处理进程、物业经理结果和公共评价将在这里公开展示。</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ownerRequests.map((req) => (
                <OwnerRequestCard
                  key={req.id}
                  req={req}
                  reviews={reviews.filter((r) => r.request_id === req.id)}
                  currentUserId={session?.user?.id ?? ''}
                  currentRole={roleInProperty}
                  currentPropertyId={currentPropertyId ?? ''}
                  onRefresh={loadOwnerRequests}
                  showToast={showToast}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Other tabs: existing task table ──────────────────────────────────── */}
      {showTaskTable && (
        <>
          {taskError ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{taskError}</div>
          ) : null}

          {loadingTasks ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[#1D9E75]" />
            </div>
          ) : rows.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              {en ? 'No tasks yet.' : '暂无任务'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-700">
                  <tr>
                    <th className="px-3 py-3 font-semibold">{en ? 'Title' : '标题'}</th>
                    <th className="px-3 py-3 font-semibold">{en ? 'Type' : '类型'}</th>
                    <th className="px-3 py-3 font-semibold">{en ? 'Status' : '状态'}</th>
                    <th className="px-3 py-3 font-semibold">{en ? 'Sub-status' : '子状态'}</th>
                    <th className="px-3 py-3 font-semibold">{en ? 'Created' : '创建时间'}</th>
                    <th className="px-3 py-3 font-semibold">{en ? 'Action' : '操作'}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-gray-100">
                      <td className="px-3 py-2.5 font-medium text-gray-900">{r.title || '—'}</td>
                      <td className="px-3 py-2.5">{taskTypeLabel(r.task_type, en)}</td>
                      <td className="px-3 py-2.5">{r.status}</td>
                      <td className="px-3 py-2.5 text-gray-700">
                        {(r.task_type === 'dispute' || r.task_type === 'owner_request')
                          ? r.dispute_status ?? '—'
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap text-xs text-gray-500">
                        {new Date(r.created_at).toLocaleString(en ? 'en-CA' : 'zh-CN')}
                      </td>
                      <td className="px-3 py-2.5">
                        <Link
                          to={`/property-admin/tasks/${r.id}`}
                          className="font-medium text-[#1D9E75] hover:underline"
                        >
                          {en ? 'View detail' : '查看详情'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* New task modal (non-owner-request tabs) */}
      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">{en ? 'New task' : '新建任务'}</h2>
            <label className="mt-4 block text-sm font-medium text-gray-700">{en ? 'Task type' : '任务类型'}</label>
            <select
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={newTask.task_type}
              onChange={(e) => setNewTask({ ...newTask, task_type: e.target.value as ManagerTaskType })}
            >
              {TASK_TABS.map((t) => (
                <option key={t.key} value={t.key}>
                  {en ? t.labelEn : t.label}
                </option>
              ))}
            </select>
            <label className="mt-3 block text-sm font-medium text-gray-700">{en ? 'Title' : '标题'}</label>
            <input
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
              placeholder={en ? 'Short title' : '简要标题'}
            />
            <label className="mt-3 block text-sm font-medium text-gray-700">{en ? 'Description' : '描述'}</label>
            <textarea
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              rows={4}
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              placeholder={en ? 'Details' : '详细说明'}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                onClick={() => setShowModal(false)}
              >
                {en ? 'Cancel' : '取消'}
              </button>
              <button
                type="button"
                disabled={creating || !newTask.title.trim()}
                className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                onClick={() => void createTask()}
              >
                {creating ? (en ? 'Saving…' : '保存中…') : en ? 'Create' : '创建'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
