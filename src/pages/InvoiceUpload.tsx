import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, PenLine, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { uploadInvoiceDocumentDirect, isAllowedInvoiceUploadFile } from '../lib/invoiceDirectUpload';
import { currentAccountingDefaults } from '../lib/invoiceAccountingPeriod';
import { getPdfPageCountFromFile, processPayablePdfPackage } from '../lib/invoicePdfPackage';

export function InvoiceUpload() {
  const { profile } = useAuth();
  const { currentPropertyId } = useProperty();
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();
  const packagePdfInputRef = useRef<HTMLInputElement>(null);
  const supplementInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [accountingYear, setAccountingYear] = useState(() => currentAccountingDefaults().year);
  const [accountingMonth, setAccountingMonth] = useState(() => currentAccountingDefaults().month);

  async function handlePackageFile(file: File) {
    if (!profile || !currentPropertyId) {
      window.alert(en ? 'Missing profile or property.' : '未登录或未选择物业。');
      return;
    }
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      window.alert(en ? 'Please choose a PDF payable package.' : '请选择 PDF 发票包。');
      return;
    }

    setBusy(true);
    setHint(en ? 'Reading PDF…' : '正在读取 PDF…');

    try {
      const pageCount = await getPdfPageCountFromFile(file);
      if (pageCount <= 1) {
        window.alert(
          en
            ? 'Only one page found. Use “Single-file supplement” for one-page PDFs, or merge pages into a package.'
            : '仅检测到 1 页。请使用「单张补录」上传单页 PDF，或将多页合并为发票包后再用主入口。',
        );
        return;
      }
      setHint(en ? `Processing ${pageCount}-page package…` : `正在处理 ${pageCount} 页发票包…`);
      const summary = await processPayablePdfPackage({
        file,
        profileId: profile.id,
        propertyId: currentPropertyId,
        accountingYear,
        accountingMonth,
        langEn: en,
        onProgress: (p) => setHint(en ? p.messageEn : p.messageZh),
      });
      window.alert(
        en
          ? `PDF upload complete.\nTotal pages: ${summary.totalPages}\nInvoices recognized: ${summary.recognizedInvoices}\nSkipped: ${summary.skippedPages}`
          : `PDF 上传完成\n总页数：${summary.totalPages}\n识别发票：${summary.recognizedInvoices}\n跳过：${summary.skippedPages}`,
      );
      setHint(en ? 'Done. Opening invoice list…' : '完成，正在打开发票列表…');
      navigate('/finance?tab=invoices');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert((en ? 'Package upload failed: ' : '发票包上传失败：') + msg);
      setHint(null);
    } finally {
      setBusy(false);
      if (packagePdfInputRef.current) packagePdfInputRef.current.value = '';
    }
  }

  async function handleSupplementFile(file: File) {
    if (!profile || !currentPropertyId) {
      window.alert(en ? 'Missing profile or property.' : '未登录或未选择物业。');
      return;
    }

    if (!isAllowedInvoiceUploadFile(file)) {
      window.alert(en ? 'Please upload a PDF, JPG, or PNG file.' : '请上传 PDF、JPG 或 PNG 格式的文件。');
      return;
    }

    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    if (isPdf) {
      const pageCount = await getPdfPageCountFromFile(file);
      if (pageCount > 1) {
        window.alert(en ? 'Multi-page PDFs belong under “Upload PDF payable package”.' : '多页 PDF 请使用「上传 PDF 发票包」主入口。');
        if (supplementInputRef.current) supplementInputRef.current.value = '';
        return;
      }
    }

    setBusy(true);
    setHint(en ? 'Uploading supplement…' : '正在上传补录…');

    try {
      const { invoiceId } = await uploadInvoiceDocumentDirect({
        file,
        profileId: profile.id,
        propertyId: currentPropertyId,
        accountingYear,
        accountingMonth,
        langEn: en,
      });

      setHint(en ? 'Saved. Redirecting…' : '补录已保存，正在跳转…');
      navigate(`/finance?tab=invoices&invoice=${encodeURIComponent(invoiceId)}`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert((en ? 'Upload failed: ' : '上传失败：') + msg);
      setHint(null);
    } finally {
      setBusy(false);
      if (supplementInputRef.current) supplementInputRef.current.value = '';
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

      <h1 className="text-2xl font-bold text-gray-900">{en ? 'Expense Review uploads' : '支出审核 · 上传'}</h1>
      <p className="mt-2 text-sm font-semibold text-gray-900">{en ? 'Main: monthly payable PDF package' : '主流程：整月 PDF 发票包'}</p>
      <p className="mt-1 text-sm text-gray-600">
        {en
          ? 'Typical strata workflow—upload the full manager export (many pages). No AI required to upload.'
          : '常规做法是上传物业管理公司整包导出（多页）。上传本身不依赖 AI。'}
      </p>
      <p className="mt-3 text-xs font-semibold text-gray-800">{en ? 'Supplement: one-off receipt' : '补录：零散单张'}</p>
      <p className="mt-1 text-xs text-gray-600">
        {en ? 'Single-page PDF or photo only. Multi-page PDFs must use the main package button.' : '仅单页 PDF 或照片；多页 PDF 必须使用主入口。'}
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

      <input
        ref={packagePdfInputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        disabled={busy || !profile}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handlePackageFile(f);
        }}
      />
      <input
        ref={supplementInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        className="hidden"
        disabled={busy || !profile}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleSupplementFile(f);
        }}
      />

      <div className="mt-8 flex flex-col gap-2">
        <button
          type="button"
          className="btn-primary inline-flex w-full items-center justify-center gap-2"
          disabled={busy || !profile}
          onClick={() => packagePdfInputRef.current?.click()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {en ? 'Upload PDF payable package' : '上传 PDF 发票包（主流程）'}
        </button>
        <button
          type="button"
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          disabled={busy || !profile}
          onClick={() => supplementInputRef.current?.click()}
        >
          <PenLine className="size-4 shrink-0" />
          {en ? 'Single-file supplement (1-page PDF / image)' : '单张补录（单页 PDF / 图片）'}
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
