import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const OPENAI_MODEL = "gpt-4o";

const SYSTEM_PROMPT = `你是一个物业采购助手。读取这份PDF报价单，提取关键信息。
返回严格的 JSON 格式，不要有任何其他文字：
{
  "category": "服务类别（英文，如 landscaping / elevator / cleaning）",
  "description": "服务描述（英文，简洁，50字以内）",
  "currentPrice": "现有报价金额（如 $711/month）"
}`;

interface AnalyzeRequest {
  fileBase64?: string;
  mimeType?: string;
  filename?: string;
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
      text: "请读取附件报价单并按要求返回 JSON。",
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
      filename: filename || "quote.pdf",
      file_data: `data:${mimeType.includes("pdf") ? "application/pdf" : mimeType};base64,${base64}`,
    });
  }

  return content;
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

    const body = (await req.json()) as AnalyzeRequest;
    const rawBase64 = body.fileBase64?.trim();
    if (!rawBase64) {
      return new Response(
        JSON.stringify({ success: false, error: "fileBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const mimeType = (body.mimeType || "application/pdf").split(";")[0].trim().toLowerCase();
    const filename = body.filename || "quote.pdf";
    const bytes = Uint8Array.from(atob(rawBase64), (c) => c.charCodeAt(0));

    console.log("ANALYZE_PROCUREMENT_QUOTE_INPUT", {
      mimeType,
      filename,
      byteLength: bytes.length,
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
        model: OPENAI_MODEL,
        input,
        temperature: 0.1,
        max_output_tokens: 1024,
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
      console.error("ANALYZE_PROCUREMENT_QUOTE_OPENAI_ERROR", detail);
      return new Response(
        JSON.stringify({ success: false, error: detail }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const responseText = extractResponsesOutputText(data);
    console.log("ANALYZE_PROCUREMENT_QUOTE_MODEL_TEXT", responseText.slice(0, 500));

    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(stripMarkdownFences(responseText)) as Record<string, unknown>;
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse AI JSON", raw: responseText.slice(0, 400) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const category = String(parsed.category ?? "").trim();
    const description = String(parsed.description ?? "").trim();
    const currentPrice = String(parsed.currentPrice ?? "").trim();

    return new Response(
      JSON.stringify({
        success: true,
        category,
        description,
        currentPrice,
        model: OPENAI_MODEL,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("ANALYZE_PROCUREMENT_QUOTE_ERROR", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
