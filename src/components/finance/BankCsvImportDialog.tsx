import { useState, useCallback } from 'react';
import { X, Upload, Loader2, CheckCircle } from 'lucide-react';
import { parseBankCsv, type NormalizedBankRow } from '../../features/finance/bankCsvParser';
import { importBankCsvRows, type BankCsvImportResult } from '../../features/finance/importBankCsv';

type Step = 'select' | 'preview' | 'importing' | 'done';

type Props = {
  open: boolean;
  propertyId: string;
  uploadedBy: string;
  languageEn: boolean;
  onClose: () => void;
  onImported: () => void;
};

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
  const [rows, setRows] = useState<NormalizedBankRow[]>([]);
  const [sourceBank, setSourceBank] = useState('');
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<BankCsvImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep('select');
    setFileName('');
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
    setFileName(file.name);
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
    setStep('preview');
  };

  const handleConfirmImport = async () => {
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
      setStep('preview');
      return;
    }

    setImportResult(result);
    setStep('done');
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
              {l ? 'Import bank CSV' : '导入银行流水 CSV'}
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {l ? 'RBC generic CSV (Date, Description, Amount, Balance)' : '当前支持 RBC 通用 CSV（Date, Description, Amount, Balance）'}
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
                  {l ? 'Choose CSV file' : '选择 CSV 文件'}
                </span>
                <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFile} />
              </label>
            </div>
          )}

          {step === 'preview' && (
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
                  onClick={handleConfirmImport}
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
              <p className="text-xs">{l ? 'Importing…' : '正在导入…'}</p>
            </div>
          )}

          {step === 'done' && importResult && (
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
        </div>
      </div>
    </div>
  );
}
