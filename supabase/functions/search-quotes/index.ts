import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = "gpt-4o-mini";
const SEARCH_QUOTES_PROVIDER = "openai_web_search";
const NO_PRICE_NOTE = "Pricing requires formal quote";

interface SearchRequest {
  title: string;
  description: string;
  category: string;
  attachment_urls?: string[];
  parsed_quote?: Record<string, unknown> | null;
  quote_context?: string | null;
}

interface QuoteIntel {
  vendor_name: string;
  current_amount: number | null;
  service_scope: string;
  billing_period: string;
  unit_count: string;
  location: string;
}

interface VendorResult {
  company_name: string;
  phone: string;
  website: string;
  address: string;
  description_en: string;
  description_zh: string;
  price_reference: string;
  price_low: number | null;
  price_high: number | null;
  price_currency: string;
  price_unit: string;
  price_source_url: string;
  price_confidence: string;
  price_evidence_note: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  landscaping: "landscaping, gardening, lawn care, bark mulch, tree service",
  cleaning: "cleaning, pressure washing, window cleaning, janitorial",
  plumbing: "plumbing, pipe repair, drain cleaning, water heater",
  electrical: "electrical, wiring, lighting, panel upgrade, electrician",
  hvac: "HVAC, heating, cooling, air conditioning, furnace",
  roofing: "roofing, roof repair, gutter, shingle",
  painting: "painting, interior painting, exterior painting, staining",
  elevator: "elevator maintenance, elevator repair, lift service",
  fire_safety: "fire safety, fire alarm, sprinkler, fire extinguisher",
  security: "security, access control, CCTV, surveillance, intercom",
  waterproofing: "waterproofing, membrane, sealant, foundation waterproofing",
  general_maintenance: "general maintenance, handyman, building maintenance",
};

const WEB_SEARCH_TOOL = {
  type: "web_search_preview",
  user_location: {
    type: "approximate",
    city: "Vancouver",
    region: "British Columbia",
    country: "CA",
    timezone: "America/Vancouver",
  },
};

function strField(v: unknown): string {
  if (v == null) return "";
  return String(v).trim();
}

function numOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function inferBillingPeriod(text: string): string {
  const t = text.toLowerCase();
  if (/\b(per month|monthly|\/month|each month)\b/.test(t)) return "monthly";
  if (/\b(per visit|per service call)\b/.test(t)) return "per visit";
  if (/\b(per unit|per elevator|single unit)\b/.test(t)) return "per unit";
  if (/\b(annual|per year|yearly)\b/.test(t)) return "annual";
  return "";
}

function inferLocation(text: string): string {
  const t = text.toLowerCase();
  if (/\brichmond\b/.test(t)) return "Richmond, BC";
  if (/\bburnaby\b/.test(t)) return "Burnaby, BC";
  if (/\bvancouver\b/.test(t)) return "Vancouver, BC";
  if (/\bubc\b|university endowment/.test(t)) return "UBC / Vancouver, BC";
  return "Greater Vancouver, BC";
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function guessMimeType(url: string, contentType: string | null): string {
  const ct = (contentType ?? "").split(";")[0].trim().toLowerCase();
  if (ct && ct !== "application/octet-stream") return ct;
  const lower = url.toLowerCase();
  if (lower.includes(".pdf")) return "application/pdf";
  if (lower.match(/\.(png|webp)$/)) return "image/png";
  if (lower.match(/\.(jpe?g)$/)) return "image/jpeg";
  return "application/pdf";
}

async function fetchAttachmentBase64(
  url: string,
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn("SEARCH_QUOTES_ATTACHMENT_FETCH_FAIL", { url, status: res.status });
      return null;
    }
    const buf = await res.arrayBuffer();
    const mimeType = guessMimeType(url, res.headers.get("content-type"));
    return { base64: bytesToBase64(new Uint8Array(buf)), mimeType };
  } catch (e) {
    console.warn("SEARCH_QUOTES_ATTACHMENT_FETCH_ERROR", {
      url,
      error: e instanceof Error ? e.message : String(e),
    });
    return null;
  }
}

async function invokeInvoiceOcrFromBase64(
  supabaseUrl: string,
  serviceKey: string,
  fileBase64: string,
  mimeType: string,
): Promise<Record<string, unknown> | null> {
  const ocrUrl = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/invoice-ocr`;
  try {
    const res = await fetch(ocrUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileBase64, mimeType }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.warn("SEARCH_QUOTES_INVOICE_OCR_FAIL", data);
      return null;
    }
    const extracted = (data as Record<string, unknown>).extracted;
    return extracted && typeof extracted === "object"
      ? (extracted as Record<string, unknown>)
      : null;
  } catch (e) {
    console.warn("SEARCH_QUOTES_INVOICE_OCR_ERROR", e);
    return null;
  }
}

function intelFromParsedQuote(pq: Record<string, unknown>): QuoteIntel {
  const raw = strField(pq.raw_text);
  const scope = strField(pq.service_scope) || raw.slice(0, 800);
  const combined = `${scope}\n${raw}`;
  return {
    vendor_name: strField(pq.vendor_name),
    current_amount: numOrNull(pq.total_amount),
    service_scope: scope,
    billing_period: strField(pq.billing_period) || inferBillingPeriod(combined),
    unit_count: strField(pq.unit_count),
    location: strField(pq.location) || inferLocation(combined),
  };
}

function intelFromOcrExtracted(ex: Record<string, unknown>): QuoteIntel {
  const raw = strField(ex.raw_text);
  const summary = strField(ex.description) || strField(ex.summary);
  const combined = `${summary}\n${raw}`;
  return {
    vendor_name: strField(ex.vendor ?? ex.vendor_name),
    current_amount: numOrNull(ex.total_amount),
    service_scope: summary || raw.slice(0, 800),
    billing_period: inferBillingPeriod(combined),
    unit_count: "",
    location: inferLocation(combined),
  };
}

function mergeIntel(base: QuoteIntel, patch: Partial<QuoteIntel>): QuoteIntel {
  return {
    vendor_name: patch.vendor_name || base.vendor_name,
    current_amount: patch.current_amount ?? base.current_amount,
    service_scope: patch.service_scope || base.service_scope,
    billing_period: patch.billing_period || base.billing_period,
    unit_count: patch.unit_count || base.unit_count,
    location: patch.location || base.location,
  };
}

async function resolveQuoteIntel(params: {
  parsed_quote?: Record<string, unknown> | null;
  quote_context?: string | null;
  attachment_urls?: string[];
  supabaseUrl: string;
  serviceKey: string;
}): Promise<QuoteIntel> {
  let intel: QuoteIntel = {
    vendor_name: "",
    current_amount: null,
    service_scope: "",
    billing_period: "",
    unit_count: "",
    location: "Greater Vancouver, BC",
  };

  if (params.parsed_quote && typeof params.parsed_quote === "object") {
    intel = mergeIntel(intel, intelFromParsedQuote(params.parsed_quote));
  }

  const urls = Array.isArray(params.attachment_urls)
    ? params.attachment_urls.filter((u) => typeof u === "string" && u.trim())
    : [];

  if (urls.length > 0 && (!intel.service_scope || !intel.vendor_name)) {
    const fetched = await fetchAttachmentBase64(urls[0]!);
    if (fetched) {
      const extracted = await invokeInvoiceOcrFromBase64(
        params.supabaseUrl,
        params.serviceKey,
        fetched.base64,
        fetched.mimeType,
      );
      if (extracted) {
        intel = mergeIntel(intel, intelFromOcrExtracted(extracted));
      }
    }
  }

  const ctx = strField(params.quote_context);
  if (ctx) {
    intel = mergeIntel(intel, {
      service_scope: intel.service_scope || ctx.slice(0, 800),
      billing_period: intel.billing_period || inferBillingPeriod(ctx),
      location: intel.location || inferLocation(ctx),
    });
  }

  return intel;
}

function buildServiceType(category: string, title: string, intel: QuoteIntel): string {
  const base = CATEGORY_LABELS[category] || category || title;
  if (intel.service_scope) return `${base}. Attachment scope: ${intel.service_scope.slice(0, 400)}`;
  return base;
}

function buildInstructions(serviceType: string): string {
  return [
    `You are a procurement research assistant for Canadian strata properties in Greater Vancouver (Vancouver, Richmond, Burnaby, BC).`,
    `Use web search to find exactly 3 real, contactable local vendors comparable to the uploaded quote / job requirements for: ${serviceType}.`,
    `Prefer businesses with a verifiable phone or website in BC.`,
    `For each vendor, attempt to find PUBLIC price evidence (published rates, pricing page, government/industry reference, vendor brochure).`,
    `Do NOT invent or guess prices. Do NOT use generic industry ranges without a specific source URL.`,
    `Return ONLY valid JSON (no markdown, no code fences, no commentary) with this exact shape:`,
    `{"vendors":[{"company_name":"","phone":"","website":"","address":"","description_en":"","description_zh":"","price_low":null,"price_high":null,"price_currency":"CAD","price_unit":"","price_source_url":"","price_confidence":"","price_evidence_note":""}]}`,
    `Rules for price fields:`,
    `- price_low / price_high: numbers only when a specific public source supports them; otherwise null.`,
    `- price_source_url: required when price_low or price_high is set; must be the public page URL.`,
    `- price_confidence: "high", "medium", or "low" when prices are set; otherwise "".`,
    `- price_unit: e.g. "per month", "per visit", "per unit", "project total".`,
    `- If no verifiable public price: price_low=null, price_high=null, price_evidence_note="${NO_PRICE_NOTE}".`,
    `- Always return exactly 3 vendors with contact details even when pricing is unknown.`,
    `description_zh should be Simplified Chinese summarizing the vendor and service fit.`,
    `Set legacy price_reference to empty string "" always.`,
  ].join("\n");
}

function buildUserInput(
  title: string,
  description: string,
  serviceType: string,
  intel: QuoteIntel,
  quoteContext: string,
): string {
  const lines = [
    `Search for 3 comparable Vancouver / Richmond / Burnaby / BC vendors for this strata procurement job.`,
    `Service category / type: ${serviceType}`,
    `Title: ${title}`,
    `Description: ${description}`,
    ``,
    `## Uploaded quote / attachment intelligence (use for comparable vendor search)`,
    `vendor_name: ${intel.vendor_name || "(unknown)"}`,
    `current_amount: ${intel.current_amount != null ? intel.current_amount : "(unknown)"}`,
    `service_scope: ${intel.service_scope || description}`,
    `billing_period: ${intel.billing_period || "(unknown)"}`,
    `unit_count: ${intel.unit_count || "(unknown)"}`,
    `location: ${intel.location}`,
  ];
  if (quoteContext) {
    lines.push(``, `## quote_context`, quoteContext.slice(0, 4000));
  }
  lines.push(
    ``,
    `Find vendors offering similar scope in the same region. For each result, cite public price evidence when available.`,
  );
  return lines.join("\n");
}

function stripMarkdownFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function normalizeVendor(raw: unknown): VendorResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const company_name = String(o.company_name ?? "").trim();
  if (!company_name) return null;

  const sourceUrl = strField(o.price_source_url);
  let priceLow = numOrNull(o.price_low);
  let priceHigh = numOrNull(o.price_high);
  let evidenceNote = strField(o.price_evidence_note);
  const confidence = strField(o.price_confidence);

  if ((priceLow != null || priceHigh != null) && !sourceUrl) {
    priceLow = null;
    priceHigh = null;
    evidenceNote = NO_PRICE_NOTE;
  }
  if (priceLow == null && priceHigh == null && !evidenceNote) {
    evidenceNote = NO_PRICE_NOTE;
  }

  return {
    company_name,
    phone: strField(o.phone),
    website: strField(o.website),
    address: strField(o.address),
    description_en: strField(o.description_en),
    description_zh: strField(o.description_zh),
    price_reference: "",
    price_low: priceLow,
    price_high: priceHigh,
    price_currency: strField(o.price_currency) || "CAD",
    price_unit: strField(o.price_unit),
    price_source_url: sourceUrl,
    price_confidence: confidence,
    price_evidence_note: evidenceNote,
  };
}

function normalizeVendors(list: unknown[]): VendorResult[] {
  const out: VendorResult[] = [];
  for (const item of list) {
    const v = normalizeVendor(item);
    if (v) out.push(v);
  }
  return out;
}

function parseVendorsFromText(responseText: string): VendorResult[] {
  const unfenced = stripMarkdownFences(responseText);
  if (!unfenced) return [];

  const tryParse = (raw: string): VendorResult[] | null => {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (Array.isArray(parsed)) return normalizeVendors(parsed);
      if (parsed && typeof parsed === "object") {
        const vendors = (parsed as Record<string, unknown>).vendors;
        if (Array.isArray(vendors)) return normalizeVendors(vendors);
      }
    } catch {
      return null;
    }
    return null;
  };

  const direct = tryParse(unfenced);
  if (direct && direct.length > 0) return direct;

  const objectMatch = unfenced.match(/\{[\s\S]*"vendors"\s*:\s*\[[\s\S]*?\]\s*[\s\S]*?\}/);
  if (objectMatch) {
    const fromObj = tryParse(objectMatch[0]);
    if (fromObj && fromObj.length > 0) return fromObj;
  }

  const arrayMatch = unfenced.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    const fromArr = tryParse(arrayMatch[0]);
    if (fromArr && fromArr.length > 0) return fromArr;
  }

  console.error("SEARCH_QUOTES_PARSE_ERROR", {
    preview: unfenced.slice(0, 1200),
  });
  return [];
}

function extractResponsesOutputText(data: Record<string, unknown>): string {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const chunks: string[] = [];
  const output = data.output;
  if (!Array.isArray(output)) return "";

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (row.type !== "message" || !Array.isArray(row.content)) continue;
    for (const part of row.content) {
      if (!part || typeof part !== "object") continue;
      const block = part as Record<string, unknown>;
      if (block.type === "output_text" && typeof block.text === "string") {
        chunks.push(block.text);
      } else if (typeof block.text === "string") {
        chunks.push(block.text);
      }
    }
  }

  return chunks.join("\n").trim();
}

async function callOpenAIWebSearch(params: {
  apiKey: string;
  instructions: string;
  input: string;
  useJsonFormat: boolean;
}): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; status: number; detail: string }> {
  const body: Record<string, unknown> = {
    model: OPENAI_MODEL,
    instructions: params.instructions,
    input: params.input,
    tools: [WEB_SEARCH_TOOL],
    temperature: 0.2,
    max_output_tokens: 4096,
  };

  if (params.useJsonFormat) {
    body.text = { format: { type: "json_object" } };
  }

  const res = await fetch(OPENAI_RESPONSES_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  let data: Record<string, unknown> = {};
  try {
    data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    const errObj = data.error as Record<string, unknown> | undefined;
    const detail =
      (typeof errObj?.message === "string" && errObj.message) ||
      raw.slice(0, 500) ||
      `API returned ${res.status}`;
    return { ok: false, status: res.status, detail };
  }

  return { ok: true, data };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "OPENAI_API_KEY not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const body = await req.json() as SearchRequest;
    const {
      title,
      description,
      category,
      attachment_urls,
      parsed_quote,
      quote_context,
    } = body;

    const quoteIntel = await resolveQuoteIntel({
      parsed_quote,
      quote_context,
      attachment_urls,
      supabaseUrl,
      serviceKey,
    });

    const quoteContextText = strField(quote_context);
    const serviceType = buildServiceType(category ?? "", title ?? "", quoteIntel);
    const instructions = buildInstructions(serviceType);
    const input = buildUserInput(
      title ?? "",
      description ?? "",
      serviceType,
      quoteIntel,
      quoteContextText,
    );

    console.log("SEARCH_QUOTES_PROVIDER", SEARCH_QUOTES_PROVIDER);
    console.log("SEARCH_QUOTES_QUERY", {
      title,
      category,
      serviceType,
      hasAttachments: Array.isArray(attachment_urls) && attachment_urls.length > 0,
      hasParsedQuote: !!parsed_quote,
      quoteIntel,
      descriptionPreview: String(description ?? "").slice(0, 240),
    });

    let apiResult = await callOpenAIWebSearch({
      apiKey: openaiApiKey,
      instructions,
      input,
      useJsonFormat: true,
    });

    if (!apiResult.ok && apiResult.status === 400) {
      console.warn("SEARCH_QUOTES_JSON_FORMAT_RETRY", apiResult.detail);
      apiResult = await callOpenAIWebSearch({
        apiKey: openaiApiKey,
        instructions,
        input,
        useJsonFormat: false,
      });
    }

    if (!apiResult.ok) {
      console.error("OpenAI Responses API error:", apiResult.detail);
      return new Response(
        JSON.stringify({
          success: false,
          error: apiResult.detail,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const responseText = extractResponsesOutputText(apiResult.data);
    const vendors = parseVendorsFromText(responseText);

    console.log("SEARCH_QUOTES_RESULT_COUNT", vendors.length);

    return new Response(
      JSON.stringify({
        success: true,
        vendors,
        count: vendors.length,
        quote_intel: quoteIntel,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({
        success: false,
        error: message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
