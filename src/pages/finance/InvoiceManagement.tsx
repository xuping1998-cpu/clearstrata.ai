import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Upload,
  FileText,
  Check,
  X,
  AlertTriangle,
  Eye,
  Loader2,
  Search,
  Filter,
  Trash2,
  CheckCircle,
  Download,
  Calendar,
  FileSpreadsheet,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { canManageInvoiceWorkflow, canDeleteInvoice } from '../../lib/financePermissions';

interface Invoice {
  id: string;
  file_name: string | null;
  document_url: string;
  vendor_name: string;
  invoice_number: string | null;
  invoice_date: string;
  subtotal: number;
  tax_amount: number | null;
  total_amount: number;
  hst_number: string | null;
  currency: string;
  status: string;
  category: string | null;
  notes: string | null;
  has_anomalies: boolean;
  ai_extracted_data: Record<string, unknown> | null;
  ai_confidence_score: number | null;
  uploaded_by: string;
  created_at: string;
  updated_at?: string | null;
  verified_by?: string | null;
  verified_at?: string | null;
  paid_at?: string | null;
  paid_by?: string | null;
  review_notes?: string | null;
  uploader?: { full_name_en: string; full_name_zh?: string };
}

interface AuditEntry {
  id: string;
  action: string;
  notes: string | null;
  old_status: string | null;
  new_status: string | null;
  created_at: string;
  actor_id: string;
  actor?: { full_name_en: string; full_name_zh?: string } | null;
}

const CATEGORIES = [
  { value: 'general', labelZh: '一般', labelEn: 'General' },
  { value: 'maintenance', labelZh: '维修', labelEn: 'Maintenance' },
  { value: 'utilities', labelZh: '水电费', labelEn: 'Utilities' },
  { value: 'insurance', labelZh: '保险', labelEn: 'Insurance' },
  { value: 'professional_services', labelZh: '专业服务', labelEn: 'Professional' },
  { value: 'cleaning', labelZh: '清洁', labelEn: 'Cleaning' },
  { value: 'landscaping', labelZh: '绿化', labelEn: 'Landscaping' },
  { value: 'security', labelZh: '安保', labelEn: 'Security' },
  { value: 'elevator', labelZh: '电梯', labelEn: 'Elevator' },
  { value: 'plumbing', labelZh: '管道', labelEn: 'Plumbing' },
  { value: 'electrical', labelZh: '电气', labelEn: 'Electrical' },
];

function statusStyle(status: string): { labelZh: string; labelEn: string; className: string } {
  const map: Record<string, { labelZh: string; labelEn: string; className: string }> = {
    pending_upload: { labelZh: '上传中', labelEn: 'Uploading', className: 'bg-gray-100 text-gray-700' },
    ai_processing: { labelZh: 'AI识别中', labelEn: 'AI processing', className: 'bg-slate-100 text-slate-700' },
    pending_review: { labelZh: '待审核', labelEn: 'Pending review', className: 'bg-blue-100 text-blue-800' },
    approved: { labelZh: '已批准', labelEn: 'Approved', className: 'bg-green-100 text-green-800' },
    paid: { labelZh: '已付款', labelEn: 'Paid', className: 'bg-cyan-100 text-cyan-800' },
    rejected: { labelZh: '已拒绝', labelEn: 'Rejected', className: 'bg-red-100 text-red-800' },
    flagged: { labelZh: '异常', labelEn: 'Exception', className: 'bg-red-100 text-red-800 ring-1 ring-red-200' },
    ai_extraction_failed: { labelZh: '识别失败', labelEn: 'Extraction failed', className: 'bg-orange-100 text-orange-800' },
  };
  return map[status] || map.pending_review;
}

export function InvoiceManagement() {
  const { profile } = useAuth();
  const { language } = useLanguage();
  const l = language === 'en';

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Invoice | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Invoice | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const canAudit = canManageInvoiceWorkflow(profile);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('invoices')
      .select('*, uploader:profiles!invoices_uploaded_by_fkey(full_name_en, full_name_zh)')
      .order('created_at', { ascending: false });
    setInvoices((data as Invoice[]) || []);
    setLoading(false);
  }, []);

  const loadInvoicesQuiet = useCallback(async () => {
    const { data } = await supabase
      .from('invoices')
      .select('*, uploader:profiles!invoices_uploaded_by_fkey(full_name_en, full_name_zh)')
      .order('created_at', { ascending: false });
    if (data) setInvoices(data as Invoice[]);
  }, []);

  useEffect(() => {
    void loadInvoices();
    const channel = supabase
      .channel('invoices-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
        void loadInvoicesQuiet();
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [loadInvoices, loadInvoicesQuiet]);

  const logAudit = async (
    invoiceId: string,
    action: string,
    opts?: { notes?: string; oldStatus?: string; newStatus?: string }
  ) => {
    if (!profile || !canAudit) return;
    await supabase.from('invoice_audit_log').insert({
      invoice_id: invoiceId,
      actor_id: profile.id,
      action,
      notes: opts?.notes ?? null,
      old_status: opts?.oldStatus ?? null,
      new_status: opts?.newStatus ?? null,
    });
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = () => reject(new Error(l ? 'Read failed' : '文件读取失败'));
      reader.readAsDataURL(file);
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    setUploading(true);
    setUploadProgress(l ? 'Reading file...' : '正在读取文件...');

    try {
      const fileBase64 = await readFileAsBase64(file);
      setUploadProgress(l ? 'AI extracting (~10s)...' : 'AI识别中（约10秒）...');

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
        throw new Error(data.error || (l ? 'AI extraction failed' : 'AI识别失败'));
      }

      const extracted = data.extracted;
      setUploadProgress(l ? 'Uploading file...' : '正在上传文件...');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `invoices/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from('documents').getPublicUrl(filePath);

      setUploadProgress(l ? 'Saving...' : '正在保存记录...');

      const { data: insertedInvoice, error: dbError } = await supabase
        .from('invoices')
        .insert({
        file_name: file.name,
        document_url: pub.publicUrl,
        vendor_name: extracted.vendor_name || (l ? 'Unknown vendor' : '未知供应商'),
        invoice_number: extracted.invoice_number || null,
        invoice_date: extracted.invoice_date || new Date().toISOString().split('T')[0],
        due_date: extracted.due_date || null,
        subtotal: extracted.subtotal ?? 0,
        tax_amount: extracted.tax_amount ?? 0,
        total_amount: extracted.total_amount ?? 0,
        hst_number: extracted.hst_number || null,
        currency: extracted.currency || 'CAD',
        category: extracted.category || 'general',
        notes: extracted.description || null,
        has_anomalies: Boolean(extracted.has_anomalies),
        ai_extracted_data: extracted,
        ai_confidence_score: 0.85,
        uploaded_by: profile.id,
        status: 'pending_review',
        })
        .select('id')
        .single();

      if (dbError) throw dbError;

      const invoiceId = (insertedInvoice as { id: string } | null)?.id;
      if (!invoiceId) {
        throw new Error(l ? 'Missing invoice id after insert' : '发票保存后缺少invoice_id');
      }

      // 如果 AI 检测到异常：先拿到 invoiceId，再写 financial_anomalies。
      // financial_anomalies 写入失败不影响 invoices（不回滚），只记录日志。
      if (extracted.has_anomalies) {
        const anomalyNotes =
          (typeof extracted.anomaly_notes === 'string' && extracted.anomaly_notes.trim()) ||
          (typeof extracted.description === 'string' && extracted.description.trim()) ||
          (l ? 'AI detected anomalies' : 'AI检测到异常');

        try {
          const { error: anomalyError } = await supabase.from('financial_anomalies').insert({
            invoice_id: invoiceId,
            notes: anomalyNotes,
          });
          if (anomalyError) {
            console.error('financial_anomalies insert failed:', anomalyError);
          }
        } catch (anomalyErr) {
          console.error('financial_anomalies insert threw:', anomalyErr);
        }
      }

      setUploadProgress(l ? 'Done!' : '识别完成！');
      await loadInvoices();
      setTimeout(() => setUploadProgress(''), 2000);
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : (() => {
              try {
                return typeof err === 'string' ? err : JSON.stringify(err);
              } catch {
                return String(err);
              }
            })();
      alert((l ? 'Upload failed: ' : '上传失败：') + msg);
      setUploadProgress('');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const applyInvoiceUpdate = async (
    id: string,
    patch: Record<string, unknown>,
    audit: { action: string; notes?: string; oldStatus: string; newStatus: string }
  ) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv) return;
    const { error } = await supabase.from('invoices').update(patch).eq('id', id);
    if (error) {
      alert(l ? 'Update failed: ' + error.message : '更新失败：' + error.message);
      return;
    }
    await logAudit(id, audit.action, {
      notes: audit.notes,
      oldStatus: audit.oldStatus,
      newStatus: audit.newStatus,
    });
    await loadInvoicesQuiet();
    setSelectedInvoice((prev) =>
      prev?.id === id ? { ...prev, ...(patch as Partial<Invoice>), status: String(patch.status || prev.status) } : prev
    );
  };

  const approveInvoice = async (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv || !profile) return;
    await applyInvoiceUpdate(
      id,
      {
        status: 'approved',
        verified_by: profile.id,
        verified_at: new Date().toISOString(),
        review_notes: null,
        updated_at: new Date().toISOString(),
      },
      { action: 'approve', oldStatus: inv.status, newStatus: 'approved' }
    );
  };

  const submitReject = async () => {
    if (!rejectTarget || !profile) return;
    setRejectSubmitting(true);
    try {
      await applyInvoiceUpdate(
        rejectTarget.id,
        {
          status: 'flagged',
          review_notes: rejectNote.trim() || null,
          verified_by: profile.id,
          verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          action: 'reject',
          notes: rejectNote.trim() || undefined,
          oldStatus: rejectTarget.status,
          newStatus: 'flagged',
        }
      );
      setRejectTarget(null);
      setRejectNote('');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const markPaid = async (id: string) => {
    const inv = invoices.find((i) => i.id === id);
    if (!inv || !profile) return;
    await applyInvoiceUpdate(
      id,
      {
        status: 'paid',
        paid_by: profile.id,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { action: 'mark_paid', oldStatus: inv.status, newStatus: 'paid' }
    );
  };

  const handleDelete = async (invoice: Invoice) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('invoices').delete().eq('id', invoice.id);
      if (error) throw error;
      await loadInvoicesQuiet();
      if (selectedInvoice?.id === invoice.id) setSelectedInvoice(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      alert((l ? 'Delete failed: ' : '删除失败：') + msg);
    } finally {
      setDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const filtered = useMemo(() => {
    return invoices.filter((inv) => {
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        inv.vendor_name?.toLowerCase().includes(q) ||
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.file_name?.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || inv.status === statusFilter;
      const d = inv.invoice_date;
      const matchFrom = !dateFrom || d >= dateFrom;
      const matchTo = !dateTo || d <= dateTo;
      return matchSearch && matchStatus && matchFrom && matchTo;
    });
  }, [invoices, searchTerm, statusFilter, dateFrom, dateTo]);

  const statusCounts = useMemo(() => {
    return invoices.reduce(
      (acc, inv) => {
        acc[inv.status] = (acc[inv.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [invoices]);

  const exportRows = (asExcel: boolean) => {
    const headers = l
      ? ['Vendor', 'Invoice #', 'Date', 'Subtotal', 'Tax', 'Total', 'Category', 'Status']
      : ['供应商', '发票号', '日期', '税前', '税额', '总计', '分类', '状态'];
    const rows = filtered.map((inv) => {
      const st = statusStyle(inv.status);
      const cat = CATEGORIES.find((c) => c.value === inv.category);
      const catLabel = l ? cat?.labelEn ?? inv.category : cat?.labelZh ?? inv.category;
      return [
        inv.vendor_name,
        inv.invoice_number || '',
        inv.invoice_date,
        Number(inv.subtotal).toFixed(2),
        Number(inv.tax_amount || 0).toFixed(2),
        Number(inv.total_amount).toFixed(2),
        catLabel || '',
        l ? st.labelEn : st.labelZh,
      ];
    });
    const esc = (cell: string | number) => {
      const s = String(cell);
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const sep = asExcel ? '\t' : ',';
    const lines = [headers.join(sep), ...rows.map((r) => r.map(esc).join(sep))];
    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], {
      type: asExcel ? 'application/vnd.ms-excel;charset=utf-8' : 'text/csv;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = asExcel
      ? `invoices-${new Date().toISOString().slice(0, 10)}.xls`
      : `invoices-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const catLabel = (value: string | null | undefined) => {
    const c = CATEGORIES.find((x) => x.value === value);
    if (!c) return value || '-';
    return l ? c.labelEn : c.labelZh;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin text-[#1D9E75]" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <SummaryCard
          label={l ? 'Pending review' : '待审核'}
          value={statusCounts['pending_review'] || 0}
          className="border-l-4 border-blue-500 bg-blue-50/80"
        />
        <SummaryCard
          label={l ? 'Approved' : '已批准'}
          value={statusCounts['approved'] || 0}
          className="border-l-4 border-green-500 bg-green-50/80"
        />
        <SummaryCard
          label={l ? 'Paid' : '已付款'}
          value={statusCounts['paid'] || 0}
          className="border-l-4 border-cyan-500 bg-cyan-50/80"
        />
        <SummaryCard
          label={l ? 'Exception' : '异常'}
          value={(statusCounts['flagged'] || 0) + (statusCounts['rejected'] || 0)}
          className="border-l-4 border-red-500 bg-red-50/80"
        />
      </div>

      {uploadProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          {uploadProgress.includes('!') || uploadProgress.includes('Done') ? (
            <CheckCircle size={20} className="text-[#1D9E75] shrink-0" />
          ) : (
            <Loader2 size={20} className="animate-spin text-blue-600 shrink-0" />
          )}
          <span className="text-sm font-medium text-blue-800">{uploadProgress}</span>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="p-4 sm:p-6 border-b border-gray-200 space-y-4">
          <div className="flex flex-col xl:flex-row xl:items-end gap-4">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={l ? 'Search vendor, invoice #...' : '搜索供应商、发票号...'}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1D9E75] text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-gray-400 shrink-0" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1D9E75]"
                >
                  <option value="all">{l ? 'All statuses' : '全部状态'}</option>
                  {(
                    [
                      'pending_upload',
                      'ai_processing',
                      'pending_review',
                      'approved',
                      'paid',
                      'flagged',
                      'rejected',
                      'ai_extraction_failed',
                    ] as const
                  ).map((key) => (
                    <option key={key} value={key}>
                      {l ? statusStyle(key).labelEn : statusStyle(key).labelZh}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400 shrink-0" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1D9E75]"
                />
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-gray-400 shrink-0 opacity-0 sm:opacity-100 w-4" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1D9E75]"
                  placeholder={l ? 'To' : '结束日期'}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => exportRows(false)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <FileText size={16} />
                CSV
              </button>
              <button
                type="button"
                onClick={() => exportRows(true)}
                className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <FileSpreadsheet size={16} />
                Excel
              </button>
              <label
                className={`inline-flex items-center gap-2 px-4 py-2 bg-[#1D9E75] text-white rounded-lg cursor-pointer text-sm font-medium transition-colors ${
                  uploading ? 'opacity-50 pointer-events-none' : 'hover:bg-[#178a66]'
                }`}
              >
                <Upload size={18} />
                {uploading ? (l ? 'Working…' : '处理中…') : l ? 'Upload' : '上传发票'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <FileText size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">{l ? 'No invoices' : '暂无发票记录'}</p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {l ? 'Vendor' : '供应商'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {l ? 'Invoice #' : '发票号'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {l ? 'Date' : '日期'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      {l ? 'Total' : '总计'}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      {l ? 'Category' : '分类'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      {l ? 'Status' : '状态'}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                      {l ? 'Actions' : '操作'}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filtered.map((inv) => {
                    const st = statusStyle(inv.status);
                    return (
                      <tr
                        key={inv.id}
                        className={`hover:bg-gray-50 cursor-pointer ${inv.has_anomalies ? 'bg-red-50/30' : ''}`}
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        <td className="px-4 py-3 text-sm">
                          <div className="font-medium text-gray-900">{inv.vendor_name}</div>
                          {inv.hst_number && (
                            <div className="text-xs text-gray-500">HST: {inv.hst_number}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{inv.invoice_number || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">
                          {new Date(inv.invoice_date).toLocaleDateString(l ? 'en-CA' : 'zh-CN')}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-semibold text-gray-900">
                          ${Number(inv.total_amount).toFixed(2)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{catLabel(inv.category)}</td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${st.className}`}
                          >
                            {inv.has_anomalies && <AlertTriangle size={12} />}
                            {l ? st.labelEn : st.labelZh}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(inv)}
                              className="p-1.5 text-gray-500 hover:text-[#1D9E75] hover:bg-green-50 rounded-lg"
                              title={l ? 'Details' : '详情'}
                            >
                              <Eye size={16} />
                            </button>
                            {canDeleteInvoice(profile, inv.uploaded_by) && (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(inv)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                                title={l ? 'Delete' : '删除'}
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            {canAudit && inv.status === 'pending_review' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => void approveInvoice(inv.id)}
                                  className="px-2 py-1 text-xs font-medium rounded-lg bg-[#1D9E75] text-white hover:bg-[#178a66]"
                                >
                                  {l ? 'Approve' : '审核通过'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectTarget(inv);
                                    setRejectNote('');
                                  }}
                                  className="px-2 py-1 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700"
                                >
                                  {l ? 'Reject' : '驳回'}
                                </button>
                              </>
                            )}
                            {canAudit && inv.status === 'approved' && (
                              <button
                                type="button"
                                onClick={() => void markPaid(inv.id)}
                                className="px-2 py-1 text-xs font-medium rounded-lg bg-cyan-600 text-white hover:bg-cyan-700"
                              >
                                {l ? 'Mark paid' : '标记已付款'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="md:hidden p-4 space-y-3">
              {filtered.map((inv) => {
                const st = statusStyle(inv.status);
                return (
                  <button
                    type="button"
                    key={inv.id}
                    onClick={() => setSelectedInvoice(inv)}
                    className="w-full text-left border border-gray-200 rounded-xl p-4 hover:border-[#1D9E75]/50 transition-colors bg-white shadow-sm"
                  >
                    <div className="flex justify-between gap-2 mb-2">
                      <span className="font-semibold text-gray-900">{inv.vendor_name}</span>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${st.className}`}>
                        {l ? st.labelEn : st.labelZh}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <div>
                        {inv.invoice_number || '—'} · {new Date(inv.invoice_date).toLocaleDateString(l ? 'en-CA' : 'zh-CN')}
                      </div>
                      <div className="font-bold text-gray-900">${Number(inv.total_amount).toFixed(2)}</div>
                    </div>
                    {canAudit && inv.status === 'pending_review' && (
                      <div className="flex gap-2 mt-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => void approveInvoice(inv.id)}
                          className="flex-1 py-2 text-xs font-medium rounded-lg bg-[#1D9E75] text-white"
                        >
                          {l ? 'Approve' : '审核通过'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectTarget(inv);
                            setRejectNote('');
                          }}
                          className="flex-1 py-2 text-xs font-medium rounded-lg bg-red-600 text-white"
                        >
                          {l ? 'Reject' : '驳回'}
                        </button>
                      </div>
                    )}
                    {canAudit && inv.status === 'approved' && (
                      <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => void markPaid(inv.id)}
                          className="w-full py-2 text-xs font-medium rounded-lg bg-cyan-600 text-white"
                        >
                          {l ? 'Mark paid' : '标记已付款'}
                        </button>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}

        <div className="px-4 py-3 border-t border-gray-200 text-sm text-gray-500">
          {filtered.length} / {invoices.length} {l ? 'invoices' : '张发票'}
        </div>
      </div>

      {selectedInvoice && (
        <InvoiceDetailModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onRefresh={loadInvoicesQuiet}
          canAudit={canAudit}
          profile={profile}
          onApprove={(id) => void approveInvoice(id)}
          onReject={(inv) => {
            setRejectTarget(inv);
            setRejectNote('');
          }}
          onMarkPaid={(id) => void markPaid(id)}
          catLabel={catLabel}
        />
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {l ? 'Reject invoice' : '驳回发票'}
            </h3>
            <p className="text-sm text-gray-600 mb-3">
              {l ? 'Status will be set to Exception. Add a note (optional).' : '状态将设为「异常」，可填写备注（选填）。'}
            </p>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#1D9E75] mb-4"
              placeholder={l ? 'Reason / note…' : '驳回原因 / 备注…'}
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setRejectTarget(null);
                  setRejectNote('');
                }}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {l ? 'Cancel' : '取消'}
              </button>
              <button
                type="button"
                disabled={rejectSubmitting}
                onClick={() => void submitReject()}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {rejectSubmitting ? (l ? 'Saving…' : '提交中…') : l ? 'Confirm reject' : '确认驳回'}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{l ? 'Delete invoice?' : '删除发票？'}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {deleteConfirm.vendor_name}{' '}
              {deleteConfirm.invoice_number ? `#${deleteConfirm.invoice_number}` : ''}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium"
              >
                {l ? 'Cancel' : '取消'}
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(deleteConfirm)}
                disabled={deleting}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {deleting ? '…' : l ? 'Delete' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={`rounded-xl p-4 sm:p-5 ${className}`}>
      <div className="text-xs sm:text-sm text-gray-600 mb-1">{label}</div>
      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{value}</div>
    </div>
  );
}

function InvoiceDetailModal({
  invoice,
  onClose,
  onRefresh,
  canAudit,
  profile,
  onApprove,
  onReject,
  onMarkPaid,
  catLabel,
}: {
  invoice: Invoice;
  onClose: () => void;
  onRefresh: () => Promise<void>;
  canAudit: boolean;
  profile: { id: string } | null;
  onApprove: (id: string) => void;
  onReject: (inv: Invoice) => void;
  onMarkPaid: (id: string) => void;
  catLabel: (v: string | null | undefined) => string;
}) {
  const { language } = useLanguage();
  const l = language === 'en';
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editCategory, setEditCategory] = useState(invoice.category || 'general');
  const [editNotes, setEditNotes] = useState(invoice.notes || '');
  const [saving, setSaving] = useState(false);

  const st = statusStyle(invoice.status);
  const aiData = invoice.ai_extracted_data as Record<string, unknown> | null;

  useEffect(() => {
    setEditCategory(invoice.category || 'general');
    setEditNotes(invoice.notes || '');
  }, [invoice]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingAudit(true);
      const { data, error } = await supabase
        .from('invoice_audit_log')
        .select('*')
        .eq('invoice_id', invoice.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (error || !data) {
        setAuditLog([]);
        setLoadingAudit(false);
        return;
      }
      const actorIds = [...new Set(data.map((d) => d.actor_id))];
      const { data: actors } = await supabase
        .from('profiles')
        .select('id, full_name_en, full_name_zh')
        .in('id', actorIds);
      const actorMap = new Map(actors?.map((a) => [a.id, a]) || []);
      setAuditLog(
        data.map((row) => ({
          ...row,
          actor: actorMap.get(row.actor_id) || null,
        })) as AuditEntry[]
      );
      setLoadingAudit(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [invoice.id]);

  const saveEdits = async () => {
    if (!profile || !canAudit) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          category: editCategory,
          notes: editNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoice.id);
      if (error) {
        alert(error.message);
        return;
      }
      await supabase.from('invoice_audit_log').insert({
        invoice_id: invoice.id,
        actor_id: profile.id,
        action: 'edit_details',
        notes: null,
        old_status: invoice.status,
        new_status: invoice.status,
      });
      await onRefresh();
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const downloadDoc = async () => {
    if (!invoice.document_url) return;
    try {
      const res = await fetch(invoice.document_url);
      const blob = await res.blob();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = invoice.file_name || 'invoice-document';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      window.open(invoice.document_url, '_blank', 'noopener,noreferrer');
    }
  };

  const actionLabel = (a: string) => {
    const m: Record<string, { en: string; zh: string }> = {
      approve: { en: 'Approved', zh: '审核通过' },
      reject: { en: 'Rejected', zh: '驳回' },
      mark_paid: { en: 'Marked paid', zh: '标记已付款' },
      edit_details: { en: 'Edited details', zh: '编辑信息' },
    };
    return l ? m[a]?.en || a : m[a]?.zh || a;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-xl max-w-3xl w-full max-h-[min(92vh,900px)] overflow-y-auto shadow-xl my-4">
        <div className="p-4 sm:p-6 border-b border-gray-200 flex items-start justify-between gap-3 sticky top-0 bg-white z-10">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{invoice.vendor_name}</h2>
            <p className="text-sm text-gray-500 mt-1 truncate">
              {invoice.file_name || invoice.invoice_number || invoice.id.slice(0, 8)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg shrink-0">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 sm:p-6 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${st.className}`}>
              {invoice.has_anomalies && <AlertTriangle size={14} className="inline mr-1" />}
              {l ? st.labelEn : st.labelZh}
            </span>
            {invoice.ai_confidence_score != null && (
              <span className="text-xs text-gray-500">
                AI {(invoice.ai_confidence_score * 100).toFixed(0)}%
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoField label={l ? 'Invoice #' : '发票号'} value={invoice.invoice_number || '-'} />
            <InfoField
              label={l ? 'Date' : '日期'}
              value={new Date(invoice.invoice_date).toLocaleDateString(l ? 'en-CA' : 'zh-CN')}
            />
            <InfoField label={l ? 'Subtotal' : '税前'} value={`$${Number(invoice.subtotal).toFixed(2)}`} />
            <InfoField label={l ? 'Tax' : '税额'} value={`$${Number(invoice.tax_amount || 0).toFixed(2)}`} />
            <InfoField label={l ? 'Total' : '总计'} value={`$${Number(invoice.total_amount).toFixed(2)}`} highlight />
            <InfoField label={l ? 'Currency' : '币种'} value={invoice.currency || 'CAD'} />
            <InfoField label="HST" value={invoice.hst_number || '-'} />
            <InfoField
              label={l ? 'Uploaded by' : '上传人'}
              value={
                invoice.uploader
                  ? l
                    ? invoice.uploader.full_name_en
                    : invoice.uploader.full_name_zh || invoice.uploader.full_name_en
                  : '—'
              }
            />
          </div>

          {editing && canAudit ? (
            <div className="space-y-3 border border-gray-200 rounded-xl p-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Category' : '分类'}</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {l ? c.labelEn : c.labelZh}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{l ? 'Notes' : '备注'}</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void saveEdits()}
                  disabled={saving}
                  className="px-4 py-2 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a66] disabled:opacity-50"
                >
                  {saving ? '…' : l ? 'Save' : '保存'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium"
                >
                  {l ? 'Cancel' : '取消'}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <div className="text-sm font-medium text-gray-500 mb-1">{l ? 'Category' : '分类'}</div>
                <div className="text-sm text-gray-900">{catLabel(invoice.category)}</div>
              </div>
              {invoice.notes && (
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-1">{l ? 'Notes' : '备注'}</div>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{invoice.notes}</p>
                </div>
              )}
              {invoice.review_notes && (
                <div>
                  <div className="text-sm font-medium text-red-700 mb-1">
                    {l ? 'Rejection / exception note' : '驳回/异常备注'}
                  </div>
                  <p className="text-sm text-red-900 bg-red-50 rounded-lg p-3 border border-red-100">
                    {invoice.review_notes}
                  </p>
                </div>
              )}
            </>
          )}

          {invoice.document_url && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void downloadDoc()}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a66]"
              >
                <Download size={18} />
                {l ? 'Download voucher' : '下载凭证'}
              </button>
              <a
                href={invoice.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Eye size={18} />
                {l ? 'Open in new tab' : '新窗口打开'}
              </a>
            </div>
          )}

          {(() => {
            const raw = aiData?.line_items;
            const lineItems = Array.isArray(raw)
              ? (raw as Array<{ description: string; amount: number }>)
              : [];
            if (lineItems.length === 0) return null;
            return (
              <div>
                <div className="text-sm font-medium text-gray-500 mb-2">{l ? 'Line items' : '明细项目'}</div>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  {lineItems.map((item, i) => (
                    <div key={i} className="flex justify-between px-4 py-2 text-sm even:bg-gray-50">
                      <span className="text-gray-700">{item.description}</span>
                      <span className="font-medium">${Number(item.amount).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div>
            <div className="text-sm font-medium text-gray-700 mb-2">{l ? 'Activity log' : '操作记录'}</div>
            {loadingAudit ? (
              <Loader2 className="animate-spin text-gray-400" size={24} />
            ) : auditLog.length === 0 ? (
              <p className="text-sm text-gray-500">{l ? 'No entries yet.' : '暂无记录。'}</p>
            ) : (
              <ul className="space-y-2 border border-gray-100 rounded-lg divide-y divide-gray-100 max-h-48 overflow-y-auto">
                {auditLog.map((entry) => (
                  <li key={entry.id} className="px-3 py-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-gray-900">{actionLabel(entry.action)}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {new Date(entry.created_at).toLocaleString(l ? 'en-CA' : 'zh-CN')}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {entry.actor
                        ? l
                          ? entry.actor.full_name_en
                          : entry.actor.full_name_zh || entry.actor.full_name_en
                        : entry.actor_id.slice(0, 8)}
                      {entry.old_status && entry.new_status && entry.old_status !== entry.new_status && (
                        <span>
                          {' '}
                          · {entry.old_status} → {entry.new_status}
                        </span>
                      )}
                    </div>
                    {entry.notes && <div className="text-xs text-gray-600 mt-1">{entry.notes}</div>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col sm:flex-row flex-wrap gap-2 pt-4 border-t border-gray-200">
            {canAudit && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-800 hover:bg-gray-50"
              >
                {l ? 'Edit' : '编辑'}
              </button>
            )}
            {canAudit && invoice.status === 'pending_review' && (
              <>
                <button
                  type="button"
                  onClick={() => onApprove(invoice.id)}
                  className="px-4 py-2.5 bg-[#1D9E75] text-white rounded-lg text-sm font-medium hover:bg-[#178a66]"
                >
                  <Check size={16} className="inline mr-1" />
                  {l ? 'Approve' : '审核通过'}
                </button>
                <button
                  type="button"
                  onClick={() => onReject(invoice)}
                  className="px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                >
                  {l ? 'Reject' : '驳回'}
                </button>
              </>
            )}
            {canAudit && invoice.status === 'approved' && (
              <button
                type="button"
                onClick={() => onMarkPaid(invoice.id)}
                className="px-4 py-2.5 bg-cyan-600 text-white rounded-lg text-sm font-medium hover:bg-cyan-700"
              >
                {l ? 'Mark paid' : '标记已付款'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoField({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs font-medium text-gray-500 mb-0.5">{label}</div>
      <div className={`text-sm ${highlight ? 'text-[#1D9E75] font-bold text-lg' : 'text-gray-900'}`}>{value}</div>
    </div>
  );
}
