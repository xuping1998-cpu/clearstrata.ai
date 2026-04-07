import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Loader2, Receipt } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type Row = {
  id: string;
  vendor_name: string;
  total_amount: number;
  invoice_date: string;
};

type Props = {
  taskId: string;
  propertyId: string;
  relatedInvoiceId: string | null;
  en: boolean;
};

export function TaskLinkedInvoicesSection({ taskId, propertyId, relatedInvoiceId, en }: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const ids = new Set<string>();
      const { data: links, error: linkErr } = await supabase
        .from('task_invoices')
        .select('invoice_id')
        .eq('task_id', taskId);
      if (!linkErr) for (const l of links ?? []) ids.add(l.invoice_id);
      if (relatedInvoiceId) ids.add(relatedInvoiceId);
      if (linkErr && relatedInvoiceId) ids.add(relatedInvoiceId);
      if (ids.size === 0) {
        setRows([]);
        setLoading(false);
        return;
      }
      const { data: invs } = await supabase
        .from('invoices')
        .select('id, vendor_name, total_amount, invoice_date')
        .eq('property_id', propertyId)
        .in('id', [...ids])
        .order('invoice_date', { ascending: false });
      setRows((invs as Row[]) ?? []);
    } catch (e) {
      console.error('TaskLinkedInvoicesSection', e);
      if (relatedInvoiceId) {
        const { data: one } = await supabase
          .from('invoices')
          .select('id, vendor_name, total_amount, invoice_date')
          .eq('property_id', propertyId)
          .eq('id', relatedInvoiceId)
          .maybeSingle();
        setRows(one ? [one as Row] : []);
      } else setRows([]);
    } finally {
      setLoading(false);
    }
  }, [taskId, propertyId, relatedInvoiceId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        {en ? 'Loading invoices…' : '加载关联发票…'}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="mt-6 rounded-xl border border-dashed border-gray-200 bg-gray-50/80 px-4 py-3 text-sm text-gray-500">
        {en ? 'No invoices linked to this task.' : '暂无关联发票（数据来自 invoices 表与 task_invoices）。'}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-2">
        <Receipt className="text-[#1D9E75]" size={20} />
        <h2 className="text-lg font-bold text-gray-900">{en ? 'Linked invoices' : '关联发票'}</h2>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        {en
          ? 'Same records as in Finance → Invoice Management (single source of truth).'
          : '与「财务报表 → 发票管理」中为同一批 invoices 记录，不重复存储。'}
      </p>
      <ul className="mt-4 divide-y divide-gray-100">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0">
            <div>
              <div className="font-medium text-gray-900">{r.vendor_name}</div>
              <div className="text-xs text-gray-500">
                {new Date(r.invoice_date).toLocaleDateString(en ? 'en-CA' : 'zh-CN')}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold text-gray-900">${Number(r.total_amount).toFixed(2)}</span>
              <Link
                to={`/finance?tab=invoices&invoice=${r.id}`}
                className="inline-flex items-center gap-1 text-sm font-medium text-[#1D9E75] hover:underline"
              >
                {en ? 'View invoice' : '查看发票详情'}
                <ExternalLink size={14} />
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
