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

/** 【巡检记录】tab：未来功能结构占位（无真实数据） */
function InspectionRecordsPlaceholder({ en }: { en: boolean }) {
  const copy = en
    ? {
        title: 'Inspection records',
        intro:
          'The property manager will regularly publish common-area inspection reports, including issues found, on-site evidence, follow-up progress, and owner oversight.',
        b1: 'Basics',
        b1Lines: ['Title', 'Inspection date', 'Area', 'Inspector'],
        b2: 'Categories',
        b3: 'Status',
        b4: 'Evidence',
        b4Text: 'Photos, videos, and PDF inspection reports will be supported.',
        b5: 'Follow-up & oversight',
        b5Text:
          'Vendor notification, ETA, progress, completion time; owners may comment, rate, and add on-site observations.',
        exampleNote: 'Sample data — for layout preview only.',
        exampleTitle: 'May 2026 common-area inspection',
        exampleBody:
          'Garage, garden, and public lighting checked; dead trees in the garden and B2 garage lighting anomalies found; follow-up scheduled.',
        exampleStatus: 'Scheduled for remediation',
        exampleAreas: 'Garage / Garden / Public lighting',
      }
    : {
        title: '巡检记录',
        intro:
          '物业经理定期公开上传公共区域检查记录，展示发现的问题、现场证据、处理进度，并接受业主监督。',
        b1: '基础信息',
        b1Lines: ['巡检标题', '巡检日期', '巡检区域', '巡检人'],
        b2: '巡检分类',
        b3: '巡检状态',
        b4: '现场证据',
        b4Text: '支持现场照片、视频、PDF 巡检报告。',
        b5: '后续处理与公开监督',
        b5Text:
          '可记录是否已通知供应商、预计处理时间、处理进度、完成时间；业主可评论、评分并补充现场情况。',
        exampleNote: '示例数据，仅用于展示未来功能结构。',
        exampleTitle: '2026年5月公共区域巡检',
        exampleBody:
          '车库、花园与公共照明完成例行检查，发现花园枯树和B2车库照明异常，已安排后续处理。',
        exampleStatus: '已安排处理',
        exampleAreas: '车库 / 花园 / 公共照明',
      };

  const categories = en
    ? ['Elevators', 'Fire safety', 'Garage', 'Trash room', 'Roof', 'Garden', 'Public lighting', 'Lobby', 'Security', 'Piping', 'Exterior']
    : ['电梯', '消防', '车库', '垃圾房', '屋顶', '花园', '公共照明', '大堂', '安保', '管道', '外墙'];

  const statuses = en
    ? ['Normal', 'Needs repair', 'High risk', 'Scheduled', 'Completed']
    : ['正常', '需维修', '高风险', '已安排处理', '已完成'];

  const Block = ({
    step,
    title,
    children,
  }: {
    step: string;
    title: string;
    children: ReactNode;
  }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xs font-bold text-[#1D9E75]">{step}</span>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#1D9E75]/25 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">{copy.title}</h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{copy.intro}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Block step="1" title={copy.b1}>
          <ul className="space-y-1.5 text-sm text-gray-700">
            {copy.b1Lines.map((line) => (
              <li key={line} className="flex items-center gap-2">
                <span className="h-1 w-1 rounded-full bg-[#1D9E75]" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </Block>

        <Block step="2" title={copy.b2}>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <span
                key={c}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 border border-slate-200"
              >
                {c}
              </span>
            ))}
          </div>
        </Block>

        <Block step="3" title={copy.b3}>
          <div className="flex flex-wrap gap-2">
            {statuses.map((s) => (
              <span
                key={s}
                className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 border border-amber-200"
              >
                {s}
              </span>
            ))}
          </div>
        </Block>

        <Block step="4" title={copy.b4}>
          <p className="text-sm text-gray-600 leading-relaxed">{copy.b4Text}</p>
        </Block>
      </div>

      <Block step="5" title={copy.b5}>
        <p className="text-sm text-gray-600 leading-relaxed">{copy.b5Text}</p>
      </Block>

      <div className="rounded-2xl border-2 border-dashed border-[#1D9E75]/35 bg-[#1D9E75]/[0.06] p-6">
        <p className="text-xs font-medium text-[#15803d] mb-4">{copy.exampleNote}</p>
        <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <h4 className="text-base font-semibold text-gray-900">{copy.exampleTitle}</h4>
            <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-100">
              {copy.exampleStatus}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">{copy.exampleBody}</p>
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-600">{en ? 'Areas: ' : '区域：'}</span>
            {copy.exampleAreas}
          </p>
        </div>
      </div>
    </div>
  );
}

/** 【公共事项】tab：未来功能结构占位（无真实数据） */
function PublicMattersPlaceholder({ en }: { en: boolean }) {
  const copy = en
    ? {
        title: 'Public matters',
        intro:
          'Open records of matters that affect everyone: community updates, announcements, safety alerts, and long-term issues — with progress visible to owners.',
        b1: 'Public issue follow-up',
        b1Lines: [
          'Long-running elevator noise',
          'Trash room odor',
          'Strangers in the garage',
          'Night-time noise complaints',
          'Public lighting faults',
        ],
        b2: 'Community notices',
        b2Lines: [
          'Water outage notice',
          'Fire inspection notice',
          'Garage cleaning notice',
          'Elevator maintenance notice',
          'Landscaping schedule',
        ],
        b3: 'Safety reminders',
        b3Lines: ['Theft risk', 'Tailgating by strangers', 'False fire alarms', 'Pet policy reminder'],
        b4: 'Complaint hotspots',
        b4Text:
          'Summarize repeat complaints, number of actions taken, average resolution time, and current status.',
        b5: 'Owner engagement & oversight',
        b5Text:
          'Owners may comment, add on-site observations, follow items, and rate the property response.',
        statusHeading: 'Status',
        exampleNote: 'Sample data — for layout preview only.',
        exampleTitle: 'Strangers entering B2 garage',
        exampleBody:
          'Several owners reported strangers in the garage at night; security patrols were increased and owners are reminded to watch for tailgating.',
        exampleStatus: 'Long-term follow-up',
        exampleType: 'Safety alert / Public issue follow-up',
        typeLabel: 'Type: ',
      }
    : {
        title: '公共事项',
        intro:
          '公开记录影响全体业主生活的社区事项、公告、安全提醒与长期跟进问题，让处理进程接受业主监督。',
        b1: '公共问题跟进',
        b1Lines: ['电梯长期异响', '垃圾房异味', '车库陌生人进入', '夜间噪音投诉', '公共照明故障'],
        b2: '社区公告',
        b2Lines: ['停水通知', '消防检查通知', '车库清洗通知', '电梯保养通知', '园林修剪安排'],
        b3: '安全提醒',
        b3Lines: ['盗窃风险', '陌生人尾随', '火警误报', '宠物管理提醒'],
        b4: '投诉热点',
        b4Text: '统计反复被投诉的问题、处理次数、平均处理时间和当前状态。',
        b5: '业主互动监督',
        b5Text: '业主可评论、补充现场情况、关注事项并评价物业响应。',
        statusHeading: '状态标签',
        exampleNote: '示例数据，仅用于展示未来功能结构。',
        exampleTitle: 'B2 车库陌生人进入问题',
        exampleBody:
          '近期多位业主反馈 B2 车库夜间有陌生人进入，物业已通知安保加强巡查，并建议业主进出车库时留意尾随情况。',
        exampleStatus: '长期跟进',
        exampleType: '安全提醒 / 公共问题跟进',
        typeLabel: '类型：',
      };

  const statuses = en
    ? ['Pending', 'In progress', 'Resolved', 'Long-term follow-up', 'Closed']
    : ['待处理', '处理中', '已解决', '长期跟进', '已关闭'];

  const Block = ({
    step,
    title,
    children,
  }: {
    step: string;
    title: string;
    children: ReactNode;
  }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xs font-bold text-[#1D9E75]">{step}</span>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  const bulletList = (lines: string[]) => (
    <ul className="space-y-1.5 text-sm text-gray-700">
      {lines.map((line) => (
        <li key={line} className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-[#1D9E75]" aria-hidden />
          {line}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#1D9E75]/25 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">{copy.title}</h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{copy.intro}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Block step="1" title={copy.b1}>
          {bulletList(copy.b1Lines)}
        </Block>
        <Block step="2" title={copy.b2}>
          {bulletList(copy.b2Lines)}
        </Block>
        <Block step="3" title={copy.b3}>
          {bulletList(copy.b3Lines)}
        </Block>
        <Block step="4" title={copy.b4}>
          <p className="text-sm text-gray-600 leading-relaxed">{copy.b4Text}</p>
        </Block>
      </div>

      <Block step="5" title={copy.b5}>
        <p className="text-sm text-gray-600 leading-relaxed">{copy.b5Text}</p>
      </Block>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900 mb-3">{copy.statusHeading}</h3>
        <div className="flex flex-wrap gap-2">
          {statuses.map((s) => (
            <span
              key={s}
              className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-900 border border-amber-200"
            >
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border-2 border-dashed border-[#1D9E75]/35 bg-[#1D9E75]/[0.06] p-6">
        <p className="text-xs font-medium text-[#15803d] mb-4">{copy.exampleNote}</p>
        <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <h4 className="text-base font-semibold text-gray-900">{copy.exampleTitle}</h4>
            <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-100">
              {copy.exampleStatus}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">{copy.exampleBody}</p>
          <p className="text-xs text-gray-500">
            <span className="font-semibold text-gray-600">{copy.typeLabel}</span>
            {copy.exampleType}
          </p>
        </div>
      </div>
    </div>
  );
}

/** 【经理月报】tab：未来功能结构占位（无采购/财务/单列说明；侧重风险、长期问题、下月重点） */
function ManagerMonthlyReportPlaceholder({ en }: { en: boolean }) {
  const copy = en
    ? {
        title: 'Manager monthly report',
        intro:
          'The property manager publishes how operations performed this month, key risks, long-running follow-ups, and next-month priorities — open to owner oversight.',
        b1: 'Monthly operations snapshot',
        b1Lines: [
          'Overall operations remained stable',
          'Multiple common-area upkeep items completed',
          'Some long-term issues remain under active follow-up',
        ],
        b2: 'Key risks & issues',
        lblCurrent: 'Current status',
        lblLevel: 'Risk level',
        lblScheduled: 'Action scheduled',
        risks: [
          { name: 'Roof aging', status: 'Under observation', level: 'Medium', scheduled: 'Yes' },
          { name: 'Rising elevator faults', status: 'Vendor follow-up', level: 'High', scheduled: 'Yes' },
          { name: 'Garage water pooling', status: 'Seasonal focus', level: 'Medium', scheduled: 'No' },
          { name: 'Fire door closure faults', status: 'Parts pending', level: 'High', scheduled: 'Yes' },
          { name: 'Stranger tailgating', status: 'Security patrol stepped up', level: 'Medium', scheduled: 'Yes' },
        ],
        b3: 'Long-term follow-ups',
        b3Lines: [
          'Exterior wall maintenance',
          'Aging drainage system',
          'Under-garage lighting upgrade',
          'Ongoing garden care program',
        ],
        b3Note:
          'These are not quick wins — they stay on the roadmap and are tracked over time.',
        b4: 'Next-month priorities',
        b4Lines: [
          'Annual fire inspection',
          'Landscaping maintenance',
          'Further roof assessment',
          'Parking area deep clean',
        ],
        exampleNote: 'Sample data — for layout preview only.',
        exampleTitle: 'May 2026 manager report',
        exampleSummary:
          'Focused on garage safety, roof aging, and common-area upkeep; some items escalated to vendors for further work.',
        exampleStatus: 'Ongoing follow-up',
        summaryLabel: 'Summary: ',
      }
    : {
        title: '经理月报',
        intro:
          '物业经理公开说明本月物业运行情况、重点风险、长期跟进事项与下月工作重点，接受业主监督。',
        b1: '本月物业运行摘要',
        b1Lines: ['本月整体运行稳定', '已完成多项公共区域维护', '部分长期问题仍持续跟进'],
        b2: '重点风险与问题',
        lblCurrent: '当前状态',
        lblLevel: '风险等级',
        lblScheduled: '是否已安排处理',
        risks: [
          { name: '屋顶老化风险', status: '持续观测', level: '中', scheduled: '是' },
          { name: '电梯故障增加', status: '维保跟进', level: '高', scheduled: '是' },
          { name: '车库积水', status: '汛期重点', level: '中', scheduled: '否' },
          { name: '消防门闭合异常', status: '已报修待件', level: '高', scheduled: '是' },
          { name: '陌生人尾随问题', status: '安防加强巡查', level: '中', scheduled: '是' },
        ],
        b3: '长期跟进事项',
        b3Lines: ['外墙维护', '排水系统老化', '地下车库照明升级', '花园长期维护'],
        b3Note: '这些事项不是短期能完成，而是持续跟进项目。',
        b4: '下月工作重点',
        b4Lines: ['消防年度检查', '园林维护', '屋顶进一步检测', '停车场清洁'],
        exampleNote: '示例数据，仅用于展示未来功能结构。',
        exampleTitle: '2026年5月经理月报',
        exampleSummary:
          '本月重点跟进车库安全、屋顶老化与公共区域维护问题，部分事项已安排供应商进一步处理。',
        exampleStatus: '持续跟进中',
        summaryLabel: '摘要：',
      };

  const Block = ({
    step,
    title,
    children,
  }: {
    step: string;
    title: string;
    children: ReactNode;
  }) => (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-xs font-bold text-[#1D9E75]">{step}</span>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      {children}
    </div>
  );

  const bulletList = (lines: string[]) => (
    <ul className="space-y-1.5 text-sm text-gray-700">
      {lines.map((line) => (
        <li key={line} className="flex items-center gap-2">
          <span className="h-1 w-1 rounded-full bg-[#1D9E75]" aria-hidden />
          {line}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#1D9E75]/25 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900">{copy.title}</h2>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">{copy.intro}</p>
      </div>

      <Block step="1" title={copy.b1}>
        {bulletList(copy.b1Lines)}
      </Block>

      <Block step="2" title={copy.b2}>
        <div className="space-y-3">
          {copy.risks.map((r) => (
            <div key={r.name} className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="text-sm font-semibold text-gray-900 mb-2">{r.name}</p>
              <dl className="grid gap-1.5 text-xs text-gray-600 sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-gray-500">{copy.lblCurrent}</dt>
                  <dd className="text-gray-800">{r.status}</dd>
                </div>
                <div>
                  <dt className="font-medium text-gray-500">{copy.lblLevel}</dt>
                  <dd className="text-gray-800">{r.level}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="font-medium text-gray-500">{copy.lblScheduled}</dt>
                  <dd className="text-gray-800">{r.scheduled}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      </Block>

      <Block step="3" title={copy.b3}>
        {bulletList(copy.b3Lines)}
        <p className="mt-3 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">{copy.b3Note}</p>
      </Block>

      <Block step="4" title={copy.b4}>
        {bulletList(copy.b4Lines)}
      </Block>

      <div className="rounded-2xl border-2 border-dashed border-[#1D9E75]/35 bg-[#1D9E75]/[0.06] p-6">
        <p className="text-xs font-medium text-[#15803d] mb-4">{copy.exampleNote}</p>
        <div className="rounded-xl bg-white border border-gray-200 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
            <h4 className="text-base font-semibold text-gray-900">{copy.exampleTitle}</h4>
            <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-800 border border-blue-100">
              {copy.exampleStatus}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">
            <span className="font-semibold text-gray-700">{copy.summaryLabel}</span>
            {copy.exampleSummary}
          </p>
        </div>
      </div>
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

  const isOwnerRequestTab = filterType === 'owner_request';
  const isAllTab = filterType === 'all';

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

      {/* ── 业主诉求：仅提交表单 ───────────────────────────────────────────── */}
      {isOwnerRequestTab && (
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
      )}

      {/* ── 全部：业主诉求卡片 + manager_tasks ───────────────────────────────── */}
      {isAllTab && (
        <>
          {taskError ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">{taskError}</div>
          ) : null}

          {loadingTasks || loadingOR ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-10 w-10 animate-spin text-[#1D9E75]" />
            </div>
          ) : ownerRequests.length === 0 && rows.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-500">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              {en ? 'No tasks.' : '暂无任务'}
            </div>
          ) : (
            <div className="space-y-8">
              {ownerRequests.length > 0 ? (
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
              ) : null}
              {rows.length > 0 ? taskTableSection : null}
            </div>
          )}
        </>
      )}

      {filterType === 'inspection' ? <InspectionRecordsPlaceholder en={en} /> : null}

      {filterType === 'public_matter' ? <PublicMattersPlaceholder en={en} /> : null}

      {filterType === 'manager_report' ? <ManagerMonthlyReportPlaceholder en={en} /> : null}
    </div>
  );
}
