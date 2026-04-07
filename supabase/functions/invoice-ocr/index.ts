import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type OcrStructured = {
  vendor?: string;
  invoice_number?: string;
  invoice_date?: string;
  total_amount?: string;
  tax_amount?: string;
  currency?: string;
  items?: Array<{ description?: string; amount?: string }>;
  summary?: string;
  raw_text?: string;
};

function parseJsonFromAssistant(text: string): OcrStructured | null {
  const trimmed = text.trim();
  const fence = "```";
  let jsonStr = trimmed;
  if (trimmed.includes(fence)) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) jsonStr = trimmed.slice(start, end + 1);
  }
  try {
    const obj = JSON.parse(jsonStr) as OcrStructured;
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
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

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ success: false, error: "AI_CONFIG", message: "ANTHROPIC_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const fileBase64 = typeof body?.fileBase64 === "string" ? body.fileBase64 : "";
    const mimeType = typeof body?.mimeType === "string" ? body.mimeType : "application/pdf";

    if (!fileBase64) {
      return new Response(
        JSON.stringify({ success: false, error: "NO_FILE", message: "fileBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const isImage = mimeType.startsWith("image/");
    const mediaType = isImage ? mimeType : "application/pdf";

    const systemPrompt = `You are an invoice OCR assistant for Canadian strata property management.
Extract data from the invoice image or PDF and respond with ONLY a single JSON object (no markdown, no prose).
Use this exact JSON shape:
{
  "vendor": "string",
  "invoice_number": "string or empty",
  "invoice_date": "YYYY-MM-DD or best effort",
  "total_amount": "numeric string with optional currency symbols",
  "tax_amount": "numeric string or empty",
  "currency": "CAD",
  "items": [ { "description": "string", "amount": "string" } ],
  "summary": "one line short description",
  "raw_text": "key lines from the document for audit"
}
If you cannot read a field, use empty string or empty array. Currency default CAD.`;

    const userContent: Array<Record<string, unknown>> = [];

    if (isImage) {
      userContent.push({
        type: "image",
        source: { type: "base64", media_type: mediaType, data: fileBase64 },
      });
    } else {
      userContent.push({
        type: "document",
        source: { type: "base64", media_type: mediaType, data: fileBase64 },
      });
    }

    userContent.push({
      type: "text",
      text: "Extract invoice fields and return only the JSON object described in the system message.",
    });

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userContent }],
        temperature: 0.2,
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic API error:", errText);
      return new Response(
        JSON.stringify({
          success: false,
          error: "AI_OCR_FAILED",
          message: "AI recognition failed",
          message_zh: "AI 识别失败",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = (await anthropicResponse.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = data.content?.[0]?.text;

    if (!text) {
      return new Response(
        JSON.stringify({ success: false, error: "AI_OCR_FAILED", message: "Empty AI response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsed = parseJsonFromAssistant(text);
    if (!parsed) {
      return new Response(
        JSON.stringify({ success: false, error: "AI_OCR_FAILED", message: "Could not parse structured JSON" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const items = Array.isArray(parsed.items)
      ? parsed.items.map((it) => ({
          description: String(it?.description ?? ""),
          amount: String(it?.amount ?? ""),
        }))
      : [];

    const extracted = {
      vendor: parsed.vendor ?? "",
      invoice_number: parsed.invoice_number ?? "",
      invoice_date: parsed.invoice_date ?? "",
      total_amount: parsed.total_amount ?? "",
      tax_amount: parsed.tax_amount ?? "",
      currency: parsed.currency ?? "CAD",
      items,
      summary: parsed.summary ?? "",
      raw_text: parsed.raw_text ?? text.slice(0, 8000),
    };

    return new Response(
      JSON.stringify({
        success: true,
        extracted,
        structured: {
          vendor: extracted.vendor,
          amount: extracted.total_amount,
          date: extracted.invoice_date,
          items: items.map((i) => ({
            description: i.description,
            amount: i.amount,
          })),
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "INTERNAL",
        message: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
