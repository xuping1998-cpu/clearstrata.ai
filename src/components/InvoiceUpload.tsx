import { useState } from 'react';
import { FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useProperty } from '../contexts/PropertyContext';

interface InvoiceUploadProps {
  jobId: string;
  quotedAmount?: number;
  onInvoiceUploaded?: () => void;
}

export function InvoiceUpload({ jobId, quotedAmount, onInvoiceUploaded }: InvoiceUploadProps) {
  const { currentPropertyId } = useProperty();
  const { language } = useLanguage();
  const [uploading, setUploading] = useState(false);
  const [invoiceData, setInvoiceData] = useState({
    invoice_number: '',
    invoice_date: '',
    vendor_name: '',
    invoice_amount: '',
    variance_explanation: '',
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `invoices/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      if (!currentPropertyId) throw new Error('No property selected');

      const variancePercent = quotedAmount
        ? ((parseFloat(invoiceData.invoice_amount) - quotedAmount) / quotedAmount) * 100
        : 0;

      const { error } = await supabase.from('procurement_invoices').insert({
        property_id: currentPropertyId,
        job_id: jobId,
        invoice_url: publicUrl,
        invoice_number: invoiceData.invoice_number,
        invoice_date: invoiceData.invoice_date,
        vendor_name: invoiceData.vendor_name,
        invoice_amount: parseFloat(invoiceData.invoice_amount),
        quoted_amount: quotedAmount,
        variance_percent: variancePercent,
        uploaded_by: user.id,
        variance_explanation: invoiceData.variance_explanation,
      });

      if (error) throw error;

      alert(language === 'en' ? 'Invoice uploaded successfully' : '发票上传成功');
      onInvoiceUploaded?.();

      setInvoiceData({
        invoice_number: '',
        invoice_date: '',
        vendor_name: '',
        invoice_amount: '',
        variance_explanation: '',
      });
    } catch (error) {
      console.error('Error uploading invoice:', error);
      alert(language === 'en' ? 'Failed to upload invoice' : '发票上传失败');
    } finally {
      setUploading(false);
    }
  };

  const variancePercent = quotedAmount && invoiceData.invoice_amount
    ? ((parseFloat(invoiceData.invoice_amount) - quotedAmount) / quotedAmount) * 100
    : 0;

  const hasSignificantVariance = Math.abs(variancePercent) > 10;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">
        {language === 'en' ? 'Upload Invoice' : '上传发票'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {language === 'en' ? 'Invoice Number' : '发票编号'}
          </label>
          <input
            type="text"
            value={invoiceData.invoice_number}
            onChange={(e) => setInvoiceData({ ...invoiceData, invoice_number: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
            placeholder="INV-2024-001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {language === 'en' ? 'Invoice Date' : '发票日期'}
          </label>
          <input
            type="date"
            value={invoiceData.invoice_date}
            onChange={(e) => setInvoiceData({ ...invoiceData, invoice_date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {language === 'en' ? 'Vendor Name' : '供应商名称'}
          </label>
          <input
            type="text"
            value={invoiceData.vendor_name}
            onChange={(e) => setInvoiceData({ ...invoiceData, vendor_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
            placeholder="ABC Company Ltd"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {language === 'en' ? 'Invoice Amount ($)' : '发票金额 ($)'}
          </label>
          <input
            type="number"
            step="0.01"
            value={invoiceData.invoice_amount}
            onChange={(e) => setInvoiceData({ ...invoiceData, invoice_amount: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
            placeholder="0.00"
          />
        </div>
      </div>

      {hasSignificantVariance && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">
                {language === 'en' ? 'Significant Price Variance Detected' : '检测到显著价格差异'}
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                {language === 'en'
                  ? `Invoice amount differs from quote by ${Math.abs(variancePercent).toFixed(1)}%`
                  : `发票金额与报价相差 ${Math.abs(variancePercent).toFixed(1)}%`}
              </p>
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'en' ? 'Explanation Required' : '需要说明原因'}
            </label>
            <textarea
              value={invoiceData.variance_explanation}
              onChange={(e) => setInvoiceData({ ...invoiceData, variance_explanation: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] focus:border-transparent"
              rows={3}
              placeholder={language === 'en' ? 'Explain the price difference...' : '请说明价格差异的原因...'}
            />
          </div>
        </div>
      )}

      <div>
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            {uploading ? (
              <div className="w-8 h-8 border-4 border-[#1D9E75] border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <FileText className="w-8 h-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  {language === 'en' ? 'Click to upload invoice document' : '点击上传发票文件'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  PDF, JPG, PNG
                </p>
              </>
            )}
          </div>
          <input
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={handleFileUpload}
            disabled={uploading || !invoiceData.invoice_amount || !invoiceData.vendor_name}
          />
        </label>
      </div>

      {quotedAmount && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="text-blue-900">
            <span className="font-medium">{language === 'en' ? 'Quoted Amount:' : '报价金额：'}</span>{' '}
            ${quotedAmount.toFixed(2)}
          </p>
        </div>
      )}
    </div>
  );
}
