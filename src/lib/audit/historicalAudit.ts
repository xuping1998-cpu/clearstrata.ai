/**
 * Auto historical bare-spend benchmark from invoice_ai_audit_contexts.context_json.historicalAudit
 */

export type HistoricalBenchmarkStatus = 'normal' | 'warning' | 'unsupported';

export type HistoricalAuditPayload = {
  candidate: boolean;
  serviceType?: string | null;
  benchmarkLow?: number | null;
  benchmarkHigh?: number | null;
  benchmarkStatus?: HistoricalBenchmarkStatus;
  variancePct?: number | null;
  confidence?: number | null;
  reasoning?: string;
  generatedAt?: string;
};

const SERVICE_LABELS: Record<string, { zh: string; en: string }> = {
  strata_management: { zh: '物业管理费', en: 'Strata management fee' },
  telecom: { zh: '通讯服务', en: 'Telecom services' },
  security_monitoring: { zh: '安防监控', en: 'Security monitoring' },
};

export function parseHistoricalAuditFromContext(
  contextJson: Record<string, unknown> | null | undefined,
): HistoricalAuditPayload | null {
  if (!contextJson || typeof contextJson !== 'object') return null;
  const raw = contextJson.historicalAudit;
  if (!raw || typeof raw !== 'object') return null;
  const h = raw as Record<string, unknown>;
  if (h.candidate !== true) {
    return { candidate: false, generatedAt: typeof h.generatedAt === 'string' ? h.generatedAt : undefined };
  }
  const statusRaw = String(h.benchmarkStatus ?? '').toLowerCase();
  const benchmarkStatus =
    statusRaw === 'normal' || statusRaw === 'warning' || statusRaw === 'unsupported'
      ? (statusRaw as HistoricalBenchmarkStatus)
      : undefined;
  return {
    candidate: true,
    serviceType: typeof h.serviceType === 'string' ? h.serviceType : null,
    benchmarkLow: typeof h.benchmarkLow === 'number' ? h.benchmarkLow : null,
    benchmarkHigh: typeof h.benchmarkHigh === 'number' ? h.benchmarkHigh : null,
    benchmarkStatus,
    variancePct: typeof h.variancePct === 'number' ? h.variancePct : null,
    confidence: typeof h.confidence === 'number' ? h.confidence : null,
    reasoning: typeof h.reasoning === 'string' ? h.reasoning : undefined,
    generatedAt: typeof h.generatedAt === 'string' ? h.generatedAt : undefined,
  };
}

export function historicalAuditServiceTypeLabel(
  serviceType: string | null | undefined,
  languageEn: boolean,
): string {
  if (!serviceType) {
    return languageEn ? 'Historical service spend' : '历史服务支出';
  }
  const row = SERVICE_LABELS[serviceType];
  if (row) return languageEn ? row.en : row.zh;
  return languageEn ? 'Historical service spend' : '历史服务支出';
}

export function historicalAuditStatusMessage(
  status: HistoricalBenchmarkStatus | undefined,
  languageEn: boolean,
): string {
  if (status === 'normal') {
    return languageEn ? 'Within market reference range' : '在市场区间内';
  }
  if (status === 'warning') {
    return languageEn
      ? 'Above market reference — council review recommended'
      : '高于市场参考，建议业委会核查';
  }
  return languageEn
    ? 'Automatic benchmark unavailable — manual review recommended'
    : '暂无法自动核价，建议人工复核';
}

export function historicalAuditPanelClass(status: HistoricalBenchmarkStatus | undefined): string {
  if (status === 'normal') {
    return 'border-blue-200 bg-blue-50/90 ring-1 ring-blue-100';
  }
  if (status === 'warning') {
    return 'border-amber-300 bg-amber-50/90 ring-1 ring-amber-200';
  }
  return 'border-gray-200 bg-gray-50 ring-1 ring-gray-100';
}

export function historicalAuditStatusBadgeClass(status: HistoricalBenchmarkStatus | undefined): string {
  if (status === 'normal') return 'bg-blue-100 text-blue-900 ring-1 ring-blue-200';
  if (status === 'warning') return 'bg-amber-100 text-amber-950 ring-1 ring-amber-200';
  return 'bg-gray-100 text-gray-800 ring-1 ring-gray-200';
}

export function formatHistoricalBenchmarkRange(
  low: number | null | undefined,
  high: number | null | undefined,
  languageEn: boolean,
): string {
  if (
    typeof low === 'number' &&
    Number.isFinite(low) &&
    typeof high === 'number' &&
    Number.isFinite(high)
  ) {
    return `$${low.toFixed(2)} – $${high.toFixed(2)} CAD`;
  }
  return languageEn ? 'Benchmark unavailable' : '暂无法自动核价';
}

/** Vendor 12m comparison copy — demote when historicalAudit.candidate is true. */
export function isVendorHistoryComparisonText(text: string): boolean {
  const blob = text.toLowerCase();
  if (!blob.trim()) return false;
  if (blob.includes('12个月') || blob.includes('12 个月') || blob.includes('12-month')) return true;
  if (blob.includes('12 month') || blob.includes('12 months')) return true;
  if (blob.includes('供应商历史') || blob.includes('vendor history')) return true;
  if (blob.includes('same vendor') && blob.includes('12')) return true;
  if (blob.includes('过去') && (blob.includes('供应商') || blob.includes('vendor'))) return true;
  if (blob.includes('compared') && blob.includes('vendor')) return true;
  if (blob.includes('与过去') && blob.includes('供应商')) return true;
  return false;
}

export function partitionReasonsForHistoricalCandidate(
  reasons: Array<{ title: string; detail: string }>,
  historicalCandidate: boolean,
): { primary: Array<{ title: string; detail: string }>; supplemental: Array<{ title: string; detail: string }> } {
  if (!historicalCandidate) {
    return { primary: reasons, supplemental: [] };
  }
  const primary: Array<{ title: string; detail: string }> = [];
  const supplemental: Array<{ title: string; detail: string }> = [];
  for (const r of reasons) {
    if (isVendorHistoryComparisonText(`${r.title} ${r.detail}`)) {
      supplemental.push(r);
    } else {
      primary.push(r);
    }
  }
  return { primary, supplemental };
}

export function historicalAuditProcurementSuggestLabel(languageEn: boolean): string {
  return languageEn ? 'Procurement linkage' : '采购记录关联';
}

export function historicalAuditListButtonClass(status: HistoricalBenchmarkStatus | undefined): string {
  if (status === 'normal') {
    return 'bg-blue-50 text-blue-900 hover:bg-blue-100 ring-1 ring-blue-200/80';
  }
  if (status === 'warning') {
    return 'bg-amber-50 text-amber-950 hover:bg-amber-100 ring-1 ring-amber-200/80';
  }
  return 'bg-slate-50 text-slate-800 hover:bg-slate-100 ring-1 ring-slate-200/80';
}

export function historicalAuditListPillClass(status: HistoricalBenchmarkStatus | undefined): string {
  if (status === 'normal') return 'bg-blue-100 text-blue-900 ring-1 ring-blue-200';
  if (status === 'warning') return 'bg-amber-100 text-amber-950 ring-1 ring-amber-200';
  return 'bg-slate-100 text-slate-800 ring-1 ring-slate-200';
}

export function historicalAuditListTooltip(
  status: HistoricalBenchmarkStatus | undefined,
  languageEn: boolean,
): string {
  if (status === 'normal') {
    return languageEn
      ? 'Amount within market reference range.'
      : '金额位于市场参考区间内。';
  }
  if (status === 'warning') {
    return languageEn
      ? 'Price above market reference — review recommended.'
      : '价格高于市场参考，建议核查。';
  }
  return languageEn
    ? 'Market benchmark unavailable — manual review recommended.'
    : '市场参考不可用，建议人工复核。';
}

/** List row left accent when historicalAudit drives procurement suggest (red dup/budget still win). */
export function historicalAuditRowAccentClass(status: HistoricalBenchmarkStatus | undefined): string {
  if (status === 'normal') return 'border-l-4 border-l-blue-600 bg-blue-50/40';
  if (status === 'warning') return 'border-l-4 border-l-amber-400 bg-amber-50/45';
  return 'border-l-4 border-l-slate-300 bg-slate-50/45';
}

export function isHistoricalAuditCandidate(
  audit: HistoricalAuditPayload | null | undefined,
): boolean {
  return audit?.candidate === true;
}
