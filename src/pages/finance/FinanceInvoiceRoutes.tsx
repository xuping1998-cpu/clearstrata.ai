import { Navigate, useLocation, useParams } from 'react-router-dom';

/** 深链：/finance/invoices/:invoiceId → 发票明细并打开该发票详情（弹窗） */
export function FinanceInvoiceDeepLink() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  if (!invoiceId) return <Navigate to="/finance?tab=invoices" replace />;
  return (
    <Navigate
      to={`/finance?tab=invoices&invoice=${encodeURIComponent(invoiceId)}`}
      replace
    />
  );
}

/** 列表深链：/finance/invoices?filter=danger|audit → 发票明细 + 筛选 */
export function FinanceInvoicesListDeepLink() {
  const { search } = useLocation();
  const sp = new URLSearchParams(search);
  const filter = sp.get('filter');
  const qs = new URLSearchParams();
  qs.set('tab', 'invoices');
  if (filter) qs.set('filter', filter);
  return <Navigate to={`/finance?${qs.toString()}`} replace />;
}
