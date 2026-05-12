import { Bot } from 'lucide-react';
import { useProperty } from '@/contexts/PropertyContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Link } from 'react-router-dom';

/** Re-export for any legacy import sites; OCR path lives in `@/lib/invoiceInterpreterAssist`. */
export {
  assistInvoiceViaInterpreterOcr,
  type InterpreterAssistInvoiceRow,
} from '@/lib/invoiceInterpreterAssist';

/**
 * AI audit tools are embedded under each month's invoice ledger (Monthly Auto Audit block).
 * This route/tab view is informational only—it no longer drives per-row "AI assist" as the primary flow.
 */
export default function InvoiceInterpreter() {
  const { currentPropertyId } = useProperty();
  const { language } = useLanguage();
  const l = language === 'en';

  if (!currentPropertyId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-sm text-gray-600">
        {l ? 'Select a property first.' : '请先选择物业。'}
      </div>
    );
  }

  return (
    <div className="mx-0 min-w-0 max-w-2xl space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-clearstrata-ui-soft ring-1 ring-clearstrata-ui-softBorder">
          <Bot className="h-5 w-5 text-clearstrata-brand-800" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-gray-900">{l ? 'AI audit workspace' : 'AI 审计工作区'}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {l
              ? 'Council reviews consolidated risk alerts monthly. Open Invoice details → expand a ledger month → use “Monthly Auto Audit” to refresh AI audit rows and browse the alert list.'
              : '业委会按月查看汇总风险。「发票明细」中展开账本月份 → 顶部「月度自动审计」刷新 AI 审计并查看报警名单。'}
          </p>
          <p className="mt-3">
            <Link
              className="text-sm font-semibold text-clearstrata-ui-primary hover:underline"
              to="/finance?tab=invoices"
            >
              {l ? 'Go to Invoice details' : '前往「发票明细」'}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
