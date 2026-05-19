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

const ANTHROPIC_SYSTEM_PROMPT = `你是一个物业采购助手。
使用 web_search 工具搜索温哥华（Vancouver, BC）本地
提供指定服务的真实供应商公司。

返回严格 JSON 格式（不要有其他文字）：
{
  "vendors": [
    {
      "name": "公司名称",
      "matchReason": "服务匹配说明",
      "priceRange": "参考报价（不含税，如 CAD $620-$730/month）",
      "priceWithTax": "含税总价（如 CAD $670-$790/month，含 5% GST）",
      "contact": "官网或电话",
      "advantage": "主要优势（1-2句）"
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
}): string {
  const { category, description, currentPrice } = params;
  return `请搜索温哥华本地提供以下服务的真实供应商，找出至少3家：
服务类别：${category}
服务描述：${description}
参考现有报价：${currentPrice}
搜索关键词建议：${category} service company Vancouver BC strata`;
}

function buildAnthropicUserContent(params: {
  category: string;
  description: string;
  currentPrice: string;
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

function inferPriceUnit(priceRange: string, priceWithTax: string): string {
  const combined = `${priceRange} ${priceWithTax}`.toLowerCase();
  if (/\/\s*month|per\s+month|\/mo\b|monthly/.test(combined)) return "month";
  if (/\/\s*year|per\s+year|annual|yearly/.test(combined)) return "year";
  if (/\/\s*visit|per\s+visit/.test(combined)) return "visit";
  return "month";
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
  const company_name = strField(o.company_name ?? o.name);
  if (!company_name) return null;

  const priceRangeDisplay = strField(o.priceRange ?? o.price_range_display);
  const priceWithTaxDisplay = strField(o.priceWithTax ?? o.price_with_tax_display);
  const contactRaw = strField(o.contact ?? o.phone);
  const contactParts = splitContactField(contactRaw);

  let priceLow = numOrNull(o.price_low);
  let priceHigh = numOrNull(o.price_high);

  if (priceLow == null && priceHigh == null && priceRangeDisplay) {
    const fromRange = parsePricesFromRange(priceRangeDisplay);
    priceLow = fromRange.low;
    priceHigh = fromRange.high;
  }

  const sourceUrl = strField(o.price_source_url) || contactParts.sourceUrl;
  const evidenceNote = strField(
    o.price_evidence_note ?? o.matchReason ?? o.match_reason,
  );
  const priceUnit =
    strField(o.price_unit) ||
    (priceRangeDisplay || priceWithTaxDisplay
      ? inferPriceUnit(priceRangeDisplay, priceWithTaxDisplay)
      : "");

  return {
    company_name,
    phone: strField(o.phone) || contactParts.phone,
    website: strField(o.website) || contactParts.website,
    address: strField(o.address),
    description_en: strField(o.description_en ?? o.advantage),
    description_zh: strField(o.description_zh),
    price_reference: priceRangeDisplay || priceWithTaxDisplay,
    price_low: priceLow,
    price_high: priceHigh,
    price_currency: strField(o.price_currency) || "CAD",
    price_unit: priceUnit || "month",
    price_source_url: sourceUrl,
    price_confidence: strField(o.price_confidence),
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
  attachments: FetchedAttachment[];
}): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; status: number; detail: string }> {
  const userContent = buildAnthropicUserContent({
    category: params.category,
    description: params.description,
    currentPrice: params.currentPrice,
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
    const title = strField(body.title);
    const description = strField(body.description);
    const property_id = strField(body.property_id);
    const job_id = strField(body.job_id);
    const category = strField(body.category) || title;
    const currentPrice = resolveCurrentPrice(
      description,
      body.current_price ?? body.currentPrice,
    );

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
      model: ANTHROPIC_MODEL,
      multimodal: attachments.length > 0,
    });

    const apiResult = await callAnthropicMessages({
      apiKey: anthropicApiKey,
      category,
      description,
      currentPrice,
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
