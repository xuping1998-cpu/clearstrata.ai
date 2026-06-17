import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-4o";

const SYSTEM_PROMPT = `You are a bank statement extraction assistant. Read the attached bank monthly statement PDF and extract ONLY what is explicitly printed on the document.

Rules (strict):
- Extract only. Do NOT infer, guess, fill in missing values, or calculate balances.
- If a field is not clearly visible, use null (for strings) or null (for numbers).
- Do NOT compute opening_balance, closing_balance, or transaction balances — copy printed values only.
- amount: positive for credits/deposits/income; negative for debits/charges/withdrawals.
- Preserve the bank's original description text for each transaction.
- transaction_date and statement_date: YYYY-MM-DD when visible; otherwise null.
- Include every transaction row visible on the statement.
- List transactions[] in the same top-to-bottom order as they appear on the bank statement.

Return strict JSON only, no markdown:
{
  "statement_date": "YYYY-MM-DD or null",
  "account_name": "string or null",
  "account_number_masked": "string or null",
  "opening_balance": number or null,
  "closing_balance": number or null,
  "currency": "string or null",
  "source_bank": "string or null",
  "confidence": number between 0 and 1,
  "transactions": [
    {
      "transaction_date": "YYYY-MM-DD or null",
      "description": "string",
      "amount": number or null,
      "balance": number or null,
      "reference_number": "string or null"
    }
  ]
}`;

interface ParseRequest {
  fileBase64?: string;
  mimeType?: string;
  filename?: string;
}

interface StatementTransaction {
  transaction_date: string | null;
  description: string;
  amount: number | null;
  balance: number | null;
  reference_number: string | null;
}

interface BankStatement {
  statement_date: string | null;
  account_name: string | null;
  account_number_masked: string | null;
  opening_balance: number | null;
  closing_balance: number | null;
  currency: string | null;
  source_bank: string | null;
  confidence: number | null;
  transactions: StatementTransaction[];
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
      text: "Read the attached bank statement and return the JSON schema exactly as specified.",
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
      filename: filename || "statement.pdf",
      file_data: `data:${mimeType.includes("pdf") ? "application/pdf" : mimeType};base64,${base64}`,
    });
  }

  return content;
}

function asNullableString(v: unknown): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s || null;
}

function asNullableNumber(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeStatement(parsed: Record<string, unknown>): BankStatement {
  const rawTx = Array.isArray(parsed.transactions) ? parsed.transactions : [];
  const transactions: StatementTransaction[] = rawTx
    .filter((t) => t && typeof t === "object")
    .map((t) => {
      const row = t as Record<string, unknown>;
      return {
        transaction_date: asNullableString(row.transaction_date),
        description: String(row.description ?? "").trim(),
        amount: asNullableNumber(row.amount),
        balance: asNullableNumber(row.balance),
        reference_number: asNullableString(row.reference_number),
      };
    })
    .filter((t) => t.description.length > 0);

  const confidence = asNullableNumber(parsed.confidence);

  return {
    statement_date: asNullableString(parsed.statement_date),
    account_name: asNullableString(parsed.account_name),
    account_number_masked: asNullableString(parsed.account_number_masked),
    opening_balance: asNullableNumber(parsed.opening_balance),
    closing_balance: asNullableNumber(parsed.closing_balance),
    currency: asNullableString(parsed.currency),
    source_bank: asNullableString(parsed.source_bank),
    confidence: confidence != null ? Math.min(1, Math.max(0, confidence)) : null,
    transactions,
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

    const model = Deno.env.get("OPENAI_BANK_STATEMENT_MODEL")?.trim() || DEFAULT_MODEL;

    const body = (await req.json()) as ParseRequest;
    const rawBase64 = body.fileBase64?.trim();
    if (!rawBase64) {
      return new Response(
        JSON.stringify({ success: false, error: "fileBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const mimeType = (body.mimeType || "application/pdf").split(";")[0].trim().toLowerCase();
    const filename = body.filename || "statement.pdf";
    const bytes = Uint8Array.from(atob(rawBase64), (c) => c.charCodeAt(0));

    console.log("BANK_STATEMENT_PARSE_INPUT", {
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
      console.error("BANK_STATEMENT_PARSE_OPENAI_ERROR", detail);
      return new Response(
        JSON.stringify({ success: false, error: detail }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const responseText = extractResponsesOutputText(data);
    console.log("BANK_STATEMENT_PARSE_MODEL_TEXT", responseText.slice(0, 500));

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

    const statement = normalizeStatement(parsed);

    if (statement.transactions.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No transactions extracted from statement",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        statement,
        model,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("BANK_STATEMENT_PARSE_ERROR", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
