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

const ANALYST_PROMPT = `You are a procurement market analyst for strata property management in Greater Vancouver, BC (Vancouver, Richmond, Burnaby, and surrounding BC).

Core principle: OPEN SEARCH, STRICT EVIDENCE, NO HALLUCINATION.

Search openly like a general market research assistant (e.g. broad web discovery). Do NOT require an "official vendor pricing page" or "exact supplier price sheet". B2B services (elevator maintenance, fire safety, HVAC contracts, etc.) often only have pricing on third-party references — that is acceptable if the URL is real and publicly accessible.

## 1. Read the uploaded PDF / image first

When attached, read the full document and understand:
- service type
- frequency (monthly, annual, per visit, per unit, etc.)
- scope of work
- location / region
- current quoted amount from the attachment (reference only — do not list that vendor unless found independently with its own evidence)

## 2. Open web search (web_search_preview)

Search the Greater Vancouver market broadly for up to 3 truly comparable suppliers for the SAME (or closest commercial equivalent) service.

Allowed price evidence sources (any publicly verifiable URL):
- supplier website pricing or service pages
- published quote examples or case studies
- industry public reference pricing
- government / property / strata procurement or tender award examples
- commercial service price catalogs
- third-party commercial pricing references
- publicly accessible market pricing articles or comparison pages

price_source_url does NOT need to be the supplier's own website. A third-party page is valid if it publicly documents a defensible range for comparable work in BC.

Forbidden source types: invented URLs, paywalled content you cannot cite, or guessed "typical market" numbers with no page to point to.

## 3. Each vendor in vendors[] (only if priced)

Include a vendor ONLY if you can support price_low and price_high with a non-empty price_source_url.

For each included vendor provide:
company_name, phone, website, address, description_en, description_zh,
price_low, price_high, price_currency ("CAD" unless source says otherwise),
price_unit (e.g. per month, per visit, per elevator, project total),
price_source_url (any valid public http/https URL),
price_confidence (high | medium | low),
price_evidence_note — MUST explain:
  (a) where the price came from,
  (b) why it is usable for comparing this service,
  (c) whether it is a direct quote, industry reference, procurement/tender case, or general market reference.

## 4. Count and quality rules

- Return at most 3 vendors. Prefer true comparability over generic directories.
- If you only find 1 or 2 vendors with defensible public pricing, return 1 or 2 — do NOT pad to 3.
- If a candidate has NO public price basis, omit them entirely — do not list them with null prices.
- NEVER invent prices. No hallucinated ranges, no unstated assumptions.

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

description_zh must be Simplified Chinese.`;

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

type FetchAttachmentsResult =
  | { ok: true; attachments: FetchedAttachment[] }
  | { ok: false; error: string };

async function fetchAttachments(urls: string[]): Promise<FetchAttachmentsResult> {
  const out: FetchedAttachment[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!.trim();
    if (!url) continue;
    const filename = filenameFromUrl(url, i);
    try {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const byteLength = buf.byteLength;
      const contentType = guessMimeType(url, res.headers.get("content-type"));

      console.log("SEARCH_QUOTES_ATTACHMENT_FETCHED", {
        url,
        status: res.status,
        contentType,
        byteLength,
        filename,
      });

      if (!res.ok || byteLength === 0) {
        return { ok: false, error: "Failed to load quote attachment" };
      }

      out.push({
        base64: bytesToBase64(new Uint8Array(buf)),
        mimeType: contentType,
        filename,
      });
    } catch (e) {
      console.warn("SEARCH_QUOTES_ATTACHMENT_FETCH_ERROR", {
        url,
        error: e instanceof Error ? e.message : String(e),
      });
      return { ok: false, error: "Failed to load quote attachment" };
    }
  }
  return { ok: true, attachments: out };
}

function logAttachmentContentParts(attachments: FetchedAttachment[]): void {
  const parts = attachments.map((att) => {
    if (att.mimeType.startsWith("image/")) {
      return {
        type: "input_image",
        contentType: att.mimeType,
        base64Length: att.base64.length,
      };
    }
    return {
      type: "input_file",
      filename: att.filename || "quote.pdf",
      contentType: att.mimeType,
      base64Length: att.base64.length,
    };
  });
  console.log("SEARCH_QUOTES_ATTACHMENT_PARTS", parts);
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

  // Any non-empty public URL is acceptable — not required to be the vendor's official site.
  if ((priceLow != null || priceHigh != null) && !sourceUrl) {
    priceLow = null;
    priceHigh = null;
    evidenceNote = NO_PRICE_NOTE;
    confidence = "";
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

function hasRetainedPriceEvidence(v: VendorResult): boolean {
  return (
    v.price_low != null &&
    v.price_high != null &&
    Boolean(v.price_source_url.trim())
  );
}

function normalizeVendors(list: unknown[]): VendorResult[] {
  const out: VendorResult[] = [];
  for (const item of list) {
    const v = normalizeVendor(item);
    if (v && hasRetainedPriceEvidence(v)) out.push(v);
  }
  return out;
}

/** Diagnostics only — same JSON extraction paths as parseVendorsFromText, without normalization. */
function extractParsedJsonForDiagnostics(responseText: string): unknown {
  const unfenced = stripMarkdownFences(responseText);
  if (!unfenced) return null;

  try {
    return JSON.parse(unfenced);
  } catch {
    /* try regex fallbacks below */
  }

  const objectMatch = unfenced.match(/\{[\s\S]*"vendors"\s*:\s*\[[\s\S]*?\]\s*[\s\S]*?\}/);
  if (objectMatch) {
    try {
      return JSON.parse(objectMatch[0]);
    } catch {
      /* continue */
    }
  }

  const arrayMatch = unfenced.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {
      /* continue */
    }
  }

  return { _diagnostic: "json_parse_failed", preview: unfenced.slice(0, 1200) };
}

function rawVendorArrayFromParsed(parsed: unknown): unknown[] {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === "object") {
    const vendors = (parsed as Record<string, unknown>).vendors;
    if (Array.isArray(vendors)) return vendors;
  }
  return [];
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

    let attachments: FetchedAttachment[] = [];
    if (attachmentUrls.length > 0) {
      const fetchResult = await fetchAttachments(attachmentUrls);
      if (!fetchResult.ok || fetchResult.attachments.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: fetchResult.ok ? "Failed to load quote attachment" : fetchResult.error,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      attachments = fetchResult.attachments;
      logAttachmentContentParts(attachments);
    }

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

    console.log("SEARCH_QUOTES_MODEL_TEXT", responseText);

    const parsedJson = extractParsedJsonForDiagnostics(responseText);
    console.log("SEARCH_QUOTES_PARSED_JSON", parsedJson);

    const rawVendorList = rawVendorArrayFromParsed(parsedJson);
    const normalizedForLog = normalizeVendors(rawVendorList);
    console.log("SEARCH_QUOTES_NORMALIZED_VENDORS", normalizedForLog);

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
