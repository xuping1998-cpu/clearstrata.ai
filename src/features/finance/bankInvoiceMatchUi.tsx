import { Link } from 'react-router-dom';
import {
  formatBankMatchDate,
  formatBankMatchMoney,
  type BankMatchStatus,
  type BankTransactionWithMatch,
  type InvoiceBankPaymentLink,
} from './bankInvoiceMatch';

type BankMatchCellProps = {
  row: BankTransactionWithMatch;
  en: boolean;
  canManage: boolean;
  busyId: string | null;
  onConfirm: (row: BankTransactionWithMatch) => void;
  onReject: (row: BankTransactionWithMatch) => void;
};

export function BankTransactionMatchCell({
  row,
  en,
  canManage,
  busyId,
  onConfirm,
  onReject,
}: BankMatchCellProps) {
  const status = (row.match_status ?? 'unmatched') as BankMatchStatus;
  const inv = row.matched_invoice;
  const busy = busyId === row.id;

  if (status === 'unmatched') {
    return <span className="text-xs text-gray-500">{en ? '⚪ Unmatched' : '⚪ 未匹配'}</span>;
  }

  if (status === 'rejected') {
    return <span className="text-xs text-red-700">{en ? '🔴 Ignored' : '🔴 已忽略'}</span>;
  }

  if (status === 'suggested' && inv) {
    return (
      <div className="min-w-[140px] space-y-1 text-xs">
        <div className="font-medium text-amber-800">{en ? '🟡 Suggested match' : '🟡 建议匹配'}</div>
        <div className="font-semibold text-gray-900">{inv.vendor_name}</div>
        <div className="tabular-nums text-gray-700">{formatBankMatchMoney(Number(inv.total_amount))}</div>
        {row.match_confidence != null && (
          <div className="text-[11px] text-gray-500">
            {en ? `${row.match_confidence} pts` : `${row.match_confidence} 分`}
          </div>
        )}
        {row.match_reason && <div className="text-[11px] leading-snug text-gray-600">{row.match_reason}</div>}
        {canManage && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => onConfirm(row)}
              className="rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
            >
              {busy ? (en ? 'Working…' : '处理中…') : en ? 'Confirm' : '确认'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onReject(row)}
              className="rounded border border-gray-200 bg-white px-2 py-0.5 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {en ? 'Ignore' : '忽略'}
            </button>
          </div>
        )}
      </div>
    );
  }

  if (status === 'confirmed' && inv) {
    return (
      <div className="min-w-[140px] space-y-1 text-xs">
        <div className="font-medium text-emerald-800">{en ? '🟢 Confirmed' : '🟢 已确认'}</div>
        <div className="font-semibold text-gray-900">
          {inv.vendor_name}
          {inv.invoice_number ? ` #${inv.invoice_number}` : ''}
        </div>
        <div className="text-gray-600">
          {en ? 'Payment date: ' : '付款日期：'}
          {formatBankMatchDate(row.transaction_date, en)}
        </div>
        <div className="text-gray-600">
          {en ? 'Bank: ' : '银行流水：'}
          {row.description}
        </div>
        <Link
          to={`/finance?tab=invoices&invoice=${inv.id}`}
          className="inline-block text-[11px] font-medium text-sky-700 hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {en ? 'View invoice' : '查看发票'}
        </Link>
      </div>
    );
  }

  return <span className="text-xs text-gray-400">—</span>;
}

type InvoicePaymentCellProps = {
  link: InvoiceBankPaymentLink | undefined;
  en: boolean;
};

export function InvoicePaymentMatchCell({ link, en }: InvoicePaymentCellProps) {
  if (!link) {
    return <span className="text-[11px] text-gray-500">{en ? '⚪ Unpaid' : '⚪ 未付款'}</span>;
  }

  if (link.matchStatus === 'suggested') {
    return (
      <div className="space-y-0.5 text-[11px]">
        <div className="font-medium text-amber-800">{en ? '🟡 Payment pending' : '🟡 待确认付款'}</div>
        {link.matchConfidence != null && (
          <div className="text-gray-500">{en ? `${link.matchConfidence} pts` : `${link.matchConfidence} 分`}</div>
        )}
      </div>
    );
  }

  if (link.matchStatus === 'confirmed') {
    return (
      <div className="space-y-0.5 text-[11px]">
        <div className="font-medium text-emerald-800">{en ? '🟢 Paid' : '🟢 已付款'}</div>
        <div className="text-gray-600">
          {en ? 'Payment date: ' : '付款日期：'}
          {formatBankMatchDate(link.transactionDate, en)}
        </div>
        <div className="truncate text-gray-600" title={link.description}>
          {en ? 'Bank: ' : '银行流水：'}
          {link.description}
        </div>
      </div>
    );
  }

  return <span className="text-[11px] text-gray-400">—</span>;
}
