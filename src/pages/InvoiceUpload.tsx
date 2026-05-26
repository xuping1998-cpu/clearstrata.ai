import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, Loader2, Upload } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProperty } from '../contexts/PropertyContext';
import { useLanguage } from '../contexts/LanguageContext';
import { canUploadInvoicePackage } from '../lib/financePermissions';
import { uploadInvoiceDocumentDirect, isAllowedInvoiceUploadFile } from '../lib/invoiceDirectUpload';
import { currentAccountingDefaults } from '../lib/invoiceAccountingPeriod';

export function InvoiceUpload() {
  const { profile } = useAuth();
  const { currentPropertyId, roleInProperty } = useProperty();
  const { language } = useLanguage();
  const en = language === 'en';
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [accountingYear, setAccountingYear] = useState(() => currentAccountingDefaults().year);
  const [accountingMonth, setAccountingMonth] = useState(() => currentAccountingDefaults().month);

  async function handleFile(file: File) {
    if (!profile || !currentPropertyId) {
      window.alert(en ? 'Missing profile or property.' : '未登录或未选择物业。');
      return;
    }

    if (!isAllowedInvoiceUploadFile(file)) {
      window.alert(en ? 'Please upload a PDF, JPG, or PNG file.' : '请上传 PDF、JPG 或 PNG 格式的文件。');
      return;
    }

    setBusy(true);
    setHint(en ? 'Uploading…' : '上传中…');

    try {
      await uploadInvoiceDocumentDirect({
        file,
        profileId: profile.id,
        propertyId: currentPropertyId,
        accountingYear,
        accountingMonth,
        langEn: en,
      });

      window.alert(
        en
          ? 'PDF uploaded\n1 file saved. Click the file name in the list to view the original PDF.'
          : 'PDF 上传完成\n已保存 1 个文件。可在列表中点击文件名查看原始 PDF。',
      );

      setHint(en ? 'Done. Opening invoice list…' : '完成，正在打开发票列表…');
      navigate('/finance?tab=invoices');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      window.alert((en ? 'Upload failed: ' : '上传失败：') + msg);
      setHint(null);
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  if (!currentPropertyId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center text-gray-600">
        {en ? 'Select a property from the header, then try again.' : '请先在顶部选择物业后再上传。'}
      </div>
    );
  }

  if (!canUploadInvoicePackage(roleInProperty)) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-emerald-800 hover:underline"
        >
          <ChevronLeft className="size-4" />
          {en ? 'Home' : '首页'}
        </Link>
        <p className="text-sm text-gray-700">
          {en
            ? 'Invoice uploads are limited to property staff. Open Invoice Review to browse invoices read-only.'
            : '发票上传仅限物业工作人员。请在「发票审核」中只读查看发票明细。'}
        </p>
        <Link
          to="/finance?tab=invoices"
          className="mt-4 inline-block text-sm font-medium text-clearstrata-ui-primary hover:underline"
        >
          {en ? 'Go to Invoice Review' : '前往发票审核'}
        </Link>
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

      <h1 className="text-2xl font-bold text-gray-900">{en ? 'Invoice Review · uploads' : '发票审核 · 上传发票'}</h1>
      <p className="mt-2 text-sm text-gray-600">
        {en
          ? 'Upload a PDF or image. One file is saved as one archived record—no OCR or page splitting.'
          : '上传 PDF 或图片。每个文件保存为一条归档记录，不做 OCR，不拆页。'}
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
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png"
        className="hidden"
        disabled={busy || !profile}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
        }}
      />

      <div className="mt-8 flex flex-col gap-2">
        <button
          type="button"
          className="btn-primary inline-flex w-full items-center justify-center gap-2"
          disabled={busy || !profile}
          onClick={() => fileInputRef.current?.click()}
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          {busy ? (en ? 'Uploading…' : '上传中…') : en ? 'Choose file' : '选择文件'}
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
