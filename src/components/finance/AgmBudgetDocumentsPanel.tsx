import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import {
  approveAgmBudgetDocument,
  fetchAgmBudgetDocuments,
  saveAgmBudgetDraft,
} from '../../features/finance/agmBudgetApi';
import {
  agmBudgetStatusLabel,
  extractDraftFiscalYear,
  extractDraftLines,
  type AgmBudgetDocumentRow,
  type AgmBudgetDraftLine,
  type AgmBudgetType,
} from '../../features/finance/agmBudgetDocuments';
import {
  agmBudgetTypeLabel,
  classifyAgmBudgetType,
  sumAgmBudgetLines,
} from '../../features/finance/agmBudgetType';
import { parseAgmBudgetPdfDocument } from '../../features/finance/parseAgmBudgetPdf';
import { uploadAgmBudgetPdf } from '../../features/finance/uploadAgmBudgetPdf';
import { formatCurrency } from '../../lib/budget/dashboardApi';

type Props = {
  propertyId: string;
  fiscalYear: number;
  canUpload: boolean;
  canApprove: boolean;
  en: boolean;
  onApproved: () => void;
};

function statusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case 'pending_parse':
      return 'bg-amber-100 text-amber-900';
    case 'parsed':
      return 'bg-sky-100 text-sky-900';
    case 'approved':
      return 'bg-green-100 text-green-900';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export function AgmBudgetDocumentsPanel({
  propertyId,
  fiscalYear,
  canUpload,
  canApprove,
  en,
  onApproved,
}: Props) {
  const { profile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useState<AgmBudgetDocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [parsingId, setParsingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [reviewDocId, setReviewDocId] = useState<string | null>(null);
  const [draftLines, setDraftLines] = useState<AgmBudgetDraftLine[]>([]);
  const [draftYear, setDraftYear] = useState(fiscalYear);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    const rows = await fetchAgmBudgetDocuments(propertyId);
    setDocuments(rows);
    setLoading(false);
  }, [propertyId]);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  const openReview = (doc: AgmBudgetDocumentRow) => {
    setReviewDocId(doc.id);
    setDraftLines(extractDraftLines(doc.parsed_draft));
    setDraftYear(extractDraftFiscalYear(doc) ?? fiscalYear);
    setMessage(null);
  };

  const handleUpload = async (file: File | null) => {
    if (!file || !profile?.id || !canUpload) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setMessage({
        ok: false,
        text: en ? 'Please upload a PDF file.' : '请上传 PDF 文件。',
      });
      return;
    }
    setUploading(true);
    setMessage(null);
    const { result, error } = await uploadAgmBudgetPdf({
      propertyId,
      createdBy: profile.id,
      file,
    });
    setUploading(false);
    if (error || !result) {
      setMessage({ ok: false, text: error ?? (en ? 'Upload failed.' : '上传失败。') });
      return;
    }
    await loadDocuments();
    setMessage({ ok: true, text: en ? 'AGM budget PDF uploaded.' : 'AGM 预算 PDF 已上传。' });
  };

  const handleParse = async (doc: AgmBudgetDocumentRow) => {
    if (!canUpload || parsingId) return;
    setParsingId(doc.id);
    setMessage(null);
    const { result, error } = await parseAgmBudgetPdfDocument({
      documentId: doc.id,
      storagePath: doc.storage_path,
      fileName: doc.file_name,
      languageEn: en,
    });
    setParsingId(null);
    if (error || !result) {
      setMessage({ ok: false, text: error ?? (en ? 'Parse failed.' : '解析失败。') });
      await loadDocuments();
      return;
    }
    await loadDocuments();
    setMessage({
      ok: true,
      text: en
        ? `Parsed ${result.lines.length} budget line(s).`
        : `已解析 ${result.lines.length} 条预算科目。`,
    });
  };

  const handleApprove = async (doc: AgmBudgetDocumentRow) => {
    if (!canApprove || approvingId) return;
    const lines = reviewDocId === doc.id ? draftLines : extractDraftLines(doc.parsed_draft);
    const year = reviewDocId === doc.id ? draftYear : (extractDraftFiscalYear(doc) ?? fiscalYear);
    if (lines.length === 0) {
      setMessage({ ok: false, text: en ? 'No budget lines to approve.' : '没有可批准的预算行。' });
      return;
    }
    setApprovingId(doc.id);
    setMessage(null);
    const { linesWritten, error } = await approveAgmBudgetDocument(doc.id, year, lines);
    setApprovingId(null);
    if (error) {
      setMessage({ ok: false, text: error });
      return;
    }
    setReviewDocId(null);
    await loadDocuments();
    onApproved();
    setMessage({
      ok: true,
      text: en
        ? `Approved ${linesWritten} budget line(s) for FY ${year}.`
        : `已批准 FY ${year} 共 ${linesWritten} 条预算科目。`,
    });
  };

  const updateDraftLine = (
    index: number,
    field: 'category' | 'amount' | 'budget_type',
    value: string,
  ) => {
    setDraftLines((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        if (field === 'category') {
          return {
            ...row,
            category: value,
            budget_type: classifyAgmBudgetType(value),
          };
        }
        if (field === 'budget_type') {
          const budget_type: AgmBudgetType = value === 'revenue' ? 'revenue' : 'expense';
          return { ...row, budget_type };
        }
        const n = Number(value);
        return { ...row, amount: Number.isFinite(n) ? n : 0 };
      }),
    );
  };

  const saveDraftEdits = async (docId: string) => {
    const { error } = await saveAgmBudgetDraft(docId, draftYear, draftLines);
    if (error) {
      setMessage({ ok: false, text: error });
      return;
    }
    await loadDocuments();
    setMessage({ ok: true, text: en ? 'Draft saved.' : '草稿已保存。' });
  };

  const { revenueTotal, expenseTotal, netBudget } = sumAgmBudgetLines(draftLines);

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {en ? 'AGM Budget PDF' : 'AGM 预算文件'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {en
              ? 'Upload the AGM-approved budget PDF, AI-parse categories, then council approves into the budget database.'
              : '上传 AGM 批准预算 PDF，AI 识别科目后由业委会审核写入预算库。'}
          </p>
        </div>
        {canUpload ? (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                void handleUpload(f);
                e.target.value = '';
              }}
            />
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-lg bg-clearstrata-brand-700 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-clearstrata-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Upload className="size-4" aria-hidden />
              )}
              {uploading
                ? en
                  ? 'Uploading…'
                  : '上传中…'
                : en
                  ? 'Upload AGM Budget PDF'
                  : '上传 AGM Budget PDF'}
            </button>
          </div>
        ) : null}
      </div>

      {message ? (
        <p className={`mt-3 text-sm ${message.ok ? 'text-green-800' : 'text-red-700'}`}>{message.text}</p>
      ) : null}

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          {en ? 'Loading documents…' : '正在加载文件…'}
        </div>
      ) : documents.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          {en ? 'No AGM budget PDF uploaded yet.' : '尚未上传 AGM 预算 PDF。'}
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                <th className="px-2 py-2 font-medium">{en ? 'File' : '预算文件'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Status' : '状态'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Uploaded' : '上传时间'}</th>
                <th className="px-2 py-2 font-medium">{en ? 'Actions' : '操作'}</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => {
                const parseBusy = parsingId === doc.id;
                const approveBusy = approvingId === doc.id;
                const showParse = canUpload && doc.status === 'pending_parse';
                const showReview = doc.status === 'parsed';
                const showApprove = canApprove && doc.status === 'parsed';
                return (
                  <tr key={doc.id} className="border-b border-gray-100 align-top">
                    <td className="px-2 py-3">
                      <div className="font-medium text-gray-900">{doc.file_name}</div>
                      {doc.notes ? (
                        <div className="mt-1 text-xs text-red-600">{doc.notes}</div>
                      ) : null}
                    </td>
                    <td className="px-2 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(doc.status)}`}
                      >
                        {agmBudgetStatusLabel(doc.status, en)}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-gray-600">
                      {new Date(doc.created_at).toLocaleString(en ? 'en-CA' : 'zh-CN')}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-wrap gap-2">
                        {showParse ? (
                          <button
                            type="button"
                            disabled={parseBusy}
                            onClick={() => void handleParse(doc)}
                            className="rounded border border-violet-200 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-800 hover:bg-violet-100 disabled:opacity-50"
                          >
                            {parseBusy ? (en ? 'Parsing…' : '解析中…') : en ? 'AI Parse' : 'AI 解析'}
                          </button>
                        ) : null}
                        {showReview ? (
                          <button
                            type="button"
                            onClick={() => openReview(doc)}
                            className="rounded border border-sky-200 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800 hover:bg-sky-100"
                          >
                            {en ? 'Review' : '审核'}
                          </button>
                        ) : null}
                        {showApprove && reviewDocId !== doc.id ? (
                          <button
                            type="button"
                            disabled={approveBusy}
                            onClick={() => void handleApprove(doc)}
                            className="rounded border border-green-200 bg-green-50 px-2 py-1 text-xs font-medium text-green-800 hover:bg-green-100 disabled:opacity-50"
                          >
                            {approveBusy
                              ? en
                                ? 'Approving…'
                                : '批准中…'
                              : en
                                ? 'Approve budget'
                                : '批准预算'}
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {reviewDocId ? (
        <div className="mt-6 rounded-xl border border-sky-200 bg-sky-50/50 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <h4 className="text-sm font-semibold text-gray-900">
              {en ? 'Council review — budget draft' : '业委会审核 — 预算草稿'}
            </h4>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <span>{en ? 'Fiscal year' : '财年'}</span>
              <input
                type="number"
                className="w-24 rounded border border-gray-300 bg-white px-2 py-1 text-sm"
                value={draftYear}
                onChange={(e) => setDraftYear(Number(e.target.value))}
                disabled={!canApprove}
              />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <div className="text-xs font-medium text-emerald-800">
                {en ? 'Revenue Total' : '收入合计'}
              </div>
              <div className="mt-0.5 text-base font-bold tabular-nums text-emerald-950">
                {formatCurrency(revenueTotal, en ? 'en' : 'zh')}
              </div>
            </div>
            <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2">
              <div className="text-xs font-medium text-orange-800">
                {en ? 'Expense Total' : '支出合计'}
              </div>
              <div className="mt-0.5 text-base font-bold tabular-nums text-orange-950">
                {formatCurrency(expenseTotal, en ? 'en' : 'zh')}
              </div>
            </div>
            <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2">
              <div className="text-xs font-medium text-sky-800">
                {en ? 'Net Budget' : '净预算'}
              </div>
              <div className="mt-0.5 text-base font-bold tabular-nums text-sky-950">
                {formatCurrency(netBudget, en ? 'en' : 'zh')}
              </div>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-xs text-gray-500">
                  <th className="px-3 py-2 text-left font-medium">{en ? 'Category' : '类别'}</th>
                  <th className="px-3 py-2 text-left font-medium">
                    {en ? 'Budget type' : '预算类型'}
                  </th>
                  <th className="px-3 py-2 text-right font-medium">
                    {en ? 'Amount' : '金额'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {draftLines.map((line, index) => (
                  <tr key={`${index}-${line.category}`} className="border-b border-gray-100">
                    <td className="px-3 py-2">
                      {canApprove ? (
                        <input
                          type="text"
                          className="w-full rounded border border-gray-200 px-2 py-1"
                          value={line.category}
                          onChange={(e) => updateDraftLine(index, 'category', e.target.value)}
                        />
                      ) : (
                        line.category
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {canApprove ? (
                        <select
                          className="rounded border border-gray-200 bg-white px-2 py-1 text-sm"
                          value={line.budget_type}
                          onChange={(e) => updateDraftLine(index, 'budget_type', e.target.value)}
                        >
                          <option value="revenue">{agmBudgetTypeLabel('revenue', en)}</option>
                          <option value="expense">{agmBudgetTypeLabel('expense', en)}</option>
                        </select>
                      ) : (
                        agmBudgetTypeLabel(line.budget_type, en)
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {canApprove ? (
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="w-32 rounded border border-gray-200 px-2 py-1 text-right"
                          value={line.amount}
                          onChange={(e) => updateDraftLine(index, 'amount', e.target.value)}
                        />
                      ) : (
                        formatCurrency(line.amount, en ? 'en' : 'zh')
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {canApprove ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void saveDraftEdits(reviewDocId)}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                {en ? 'Save edits' : '保存修改'}
              </button>
              <button
                type="button"
                disabled={Boolean(approvingId)}
                onClick={() => {
                  const doc = documents.find((d) => d.id === reviewDocId);
                  if (doc) void handleApprove(doc);
                }}
                className="rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-50"
              >
                {approvingId
                  ? en
                    ? 'Approving…'
                    : '批准中…'
                  : en
                    ? 'Approve budget'
                    : '批准预算'}
              </button>
              <button
                type="button"
                onClick={() => setReviewDocId(null)}
                className="rounded-lg px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {en ? 'Close' : '关闭'}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
