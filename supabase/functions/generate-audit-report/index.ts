import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gpt-4o-mini";

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const openaiKey = Deno.env.get("OPENAI_API_KEY") ?? "";

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(JSON.stringify({ error: "SERVER_CONFIG" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
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

  let body: { invoice_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "INVALID_JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const invoiceId = typeof body.invoice_id === "string" ? body.invoice_id.trim() : "";
  if (!invoiceId) {
    return new Response(JSON.stringify({ error: "invoice_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData } = await userClient.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: inv, error: invErr } = await userClient
    .from("invoices")
    .select(
      "id, property_id, vendor_name, total_amount, invoice_number, invoice_date, notes, category, ai_extracted_data",
    )
    .eq("id", invoiceId)
    .maybeSingle();

  if (invErr || !inv?.id || !inv.property_id) {
    return new Response(JSON.stringify({ error: "FORBIDDEN_OR_NOT_FOUND" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: aiRow } = await userClient
    .from("invoice_ai_audits")
    .select("risk_level, risk_score, ai_reasons, ai_summary_zh, ai_summary_en")
    .eq("invoice_id", invoiceId)
    .maybeSingle();

  const { data: vendorSignalRows } = await userClient
    .from("vendor_risk_signals")
    .select("vendor_name, signal_type, risk_level, summary_zh, evidence_json")
    .eq("property_id", inv.property_id as string)
    .eq("status", "open");

  const norm = (s: string) =>
    s.trim().toLowerCase().replace(/\s+/g, " ");
  const invVendorNorm = norm(String(inv.vendor_name ?? ""));
  const relatedSignals = (vendorSignalRows ?? []).filter(
    (r: { vendor_name?: string }) => norm(String(r.vendor_name ?? "")) === invVendorNorm && invVendorNorm.length > 0,
  );

  const admin = createClient(supabaseUrl, serviceKey);

  const amount = String(inv.total_amount ?? "");
  const vendor = String(inv.vendor_name ?? "");
  const desc =
    (inv.notes as string | null) ||
    (typeof inv.ai_extracted_data === "object" && inv.ai_extracted_data && "description" in (inv.ai_extracted_data as object)
      ? String((inv.ai_extracted_data as { description?: string }).description ?? "")
      : "") ||
    inv.category ||
    "";

  const anomalies = aiRow?.ai_reasons ?? [];
  const riskLevel = aiRow?.risk_level ?? "unknown";
  const riskScore = aiRow?.risk_score ?? "";
  const summaryZh = aiRow?.ai_summary_zh ?? "";

  const userPrompt =
    `你是一个专业的物业财务审计专家。\n\n` +
    `请基于以下发票信息，生成一份「业委会质疑报告」，要求：\n` +
    `1. 语气专业、克制、有法律感\n` +
    `2. 明确指出可疑点\n` +
    `3. 给出建议（是否需要解释、补材料、重新报价等）\n` +
    `4. 适合直接用于业委会会议\n\n` +
    `【发票信息】\n` +
    `金额：${amount}\n` +
    `供应商：${vendor}\n` +
    `项目/说明：${desc}\n` +
    `发票号：${inv.invoice_number ?? "—"}\n\n` +
    `【AI检测结果】\n` +
    `风险等级：${riskLevel}\n` +
    `风险评分：${riskScore}\n` +
    `摘要：${summaryZh}\n` +
    `异常点：${JSON.stringify(anomalies)}\n\n` +
    (relatedSignals.length > 0
      ? `【供应商风险信号（数据摘要，仅供会议引用）】\n` +
        relatedSignals
          .slice(0, 8)
          .map(
            (s: { signal_type?: string; risk_level?: string; summary_zh?: string; evidence_json?: unknown }, i: number) =>
              `${i + 1}. 类型 ${s.signal_type ?? "—"} / 等级 ${s.risk_level ?? "—"} — ${String(s.summary_zh ?? "").slice(0, 200)}（证据要点：${JSON.stringify(s.evidence_json ?? {}).slice(0, 400)}）`,
          )
          .join("\n") +
        `\n\n`
      : "") +
    `只输出一个 JSON 对象，不要 markdown，格式严格为：\n` +
    `{"title":"...","body":"...","recommendations":"..."}\n` +
    `其中 body 为正文（可多段，用 \\n），recommendations 为建议条目合并为一段文字。`;

  const oaRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You output only valid JSON in Simplified Chinese for strata council use. No markdown.",
        },
        { role: "user", content: userPrompt },
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

  const oaJson = (await oaRes.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = oaJson.choices?.[0]?.message?.content ?? "";
  let parsed: { title?: string; body?: string; recommendations?: string };
  try {
    parsed = JSON.parse(raw) as typeof parsed;
  } catch {
    return new Response(JSON.stringify({ error: "AI_PARSE_FAILED" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const title = String(parsed.title ?? "业委会质疑报告").slice(0, 500);
  const content = String(parsed.body ?? "").slice(0, 12000);
  const recommendations = String(parsed.recommendations ?? "").slice(0, 4000);

  const { data: inserted, error: insErr } = await admin
    .from("audit_reports")
    .insert({
      property_id: inv.property_id,
      invoice_id: inv.id,
      title,
      content,
      recommendations,
      created_by: userId,
    })
    .select("id")
    .maybeSingle();

  if (insErr || !inserted?.id) {
    console.error("audit_reports insert", insErr);
    return new Response(JSON.stringify({ error: "SAVE_FAILED", details: insErr?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      report_id: inserted.id,
      title,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
