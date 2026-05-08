import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type ProviderError = {
  provider: string;
  code?: string;
  message: string;
};

type AiInvoiceJson = {
  vendor_name?: string;
  vendor?: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal?: string | number;
  tax_amount?: string | number;
  total_amount?: string | number;
  currency?: string;
  description?: string;
  summary?: string;
  category?: string;
  confidence?: number | string;
  raw_text_summary?: string;
  raw_text?: string;
  items?: Array<{ description?: string; amount?: string }>;
};

/** Frontend-compatible extracted row + structured summary */
type FrontendExtracted = {
  vendor: string;
  invoice_number: string;
  invoice_date: string;
  total_amount: string;
  tax_amount: string;
  currency: string;
  items: Array<{ description: string; amount: string }>;
  summary: string;
  raw_text: string;
  due_date: string;
  subtotal: string;
  description: string;
  category: string;
  confidence: number | string;
};

const JSON_SHAPE_PROMPT = `You are an invoice OCR assistant for Canadian strata property management.
Respond with ONLY one JSON object. No markdown, no prose, no code fences.

Required keys (use empty string "" where unknown; use empty array [] for items; confidence 0-1 number):
{
  "vendor_name": "",
  "invoice_number": "",
  "invoice_date": "",
  "due_date": "",
  "subtotal": "",
  "tax_amount": "",
  "total_amount": "",
  "currency": "CAD",
  "description": "",
  "category": "general",
  "confidence": 0,
  "raw_text_summary": "",
  "items": [ { "description": "", "amount": "" } ]
}

Dates YYYY-MM-DD when possible. Amounts as numeric strings without extra text. Currency default CAD.`;

function parseJsonFromAssistant(text: string): AiInvoiceJson | null {
  const trimmed = text.trim();
  const fence = "```";
  let jsonStr = trimmed;
  if (trimmed.includes(fence)) {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) jsonStr = trimmed.slice(start, end + 1);
  }
  try {
    const obj = JSON.parse(jsonStr) as AiInvoiceJson;
    return obj && typeof obj === "object" ? obj : null;
  } catch {
    return null;
  }
}

function strField(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return String(v).trim();
}

function normalizeConfidence(v: unknown): number | string {
  if (typeof v === "number" && Number.isFinite(v)) return Math.max(0, Math.min(1, v));
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseFloat(v);
    if (Number.isFinite(n)) return Math.max(0, Math.min(1, n));
    return v.trim();
  }
  return 0;
}

function buildExtractedAndStructured(
  parsed: AiInvoiceJson,
  rawFallback: string,
): { extracted: FrontendExtracted; structured: Record<string, unknown> } {
  const items = Array.isArray(parsed.items)
    ? parsed.items.map((it) => ({
        description: strField(it?.description),
        amount: strField(it?.amount),
      }))
    : [];

  const vendor = strField(parsed.vendor_name ?? parsed.vendor);
  const summary = strField(parsed.description ?? parsed.summary);
  const rawText = strField(parsed.raw_text_summary ?? parsed.raw_text) ||
    rawFallback.slice(0, 8000);

  const extracted: FrontendExtracted = {
    vendor,
    invoice_number: strField(parsed.invoice_number),
    invoice_date: strField(parsed.invoice_date),
    total_amount: strField(parsed.total_amount),
    tax_amount: strField(parsed.tax_amount),
    currency: strField(parsed.currency) || "CAD",
    items,
    summary,
    raw_text: rawText,
    due_date: strField(parsed.due_date),
    subtotal: strField(parsed.subtotal),
    description: strField(parsed.description ?? parsed.summary),
    category: strField(parsed.category) || "general",
    confidence: normalizeConfidence(parsed.confidence),
  };

  const structured = {
    vendor: extracted.vendor,
    amount: extracted.total_amount,
    date: extracted.invoice_date,
    items: items.map((i) => ({
      description: i.description,
      amount: i.amount,
    })),
  };

  return { extracted, structured };
}

async function runOpenAiVision(opts: {
  apiKey: string;
  mimeType: string;
  fileBase64: string;
}): Promise<{ text: string } | { error: ProviderError }> {
  const model =
    Deno.env.get("OPENAI_INVOICE_OCR_MODEL") ?? "gpt-4o";
  const { apiKey, mimeType, fileBase64 } = opts;

  const userContent: Array<Record<string, unknown>> = [];
  const isImage = mimeType.startsWith("image/");

  if (isImage) {
    userContent.push({
      type: "image_url",
      image_url: {
        url: `data:${mimeType};base64,${fileBase64}`,
      },
    });
  } else if (mimeType === "application/pdf" || mimeType.includes("pdf")) {
    userContent.push({
      type: "file",
      file: {
        filename: "invoice.pdf",
        file_data: `data:application/pdf;base64,${fileBase64}`,
      },
    });
  } else {
    return {
      error: {
        provider: "openai",
        code: "UNSUPPORTED_MIME",
        message: `OpenAI path: unsupported mimeType ${mimeType}`,
      },
    };
  }

  userContent.push({
    type: "text",
    text: `${JSON_SHAPE_PROMPT}\nReturn only the JSON object.`,
  });

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You extract invoices. Output is strict JSON matching the user's schema.",
          },
          { role: "user", content: userContent },
        ],
      }),
    });
  } catch (e) {
    return {
      error: {
        provider: "openai",
        message: e instanceof Error ? e.message : String(e),
      },
    };
  }

  const raw = await res.text();
  if (!res.ok) {
    const isPdf = mimeType === "application/pdf" || mimeType.includes("pdf");
    const low = raw.toLowerCase();
    const pdfUnsupported =
      isPdf &&
      (res.status === 400 ||
        low.includes("unsupported") ||
        (low.includes("invalid") &&
          (low.includes("file") || low.includes("pdf"))));
    return {
      error: {
        provider: "openai",
        code: pdfUnsupported ? "PDF_UNSUPPORTED_BY_OPENAI" : "OPENAI_HTTP",
        message: `${res.status} ${raw.slice(0, 500)}`,
      },
    };
  }

  try {
    const data = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content;
    if (!text || typeof text !== "string") {
      return {
        error: {
          provider: "openai",
          code: "OPENAI_EMPTY",
          message: "Empty OpenAI message content",
        },
      };
    }
    return { text };
  } catch {
    return {
      error: {
        provider: "openai",
        code: "OPENAI_PARSE",
        message: raw.slice(0, 500),
      },
    };
  }
}

async function runAnthropicOcr(opts: {
  apiKey: string;
  mimeType: string;
  fileBase64: string;
}): Promise<{ text: string } | { error: ProviderError }> {
  const { apiKey, mimeType, fileBase64 } = opts;
  const isImage = mimeType.startsWith("image/");
  const mediaType = isImage ? mimeType : "application/pdf";

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
    text:
      "Extract invoice fields from the attached file and return ONLY the JSON object described in the system message.",
  });

  let res: Response;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: `${JSON_SHAPE_PROMPT}\nReturn only JSON, never markdown.`,
        messages: [{ role: "user", content: userContent }],
        temperature: 0.2,
      }),
    });
  } catch (e) {
    return {
      error: {
        provider: "anthropic",
        message: e instanceof Error ? e.message : String(e),
      },
    };
  }

  const errText = await res.text();
  if (!res.ok) {
    return {
      error: {
        provider: "anthropic",
        code: "ANTHROPIC_HTTP",
        message: `${res.status} ${errText.slice(0, 500)}`,
      },
    };
  }

  try {
    const data = JSON.parse(errText) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = data.content?.[0]?.text;
    if (!text) {
      return {
        error: {
          provider: "anthropic",
          code: "ANTHROPIC_EMPTY",
          message: "Empty Anthropic response",
        },
      };
    }
    return { text };
  } catch {
    return {
      error: {
        provider: "anthropic",
        code: "ANTHROPIC_PARSE",
        message: errText.slice(0, 500),
      },
    };
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
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY")?.trim();

    const body = await req.json().catch(() => null) as Record<
      string,
      unknown
    > | null;
    const fileBase64 = typeof body?.fileBase64 === "string"
      ? body.fileBase64
      : "";
    const mimeType = typeof body?.mimeType === "string"
      ? body.mimeType
      : "application/pdf";

    if (!fileBase64) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "NO_FILE",
          message: "fileBase64 is required",
          message_zh: "缺少 fileBase64",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (!openaiApiKey && !anthropicApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "AI_CONFIG",
          message: "Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is configured",
          message_zh: "未配置 OPENAI_API_KEY 与 ANTHROPIC_API_KEY",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const providerErrors: ProviderError[] = [];

    console.log("[invoice-ocr] start", {
      mimeType,
      size: fileBase64?.length ?? 0,
      provider: "openai-first",
    });

    const tryFinalize = (
      rawText: string,
      winningProvider: "openai" | "anthropic",
    ): Response | null => {
      const parsed = parseJsonFromAssistant(rawText);
      if (!parsed) {
        return null;
      }
      const { extracted, structured } = buildExtractedAndStructured(
        parsed,
        rawText,
      );
      console.log("[invoice-ocr] success", { provider: winningProvider });
      return new Response(
        JSON.stringify({
          success: true,
          extracted,
          structured,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    };

    /** 1. OpenAI when key exists */
    if (openaiApiKey) {
      const oa = await runOpenAiVision({
        apiKey: openaiApiKey,
        mimeType,
        fileBase64,
      });
      if ("error" in oa) {
        console.error("[invoice-ocr] OpenAI failed", oa.error);
        providerErrors.push(oa.error);
      } else {
        const finalized = tryFinalize(oa.text, "openai");
        if (finalized) return finalized;
        providerErrors.push({
          provider: "openai",
          code: "JSON_PARSE",
          message: "Could not parse structured JSON from OpenAI",
        });
      }
    }

    /** 2. Claude fallback */
    if (anthropicApiKey) {
      const cl = await runAnthropicOcr({
        apiKey: anthropicApiKey,
        mimeType,
        fileBase64,
      });
      if ("error" in cl) {
        providerErrors.push(cl.error);
      } else {
        const finalized = tryFinalize(cl.text, "anthropic");
        if (finalized) return finalized;
        providerErrors.push({
          provider: "anthropic",
          code: "JSON_PARSE",
          message: "Could not parse structured JSON from Anthropic",
        });
      }
    }

    console.error("[invoice-ocr] failed", providerErrors);

    return new Response(
      JSON.stringify({
        success: false,
        error: "AI_OCR_FAILED",
        message: "AI recognition failed (all providers)",
        message_zh: "AI 识别失败（全部服务商）",
        providerErrors,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[invoice-ocr]", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "AI_OCR_FAILED",
        message: err instanceof Error ? err.message : "Unknown error",
        message_zh: err instanceof Error ? err.message : "未知错误",
        providerErrors: [{
          provider: "internal",
          message: err instanceof Error ? err.message : String(err),
        }],
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
