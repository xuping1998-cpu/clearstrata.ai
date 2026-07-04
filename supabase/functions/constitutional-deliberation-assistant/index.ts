import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gpt-4o-mini";

const CATEGORY_BASIS: Record<string, { article: string; principle_en: string; principle_zh: string }[]> = {
  property_management: [
    { article: "Article II", principle_en: "Discussion Before Decision", principle_zh: "先讨论后决策" },
    { article: "Article I", principle_en: "Transparent Governance", principle_zh: "透明治理" },
  ],
  budget: [
    { article: "Article I", principle_en: "Transparent Governance", principle_zh: "透明治理" },
    { article: "Article IV", principle_en: "Evidence Before Opinion", principle_zh: "先证据后意见" },
  ],
  major_repair: [
    { article: "Article II", principle_en: "Discussion Before Decision", principle_zh: "先讨论后决策" },
    { article: "Article IV", principle_en: "Evidence Before Opinion", principle_zh: "先证据后意见" },
  ],
  procurement: [
    { article: "Article I", principle_en: "Transparent Governance", principle_zh: "透明治理" },
    { article: "Article IV", principle_en: "Evidence Before Opinion", principle_zh: "先证据后意见" },
  ],
  special_general_meeting: [
    { article: "Article II", principle_en: "Discussion Before Decision", principle_zh: "先讨论后决策" },
    { article: "Article V", principle_en: "Public by Default", principle_zh: "默认公开" },
    { article: "Article VI", principle_en: "Owner Participation", principle_zh: "业主参与" },
  ],
  annual_general_meeting: [
    { article: "Article II", principle_en: "Discussion Before Decision", principle_zh: "先讨论后决策" },
    { article: "Article VI", principle_en: "Governance Lifecycle", principle_zh: "治理生命周期" },
  ],
  council_proposal: [
    { article: "Article II", principle_en: "Discussion Before Decision", principle_zh: "先讨论后决策" },
    { article: "Article VI", principle_en: "Governance Lifecycle", principle_zh: "治理生命周期" },
  ],
  owner_proposal: [
    { article: "Article II", principle_en: "Discussion Before Decision", principle_zh: "先讨论后决策" },
    { article: "Article V", principle_en: "Public by Default", principle_zh: "默认公开" },
  ],
  bylaw_amendment: [
    { article: "Article II", principle_en: "Discussion Before Decision", principle_zh: "先讨论后决策" },
    { article: "Article VI", principle_en: "Community Governance", principle_zh: "社区治理" },
  ],
  policy_proposal: [
    { article: "Article II", principle_en: "Discussion Before Decision", principle_zh: "先讨论后决策" },
    { article: "Article V", principle_en: "Public by Default", principle_zh: "默认公开" },
  ],
  emergency_matter: [
    { article: "Article II", principle_en: "Discussion Before Decision", principle_zh: "先讨论后决策" },
    { article: "Article III", principle_en: "AI Assists, People Decide", principle_zh: "AI 协助，人做决定" },
  ],
  other: [
    { article: "Article II", principle_en: "Discussion Before Decision", principle_zh: "先讨论后决策" },
    { article: "Article III", principle_en: "AI Assists, People Decide", principle_zh: "AI 协助，人做决定" },
  ],
};

const SYSTEM_PROMPT = `You are the Constitutional Deliberation Assistant (CDA) for ClearStrata community governance.

CONSTITUTIONAL CONSTRAINTS — you MUST obey:
- AI assists governance; AI NEVER governs. People are the only legitimate decision makers (Article III).
- You may summarize discussion, identify viewpoints, detect emerging consensus, highlight minority opinions, identify missing information, detect risks, and prepare DRAFT resolution language for human review.
- You must NEVER: vote, approve, reject, override council or owners, determine legitimacy, or interpret the Constitution as binding authority.
- Legitimacy precedes intelligence (Article X). Label all outputs as assistive drafts only.
- Before suggesting a draft resolution, review the constitutional principles provided in context and list which principles you considered in principles_reviewed.

Respond with a single JSON object ONLY (no markdown), exact shape:
{
  "consensus_percent": <number 0-100 or null if insufficient discussion>,
  "consensus_summary_en": "<brief assistive summary>",
  "consensus_summary_zh": "<简体中文摘要>",
  "major_viewpoints": [{ "label_en": "", "label_zh": "", "summary_en": "", "summary_zh": "" }],
  "minority_opinions": [{ "label_en": "", "label_zh": "", "summary_en": "", "summary_zh": "" }],
  "potential_risks": [{ "text_en": "", "text_zh": "" }],
  "missing_information": [{ "text_en": "", "text_zh": "" }],
  "suggested_resolution_en": "<DRAFT resolution for council review — not binding>",
  "suggested_resolution_zh": "<决议草案 — 仅供业委会审议>",
  "suggested_next_step_en": "<suggested governance lifecycle step>",
  "suggested_next_step_zh": "<建议的下一步治理程序>",
  "principles_reviewed": [{ "article": "Article II", "principle_en": "", "principle_zh": "" }]
}

Use ONLY facts from the matter and comments provided. If discussion is sparse, lower consensus_percent, note missing_information, and keep suggested_resolution brief and conditional.`;

function constitutionalBasisForCategory(category: string) {
  return CATEGORY_BASIS[category] ?? CATEGORY_BASIS.other;
}

function clampPercent(n: unknown): number | null {
  if (n === null || n === undefined) return null;
  const v = typeof n === "number" ? n : Number(n);
  if (!Number.isFinite(v)) return null;
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

  let body: { matter_id?: string; property_id?: string; language?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "INVALID_JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const matterId = typeof body.matter_id === "string" ? body.matter_id.trim() : "";
  const propertyId = typeof body.property_id === "string" ? body.property_id.trim() : "";
  const language = body.language === "zh" ? "zh" : "en";

  if (!matterId || !propertyId) {
    return new Response(JSON.stringify({ error: "matter_id and property_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceClient = createClient(supabaseUrl, serviceKey);

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const uid = userData.user.id;

  const { data: member, error: memberErr } = await userClient
    .from("property_members")
    .select("role, status")
    .eq("property_id", propertyId)
    .eq("user_id", uid)
    .maybeSingle();

  if (memberErr || !member || member.status !== "active") {
    return new Response(JSON.stringify({ error: "NOT_A_MEMBER" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const councilRoles = ["council", "admin", "property_admin"];
  if (!councilRoles.includes(member.role)) {
    return new Response(JSON.stringify({ error: "COUNCIL_ONLY" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: matter, error: matterErr } = await userClient
    .from("governance_matters")
    .select("*")
    .eq("id", matterId)
    .eq("property_id", propertyId)
    .maybeSingle();

  if (matterErr || !matter) {
    return new Response(JSON.stringify({ error: "MATTER_NOT_FOUND" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: comments, error: commentsErr } = await userClient
    .from("governance_matter_comments")
    .select("body, created_at, author_id")
    .eq("matter_id", matterId)
    .eq("property_id", propertyId)
    .eq("visibility", "visible")
    .order("created_at", { ascending: true });

  if (commentsErr) {
    return new Response(JSON.stringify({ error: commentsErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const constitutionalBasis = constitutionalBasisForCategory(String(matter.category));

  const userPrompt = JSON.stringify({
    matter: {
      title: matter.title,
      description: matter.description,
      category: matter.category,
      status: matter.status,
      discussion_deadline: matter.discussion_deadline,
    },
    constitutional_basis: constitutionalBasis,
    owner_comments: (comments ?? []).map((c, i) => ({
      index: i + 1,
      body: c.body,
      created_at: c.created_at,
    })),
    response_language_preference: language,
  });

  const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!openaiRes.ok) {
    const errText = await openaiRes.text();
    return new Response(JSON.stringify({ error: "OPENAI_ERROR", detail: errText.slice(0, 500) }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const openaiJson = await openaiRes.json();
  const rawContent = openaiJson?.choices?.[0]?.message?.content;
  if (typeof rawContent !== "string") {
    return new Response(JSON.stringify({ error: "INVALID_AI_RESPONSE" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(rawContent);
  } catch {
    return new Response(JSON.stringify({ error: "INVALID_AI_JSON" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const principlesReviewed = Array.isArray(parsed.principles_reviewed)
    ? parsed.principles_reviewed
    : constitutionalBasis;

  const content = {
    consensus_percent: clampPercent(parsed.consensus_percent),
    consensus_summary_en: String(parsed.consensus_summary_en ?? ""),
    consensus_summary_zh: String(parsed.consensus_summary_zh ?? ""),
    major_viewpoints: Array.isArray(parsed.major_viewpoints) ? parsed.major_viewpoints : [],
    minority_opinions: Array.isArray(parsed.minority_opinions) ? parsed.minority_opinions : [],
    potential_risks: Array.isArray(parsed.potential_risks) ? parsed.potential_risks : [],
    missing_information: Array.isArray(parsed.missing_information) ? parsed.missing_information : [],
    suggested_resolution_en: String(parsed.suggested_resolution_en ?? ""),
    suggested_resolution_zh: String(parsed.suggested_resolution_zh ?? ""),
    suggested_next_step_en: String(parsed.suggested_next_step_en ?? ""),
    suggested_next_step_zh: String(parsed.suggested_next_step_zh ?? ""),
  };

  const { data: inserted, error: insertErr } = await serviceClient
    .from("governance_matter_cda_reports")
    .insert({
      matter_id: matterId,
      property_id: propertyId,
      report_type: "deliberation_analysis",
      content,
      constitutional_basis: constitutionalBasis,
      principles_reviewed: principlesReviewed,
      model: MODEL,
      requested_by: uid,
    })
    .select("*")
    .single();

  if (insertErr || !inserted) {
    return new Response(JSON.stringify({ error: insertErr?.message ?? "INSERT_FAILED" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ report: inserted }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
