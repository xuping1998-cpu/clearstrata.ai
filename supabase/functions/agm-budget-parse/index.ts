import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o";

const SYSTEM_PROMPT = `You are an AGM (Annual General Meeting) budget extraction assistant. Read the attached AGM-approved budget PDF and extract the fiscal year and every budget category line with its approved amount.

Rules (strict):
- Extract only what is explicitly printed on the document. Do NOT infer or calculate totals.
- fiscal_year: the budget year shown on the document (e.g. 2026 for "2025-2026" use the ending year 2026).
- category: preserve the original category/line item label text.
- amount: positive numeric budget amount for that category (no currency symbols).
- Include every visible budget line item row from the main operating budget table.
- List lines[] in the same top-to-bottom order as they appear in the document.

Return strict JSON only, no markdown:
{
  "fiscal_year": number or null,
  "lines": [
    {
      "category": "string",
      "amount": number
    }
  ]
}`;

interface ParseRequest {
  fileBase64?: string;
  mimeType?: string;
  filename?: string;
}

interface BudgetLine {
  category: string;
  amount: number;
}

interface AgmBudgetParseResult {
  fiscal_year: number | null;
  lines: BudgetLine[];
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function stripMarkdownFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function extractResponsesOutputText(data: Record<string, unknown>): string {
  const output = data.output;
  if (!Array.isArray(output)) return "";
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    if (o.type === "message" && Array.isArray(o.content)) {
      for (const part of o.content) {
        if (part && typeof part === "object") {
          const p = part as Record<string, unknown>;
          if (p.type === "output_text" && typeof p.text === "string") {
            chunks.push(p.text);
          }
        }
      }
    }
  }
  return chunks.join("\n").trim();
}

function buildInputContent(
  mimeType: string,
  base64: string,
  filename: string,
): Array<Record<string, unknown>> {
  const content: Array<Record<string, unknown>> = [
    {
      type: "input_text",
      text: "Read the attached AGM budget document and return the JSON schema exactly as specified.",
    },
  ];

  if (mimeType.startsWith("image/")) {
    content.push({
      type: "input_image",
      image_url: `data:${mimeType};base64,${base64}`,
    });
  } else {
    content.push({
      type: "input_file",
      filename: filename || "agm-budget.pdf",
      file_data: `data:${mimeType.includes("pdf") ? "application/pdf" : mimeType};base64,${base64}`,
    });
  }

  return content;
}

function asNullableNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[,$\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizeResult(parsed: Record<string, unknown>): AgmBudgetParseResult {
  const rawLines = Array.isArray(parsed.lines) ? parsed.lines : [];
  const lines: BudgetLine[] = rawLines
    .filter((t) => t && typeof t === "object")
    .map((t) => {
      const row = t as Record<string, unknown>;
      return {
        category: String(row.category ?? "").trim(),
        amount: asNullableNumber(row.amount) ?? 0,
      };
    })
    .filter((l) => l.category.length > 0 && l.amount >= 0);

  const fiscalYear = asNullableNumber(parsed.fiscal_year);

  return {
    fiscal_year: fiscalYear != null ? Math.round(fiscalYear) : null,
    lines,
  };
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

    const model = Deno.env.get("OPENAI_AGM_BUDGET_MODEL")?.trim() || DEFAULT_MODEL;

    const body = (await req.json()) as ParseRequest;
    const rawBase64 = body.fileBase64?.trim();
    if (!rawBase64) {
      return new Response(
        JSON.stringify({ success: false, error: "fileBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const mimeType = (body.mimeType || "application/pdf").split(";")[0].trim().toLowerCase();
    const filename = body.filename || "agm-budget.pdf";
    const bytes = Uint8Array.from(atob(rawBase64), (c) => c.charCodeAt(0));

    console.log("AGM_BUDGET_PARSE_INPUT", {
      mimeType,
      filename,
      byteLength: bytes.length,
      model,
    });

    if (bytes.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "Empty file" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const base64 = bytesToBase64(bytes);
    const input = [
      {
        role: "system",
        content: [{ type: "input_text", text: SYSTEM_PROMPT }],
      },
      {
        role: "user",
        content: buildInputContent(mimeType, base64, filename),
      },
    ];

    const res = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input,
        temperature: 0.1,
        max_output_tokens: 16384,
        text: { format: { type: "json_object" } },
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
      console.error("AGM_BUDGET_PARSE_OPENAI_ERROR", detail);
      return new Response(
        JSON.stringify({ success: false, error: detail }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const responseText = extractResponsesOutputText(data);
    console.log("AGM_BUDGET_PARSE_MODEL_TEXT", responseText.slice(0, 500));

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(stripMarkdownFences(responseText)) as Record<string, unknown>;
    } catch {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to parse AI JSON",
          raw: responseText.slice(0, 400),
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const result = normalizeResult(parsed);

    if (result.lines.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No budget lines extracted from document",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        fiscal_year: result.fiscal_year,
        lines: result.lines,
        model,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("AGM_BUDGET_PARSE_ERROR", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
