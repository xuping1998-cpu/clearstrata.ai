import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const SEARCH_QUOTES_PROVIDER = "anthropic_web_search";
const NO_PRICE_NOTE = "Pricing requires formal quote";

const ANTHROPIC_SYSTEM_PROMPT = `You are a procurement assistant for BC strata / condo / multi-family / commercial property management.
Use the web_search tool to find REAL local vendors in Vancouver, BC (fall back to wider BC only when necessary).

PRIMARY SOURCE OF TRUTH: the "报价解读 / quote_context" structured summary in the user message.
1. Use quote_context as the primary source of truth.
2. Search for vendors that provide the SAME or highly comparable scope of work.
3. Match the SERVICE SCOPE, not just the broad industry category.
4. Match the PRICING BASIS exactly:
   - one-time with one-time
   - monthly with monthly
   - annual with annual
   - per-visit with per-visit
5. Exclude the incumbent / current vendor if quote_context names one.
6. Do NOT include generic contractors merely because they are in the same industry.
7. Do NOT mix different cost types together:
   - emergency call-out fee
   - inspection fee
   - monthly maintenance contract
   - one-time project lump sum
   - annual service contract
8. Quality over quantity. Do NOT pad to 3 vendors with irrelevant companies.
   If fewer than 3 comparable vendors exist, return fewer and explain why in matchReason.
9. If price evidence is weak, still return the vendor but leave priceRange empty
   and set price fields null (do not guess).
10. Do not invent precise prices without source support.

Pricing unit must reflect the real billing basis from the source.
Do not assume monthly pricing unless the source explicitly describes a monthly or recurring service.

Search keyword guidance — combine: service_scope + key line_items + pricing_basis
+ property type (strata / condo / multi-family / commercial building) + city (Vancouver / BC fallback).
Avoid generic queries such as "mechanical service company Vancouver BC strata" or "plumbing company Vancouver BC".
Prefer specific queries, e.g.:
- strata DHW heating system installation Vancouver BC
- commercial domestic hot water system replacement Vancouver
- multi-family building DHW piping installation contractor BC
- boiler / DHW installation strata building Vancouver

PRICING BASIS NORMALIZATION (Phase 5B) — classify each vendor price precisely:
- "$80/year" per backflow device annual certification => pricingBasis="per_device_per_year", unitLabel="device"
- "annual backflow testing program" (whole building, yearly) => pricingBasis="annual_contract"
- "fixed project quote" / one-time lump sum => pricingBasis="one_time_project"
- a single service call / dispatch => pricingBasis="per_visit"
- hourly labour => pricingBasis="per_hour"
- per device, not yearly => pricingBasis="per_device"
- monthly maintenance => pricingBasis="monthly_contract"
- if unsure => pricingBasis="unknown"
Never present an annual or per-device-per-year price as directly comparable to a
one-time project quote. If the uploaded quote is a one-time project and you can
only find annual/per-device prices, still return the vendor but set
samePricingBasis=false and label its pricingBasis accurately (do NOT fabricate a
one-time price). Honor the "Uploaded quote pricing_basis" stated in the user message.

Return STRICT JSON only (no other text):
{
  "vendors": [
    {
      "companyName": "company legal name",
      "phone": "phone or ''",
      "website": "website url or ''",
      "description": "what they do, 1-2 sentences",
      "priceRange": "e.g. CAD $80,000–$95,000 one-time (use '' when no source)",
      "priceUnit": "one-time | month | year | visit | cubic yard | hour | unit | ''",
      "priceBasis": "one-time | monthly | annual | per_visit | per_cubic_yard | hourly | ''",
      "pricingBasis": "one_time_project | per_visit | per_device | per_device_per_year | annual_contract | monthly_contract | per_hour | unknown",
      "unitCountBasis": "number of units the price covers, or null",
      "unitLabel": "device | hour | visit | project | unit | ''",
      "comparableScope": true,
      "samePricingBasis": true,
      "matchReason": "why this vendor is comparable to the quoted scope and pricing basis",
      "evidenceQuality": "high | medium | low",
      "priceSourceUrl": "url backing the price, or ''"
    }
  ]
}`;

interface SearchRequest {
  property_id?: string;
  job_id?: string;
  title: string;
  description: string;
  category?: string;
  current_price?: string;
  currentPrice?: string;
  attachment_urls?: string[];
  quote_context?: string;
}

// Input caps to protect Claude's input token budget. Any overflow is truncated, never errored.
const QUOTE_CONTEXT_MAX = 1500;
const DESCRIPTION_MAX = 1200;
const TITLE_CATEGORY_MAX = 300;
const CURRENT_PRICE_MAX = 120;

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
  price_range_display?: string;
  price_with_tax_display?: string;
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

function boolField(v: unknown, dflt: boolean): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "yes" || s === "1") return true;
    if (s === "false" || s === "no" || s === "0") return false;
  }
  return dflt;
}

function clipField(v: unknown, max: number): string {
  const s = strField(v);
  return s.length > max ? s.slice(0, max) : s;
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

function resolveCurrentPrice(description: string, explicit?: string): string {
  const fromBody = strField(explicit);
  if (fromBody) return fromBody;
  const refMatch = description.match(/Reference:\s*([^.]+(?:\.[^.]+)?)/i);
  if (refMatch?.[1]?.trim()) return refMatch[1].trim();
  return "(未提供)";
}

function buildAnthropicUserText(params: {
  category: string;
  description: string;
  currentPrice: string;
  quoteContext?: string;
}): string {
  const { category, description, currentPrice, quoteContext } = params;
  const primary = quoteContext
    ? `报价解读 / quote_context（主依据，请据此匹配同类服务与同计费方式）：\n${quoteContext}`
    : `（无结构化 quote_context，请基于以下类别/描述谨慎匹配同类服务）`;

  // Phase 5B — surface the uploaded quote's pricing basis / unit count so the
  // model does not return annual / per-device-per-year prices as directly comparable.
  const basisMatch = quoteContext?.match(/pricing_basis:\s*([a-z_]+)/i);
  const unitMatch = quoteContext?.match(/unit_count:\s*(\d+)/i);
  const basisLine =
    basisMatch || unitMatch
      ? `\n上传报价计费方式 / Uploaded quote pricing_basis = ${basisMatch?.[1] ?? 'unknown'}${
          unitMatch ? `, unit_count = ${unitMatch[1]}` : ''
        }。请勿把年度 / 按设备每年 (annual / per_device_per_year) 报价当作可直接与一次性项目 (one_time_project) 比较。每个供应商必须返回 pricingBasis。`
      : '';

  return `请基于以下报价解读，搜索温哥华本地「同类服务、同计费方式」的可比供应商。
宁可返回 1–2 家真正可比供应商，也不要为凑满 3 家返回不相关供应商。

${primary}${basisLine}

服务类别（辅助）：${category}
服务描述（辅助）：${description}
参考现有报价：${currentPrice}

请用具体查询（结合 service_scope / 关键 line_items / pricing_basis / 物业类型 / Vancouver, BC），
不要使用泛化的 "${category} service company Vancouver BC" 这类查询。`;
}

function buildAnthropicUserContent(params: {
  category: string;
  description: string;
  currentPrice: string;
  quoteContext?: string;
  attachments: FetchedAttachment[];
}): string | Array<Record<string, unknown>> {
  const userText = buildAnthropicUserText(params);
  if (params.attachments.length === 0) return userText;

  const content: Array<Record<string, unknown>> = [];
  for (const att of params.attachments) {
    const mediaType = att.mimeType.startsWith("image/")
      ? (att.mimeType === "image/webp" ? "image/png" : att.mimeType)
      : "application/pdf";
    if (att.mimeType.startsWith("image/")) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: att.base64 },
      });
    } else {
      content.push({
        type: "document",
        source: { type: "base64", media_type: mediaType, data: att.base64 },
      });
    }
  }
  content.push({ type: "text", text: userText });
  return content;
}

function stripMarkdownFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parsePricesFromRange(priceRange: string): { low: number | null; high: number | null } {
  const nums = priceRange.match(/\d[\d,]*/g);
  if (!nums || nums.length === 0) return { low: null, high: null };
  const parsed = nums.map((n) => parseFloat(n.replace(/,/g, ""))).filter(Number.isFinite);
  if (parsed.length >= 2) return { low: parsed[0]!, high: parsed[1]! };
  if (parsed.length === 1) return { low: parsed[0]!, high: parsed[0]! };
  return { low: null, high: null };
}

/** Infer billing unit from price text; returns '' when unknown. Does not scale amounts. */
function inferPriceUnitFromRange(priceRange: string): string {
  if (!priceRange.trim()) return "";

  const lower = priceRange.toLowerCase();

  if (
    /cubic\s*yard|\/\s*cubic\s*yard|per\s+cubic\s*yard|yd³|yd3|\/\s*yard\b|per\s+yard\b/.test(
      lower,
    )
  ) {
    return "cubic yard";
  }
  if (
    /\bone[-\s]?time\b|lump\s*sum|\/\s*project\b|per\s+project\b|\/\s*job\b|per\s+job\b/.test(
      lower,
    )
  ) {
    return "one-time";
  }
  if (/\/\s*year\b|per\s+year\b|\bannual\b|\byearly\b/.test(lower)) {
    return "year";
  }
  if (
    /\/\s*month\b|per\s+month\b|\bmonthly\b|\/\s*mo\b/.test(lower)
  ) {
    return "month";
  }
  if (/\/\s*visit\b|per\s+visit\b/.test(lower)) {
    return "visit";
  }
  if (/\/\s*hour\b|per\s+hour\b|\bhourly\b/.test(lower)) {
    return "hour";
  }
  if (/\/\s*day\b|per\s+day\b|\bdaily\b/.test(lower)) {
    return "day";
  }
  if (
    /\/\s*unit\b|per\s+unit\b|\/\s*each\b|per\s+item\b|per\s+each\b/.test(lower)
  ) {
    return "unit";
  }

  return "";
}

function splitContactField(contact: string): { phone: string; website: string; sourceUrl: string } {
  const trimmed = contact.trim();
  if (!trimmed) return { phone: "", website: "", sourceUrl: "" };
  if (/^https?:\/\//i.test(trimmed)) {
    return { phone: "", website: trimmed, sourceUrl: trimmed };
  }
  if (/^[\d\s()+-]+$/.test(trimmed) && trimmed.replace(/\D/g, "").length >= 7) {
    return { phone: trimmed, website: "", sourceUrl: trimmed };
  }
  return { phone: trimmed, website: "", sourceUrl: trimmed };
}

function normalizeVendor(raw: unknown): VendorResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const company_name = strField(o.companyName ?? o.company_name ?? o.name);
  if (!company_name) return null;

  // Same-scope comparability gate (Phase 2B). Defaults are permissive so older
  // responses without these flags are not silently dropped.
  const comparableScope = boolField(o.comparableScope ?? o.comparable_scope, true);
  // Never pad results with non-comparable vendors — exclude entirely.
  if (!comparableScope) return null;

  const samePricingBasis = boolField(o.samePricingBasis ?? o.same_pricing_basis, true);
  const evidenceQuality = strField(o.evidenceQuality ?? o.evidence_quality).toLowerCase();

  const priceRangeDisplay = strField(o.priceRange ?? o.price_range_display);
  const priceWithTaxDisplay = strField(o.priceWithTax ?? o.price_with_tax_display);
  const contactRaw = strField(o.contact);
  const contactParts = splitContactField(contactRaw);

  let priceLow = numOrNull(o.price_low);
  let priceHigh = numOrNull(o.price_high);

  if (priceLow == null && priceHigh == null && priceRangeDisplay) {
    const fromRange = parsePricesFromRange(priceRangeDisplay);
    priceLow = fromRange.low;
    priceHigh = fromRange.high;
  }

  // Keep the vendor on the list, but null out prices that must not pollute the
  // market benchmark: mismatched pricing basis, weak evidence, or no priceRange.
  if (!samePricingBasis || evidenceQuality === "low" || !priceRangeDisplay) {
    priceLow = null;
    priceHigh = null;
  }

  const sourceUrl =
    strField(o.priceSourceUrl ?? o.price_source_url) || contactParts.sourceUrl;
  const evidenceNote = strField(
    o.matchReason ?? o.match_reason ?? o.price_evidence_note,
  );

  // Prefer explicit unit/basis; do not scale price_low/price_high (no ×12).
  const explicitUnit = strField(o.priceUnit ?? o.price_unit);
  const explicitBasis = strField(o.priceBasis ?? o.price_basis);
  let priceUnit = "";
  const combinedForUnit =
    `${priceRangeDisplay} ${priceWithTaxDisplay} ${explicitUnit} ${explicitBasis}`.trim();
  if (combinedForUnit) {
    priceUnit = inferPriceUnitFromRange(combinedForUnit);
  }
  if (!priceUnit && explicitUnit) priceUnit = explicitUnit;

  return {
    company_name,
    phone: strField(o.phone) || contactParts.phone,
    website: strField(o.website) || contactParts.website,
    address: strField(o.address),
    description_en: strField(o.description ?? o.description_en ?? o.advantage),
    description_zh: strField(o.description_zh),
    price_reference: priceRangeDisplay || priceWithTaxDisplay,
    price_low: priceLow,
    price_high: priceHigh,
    price_currency: strField(o.price_currency) || "CAD",
    price_unit: priceUnit,
    price_source_url: sourceUrl,
    price_confidence: evidenceQuality || strField(o.price_confidence),
    price_evidence_note: evidenceNote,
    price_range_display: priceRangeDisplay || undefined,
    price_with_tax_display: priceWithTaxDisplay || undefined,
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

function extractJsonBlock(text: string): string | null {
  const unfenced = stripMarkdownFences(text);
  if (!unfenced) return null;
  return unfenced.match(/\{[\s\S]*\}/)?.[0] ?? null;
}

/** Diagnostics only — same JSON extraction as parseVendorsFromText, without normalization. */
function extractParsedJsonForDiagnostics(responseText: string): unknown {
  const jsonBlock = extractJsonBlock(responseText);
  if (!jsonBlock) {
    return { _diagnostic: "json_block_not_found", preview: responseText.slice(0, 1200) };
  }
  try {
    return JSON.parse(jsonBlock);
  } catch {
    return { _diagnostic: "json_parse_failed", preview: jsonBlock.slice(0, 1200) };
  }
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
  const jsonBlock = extractJsonBlock(responseText);
  if (!jsonBlock) {
    console.error("SEARCH_QUOTES_PARSE_ERROR", {
      preview: responseText.slice(0, 1200),
    });
    return [];
  }

  try {
    const parsed = JSON.parse(jsonBlock) as unknown;
    if (Array.isArray(parsed)) return normalizeVendors(parsed);
    if (parsed && typeof parsed === "object") {
      const vendors = (parsed as Record<string, unknown>).vendors;
      if (Array.isArray(vendors)) return normalizeVendors(vendors);
    }
  } catch (e) {
    console.error("SEARCH_QUOTES_PARSE_ERROR", {
      error: e instanceof Error ? e.message : String(e),
      preview: jsonBlock.slice(0, 1200),
    });
  }

  return [];
}

function extractAnthropicTextFromContent(data: Record<string, unknown>): string {
  const content = data.content;
  if (!Array.isArray(content)) return "";

  const chunks: string[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const row = block as Record<string, unknown>;
    if (row.type === "text" && typeof row.text === "string" && row.text.trim()) {
      chunks.push(row.text.trim());
    }
  }
  return chunks.join("\n").trim();
}

async function callAnthropicMessages(params: {
  apiKey: string;
  category: string;
  description: string;
  currentPrice: string;
  quoteContext?: string;
  attachments: FetchedAttachment[];
}): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; status: number; detail: string }> {
  const userContent = buildAnthropicUserContent({
    category: params.category,
    description: params.description,
    currentPrice: params.currentPrice,
    quoteContext: params.quoteContext,
    attachments: params.attachments,
  });

  console.log("SEARCH_QUOTES_REQUEST_MODE", {
    provider: SEARCH_QUOTES_PROVIDER,
    web_search: true,
    model: ANTHROPIC_MODEL,
    multimodal: params.attachments.length > 0,
  });

  const res = await fetch(ANTHROPIC_MESSAGES_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": params.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "interleaved-thinking-2025-05-14",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 2000,
      tools: [{ type: "web_search_20250305", name: "web_search" }],
      system: ANTHROPIC_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
    }),
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
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const body = await req.json() as SearchRequest;
    const title = clipField(body.title, TITLE_CATEGORY_MAX);
    const description = clipField(body.description, DESCRIPTION_MAX);
    const property_id = strField(body.property_id);
    const job_id = strField(body.job_id);
    const category = clipField(body.category, TITLE_CATEGORY_MAX) || title;
    const currentPrice = clipField(
      resolveCurrentPrice(description, body.current_price ?? body.currentPrice),
      CURRENT_PRICE_MAX,
    );
    const quoteContext = clipField(body.quote_context, QUOTE_CONTEXT_MAX);

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

    console.log("SEARCH_QUOTES_PROVIDER", SEARCH_QUOTES_PROVIDER);
    console.log("SEARCH_QUOTES_QUERY", {
      property_id,
      job_id,
      title,
      category,
      currentPrice,
      attachmentCount: attachments.length,
      attachmentUrls: attachmentUrls.length,
      quoteContextLen: quoteContext.length,
      model: ANTHROPIC_MODEL,
      multimodal: attachments.length > 0,
    });

    const apiResult = await callAnthropicMessages({
      apiKey: anthropicApiKey,
      category,
      description,
      currentPrice,
      quoteContext: quoteContext || undefined,
      attachments,
    });

    if (!apiResult.ok) {
      console.error("Anthropic Messages API error:", apiResult.detail);
      return new Response(
        JSON.stringify({ success: false, error: apiResult.detail }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const responseText = extractAnthropicTextFromContent(apiResult.data);

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
