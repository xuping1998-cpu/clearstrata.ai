/**
 * Phase 1: auto historical bare-spend benchmark for invoice AI audit.
 * Writes `historicalAudit` on context_json only (does not touch benchmarkReview).
 */
import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

export type HistoricalBenchmarkStatus = "normal" | "warning" | "unsupported";

export type HistoricalAuditPayload = {
  candidate: boolean;
  serviceType?: string | null;
  benchmarkLow?: number | null;
  benchmarkHigh?: number | null;
  benchmarkStatus?: HistoricalBenchmarkStatus;
  variancePct?: number | null;
  confidence?: number | null;
  reasoning?: string;
  generatedAt: string;
};

const MVP_TYPES = new Set([
  "strata_management",
  "telecom",
  "security_monitoring",
]);

/** Narrow aliases only — never map bare "management" or unknown to strata_management. */
const SERVICE_TYPE_ALIASES: Record<string, string> = {
  property_management_fee: "strata_management",
  strata_management_fee: "strata_management",
  strata_management: "strata_management",
  council_management: "strata_management",
  management_fee: "strata_management",
  monthly_management: "strata_management",
  telecommunications: "telecom",
  telecom_internet: "telecom",
  alarm_monitoring: "security_monitoring",
  cctv_monitoring: "security_monitoring",
  security_monitoring: "security_monitoring",
};

const REPAIR_TRADE_KEYWORDS = [
  "mechanical",
  "hvac",
  "h.v.a.c",
  "boiler",
  "pump",
  "plumbing",
  "repair",
  "maintenance repair",
  "service call",
  "servicecall",
  "labour",
  "labor",
  "parts",
  "furnace",
  "heating",
  "cooling",
  "drain",
  "leak",
  "pipe",
  "piping",
  "valve",
  "motor",
  "fan",
  "compressor",
  "refrigeration",
  "technician",
  "weld",
  "duct",
  "thermostat",
  "water heater",
  "hot water tank",
];

const STRATA_MANAGEMENT_KEYWORDS = [
  "strata management",
  "property management fee",
  "property management",
  "management fee",
  "monthly management",
  "management contract",
  "management services",
  "strata fee",
  "strata corp",
  "council management",
  "administration fee",
  "administrative charges",
  "strata council",
  "condo management",
];

const TELECOM_KEYWORDS = [
  "telecom",
  "internet",
  "wifi",
  "wi-fi",
  "network",
  "phone",
  "cable",
  "shaw",
  "telus",
  "rogers",
  "bell",
  "fibre",
  "fiber",
  "broadband",
];

const SECURITY_KEYWORDS = [
  "security monitoring",
  "alarm monitoring",
  "alarm system",
  "cctv",
  "access control",
  "fob",
  "video surveillance",
  "intrusion",
  "monitoring service",
];

const REPAIR_UNSUPPORTED_REASONING =
  "该发票看起来是机械/维修类服务，当前自动市场核价暂未支持，建议人工复核。";

const OPENAI_MODEL = "gpt-4o-mini";

const CLASSIFY_SYSTEM = `You classify Canadian strata (condo) AP invoices for retrospective market benchmark review.

CRITICAL RULES:
1. Classify based PRIMARILY on invoice service description, line items, OCR text, and ai_extracted_data — NOT vendor name alone.
2. Do NOT classify as strata_management unless invoice content clearly refers to recurring strata/property management fees (management fee, strata management contract, monthly admin for the corporation).
3. If invoice content indicates repair, mechanical, HVAC, plumbing, boiler, pump, parts, labour/labor, or service call, return serviceType "unsupported" (never strata_management).
4. Vendor names like "Property Management" are only a weak hint; invoice line items override vendor name.
5. If uncertain, return unsupported.

Return JSON only (no markdown):
{
  "serviceType": "strata_management" | "telecom" | "security_monitoring" | "unsupported",
  "detectedServiceLabelZh": "<short Chinese label for the detected service>",
  "confidence": <0-1 number>,
  "rationale": "<brief bilingual-friendly reason citing invoice content>",
  "billingPeriod": "monthly" | "one_time" | "annual" | "unknown"
}

strata_management: ONLY recurring strata/council/property management fees.
telecom: internet, phone, cable, building connectivity (Shaw, Telus, Rogers, etc.).
security_monitoring: alarm, CCTV, security monitoring contracts.
unsupported: repairs, mechanical, HVAC, plumbing, cleaning, landscaping, legal, insurance, one-off trades, or unclear.`;

function slugifyServiceToken(raw: string): string {
  return raw.toLowerCase().trim().replace(/[\s-]+/g, "_");
}

function stringifyForKeywordScan(value: unknown, depth = 0): string {
  if (value == null || depth > 5) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map((v) => stringifyForKeywordScan(v, depth + 1)).join("\n");
  }
  if (typeof value === "object") {
    const o = value as Record<string, unknown>;
    const lineKeys = [
      "line_items",
      "lineItems",
      "items",
      "lines",
      "line_item",
      "description",
      "description_zh",
      "description_en",
      "service_description",
      "memo",
      "details",
    ];
    const chunks: string[] = [];
    for (const k of lineKeys) {
      if (o[k] != null) chunks.push(stringifyForKeywordScan(o[k], depth + 1));
    }
    for (const v of Object.values(o)) {
      chunks.push(stringifyForKeywordScan(v, depth + 1));
    }
    return chunks.join("\n");
  }
  return "";
}

function buildInvoiceContentBlob(params: {
  vendorName: string;
  invoiceNumber: string | null;
  category: string | null;
  notes: string;
  reviewNotes: string;
  description: string | null;
  aiExtracted: unknown;
  ocrStructured: unknown;
  ocrRaw: string;
}): string {
  return [
    params.vendorName,
    params.invoiceNumber ?? "",
    params.category ?? "",
    params.notes,
    params.reviewNotes,
    params.description ?? "",
    stringifyForKeywordScan(params.aiExtracted),
    stringifyForKeywordScan(params.ocrStructured),
    params.ocrRaw,
  ]
    .filter((s) => s.trim().length > 0)
    .join("\n")
    .toLowerCase();
}

function detectKeywordHits(blob: string, keywords: readonly string[]): string[] {
  const hits: string[] = [];
  for (const kw of keywords) {
    const needle = kw.toLowerCase();
    if (blob.includes(needle)) hits.push(kw);
  }
  return hits;
}

function vendorSuggestsRepairTrade(vendorName: string): boolean {
  const v = vendorName.toLowerCase();
  if (/\b(mechanical|hvac|plumbing|heating|cooling|refrigeration|boiler|furnace)\b/.test(v)) {
    return true;
  }
  if (/\b(repair|service)\b/.test(v) && /\b(plumbing|mechanical|hvac|heating)\b/.test(v)) {
    return true;
  }
  return false;
}

function vendorSuggestsManagementCompany(vendorName: string): boolean {
  const v = vendorName.toLowerCase();
  return (
    /\b(property|strata)\s+management\b/.test(v) ||
    /\bmanagement\s+(inc|ltd|corp|company|co)\b/.test(v) ||
    /\bdwell\b/.test(v) && /\bmanagement\b/.test(v)
  );
}

function isRepairDominatedInvoice(contentBlob: string, vendorName: string): boolean {
  const repairHits = detectKeywordHits(contentBlob, REPAIR_TRADE_KEYWORDS);
  if (repairHits.length > 0) return true;
  const mgmtHits = detectKeywordHits(contentBlob, STRATA_MANAGEMENT_KEYWORDS);
  if (vendorSuggestsRepairTrade(vendorName) && mgmtHits.length === 0) return true;
  return false;
}

function keywordPrefilterServiceType(
  contentBlob: string,
  vendorName: string,
): { serviceType: string | null; repairHits: string[]; managementHits: string[] } {
  const repairHits = detectKeywordHits(contentBlob, REPAIR_TRADE_KEYWORDS);
  const managementHits = detectKeywordHits(contentBlob, STRATA_MANAGEMENT_KEYWORDS);
  const telecomHits = detectKeywordHits(contentBlob, TELECOM_KEYWORDS);
  const securityHits = detectKeywordHits(contentBlob, SECURITY_KEYWORDS);

  if (repairHits.length > 0) {
    return { serviceType: "unsupported", repairHits, managementHits };
  }
  if (vendorSuggestsRepairTrade(vendorName) && managementHits.length === 0) {
    return { serviceType: "unsupported", repairHits, managementHits };
  }

  if (securityHits.length > 0 && repairHits.length === 0) {
    const hasMgmtConflict = managementHits.length > 0;
    if (!hasMgmtConflict) return { serviceType: "security_monitoring", repairHits, managementHits };
  }

  if (telecomHits.length > 0 && repairHits.length === 0) {
    const strongTelecom = telecomHits.length >= 1 &&
      !managementHits.some((h) => h.includes("management"));
    if (strongTelecom) return { serviceType: "telecom", repairHits, managementHits };
  }

  if (managementHits.length > 0 && repairHits.length === 0) {
    return { serviceType: "strata_management", repairHits, managementHits };
  }

  if (vendorSuggestsManagementCompany(vendorName) && repairHits.length === 0) {
    return { serviceType: "strata_management", repairHits, managementHits };
  }

  return { serviceType: null, repairHits, managementHits };
}

function normalizeFieldToken(raw: string): string {
  const slug = slugifyServiceToken(raw);
  if (!slug || slug === "unsupported" || slug === "unknown" || slug === "other") {
    return "unsupported";
  }
  if (MVP_TYPES.has(slug)) return slug;
  const alias = SERVICE_TYPE_ALIASES[slug];
  if (alias && MVP_TYPES.has(alias)) return alias;

  const repairSlugs = [
    "mechanical",
    "mechanical_repair",
    "hvac",
    "hvac_repair",
    "plumbing",
    "plumbing_repair",
    "repair",
    "maintenance_repair",
    "service_call",
  ];
  if (repairSlugs.some((r) => slug.includes(r))) return "unsupported";

  if (/^telecom|internet|phone|cable|network/.test(slug) || slug === "telecommunications") {
    return "telecom";
  }
  if (
    (slug.includes("security") || slug.includes("alarm") || slug.includes("cctv")) &&
    !slug.includes("management")
  ) {
    return "security_monitoring";
  }
  return "unsupported";
}

function normalizeClassifiedServiceType(classify: Record<string, unknown>): {
  rawServiceType: string;
  normalizedServiceType: string;
  mvpSupported: boolean;
} {
  const fieldValues = [
    classify.serviceType,
    classify.service_type,
    classify.type,
    classify.service,
    classify.category,
  ];

  let rawServiceType = "";
  let normalizedServiceType = "unsupported";

  for (const value of fieldValues) {
    if (value == null || !String(value).trim()) continue;
    const candidateRaw = String(value).trim();
    if (!rawServiceType) rawServiceType = candidateRaw;
    const candidateNormalized = normalizeFieldToken(candidateRaw);
    if (candidateNormalized !== "unsupported") {
      normalizedServiceType = candidateNormalized;
      rawServiceType = candidateRaw;
      break;
    }
  }

  if (!rawServiceType) {
    rawServiceType = String(classify.serviceType ?? classify.service_type ?? "unsupported");
  }

  return {
    rawServiceType,
    normalizedServiceType,
    mvpSupported: MVP_TYPES.has(normalizedServiceType),
  };
}

function finalizeServiceType(params: {
  contentBlob: string;
  vendorName: string;
  invoiceNumber: string | null;
  classify: Record<string, unknown>;
  keywordPrefilter: ReturnType<typeof keywordPrefilterServiceType>;
}): {
  finalServiceType: string;
  rawServiceType: string;
  skippedPricingReason: string | null;
  repairHits: string[];
  managementHits: string[];
} {
  const { contentBlob, vendorName, classify, keywordPrefilter } = params;
  const repairHits = keywordPrefilter.repairHits.length > 0
    ? keywordPrefilter.repairHits
    : detectKeywordHits(contentBlob, REPAIR_TRADE_KEYWORDS);
  const managementHits = keywordPrefilter.managementHits.length > 0
    ? keywordPrefilter.managementHits
    : detectKeywordHits(contentBlob, STRATA_MANAGEMENT_KEYWORDS);

  const openAiNorm = normalizeClassifiedServiceType(classify);
  let rawServiceType = openAiNorm.rawServiceType;
  let finalServiceType = openAiNorm.normalizedServiceType;
  let skippedPricingReason: string | null = null;

  if (keywordPrefilter.serviceType === "unsupported" || isRepairDominatedInvoice(contentBlob, vendorName)) {
    return {
      finalServiceType: "unsupported",
      rawServiceType: rawServiceType || "repair_trade",
      skippedPricingReason: "repair_or_mechanical_keywords",
      repairHits,
      managementHits,
    };
  }

  if (keywordPrefilter.serviceType && MVP_TYPES.has(keywordPrefilter.serviceType)) {
    finalServiceType = keywordPrefilter.serviceType;
    rawServiceType = rawServiceType || keywordPrefilter.serviceType;
  }

  if (finalServiceType === "strata_management") {
    if (repairHits.length > 0 || isRepairDominatedInvoice(contentBlob, vendorName)) {
      finalServiceType = "unsupported";
      skippedPricingReason = "strata_blocked_by_repair_content";
    } else if (managementHits.length === 0 && !vendorSuggestsManagementCompany(vendorName)) {
      finalServiceType = "unsupported";
      skippedPricingReason = "strata_without_management_semantics";
    }
  }

  if (!MVP_TYPES.has(finalServiceType)) {
    skippedPricingReason = skippedPricingReason ?? "not_mvp_service_type";
  }

  return {
    finalServiceType,
    rawServiceType,
    skippedPricingReason,
    repairHits,
    managementHits,
  };
}

function logServiceClassify(payload: Record<string, unknown>): void {
  console.log("HIST_INVOICE_SERVICE_CLASSIFY", payload);
}

function unsupportedRepairAudit(
  confidence: number | null,
  classifyRationale: string,
  detectedLabel?: string,
): { reasoning: string } {
  const extra = classifyRationale.trim();
  const label = detectedLabel?.trim();
  let reasoning = REPAIR_UNSUPPORTED_REASONING;
  if (label && !extra.includes(label)) {
    reasoning = `${reasoning}（${label}）`;
  } else if (extra && !extra.includes(REPAIR_UNSUPPORTED_REASONING)) {
    reasoning = `${REPAIR_UNSUPPORTED_REASONING} ${extra}`.trim();
  }
  return { reasoning: reasoning.slice(0, 2000) };
}

function pricingPayloadForType(
  serviceType: string,
  unitCount: number,
  city: string,
  vendorName: string,
  invoiceContext: string,
): { title: string; description: string; category: string; job_type: string } {
  const units = unitCount > 0 ? unitCount : 50;
  const loc = city || "Vancouver";
  const ctx = invoiceContext.slice(0, 4000);
  switch (serviceType) {
    case "strata_management":
      return {
        title: `Strata management fee — ${units}-unit building`,
        description:
          `Retrospective benchmark for monthly strata management services.\n` +
          `Location: ${loc}, BC.\nUnits: ${units}.\nVendor on invoice: ${vendorName}.\n` +
          `Invoice context:\n${ctx}\n` +
          `Estimate typical monthly management fee range (CAD) for this size of strata in Greater Vancouver.`,
        category: "物业管理",
        job_type: "maintenance",
      };
    case "telecom":
      return {
        title: "Telecom / internet service for strata building",
        description:
          `Retrospective benchmark for telecom or internet services (business line, bulk internet, or building connectivity).\n` +
          `Location: ${loc}, BC. Units: ${units}.\nVendor: ${vendorName}.\n` +
          `Invoice context:\n${ctx}\n` +
          `Provide reasonable monthly or billing-period CAD range for comparable strata telecom spend.`,
        category: "电信网络",
        job_type: "maintenance",
      };
    case "security_monitoring":
      return {
        title: "Security / alarm monitoring for strata",
        description:
          `Retrospective benchmark for security monitoring, alarm, or CCTV monitoring services.\n` +
          `Location: ${loc}, BC. Units: ${units}.\nVendor: ${vendorName}.\n` +
          `Invoice context:\n${ctx}\n` +
          `Provide reasonable monthly CAD range for strata security monitoring.`,
        category: "门禁与安防",
        job_type: "maintenance",
      };
    default:
      return {
        title: `Strata service — ${serviceType}`,
        description: ctx,
        category: "未分类",
        job_type: "maintenance",
      };
  }
}

function varianceFromRange(amount: number, low: number, high: number): number {
  const mid = (low + high) / 2;
  return mid > 0 ? Math.round(((amount - mid) / mid) * 1000) / 10 : 0;
}

export function deriveBenchmarkStatus(
  amount: number,
  benchmarkHigh: number | null,
  pricingSupported: boolean,
): HistoricalBenchmarkStatus {
  if (!pricingSupported || benchmarkHigh == null || !Number.isFinite(benchmarkHigh)) {
    return "unsupported";
  }
  if (amount <= benchmarkHigh) return "normal";
  return "warning";
}

function descriptionFromAiExtracted(ai: unknown): string | null {
  if (!ai || typeof ai !== "object") return null;
  const o = ai as Record<string, unknown>;
  for (const key of ["description", "description_zh", "description_en", "service_description"]) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function parseJsonBlock(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function callOpenAIClassify(
  openaiKey: string,
  classifyInput: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const userContent =
    "Classify this invoice for historical market benchmark (JSON input):\n" +
    JSON.stringify(classifyInput);

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: CLASSIFY_SYSTEM },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    console.error("[historicalInvoiceAudit] openai classify error", res.status, t);
    throw new Error("openai error");
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonBlock(raw);
  if (!parsed) {
    console.error("[historicalInvoiceAudit] classification parse failed", raw.slice(0, 500));
    throw new Error("classification failed");
  }
  return parsed;
}

async function callAiPricing(
  supabaseUrl: string,
  authHeader: string,
  anonKey: string,
  body: Record<string, unknown>,
): Promise<{ low: number; high: number; reasoning: string }> {
  const pricingUrl = `${supabaseUrl}/functions/v1/ai-pricing`;
  const res = await fetch(pricingUrl, {
    method: "POST",
    headers: {
      Authorization: authHeader,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.error ?? "ai-pricing failed");
  }
  return {
    low: Number(data.low),
    high: Number(data.high),
    reasoning: String(data.reasoning ?? ""),
  };
}

type ProcurementJobLinkRow = {
  id: string;
  category?: string | null;
  job_type?: string | null;
  status?: string | null;
  description_zh?: string | null;
  description_en?: string | null;
  title_zh?: string | null;
  title_en?: string | null;
  ai_estimate_reasoning?: string | null;
  selected_quote_id?: string | null;
};

type InvoiceProcurementContext = {
  invoiceId: string;
  invoiceNumber?: string | null;
  vendorName?: string | null;
  invoiceCategory?: string | null;
};

const HISTORICAL_INFERRED_MARKERS = [
  "historical_inferred",
  "historical-inferred",
  "historical invoice linkage",
  "ai historical-invoice linkage",
  "ai-generated linkage draft",
  "历史发票补建",
  "历史补建",
  "倒查建账",
  "retroactive bookkeeping",
  "reconstruction_source",
  "monthly_audit_historical",
  "inference_type",
  "historical procurement draft",
  "ai补建采购记录草稿",
  "ai procurement draft — historical linkage",
  "formal procurement approval is not implied",
  "不代表该支出已完成正式采购审批",
];

function aiReasoningSuggestsHistoricalInferred(reasoning: string | null | undefined): boolean {
  const t = String(reasoning ?? "").trim();
  if (!t) return false;
  const lower = t.toLowerCase();
  if (lower.includes("historical_inferred") || lower.includes("monthly_audit_historical")) {
    return true;
  }
  if (!t.startsWith("{")) return false;
  try {
    const o = JSON.parse(t) as Record<string, unknown>;
    const inference = String(o.inference_type ?? "").toLowerCase();
    const source = String(o.reconstruction_source ?? "").toLowerCase();
    return inference === "historical_inferred" || source.includes("historical");
  } catch {
    return false;
  }
}

/** Matches InvoiceManagement `humanHistoricalProcFingerprintLines` / disclaimer copy. */
function hasAiHistoricalDraftDescriptionFingerprint(job: ProcurementJobLinkRow): boolean {
  const zh = String(job.description_zh ?? "");
  const en = String(job.description_en ?? "");

  if (
    zh.includes("这是 AI 根据历史发票生成的补建草稿") ||
    en.includes("AI-generated linkage draft from historical invoices")
  ) {
    return true;
  }
  if (zh.includes("AI根据历史发票补建") || en.includes("AI historical-invoice linkage draft")) {
    return true;
  }

  const hasZhProcLines = /发票号\s*[:：]/.test(zh) && /金额\s*[:：]/.test(zh);
  const hasEnProcLines =
    /vendor\s*:/i.test(en) &&
    /amount\s*:/i.test(en) &&
    (/invoice\s*[#:]?\s*/i.test(en) || /invoice\s*:/i.test(en));

  if (hasZhProcLines && hasEnProcLines) return true;
  if (hasZhProcLines && /invoice_id\s*[:：]/i.test(en)) return true;
  if (hasEnProcLines && /invoice_id\s*[:：]/i.test(zh)) return true;

  return false;
}

function hasAutoGeneratedHistoricalTitle(
  job: ProcurementJobLinkRow,
  ctx: InvoiceProcurementContext,
): boolean {
  const titleZh = String(job.title_zh ?? "");
  const titleEn = String(job.title_en ?? "");
  if (titleZh.includes("历史发票补建采购") || titleEn.includes("Historical invoice linkage")) {
    return true;
  }
  const vendor = String(ctx.vendorName ?? "").trim();
  if (!vendor) return false;
  const vendorEsc = vendor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`^${vendorEsc}\\s*[·•]\\s*(一般|general)\\s*$`, "i").test(titleZh.trim())) {
    return true;
  }
  if (new RegExp(`^${vendorEsc}\\s*[·•]\\s*general\\s*$`, "i").test(titleEn.trim())) {
    return true;
  }
  const cat = String(ctx.invoiceCategory ?? "").trim();
  if (cat && titleZh.includes(`${vendor} ·`)) return true;
  return false;
}

function textLinksInvoice(
  job: ProcurementJobLinkRow,
  ctx: InvoiceProcurementContext,
): boolean {
  const blob = [
    job.description_zh,
    job.description_en,
    job.title_zh,
    job.title_en,
    job.ai_estimate_reasoning,
  ]
    .filter((s) => typeof s === "string" && s.trim())
    .join("\n");

  if (blob.includes(ctx.invoiceId)) return true;
  if (/invoice_id\s*[:：]\s*/i.test(blob) && blob.includes(ctx.invoiceId)) return true;

  const num = String(ctx.invoiceNumber ?? "").trim();
  if (num.length >= 3) {
    if (blob.includes(num)) return true;
    if (String(job.description_zh ?? "").includes(`发票号：${num}`)) return true;
    if (String(job.description_en ?? "").toLowerCase().includes(`invoice: ${num.toLowerCase()}`)) {
      return true;
    }
  }
  return false;
}

export type ProcurementJobExclusion = {
  excluded: boolean;
  reason: string;
};

/** AI补建/倒查 — even status=approved must not block historical candidate. */
export function classifyProcurementJobExclusion(
  job: ProcurementJobLinkRow,
  ctx: InvoiceProcurementContext,
): ProcurementJobExclusion {
  const cat = String(job.category ?? "").trim().toLowerCase();
  if (cat === "historical_inferred") {
    return { excluded: true, reason: "category_historical_inferred" };
  }

  const jobType = String(job.job_type ?? "").trim().toLowerCase();
  if (jobType === "historical_inferred" || jobType.includes("historical_inferred")) {
    return { excluded: true, reason: "job_type_historical_inferred" };
  }

  const blob = [
    job.description_zh,
    job.description_en,
    job.title_zh,
    job.title_en,
    job.ai_estimate_reasoning,
  ]
    .filter((s) => typeof s === "string" && s.trim())
    .join("\n")
    .toLowerCase();

  if (HISTORICAL_INFERRED_MARKERS.some((m) => blob.includes(m))) {
    return { excluded: true, reason: "text_marker_historical_inferred" };
  }
  if (aiReasoningSuggestsHistoricalInferred(job.ai_estimate_reasoning)) {
    return { excluded: true, reason: "ai_estimate_reasoning_historical_inferred" };
  }
  if (hasAiHistoricalDraftDescriptionFingerprint(job)) {
    return { excluded: true, reason: "ai_draft_description_fingerprint" };
  }
  if (hasAutoGeneratedHistoricalTitle(job, ctx)) {
    return { excluded: true, reason: "auto_generated_historical_title" };
  }

  const hasSelectedQuote = Boolean(
    job.selected_quote_id && String(job.selected_quote_id).trim(),
  );

  if (/invoice_id\s*[:：]/i.test(blob) && !hasSelectedQuote) {
    return { excluded: true, reason: "invoice_id_in_text_without_selected_quote" };
  }

  if (textLinksInvoice(job, ctx) && !hasSelectedQuote) {
    return { excluded: true, reason: "invoice_linked_in_text_without_selected_quote" };
  }

  if (hasSelectedQuote) {
    return { excluded: false, reason: "formal_job_with_selected_quote" };
  }

  if (textLinksInvoice(job, ctx)) {
    return { excluded: true, reason: "invoice_text_link_no_formal_quote" };
  }

  return { excluded: false, reason: "no_historical_signals" };
}

function logProcurementMatch(payload: Record<string, unknown>): void {
  console.log("HIST_INVOICE_PROCUREMENT_MATCH", payload);
}

function logHistoricalAuditResult(
  invoiceId: string,
  propertyId: string,
  result: HistoricalAuditPayload,
): void {
  console.log("HIST_INVOICE_AUDIT_RESULT", {
    invoiceId,
    propertyId,
    candidate: result.candidate,
    benchmarkStatus: result.benchmarkStatus ?? null,
    serviceType: result.serviceType ?? null,
  });
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_,]/g, "");
}

async function fetchProcurementJobsLinkedToInvoice(
  admin: SupabaseClient,
  propertyId: string,
  ctx: InvoiceProcurementContext,
): Promise<{ jobs: ProcurementJobLinkRow[]; error: string | null }> {
  const id = escapeIlikePattern(ctx.invoiceId);
  const orParts = [
    `description_zh.ilike.%${id}%`,
    `description_en.ilike.%${id}%`,
  ];

  const num = escapeIlikePattern(String(ctx.invoiceNumber ?? "").trim());
  if (num.length >= 3) {
    orParts.push(`description_zh.ilike.%${num}%`, `description_en.ilike.%${num}%`);
  }

  const { data: jobs, error } = await admin
    .from("procurement_jobs")
    .select(
      "id, category, job_type, status, description_zh, description_en, title_zh, title_en, ai_estimate_reasoning, selected_quote_id",
    )
    .eq("property_id", propertyId)
    .or(orParts.join(","));

  if (error) return { jobs: [], error: error.message };

  const byId = new Map<string, ProcurementJobLinkRow>();
  for (const row of jobs ?? []) {
    const j = row as ProcurementJobLinkRow;
    if (j?.id) byId.set(j.id, j);
  }
  return { jobs: [...byId.values()], error: null };
}

/**
 * Formal procurement chain only (invoice.quote_id or procurement_jobs with real quote flow).
 * AI historical_inferred / description-linked补建 jobs never suppress candidate.
 */
export async function invoiceHasProcurementRecord(
  admin: SupabaseClient,
  params: {
    invoiceId: string;
    propertyId: string;
    quoteId: string | null;
    invoiceNumber?: string | null;
    vendorName?: string | null;
    invoiceCategory?: string | null;
  },
): Promise<boolean> {
  const invoiceId = params.invoiceId;
  const quoteIdPresent = Boolean(params.quoteId);
  const ctx: InvoiceProcurementContext = {
    invoiceId,
    invoiceNumber: params.invoiceNumber,
    vendorName: params.vendorName,
    invoiceCategory: params.invoiceCategory,
  };

  if (params.quoteId) {
    logProcurementMatch({
      invoiceId,
      quoteIdPresent: true,
      matchedJobs: 0,
      excludedHistoricalInferred: 0,
      formalProcurementMatch: true,
      jobs: [],
    });
    return true;
  }

  const { jobs: matchedJobs, error } = await fetchProcurementJobsLinkedToInvoice(
    admin,
    params.propertyId,
    ctx,
  );

  if (error) {
    console.error("[historicalInvoiceAudit] procurement_jobs lookup", error);
    logProcurementMatch({
      invoiceId,
      quoteIdPresent: false,
      matchedJobs: 0,
      excludedHistoricalInferred: 0,
      formalProcurementMatch: false,
      error,
      jobs: [],
    });
    return false;
  }

  const jobDiagnostics = matchedJobs.map((j) => {
    const { excluded, reason } = classifyProcurementJobExclusion(j, ctx);
    return {
      id: j.id,
      status: j.status ?? null,
      job_type: j.job_type ?? null,
      category: j.category ?? null,
      title_zh: j.title_zh ?? null,
      title_en: j.title_en ?? null,
      description_zh: j.description_zh ?? null,
      description_en: j.description_en ?? null,
      ai_estimate_reasoning: j.ai_estimate_reasoning ?? null,
      selected_quote_id: j.selected_quote_id ?? null,
      excludedAsHistoricalInferred: excluded,
      excludeReason: reason,
    };
  });

  const excludedHistoricalInferred = jobDiagnostics.filter((j) => j.excludedAsHistoricalInferred)
    .length;
  const formalProcurementMatch = jobDiagnostics.some((j) => !j.excludedAsHistoricalInferred);

  logProcurementMatch({
    invoiceId,
    invoiceNumber: ctx.invoiceNumber ?? null,
    quoteIdPresent,
    matchedJobs: matchedJobs.length,
    excludedHistoricalInferred,
    formalProcurementMatch,
    jobs: jobDiagnostics,
  });

  return formalProcurementMatch;
}

export async function runHistoricalAuditAuto(params: {
  admin: SupabaseClient;
  supabaseUrl: string;
  anonKey: string;
  authHeader: string;
  openaiKey: string;
  invoiceId: string;
  propertyId: string;
}): Promise<HistoricalAuditPayload> {
  const generatedAt = new Date().toISOString();
  const { admin, invoiceId, propertyId } = params;

  const { data: inv, error: invErr } = await admin
    .from("invoices")
    .select(
      "id, property_id, vendor_name, total_amount, category, notes, review_notes, ai_extracted_data, currency, invoice_number, quote_id",
    )
    .eq("id", invoiceId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (invErr || !inv?.id) {
    console.error("[historicalInvoiceAudit] invoice load", invErr?.message);
    return { candidate: false, generatedAt };
  }

  const quoteId = typeof inv.quote_id === "string" ? inv.quote_id : null;
  const hasProcurement = await invoiceHasProcurementRecord(admin, {
    invoiceId,
    propertyId,
    quoteId,
    invoiceNumber: typeof inv.invoice_number === "string" ? inv.invoice_number : null,
    vendorName: typeof inv.vendor_name === "string" ? inv.vendor_name : null,
    invoiceCategory: typeof inv.category === "string" ? inv.category : null,
  });

  if (hasProcurement) {
    const blocked: HistoricalAuditPayload = { candidate: false, generatedAt };
    logHistoricalAuditResult(invoiceId, propertyId, blocked);
    return blocked;
  }

  const amount = Number(inv.total_amount) || 0;
  const vendorName = String(inv.vendor_name ?? "").trim() || "—";
  const currency = String(inv.currency ?? "CAD").trim() || "CAD";

  const { data: ocrRow } = await admin
    .from("invoice_ocr_raw")
    .select("structured_json, raw_text")
    .eq("invoice_id", invoiceId)
    .maybeSingle();

  const { data: propRow } = await admin
    .from("properties")
    .select("name, city, province, address, address_line1")
    .eq("id", propertyId)
    .maybeSingle();

  let unitCount = 0;
  const { count: residentUnits } = await admin
    .from("residents")
    .select("unit_number", { count: "exact", head: true })
    .eq("property_id", propertyId);
  if (typeof residentUnits === "number" && residentUnits > 0) {
    unitCount = residentUnits;
  } else {
    const { data: members } = await admin
      .from("property_members")
      .select("unit_no")
      .eq("property_id", propertyId)
      .eq("status", "active");
    const units = new Set(
      (members ?? [])
        .map((m: { unit_no?: string }) => String(m.unit_no ?? "").trim().toLowerCase())
        .filter((u: string) => u.length > 0),
    );
    unitCount = units.size;
  }

  const city = String(propRow?.city ?? "Vancouver").trim() || "Vancouver";
  const notesText = String(inv.notes ?? "").trim();
  const reviewNotesText = String(inv.review_notes ?? "").trim();
  const descriptionText = descriptionFromAiExtracted(inv.ai_extracted_data);

  const invoiceNumber = typeof inv.invoice_number === "string" ? inv.invoice_number : null;
  const invoiceCategory = typeof inv.category === "string" ? inv.category : null;
  const ocrRaw = String(ocrRow?.raw_text ?? "");

  const contentBlob = buildInvoiceContentBlob({
    vendorName,
    invoiceNumber,
    category: invoiceCategory,
    notes: notesText,
    reviewNotes: reviewNotesText,
    description: descriptionText,
    aiExtracted: inv.ai_extracted_data,
    ocrStructured: ocrRow?.structured_json ?? null,
    ocrRaw,
  });

  const keywordPrefilter = keywordPrefilterServiceType(contentBlob, vendorName);

  const classifyInput = {
    vendor_name: inv.vendor_name,
    invoice_number: invoiceNumber,
    total_amount: amount,
    category: inv.category,
    review_notes: reviewNotesText || null,
    notes: notesText || null,
    description: descriptionText,
    ai_extracted_data: inv.ai_extracted_data,
    ocr_structured: ocrRow?.structured_json ?? null,
    ocr_raw_excerpt: ocrRaw.slice(0, 6000),
    keyword_prefilter_hint: keywordPrefilter.serviceType,
    detected_repair_keywords: keywordPrefilter.repairHits,
    detected_management_keywords: keywordPrefilter.managementHits,
  };

  const invoiceBlob = JSON.stringify({
    ...classifyInput,
    property_units: unitCount,
    city,
  });

  let classify: Record<string, unknown>;
  try {
    classify = await callOpenAIClassify(params.openaiKey, classifyInput);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "classification failed";
    console.error("[historicalInvoiceAudit] classify failed", msg);
    const failed: HistoricalAuditPayload = {
      candidate: true,
      benchmarkStatus: "unsupported",
      reasoning: msg,
      generatedAt,
    };
    logHistoricalAuditResult(invoiceId, propertyId, failed);
    return failed;
  }

  const confidence = typeof classify.confidence === "number" ? classify.confidence : null;
  const classifyRationale = String(classify.rationale ?? classify.reasoning ?? "");
  const detectedLabelZh = String(classify.detectedServiceLabelZh ?? classify.detected_service_label_zh ?? "");

  const {
    finalServiceType,
    rawServiceType,
    skippedPricingReason,
    repairHits,
    managementHits,
  } = finalizeServiceType({
    contentBlob,
    vendorName,
    invoiceNumber,
    classify,
    keywordPrefilter,
  });

  logServiceClassify({
    invoiceId,
    vendorName,
    invoiceNumber,
    rawServiceType,
    normalizedServiceType: normalizeClassifiedServiceType(classify).normalizedServiceType,
    detectedRepairKeywords: repairHits,
    detectedManagementKeywords: managementHits,
    finalServiceType,
    skippedPricingReason,
  });

  if (finalServiceType === "unsupported" || !MVP_TYPES.has(finalServiceType)) {
    const isRepair = skippedPricingReason?.includes("repair") ||
      skippedPricingReason?.includes("mechanical") ||
      repairHits.length > 0 ||
      isRepairDominatedInvoice(contentBlob, vendorName);
    const { reasoning } = isRepair
      ? unsupportedRepairAudit(confidence, classifyRationale, detectedLabelZh)
      : {
        reasoning: (classifyRationale ||
          "Invoice could not be mapped to a supported benchmark category.").slice(0, 2000),
      };
    const unsupported: HistoricalAuditPayload = {
      candidate: true,
      serviceType: "unsupported",
      benchmarkStatus: "unsupported",
      confidence,
      reasoning: reasoning,
      generatedAt,
    };
    logHistoricalAuditResult(invoiceId, propertyId, unsupported);
    return unsupported;
  }

  const pricingIn = pricingPayloadForType(
    finalServiceType,
    unitCount,
    city,
    vendorName,
    invoiceBlob,
  );

  let estimate: { low: number; high: number; reasoning: string };
  try {
    estimate = await callAiPricing(params.supabaseUrl, params.authHeader, params.anonKey, {
      property_id: propertyId,
      title: pricingIn.title,
      description: pricingIn.description,
      job_type: pricingIn.job_type,
      category: pricingIn.category,
      estimated_budget: amount,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ai-pricing failed";
    console.error("[historicalInvoiceAudit] ai-pricing failed", msg);
    const pricingFailed: HistoricalAuditPayload = {
      candidate: true,
      serviceType: finalServiceType,
      benchmarkStatus: "unsupported",
      confidence,
      reasoning: msg,
      generatedAt,
    };
    logHistoricalAuditResult(invoiceId, propertyId, pricingFailed);
    return pricingFailed;
  }

  const low = estimate.low;
  const high = estimate.high;
  const variancePct = varianceFromRange(amount, low, high);
  const benchmarkStatus = deriveBenchmarkStatus(amount, high, true);
  const reasoning = estimate.reasoning || classifyRationale;

  const success: HistoricalAuditPayload = {
    candidate: true,
    serviceType: finalServiceType,
    benchmarkLow: low,
    benchmarkHigh: high,
    benchmarkStatus,
    variancePct,
    confidence,
    reasoning: reasoning.slice(0, 2000),
    generatedAt,
  };
  logHistoricalAuditResult(invoiceId, propertyId, success);
  return success;
}
