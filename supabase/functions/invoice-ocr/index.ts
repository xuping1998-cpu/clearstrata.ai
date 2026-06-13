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
  document_number?: string;
  invoice_number?: string;
  document_date?: string;
  invoice_date?: string;
  service_scope?: string;
  description?: string;
  summary?: string;
  category?: string;
  currency?: string;
  confidence?: number | string;
  totals_block_text?: string;
  raw_text_original?: string;
  raw_text_summary?: string;
  raw_text?: string;
  line_items?: Array<{ description?: string; amount?: string | number | null }>;
  items?: Array<{ description?: string; amount?: string | number | null }>;
};

/**
 * Frontend-compatible extracted row + structured summary.
 *
 * Phase 2D: this function NO LONGER returns financial totals. All monetary
 * figures (subtotal, tax, totals, balance due, ...) are parsed in TypeScript on
 * the client from `raw_text_original`. The LLM only transcribes.
 */
type FrontendExtracted = {
  vendor: string;
  invoice_number: string;
  document_number: string;
  invoice_date: string;
  document_date: string;
  service_scope: string;
  currency: string;
  items: Array<{ description: string; amount: string }>;
  summary: string;
  raw_text: string;
  raw_text_original: string;
  totals_block_text: string;
  due_date: string;
  description: string;
  category: string;
  confidence: number | string;
};

const JSON_SHAPE_PROMPT = `STRICT FINANCIAL OCR MODE

You are doing transcription, not accounting.

Do not calculate.
Do not infer.
Do not correct.
Do not normalize financial totals.
Do not replace printed values with mathematically consistent values.

Return the original invoice text line by line, preserving the totals block exactly as printed.

TOTALS BLOCK — READ THIS FIRST:
1. Locate the totals block first (usually bottom-right of the invoice).
2. Transcribe the totals block line by line EXACTLY as printed.
3. Do not infer missing rows.
4. Do not calculate GST.
5. Do not replace printed numbers with mathematically consistent numbers.
6. Preserve these labels and their numbers exactly: Subtotal, Sales Tax, GST, HST, PST, Payments/Credits, Total, Invoice Total, Amount Due, Balance Due.
7. If labels are on the right and amounts are aligned in a column, preserve their order.
8. If labels and amounts are separated by layout, still output ONE line per label, e.g.:
   Subtotal $44,375.00
   Sales Tax $2,218.75
   Payments/Credits $0.00
   Balance Due $46,593.75
9. Never create a Total line if it is not printed.
10. Never create a Payments/Credits line if it is not printed.
11. If uncertain, include the exact visible characters and lower the confidence; do not guess.

Put the verbatim totals block in "totals_block_text" (one "Label Amount" per line),
AND also keep it inside "raw_text_original" as part of the full transcription.
"totals_block_text" is still OCR transcription — NOT computed numeric fields.

For financial totals (Subtotal, Sales Tax, GST, HST, PST, Payments/Credits, Total,
Invoice Total, Amount Due, Balance Due): only include them as printed text inside
"totals_block_text" / "raw_text_original". Do not extract them as numeric JSON fields.

If a number is unclear, preserve the visible text and do not guess.

Respond with ONLY one JSON object. No markdown, no prose, no code fences.

Expected JSON shape:
{
  "vendor_name": "" or null,
  "document_number": "" or null,
  "document_date": "" or null,
  "service_scope": "" or null,
  "line_items": [ { "description": "", "amount": null } ],
  "totals_block_text": "",
  "raw_text_original": "",
  "raw_text": "",
  "confidence": 0
}

"raw_text" MUST equal "raw_text_original". document_date as YYYY-MM-DD when possible.
line_items.amount may be null; line-item amounts are descriptive only and MUST NOT be treated as invoice totals.`;

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
  const rawItems = Array.isArray(parsed.line_items)
    ? parsed.line_items
    : Array.isArray(parsed.items)
      ? parsed.items
      : [];
  const items = rawItems.map((it) => ({
    description: strField(it?.description),
    amount: strField(it?.amount),
  }));

  const vendor = strField(parsed.vendor_name ?? parsed.vendor);
  const docNumber = strField(parsed.document_number ?? parsed.invoice_number);
  const docDate = strField(parsed.document_date ?? parsed.invoice_date);
  const serviceScope = strField(parsed.service_scope ?? parsed.description ?? parsed.summary);

  // Verbatim transcription is the ONLY source of truth. Never a summary; only a
  // last-resort fallback to the raw model response when transcription is missing.
  const rawText = strField(parsed.raw_text_original) ||
    strField(parsed.raw_text) ||
    strField(parsed.raw_text_summary) ||
    rawFallback.slice(0, 16000);

  const extracted: FrontendExtracted = {
    vendor,
    invoice_number: docNumber,
    document_number: docNumber,
    invoice_date: docDate,
    document_date: docDate,
    service_scope: serviceScope,
    currency: strField(parsed.currency) || "CAD",
    items,
    summary: serviceScope,
    raw_text: rawText,
    raw_text_original: rawText,
    totals_block_text: strField(parsed.totals_block_text),
    due_date: "",
    description: serviceScope,
    category: strField(parsed.category) || "general",
    confidence: normalizeConfidence(parsed.confidence),
  };

  const structured = {
    vendor: extracted.vendor,
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
