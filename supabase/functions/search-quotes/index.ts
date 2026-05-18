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

interface SearchRequest {
  title: string;
  description: string;
  category: string;
}

interface VendorResult {
  company_name: string;
  phone: string;
  website: string;
  address: string;
  description_en: string;
  description_zh: string;
  price_reference: string;
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

function buildServiceType(category: string, title: string): string {
  return CATEGORY_LABELS[category] || category || title;
}

function buildInstructions(serviceType: string): string {
  return [
    `You are a procurement research assistant for Canadian strata properties in Greater Vancouver (Vancouver, Richmond, Burnaby, BC).`,
    `Use web search to find exactly 3 real, contactable local vendors for: ${serviceType}.`,
    `Prefer businesses with a verifiable phone or website in BC.`,
    `Return supplier discovery only.`,
    `Do NOT invent or infer price ranges.`,
    `Do NOT benchmark pricing.`,
    `Pricing analysis is handled by a separate ai-pricing service.`,
    `If pricing is not directly verified from a source, leave price_reference empty.`,
    `Return ONLY valid JSON (no markdown, no code fences, no commentary) with this exact shape:`,
    `{"vendors":[{"company_name":"","phone":"","website":"","address":"","description_en":"","description_zh":"","price_reference":""}]}`,
    `Each vendor must include all fields. Always set price_reference to an empty string "".`,
    `description_zh should be Simplified Chinese summarizing the vendor and service fit.`,
  ].join("\n");
}

function buildUserInput(title: string, description: string, serviceType: string): string {
  return [
    `Search for 3 Vancouver / Richmond / Burnaby / BC vendors for this strata procurement job.`,
    `Service category: ${serviceType}`,
    `Title: ${title}`,
    `Description: ${description}`,
  ].join("\n");
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
  return {
    company_name,
    phone: String(o.phone ?? "").trim(),
    website: String(o.website ?? "").trim(),
    address: String(o.address ?? "").trim(),
    description_en: String(o.description_en ?? "").trim(),
    description_zh: String(o.description_zh ?? "").trim(),
    price_reference: "",
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

    const { title, description, category }: SearchRequest = await req.json();
    const serviceType = buildServiceType(category ?? "", title ?? "");
    const instructions = buildInstructions(serviceType);
    const input = buildUserInput(title ?? "", description ?? "", serviceType);

    console.log("SEARCH_QUOTES_PROVIDER", SEARCH_QUOTES_PROVIDER);
    console.log("SEARCH_QUOTES_QUERY", {
      title,
      category,
      serviceType,
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
