import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

/** reportMonth ISO date string yyyy-mm-dd → UTC month [start, end) */
function monthRangeUtc(reportMonth: string): { startIso: string; endIso: string; nextDateStr: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(reportMonth.trim());
  if (!m) throw new Error("Invalid reportMonth format (expected YYYY-MM-DD)");
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d !== 1) throw new Error("reportMonth must be the first day of a month");

  const start = new Date(Date.UTC(y, mo - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(y, mo, 1, 0, 0, 0, 0));
  const ny = end.getUTCFullYear();
  const nm = String(end.getUTCMonth() + 1).padStart(2, "0");
  const nd = String(end.getUTCDate()).padStart(2, "0");
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    nextDateStr: `${ny}-${nm}-${nd}`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[generate-manager-monthly-report] missing SUPABASE_* env");
      return json({ ok: false, error: "Missing server configuration" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ ok: false, error: "Missing Authorization Bearer token" }, 401);
    }

    let body: { propertyId?: string; reportMonth?: string };
    try {
      body = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const propertyId = body.propertyId?.trim();
    const reportMonth = body.reportMonth?.trim();
    if (!propertyId || !reportMonth) {
      return json({ ok: false, error: "Missing propertyId or reportMonth" }, 400);
    }

    let range: { startIso: string; endIso: string; nextDateStr: string };
    try {
      range = monthRangeUtc(reportMonth);
    } catch (e) {
      return json({ ok: false, error: e instanceof Error ? e.message : "Invalid reportMonth" }, 400);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error("[generate-manager-monthly-report] auth:", userError);
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const userId = userData.user.id;

    const { data: membership, error: memErr } = await serviceClient
      .from("property_members")
      .select("status, role")
      .eq("property_id", propertyId)
      .eq("user_id", userId)
      .maybeSingle();

    if (memErr) {
      console.error("[generate-manager-monthly-report] membership:", memErr);
      return json({ ok: false, error: "Failed to verify membership" }, 500);
    }

    if (
      !membership ||
      String(membership.status) !== "active" ||
      String(membership.role) !== "manager"
    ) {
      return json({ ok: false, error: "Forbidden" }, 403);
    }

    const { data: existingRow } = await serviceClient
      .from("manager_monthly_reports")
      .select("id, status")
      .eq("property_id", propertyId)
      .eq("report_month", reportMonth)
      .maybeSingle();

    if (existingRow && String(existingRow.status) === "published") {
      return json({
        ok: false,
        error: "This monthly report has already been published.",
      }, 409);
    }

    // ── Owner requests (created_at in month) ─────────────────────────────────
    const { data: orRows, error: orErr } = await serviceClient
      .from("property_manager_requests")
      .select("id, status, sent_to_manager_at")
      .eq("property_id", propertyId)
      .gte("created_at", range.startIso)
      .lt("created_at", range.endIso);

    if (orErr) {
      console.error("[generate-manager-monthly-report] owner requests:", orErr);
      return json({ ok: false, error: "Failed to load owner requests" }, 500);
    }

    const orList = orRows ?? [];
    const total_owner_requests = orList.length;
    let sent_to_manager_count = 0;
    let resolved_count = 0;
    let pending_count = 0;
    let in_progress_count_or = 0;
    let rejected_count = 0;

    for (const row of orList) {
      const st = String(row.status ?? "");
      if (st !== "pending" || row.sent_to_manager_at) sent_to_manager_count++;
      if (st === "resolved") resolved_count++;
      if (st === "pending") pending_count++;
      if (st === "in_progress") in_progress_count_or++;
      if (st === "rejected") rejected_count++;
    }

    const requestIds = orList.map((r) => r.id).filter(Boolean);
    let average_rating: number | null = null;
    if (requestIds.length > 0) {
      const { data: revRows } = await serviceClient
        .from("property_manager_request_reviews")
        .select("rating")
        .in("request_id", requestIds);
      const ratings = (revRows ?? [])
        .map((r) => Number(r.rating))
        .filter((n) => Number.isFinite(n) && n >= 1 && n <= 5);
      if (ratings.length > 0) {
        average_rating = Number(
          (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1),
        );
      }
    }

    const owner_request_summary = {
      total_owner_requests,
      sent_to_manager_count,
      resolved_count,
      pending_count,
      in_progress_count: in_progress_count_or,
      rejected_count,
      average_rating,
    };

    // ── Inspections (inspection_date in month, visible statuses) ─────────────
    const INS_STATUSES = ["published", "in_progress", "completed"];
    const { data: insRows, error: insErr } = await serviceClient
      .from("manager_inspection_reports")
      .select("id, status, risk_level, findings")
      .eq("property_id", propertyId)
      .in("status", INS_STATUSES)
      .gte("inspection_date", reportMonth)
      .lt("inspection_date", range.nextDateStr);

    if (insErr) {
      console.error("[generate-manager-monthly-report] inspections:", insErr);
      return json({ ok: false, error: "Failed to load inspections" }, 500);
    }

    const insList = insRows ?? [];
    const inspection_count = insList.length;
    let issues_found = 0;
    let insp_high_risk_count = 0;
    let completed_count = 0;
    let in_progress_count_insp = 0;
    let repair_needed_count = 0;

    for (const row of insList) {
      const findings = String(row.findings ?? "").trim();
      if (findings.length > 0) issues_found++;
      if (String(row.risk_level) === "high_risk") insp_high_risk_count++;
      if (String(row.status) === "completed") completed_count++;
      if (String(row.status) === "in_progress") in_progress_count_insp++;
      if (String(row.risk_level) === "repair_needed") repair_needed_count++;
    }

    const inspection_summary = {
      inspection_count,
      issues_found,
      high_risk_count: insp_high_risk_count,
      completed_count,
      in_progress_count: in_progress_count_insp,
      repair_needed_count,
    };

    // ── Public matters (created_at in month, visible statuses) ───────────────
    const PM_STATUSES = ["published", "in_progress", "resolved", "long_term", "closed"];
    const { data: pmRows, error: pmErr } = await serviceClient
      .from("manager_public_matters")
      .select("id, title, status, risk_level, created_at")
      .eq("property_id", propertyId)
      .in("status", PM_STATUSES)
      .gte("created_at", range.startIso)
      .lt("created_at", range.endIso);

    if (pmErr) {
      console.error("[generate-manager-monthly-report] public matters:", pmErr);
      return json({ ok: false, error: "Failed to load public matters" }, 500);
    }

    const pmList = pmRows ?? [];
    const public_matter_count = pmList.length;
    const new_items = public_matter_count;
    let long_term_items_count = 0;
    let closed_items_count = 0;
    let resolved_items_count = 0;
    let pm_high_risk_count = 0;
    const key_risk_titles: string[] = [];

    for (const row of pmList) {
      const st = String(row.status ?? "");
      if (st === "long_term") long_term_items_count++;
      if (st === "closed") closed_items_count++;
      if (st === "resolved") resolved_items_count++;
      const rk = String(row.risk_level ?? "");
      if (rk === "high") pm_high_risk_count++;

      const isKey = rk === "high" || st === "long_term";
      if (isKey && row.title) {
        const t = String(row.title).trim();
        if (t && !key_risk_titles.includes(t)) key_risk_titles.push(t);
      }
    }

    const key_risks_titles_arr = key_risk_titles.slice(0, 5);

    const public_matter_summary = {
      public_matter_count,
      new_items,
      long_term_items: long_term_items_count,
      closed_items: closed_items_count,
      resolved_items: resolved_items_count,
      high_risk_count: pm_high_risk_count,
      key_risks: key_risks_titles_arr,
    };

    const repairOrHighInsp = repair_needed_count + insp_high_risk_count;
    const pendingOrInProgressOr = pending_count + in_progress_count_or;

    const monthly_summary =
      `本月共收到业主诉求 ${total_owner_requests} 件，其中已递交物业经理 ${sent_to_manager_count} 件，已处理 ${resolved_count} 件，仍有 ${pendingOrInProgressOr} 件待处理或处理中。` +
      `完成公开巡检 ${inspection_count} 次，发现需维修或高风险问题 ${repairOrHighInsp} 项。` +
      `公共事项新增 ${new_items} 项，其中长期跟进 ${long_term_items_count} 项，已关闭 ${closed_items_count} 项。`;

    const key_risks =
      [
        pendingOrInProgressOr > 0
          ? `未完成业主诉求共 ${pendingOrInProgressOr} 条（待处理 ${pending_count}，处理中 ${in_progress_count_or}）。`
          : "",
        insp_high_risk_count > 0 ? `巡检中有 ${insp_high_risk_count} 项高风险记录。` : "",
        pm_high_risk_count > 0 ? `公共事项中有 ${pm_high_risk_count} 项高风险。` : "",
        long_term_items_count > 0 ? `公共事项长期跟进 ${long_term_items_count} 项。` : "",
        key_risks_titles_arr.length > 0
          ? `重点关注：${key_risks_titles_arr.join("；")}。`
          : "",
      ].filter(Boolean).join("") ||
      "本月重点风险较少，仍需持续关注业主诉求与巡检整改进度。";

    const long_term_items =
      [
        pendingOrInProgressOr > 0
          ? `业主诉求待跟进：待处理 ${pending_count} 件，处理中 ${in_progress_count_or} 件。`
          : "",
        in_progress_count_insp > 0 ? `巡检处理中事项 ${in_progress_count_insp} 项。` : "",
        long_term_items_count > 0 ? `公共事项长期跟进 ${long_term_items_count} 项。` : "",
      ].filter(Boolean).join("") ||
      "暂无需要单独列明的长期跟进项。";

    const next_month_focus =
      "建议下月重点跟进未完成业主诉求、高风险巡检问题、长期公共事项，并继续公开更新处理进度。";

    const generated_text = {
      monthly_summary,
      key_risks,
      long_term_items,
      next_month_focus,
    };

    const upsertRow = {
      property_id: propertyId,
      report_month: reportMonth,
      status: "draft",
      generated_by: userId,
      owner_request_summary,
      inspection_summary,
      public_matter_summary,
      generated_text,
      monthly_summary: generated_text.monthly_summary,
      key_risks: generated_text.key_risks,
      long_term_items: generated_text.long_term_items,
      next_month_focus: generated_text.next_month_focus,
    };

    const { data: upserted, error: upErr } = await serviceClient
      .from("manager_monthly_reports")
      .upsert(upsertRow, {
        onConflict: "property_id,report_month",
      })
      .select("id")
      .single();

    if (upErr) {
      console.error("[generate-manager-monthly-report] upsert:", upErr);
      return json({ ok: false, error: upErr.message ?? "Upsert failed" }, 500);
    }

    return json({
      ok: true,
      id: upserted?.id,
      reportMonth,
      generated_text,
      owner_request_summary,
      inspection_summary,
      public_matter_summary,
    });
  } catch (error) {
    console.error("[generate-manager-monthly-report] unexpected:", error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});
