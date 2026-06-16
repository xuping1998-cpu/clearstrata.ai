import { useState, useCallback } from 'react';
import { X, Upload, Loader2, CheckCircle, FileText } from 'lucide-react';
import { parseBankCsv, type NormalizedBankRow } from '../../features/finance/bankCsvParser';
import { importBankCsvRows, type BankCsvImportResult } from '../../features/finance/importBankCsv';
import { uploadBankStatementPdf } from '../../features/finance/uploadBankStatementPdf';

type Step = 'select' | 'preview_csv' | 'preview_pdf' | 'importing' | 'done_csv' | 'done_pdf';

type Props = {
  open: boolean;
  propertyId: string;
  uploadedBy: string;
  languageEn: boolean;
  onClose: () => void;
  onImported: () => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isPdfFile(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith('.pdf') || file.type === 'application/pdf';
}

function isCsvFile(file: File): boolean {
  const n = file.name.toLowerCase();
  return n.endsWith('.csv') || file.type === 'text/csv' || file.type === 'application/vnd.ms-excel';
}

/** Import bank CSV or archive PDF statement (pending AI parse). */
export function BankCsvImportDialog({
  open,
  propertyId,
  uploadedBy,
  languageEn: l,
  onClose,
  onImported,
}: Props) {
  const [step, setStep] = useState<Step>('select');
  const [fileName, setFileName] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rows, setRows] = useState<NormalizedBankRow[]>([]);
  const [sourceBank, setSourceBank] = useState('');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<BankCsvImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep('select');
    setFileName('');
    setSelectedFile(null);
    setRows([]);
    setSourceBank('');
    setParseErrors([]);
    setParseError(null);
    setImportResult(null);
    setImportError(null);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setParseError(null);
    setImportError(null);
    setFileName(file.name);
    setSelectedFile(file);

    if (isPdfFile(file)) {
      setStep('preview_pdf');
      return;
    }

    if (!isCsvFile(file)) {
      setParseError(l ? 'Please choose a CSV or PDF file.' : '请选择 CSV 或 PDF 文件。');
      setStep('select');
      return;
    }

    const text = await file.text();
    const parsed = parseBankCsv(text);

    if (!parsed.ok) {
      setParseError(parsed.error);
      setStep('select');
      return;
    }

    setRows(parsed.rows);
    setSourceBank(parsed.source_bank);
    setParseErrors(parsed.parseErrors);
    setStep('preview_csv');
  };

  const handleConfirmCsvImport = async () => {
    setStep('importing');
    setImportError(null);
    const { result, error } = await importBankCsvRows({
      propertyId,
      uploadedBy,
      fileName,
      sourceBank,
      rows,
      parseErrorCount: parseErrors.length,
    });

    if (error || !result) {
      setImportError(error ?? (l ? 'Import failed' : '导入失败'));
      setStep('preview_csv');
      return;
    }

    setImportResult(result);
    setStep('done_csv');
    onImported();
  };

  const handleConfirmPdfUpload = async () => {
    if (!selectedFile) return;
    setStep('importing');
    setImportError(null);
    const { error } = await uploadBankStatementPdf({
      propertyId,
      uploadedBy,
      file: selectedFile,
    });

    if (error) {
      setImportError(error);
      setStep('preview_pdf');
      return;
    }

    setStep('done_pdf');
    onImported();
  };

  if (!open) return null;

  const previewRows = rows.slice(0, 20);

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label={l ? 'Close' : '关闭'}
        onClick={handleClose}
      />
      <div className="relative z-[81] flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl ring-1 ring-gray-200">
        <div className="flex items-start justify-between gap-2 border-b border-gray-100 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              {l ? 'Import Bank Statement' : '导入银行流水'}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {l
                ? 'CSV: import transactions (RBC format). PDF: archive monthly statement for future AI parsing.'
                : 'CSV：导入交易（RBC 格式）。PDF：归档银行月结单，待后续 AI 解析。'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 text-sm">
          {step === 'select' && (
            <div className="space-y-4">
              {parseError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                  {parseError}
                </p>
              )}
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-300 px-6 py-10 hover:border-[#1D9E75] hover:bg-green-50/30">
                <Upload className="size-8 text-gray-400" />
                <span className="font-medium text-gray-700">
                  {l ? 'Choose CSV or PDF file' : '选择 CSV 或 PDF 文件'}
                </span>
                <span className="text-xs text-gray-500">
                  {l ? 'Accepted: .csv, .pdf' : '支持：.csv、.pdf'}
                </span>
                <input
                  type="file"
                  accept=".csv,.pdf,application/pdf,text/csv"
                  className="hidden"
                  onChange={handleFile}
                />
              </label>
            </div>
          )}

          {step === 'preview_pdf' && selectedFile && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg border border-amber-100 bg-amber-50/60 p-4">
                <FileText className="mt-0.5 size-8 shrink-0 text-amber-700" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-900" title={selectedFile.name}>
                    {selectedFile.name}
                  </p>
                  <p className="mt-1 text-xs text-gray-600">
                    {l ? 'Size: ' : '大小：'}
                    {formatFileSize(selectedFile.size)}
                  </p>
                  <p className="mt-2 text-xs text-amber-900/90">
                    {l
                      ? 'PDF statements are archived only. Transactions will appear after AI parsing in a future release.'
                      : 'PDF 月结单仅归档保存，交易明细将在后续 AI 解析后显示。'}
                  </p>
                </div>
              </div>
              {importError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                  {importError}
                </p>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {l ? 'Back' : '返回'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPdfUpload}
                  className="rounded-lg bg-[#1D9E75] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#178a66]"
                >
                  {l ? 'Confirm upload' : '确认上传'}
                </button>
              </div>
            </div>
          )}

          {step === 'preview_csv' && (
            <div className="space-y-3">
              <p className="text-xs text-gray-600">
                {l
                  ? `${rows.length} row(s) parsed from ${fileName}. Showing first ${previewRows.length}.`
                  : `已从 ${fileName} 解析 ${rows.length} 条，预览前 ${previewRows.length} 条。`}
              </p>
              {importError && (
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-900">
                  {importError}
                </p>
              )}
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">{l ? 'Date' : '日期'}</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">{l ? 'Description' : '描述'}</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">{l ? 'Amount' : '金额'}</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">{l ? 'Balance' : '余额'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {previewRows.map((r, i) => (
                      <tr key={i}>
                        <td className="whitespace-nowrap px-3 py-2">{r.transaction_date}</td>
                        <td className="max-w-[200px] truncate px-3 py-2" title={r.description}>
                          {r.description}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{r.amount.toFixed(2)}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">
                          {r.balance != null ? r.balance.toFixed(2) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('select')}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                >
                  {l ? 'Back' : '返回'}
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCsvImport}
                  className="rounded-lg bg-[#1D9E75] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#178a66]"
                >
                  {l ? 'Confirm import' : '确认导入'}
                </button>
              </div>
            </div>
          )}

          {step === 'importing' && (
            <div className="flex flex-col items-center gap-2 py-12 text-gray-700">
              <Loader2 className="size-8 animate-spin text-[#1D9E75]" />
              <p className="text-xs">{l ? 'Uploading…' : '正在上传…'}</p>
            </div>
          )}

          {step === 'done_csv' && importResult && (
            <div className="space-y-4 py-4 text-center">
              <CheckCircle className="mx-auto size-10 text-[#1D9E75]" />
              <p className="font-medium text-gray-900">{l ? 'Import complete' : '导入完成'}</p>
              <dl className="mx-auto max-w-xs space-y-2 text-left text-xs text-gray-700">
                <div className="flex justify-between">
                  <dt>{l ? 'Imported' : '导入成功'}</dt>
                  <dd className="font-semibold tabular-nums">{importResult.imported}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{l ? 'Duplicates skipped' : '重复跳过'}</dt>
                  <dd className="font-semibold tabular-nums">{importResult.skipped}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>{l ? 'Failed' : '失败'}</dt>
                  <dd className="font-semibold tabular-nums">{importResult.failed}</dd>
                </div>
              </dl>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white hover:bg-[#178a66]"
              >
                {l ? 'Done' : '完成'}
              </button>
            </div>
          )}

          {step === 'done_pdf' && (
            <div className="space-y-4 py-4 text-center">
              <CheckCircle className="mx-auto size-10 text-[#1D9E75]" />
              <p className="font-medium text-gray-900">
                {l
                  ? 'Bank statement uploaded and pending AI parsing.'
                  : '银行月结单已上传，等待 AI 解析。'}
              </p>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white hover:bg-[#178a66]"
              >
                {l ? 'Done' : '完成'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Alias for clearer imports in new code. */
export const BankStatementImportDialog = BankCsvImportDialog;
