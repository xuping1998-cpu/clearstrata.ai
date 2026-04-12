import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gpt-4o-mini";

const SYSTEM = `You are a procurement risk analyst for a Canadian strata / condo corporation.
You MUST only use facts in the JSON provided. Do not invent amounts, vendors, or events.
You MUST NOT state or imply that fraud, corruption, illegality, or kickbacks are established.
Use cautious Mandarin and English suitable for board meetings, e.g. "可能存在", "建议进一步核查", "值得复核".
Output a single JSON object only (no markdown) with keys:
risk_level (low|medium|high|critical),
risk_score (number 0-100, aligned with evidence strength),
summary_zh (short, professional),
summary_en (short, professional),
reasons (array of short strings, zh or mixed),
recommendations (array of short actionable strings, zh or mixed).
Never use words like: 腐败, 利益输送 (as established fact), 违法 (as certainty).`;

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

  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";
  if (!openaiKey) {
    return new Response(JSON.stringify({ error: "OPENAI_API_KEY missing" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: {
    vendor_name?: string;
    signal_type?: string;
    evidence_json?: Record<string, unknown>;
    provisional_risk_score?: number;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "INVALID_JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const vendorName = typeof body.vendor_name === "string" ? body.vendor_name.trim() : "";
  const signalType = typeof body.signal_type === "string" ? body.signal_type.trim() : "";
  const evidence = body.evidence_json && typeof body.evidence_json === "object"
    ? body.evidence_json
    : {};
  const prov = typeof body.provisional_risk_score === "number"
    ? body.provisional_risk_score
    : Number(body.provisional_risk_score) || 50;

  if (!vendorName || !signalType) {
    return new Response(JSON.stringify({ error: "vendor_name and signal_type required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userContent =
    `已知硬数据信号（权威结构化证据）：\n` +
    `供应商名称：${vendorName}\n` +
    `信号类型：${signalType}\n` +
    `规则引擎参考分（0-100）：${prov}\n` +
    `证据 JSON：\n${JSON.stringify(evidence)}\n\n` +
    `请输出 JSON，对上述数据做风险提示与会议可用表述，不得编造未给出的数字。`;

  const oaRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!oaRes.ok) {
    const t = await oaRes.text();
    console.error("OpenAI", oaRes.status, t);
    return new Response(JSON.stringify({ error: "OPENAI_FAILED" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const oaJson = await oaRes.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = oaJson.choices?.[0]?.message?.content ?? "";
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return new Response(JSON.stringify({ success: true, ai: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "AI_PARSE_FAILED" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
