/** bank_import_batches status / file_type helpers */

export type BankImportBatchStatus = 'imported' | 'pending_parse' | 'parse_failed';
export type BankImportFileType = 'csv' | 'pdf';

export type BankImportBatchRow = {
  id: string;
  file_name: string;
  file_type: string | null;
  status: string | null;
  source_bank: string | null;
  total_rows: number;
  imported_rows: number;
  failed_rows: number;
  created_at: string;
};

export function batchStatusLabel(status: string | null | undefined, en: boolean): string {
  switch (status) {
    case 'pending_parse':
      return en ? 'Pending AI Parsing' : '待 AI 解析';
    case 'parse_failed':
      return en ? 'Parse failed' : '解析失败';
    case 'imported':
    default:
      return en ? 'Imported' : '已导入';
  }
}

export function batchFileTypeLabel(fileType: string | null | undefined, en: boolean): string {
  if (fileType === 'pdf') return 'PDF';
  if (fileType === 'csv') return 'CSV';
  return en ? 'Unknown' : '未知';
}

export function sanitizeBankStatementFileName(name: string): string {
  const base = name.replace(/[^\w.\-()+\s]/g, '_').replace(/\s+/g, '_');
  return base.slice(0, 120) || 'statement.pdf';
}

export function buildBankStatementStoragePath(propertyId: string, fileName: string): string {
  const safe = sanitizeBankStatementFileName(fileName);
  return `bank-statements/${propertyId}/${Date.now()}-${safe}`;
}
