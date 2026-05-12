import { useCallback, useEffect, useState } from 'react';
import { Bot, Loader2, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { scheduleInvoiceAiAuditAfterInsert } from '@/lib/invoiceAudit';
import { invokeInvoiceOcrFromFile, fetchUrlAsInvoiceFile } from '@/lib/invoiceOcrClient';
import { useAuth } from '@/contexts/AuthContext';
import { useProperty } from '@/contexts/PropertyContext';
import { useLanguage } from '@/contexts/LanguageContext';

type InvoiceAssistRow = {
  id: string;
  file_name: string | null;
  document_url: string;
  vendor_name: string;
  invoice_date: string;
  total_amount: number;
  status: string;
};

/** AI Review tab: optional OCR extraction + audit trigger for invoices already uploaded under Expense Review. */
export default function InvoiceInterpreter() {
  const { profile } = useAuth();
  const { currentPropertyId } = useProperty();
  const { language } = useLanguage();
  const l = language === 'en';

  const [rows, setRows] = useState<InvoiceAssistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadRows = useCallback(async () => {
    if (!currentPropertyId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('invoices')
      .select('id, file_name, document_url, vendor_name, invoice_date, total_amount, status')
      .eq('property_id', currentPropertyId)
      .in('status', ['pending_review', 'ai_extraction_failed'])
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[InvoiceInterpreter]', error.message);
      setRows([]);
    } else {
      setRows((data as InvoiceAssistRow[]) ?? []);
    }
    setLoading(false);
  }, [currentPropertyId]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  const runAssist = async (inv: InvoiceAssistRow) => {
    if (!profile || !currentPropertyId || busyId) return;
    setBusyId(inv.id);
    setMessage(null);
    try {
      const file = await fetchUrlAsInvoiceFile(inv.document_url, inv.file_name || 'invoice');
      const { extracted, structured, fiscalYear } = await invokeInvoiceOcrFromFile(file, l);

      const { error: upErr } = await supabase
        .from('invoices')
        .update({
          vendor_name: extracted.vendor_name,
          invoice_number: extracted.invoice_number,
          invoice_date: extracted.invoice_date,
          due_date: extracted.due_date,
          subtotal: extracted.subtotal ?? 0,
          tax_amount: extracted.tax_amount ?? 0,
          total_amount: extracted.total_amount ?? 0,
          hst_number: extracted.hst_number,
          currency: extracted.currency || 'CAD',
          category: extracted.category || 'general',
          notes: extracted.description,
          has_anomalies: Boolean(extracted.has_anomalies),
          ai_extracted_data: extracted as unknown as Record<string, unknown>,
          ai_confidence_score: 0.85,
          status: 'pending_review',
          fiscal_year: fiscalYear,
        })
        .eq('property_id', currentPropertyId)
        .eq('id', inv.id);

      if (upErr) throw upErr;

      if (extracted.has_anomalies) {
        const anomalyNotes =
          (typeof extracted.anomaly_notes === 'string' && extracted.anomaly_notes.trim()) ||
          (typeof extracted.description === 'string' && extracted.description.trim()) ||
          (l ? 'AI detected anomalies' : 'AI检测到异常');
        try {
          await supabase.from('financial_anomalies').insert({
            property_id: currentPropertyId,
            invoice_id: inv.id,
            notes: anomalyNotes,
          });
        } catch (e) {
          console.error('financial_anomalies', e);
        }
      }

      try {
        const structuredPayload = structured;
        await supabase.from('invoice_ocr_raw').insert({
          invoice_id: inv.id,
          property_id: currentPropertyId,
          structured_json: structuredPayload as Record<string, unknown>,
          raw_text: typeof extracted.raw_text === 'string' ? extracted.raw_text : null,
          ocr_model: 'claude-sonnet-4-20250514',
        });
      } catch (e) {
        console.error('invoice_ocr_raw', e);
      }

      scheduleInvoiceAiAuditAfterInsert(inv.id, currentPropertyId);

      setMessage(
        l ? 'AI extraction saved as suggestions. Please confirm fields under Invoice Management.' : 'AI 识别结果已写入发票；请在「发票管理」中人工核对后再提交审核。',
      );
      await loadRows();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert((l ? 'AI assist failed: ' : 'AI 辅助失败：') + msg);
    } finally {
      setBusyId(null);
    }
  };

  if (!currentPropertyId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
        {l ? 'Select a property first.' : '请先选择物业。'}
      </div>
    );
  }

  return (
    <div className="mx-0 min-w-0 max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clearstrata-ui-soft ring-1 ring-clearstrata-ui-softBorder">
          <Bot className="h-5 w-5 text-clearstrata-brand-800" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-gray-900">{l ? 'AI Review (assistant)' : 'AI审核（辅助）'}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {l
              ? 'AI can help extract invoice fields, surface anomalies, and suggest categorization. Upload and final approval always rely on human confirmation.'
              : 'AI 可辅助识别发票信息、发现异常和生成分类建议，但上传与审核仍以人工确认为准。'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-3 text-xs text-gray-700">
        <p className="flex flex-wrap items-center gap-2 font-medium text-gray-800">
          <Sparkles className="size-3.5 shrink-0 text-clearstrata-brand-700" aria-hidden />
          {l ? 'Flow: Upload invoice → optional AI Review → manual verify → approve → archive → budget tracking.' : '流程：上传发票 → 可选 AI审核 → 手工确认/修改 → 审核 → 归档 → 预算追踪。'}
        </p>
      </div>

      {message ? (
        <div className="rounded-xl border border-clearstrata-ui-softBorder bg-clearstrata-ui-soft px-4 py-3 text-sm text-clearstrata-brand-950">
          {message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            {l ? 'Invoices eligible for AI assist' : '可对其实施 AI 辅助的发票'}
          </h3>
          <p className="mt-1 text-xs text-gray-500">
            {l ? 'Typically pending review or prior extraction failures.' : '一般为「待审核」或曾经识别失败的记录。'}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-14 text-sm text-gray-500">
            <Loader2 className="size-5 animate-spin text-clearstrata-ui-primary" aria-hidden />
            {l ? 'Loading…' : '加载中…'}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-gray-500">
            {l ? 'No invoices available for AI assist yet. Upload under Invoice Management first.' : '暂无可辅助的发票。请先在「发票管理」上传文件。'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/90 text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="px-4 py-2.5">{l ? 'File' : '文件'}</th>
                  <th className="px-4 py-2.5">{l ? 'Vendor' : '供应商'}</th>
                  <th className="px-4 py-2.5">{l ? 'Date' : '日期'}</th>
                  <th className="px-4 py-2.5">{l ? 'Amount' : '金额'}</th>
                  <th className="px-4 py-2.5">{l ? 'Status' : '状态'}</th>
                  <th className="px-4 py-2.5 text-right">{l ? 'AI assist' : 'AI 辅助'}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((inv) => (
                  <tr key={inv.id} className="border-b border-gray-50 last:border-b-0">
                    <td className="max-w-[200px] truncate px-4 py-3 text-gray-900" title={inv.file_name ?? ''}>
                      {inv.file_name || '—'}
                    </td>
                    <td className="max-w-[160px] truncate px-4 py-3 text-gray-800" title={inv.vendor_name}>
                      {inv.vendor_name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {new Date(inv.invoice_date).toLocaleDateString(l ? 'en-CA' : 'zh-CN')}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-800">${Number(inv.total_amount).toFixed(2)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">{inv.status}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => void runAssist(inv)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-clearstrata-ui-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-clearstrata-ui-primaryHover active:bg-clearstrata-ui-primaryActive disabled:opacity-50"
                      >
                        {busyId === inv.id ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : (
                          <Sparkles className="size-3.5" aria-hidden />
                        )}
                        {l ? 'Run AI assist' : '运行 AI 辅助'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
