import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MVP_TYPES = new Set([
  "strata_management",
  "telecom",
  "security_monitoring",
]);

/** Map OpenAI free-text / alias enums onto MVP slugs (exact Set keys only). */
const SERVICE_TYPE_ALIASES: Record<string, string> = {
  property_management: "strata_management",
  property_management_fee: "strata_management",
  strata_management_fee: "strata_management",
  council_management: "strata_management",
  management: "strata_management",
  management_fee: "strata_management",
  strata: "strata_management",
  telecommunications: "telecom",
  internet: "telecom",
  telecom_internet: "telecom",
  security: "security_monitoring",
  alarm_monitoring: "security_monitoring",
  cctv_monitoring: "security_monitoring",
};

function normalizeClassifiedServiceType(classify: Record<string, unknown>): {
  raw: string;
  normalized: string;
  mvpSupported: boolean;
} {
  const rawValue =
    classify.serviceType ??
    classify.service_type ??
    classify.type ??
    "unsupported";
  const raw = String(rawValue).trim();
  const slug = raw.toLowerCase().replace(/[\s-]+/g, "_");

  if (MVP_TYPES.has(slug)) {
    return { raw, normalized: slug, mvpSupported: true };
  }
  const alias = SERVICE_TYPE_ALIASES[slug];
  if (alias && MVP_TYPES.has(alias)) {
    return { raw, normalized: alias, mvpSupported: true };
  }
  if (/property|strata|management|council/.test(slug) && /management|admin|strata|council/.test(slug)) {
    return { raw, normalized: "strata_management", mvpSupported: true };
  }
  if (/telecom|internet|phone|cable|network/.test(slug)) {
    return { raw, normalized: "telecom", mvpSupported: true };
  }
  if (/security|alarm|cctv|monitoring/.test(slug) && !/strata|property|management/.test(slug)) {
    return { raw, normalized: "security_monitoring", mvpSupported: true };
  }
  return { raw, normalized: "unsupported", mvpSupported: false };
}

const SERVICE_LABELS: Record<string, { zh: string; en: string }> = {
  strata_management: { zh: "物业管理费", en: "Strata management fee" },
  cleaning: { zh: "清洁服务", en: "Cleaning" },
  landscaping: { zh: "园艺景观", en: "Landscaping" },
  snow_removal: { zh: "除雪服务", en: "Snow removal" },
  elevator_maintenance: { zh: "电梯维保", en: "Elevator maintenance" },
  fire_inspection: { zh: "消防检查", en: "Fire inspection" },
  telecom: { zh: "电信 / 网络", en: "Telecom / internet" },
  waste_disposal: { zh: "垃圾处理", en: "Waste disposal" },
  security_monitoring: { zh: "安防监控", en: "Security monitoring" },
  plumbing_repair: { zh: "管道维修", en: "Plumbing repair" },
  hvac_repair: { zh: "暖通维修", en: "HVAC repair" },
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

function periodLabels(period: string): { zh: string; en: string } {
  switch (period) {
    case "monthly":
      return { zh: "每月", en: "per month" };
    case "annual":
      return { zh: "每年", en: "per year" };
    case "one_time":
      return { zh: "一次性", en: "one-time" };
    default:
      return { zh: "本账单周期", en: "this billing period" };
  }
}

function compareAmount(
  amount: number,
  low: number,
  high: number,
): { result: string; variancePercent: number } {
  const mid = (low + high) / 2;
  let result: string;
  if (amount < low) result = "below_range";
  else if (amount > high) result = "above_range";
  else result = "within_range";
  const variancePercent = mid > 0 ? Math.round(((amount - mid) / mid) * 1000) / 10 : 0;
  return { result, variancePercent };
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

function descriptionFromAiExtracted(ai: unknown): string | null {
  if (!ai || typeof ai !== "object") return null;
  const o = ai as Record<string, unknown>;
  for (const key of ["description", "description_zh", "description_en", "service_description"]) {
    const v = o[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
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
    console.error("[historical-benchmark-review] openai error", res.status, t);
    throw new Error("openai error");
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content ?? "";
  const parsed = parseJsonBlock(raw);
  if (!parsed) {
    console.error("[historical-benchmark-review] classification parse failed", raw.slice(0, 500));
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
  console.log("AI_PRICING_CALL_AUTH", {
    hasAuth: Boolean(authHeader),
    hasAnonKey: Boolean(anonKey),
    url: pricingUrl,
  });
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ error: "SERVER_CONFIG" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!openaiKey.trim()) {
    return new Response(JSON.stringify({ success: false, error: "OPENAI_API_KEY missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.trim()) {
    return new Response(JSON.stringify({ error: "missing user authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { invoice_id?: string; property_id?: string; force_refresh?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "INVALID_JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const invoiceId = typeof body.invoice_id === "string" ? body.invoice_id.trim() : "";
  const propertyId = typeof body.property_id === "string" ? body.property_id.trim() : "";
  const forceRefresh = body.force_refresh === true;
  if (!invoiceId || !propertyId) {
    return new Response(JSON.stringify({ error: "invoice_id and property_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: inv, error: invErr } = await userClient
    .from("invoices")
    .select(
      "id, property_id, vendor_name, total_amount, category, notes, review_notes, ai_extracted_data, currency, invoice_number",
    )
    .eq("id", invoiceId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (invErr) {
    console.error("[historical-benchmark-review] invoice select", invErr.message);
    return new Response(JSON.stringify({ error: "FORBIDDEN_OR_NOT_FOUND" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!inv?.id || inv.property_id !== propertyId) {
    return new Response(JSON.stringify({ error: "FORBIDDEN_OR_NOT_FOUND" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: existingCtx } = await userClient
    .from("invoice_ai_audit_contexts")
    .select("context_json")
    .eq("invoice_id", invoiceId)
    .eq("property_id", propertyId)
    .maybeSingle();

  const prevCtx = (existingCtx?.context_json ?? {}) as Record<string, unknown>;
  const prevReview = prevCtx.benchmarkReview as Record<string, unknown> | undefined;
  if (!forceRefresh && prevReview?.generatedAt) {
    return new Response(
      JSON.stringify({ success: true, benchmarkReview: prevReview }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

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
  const vendorName = String(inv.vendor_name ?? "").trim() || "—";
  const amount = Number(inv.total_amount) || 0;
  const currency = String(inv.currency ?? "CAD").trim() || "CAD";

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
    classify = await callOpenAIClassify(openaiKey, classifyInput);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "classification failed";
    const status = msg === "openai error" ? 502 : 500;
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const { raw: classifiedServiceTypeRaw, normalized: serviceType, mvpSupported } =
    normalizeClassifiedServiceType(classify);
  const confidence = typeof classify.confidence === "number" ? classify.confidence : 0;
  const rationale = String(classify.rationale ?? classify.reasoning ?? "");
  const billingPeriod = String(classify.billingPeriod ?? classify.billing_period ?? "unknown");
  const period = periodLabels(billingPeriod);
  const labels = SERVICE_LABELS[serviceType] ?? { zh: "未分类", en: "Unclassified" };
  const generatedAt = new Date().toISOString();

  const pricingInPreview = mvpSupported
    ? pricingPayloadForType(serviceType, unitCount, city, vendorName, invoiceBlob)
    : null;

  console.log({
    classifiedServiceType: classifiedServiceTypeRaw,
    normalizedServiceType: serviceType,
    mvpSupported,
    supported: mvpSupported,
    aiPricingPayload: pricingInPreview
      ? {
          title: pricingInPreview.title,
          category: pricingInPreview.category,
          job_type: pricingInPreview.job_type,
        }
      : null,
  });

  const baseReview = {
    serviceType: serviceType === "unsupported" ? null : serviceType,
    serviceTypeLabelZh: labels.zh,
    serviceTypeLabelEn: labels.en,
    confidence,
    rationale,
    benchmarkLow: null as number | null,
    benchmarkHigh: null as number | null,
    currency,
    benchmarkBasis: "",
    benchmarkConfidence: confidence >= 0.75 ? "high" : confidence >= 0.5 ? "medium" : "low",
    notes: "",
    invoiceAmount: amount,
    result: "unsupported" as string,
    variancePercent: null as number | null,
    supported: false,
    generatedAt,
    periodLabelZh: period.zh,
    periodLabelEn: period.en,
  };

  if (!mvpSupported || serviceType === "unsupported") {
    baseReview.notes =
      classifiedServiceTypeRaw && classifiedServiceTypeRaw !== "unsupported"
        ? `Classified as "${classifiedServiceTypeRaw}"; MVP supports strata_management, telecom, security_monitoring only.`
        : "Invoice could not be mapped to a supported benchmark category.";
    const merged = { ...prevCtx, benchmarkReview: baseReview };
    await admin.from("invoice_ai_audit_contexts").upsert(
      {
        invoice_id: invoiceId,
        property_id: propertyId,
        context_json: merged,
      },
      { onConflict: "invoice_id" },
    );
    return new Response(
      JSON.stringify({ success: true, benchmarkReview: baseReview }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const pricingIn = pricingInPreview ?? pricingPayloadForType(serviceType, unitCount, city, vendorName, invoiceBlob);
  let estimate: { low: number; high: number; reasoning: string };
  try {
    const aiPricingBody = {
      property_id: propertyId,
      title: pricingIn.title,
      description: pricingIn.description,
      job_type: pricingIn.job_type,
      category: pricingIn.category,
      estimated_budget: amount,
    };
    console.log({
      classifiedServiceType: classifiedServiceTypeRaw,
      supported: true,
      aiPricingPayload: {
        title: aiPricingBody.title,
        category: aiPricingBody.category,
        job_type: aiPricingBody.job_type,
      },
    });
    estimate = await callAiPricing(supabaseUrl, authHeader, anonKey, aiPricingBody);
  } catch (e) {
    baseReview.notes = e instanceof Error ? e.message : "ai-pricing failed";
    const merged = { ...prevCtx, benchmarkReview: baseReview };
    await admin.from("invoice_ai_audit_contexts").upsert(
      { invoice_id: invoiceId, property_id: propertyId, context_json: merged },
      { onConflict: "invoice_id" },
    );
    return new Response(
      JSON.stringify({ success: true, benchmarkReview: baseReview }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const low = estimate.low;
  const high = estimate.high;
  const { result, variancePercent } = compareAmount(amount, low, high);
  const unitSuffix = unitCount > 0 ? `${unitCount}-unit ` : "";
  const review = {
    ...baseReview,
    serviceType,
    supported: true,
    benchmarkLow: low,
    benchmarkHigh: high,
    benchmarkBasis:
      `AI market benchmark (${unitSuffix}${city}, BC) via procurement pricing engine. ` +
      `${estimate.reasoning}`.slice(0, 1200),
    notes: estimate.reasoning,
    result,
    variancePercent,
  };

  const merged = { ...prevCtx, benchmarkReview: review };
  await admin.from("invoice_ai_audit_contexts").upsert(
    { invoice_id: invoiceId, property_id: propertyId, context_json: merged },
    { onConflict: "invoice_id" },
  );

  return new Response(
    JSON.stringify({ success: true, benchmarkReview: review }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
