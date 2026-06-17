import { useState, useEffect, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useProperty } from '../../contexts/PropertyContext';
import { supabase } from '../../lib/supabase';
import { BankCsvImportDialog } from '../../components/finance/BankCsvImportDialog';
import {
  batchFileTypeLabel,
  batchStatusLabel,
  openBankStatementPdf,
  sanitizeBankStatementFileName,
  type BankImportBatchRow,
} from '../../features/finance/bankImportBatches';
import { parseBankStatementPdfBatch } from '../../features/finance/parseBankStatementPdf';
import {
  confirmBankInvoiceMatch,
  fetchBankTransactionsWithMatches,
  generateBankInvoiceSuggestions,
  rejectBankInvoiceMatch,
  type BankTransactionWithMatch,
} from '../../features/finance/bankInvoiceMatch';
import { BankTransactionMatchCell } from '../../features/finance/bankInvoiceMatchUi';

interface BankTransactionRow extends BankTransactionWithMatch {}

type Props = {
  canImport: boolean;
  canManageMatch: boolean;
};

function isPdfBatch(b: BankImportBatchRow): boolean {
  const ft = (b.file_type ?? '').trim().toLowerCase();
  if (ft === 'pdf') return true;
  return (b.file_name ?? '').trim().toLowerCase().endsWith('.pdf');
}

function isCsvBatch(b: BankImportBatchRow): boolean {
  const ft = (b.file_type ?? '').trim().toLowerCase();
  if (ft === 'csv') return true;
  return (b.file_name ?? '').trim().toLowerCase().endsWith('.csv');
}

function getBatchFilePath(b: BankImportBatchRow): string | null {
  const raw = b.file_path?.trim();
  if (!raw) return null;
  return raw.replace(/^documents\//, '');
}

function statusBadgeClass(status: string | null | undefined): string {
  switch (status) {
    case 'pending_parse':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'parse_failed':
      return 'bg-red-50 text-red-800 border-red-200';
    default:
      return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  }
}

export function BankTransactionsTab({ canImport, canManageMatch }: Props) {
  const { language } = useLanguage();
  const { profile } = useAuth();
  const { currentPropertyId } = useProperty();
  const l = language === 'en';

  const [rows, setRows] = useState<BankTransactionRow[]>([]);
  const [batches, setBatches] = useState<BankImportBatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [importOpen, setImportOpen] = useState(false);
  const [openingPdfPath, setOpeningPdfPath] = useState<string | null>(null);
  const [parsingBatchId, setParsingBatchId] = useState<string | null>(null);
  const [matchBusyId, setMatchBusyId] = useState<string | null>(null);
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });

  const loadBatches = useCallback(async () => {
    if (!currentPropertyId) {
      setBatches([]);
      return;
    }
    const { data } = await supabase
      .from('bank_import_batches')
      .select(
        'id, file_name, file_type, file_path, status, source_bank, total_rows, imported_rows, failed_rows, created_at',
      )
      .eq('property_id', currentPropertyId)
      .order('created_at', { ascending: false })
      .limit(10);

    let rows = (data as BankImportBatchRow[]) ?? [];

    const missingPath = rows.filter((b) => isPdfBatch(b) && !getBatchFilePath(b));
    if (missingPath.length > 0) {
      const { data: files } = await supabase.storage
        .from('documents')
        .list(`bank-statements/${currentPropertyId}`, {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (files?.length) {
        rows = rows.map((b) => {
          if (getBatchFilePath(b) || !isPdfBatch(b)) return b;
          const safe = sanitizeBankStatementFileName(b.file_name);
          const baseName = b.file_name.trim().toLowerCase();
          const match = files.find(
            (f) =>
              f.name === safe ||
              f.name.endsWith(`-${safe}`) ||
              f.name.toLowerCase().includes(baseName.replace(/\.pdf$/i, '')),
          );
          if (!match) return b;
          return {
            ...b,
            file_path: `bank-statements/${currentPropertyId}/${match.name}`,
          };
        });
      }
    }

    setBatches(rows);
  }, [currentPropertyId]);

  const loadTransactions = useCallback(async () => {
    if (!currentPropertyId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const data = await fetchBankTransactionsWithMatches(
      currentPropertyId,
      dateRange.start,
      dateRange.end,
    );
    setRows(data);
    setLoading(false);
  }, [currentPropertyId, dateRange.start, dateRange.end]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadTransactions(), loadBatches()]);
  }, [loadTransactions, loadBatches]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const showImportHistory = batches.length > 0;

  const handleViewPdf = async (filePath: string) => {
    setOpeningPdfPath(filePath);
    try {
      const res = await openBankStatementPdf(filePath, l);
      if (!res.ok) {
        alert(res.message);
      }
    } finally {
      setOpeningPdfPath(null);
    }
  };

  const handleAiParse = async (batch: BankImportBatchRow) => {
    const filePath = getBatchFilePath(batch);
    if (!canImport || !profile?.id || !currentPropertyId || !filePath) return;
    if (parsingBatchId) return;

    setParsingBatchId(batch.id);
    try {
      const { result, error } = await parseBankStatementPdfBatch({
        batchId: batch.id,
        propertyId: currentPropertyId,
        uploadedBy: profile.id,
        filePath,
        fileName: batch.file_name,
        languageEn: l,
      });

      if (error || !result) {
        alert(error ?? (l ? 'Bank statement parsing failed.' : '银行月结单解析失败。'));
        return;
      }

      await refreshAll();
      alert(
        l
          ? `Parsed ${result.imported} transaction(s)${result.skipped > 0 ? ` (${result.skipped} duplicate(s) skipped)` : ''}.`
          : `已解析 ${result.imported} 条流水${result.skipped > 0 ? `（跳过 ${result.skipped} 条重复）` : ''}。`,
      );
    } finally {
      setParsingBatchId(null);
    }
  };

  const handleGenerateSuggestions = async () => {
    if (!canManageMatch || !currentPropertyId || generatingSuggestions) return;
    setGeneratingSuggestions(true);
    try {
      const { count, error } = await generateBankInvoiceSuggestions(currentPropertyId);
      if (error) {
        alert(error);
        return;
      }
      await refreshAll();
      alert(
        l
          ? `Generated ${count} suggested match${count === 1 ? '' : 'es'}.`
          : `已生成 ${count} 条建议匹配。`,
      );
    } finally {
      setGeneratingSuggestions(false);
    }
  };

  const handleConfirmMatch = async (row: BankTransactionRow) => {
    if (!canManageMatch || !row.matched_invoice_id || matchBusyId) return;
    setMatchBusyId(row.id);
    try {
      const { error } = await confirmBankInvoiceMatch(row.id, row.matched_invoice_id);
      if (error) {
        alert(error);
        return;
      }
      await refreshAll();
    } finally {
      setMatchBusyId(null);
    }
  };

  const handleRejectMatch = async (row: BankTransactionRow) => {
    if (!canManageMatch || matchBusyId) return;
    setMatchBusyId(row.id);
    try {
      const { error } = await rejectBankInvoiceMatch(row.id);
      if (error) {
        alert(error);
        return;
      }
      await refreshAll();
    } finally {
      setMatchBusyId(null);
    }
  };

  const renderBatchActions = (b: BankImportBatchRow) => {
    const pdf = isPdfBatch(b);
    const csv = isCsvBatch(b);
    const filePath = getBatchFilePath(b);
    const showViewPdf = pdf && Boolean(filePath);
    const showAiParse = pdf && b.status === 'pending_parse' && canImport;
    const pdfBusy = showViewPdf && openingPdfPath === filePath;
    const parseBusy = parsingBatchId === b.id;

    if (csv || (!pdf && !showViewPdf && !showAiParse)) {
      return <span className="text-gray-300">—</span>;
    }

    return (
      <div className="flex flex-wrap items-center gap-2">
        {showViewPdf && filePath && (
          <button
            type="button"
            disabled={pdfBusy}
            onClick={() => void handleViewPdf(filePath)}
            className="rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-800 hover:bg-sky-100 disabled:opacity-50 sm:py-0.5"
          >
            {pdfBusy ? (l ? 'Opening…' : '打开中…') : l ? 'View PDF' : '查看文件'}
          </button>
        )}
        {showAiParse && (
          <button
            type="button"
            disabled={parseBusy}
            onClick={() => void handleAiParse(b)}
            className="rounded border border-violet-200 bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-800 hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50 sm:py-0.5"
          >
            {parseBusy ? (l ? 'Parsing…' : '解析中…') : l ? 'AI Parse' : 'AI解析'}
          </button>
        )}
        {pdf && !showViewPdf && !showAiParse && <span className="text-gray-300">—</span>}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-gray-600">{l ? 'Date range:' : '日期范围：'}</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm"
            />
            <span className="text-gray-500">–</span>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canManageMatch && (
              <button
                type="button"
                disabled={generatingSuggestions}
                onClick={() => void handleGenerateSuggestions()}
                className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50"
              >
                {generatingSuggestions
                  ? l
                    ? 'Generating…'
                    : '生成中…'
                  : l
                    ? 'Generate Suggestions'
                    : '生成建议匹配'}
              </button>
            )}
            {canImport && (
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white hover:bg-[#178a66]"
              >
                <Upload size={18} />
                {l ? 'Import Bank Statement' : '导入银行流水'}
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {l ? 'Date' : '日期'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {l ? 'Description' : '描述'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  {l ? 'Charges' : '费用'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  {l ? 'Payments' : '付款'}
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  {l ? 'Balance' : '余额'}
                </th>
                <th className="min-w-[160px] px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  {l ? 'Match Status' : '匹配状态'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                    {l ? 'Loading…' : '加载中…'}
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {l ? 'No bank transactions found' : '暂无银行流水记录'}
                    {showImportHistory && (
                      <span className="mt-1 block text-xs text-gray-400">
                        {l
                          ? 'See import history below for uploaded PDF statements pending AI parsing.'
                          : '可在下方「导入记录」查看已上传、待 AI 解析的 PDF 月结单。'}
                      </span>
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((t) => {
                  const amt = Number(t.amount);
                  const charge = amt < 0 ? Math.abs(amt) : 0;
                  const payment = amt > 0 ? amt : 0;
                  const bal = t.balance != null ? Number(t.balance) : null;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                        {new Date(t.transaction_date + 'T12:00:00').toLocaleDateString(l ? 'en-CA' : 'zh-CN')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{t.description}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 tabular-nums">
                        {charge > 0 ? charge.toFixed(2) : ''}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-right text-sm text-gray-900 tabular-nums">
                        {payment > 0 ? payment.toFixed(2) : ''}
                      </td>
                      <td
                        className={`whitespace-nowrap px-6 py-4 text-right text-sm font-medium tabular-nums ${
                          bal != null && bal < 0 ? 'text-red-600' : 'text-gray-900'
                        }`}
                      >
                        {bal != null ? bal.toFixed(2) : '—'}
                      </td>
                      <td className="px-6 py-4 align-top">
                        <BankTransactionMatchCell
                          row={t}
                          en={l}
                          canManage={canManageMatch}
                          busyId={matchBusyId}
                          onConfirm={handleConfirmMatch}
                          onReject={handleRejectMatch}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showImportHistory && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-gray-900">
            {l ? 'Import history' : '导入记录'}
          </h3>

          {/* Mobile: card layout with actions always visible */}
          <div className="space-y-3 md:hidden">
            {batches.map((b) => (
              <div key={b.id} className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
                <div className="mb-2 truncate text-sm font-medium text-gray-900" title={b.file_name}>
                  {b.file_name}
                </div>
                <dl className="mb-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-gray-600">
                  <dt>{l ? 'Type' : '类型'}</dt>
                  <dd>{batchFileTypeLabel(b.file_type, l)}</dd>
                  <dt>{l ? 'Status' : '状态'}</dt>
                  <dd>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(b.status)}`}
                    >
                      {batchStatusLabel(b.status, l)}
                    </span>
                  </dd>
                  <dt>{l ? 'Uploaded' : '上传时间'}</dt>
                  <dd className="text-gray-500">
                    {new Date(b.created_at).toLocaleString(l ? 'en-CA' : 'zh-CN')}
                  </dd>
                  <dt>{l ? 'Actions' : '操作'}</dt>
                  <dd>{renderBatchActions(b)}</dd>
                </dl>
              </div>
            ))}
          </div>

          {/* Desktop: table with horizontal scroll + sticky actions column */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[640px] text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="px-2 py-2 font-medium">{l ? 'File' : '文件名'}</th>
                  <th className="px-2 py-2 font-medium">{l ? 'Type' : '类型'}</th>
                  <th className="px-2 py-2 font-medium">{l ? 'Status' : '状态'}</th>
                  <th className="px-2 py-2 font-medium">{l ? 'Uploaded' : '上传时间'}</th>
                  <th className="sticky right-0 min-w-[9rem] bg-white px-2 py-2 font-medium">
                    {l ? 'Actions' : '操作'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {batches.map((b) => (
                  <tr key={b.id}>
                    <td className="max-w-[200px] truncate px-2 py-2 text-gray-900" title={b.file_name}>
                      {b.file_name}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-gray-600">
                      {batchFileTypeLabel(b.file_type, l)}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusBadgeClass(b.status)}`}
                      >
                        {batchStatusLabel(b.status, l)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-gray-500">
                      {new Date(b.created_at).toLocaleString(l ? 'en-CA' : 'zh-CN')}
                    </td>
                    <td className="sticky right-0 min-w-[9rem] bg-white px-2 py-2">
                      {renderBatchActions(b)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {canImport && profile && currentPropertyId && (
        <BankCsvImportDialog
          open={importOpen}
          propertyId={currentPropertyId}
          uploadedBy={profile.id}
          languageEn={l}
          onClose={() => setImportOpen(false)}
          onImported={() => void refreshAll()}
        />
      )}
    </div>
  );
}
