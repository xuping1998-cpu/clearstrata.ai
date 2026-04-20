import { Link } from 'react-router-dom';
import { ChevronRight, Loader2 } from 'lucide-react';
import type { DashboardAiRiskSummary } from '../../types/dashboard';
import type { VendorRiskHomeSummary } from '../../lib/vendorRiskAudit';

export type RiskStatusSectionProps = {
  en: boolean;
  aiRisk: DashboardAiRiskSummary | null;
  aiRiskPending: boolean;
  aiRiskFailed: boolean;
  /** Shown when AI flags high/critical risk (high risk count is positive). */
  onGenerateMeetingReport?: () => void;
  generatingMeetingReport?: boolean;
  vendorRiskSummary?: VendorRiskHomeSummary | null;
  vendorRiskPending?: boolean;
};

export function RiskStatusSection({
  en,
  aiRisk,
  aiRiskPending,
  aiRiskFailed,
  onGenerateMeetingReport,
  generatingMeetingReport,
  vendorRiskSummary,
  vendorRiskPending,
}: RiskStatusSectionProps) {
  const title = en ? 'Risk status' : '风险状态';
  const financeLink = en ? 'Finance' : '财务';

  if (aiRiskPending) {
    return (
      <div className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-gray-50/80 p-3 sm:p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <Loader2 className="size-4 animate-spin text-gray-400" aria-hidden />
        </div>
        <p className="mt-2 text-xs text-gray-500">{en ? 'Loading AI risk summary…' : '正在加载 AI 风险评估…'}</p>
      </div>
    );
  }

  if (aiRiskFailed || aiRisk === null) {
    return (
      <div className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-gray-50/80 p-3 sm:p-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold bg-slate-200 text-slate-800">
            {en ? 'Not analyzed' : '未分析'}
          </span>
        </div>
        <div className="mt-1.5 space-y-0.5 text-sm">
          <p className="font-medium leading-snug text-gray-900">
            {en ? 'No AI audit conclusion yet' : '尚未生成 AI 审计结论'}
          </p>
          <p className="text-xs leading-relaxed text-gray-600">
            {en
              ? 'Upload invoices and run AI audit to assess financial risk.'
              : '上传发票并完成 AI 审计后，将显示 AI 风险评估。'}
          </p>
        </div>
        <div className="mt-3">
          <Link
            to="/finance?tab=invoices"
            className="inline-flex items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-800"
          >
            {financeLink}
            <ChevronRight className="size-4" aria-hidden />
          </Link>
        </div>
      </div>
    );
  }

  const {
    highRiskCount,
    abnormalInvoiceCount,
    lastUpdatedAt,
    overBudgetCount = 0,
    bypassApprovalCount = 0,
  } = aiRisk;

  let badgeClass = 'bg-clearstrata-brand-100 text-clearstrata-brand-800';
  let badgeLabel = en ? 'OK' : '正常';
  let mainText = en ? 'No hard flags or elevated AI risk (this fiscal year).' : '本财年未发现硬约束违规或需优先关注的 AI 风险。';
  let subText = en
    ? 'Compliance checks (budget / approval) and AI audit are aligned for this selection.'
    : '预算硬约束、审批流程与 AI 审计结果一致，暂无优先事项。';

  if (bypassApprovalCount > 0) {
    badgeClass = 'bg-red-100 text-red-900';
    badgeLabel = en ? 'Process breach' : '审批违规';
    mainText = en ? 'Paid invoices without recorded approval — highest priority.' : '发现未审批付款（已付款但未通过事前审批），请立即处理。';
    subText = en
      ? 'Hard rule: at least one invoice is paid while approval was not recorded.'
      : '硬性规则：存在「已付款」但未记录事前通过审批的发票。';
  } else if (overBudgetCount > 0) {
    badgeClass = 'bg-red-100 text-red-900';
    badgeLabel = en ? 'Over budget' : '超预算';
    mainText = en ? 'Category spend exceeds the active annual budget line.' : '发现类别支出超过本年度 active 预算线。';
    subText = en
      ? 'Hard rule: cumulative spend in a budget category is above the approved annual amount.'
      : '硬性规则：某预算类别累计支出已超过批复年度金额。';
  } else if (highRiskCount > 0) {
    badgeClass = 'bg-amber-100 text-amber-950';
    badgeLabel = en ? 'High AI risk' : '高风险（AI）';
    mainText = en ? 'High or critical AI risk on one or more invoices.' : '存在 AI 高风险或严重等级发票，建议优先复核。';
    subText = en
      ? 'AI assessment indicates elevated severity; review reasons and attachments.'
      : 'AI 评估为高风险/严重，请结合系统给出的理由与附件复核。';
  } else if (abnormalInvoiceCount > 0) {
    badgeClass = 'bg-amber-100 text-amber-950';
    badgeLabel = en ? 'Review' : '待关注';
    mainText = en ? 'Elevated AI risk score on at least one invoice.' : '存在 AI 风险分数偏高的发票，建议关注。';
    subText = en
      ? 'AI score above threshold on at least one invoice (this fiscal year).'
      : '本财年至少一张发票 AI 风险分数超过关注阈值。';
  }

  const updatedLine =
    lastUpdatedAt != null
      ? en
        ? `AI audit updated: ${new Date(lastUpdatedAt).toLocaleString('en-CA', { dateStyle: 'short', timeStyle: 'short' })}`
        : `AI 审计更新于：${new Date(lastUpdatedAt).toLocaleString('zh-CN', { dateStyle: 'short', timeStyle: 'short' })}`
      : null;

  return (
    <div className="flex min-h-0 flex-col rounded-2xl border border-gray-200 bg-gray-50/80 h-full p-3 sm:p-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>{badgeLabel}</span>
      </div>

      <div className="mt-1.5 space-y-1 text-sm">
        <p className="font-medium leading-snug text-gray-900">{mainText}</p>
        <p className="text-xs leading-relaxed text-gray-600">{subText}</p>
      </div>

      <dl className="mt-2.5 grid grid-cols-1 gap-1.5 border-t border-gray-200/80 pt-2.5 text-xs text-gray-700">
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">{en ? 'Paid w/o approval (hard)' : '未审批付款（硬）'}</dt>
          <dd className="font-semibold tabular-nums text-red-800">{bypassApprovalCount}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">{en ? 'Over budget (hard)' : '超预算（硬）'}</dt>
          <dd className="font-semibold tabular-nums text-red-800">{overBudgetCount}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">{en ? 'High / critical (AI)' : '高风险（AI）'}</dt>
          <dd className="font-semibold tabular-nums text-amber-900">{highRiskCount}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-gray-500">{en ? 'Abnormal (score > 0.6)' : '异常（分数>0.6）'}</dt>
          <dd className="font-semibold tabular-nums text-amber-900">{abnormalInvoiceCount}</dd>
        </div>
      </dl>

      {updatedLine ? <p className="mt-2 text-[11px] text-gray-400 text-right">{updatedLine}</p> : null}

      {!vendorRiskPending && vendorRiskSummary && vendorRiskSummary.totalOpen > 0 ? (
        <p className="mt-2 rounded-lg border border-indigo-100 bg-indigo-50/90 px-2.5 py-2 text-[11px] leading-snug text-indigo-950">
          {en ? (
            <>
              Vendor risk scan:{' '}
              <span className="font-semibold">{vendorRiskSummary.highOrCritical}</span> high-priority signal(s),{' '}
              <span className="font-semibold">{vendorRiskSummary.needsReview}</span> flagged for review (
              {vendorRiskSummary.totalOpen} open).
            </>
          ) : (
            <>
              供应商风险：检测到{' '}
              <span className="font-semibold">{vendorRiskSummary.totalOpen}</span> 个未关闭信号（其中高/严重{' '}
              <span className="font-semibold">{vendorRiskSummary.highOrCritical}</span> 个，建议复核{' '}
              <span className="font-semibold">{vendorRiskSummary.needsReview}</span> 个）。
            </>
          )}{' '}
          <Link to="/vendor-risk-signals" className="font-medium text-indigo-700 underline">
            {en ? 'View' : '查看'}
          </Link>
        </p>
      ) : null}

      {(bypassApprovalCount > 0 || overBudgetCount > 0 || highRiskCount > 0) && onGenerateMeetingReport ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={onGenerateMeetingReport}
            disabled={generatingMeetingReport}
            className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-left text-sm font-semibold text-red-950 shadow-sm hover:bg-red-100/90 disabled:opacity-60"
          >
            {generatingMeetingReport ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                {en ? 'Generating report…' : '正在生成会议报告…'}
              </span>
            ) : (
              <span>{en ? '👉 Generate meeting report' : '👉 生成会议报告'}</span>
            )}
          </button>
        </div>
      ) : null}

      <div className="mt-auto pt-2">
        <Link
          to="/finance?tab=invoices"
          className="inline-flex items-center gap-0.5 text-sm font-medium text-blue-600 hover:text-blue-800"
        >
          {financeLink}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
