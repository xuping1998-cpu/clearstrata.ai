import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronRight, Inbox } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import type { AbnormalInvoiceItem } from '../../types/dashboard';

export type InvoiceFilter = 'all' | 'high_risk' | 'this_month';

function formatMoney(value: number | null | undefined, locale: 'en' | 'zh') {
  const loc = locale === 'zh' ? 'zh-CN' : 'en-CA';
  return new Intl.NumberFormat(loc, {
    style: 'currency',
    currency: 'CAD',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDate(value: string | null | undefined, locale: 'en' | 'zh') {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-CA');
}

function statusText(status: string | null | undefined, en: boolean) {
  if (en) {
    switch (status) {
      case 'approved':
        return 'Approved';
      case 'paid':
        return 'Paid';
      case 'pending_review':
        return 'Pending review';
      case 'pending_upload':
        return 'Uploading';
      case 'flagged':
        return 'Flagged';
      case 'rejected':
        return 'Rejected';
      default:
        return status?.trim() ? status : 'Unknown';
    }
  }
  switch (status) {
    case 'approved':
      return '已批准';
    case 'paid':
      return '已付款';
    case 'pending_review':
      return '待审核';
    case 'pending_upload':
      return '上传中';
    case 'flagged':
      return '已标记';
    case 'rejected':
      return '已拒绝';
    case 'pending':
      return '待处理';
    default:
      return status?.trim() ? status : '未知';
  }
}

function anomalyText(flag: string | null | undefined, en: boolean) {
  if (!flag) return en ? 'Abnormal invoice' : '异常发票';
  switch (flag) {
    case 'category_unmatched':
      return en ? 'Category unmatched' : '科目无法匹配';
    case 'over_budget':
      return en ? 'Over budget' : '预算超支';
    default:
      return flag;
  }
}

function isThisMonth(value?: string | null) {
  if (!value) return false;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/** 与发票工作流对齐：科目/预算异常标记，或待处理、流程异常状态 */
function isHighRisk(item: AbnormalInvoiceItem) {
  const st = item.status ?? '';
  return (
    item.budget_anomaly_flag === 'category_unmatched' ||
    item.budget_anomaly_flag === 'over_budget' ||
    st === 'pending' ||
    st === 'pending_review' ||
    st === 'flagged'
  );
}

export type RecentAbnormalInvoicesCardProps = {
  items: AbnormalInvoiceItem[];
  loadError?: boolean;
  filter?: InvoiceFilter;
  onFilterChange?: (filter: InvoiceFilter) => void;
  emphasize?: boolean;
};

export function RecentAbnormalInvoicesCard({
  items,
  loadError,
  filter: filterProp,
  onFilterChange,
  emphasize = false,
}: RecentAbnormalInvoicesCardProps) {
  const { language } = useLanguage();
  const en = language === 'en';
  const [internalFilter, setInternalFilter] = useState<InvoiceFilter>('all');
  const currentFilter = filterProp ?? internalFilter;

  function handleFilterChange(next: InvoiceFilter) {
    if (onFilterChange) {
      onFilterChange(next);
    } else {
      setInternalFilter(next);
    }
  }

  const filteredItems = useMemo(() => {
    let list = [...items];
    if (currentFilter === 'high_risk') {
      list = list.filter(isHighRisk);
    }
    if (currentFilter === 'this_month') {
      list = list.filter((item) => isThisMonth(item.invoice_date || item.created_at));
    }
    return list.slice(0, 3);
  }, [items, currentFilter]);

  const title = en ? 'Recent abnormal invoices' : '最近异常发票';
  const subtitle = en
    ? 'Prioritize high-risk, category, or budget anomalies'
    : '优先处理高风险、科目异常或预算异常单据';
  const viewAll = en ? 'View all' : '查看全部';
  const loadErrText = en
    ? 'Could not load abnormal invoices. Please try again later.'
    : '无法加载异常发票列表，请稍后重试。';

  const tabs: { key: InvoiceFilter; labelZh: string; labelEn: string }[] = [
    { key: 'all', labelZh: '全部', labelEn: 'All' },
    { key: 'high_risk', labelZh: '高风险', labelEn: 'High risk' },
    { key: 'this_month', labelZh: '本月新增', labelEn: 'This month' },
  ];

  const emptyAll = en ? 'No abnormal invoices right now.' : '当前没有异常发票';
  const emptyHigh = en ? 'No high-risk abnormal invoices.' : '当前没有高风险异常发票';
  const emptyMonth = en ? 'No new abnormal invoices this month.' : '本月暂无新增异常发票';

  const emptyMessage =
    currentFilter === 'high_risk'
      ? emptyHigh
      : currentFilter === 'this_month'
        ? emptyMonth
        : emptyAll;

  const footerAll = en
    ? 'Prioritize invoices with category mismatch or budget overrun.'
    : '建议优先检查科目无法匹配和预算超支类发票';
  const footerHigh = en
    ? 'Showing high-risk abnormal invoices — please prioritize.'
    : '当前展示高风险异常发票，建议优先处理';
  const footerMonth = en
    ? 'Showing abnormal invoices from this month — follow up promptly.'
    : '当前展示本月新增异常发票，请及时跟进';

  const footerTip =
    currentFilter === 'high_risk'
      ? footerHigh
      : currentFilter === 'this_month'
        ? footerMonth
        : footerAll;

  const countSuffix = en ? 'items' : '条';

  return (
    <div
      className={`rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition-[box-shadow,ring] duration-300 ${
        emphasize ? 'ring-2 ring-amber-300/90 ring-offset-2 ring-offset-gray-50' : ''
      }`}
    >
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          <div className="flex max-w-full rounded-full bg-gray-100 p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleFilterChange(tab.key)}
                className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium transition ${
                  currentFilter === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {en ? tab.labelEn : tab.labelZh}
              </button>
            ))}
          </div>

          {!loadError && items.length > 0 && (
            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
              {filteredItems.length} {countSuffix}
            </span>
          )}

          <Link
            to="/finance?tab=invoices"
            className="inline-flex shrink-0 items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {viewAll}
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>

      {loadError ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>{loadErrText}</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-10 text-center text-sm text-emerald-900">
          <Inbox className="size-8 text-emerald-700/70" aria-hidden />
          <span>{emptyMessage}</span>
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {filteredItems.map((item) => (
              <li key={item.id}>
                <Link
                  to={`/finance?tab=invoices&invoice=${encodeURIComponent(item.id)}`}
                  className="block rounded-xl border border-gray-200 bg-gray-50/50 p-4 transition-all hover:border-red-300 hover:bg-red-50/50 hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-base font-semibold text-gray-900">
                        {item.vendor_name?.trim() || (en ? 'Unnamed vendor' : '未命名供应商')}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        {anomalyText(item.budget_anomaly_flag, en)}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
                          {statusText(item.status, en)}
                        </span>
                        <span className="rounded-full bg-red-100 px-2.5 py-1 text-xs font-medium text-red-800">
                          {en ? 'Needs review' : '需关注'}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-row items-end justify-between gap-4 border-t border-gray-100 pt-3 sm:flex-col sm:items-end sm:border-t-0 sm:pt-0">
                      <div className="text-xl font-bold tabular-nums text-gray-900">
                        {formatMoney(item.total_amount, language)}
                      </div>
                      <div className="text-sm tabular-nums text-gray-500">
                        {formatDate(item.invoice_date ?? item.created_at, language)}
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{footerTip}</div>
        </>
      )}
    </div>
  );
}
