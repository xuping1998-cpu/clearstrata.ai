/** 规则版费用对比：当前发票 vs 同物业、同供应商、同 category、近 12 个月历史均值 */

export type FeeAnomalyState =
  | {
      insufficient: true;
      messageZh: string;
      messageEn: string;
    }
  | {
      insufficient: false;
      currentAmount: number;
      avgAmount: number;
      /** 相对历史均值的涨幅 %，(current - avg) / avg * 100 */
      pctAboveAvg: number;
      verdictZh: string;
      verdictEn: string;
    };

function verdictPair(pct: number): { zh: string; en: string } {
  if (pct <= 0 || pct < 15) {
    return { zh: '与历史均价接近', en: 'Close to historical average.' };
  }
  if (pct <= 30) {
    return { zh: '较历史均价偏高', en: 'Above historical average.' };
  }
  return { zh: '明显高于历史均价，建议复核', en: 'Well above historical average — please review.' };
}

const MIN_HISTORY = 2;

export function computeInvoiceFeeAnomaly(input: {
  current: {
    id: string;
    total_amount: number;
    vendor_name: string | null;
    category: string | null;
    invoice_date: string | null;
  };
  /** 同物业、同供应商、invoice_date >= cutoff，不含当前单（由调用方过滤） */
  historyRows: { id: string; total_amount: number; category: string | null }[];
}): FeeAnomalyState {
  const { current, historyRows } = input;

  const sameCat = (c: string | null) => (c ?? '') === (current.category ?? '');
  const hist = historyRows.filter((h) => h.id !== current.id && sameCat(h.category));

  if (hist.length < MIN_HISTORY) {
    return {
      showCard: true,
      insufficient: true,
      messageZh: '暂无足够历史数据用于比较',
      messageEn: 'Not enough historical invoices to compare.',
    };
  }

  const amounts = hist.map((h) => Number(h.total_amount));
  const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  if (!Number.isFinite(avg) || avg <= 0) {
    return {
      showCard: true,
      insufficient: true,
      messageZh: '暂无足够历史数据用于比较',
      messageEn: 'Not enough historical invoices to compare.',
    };
  }

  const cur = Number(current.total_amount);
  const pct = ((cur - avg) / avg) * 100;
  const v = verdictPair(pct);

  return {
    showCard: true,
    insufficient: false,
    currentAmount: cur,
    avgAmount: avg,
    pctAboveAvg: pct,
    verdictZh: v.zh,
    verdictEn: v.en,
  };
}
