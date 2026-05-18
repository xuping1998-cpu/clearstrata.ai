import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = "gpt-4o";
const SEARCH_QUOTES_PROVIDER = "openai_web_search_direct";
const NO_PRICE_NOTE = "Pricing requires formal quote";

const ANALYST_PROMPT = `You are a procurement market analyst for strata property management in Greater Vancouver, BC.

Principle: OPEN SEARCH, STRICT EVIDENCE, NO HALLUCINATION.

## Step 1 — Read the attachment fully

When a supplier quote PDF/image is attached, read it completely first. Understand:
- service type
- frequency (e.g. monthly, annual, per visit)
- scope
- location / region
- comparable service requirements for a strata property

Use this only to define what to search for; do not copy the attachment vendor as a search result.

## Step 2 — Open web search

Use web_search_preview broadly across Vancouver, Richmond, Burnaby, and BC.

You may use ANY publicly verifiable source, including but not limited to:
- supplier websites
- commercial pricing pages
- public quote examples
- industry benchmark sources
- procurement examples
- public service pricing references
- rate cards, package pages, published estimates

Do NOT restrict yourself to "official vendor quote pages" only. Do NOT restrict source types artificially.

## Step 3 — Return up to 3 truly comparable suppliers

Return at most 3 vendors that are genuinely comparable to the attachment/job scope.

Prefer strong service match over generic listings.

If an exact match is scarce, use the closest commercial equivalent that still has verifiable public pricing.

## Required fields per vendor (only include vendors you are listing)

company_name, phone, website, address, description_en, description_zh,
price_low, price_high, price_currency, price_unit, price_source_url, price_confidence, price_evidence_note

## Pricing rules (strict)

- NEVER invent or guess prices. No typical market ranges, no AI-inferred pricing.
- Include price_low, price_high, and price_source_url ONLY when a real public URL documents the range.
- If no publicly verifiable source exists for a candidate vendor, do NOT include that vendor in the JSON array.
- Do NOT pad the list with vendors that have no price evidence.
- Return fewer than 3 vendors if open search cannot find enough comparable suppliers with verifiable public pricing.
- When you include pricing, set price_currency to "CAD" unless the source clearly states otherwise, and set price_confidence to high, medium, or low.

Return ONLY JSON (no markdown, no code fences, no commentary):

{
  "vendors": [
    {
      "company_name": "",
      "phone": "",
      "website": "",
      "address": "",
      "description_en": "",
      "description_zh": "",
      "price_low": 0,
      "price_high": 0,
      "price_currency": "CAD",
      "price_unit": "",
      "price_source_url": "",
      "price_confidence": "high|medium|low",
      "price_evidence_note": ""
    }
  ]
}

description_zh must be Simplified Chinese. Omit vendors without verifiable public pricing entirely.`;

const WEB_SEARCH_TOOL = {
  type: "web_search_preview",
  user_location: {
    type: "approximate",
    country: "CA",
    city: "Vancouver",
    region: "British Columbia",
  },
};

interface SearchRequest {
  property_id?: string;
  job_id?: string;
  title: string;
  description: string;
  attachment_urls?: string[];
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

type FetchedAttachment = {
  base64: string;
  mimeType: string;
  filename: string;
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
  return "application/octet-stream";
}

function filenameFromUrl(url: string, index: number): string {
  try {
    const path = new URL(url).pathname;
    const base = path.split("/").pop();
    if (base && base.includes(".")) return base;
  } catch {
    /* ignore */
  }
  return `quote-attachment-${index + 1}.pdf`;
}

async function fetchAttachments(
  urls: string[],
): Promise<FetchedAttachment[]> {
  const out: FetchedAttachment[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!.trim();
    if (!url) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn("SEARCH_QUOTES_ATTACHMENT_FETCH_FAIL", { url, status: res.status });
        continue;
      }
      const buf = await res.arrayBuffer();
      const mimeType = guessMimeType(url, res.headers.get("content-type"));
      out.push({
        base64: bytesToBase64(new Uint8Array(buf)),
        mimeType,
        filename: filenameFromUrl(url, i),
      });
    } catch (e) {
      console.warn("SEARCH_QUOTES_ATTACHMENT_FETCH_ERROR", {
        url,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }
  return out;
}

function buildJobContextBlock(params: {
  property_id: string;
  job_id: string;
  title: string;
  description: string;
  category?: string;
}): string {
  const lines = [
    "",
    "Job context:",
    `property_id: ${params.property_id || "(not provided)"}`,
    `job_id: ${params.job_id || "(not provided)"}`,
    `title: ${params.title}`,
    `description: ${params.description}`,
  ];
  if (params.category) lines.push(`category: ${params.category}`);
  return lines.join("\n");
}

function buildResponsesInput(params: {
  property_id: string;
  job_id: string;
  title: string;
  description: string;
  category?: string;
  attachments: FetchedAttachment[];
}): string | Array<Record<string, unknown>> {
  const contextBlock = buildJobContextBlock(params);
  const promptText = `${ANALYST_PROMPT}${contextBlock}`;

  if (params.attachments.length === 0) {
    return promptText;
  }

  const content: Array<Record<string, unknown>> = [
    { type: "input_text", text: promptText },
  ];

  for (const att of params.attachments) {
    if (att.mimeType.startsWith("image/")) {
      content.push({
        type: "input_image",
        image_url: `data:${att.mimeType};base64,${att.base64}`,
      });
    } else if (att.mimeType.includes("pdf")) {
      content.push({
        type: "input_file",
        filename: att.filename,
        file_data: `data:application/pdf;base64,${att.base64}`,
      });
    } else {
      content.push({
        type: "input_file",
        filename: att.filename,
        file_data: `data:${att.mimeType};base64,${att.base64}`,
      });
    }
  }

  return [{ role: "user", content }];
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
  let confidence = strField(o.price_confidence);

  if ((priceLow != null || priceHigh != null) && !sourceUrl) {
    priceLow = null;
    priceHigh = null;
    evidenceNote = NO_PRICE_NOTE;
    confidence = "";
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

async function callOpenAIResponses(params: {
  apiKey: string;
  input: string | Array<Record<string, unknown>>;
  useJsonFormat: boolean;
}): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; status: number; detail: string }> {
  const body: Record<string, unknown> = {
    model: OPENAI_MODEL,
    input: params.input,
    tools: [WEB_SEARCH_TOOL],
    temperature: 0.2,
    max_output_tokens: 8192,
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
      raw.slice(0, 800) ||
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
        JSON.stringify({ success: false, error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json() as SearchRequest;
    const title = strField(body.title);
    const description = strField(body.description);
    const property_id = strField(body.property_id);
    const job_id = strField(body.job_id);
    const category = strField(body.category);

    const attachmentUrls = Array.isArray(body.attachment_urls)
      ? body.attachment_urls.filter((u): u is string => typeof u === "string" && u.trim().length > 0)
      : [];

    const attachments = await fetchAttachments(attachmentUrls);

    const input = buildResponsesInput({
      property_id,
      job_id,
      title,
      description,
      category: category || undefined,
      attachments,
    });

    console.log("SEARCH_QUOTES_PROVIDER", SEARCH_QUOTES_PROVIDER);
    console.log("SEARCH_QUOTES_QUERY", {
      property_id,
      job_id,
      title,
      attachmentCount: attachments.length,
      attachmentUrls: attachmentUrls.length,
      model: OPENAI_MODEL,
      multimodal: attachments.length > 0,
    });

    let apiResult = await callOpenAIResponses({
      apiKey: openaiApiKey,
      input,
      useJsonFormat: true,
    });

    if (!apiResult.ok && apiResult.status === 400) {
      console.warn("SEARCH_QUOTES_JSON_FORMAT_RETRY", apiResult.detail);
      apiResult = await callOpenAIResponses({
        apiKey: openaiApiKey,
        input,
        useJsonFormat: false,
      });
    }

    if (!apiResult.ok) {
      console.error("OpenAI Responses API error:", apiResult.detail);
      return new Response(
        JSON.stringify({ success: false, error: apiResult.detail }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
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
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
