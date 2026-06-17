/** bank_import_batches status / file_type helpers */

import { supabase } from '../../lib/supabase';

export type BankImportBatchStatus = 'imported' | 'pending_parse' | 'parse_failed';
export type BankImportFileType = 'csv' | 'pdf';

export type BankImportBatchRow = {
  id: string;
  file_name: string;
  file_type: string | null;
  file_path: string | null;
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

const BANK_STATEMENT_SIGNED_URL_TTL_SEC = 60 * 10;

/** Open archived PDF bank statement in a new tab via signed URL. */
export async function openBankStatementPdf(
  filePath: string,
  en: boolean,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data, error } = await supabase.storage
    .from('documents')
    .createSignedUrl(filePath, BANK_STATEMENT_SIGNED_URL_TTL_SEC);

  if (error || !data?.signedUrl) {
    const detail = error?.message ?? (en ? 'Signed URL unavailable' : '无法生成访问链接');
    return {
      ok: false,
      message: en ? `Unable to open file: ${detail}` : `无法打开文件：${detail}`,
    };
  }

  const opened = window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
  if (!opened) {
    return {
      ok: false,
      message: en
        ? 'Unable to open file: popup blocked by browser'
        : '无法打开文件：浏览器拦截了弹出窗口',
    };
  }

  return { ok: true };
}
