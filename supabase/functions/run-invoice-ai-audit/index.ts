import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";
import { runHistoricalAuditAuto } from "../_shared/historicalInvoiceAudit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gpt-4o-mini";

const SYSTEM_PROMPT = `You are a senior accounts-payable auditor for a Canadian strata / condo corporation.
You MUST only use facts present in the JSON context provided by the user. Do not invent vendors, amounts, dates, or events.
If information is missing or ambiguous, lower confidence and say so in reasons (bilingual where applicable).

Focus on:
1) Possible duplicate or repeated charges (compare current invoice to vendor_history_12m and category_history_12m).
2) Price outliers vs same-vendor or same-category history.
3) Vague or generic service descriptions (from OCR structured_json / raw_text).
4) Mismatch with budget category vs line items / OCR (use invoice fields and budget_year_summary).
5) Whether human review is warranted.

Respond with a single JSON object ONLY (no markdown), with this exact shape:
{
  "risk_level": "low" | "medium" | "high" | "critical",
  "risk_score": <number 0-100>,
  "summary_zh": "<short executive summary in Simplified Chinese>",
  "summary_en": "<short executive summary in English>",
  "reasons": [ "<bullet strings, can mix zh/en as needed>" ],
  "recommendations": [ "<action items>" ]
}

Uncertainty MUST reduce risk_score and risk_level. Never claim fraud without citing context evidence.`;

function normalizeRiskLevel(s: string): "low" | "medium" | "high" | "critical" {
  const x = (s || "").toLowerCase().trim();
  if (x === "low" || x === "medium" || x === "high" || x === "critical") return x;
  return "medium";
}

function clampScore(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v)));
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
    return new Response(
      JSON.stringify({ error: "OPENAI_API_KEY missing" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { invoice_id?: string; property_id?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "INVALID_JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const invoiceId = typeof body.invoice_id === "string" ? body.invoice_id.trim() : "";
  const propertyId = typeof body.property_id === "string" ? body.property_id.trim() : "";
  if (!invoiceId) {
    return new Response(JSON.stringify({ error: "invoice_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!propertyId) {
    return new Response(JSON.stringify({ error: "property_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: inv, error: invErr } = await userClient
    .from("invoices")
    .select(
      "id, property_id, fiscal_year, budget_category_id, total_amount, status, approved, vendor_name, category, invoice_number",
    )
    .eq("id", invoiceId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (invErr || !inv?.id || !inv.property_id || inv.property_id !== propertyId) {
    return new Response(JSON.stringify({ error: "FORBIDDEN_OR_NOT_FOUND" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  type InvRow = {
    id: string;
    property_id: string;
    fiscal_year: number | null;
    budget_category_id: string | null;
    total_amount: unknown;
    status: string;
    approved: boolean | null;
  };

  const invFull = inv as InvRow;

  const amt = typeof invFull.total_amount === "number"
    ? invFull.total_amount
    : Number(invFull.total_amount) || 0;

  let budgetCap = 0;
  let spentBefore = 0;
  let afterSpend = amt;
  let overBudgetHard = false;
  let noBudgetLine = true;

  if (invFull.budget_category_id && invFull.fiscal_year != null) {
    const { data: bud } = await admin
      .from("annual_budgets")
      .select("amount")
      .eq("property_id", invFull.property_id)
      .eq("fiscal_year", invFull.fiscal_year)
      .eq("budget_category_id", invFull.budget_category_id)
      .eq("status", "active")
      .maybeSingle();

    budgetCap = bud?.amount != null ? Number(bud.amount) : 0;
    noBudgetLine = budgetCap <= 0;

    const { data: spendRows } = await admin
      .from("invoices")
      .select("total_amount")
      .eq("property_id", invFull.property_id)
      .eq("fiscal_year", invFull.fiscal_year)
      .eq("budget_category_id", invFull.budget_category_id)
      .neq("id", invFull.id);

    spentBefore = (spendRows ?? []).reduce(
      (s, r: { total_amount?: unknown }) => s + (Number(r.total_amount) || 0),
      0,
    );
    afterSpend = spentBefore + amt;
    overBudgetHard = !noBudgetLine && afterSpend > budgetCap;
  }

  const statusLc = String(invFull.status || "").toLowerCase();
  const approvedFlag = invFull.approved === true;
  const bypassApprovalHard = amt > 0 && statusLc === "paid" && !approvedFlag;

  const { data: contextJson, error: ctxErr } = await admin.rpc("invoice_ai_build_context", {
    p_invoice_id: invoiceId,
    p_property_id: invFull.property_id,
  });

  if (ctxErr || contextJson == null) {
    console.error("invoice_ai_build_context", ctxErr);
    return new Response(JSON.stringify({ error: "CONTEXT_BUILD_FAILED", details: ctxErr?.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const hybridBlock = {
    hard_constraints: {
      budget_line_amount: budgetCap,
      category_spent_before_this_invoice: spentBefore,
      category_spent_after_including_this_invoice: afterSpend,
      over_budget_hard: overBudgetHard,
      no_active_budget_line: noBudgetLine,
      invoice_status: invFull.status,
      invoice_formally_approved: approvedFlag,
      bypass_approval_hard: bypassApprovalHard,
    },
    instruction:
      "Hard flags are authoritative for compliance. Explain them in reasons; do not contradict over_budget_hard or bypass_approval_hard.",
  };

  const userContent =
    "Audit context (JSON). Analyze and return ONLY the JSON object described in the system message.\n\n" +
    JSON.stringify({ invoice_ai_context: contextJson, hybrid: hybridBlock });

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
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!oaRes.ok) {
    const errText = await oaRes.text();
    console.error("OpenAI error", oaRes.status, errText);
    return new Response(JSON.stringify({ error: "OPENAI_FAILED", status: oaRes.status }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const oaJson = await oaRes.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = oaJson.choices?.[0]?.message?.content ?? "";
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ error: "AI_PARSE_FAILED" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let riskLevel = normalizeRiskLevel(String(parsed.risk_level ?? "medium"));
  let riskScore = clampScore(parsed.risk_score);
  const summaryZh = String(parsed.summary_zh ?? "").slice(0, 8000);
  const summaryEn = String(parsed.summary_en ?? "").slice(0, 8000);
  let reasons = Array.isArray(parsed.reasons) ? [...parsed.reasons] as string[] : [];
  const recommendations = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

  if (overBudgetHard) {
    riskScore = Math.max(riskScore, 80);
    if (riskLevel === "low" || riskLevel === "medium") riskLevel = "high";
  }
  if (bypassApprovalHard) {
    riskScore = Math.max(riskScore, 95);
    riskLevel = "critical";
  }

  if (overBudgetHard) {
    reasons = [
      "硬性约束：该预算类别在本财年累计支出（含本张发票）已超过 active 年度预算线。",
      ...reasons,
    ];
  }
  if (bypassApprovalHard) {
    reasons = [
      "硬性约束：发票状态为已付款，但系统未记录事前审批通过（approved=false），存在流程违规风险。",
      ...reasons,
    ];
  }

  const fiscalYear = typeof invFull.fiscal_year === "number" ? invFull.fiscal_year : null;

  const auditRow = {
    invoice_id: invFull.id,
    property_id: invFull.property_id,
    fiscal_year: fiscalYear,
    risk_level: riskLevel,
    risk_score: riskScore,
    ai_summary_zh: summaryZh,
    ai_summary_en: summaryEn,
    ai_reasons: reasons,
    ai_recommendations: recommendations,
    model_name: MODEL,
    status: "open",
    over_budget: overBudgetHard,
    bypass_approval: bypassApprovalHard,
  };

  const { data: upserted, error: upErr } = await admin
    .from("invoice_ai_audits")
    .upsert(auditRow, { onConflict: "invoice_id" })
    .select("id")
    .maybeSingle();

  if (upErr) {
    console.error("invoice_ai_audits upsert", upErr);
    return new Response(JSON.stringify({ error: "PERSIST_AUDIT_FAILED", details: upErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: existingCtxRow } = await admin
    .from("invoice_ai_audit_contexts")
    .select("context_json")
    .eq("invoice_id", invFull.id)
    .maybeSingle();

  const prevCtx = (existingCtxRow?.context_json ?? {}) as Record<string, unknown>;

  let historicalAudit: Record<string, unknown> | null = null;
  try {
    historicalAudit = await runHistoricalAuditAuto({
      admin,
      supabaseUrl,
      anonKey,
      authHeader,
      openaiKey,
      invoiceId: invFull.id,
      propertyId: invFull.property_id,
    }) as unknown as Record<string, unknown>;
    console.log("[run-invoice-ai-audit] historicalAudit", {
      invoice_id: invFull.id,
      candidate: historicalAudit?.candidate,
      benchmarkStatus: historicalAudit?.benchmarkStatus,
    });
  } catch (e) {
    console.error("[run-invoice-ai-audit] historicalAudit failed", e);
    historicalAudit = {
      candidate: true,
      benchmarkStatus: "unsupported",
      reasoning: e instanceof Error ? e.message : "historical audit failed",
      generatedAt: new Date().toISOString(),
    };
  }

  const baseContext =
    contextJson && typeof contextJson === "object" && !Array.isArray(contextJson)
      ? (contextJson as Record<string, unknown>)
      : {};

  const mergedContext: Record<string, unknown> = {
    ...baseContext,
    ...(prevCtx.benchmarkReview ? { benchmarkReview: prevCtx.benchmarkReview } : {}),
    historicalAudit,
  };

  const { error: ctxSaveErr } = await admin.from("invoice_ai_audit_contexts").upsert(
    {
      invoice_id: invFull.id,
      property_id: invFull.property_id,
      context_json: mergedContext,
    },
    { onConflict: "invoice_id" },
  );

  if (ctxSaveErr) {
    console.error("invoice_ai_audit_contexts upsert", ctxSaveErr);
  }

  return new Response(
    JSON.stringify({
      success: true,
      invoice_id: invFull.id,
      audit_id: upserted?.id ?? null,
      risk_level: riskLevel,
      risk_score: riskScore,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
