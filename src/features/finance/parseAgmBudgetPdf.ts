import { supabase } from '../../lib/supabase';
import { applyAgmBudgetTypes } from './agmBudgetType';
import type { AgmBudgetDraftLine } from './agmBudgetDocuments';

export type AgmBudgetParseResult = {
  fiscal_year: number | null;
  lines: AgmBudgetDraftLine[];
};

async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(blob);
  });
}

async function invokeAgmBudgetParse(
  fileBase64: string,
  fileName: string,
): Promise<{ result: AgmBudgetParseResult | null; error: string | null }> {
  const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/agm-budget-parse`;
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fileBase64,
      mimeType: 'application/pdf',
      filename: fileName || 'agm-budget.pdf',
    }),
  });

  const json = await response.json();

  if (!response.ok || json?.success === false) {
    return {
      result: null,
      error: String(json?.error ?? `Parse failed (${response.status})`),
    };
  }

  const lines = Array.isArray(json.lines) ? json.lines : [];
  if (lines.length === 0) {
    return { result: null, error: 'No budget lines extracted' };
  }

  return {
    result: {
      fiscal_year: json.fiscal_year != null ? Number(json.fiscal_year) : null,
      lines: lines.map((l: { category?: string; amount?: number }) => ({
        category: String(l.category ?? '').trim(),
        amount: Number(l.amount ?? 0),
      })),
    },
    error: null,
  };
}

/** Download PDF, AI-parse, save draft on agm_budget_documents. */
export async function parseAgmBudgetPdfDocument(opts: {
  documentId: string;
  storagePath: string;
  fileName: string;
  languageEn?: boolean;
}): Promise<{ result: AgmBudgetParseResult | null; error: string | null }> {
  const { documentId, storagePath, fileName, languageEn = true } = opts;
  const en = languageEn;

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from('documents')
    .download(storagePath);

  if (downloadError || !fileBlob) {
    const msg = en ? 'Unable to read AGM budget PDF.' : '无法读取 AGM 预算 PDF。';
    await supabase
      .from('agm_budget_documents')
      .update({ notes: downloadError?.message ?? msg })
      .eq('id', documentId);
    return { result: null, error: msg };
  }

  let fileBase64: string;
  try {
    fileBase64 = await blobToBase64(fileBlob);
  } catch {
    const msg = en ? 'Unable to read AGM budget PDF.' : '无法读取 AGM 预算 PDF。';
    await supabase.from('agm_budget_documents').update({ notes: msg }).eq('id', documentId);
    return { result: null, error: msg };
  }

  const { result, error: aiError } = await invokeAgmBudgetParse(fileBase64, fileName);
  if (!result || aiError) {
    const msg = en ? 'AGM budget parsing failed.' : 'AGM 预算解析失败。';
    await supabase
      .from('agm_budget_documents')
      .update({ notes: aiError ?? msg })
      .eq('id', documentId);
    return { result: null, error: aiError ?? msg };
  }

  const validLines = applyAgmBudgetTypes(
    result.lines.filter(
      (l) => l.category.trim().length > 0 && Number.isFinite(l.amount) && l.amount >= 0,
    ),
  );
  if (validLines.length === 0) {
    const msg = en ? 'AGM budget parsing failed.' : 'AGM 预算解析失败。';
    await supabase
      .from('agm_budget_documents')
      .update({ notes: 'No valid budget lines after validation' })
      .eq('id', documentId);
    return { result: null, error: msg };
  }

  const { error: updateError } = await supabase
    .from('agm_budget_documents')
    .update({
      status: 'parsed',
      fiscal_year: result.fiscal_year,
      parsed_draft: { fiscal_year: result.fiscal_year, lines: validLines },
      notes: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', documentId);

  if (updateError) {
    return { result: null, error: updateError.message };
  }

  return { result: { fiscal_year: result.fiscal_year, lines: validLines }, error: null };
}
