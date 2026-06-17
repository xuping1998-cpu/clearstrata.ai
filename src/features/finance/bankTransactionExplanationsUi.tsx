import { useState } from 'react';
import { X } from 'lucide-react';
import type { BankTransactionExplanation } from './bankTransactionExplanations';

type RequestModalProps = {
  open: boolean;
  en: boolean;
  description: string;
  amount: number;
  busy: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

export function RequestExplanationModal({
  open,
  en,
  description,
  amount,
  busy,
  onClose,
  onSubmit,
}: RequestModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {en ? 'Request explanation from property manager' : '要求物业经理解释'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <p className="mb-2 text-sm text-gray-600">
          {en
            ? 'Please describe the purpose of this payment, invoice reference, and approval basis.'
            : '请说明该付款对应的用途、发票编号及审批依据。'}
        </p>
        <div className="mb-4 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">
          <div className="font-medium">{description}</div>
          <div className="tabular-nums text-red-700">${Math.abs(amount).toFixed(2)}</div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {en ? 'Cancel' : '取消'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onSubmit}
            className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white hover:bg-[#178a66] disabled:opacity-50"
          >
            {busy ? (en ? 'Sending…' : '发送中…') : en ? 'Send request' : '发送请求'}
          </button>
        </div>
      </div>
    </div>
  );
}

type RespondModalProps = {
  open: boolean;
  en: boolean;
  description: string;
  amount: number;
  busy: boolean;
  onClose: () => void;
  onSubmit: (text: string) => void;
};

export function RespondExplanationModal({
  open,
  en,
  description,
  amount,
  busy,
  onClose,
  onSubmit,
}: RespondModalProps) {
  const [text, setText] = useState('');

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {en ? 'Respond to explanation request' : '回复解释请求'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-950">
          <div>{description}</div>
          <div className="tabular-nums font-semibold">${Math.abs(amount).toFixed(2)}</div>
        </div>
        <label className="mb-1 block text-sm font-medium text-gray-700">
          {en ? 'Please explain the purpose of this payment.' : '请说明该付款用途。'}
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="mb-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder={en ? 'Invoice #, approval basis, vendor…' : '发票编号、审批依据、供应商…'}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {en ? 'Cancel' : '取消'}
          </button>
          <button
            type="button"
            disabled={busy || !text.trim()}
            onClick={() => onSubmit(text.trim())}
            className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white hover:bg-[#178a66] disabled:opacity-50"
          >
            {busy ? (en ? 'Saving…' : '保存中…') : en ? 'Save response' : '保存回复'}
          </button>
        </div>
      </div>
    </div>
  );
}

type ViewModalProps = {
  open: boolean;
  en: boolean;
  explanation: BankTransactionExplanation | null;
  description: string;
  amount: number;
  busy: boolean;
  canClose: boolean;
  onClose: () => void;
  onCloseRecord: () => void;
};

export function ViewExplanationModal({
  open,
  en,
  explanation,
  description,
  amount,
  busy,
  canClose,
  onClose,
  onCloseRecord,
}: ViewModalProps) {
  if (!open || !explanation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {en ? 'Manager response' : '物业经理回复'}
          </h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-800">
          <div>{description}</div>
          <div className="tabular-nums text-red-700">${Math.abs(amount).toFixed(2)}</div>
        </div>
        <div className="mb-4 whitespace-pre-wrap rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-gray-900">
          {explanation.manager_response}
        </div>
        {explanation.responded_at && (
          <p className="mb-4 text-xs text-gray-500">
            {en ? 'Responded: ' : '回复时间：'}
            {new Date(explanation.responded_at).toLocaleString(en ? 'en-CA' : 'zh-CN')}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            {en ? 'Dismiss' : '关闭窗口'}
          </button>
          {canClose && explanation.status === 'responded' && (
            <button
              type="button"
              disabled={busy}
              onClick={onCloseRecord}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-900 disabled:opacity-50"
            >
              {busy ? (en ? 'Closing…' : '处理中…') : en ? 'Close' : '关闭'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

type ExplanationCellProps = {
  en: boolean;
  amount: number;
  matchStatus: string | null | undefined;
  explanation: BankTransactionExplanation | undefined;
  canRequest: boolean;
  canRespond: boolean;
  canClose: boolean;
  onRequest: () => void;
  onRespond: () => void;
  onView: () => void;
};

export function BankExplanationCell({
  en,
  amount,
  matchStatus,
  explanation,
  canRequest,
  canRespond,
  canClose,
  onRequest,
  onRespond,
  onView,
}: ExplanationCellProps) {
  const isExpense = Number(amount) < 0;
  const unmatched = (matchStatus ?? 'unmatched') === 'unmatched';

  if (!explanation) {
    if (!isExpense || !unmatched || !canRequest) {
      return <span className="text-xs text-gray-300">—</span>;
    }
    return (
      <button
        type="button"
        onClick={onRequest}
        className="rounded border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-800 hover:bg-red-100"
      >
        {en ? 'Request Explanation' : '请求解释'}
      </button>
    );
  }

  if (explanation.status === 'pending') {
    return (
      <div className="space-y-1 text-xs">
        <span className="font-medium text-amber-800">
          {en ? 'Explanation requested' : '待解释支出'}
        </span>
        {canRespond && (
          <button
            type="button"
            onClick={onRespond}
            className="block rounded border border-sky-200 bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 hover:bg-sky-100"
          >
            {en ? 'Respond' : '回复解释'}
          </button>
        )}
      </div>
    );
  }

  if (explanation.status === 'responded') {
    return (
      <div className="space-y-1 text-xs">
        <span className="font-medium text-emerald-800">{en ? 'Manager responded' : '经理已回复'}</span>
        <button
          type="button"
          onClick={onView}
          className="block rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-800 hover:bg-gray-50"
        >
          {en ? 'View response' : '查看回复'}
        </button>
      </div>
    );
  }

  if (explanation.status === 'closed' && explanation.manager_response) {
    return (
      <button
        type="button"
        onClick={onView}
        className="text-[11px] font-medium text-gray-600 hover:underline"
      >
        {en ? 'Archived response' : '已归档回复'}
      </button>
    );
  }

  return <span className="text-xs text-gray-300">—</span>;
}

export function PaymentSummaryCards({
  en,
  summaries,
  activeFilter,
  onFilter,
}: {
  en: boolean;
  summaries: {
    confirmed: { count: number; total: number };
    suggested: { count: number; total: number };
    unmatched: { count: number; total: number };
  };
  activeFilter: string | null;
  onFilter: (filter: 'confirmed' | 'suggested' | 'unmatched' | null) => void;
}) {
  const cards = [
    {
      key: 'confirmed' as const,
      titleEn: 'Confirmed Payments',
      titleZh: '已确认付款',
      summary: summaries.confirmed,
      className: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100/80',
      titleClass: 'text-emerald-900',
      activeRing: 'ring-2 ring-emerald-500',
    },
    {
      key: 'suggested' as const,
      titleEn: 'Pending Review',
      titleZh: '待确认付款',
      summary: summaries.suggested,
      className: 'border-amber-200 bg-amber-50 hover:bg-amber-100/80',
      titleClass: 'text-amber-900',
      activeRing: 'ring-2 ring-amber-500',
    },
    {
      key: 'unmatched' as const,
      titleEn: 'Unexplained Payments',
      titleZh: '未解释付款',
      summary: summaries.unmatched,
      className: 'border-red-200 bg-red-50 hover:bg-red-100/80',
      titleClass: 'text-red-900',
      activeRing: 'ring-2 ring-red-500',
    },
  ];

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-3 border-b border-gray-200">
      {cards.map((card) => {
        const active = activeFilter === card.key;
        return (
          <button
            key={card.key}
            type="button"
            onClick={() => onFilter(active ? null : card.key)}
            className={`rounded-xl border p-4 text-left transition ${card.className} ${active ? card.activeRing : ''}`}
          >
            <div className={`text-sm font-semibold ${card.titleClass}`}>
              {en ? card.titleEn : card.titleZh}
            </div>
            <div className={`mt-1 text-2xl font-bold tabular-nums ${card.titleClass}`}>
              ${card.summary.total.toFixed(2)}
            </div>
            <div className="mt-1 text-xs text-gray-600">
              {en
                ? `${card.summary.count} transaction${card.summary.count === 1 ? '' : 's'}`
                : `${card.summary.count} 笔`}
            </div>
          </button>
        );
      })}
    </div>
  );
}
