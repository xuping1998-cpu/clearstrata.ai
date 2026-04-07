/**
 * 报价（procurement_quotes.quoted_amount）vs 发票（invoices.total_amount）差异分析。
 * 金额字段名与数据库一致：报价用 quoted_amount，发票用 total_amount。
 */

export type QuoteVarianceResult = {
  quoteAmount: number;
  invoiceAmount: number;
  varianceAmount: number;
  /** varianceAmount / quoteAmount，如 0.12 表示高于报价 12% */
  variancePercent: number;
  warningLevel: 'normal' | 'warning' | 'danger';
  /** 中文文案（主界面） */
  message: string;
  messageEn: string;
  /** 发票金额低于报价 */
  belowQuote?: boolean;
};

/**
 * @param quoteAmount 批复报价金额（来自 procurement_quotes.quoted_amount）
 * @param invoiceAmount 发票含税总额（来自 invoices.total_amount）
 */
export function computeQuoteInvoiceVariance(
  quoteAmount: number | null | undefined,
  invoiceAmount: number | null | undefined,
): QuoteVarianceResult | null {
  const q = Number(quoteAmount);
  const inv = Number(invoiceAmount);
  if (!Number.isFinite(q) || !Number.isFinite(inv) || q <= 0) {
    return null;
  }

  const varianceAmount = inv - q;
  const variancePercent = varianceAmount / q;

  if (inv < q) {
    const pctAbs = Math.abs(variancePercent) * 100;
    return {
      quoteAmount: q,
      invoiceAmount: inv,
      varianceAmount,
      variancePercent,
      warningLevel: 'normal',
      belowQuote: true,
      message: `低于报价 ${pctAbs.toFixed(1)}%`,
      messageEn: `${pctAbs.toFixed(1)}% below quote`,
    };
  }

  if (variancePercent < 0.1) {
    return {
      quoteAmount: q,
      invoiceAmount: inv,
      varianceAmount,
      variancePercent,
      warningLevel: 'normal',
      message: '与报价基本一致',
      messageEn: 'In line with the approved quote',
    };
  }

  if (variancePercent < 0.2) {
    return {
      quoteAmount: q,
      invoiceAmount: inv,
      varianceAmount,
      variancePercent,
      warningLevel: 'warning',
      message: '较报价有一定偏差，建议核对',
      messageEn: 'Notable variance from quote — please verify',
    };
  }

  return {
    quoteAmount: q,
    invoiceAmount: inv,
    varianceAmount,
    variancePercent,
    warningLevel: 'danger',
    message: '明显高于报价，建议复核原因后再审批',
    messageEn: 'Well above quote — review before approval',
  };
}

/** 红色预警：明显高于报价（variance ≥ 20%）且发票不低于报价 */
export function isRedAlertVariance(v: QuoteVarianceResult | null | undefined): boolean {
  return v != null && v.warningLevel === 'danger' && !v.belowQuote;
}

export function quoteVariancePanelClass(level: QuoteVarianceResult['warningLevel']): string {
  switch (level) {
    case 'danger':
      return 'border-red-300 bg-red-50 text-red-950';
    case 'warning':
      return 'border-amber-300 bg-amber-50 text-amber-950';
    default:
      return 'border-emerald-200/80 bg-emerald-50/50 text-gray-900';
  }
}
