import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, FileUp, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { supabase } from '../lib/supabase';
import { scheduleInvoiceAiAuditAfterInsert } from '../lib/invoiceAudit';
import { currentAccountingDefaults } from '../lib/invoiceAccountingPeriod';

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = () => reject(new Error('read failed'));
    reader.readAsDataURL(file);
  });
}

export function InvoiceUpload() {
  const { profile } = useAuth();
  const { currentPropertyId } = useProperty();
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [accountingYear, setAccountingYear] = useState(() => currentAccountingDefaults().year);
  const [accountingMonth, setAccountingMonth] = useState(() => currentAccountingDefaults().month);

  async function handleFile(file: File) {
    if (!profile || !currentPropertyId) {
      window.alert(en ? 'Missing profile or property.' : '未登录或未选择物业。');
      return;
    }

    setBusy(true);
    setHint(en ? 'Reading file…' : '正在读取文件…');

    try {
      const fileBase64 = await readFileAsBase64(file);
      setHint(en ? 'Running invoice OCR…' : '正在调用发票识别…');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invoice-ocr`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileBase64,
          mimeType: file.type || 'application/pdf',
        }),
      });

      const data = await response.json();
      if (!data.success || !data.extracted) {
        const err = data as { message?: string; message_zh?: string; error?: string };
        const msg =
          (en ? err.message : err.message_zh) ||
          err.message ||
          err.message_zh ||
          (en ? 'OCR failed.' : '识别失败');
        throw new Error(String(msg));
      }

      const ex = data.extracted as {
        vendor?: string;
        invoice_number?: string;
        invoice_date?: string;
        total_amount?: string;
        tax_amount?: string;
        currency?: string;
        summary?: string;
        raw_text?: string;
        items?: Array<{ description?: string; amount?: string }>;
      };

      const structured = data.structured as
        | { vendor?: string; amount?: string; date?: string; items?: Array<{ description?: string; amount?: string }> }
        | undefined;

      const parseAmount = (s: unknown): number => {
        if (typeof s === 'number' && Number.isFinite(s)) return s;
        if (typeof s !== 'string') return 0;
        const cleaned = s.replace(/[^\d.-]/g, '');
        const n = parseFloat(cleaned);
        return Number.isFinite(n) ? n : 0;
      };

      const total = parseAmount(ex.total_amount);
      const tax = parseAmount(ex.tax_amount);
      const subtotal = Math.max(0, total - tax);

      const line_items: { description: string; amount: number }[] = Array.isArray(ex.items)
        ? ex.items.map((it) => ({
            description: String(it?.description ?? ''),
            amount: parseAmount(it?.amount),
          }))
        : [];

      const extracted = {
        vendor_name: ex.vendor || (en ? 'Unknown vendor' : '未知供应商'),
        invoice_number: ex.invoice_number || null,
        invoice_date: ex.invoice_date || new Date().toISOString().split('T')[0],
        due_date: null as string | null,
        subtotal,
        tax_amount: tax,
        total_amount: total,
        hst_number: null as string | null,
        currency: ex.currency || 'CAD',
        category: 'general',
        description: ex.summary || null,
        line_items,
        has_anomalies: false,
        anomaly_notes: '',
        raw_text: ex.raw_text || '',
      };

      const invDateStr = extracted.invoice_date || new Date().toISOString().split('T')[0];
      const fiscalYear = parseInt(String(invDateStr).slice(0, 4), 10) || new Date().getFullYear();

      setHint(en ? 'Uploading to storage…' : '正在上传至存储…');
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `invoices/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from('documents').getPublicUrl(filePath);

      setHint(en ? 'Saving invoice…' : '正在保存发票…');

      const { data: insertedInvoice, error: dbError } = await supabase
        .from('invoices')
        .insert({
          property_id: currentPropertyId,
          file_name: file.name,
          document_url: pub.publicUrl,
          vendor_name: extracted.vendor_name,
          invoice_number: extracted.invoice_number,
          invoice_date: extracted.invoice_date,
          due_date: extracted.due_date,
          subtotal: extracted.subtotal,
          tax_amount: extracted.tax_amount,
          total_amount: extracted.total_amount,
          hst_number: extracted.hst_number,
          currency: extracted.currency || 'CAD',
          category: extracted.category || 'general',
          notes: extracted.description,
          has_anomalies: Boolean(extracted.has_anomalies),
          ai_extracted_data: extracted,
          ai_confidence_score: 0.85,
          uploaded_by: profile.id,
          status: 'pending_review',
          fiscal_year: fiscalYear,
          accounting_year: accountingYear,
          accounting_month: accountingMonth,
        })
        .select('id')
        .single();

      if (dbError) throw dbError;
      const invoiceId = (insertedInvoice as { id: string } | null)?.id;
      if (!invoiceId) throw new Error(en ? 'Missing invoice id' : '保存后缺少发票 ID');

      try {
        const structuredPayload = structured ?? {
          vendor: extracted.vendor_name,
          amount: extracted.total_amount,
          date: extracted.invoice_date,
          items: line_items.map((x) => ({ description: x.description, amount: x.amount })),
        };
        await supabase.from('invoice_ocr_raw').insert({
          invoice_id: invoiceId,
          property_id: currentPropertyId,
          structured_json: structuredPayload,
          raw_text: typeof ex.raw_text === 'string' ? ex.raw_text : null,
          ocr_model: 'claude-sonnet-4-20250514',
        });
      } catch (e) {
        console.error('invoice_ocr_raw', e);
      }

      scheduleInvoiceAiAuditAfterInsert(invoiceId, currentPropertyId);
      setHint(en ? 'Done. Redirecting…' : '完成，正在跳转…');
      navigate(`/finance?tab=invoices&invoice=${encodeURIComponent(invoiceId)}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert((en ? 'Upload failed: ' : '上传失败：') + msg);
      setHint(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  if (!currentPropertyId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center text-gray-600">
        {en ? 'Select a property from the header, then try again.' : '请先在顶部选择物业后再上传。'}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline"
      >
        <ChevronLeft className="size-4" />
        {en ? 'Home' : '首页'}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">{en ? 'Upload invoice' : '上传发票'}</h1>
      <p className="mt-2 text-sm text-gray-600">
        {en
          ? 'PDF or image. We run OCR, then save the invoice under Expense Review.'
          : '支持 PDF 或图片。系统将识别并保存到支出审核模块。'}
      </p>

      <div className="mt-6 space-y-3 rounded-xl border border-gray-200 bg-gray-50/80 px-4 py-4 text-sm">
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="invoice-upload-year">
            {en ? 'Accounting year' : '归档年份'}
          </label>
          <select
            id="invoice-upload-year"
            value={accountingYear}
            onChange={(e) => setAccountingYear(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            disabled={busy}
            aria-label={en ? 'Accounting year' : '归档年份'}
          >
            {Array.from({ length: 16 }, (_, i) => new Date().getFullYear() - 12 + i).map((y) => (
              <option key={y} value={y}>
                {en ? y : `${y}年`}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-700" htmlFor="invoice-upload-month">
            {en ? 'Accounting month' : '归档月份'}
          </label>
          <select
            id="invoice-upload-month"
            value={accountingMonth}
            onChange={(e) => setAccountingMonth(Number(e.target.value))}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2"
            disabled={busy}
            aria-label={en ? 'Accounting month' : '归档月份'}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {en ? m : `${m}月`}
              </option>
            ))}
          </select>
        </div>
        <p className="text-xs text-gray-500">
          {en
            ? 'Sets which yearly and monthly ledger this invoice belongs to. Unrelated to invoice date, payment date, or upload time.'
            : '决定这张发票进入哪个年度/月度账本；与发票日期、付款日、上传时间无关。'}
        </p>
      </div>

      <div className="mt-8">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,image/jpeg,image/png,image/webp"
          className="hidden"
          disabled={busy || !profile}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        <button
          type="button"
          className="btn-primary w-full gap-2 sm:w-auto"
          disabled={busy || !profile}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileUp className="size-4" />}
          {en ? 'Choose file' : '选择文件'}
        </button>
      </div>

      {hint ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          {busy ? <Loader2 className="size-4 animate-spin shrink-0" /> : null}
          {hint}
        </p>
      ) : null}

      <p className="mt-8 text-sm">
        <Link to="/finance?tab=invoices" className="font-medium text-emerald-700 hover:underline">
          {en ? 'Open invoice list' : '打开发票列表'}
        </Link>
      </p>
    </div>
  );
}

export default InvoiceUpload;
