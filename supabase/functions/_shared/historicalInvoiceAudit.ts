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

const SERVICE_TYPE_ALIASES: Record<string, string> = {
  property_management: "strata_management",
  property_management_fee: "strata_management",
  strata_management_fee: "strata_management",
  council_management: "strata_management",
  management: "strata_management",
  management_fee: "strata_management",
  strata: "strata_management",
  administrative: "strata_management",
  administrative_charges: "strata_management",
  telecommunications: "telecom",
  internet: "telecom",
  telecom_internet: "telecom",
  security: "security_monitoring",
  alarm_monitoring: "security_monitoring",
  cctv_monitoring: "security_monitoring",
};

const OPENAI_MODEL = "gpt-4o-mini";

const CLASSIFY_SYSTEM = `You classify Canadian strata (condo) AP invoices for retrospective market benchmark review.
Classify by the actual SERVICE CONTENT on the invoice — never by vendor name alone.
Example: "Dwell" may be strata management, repair, consulting, or copying; read line items, descriptions, and OCR text.

Return JSON only (no markdown):
{
  "serviceType": "strata_management" | "telecom" | "security_monitoring" | "unsupported",
  "confidence": <0-1 number>,
  "rationale": "<brief bilingual-friendly reason>",
  "billingPeriod": "monthly" | "one_time" | "annual" | "unknown"
}

Use strata_management for recurring strata/council management or accounting administration fees.
Use telecom for internet, phone, cable, or building connectivity services.
Use security_monitoring for alarm, CCTV, or security monitoring contracts.
Use unsupported for all other services (cleaning, repairs, landscaping, one-off trades, etc.).`;

function slugifyServiceToken(raw: string): string {
  return raw.toLowerCase().trim().replace(/[\s-]+/g, "_");
}

function rationaleSuggestsStrataManagement(classify: Record<string, unknown>): boolean {
  const rationale = String(classify.rationale ?? classify.reasoning ?? "").toLowerCase();
  return (
    rationale.includes("property management") ||
    rationale.includes("strata management") ||
    rationale.includes("management fee") ||
    rationale.includes("administrative charges related to property management")
  );
}

function normalizeFieldToken(raw: string): string {
  const slug = slugifyServiceToken(raw);
  if (!slug || slug === "unsupported" || slug === "unknown" || slug === "other") {
    return "unsupported";
  }
  if (MVP_TYPES.has(slug)) return slug;
  const alias = SERVICE_TYPE_ALIASES[slug];
  if (alias && MVP_TYPES.has(alias)) return alias;
  if (/property|strata|management|council/.test(slug) && /management|admin|strata|council/.test(slug)) {
    return "strata_management";
  }
  if (/telecom|internet|phone|cable|network/.test(slug)) {
    return "telecom";
  }
  if (/security|alarm|cctv|monitoring/.test(slug) && !/strata|property|management/.test(slug)) {
    return "security_monitoring";
  }
  return "unsupported";
}

function normalizeClassifiedServiceType(classify: Record<string, unknown>): {
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

  let normalizedServiceType = "unsupported";

  for (const value of fieldValues) {
    if (value == null || !String(value).trim()) continue;
    const candidateNormalized = normalizeFieldToken(String(value).trim());
    if (candidateNormalized !== "unsupported") {
      normalizedServiceType = candidateNormalized;
      break;
    }
  }

  if (normalizedServiceType === "unsupported" && rationaleSuggestsStrataManagement(classify)) {
    normalizedServiceType = "strata_management";
  }

  return {
    normalizedServiceType,
    mvpSupported: MVP_TYPES.has(normalizedServiceType),
  };
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

  const classifyInput = {
    vendor_name: inv.vendor_name,
    category: inv.category,
    review_notes: reviewNotesText || null,
    notes: notesText || null,
    description: descriptionText,
    ai_extracted_data: inv.ai_extracted_data,
    invoice_number: inv.invoice_number,
    ocr_structured: ocrRow?.structured_json ?? null,
    ocr_raw_excerpt: String(ocrRow?.raw_text ?? "").slice(0, 6000),
  };

  const invoiceBlob = JSON.stringify({
    ...classifyInput,
    total_amount: amount,
    property_units: unitCount,
    city,
  });

  let classify: Record<string, unknown>;
  try {
    classify = await callOpenAIClassify(params.openaiKey, classifyInput);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "classification failed";
    console.error("[historicalInvoiceAudit] classify failed", msg);
    return {
      candidate: true,
      benchmarkStatus: "unsupported",
      reasoning: msg,
      generatedAt,
    };
  }

  const { normalizedServiceType, mvpSupported } = normalizeClassifiedServiceType(classify);
  const confidence = typeof classify.confidence === "number" ? classify.confidence : null;
  const classifyRationale = String(classify.rationale ?? classify.reasoning ?? "");

  if (!mvpSupported || normalizedServiceType === "unsupported") {
    const unsupported: HistoricalAuditPayload = {
      candidate: true,
      serviceType: null,
      benchmarkStatus: "unsupported",
      confidence,
      reasoning: classifyRationale || "Invoice could not be mapped to a supported benchmark category.",
      generatedAt,
    };
    logHistoricalAuditResult(invoiceId, propertyId, unsupported);
    return unsupported;
  }

  const pricingIn = pricingPayloadForType(
    normalizedServiceType,
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
      serviceType: normalizedServiceType,
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
    serviceType: normalizedServiceType,
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
