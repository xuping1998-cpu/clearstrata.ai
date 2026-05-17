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

/** Aligns with UI historical procurement draft linkage (quote_id or procurement_jobs description). */
export async function invoiceHasProcurementRecord(
  admin: SupabaseClient,
  params: { invoiceId: string; propertyId: string; quoteId: string | null },
): Promise<boolean> {
  if (params.quoteId) return true;

  const id = params.invoiceId;
  const { count, error } = await admin
    .from("procurement_jobs")
    .select("id", { count: "exact", head: true })
    .eq("property_id", params.propertyId)
    .or(`description_zh.ilike.%${id}%,description_en.ilike.%${id}%`);

  if (error) {
    console.error("[historicalInvoiceAudit] procurement_jobs lookup", error.message);
    return false;
  }
  return (count ?? 0) > 0;
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
  });

  if (hasProcurement) {
    return { candidate: false, generatedAt };
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
    return {
      candidate: true,
      serviceType: null,
      benchmarkStatus: "unsupported",
      confidence,
      reasoning: classifyRationale || "Invoice could not be mapped to a supported benchmark category.",
      generatedAt,
    };
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
    return {
      candidate: true,
      serviceType: normalizedServiceType,
      benchmarkStatus: "unsupported",
      confidence,
      reasoning: msg,
      generatedAt,
    };
  }

  const low = estimate.low;
  const high = estimate.high;
  const variancePct = varianceFromRange(amount, low, high);
  const benchmarkStatus = deriveBenchmarkStatus(amount, high, true);
  const reasoning = estimate.reasoning || classifyRationale;

  return {
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
}
