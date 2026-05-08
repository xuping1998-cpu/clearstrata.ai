import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, Loader2, Send, Star } from 'lucide-react';
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

type InspectionReportRow = {
  id: string;
  property_id: string;
  created_by: string | null;
  title: string;
  inspection_date: string;
  inspector_name: string | null;
  areas: string[] | null;
  categories: string[] | null;
  summary: string | null;
  findings: string;
  risk_level: string;
  status: string;
  action_plan: string | null;
  expected_completion_date: string | null;
  completed_at: string | null;
  evidence_urls: unknown;
  report_text: string | null;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
};

type InspectionReportReview = {
  id: string;
  inspection_report_id: string;
  property_id: string;
  reviewer_id: string;
  reviewer_role: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

type PublicMatterRow = {
  id: string;
  property_id: string;
  created_by: string | null;
  title: string;
  matter_type: string;
  occurred_at: string | null;
  location: string | null;
  source: string | null;
  scope: string | null;
  description: string;
  impact: string | null;
  risk_level: string;
  status: string;
  management_response: string | null;
  action_plan: string | null;
  expected_completion_date: string | null;
  completed_at: string | null;
  evidence_urls: unknown;
  report_text: string | null;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
};

type PublicMatterReview = {
  id: string;
  public_matter_id: string;
  property_id: string;
  reviewer_id: string;
  reviewer_role: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
};

type ManagerMonthlyReportRow = {
  id: string;
  property_id: string;
  report_month: string;
  status: string;
  monthly_summary: string | null;
  key_risks: string | null;
  long_term_items: string | null;
  next_month_focus: string | null;
  published_at: string | null;
  updated_at?: string;
};

type ManagerMonthlyReportReview = {
  id: string;
  report_id: string;
  property_id: string;
  reviewer_id: string;
  reviewer_role: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at?: string;
};

const PUBLIC_MATTER_VISIBLE_NON_MANAGER = [
  'published',
  'in_progress',
  'resolved',
  'long_term',
  'closed',
] as const;

/** 公共事项空白单：四类业务状态（不含 draft） */
const PUBLIC_MATTER_BLANK_STATUS_OPTIONS = [
  { value: 'in_progress', zh: '处理中' },
  { value: 'long_term', zh: '长期跟进' },
  { value: 'resolved', zh: '已完成' },
  { value: 'published', zh: '仅通知' },
] as const;

const PUBLIC_MATTER_TYPE_ZH: Record<string, string> = {
  public_issue: '公共问题跟进',
  announcement: '社区公告',
  safety_notice: '安全提醒',
  complaint_hotspot: '投诉热点',
  long_term_followup: '长期跟进',
};

const PUBLIC_MATTER_RISK_ZH: Record<string, string> = {
  low: '低风险',
  normal: '普通',
  high: '高风险',
};

const PUBLIC_MATTER_STATUS_ZH: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  in_progress: '处理中',
  resolved: '已解决',
  long_term: '长期跟进',
  closed: '已关闭',
  archived: '已归档',
};

/** 卡片上允许经理切换的状态（不含 draft） */
const PUBLIC_MATTER_CARD_STATUS_OPTIONS = [
  'published',
  'in_progress',
  'resolved',
  'long_term',
  'closed',
  'archived',
] as const;

const INSPECTION_PUBLIC_STATUSES = ['published', 'in_progress', 'completed'] as const;

const INSPECTION_STATUS_ZH: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
  in_progress: '处理中',
  completed: '已完成',
  archived: '已归档',
};

const INSPECTION_RISK_ZH: Record<string, string> = {
  normal: '正常',
  repair_needed: '需维修',
  high_risk: '高风险',
};

const MONTHLY_REPORT_STATUS_ZH: Record<string, string> = {
  draft: '草稿',
  published: '已发布',
};

function formatReportMonthDisplay(reportMonth: string): string {
  const m = /^(\d{4})-(\d{2})/.exec(String(reportMonth));
  if (!m) return reportMonth;
  return `${parseInt(m[1], 10)}年${parseInt(m[2], 10)}月`;
}

function currentMonthYm(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function parseEvidenceUrls(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((u): u is string => typeof u === 'string' && u.length > 0);
}

// ── Nav tabs（全部 + 四类） ─────────────────────────────────────────────────────

const NAV_TABS = [
  { key: 'all', label: '全部', labelEn: 'All' },
  { key: 'owner_request', label: '业主诉求', labelEn: 'Owner request' },
  { key: 'inspection', label: '巡检记录', labelEn: 'Inspection records' },
  { key: 'public_matter', label: '公共事项', labelEn: 'Public matters' },
  { key: 'manager_report', label: '经理月报', labelEn: 'Manager report' },
] as const;

type NavTabKey = (typeof NAV_TABS)[number]['key'];

/** manager_tasks 历史 task_type → 表格展示文案 */
const TASK_KIND_LABELS: Record<string, { zh: string; en: string }> = {
  owner_request: { zh: '业主诉求', en: 'Owner request' },
  dispute: { zh: '业主诉求', en: 'Owner request' },
  repair: { zh: '报修维修', en: 'Repair' },
  maintenance: { zh: '报修维修', en: 'Repair' },
  procurement: { zh: '采购申报', en: 'Procurement' },
  vendor: { zh: '采购申报', en: 'Procurement' },
  invoice_upload: { zh: '发票上传', en: 'Invoice upload' },
  invoice_review: { zh: '发票上传', en: 'Invoice upload' },
};

function taskTypeLabel(kind: string, en: boolean): string {
  const L = TASK_KIND_LABELS[kind];
  return L ? (en ? L.en : L.zh) : kind;
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

/** 物业经理台 · 巡检 / 公共事项 / 月报：非折叠示例卡（不写入数据库） */
function ManagerDeskSampleCard({
  titleLine,
  children,
}: {
  titleLine: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-sky-200 bg-gradient-to-b from-sky-50/95 to-white p-5 mb-6 text-left shadow-sm">
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <span className="rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shrink-0">
          示例案例
        </span>
        <span className="text-sm font-semibold text-sky-950">{titleLine}</span>
      </div>
      <p className="text-xs text-slate-600 mb-4 leading-relaxed">
        说明：仅用于展示未来真实记录样式，不写入数据库。
        <span className="block text-[11px] text-slate-500 mt-1">
          For display only — illustrates how published records will look; nothing is saved.
        </span>
      </p>
      {children}
    </div>
  );
}

// ── 监督流程示例折叠卡（示意 UI；仅在对应模块尚无真实记录时展示） ───────────────

function ManagerSupervisionDemoFold({
  defaultOpen,
  titleZh,
  titleEn,
  summaryZh,
  summaryEn,
  children,
}: {
  defaultOpen: boolean;
  titleZh: string;
  titleEn: string;
  summaryZh: string;
  summaryEn: string;
  children: ReactNode;
}) {
  return (
    <details
      defaultOpen={defaultOpen}
      className="rounded-2xl border border-dashed border-sky-200 bg-gradient-to-b from-sky-50/95 to-white overflow-hidden text-left shadow-sm"
    >
      <summary className="cursor-pointer select-none px-4 py-3.5 text-sm font-semibold text-sky-950 flex flex-wrap items-center gap-x-3 gap-y-1 list-none [&::-webkit-details-marker]:hidden">
        <span className="rounded-full bg-sky-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shrink-0">
          示例 Demo
        </span>
        <span>{titleZh}</span>
        <span className="text-xs font-normal text-sky-800/85">{titleEn}</span>
        <span className="w-full text-xs font-normal text-sky-700/75 sm:w-auto basis-full sm:basis-auto">
          折叠查看完整流程示意 · Collapsible mock walkthrough
        </span>
      </summary>
      <div className="px-4 pb-4 border-t border-sky-100/90 pt-3 space-y-3 text-sm text-slate-600">
        <p className="text-xs text-slate-600 leading-relaxed">{summaryZh}</p>
        <p className="text-[11px] text-slate-500 leading-relaxed">{summaryEn}</p>
        {children}
      </div>
    </details>
  );
}

// ── OwnerRequest card ──────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  size = 'md',
}: {
  value: number;
  onChange: (v: number) => void;
  size?: 'sm' | 'md';
}) {
  const starClass = size === 'sm' ? 'text-lg' : 'text-xl';
  return (
    <div className="flex gap-0.5 shrink-0">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`${starClass} leading-none px-px ${n <= value ? 'text-amber-400' : 'text-gray-300'} hover:text-amber-400`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

/** e.g. 4.2 → ★★★★☆ */
function avgRatingStarsVisual(avg: number): string {
  const r = Math.max(1, Math.min(5, Math.round(avg)));
  return `${'★'.repeat(r)}${'☆'.repeat(5 - r)}`;
}

type OwnerRequestCardProps = {
  req: OwnerRequest;
  reviews: OwnerRequestReview[];
  currentUserId: string;
  currentRole: string | null;
  currentPropertyId: string;
  onRefresh: () => void;
  showToast: (msg: string, ok?: boolean) => void;
  /** 「全部」tab 顶部类型标签 */
  showTypeBadge?: boolean;
};

function OwnerRequestCard({
  req, reviews, currentUserId, currentRole, currentPropertyId, onRefresh, showToast, showTypeBadge,
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
    ? Number((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1))
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

      console.log('[send-owner-request-to-manager] data:', data);
      console.error('[send-owner-request-to-manager] error:', error);

      const payload = data as { ok?: boolean; error?: string; detail?: string } | null;

      if (error || payload?.ok === false) {
        console.error('[send-owner-request-to-manager] data (JSON):', JSON.stringify(data));
        const msg =
          payload?.error || payload?.detail || (error as Error | null)?.message || '发送失败';
        showToast(msg, false);
        return;
      }

      showToast('已发送给物业经理');
      onRefresh();
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
    <div
      id={`owner-request-${req.id}`}
      className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden scroll-mt-24"
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {showTypeBadge ? (
              <span className="rounded-full bg-gray-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shrink-0">
                业主诉求
              </span>
            ) : null}
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
            {avgRating != null && (
              <span className="text-xs text-amber-500">
                {avgRatingStarsVisual(avgRating)} {avgRating}（{reviews.length} 评）
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-gray-400">
            {req.unit_no && <span className="mr-3">房号：{req.unit_no}</span>}
            {req.contact && <span className="mr-3">联系：{req.contact}</span>}
            <span>{new Date(req.created_at).toLocaleString('zh-CN')}</span>
          </div>
        </div>
      </div>

      {/* 递交物业经理状态（全员可见；两行摘要） */}
      <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/60 space-y-1.5">
        {!deliveredToManager ? (
          <p className="text-sm text-gray-800">递交状态：尚未递交物业经理</p>
        ) : (
          <p className="text-sm text-gray-800">
            <span className="text-gray-600">递交状态：</span>
            <span className="font-medium text-[#1D9E75]">✅ 已递交物业经理</span>
            <span className="mx-2 text-gray-300">｜</span>
            <span className="text-gray-600">递交时间：</span>
            <span>
              {req.sent_to_manager_at
                ? new Date(req.sent_to_manager_at).toLocaleString('zh-CN')
                : '—'}
            </span>
          </p>
        )}
        <p className="text-sm text-gray-600 break-all">
          物业经理：{req.manager_email?.trim() ? req.manager_email : 'gani.xhepa@dwellproperty.ca'}
        </p>
        {isSubmittingUser && req.status === 'pending' && (
          <button
            type="button"
            disabled={sending}
            onClick={() => void sendToManager()}
            className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-600 disabled:opacity-50"
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
      <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50">
        {/* 第一行：标题 + 平均分 */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-700 mb-2">
          <span className="font-semibold text-gray-600 flex items-center gap-1">
            <Star size={11} className="text-amber-400 shrink-0" />
            公共评价与监督
          </span>
          <span className="text-gray-300 hidden sm:inline">｜</span>
          {avgRating != null ? (
            <span className="text-gray-700">
              <span className="text-amber-500 tracking-tight text-sm">{avgRatingStarsVisual(avgRating)}</span>
              <span className="ml-1.5 font-medium tabular-nums">平均评分：{avgRating}</span>
            </span>
          ) : (
            <span className="text-gray-400">暂无评分</span>
          )}
        </div>

        {/* 第二行：星级 + 单行输入 + 提交 */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StarRating size="sm" value={myRating} onChange={setMyRating} />
          <textarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            rows={1}
            placeholder="评语（可选，所有业主可见）"
            className="flex-1 min-w-[140px] min-h-[34px] max-h-[120px] rounded-lg border border-gray-300 px-2 py-1.5 text-sm leading-snug resize-y overflow-y-auto"
          />
          <button
            type="button"
            disabled={submittingReview || !myRating}
            onClick={() => void submitReview()}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-amber-600"
          >
            {submittingReview ? <Loader2 size={13} className="animate-spin" /> : null}
            提交评价
          </button>
        </div>

        {reviews.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100/80">
            {reviews.map((rv) => (
              <div key={rv.id} className="rounded-xl bg-white border border-gray-100 px-4 py-2.5">
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
      </div>
    </div>
  );
}

function inspectionReviewsAvg(reviews: InspectionReportReview[]): number | null {
  const rated = reviews.filter(
    (r) => typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5,
  );
  if (rated.length === 0) return null;
  return Number((rated.reduce((s, r) => s + (r.rating as number), 0) / rated.length).toFixed(1));
}

function InspectionReportReviewsSection({
  report,
  reviews,
  currentUserId,
  currentRole,
  currentPropertyId,
  showToast,
  canSubmitReview,
  onReloadReviews,
}: {
  report: InspectionReportRow;
  reviews: InspectionReportReview[];
  currentUserId: string;
  currentRole: string | null;
  currentPropertyId: string;
  showToast: (msg: string, ok?: boolean) => void;
  canSubmitReview: boolean;
  onReloadReviews: () => void | Promise<void>;
}) {
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const avgRating = inspectionReviewsAvg(reviews);

  const submit = async () => {
    if (!myRating || !currentUserId) return;
    setSubmitting(true);
    const { error } = await supabase.from('manager_inspection_report_reviews').upsert(
      {
        inspection_report_id: report.id,
        property_id: currentPropertyId,
        reviewer_id: currentUserId,
        reviewer_role: currentRole,
        rating: myRating,
        comment: myComment.trim() || null,
      },
      { onConflict: 'inspection_report_id,reviewer_id' },
    );
    setSubmitting(false);
    if (error) {
      showToast(`评价失败：${error.message}`, false);
      return;
    }
    showToast('公开评价已提交');
    setMyRating(0);
    setMyComment('');
    void onReloadReviews();
  };

  return (
    <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-700 mb-2">
        <span className="font-semibold text-gray-600 flex items-center gap-1">
          <Star size={11} className="text-amber-400 shrink-0" />
          公共评价与监督
        </span>
        <span className="text-gray-300 hidden sm:inline">｜</span>
        {avgRating != null ? (
          <span className="text-gray-700">
            <span className="text-amber-500 tracking-tight text-sm">{avgRatingStarsVisual(avgRating)}</span>
            <span className="ml-1.5 font-medium tabular-nums">平均评分：{avgRating}</span>
          </span>
        ) : (
          <span className="text-gray-400">暂无评分</span>
        )}
      </div>

      {canSubmitReview ? (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StarRating size="sm" value={myRating} onChange={setMyRating} />
          <textarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            rows={1}
            placeholder="补充现场情况（可选）"
            className="flex-1 min-w-[140px] min-h-[34px] max-h-[120px] rounded-lg border border-gray-300 px-2 py-1.5 text-sm leading-snug resize-y overflow-y-auto"
          />
          <button
            type="button"
            disabled={submitting || !myRating}
            onClick={() => void submit()}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-amber-600"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
            提交评价
          </button>
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <div className="space-y-2 pt-2 border-t border-gray-100/80">
          {reviews.map((rv) => (
            <div key={rv.id} className="rounded-xl bg-white border border-gray-100 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {typeof rv.rating === 'number' ? (
                  <span className="text-amber-400">{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
                <span>{rv.reviewer_role ?? '业主'}</span>
                <span className="text-gray-300">·</span>
                <span>{rv.reviewer_id.slice(0, 8)}</span>
                <span className="ml-auto">{new Date(rv.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
              {rv.comment ? <p className="mt-1 text-sm text-gray-700">{rv.comment}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type InspectionReportCardProps = {
  report: InspectionReportRow;
  reviews: InspectionReportReview[];
  currentUserId: string;
  currentRole: string | null;
  currentPropertyId: string;
  showToast: (msg: string, ok?: boolean) => void;
  onRefreshInspections: () => void | Promise<void>;
  onReloadInspectionReviews: () => void | Promise<void>;
  showTypeBadge?: boolean;
  isManager: boolean;
  onPublishDraft?: (reportId: string) => void | Promise<void>;
  onLoadDraftIntoForm?: (r: InspectionReportRow) => void;
};

function InspectionReportCard({
  report,
  reviews,
  currentUserId,
  currentRole,
  currentPropertyId,
  showToast,
  onRefreshInspections,
  onReloadInspectionReviews,
  showTypeBadge,
  isManager,
  onPublishDraft,
  onLoadDraftIntoForm,
}: InspectionReportCardProps) {
  const areas = Array.isArray(report.areas) ? report.areas : [];
  const categories = Array.isArray(report.categories) ? report.categories : [];
  const urls = parseEvidenceUrls(report.evidence_urls);
  const canSubmitReview =
    INSPECTION_PUBLIC_STATUSES.includes(report.status as (typeof INSPECTION_PUBLIC_STATUSES)[number]);

  const statusStyle =
    report.status === 'completed' ? 'bg-green-100 text-green-700' :
      report.status === 'draft' ? 'bg-gray-100 text-gray-600' :
      report.status === 'archived' ? 'bg-slate-100 text-slate-600' :
      report.status === 'in_progress' ? 'bg-amber-100 text-amber-800' :
      'bg-blue-100 text-blue-800';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex flex-wrap items-center gap-2">
          {showTypeBadge ? (
            <span className="rounded-full bg-[#1D9E75] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shrink-0">
              巡检记录
            </span>
          ) : null}
          <span className="font-semibold text-gray-900">{report.title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyle}`}>
            {INSPECTION_STATUS_ZH[report.status] ?? report.status}
          </span>
          <span className="text-xs text-gray-400">
            巡检日：{report.inspection_date}
          </span>
          <span className="text-xs text-gray-400">
            风险：
            {INSPECTION_RISK_ZH[report.risk_level] ?? report.risk_level}
          </span>
        </div>
        {report.inspector_name ? (
          <p className="mt-1 text-xs text-gray-500">巡检人：{report.inspector_name}</p>
        ) : null}
      </div>

      <div className="px-5 py-4 space-y-3 text-sm text-gray-700">
        {areas.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {areas.map((a) => (
              <span key={a} className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{a}</span>
            ))}
          </div>
        )}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {categories.map((c) => (
              <span key={c} className="rounded border border-slate-200 px-2 py-0.5 text-xs text-slate-600">{c}</span>
            ))}
          </div>
        )}
        {report.summary ? (
          <p className="whitespace-pre-wrap leading-relaxed">{report.summary}</p>
        ) : null}
        <div>
          <div className="text-xs font-semibold text-gray-500 mb-0.5">发现问题</div>
          <p className="whitespace-pre-wrap leading-relaxed">{report.findings}</p>
        </div>
        {report.report_text ? (
          <div className="rounded-xl bg-emerald-50/80 border border-emerald-100 px-4 py-3">
            <div className="text-xs font-semibold text-emerald-700 mb-1">巡检报告</div>
            <p className="text-sm text-emerald-900 whitespace-pre-wrap">{report.report_text}</p>
          </div>
        ) : null}
        {report.action_plan ? (
          <div>
            <span className="text-xs font-semibold text-gray-500">处理方法：</span>
            <span className="whitespace-pre-wrap">{report.action_plan}</span>
          </div>
        ) : null}
        {urls.length > 0 && (
          <div className="text-xs">
            <span className="text-gray-500 mr-1">现场证据：</span>
            {urls.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="mr-2 text-[#1D9E75] hover:underline break-all"
              >
                {url.length > 48 ? `${url.slice(0, 48)}…` : url}
              </a>
            ))}
          </div>
        )}
        {report.published_at && (
          <p className="text-xs text-gray-400">
            发布时间：{new Date(report.published_at).toLocaleString('zh-CN')}
          </p>
        )}

        {isManager && report.status === 'draft' && (onLoadDraftIntoForm || onPublishDraft) ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {onLoadDraftIntoForm ? (
              <button
                type="button"
                onClick={() => onLoadDraftIntoForm(report)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                编辑草稿（表单）
              </button>
            ) : null}
            {onPublishDraft ? (
              <button
                type="button"
                onClick={() => void onPublishDraft(report.id)}
                className="rounded-lg bg-[#1D9E75] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#178a66]"
              >
                发布报告
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <InspectionReportReviewsSection
        report={report}
        reviews={reviews}
        currentUserId={currentUserId}
        currentRole={currentRole}
        currentPropertyId={currentPropertyId}
        showToast={showToast}
        canSubmitReview={canSubmitReview}
        onReloadReviews={async () => {
          await onReloadInspectionReviews();
          void onRefreshInspections();
        }}
      />
    </div>
  );
}

function publicMatterReviewsAvg(reviews: PublicMatterReview[]): number | null {
  const rated = reviews.filter(
    (r) => typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5,
  );
  if (rated.length === 0) return null;
  return Number((rated.reduce((s, r) => s + (r.rating as number), 0) / rated.length).toFixed(1));
}

function PublicMatterReviewsSection({
  matter,
  reviews,
  currentUserId,
  currentRole,
  currentPropertyId,
  showToast,
  canSubmitReview,
  onReloadReviews,
}: {
  matter: PublicMatterRow;
  reviews: PublicMatterReview[];
  currentUserId: string;
  currentRole: string | null;
  currentPropertyId: string;
  showToast: (msg: string, ok?: boolean) => void;
  canSubmitReview: boolean;
  onReloadReviews: () => void | Promise<void>;
}) {
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const avgRating = publicMatterReviewsAvg(reviews);

  const submit = async () => {
    if (!myRating || !currentUserId) return;
    setSubmitting(true);
    const { error } = await supabase.from('manager_public_matter_reviews').upsert(
      {
        public_matter_id: matter.id,
        property_id: currentPropertyId,
        reviewer_id: currentUserId,
        reviewer_role: currentRole,
        rating: myRating,
        comment: myComment.trim() || null,
      },
      { onConflict: 'public_matter_id,reviewer_id' },
    );
    setSubmitting(false);
    if (error) {
      showToast(`评价失败：${error.message}`, false);
      return;
    }
    showToast('公开评价已提交');
    setMyRating(0);
    setMyComment('');
    void onReloadReviews();
  };

  return (
    <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-700 mb-2">
        <span className="font-semibold text-gray-600 flex items-center gap-1">
          <Star size={11} className="text-amber-400 shrink-0" />
          公共评价与监督
        </span>
        <span className="text-gray-300 hidden sm:inline">｜</span>
        {avgRating != null ? (
          <span className="text-gray-700">
            <span className="text-amber-500 tracking-tight text-sm">{avgRatingStarsVisual(avgRating)}</span>
            <span className="ml-1.5 font-medium tabular-nums">平均评分：{avgRating}</span>
          </span>
        ) : (
          <span className="text-gray-400">暂无评分</span>
        )}
      </div>

      {canSubmitReview ? (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StarRating size="sm" value={myRating} onChange={setMyRating} />
          <textarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            rows={1}
            placeholder="补充情况（可选）"
            className="flex-1 min-w-[140px] min-h-[34px] max-h-[120px] rounded-lg border border-gray-300 px-2 py-1.5 text-sm leading-snug resize-y overflow-y-auto"
          />
          <button
            type="button"
            disabled={submitting || !myRating}
            onClick={() => void submit()}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-amber-600"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
            提交评价
          </button>
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <div className="space-y-2 pt-2 border-t border-gray-100/80">
          {reviews.map((rv) => (
            <div key={rv.id} className="rounded-xl bg-white border border-gray-100 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                {typeof rv.rating === 'number' ? (
                  <span className="text-amber-400">{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
                <span>{rv.reviewer_role ?? '业主'}</span>
                <span className="text-gray-300">·</span>
                <span>{rv.reviewer_id.slice(0, 8)}</span>
                <span className="ml-auto">{new Date(rv.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
              {rv.comment ? <p className="mt-1 text-sm text-gray-700">{rv.comment}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

type PublicMatterCardProps = {
  matter: PublicMatterRow;
  isManager: boolean;
  showToast: (msg: string, ok?: boolean) => void;
  onRefresh: () => void;
  onLoadDraft: (m: PublicMatterRow) => void;
  reviews: PublicMatterReview[];
  currentUserId: string;
  currentRole: string | null;
  currentPropertyId: string;
  onReloadReviews: () => void | Promise<void>;
  showTypeBadge?: boolean;
};

function PublicMatterCard({
  matter,
  isManager,
  showToast,
  onRefresh,
  onLoadDraft,
  reviews,
  currentUserId,
  currentRole,
  currentPropertyId,
  onReloadReviews,
  showTypeBadge,
}: PublicMatterCardProps) {
  const [cardStatus, setCardStatus] = useState(matter.status);
  const [savingStatus, setSavingStatus] = useState(false);

  useEffect(() => {
    setCardStatus(matter.status);
  }, [matter.id, matter.status]);

  const evid = parseEvidenceUrls(matter.evidence_urls);
  const canSubmitReview =
    PUBLIC_MATTER_VISIBLE_NON_MANAGER.includes(
      matter.status as (typeof PUBLIC_MATTER_VISIBLE_NON_MANAGER)[number],
    );

  const saveCardStatus = async () => {
    setSavingStatus(true);
    const patch: Record<string, unknown> = { status: cardStatus };
    if (cardStatus === 'resolved' || cardStatus === 'closed') {
      patch.completed_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from('manager_public_matters')
      .update(patch)
      .eq('id', matter.id);
    setSavingStatus(false);
    if (error) {
      showToast(`更新失败：${error.message}`, false);
      return;
    }
    showToast('状态已更新');
    void onRefresh();
  };

  const statusBadge =
    matter.status === 'draft' ? 'bg-gray-100 text-gray-600' :
      matter.status === 'archived' ? 'bg-slate-100 text-slate-700' :
      matter.status === 'resolved' ? 'bg-green-100 text-green-800' :
      matter.status === 'closed' ? 'bg-green-50 text-green-700' :
      matter.status === 'long_term' ? 'bg-amber-50 text-amber-900' :
      matter.status === 'in_progress' ? 'bg-amber-50 text-amber-800' :
      'bg-blue-50 text-blue-800';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center gap-2">
        {showTypeBadge ? (
          <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shrink-0">
            公共事项
          </span>
        ) : null}
        <span className="font-semibold text-gray-900">{matter.title}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge}`}>
          {PUBLIC_MATTER_STATUS_ZH[matter.status] ?? matter.status}
        </span>
        <span className="text-xs text-gray-500">{PUBLIC_MATTER_TYPE_ZH[matter.matter_type] ?? matter.matter_type}</span>
        <span className="text-xs text-gray-400">
          {PUBLIC_MATTER_RISK_ZH[matter.risk_level] ?? matter.risk_level}
        </span>
      </div>
      <div className="px-5 py-4 space-y-2 text-sm text-gray-700">
        {matter.occurred_at && (
          <p className="text-xs text-gray-500">
            发生时间：{new Date(matter.occurred_at).toLocaleString('zh-CN')}
          </p>
        )}
        {matter.location && <p><span className="text-gray-500">位置：</span>{matter.location}</p>}
        {matter.source && <p><span className="text-gray-500">来源：</span>{matter.source}</p>}
        {matter.scope && <p><span className="text-gray-500">影响范围：</span>{matter.scope}</p>}
        <div>
          <div className="text-xs font-semibold text-gray-500">事项描述</div>
          <p className="mt-0.5 whitespace-pre-wrap">{matter.description}</p>
        </div>
        {matter.impact && (
          <div>
            <div className="text-xs font-semibold text-gray-500">影响说明</div>
            <p className="mt-0.5 whitespace-pre-wrap">{matter.impact}</p>
          </div>
        )}
        {matter.management_response && (
          <div className="rounded-lg bg-emerald-50/70 border border-emerald-100 px-3 py-2">
            <div className="text-xs font-semibold text-emerald-800">物业回复</div>
            <p className="mt-0.5 whitespace-pre-wrap text-emerald-900">{matter.management_response}</p>
          </div>
        )}
        {matter.action_plan && (
          <p><span className="text-gray-500">处理计划：</span>{matter.action_plan}</p>
        )}
        {matter.expected_completion_date && (
          <p className="text-xs text-gray-500">
            预计完成：{matter.expected_completion_date}
          </p>
        )}
        {matter.completed_at && (
          <p className="text-xs text-gray-500">
            完成时间：{new Date(matter.completed_at).toLocaleString('zh-CN')}
          </p>
        )}
        {evid.length > 0 && (
          <div className="text-xs">
            <span className="text-gray-500">现场证据：</span>
            {evid.map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-[#1D9E75] hover:underline break-all"
              >
                {url.length > 40 ? `${url.slice(0, 40)}…` : url}
              </a>
            ))}
          </div>
        )}
        {matter.report_text && (
          <div className="rounded-xl border border-gray-100 bg-gray-50/80 px-4 py-3">
            <div className="text-xs font-semibold text-gray-600 mb-1">公共事项报告</div>
            <pre className="text-sm whitespace-pre-wrap font-sans text-gray-800">{matter.report_text}</pre>
          </div>
        )}
        {matter.published_at && (
          <p className="text-xs text-gray-400">
            发布时间：{new Date(matter.published_at).toLocaleString('zh-CN')}
          </p>
        )}

        {isManager && matter.status === 'draft' && (
          <button
            type="button"
            onClick={() => onLoadDraft(matter)}
            className="mt-2 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
          >
            编辑草稿（表单）
          </button>
        )}

        {isManager && matter.status !== 'draft' && (
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-600">更新状态</span>
            <select
              value={cardStatus}
              onChange={(e) => setCardStatus(e.target.value)}
              className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm"
            >
              {PUBLIC_MATTER_CARD_STATUS_OPTIONS.map((st) => (
                <option key={st} value={st}>{PUBLIC_MATTER_STATUS_ZH[st] ?? st}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={savingStatus || cardStatus === matter.status}
              onClick={() => void saveCardStatus()}
              className="rounded-lg bg-[#1D9E75] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-[#178a66]"
            >
              {savingStatus ? <Loader2 size={13} className="inline animate-spin" /> : null}
              保存状态
            </button>
          </div>
        )}
      </div>

      <PublicMatterReviewsSection
        matter={matter}
        reviews={reviews}
        currentUserId={currentUserId}
        currentRole={currentRole}
        currentPropertyId={currentPropertyId}
        showToast={showToast}
        canSubmitReview={canSubmitReview}
        onReloadReviews={async () => {
          await onReloadReviews();
          void onRefresh();
        }}
      />
    </div>
  );
}
function monthlyReportReviewsAvg(reviews: ManagerMonthlyReportReview[]): number | null {
  const rated = reviews.filter((r) => r.rating >= 1 && r.rating <= 5);
  if (rated.length === 0) return null;
  return Number((rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1));
}

function ManagerMonthlyReportReviewsSection({
  report,
  reviews,
  currentUserId,
  currentRole,
  currentPropertyId,
  showToast,
  canSubmitReview,
  onReloadReviews,
}: {
  report: ManagerMonthlyReportRow;
  reviews: ManagerMonthlyReportReview[];
  currentUserId: string;
  currentRole: string | null;
  currentPropertyId: string;
  showToast: (msg: string, ok?: boolean) => void;
  canSubmitReview: boolean;
  onReloadReviews: () => void | Promise<void>;
}) {
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const avgRating = monthlyReportReviewsAvg(reviews);

  const submit = async () => {
    if (!myRating || !currentUserId) return;
    setSubmitting(true);
    const { error } = await supabase.from('manager_monthly_report_reviews').upsert(
      {
        report_id: report.id,
        property_id: currentPropertyId,
        reviewer_id: currentUserId,
        reviewer_role: currentRole,
        rating: myRating,
        comment: myComment.trim() || null,
      },
      { onConflict: 'report_id,reviewer_id' },
    );
    setSubmitting(false);
    if (error) {
      showToast(`评价失败：${error.message}`, false);
      return;
    }
    showToast('公开评价已提交');
    setMyRating(0);
    setMyComment('');
    void onReloadReviews();
  };

  return (
    <div className="border-t border-gray-100 px-5 py-3 bg-gray-50/50">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-700 mb-2">
        <span className="font-semibold text-gray-600 flex items-center gap-1">
          <Star size={11} className="text-amber-400 shrink-0" />
          公共评价与监督
        </span>
        <span className="text-gray-300 hidden sm:inline">｜</span>
        {avgRating != null ? (
          <span className="text-gray-700">
            <span className="text-amber-500 tracking-tight text-sm">{avgRatingStarsVisual(avgRating)}</span>
            <span className="ml-1.5 font-medium tabular-nums">平均评分：{avgRating}</span>
          </span>
        ) : (
          <span className="text-gray-400">暂无评分</span>
        )}
      </div>

      {canSubmitReview ? (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <StarRating size="sm" value={myRating} onChange={setMyRating} />
          <textarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            rows={1}
            placeholder="评价输入（可选）"
            className="flex-1 min-w-[140px] min-h-[34px] max-h-[120px] rounded-lg border border-gray-300 px-2 py-1.5 text-sm leading-snug resize-y overflow-y-auto"
          />
          <button
            type="button"
            disabled={submitting || !myRating}
            onClick={() => void submit()}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50 hover:bg-amber-600"
          >
            {submitting ? <Loader2 size={13} className="animate-spin" /> : null}
            提交评价
          </button>
        </div>
      ) : null}

      {reviews.length > 0 ? (
        <div className="space-y-2 pt-2 border-t border-gray-100/80">
          {reviews.map((rv) => (
            <div key={rv.id} className="rounded-xl bg-white border border-gray-100 px-4 py-2.5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="text-amber-400">
                  {'★'.repeat(rv.rating)}
                  {'☆'.repeat(5 - rv.rating)}
                </span>
                <span>{rv.reviewer_role ?? '业主'}</span>
                <span className="text-gray-300">·</span>
                <span>{rv.reviewer_id.slice(0, 8)}</span>
                <span className="ml-auto">{new Date(rv.created_at).toLocaleDateString('zh-CN')}</span>
              </div>
              {rv.comment ? <p className="mt-1 text-sm text-gray-700">{rv.comment}</p> : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ManagerMonthlyReportCard({
  report,
  reviews,
  isManager,
  currentUserId,
  currentRole,
  currentPropertyId,
  showToast,
  onReloadBundle,
  showTypeBadge,
}: {
  report: ManagerMonthlyReportRow;
  reviews: ManagerMonthlyReportReview[];
  isManager: boolean;
  currentUserId: string;
  currentRole: string | null;
  currentPropertyId: string;
  showToast: (msg: string, ok?: boolean) => void;
  onReloadBundle: () => void | Promise<void>;
  showTypeBadge?: boolean;
}) {
  const [editMs, setEditMs] = useState(report.monthly_summary ?? '');
  const [editKr, setEditKr] = useState(report.key_risks ?? '');
  const [editLt, setEditLt] = useState(report.long_term_items ?? '');
  const [editNf, setEditNf] = useState(report.next_month_focus ?? '');
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    setEditMs(report.monthly_summary ?? '');
    setEditKr(report.key_risks ?? '');
    setEditLt(report.long_term_items ?? '');
    setEditNf(report.next_month_focus ?? '');
  }, [
    report.id,
    report.monthly_summary,
    report.key_risks,
    report.long_term_items,
    report.next_month_focus,
  ]);

  const canSubmitReview = report.status === 'published';
  const statusStyle =
    report.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600';

  const saveDraftFields = async (): Promise<boolean> => {
    const { error } = await supabase
      .from('manager_monthly_reports')
      .update({
        monthly_summary: editMs.trim() || null,
        key_risks: editKr.trim() || null,
        long_term_items: editLt.trim() || null,
        next_month_focus: editNf.trim() || null,
      })
      .eq('id', report.id);
    if (error) {
      showToast(`保存失败：${error.message}`, false);
      return false;
    }
    return true;
  };

  const saveDraft = async () => {
    setSaving(true);
    const ok = await saveDraftFields();
    setSaving(false);
    if (!ok) return;
    showToast('草稿已保存');
    void onReloadBundle();
  };

  const publishReport = async () => {
    if (!currentUserId) return;
    setPublishing(true);
    const okSave = await saveDraftFields();
    if (!okSave) {
      setPublishing(false);
      return;
    }
    const { error } = await supabase
      .from('manager_monthly_reports')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        published_by: currentUserId,
      })
      .eq('id', report.id);
    setPublishing(false);
    if (error) {
      showToast(`发布失败：${error.message}`, false);
      return;
    }
    showToast('经理月报已发布');
    void onReloadBundle();
  };

  const showEdit = isManager && report.status === 'draft';

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {showTypeBadge ? (
            <span className="rounded-full bg-[#1D9E75] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shrink-0">
              经理月报
            </span>
          ) : null}
          <h3 className="text-base font-semibold text-gray-900">
            {formatReportMonthDisplay(report.report_month)}
          </h3>
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusStyle}`}>
            {MONTHLY_REPORT_STATUS_ZH[report.status] ?? report.status}
          </span>
        </div>

        {!showEdit ? (
          <div className="space-y-2 text-sm text-gray-800">
            <div>
              <span className="font-medium text-gray-600">本月物业运行摘要</span>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{report.monthly_summary || '—'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">重点风险与问题</span>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{report.key_risks || '—'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">长期跟进事项</span>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{report.long_term_items || '—'}</p>
            </div>
            <div>
              <span className="font-medium text-gray-600">下月工作重点</span>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{report.next_month_focus || '—'}</p>
            </div>
            {report.published_at ? (
              <p className="text-xs text-gray-400 pt-1">
                发布时间：{new Date(report.published_at).toLocaleString('zh-CN')}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">本月物业运行摘要 monthly_summary</label>
              <textarea
                value={editMs}
                onChange={(e) => setEditMs(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">重点风险与问题 key_risks</label>
              <textarea
                value={editKr}
                onChange={(e) => setEditKr(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">长期跟进事项 long_term_items</label>
              <textarea
                value={editLt}
                onChange={(e) => setEditLt(e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">下月工作重点 next_month_focus</label>
              <textarea
                value={editNf}
                onChange={(e) => setEditNf(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                disabled={saving || publishing}
                onClick={() => void saveDraft()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#178a66]"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                保存草稿
              </button>
              <button
                type="button"
                disabled={saving || publishing}
                onClick={() => void publishReport()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-slate-700"
              >
                {publishing ? <Loader2 size={14} className="animate-spin" /> : null}
                发布月报
              </button>
            </div>
          </div>
        )}
      </div>

      {report.status === 'published' ? (
        <ManagerMonthlyReportReviewsSection
          report={report}
          reviews={reviews}
          currentUserId={currentUserId}
          currentRole={currentRole}
          currentPropertyId={currentPropertyId}
          showToast={showToast}
          canSubmitReview={canSubmitReview}
          onReloadReviews={onReloadBundle}
        />
      ) : null}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function ManagerTasks() {
  const { language } = useLanguage();
  const en = language === 'en';
  const { session } = useAuth();
  const { currentPropertyId, roleInProperty } = useProperty();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toasts, show: showToast } = useToast();

  // ── Filter tab ───────────────────────────────────────────────────────────────

  const filterType = useMemo((): NavTabKey => {
    const raw = searchParams.get('task_type');
    if (raw && NAV_TABS.some((t) => t.key === raw)) return raw as NavTabKey;
    return 'all';
  }, [searchParams]);

  const setFilter = (next: NavTabKey) => {
    const nextParams = new URLSearchParams(searchParams);
    if (next === 'all') nextParams.delete('task_type');
    else nextParams.set('task_type', next);
    setSearchParams(nextParams, { replace: true });
  };

  // ── Manager tasks（仅「全部」拉取表格） ───────────────────────────────────────

  const [rows, setRows] = useState<ManagerTaskRow[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoadingTasks(true);
    setTaskError(null);
    const { data, error } = await supabase
      .from('manager_tasks')
      .select('id, property_id, task_type, title, description, status, dispute_status, dispute_result, created_at')
      .eq('property_id', currentPropertyId)
      .order('created_at', { ascending: false });
    if (error) {
      console.error(error);
      setTaskError(error.message);
      setRows([]);
    } else {
      setRows((data as ManagerTaskRow[]) ?? []);
    }
    setLoadingTasks(false);
  }, [currentPropertyId]);

  // ── Owner requests ────────────────────────────────────────────────────────────

  const [ownerRequests, setOwnerRequests] = useState<OwnerRequest[]>([]);
  const [reviews, setReviews] = useState<OwnerRequestReview[]>([]);
  const [loadingOR, setLoadingOR] = useState(false);

  const [inspectionReports, setInspectionReports] = useState<InspectionReportRow[]>([]);
  const [inspectionReportReviews, setInspectionReportReviews] = useState<InspectionReportReview[]>([]);
  const [loadingInspections, setLoadingInspections] = useState(false);

  const [publicMatters, setPublicMatters] = useState<PublicMatterRow[]>([]);
  const [publicMatterReviews, setPublicMatterReviews] = useState<PublicMatterReview[]>([]);
  const [loadingPM, setLoadingPM] = useState(false);
  const [monthlyReports, setMonthlyReports] = useState<ManagerMonthlyReportRow[]>([]);
  const [monthlyReportReviews, setMonthlyReportReviews] = useState<ManagerMonthlyReportReview[]>([]);
  const [loadingMR, setLoadingMR] = useState(false);
  const [monthPickerYm, setMonthPickerYm] = useState(() => currentMonthYm());
  const [generatingMR, setGeneratingMR] = useState(false);
  type PmBlankStatus = (typeof PUBLIC_MATTER_BLANK_STATUS_OPTIONS)[number]['value'];
  const [pmForm, setPmForm] = useState({
    editingId: null as string | null,
    description: '',
    location: '',
    managementMeasures: '',
    status: 'in_progress' as PmBlankStatus,
    expected_completion_date: '',
  });

  const [irForm, setIrForm] = useState({
    editingId: null as string | null,
    inspection_date: new Date().toISOString().slice(0, 10),
    areasText: '',
    findings: '',
    action_plan: '',
  });

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

  const loadInspectionBundle = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoadingInspections(true);
    const [{ data: reps }, { data: revs }] = await Promise.all([
      supabase
        .from('manager_inspection_reports')
        .select('*')
        .eq('property_id', currentPropertyId)
        .order('created_at', { ascending: false }),
      supabase
        .from('manager_inspection_report_reviews')
        .select('*')
        .eq('property_id', currentPropertyId),
    ]);
    setInspectionReports((reps as InspectionReportRow[]) ?? []);
    setInspectionReportReviews((revs as InspectionReportReview[]) ?? []);
    setLoadingInspections(false);
  }, [currentPropertyId]);

  const loadPublicMatters = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoadingPM(true);
    const [{ data: matters }, { data: revs }] = await Promise.all([
      supabase
        .from('manager_public_matters')
        .select('*')
        .eq('property_id', currentPropertyId)
        .order('occurred_at', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase
        .from('manager_public_matter_reviews')
        .select('*')
        .eq('property_id', currentPropertyId),
    ]);
    if (!matters) {
      setPublicMatters([]);
    } else {
      setPublicMatters((matters as PublicMatterRow[]) ?? []);
    }
    setPublicMatterReviews((revs as PublicMatterReview[]) ?? []);
    setLoadingPM(false);
  }, [currentPropertyId]);

  const loadMonthlyBundle = useCallback(async () => {
    if (!currentPropertyId) return;
    setLoadingMR(true);
    const [{ data: reps, error: mrErr }, { data: revs, error: mrevErr }] = await Promise.all([
      supabase
        .from('manager_monthly_reports')
        .select(
          'id, property_id, report_month, status, monthly_summary, key_risks, long_term_items, next_month_focus, published_at, updated_at',
        )
        .eq('property_id', currentPropertyId)
        .order('report_month', { ascending: false }),
      supabase
        .from('manager_monthly_report_reviews')
        .select('*')
        .eq('property_id', currentPropertyId),
    ]);
    if (mrErr) console.error('[ManagerTasks] manager_monthly_reports', mrErr);
    if (mrevErr) console.error('[ManagerTasks] manager_monthly_report_reviews', mrevErr);
    setMonthlyReports((reps as ManagerMonthlyReportRow[]) ?? []);
    setMonthlyReportReviews((revs as ManagerMonthlyReportReview[]) ?? []);
    setLoadingMR(false);
  }, [currentPropertyId]);

  const generateMonthlyDraft = useCallback(async () => {
    if (!currentPropertyId || !session?.user?.id) return;
    if (roleInProperty !== 'manager') return;
    setGeneratingMR(true);
    const reportMonth = `${monthPickerYm}-01`;
    try {
      const { data, error } = await supabase.functions.invoke('generate-manager-monthly-report', {
        body: { propertyId: currentPropertyId, reportMonth },
      });
      const body = data as { ok?: boolean; error?: string } | null;
      if (error) {
        console.error('generate-manager-monthly-report', { data, error });
        showToast(body?.error ?? error.message ?? '生成失败', false);
        return;
      }
      if (body?.ok === false && body?.error) {
        console.error('generate-manager-monthly-report', body);
        showToast(body.error, false);
        return;
      }
      showToast('月报草稿已生成');
      await loadMonthlyBundle();
    } catch (e) {
      console.error('generate-manager-monthly-report', e);
      showToast(`生成失败：${e instanceof Error ? e.message : String(e)}`, false);
    } finally {
      setGeneratingMR(false);
    }
  }, [
    currentPropertyId,
    session?.user?.id,
    roleInProperty,
    monthPickerYm,
    loadMonthlyBundle,
    showToast,
  ]);

  const normalizePmDraftStatus = useCallback((s: string): PmBlankStatus => {
    const ok = PUBLIC_MATTER_BLANK_STATUS_OPTIONS.some((o) => o.value === s);
    return ok ? (s as PmBlankStatus) : 'in_progress';
  }, []);

  const buildPublicMatterRowPayload = useCallback((form: typeof pmForm) => {
    const description = form.description.trim();
    const measures = form.managementMeasures.trim();
    const loc = form.location.trim();
    const title = [...description].slice(0, 30).join('');
    const matter_type = form.status === 'published' ? 'announcement' : 'public_issue';
    const statusLine =
      PUBLIC_MATTER_BLANK_STATUS_OPTIONS.find((o) => o.value === form.status)?.zh ??
      (PUBLIC_MATTER_STATUS_ZH[form.status] ?? form.status);
    const dueDisplay = form.expected_completion_date.trim() || '—';
    const report_text = [
      `公共事项：${description}`,
      `位置：${loc || '—'}`,
      `处理措施：${measures}`,
      `当前状态：${statusLine}`,
      `预计完成时间：${dueDisplay}`,
    ].join('\n');

    return {
      title,
      matter_type,
      occurred_at: null as string | null,
      location: loc || null,
      source: 'manager',
      scope: loc || '',
      description,
      impact: null as string | null,
      risk_level: 'normal',
      status: form.status,
      management_response: measures,
      action_plan: measures,
      expected_completion_date: form.expected_completion_date.trim() || null,
      evidence_urls: [] as unknown[],
      report_text,
    };
  }, []);

  const resetPmForm = useCallback(() => {
    setPmForm({
      editingId: null,
      description: '',
      location: '',
      managementMeasures: '',
      status: 'in_progress',
      expected_completion_date: '',
    });
  }, []);

  const loadPmDraftIntoForm = useCallback(
    (m: PublicMatterRow) => {
      const measures = (m.management_response ?? m.action_plan ?? '').trim();
      setPmForm({
        editingId: m.id,
        description: m.description,
        location: m.location ?? '',
        managementMeasures: measures,
        status: normalizePmDraftStatus(m.status),
        expected_completion_date: m.expected_completion_date ?? '',
      });
    },
    [normalizePmDraftStatus],
  );

  const resetIrForm = useCallback(() => {
    setIrForm({
      editingId: null,
      inspection_date: new Date().toISOString().slice(0, 10),
      areasText: '',
      findings: '',
      action_plan: '',
    });
  }, []);

  const loadDraftIntoForm = useCallback((r: InspectionReportRow) => {
    setIrForm({
      editingId: r.id,
      inspection_date: r.inspection_date,
      areasText: (Array.isArray(r.areas) ? r.areas : []).join(' / '),
      findings: r.findings,
      action_plan: r.action_plan ?? '',
    });
  }, []);

  const parseInspectionAreasInput = useCallback((text: string): string[] => {
    return text
      .split(/[\/、,，\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }, []);

  const buildIrPayload = useCallback(() => {
    const findings = irForm.findings.trim();
    const actionPlan = irForm.action_plan.trim();
    const dateStr = irForm.inspection_date.trim();
    const areasArr = parseInspectionAreasInput(irForm.areasText);
    const areasDisplay = irForm.areasText.trim();
    const title = `${dateStr} 巡检记录`;
    const summary = findings.slice(0, 80);
    const report_text = [
      `巡检日期：${dateStr}`,
      `巡检区域：${areasDisplay}`,
      `发现问题：${findings}`,
      `处理方法：${actionPlan}`,
    ].join('\n');
    return {
      title,
      inspection_date: dateStr,
      inspector_name: null as string | null,
      areas: areasArr,
      categories: [] as string[],
      summary,
      findings,
      risk_level: 'repair_needed',
      action_plan: actionPlan,
      expected_completion_date: null as string | null,
      evidence_urls: [] as unknown[],
      report_text,
    };
  }, [irForm, parseInspectionAreasInput]);

  const saveInspectionDraft = async () => {
    if (!session?.user?.id || !currentPropertyId) return;
    if (!irForm.inspection_date.trim()) {
      showToast('请选择巡检日期', false);
      return;
    }
    if (parseInspectionAreasInput(irForm.areasText).length === 0) {
      showToast('请填写巡检区域', false);
      return;
    }
    if (!irForm.findings.trim()) {
      showToast('请填写发现问题', false);
      return;
    }
    if (!irForm.action_plan.trim()) {
      showToast('请填写处理方法', false);
      return;
    }
    const payload = buildIrPayload();
    if (irForm.editingId) {
      const { error } = await supabase
        .from('manager_inspection_reports')
        .update(payload)
        .eq('id', irForm.editingId);
      if (error) {
        showToast(`保存失败：${error.message}`, false);
        return;
      }
      showToast('草稿已保存');
    } else {
      const { data, error } = await supabase
        .from('manager_inspection_reports')
        .insert({
          property_id: currentPropertyId,
          created_by: session.user.id,
          status: 'draft',
          ...payload,
        })
        .select('id')
        .single();
      if (error) {
        showToast(`创建失败：${error.message}`, false);
        return;
      }
      showToast('草稿已保存');
      if (data?.id) setIrForm((prev) => ({ ...prev, editingId: data.id as string }));
    }
    void loadInspectionBundle();
  };

  const publishInspectionFromForm = async () => {
    if (!session?.user?.id || !currentPropertyId || !irForm.editingId) return;
    if (!irForm.inspection_date.trim()) {
      showToast('请选择巡检日期', false);
      return;
    }
    if (parseInspectionAreasInput(irForm.areasText).length === 0) {
      showToast('请填写巡检区域', false);
      return;
    }
    if (!irForm.findings.trim()) {
      showToast('请填写发现问题', false);
      return;
    }
    if (!irForm.action_plan.trim()) {
      showToast('请填写处理方法', false);
      return;
    }
    const payload = buildIrPayload();
    const { error } = await supabase
      .from('manager_inspection_reports')
      .update({
        ...payload,
        status: 'published',
        published_at: new Date().toISOString(),
        published_by: session.user.id,
      })
      .eq('id', irForm.editingId);
    if (error) {
      showToast(`发布失败：${error.message}`, false);
      return;
    }
    showToast('报告已发布');
    resetIrForm();
    void loadInspectionBundle();
  };

  const publishInspectionDraftById = async (reportId: string) => {
    if (!session?.user?.id) return;
    const { error } = await supabase
      .from('manager_inspection_reports')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
        published_by: session.user.id,
      })
      .eq('id', reportId);
    if (error) {
      showToast(`发布失败：${error.message}`, false);
      return;
    }
    showToast('报告已发布');
    void loadInspectionBundle();
  };

  const savePublicMatterDraft = async () => {
    if (!session?.user?.id || !currentPropertyId) return;
    if (!pmForm.description.trim()) {
      showToast('请填写事项内容', false);
      return;
    }
    if (!pmForm.managementMeasures.trim()) {
      showToast('请填写处理措施', false);
      return;
    }
    const row = buildPublicMatterRowPayload(pmForm);
    if (pmForm.editingId) {
      const { error } = await supabase
        .from('manager_public_matters')
        .update({
          ...row,
          published_at: null,
          published_by: null,
        })
        .eq('id', pmForm.editingId);
      if (error) {
        showToast(`保存失败：${error.message}`, false);
        return;
      }
      showToast('公共事项草稿已保存');
    } else {
      const { data, error } = await supabase
        .from('manager_public_matters')
        .insert({
          property_id: currentPropertyId,
          created_by: session.user.id,
          published_at: null,
          published_by: null,
          ...row,
        })
        .select('id')
        .single();
      if (error) {
        showToast(`保存失败：${error.message}`, false);
        return;
      }
      showToast('公共事项草稿已保存');
      if (data?.id) setPmForm((p) => ({ ...p, editingId: data.id as string }));
    }
    void loadPublicMatters();
  };

  const publishPublicMatterReport = async () => {
    if (!session?.user?.id || !currentPropertyId) return;
    if (!pmForm.description.trim()) {
      showToast('请填写事项内容', false);
      return;
    }
    if (!pmForm.managementMeasures.trim()) {
      showToast('请填写处理措施', false);
      return;
    }
    const row = buildPublicMatterRowPayload(pmForm);
    const publishedRow = {
      ...row,
      published_at: new Date().toISOString(),
      published_by: session.user.id,
    };
    if (pmForm.editingId) {
      const { error } = await supabase
        .from('manager_public_matters')
        .update(publishedRow)
        .eq('id', pmForm.editingId);
      if (error) {
        showToast(`发布失败：${error.message}`, false);
        return;
      }
    } else {
      const { error } = await supabase.from('manager_public_matters').insert({
        property_id: currentPropertyId,
        created_by: session.user.id,
        ...publishedRow,
      });
      if (error) {
        showToast(`发布失败：${error.message}`, false);
        return;
      }
    }
    showToast('公共事项已发布');
    resetPmForm();
    void loadPublicMatters();
  };

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
      showToast('诉求已提交');
      setOrForm({ title: '', content: '', unit_no: '', contact: '', attachment_urls: '' });
      void loadOwnerRequests();
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (filterType === 'all') {
      void loadTasks();
    }
  }, [loadTasks, filterType]);

  useEffect(() => {
    if (filterType === 'owner_request' || filterType === 'all') {
      void loadOwnerRequests();
    }
  }, [loadOwnerRequests, filterType]);

  useEffect(() => {
    if (filterType === 'all' || filterType === 'inspection') {
      void loadInspectionBundle();
    }
  }, [loadInspectionBundle, filterType]);

  useEffect(() => {
    if (filterType === 'all' || filterType === 'public_matter') {
      void loadPublicMatters();
    }
  }, [loadPublicMatters, filterType]);

  useEffect(() => {
    if (filterType === 'all' || filterType === 'manager_report') {
      void loadMonthlyBundle();
    }
  }, [loadMonthlyBundle, filterType]);

  const isOwnerRequestTab = filterType === 'owner_request';
  const isAllTab = filterType === 'all';
  const isInspectionTab = filterType === 'inspection';
  const isPublicMatterTab = filterType === 'public_matter';
  const isManagerReportTab = filterType === 'manager_report';
  const isPropertyManagerRole = roleInProperty === 'manager';
  /** 巡检 / 公共事项 / 月报·空白单：非经理只读预览，不展示提交类按钮 */
  const ownerFormReadOnly = !isPropertyManagerRole;

  const visiblePublicMatters = useMemo(() => {
    if (isPropertyManagerRole) return publicMatters;
    return publicMatters.filter((r) =>
      PUBLIC_MATTER_VISIBLE_NON_MANAGER.includes(
        r.status as (typeof PUBLIC_MATTER_VISIBLE_NON_MANAGER)[number],
      ),
    );
  }, [publicMatters, isPropertyManagerRole]);

  const inspectionsVisibleInAllTab = useMemo(() => {
    return inspectionReports
      .filter((r) =>
        INSPECTION_PUBLIC_STATUSES.includes(r.status as (typeof INSPECTION_PUBLIC_STATUSES)[number]),
      )
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [inspectionReports]);

  const publicMattersVisibleInAllTab = useMemo(() => {
    return publicMatters
      .filter((r) =>
        PUBLIC_MATTER_VISIBLE_NON_MANAGER.includes(
          r.status as (typeof PUBLIC_MATTER_VISIBLE_NON_MANAGER)[number],
        ),
      )
      .slice()
      .sort((a, b) => {
        const ta = a.occurred_at ? new Date(a.occurred_at).getTime() : 0;
        const tb = b.occurred_at ? new Date(b.occurred_at).getTime() : 0;
        if (tb !== ta) return tb - ta;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [publicMatters]);

  const monthlyPublishedInAllTab = useMemo(() => {
    return monthlyReports
      .filter((r) => r.status === 'published')
      .slice()
      .sort((a, b) => String(b.report_month).localeCompare(String(a.report_month)));
  }, [monthlyReports]);

  /** 业主/非经理不看草稿或未发布的巡检、月报，避免误判为公示内容 */
  const inspectionReportsForViewer = useMemo(() => {
    if (isPropertyManagerRole) return inspectionReports;
    return inspectionReports.filter((r) =>
      INSPECTION_PUBLIC_STATUSES.includes(r.status as (typeof INSPECTION_PUBLIC_STATUSES)[number]),
    );
  }, [inspectionReports, isPropertyManagerRole]);

  const monthlyReportsForViewer = useMemo(() => {
    if (isPropertyManagerRole) return monthlyReports;
    return monthlyReports.filter((r) => r.status === 'published');
  }, [monthlyReports, isPropertyManagerRole]);

  const linkedRequestId = searchParams.get('requestId');

  useEffect(() => {
    if (!linkedRequestId) return;
    if (filterType !== 'owner_request' && filterType !== 'all') return;
    const t = window.setTimeout(() => {
      document
        .getElementById(`owner-request-${linkedRequestId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 400);
    return () => window.clearTimeout(t);
  }, [linkedRequestId, filterType, ownerRequests.length, loadingOR]);

  const taskTableSection = (
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
  );

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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          {en ? 'Property manager tasks' : '物业经理任务'}
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          {en
            ? 'Property manager service desk — owner requests, inspection records, public matters and manager monthly reports are recorded openly; progress and reviews are visible to owners.'
            : '物业经理服务台，公开记录业主诉求、巡检记录、公共事项与经理月报，处理进程和评价接受业主监督。'}
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex flex-wrap gap-2">
        {NAV_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setFilter(t.key)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium ${
              filterType === t.key
                ? t.key === 'all'
                  ? 'bg-gray-900 text-white'
                  : 'bg-[#1D9E75] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {en ? t.labelEn : t.label}
          </button>
        ))}
      </div>

      {/* ── 业主诉求：列表 + 业主提交表单（经理不显示提交表单） ───────────────── */}
      {isOwnerRequestTab && (
        <div className="space-y-6">
          {!isPropertyManagerRole && !loadingOR && ownerRequests.length === 0 ? (
            <ManagerSupervisionDemoFold
              defaultOpen
              titleZh="业主诉求 · 监督结构总览（示例）"
              titleEn="Owner-request desk (sample)"
              summaryZh="完整流程：递交物业经理 →（示意）经理写入公开处理结果 → 全体业主可看并评价。下方表单用于业主提交真实诉求；经理从同页处理并保存公开结果。"
              summaryEn="Deliver to manager → publish outcome → owner ratings. Form is for owners only; managers edit outcomes on each card."
            >
              <ul className="text-xs space-y-1.5 text-slate-600 list-disc pl-4 leading-relaxed">
                <li>业主角色：提交诉求、递交经理、展开本卡了解结构、参与评价；不操作经理专属编辑区。</li>
                <li>物业经理：在每条诉求卡内更新状态与公开处理说明，并查看评价。</li>
              </ul>
            </ManagerSupervisionDemoFold>
          ) : null}

          {!isPropertyManagerRole ? (
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
                    placeholder="详细说明诉求内容（提交后对业主可见）"
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
          ) : null}

          {loadingOR ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-[#1D9E75]" />
            </div>
          ) : ownerRequests.length === 0 ? (
            <div className="space-y-4">
              {isPropertyManagerRole ? (
                <ManagerSupervisionDemoFold
                  defaultOpen={false}
                  titleZh="业主诉求 · 监督结构（示例，供经理参考）"
                  titleEn="Desk structure (manager reference)"
                  summaryZh="结构与业主所见一致；您可在真实诉求卡中编辑处理状态与公开结果，并监督业主评价。"
                  summaryEn="Same layout as owners see; you fill the manager-only fields on each ticket."
                >
                  <p className="text-xs text-slate-600 leading-relaxed">
                    当前尚无记录。业主提交后，卡片会出现在此列表，并支持深度链接定位。
                  </p>
                </ManagerSupervisionDemoFold>
              ) : null}
              <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
                {isPropertyManagerRole
                  ? '暂无业主诉求记录。请等待业主递交，或通过邮件通知业主使用本标签页提交。'
                  : '暂无诉求记录。可在上方提交新诉求，或切换到「全部」查看其他公开事项。'}
              </div>
            </div>
          ) : (
            <section className="space-y-4">
              <h2 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">
                {isPropertyManagerRole ? '待处理诉求（经理工作台）' : '本物业业主诉求'}
              </h2>
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
            </section>
          )}
        </div>
      )}

      {/* ── 全部：业主诉求 + 公开巡检（不含 draft）──────────────────────────── */}
      {isAllTab && (
        <>
          {taskError ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{taskError}</div>
          ) : null}

          {loadingTasks || loadingOR || loadingInspections || loadingPM || loadingMR ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[#1D9E75]" />
            </div>
          ) : ownerRequests.length === 0 && rows.length === 0 && inspectionsVisibleInAllTab.length === 0 && publicMattersVisibleInAllTab.length === 0 && monthlyPublishedInAllTab.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              {en ? 'No tasks.' : '暂无任务'}
            </div>
          ) : (
            <div className="space-y-10">
              {ownerRequests.length > 0 ? (
                <section className="space-y-4">
                  <h2 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">业主诉求</h2>
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
                        showTypeBadge
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {inspectionsVisibleInAllTab.length > 0 ? (
                <section className="space-y-4">
                  <h2 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">巡检记录</h2>
                  <div className="space-y-4">
                    {inspectionsVisibleInAllTab.map((report) => (
                      <InspectionReportCard
                        key={report.id}
                        report={report}
                        reviews={inspectionReportReviews.filter((r) => r.inspection_report_id === report.id)}
                        currentUserId={session?.user?.id ?? ''}
                        currentRole={roleInProperty}
                        currentPropertyId={currentPropertyId ?? ''}
                        showToast={showToast}
                        onRefreshInspections={loadInspectionBundle}
                        onReloadInspectionReviews={loadInspectionBundle}
                        showTypeBadge
                        isManager={isPropertyManagerRole}
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {publicMattersVisibleInAllTab.length > 0 ? (
                <section className="space-y-4">
                  <h2 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">公共事项</h2>
                  <div className="space-y-4">
                    {publicMattersVisibleInAllTab.map((m) => (
                      <PublicMatterCard
                        key={m.id}
                        matter={m}
                        isManager={isPropertyManagerRole}
                        showToast={showToast}
                        onRefresh={loadPublicMatters}
                        onLoadDraft={loadPmDraftIntoForm}
                        reviews={publicMatterReviews.filter((r) => r.public_matter_id === m.id)}
                        currentUserId={session?.user?.id ?? ''}
                        currentRole={roleInProperty}
                        currentPropertyId={currentPropertyId ?? ''}
                        onReloadReviews={loadPublicMatters}
                        showTypeBadge
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {monthlyPublishedInAllTab.length > 0 ? (
                <section className="space-y-4">
                  <h2 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">已发布经理月报</h2>
                  <div className="space-y-4">
                    {monthlyPublishedInAllTab.map((r) => (
                      <ManagerMonthlyReportCard
                        key={r.id}
                        report={r}
                        reviews={monthlyReportReviews.filter((rv) => rv.report_id === r.id)}
                        isManager={isPropertyManagerRole}
                        currentUserId={session?.user?.id ?? ''}
                        currentRole={roleInProperty}
                        currentPropertyId={currentPropertyId ?? ''}
                        showToast={showToast}
                        onReloadBundle={loadMonthlyBundle}
                        showTypeBadge
                      />
                    ))}
                  </div>
                </section>
              ) : null}

              {rows.length > 0 ? taskTableSection : null}
            </div>
          )}
        </>
      )}

      {isInspectionTab && (
        <>
          <div className="rounded-2xl border border-[#1D9E75]/30 bg-white shadow-sm p-6 mb-6">
            <h2 className="text-base font-semibold text-gray-900 mb-1">巡检记录 · 空白单</h2>
            <p className="text-xs text-gray-500 mb-4">
              {ownerFormReadOnly
                ? '以下为空白单结构预览（字段已锁定）。物业经理保存或发布后，真实记录出现在下方列表。'
                : '填写日期、区域、问题与处理方法后保存草稿；可从下方卡片「编辑草稿」继续，再发布巡检报告。'}
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">巡检日期 <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={irForm.inspection_date}
                  disabled={ownerFormReadOnly}
                  onChange={(e) => setIrForm({ ...irForm, inspection_date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">巡检区域 <span className="text-red-500">*</span></label>
                <input
                  value={irForm.areasText}
                  disabled={ownerFormReadOnly}
                  onChange={(e) => setIrForm({ ...irForm, areasText: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600"
                  placeholder="例如：车库 / 花园 / 公共照明"
                />
                <p className="mt-1 text-xs text-gray-400">可用 / 、逗号或换行分隔多个区域</p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">发现问题 <span className="text-red-500">*</span></label>
                <textarea
                  value={irForm.findings}
                  disabled={ownerFormReadOnly}
                  onChange={(e) => setIrForm({ ...irForm, findings: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600"
                  placeholder="例如：B2车库部分照明异常，花园发现枯树存在安全隐患"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">处理方法 <span className="text-red-500">*</span></label>
                <textarea
                  value={irForm.action_plan}
                  disabled={ownerFormReadOnly}
                  onChange={(e) => setIrForm({ ...irForm, action_plan: e.target.value })}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600"
                  placeholder="例如：通知电工检修照明，联系园林公司移除枯树"
                />
              </div>
            </div>
            {!ownerFormReadOnly ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void saveInspectionDraft()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#178a66]"
                >
                  保存草稿
                </button>
                {irForm.editingId ? (
                  <button
                    type="button"
                    onClick={() => void publishInspectionFromForm()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                  >
                    发布巡检报告
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => resetIrForm()}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  清空表单
                </button>
                {irForm.editingId ? (
                  <span className="text-xs text-gray-500 self-center">正在编辑草稿 ID：{irForm.editingId.slice(0, 8)}…</span>
                ) : null}
              </div>
            ) : null}
          </div>

          {!loadingInspections && inspectionReports.length === 0 ? (
            <ManagerDeskSampleCard titleLine="巡检记录 · 未来真实公示样式">
              <div className="rounded-xl border border-emerald-100 bg-white/90 px-4 py-3 space-y-2">
                <p className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wide">已发布 / Published</p>
                <p className="text-sm font-medium text-gray-900">示例：地下车库通风巡检</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  检查情况（示例）：风机运行正常，台账已更新；下期跟进排烟末端防火阀例行测试。
                </p>
                <p className="text-xs text-amber-600 pt-1 border-t border-emerald-100/80">
                  ★★★★☆ 公共评价与监督（示意）· Owners may rate and comment below each real record.
                </p>
              </div>
            </ManagerDeskSampleCard>
          ) : null}

          {loadingInspections ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[#1D9E75]" />
            </div>
          ) : inspectionReportsForViewer.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500 text-sm">
              暂无巡检记录
            </div>
          ) : (
            <div className="space-y-4">
              {inspectionReportsForViewer.map((report) => (
                <InspectionReportCard
                  key={report.id}
                  report={report}
                  reviews={inspectionReportReviews.filter((r) => r.inspection_report_id === report.id)}
                  currentUserId={session?.user?.id ?? ''}
                  currentRole={roleInProperty}
                  currentPropertyId={currentPropertyId ?? ''}
                  showToast={showToast}
                  onRefreshInspections={loadInspectionBundle}
                  onReloadInspectionReviews={loadInspectionBundle}
                  isManager={isPropertyManagerRole}
                  onPublishDraft={
                    isPropertyManagerRole ? (id) => void publishInspectionDraftById(id) : undefined
                  }
                  onLoadDraftIntoForm={
                    isPropertyManagerRole ? (r) => loadDraftIntoForm(r) : undefined
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {isPublicMatterTab && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#1D9E75]/30 bg-white shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900">公共事项 · 空白单</h2>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              公开记录影响全体业主生活的社区事项、公告、安全提醒与长期跟进问题，让处理进程接受业主监督。
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {ownerFormReadOnly
                ? '以下为空白单结构预览（字段已锁定）。物业经理保存或发布后，真实记录出现在下方列表。'
                : '填写事项内容与处理措施后保存；发布后将带发布时间并对外可见（依状态）。可从下方卡片「编辑草稿」继续。'}
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">事项内容 <span className="text-red-500">*</span></label>
                <textarea
                  value={pmForm.description}
                  disabled={ownerFormReadOnly}
                  onChange={(e) => setPmForm({ ...pmForm, description: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600"
                  placeholder="例如：B2车库夜间发现陌生人进入 / 周六上午停水维修 / 电梯保养通知"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">位置</label>
                <input
                  value={pmForm.location}
                  disabled={ownerFormReadOnly}
                  onChange={(e) => setPmForm({ ...pmForm, location: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600"
                  placeholder="例如：B2车库 / 1号电梯 / 花园 / 大堂 / 全楼"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">处理措施 <span className="text-red-500">*</span></label>
                <textarea
                  value={pmForm.managementMeasures}
                  disabled={ownerFormReadOnly}
                  onChange={(e) => setPmForm({ ...pmForm, managementMeasures: e.target.value })}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600"
                  placeholder="例如：已通知安保加强巡查 / 已联系维修公司 / 已安排电梯保养"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">当前状态 <span className="text-red-500">*</span></label>
                <select
                  value={pmForm.status}
                  disabled={ownerFormReadOnly}
                  onChange={(e) =>
                    setPmForm({
                      ...pmForm,
                      status: e.target.value as typeof pmForm.status,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600"
                >
                  {PUBLIC_MATTER_BLANK_STATUS_OPTIONS.map(({ value, zh }) => (
                    <option key={value} value={value}>
                      {zh}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">预计完成时间</label>
                <input
                  type="date"
                  value={pmForm.expected_completion_date}
                  disabled={ownerFormReadOnly}
                  onChange={(e) => setPmForm({ ...pmForm, expected_completion_date: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600"
                />
              </div>
            </div>
            {!ownerFormReadOnly ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void savePublicMatterDraft()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white hover:bg-[#178a66]"
                >
                  保存草稿
                </button>
                <button
                  type="button"
                  onClick={() => void publishPublicMatterReport()}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  发布公共事项
                </button>
                <button
                  type="button"
                  onClick={() => resetPmForm()}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  清空表单
                </button>
                {pmForm.editingId ? (
                  <span className="text-xs text-gray-500 self-center">编辑中：{pmForm.editingId.slice(0, 8)}…</span>
                ) : null}
              </div>
            ) : null}
          </div>

          {!loadingPM && publicMatters.length === 0 ? (
            <ManagerDeskSampleCard titleLine="公共事项 · 未来真实公示样式">
              <div className="rounded-xl border border-teal-100 bg-white/95 px-4 py-3 space-y-2 text-sm text-gray-800">
                <p className="text-[11px] font-semibold text-teal-800">公共问题跟进 · 示例标题</p>
                <p className="text-xs text-gray-600 leading-relaxed">
                  事项描述（示例）：大堂照明改造征求意见，物业将组织业主表决并公示时间表。
                </p>
                <div className="rounded-lg bg-teal-50/80 border border-teal-100 px-3 py-2 text-xs text-teal-900">
                  <span className="font-semibold">物业回复（示例）：</span>
                  已列入下月业委会议程，并将更新在此公共事项报告中。
                </div>
                <p className="text-xs text-amber-600 pt-1">★★★★☆ 全体业主可在正式发布记录底部评价与补充线索。</p>
              </div>
            </ManagerDeskSampleCard>
          ) : null}

          {loadingPM ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-[#1D9E75]" />
            </div>
          ) : visiblePublicMatters.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500 text-sm">
              暂无公共事项
            </div>
          ) : (
            <div className="space-y-4">
              {visiblePublicMatters.map((m) => (
                <PublicMatterCard
                  key={m.id}
                  matter={m}
                  isManager={isPropertyManagerRole}
                  showToast={showToast}
                  onRefresh={loadPublicMatters}
                  onLoadDraft={loadPmDraftIntoForm}
                  reviews={publicMatterReviews.filter((r) => r.public_matter_id === m.id)}
                  currentUserId={session?.user?.id ?? ''}
                  currentRole={roleInProperty}
                  currentPropertyId={currentPropertyId ?? ''}
                  onReloadReviews={loadPublicMatters}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {isManagerReportTab ? (
        <div className="space-y-6">
          <div className="rounded-2xl border border-[#1D9E75]/30 bg-white shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900">{en ? 'Manager monthly report' : '经理月报 · 空白单'}</h2>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {en
                ? 'The property manager explains this month’s operations, key risks, long-term follow-ups, and next month’s priorities — open to owner oversight.'
                : '物业经理公开说明本月物业运行情况、重点风险、长期跟进事项与下月工作重点，接受业主监督。'}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              {ownerFormReadOnly
                ? '以下为本月报空白结构（字段锁定，不可生成或保存）。真实草稿与发布内容见下方列表。'
                : '选择报告月份后生成系统草稿，并在下方卡片中编辑、保存与发布公告。'}
            </p>

            {currentPropertyId ? (
              <div className="mt-4 flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">报告月份</label>
                  <input
                    type="month"
                    value={monthPickerYm}
                    disabled={ownerFormReadOnly}
                    onChange={(e) => setMonthPickerYm(e.target.value)}
                    className="rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-600"
                  />
                </div>
                {!ownerFormReadOnly ? (
                  <button
                    type="button"
                    disabled={generatingMR || !session?.user}
                    onClick={() => void generateMonthlyDraft()}
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#178a66]"
                  >
                    {generatingMR ? <Loader2 size={14} className="animate-spin" /> : null}
                    生成本月月报草稿
                  </button>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">本月物业运行摘要 monthly_summary</label>
                <textarea
                  rows={3}
                  readOnly={ownerFormReadOnly}
                  placeholder={
                    ownerFormReadOnly
                      ? '（空白结构：正式发布后正文显示在下方列表）'
                      : '生成草稿后在下方列表卡片中编辑；此处可暂记笔记（不写库）'
                  }
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${
                    ownerFormReadOnly
                      ? 'border-dashed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  defaultValue=""
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">重点风险与问题 key_risks</label>
                <textarea
                  rows={3}
                  readOnly={ownerFormReadOnly}
                  placeholder="（空白结构示意）"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${
                    ownerFormReadOnly
                      ? 'border-dashed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  defaultValue=""
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">长期跟进事项 long_term_items</label>
                <textarea
                  rows={3}
                  readOnly={ownerFormReadOnly}
                  placeholder="（空白结构示意）"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${
                    ownerFormReadOnly
                      ? 'border-dashed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  defaultValue=""
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">下月工作重点 next_month_focus</label>
                <textarea
                  rows={2}
                  readOnly={ownerFormReadOnly}
                  placeholder="（空白结构示意）"
                  className={`w-full rounded-lg border px-3 py-2 text-sm ${
                    ownerFormReadOnly
                      ? 'border-dashed border-gray-200 bg-gray-50 text-gray-500'
                      : 'border-gray-300 bg-white text-gray-900'
                  }`}
                  defaultValue=""
                />
              </div>
            </div>
          </div>

          {!loadingMR && monthlyReports.length === 0 ? (
            <ManagerDeskSampleCard titleLine="经理月报 · 未来真实公示样式">
              <div className="rounded-xl border border-[#1D9E75]/20 bg-white px-4 py-3 space-y-3 text-sm text-gray-800">
                <p className="text-xs font-semibold text-gray-500">2026 年 3 月 · 已发布</p>
                <div>
                  <p className="text-[11px] font-medium text-gray-500 mb-0.5">本月物业运行摘要</p>
                  <p className="text-xs leading-relaxed text-gray-700">
                    示例：本月完成消防年检复检，绿化养护按合同执行；快递间照明已更换 LED。
                  </p>
                </div>
                <p className="text-xs text-amber-600 border-t border-gray-100 pt-2">★★★★☆ 业主可在真实月报下方提交公开评价与监督意见。</p>
              </div>
            </ManagerDeskSampleCard>
          ) : null}

          {loadingMR ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-10 w-10 animate-spin text-[#1D9E75]" />
            </div>
          ) : monthlyReportsForViewer.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500 text-sm">
              {isPropertyManagerRole ? '暂无月报草稿或已发布记录，可使用上方生成草稿。' : '暂无已发布经理月报'}
            </div>
          ) : (
            <div className="space-y-4">
              {monthlyReportsForViewer.map((r) => (
                <ManagerMonthlyReportCard
                  key={r.id}
                  report={r}
                  reviews={monthlyReportReviews.filter((rv) => rv.report_id === r.id)}
                  isManager={isPropertyManagerRole}
                  currentUserId={session?.user?.id ?? ''}
                  currentRole={roleInProperty}
                  currentPropertyId={currentPropertyId ?? ''}
                  showToast={showToast}
                  onReloadBundle={loadMonthlyBundle}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
