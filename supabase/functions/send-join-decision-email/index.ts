/**
 * Join request approved/rejected emails via Resend (same stack as send-meeting-invite).
 * Verifies caller is property staff and join_requests row matches decision before sending.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function resolveFromHeader(): string | { error: string; code: string } {
  const fromEmailRaw = Deno.env.get("RESEND_FROM_EMAIL");
  if (fromEmailRaw !== undefined) {
    const fromEmail = fromEmailRaw.trim();
    if (fromEmail === "") {
      return {
        error: "RESEND_FROM_EMAIL is set but empty.",
        code: "INVALID_RESEND_FROM_EMAIL",
      };
    }
    if (!EMAIL_RE.test(fromEmail)) {
      return {
        error: "RESEND_FROM_EMAIL must be a valid email address.",
        code: "INVALID_RESEND_FROM_EMAIL",
      };
    }
    return `ClearStrata <${fromEmail}>`;
  }
  const full = Deno.env.get("RESEND_FROM")?.trim();
  if (full) return full;
  const domain = Deno.env.get("RESEND_SENDER_DOMAIN")?.trim();
  if (domain) {
    if (!domain.includes("@") || !EMAIL_RE.test(domain)) {
      return {
        error: "RESEND_SENDER_DOMAIN must be a full email address.",
        code: "INVALID_RESEND_SENDER_DOMAIN",
      };
    }
    return `ClearStrata <${domain}>`;
  }
  return "ClearStrata <onboarding@resend.dev>";
}

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse({ error: "Invalid session" }, 401);
    }
    const reviewerId = userData.user.id;

    let body: { join_request_id?: string; decision?: string; locale?: string };
    try {
      body = await req.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const join_request_id = body.join_request_id?.trim();
    const decision = body.decision as "approved" | "rejected" | undefined;
    const locale = body.locale === "en" ? "en" : "zh";

    if (!join_request_id || !decision || !["approved", "rejected"].includes(decision)) {
      return jsonResponse(
        { error: "join_request_id and decision (approved|rejected) required" },
        400,
      );
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: jr, error: jrErr } = await admin
      .from("join_requests")
      .select("id, property_id, user_id, email, full_name, status, rejection_reason")
      .eq("id", join_request_id)
      .maybeSingle();

    if (jrErr || !jr) {
      return jsonResponse({ error: "Join request not found" }, 404);
    }

    const expectedStatus = decision === "approved" ? "approved" : "rejected";
    if (jr.status !== expectedStatus) {
      return jsonResponse(
        { error: "Join request status mismatch", code: "status_mismatch" },
        403,
      );
    }

    const { data: staffRow } = await admin
      .from("property_members")
      .select("role")
      .eq("property_id", jr.property_id)
      .eq("user_id", reviewerId)
      .eq("status", "active")
      .maybeSingle();

    const okStaff =
      staffRow &&
      ["council", "admin", "manager", "property_admin"].includes(staffRow.role as string);
    if (!okStaff) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    let recipientEmail = typeof jr.email === "string" ? jr.email.trim() : "";
    if (!recipientEmail && jr.user_id) {
      const { data: prof } = await admin
        .from("profiles")
        .select("email")
        .eq("id", jr.user_id)
        .maybeSingle();
      if (prof?.email) recipientEmail = String(prof.email).trim();
    }

    if (!recipientEmail) {
      return jsonResponse({ error: "No recipient email", code: "no_email" }, 422);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")?.trim();
    if (!resendApiKey) {
      return jsonResponse(
        { error: "RESEND_API_KEY missing", code: "MISSING_RESEND_API_KEY" },
        503,
      );
    }

    const fromResolved = resolveFromHeader();
    if (typeof fromResolved !== "string") {
      return jsonResponse(
        { error: fromResolved.error, code: fromResolved.code },
        503,
      );
    }

    const { data: prop } = await admin
      .from("properties")
      .select("name")
      .eq("id", jr.property_id)
      .maybeSingle();
    const propertyName = (prop?.name as string) || (locale === "en" ? "Property" : "物业");

    const hasName = typeof jr.full_name === "string" && jr.full_name.trim();
    const displayName = hasName
      ? jr.full_name!.trim()
      : locale === "en"
        ? "there"
        : "";
    const zhGreetingLine = hasName
      ? `${escapeHtml(jr.full_name!.trim())}，您好：`
      : "您好：";
    const enGreetingLine = hasName ? `Hello ${escapeHtml(displayName)},` : "Hello,";

    const appBase =
      Deno.env.get("APP_BASE_URL")?.replace(/\/$/, "") || "https://www.clearstrata.ai";
    const signInUrl = `${appBase}/`;

    let subject: string;
    let html: string;

    if (decision === "approved") {
      if (locale === "en") {
        subject = "Your property access request has been approved";
        html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<div style="background:linear-gradient(135deg,#1D9E75,#178a66);padding:28px 24px;">
<h1 style="margin:0;color:#fff;font-size:20px;">Request approved</h1></div>
<div style="padding:24px;color:#374151;font-size:15px;line-height:1.6;">
<p>${enGreetingLine}</p>
<p>Your request to join <strong>${escapeHtml(propertyName)}</strong> has been approved.</p>
<p>You can now sign in to ClearStrata and access this property.</p>
<p><a href="${signInUrl}" style="display:inline-block;background:#1D9E75;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Open ClearStrata</a></p>
<p style="color:#9ca3af;font-size:12px;margin-top:24px;">— ClearStrata</p>
</div></div></body></html>`;
      } else {
        subject = "您的物业加入申请已通过";
        html = `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<div style="background:linear-gradient(135deg,#1D9E75,#178a66);padding:28px 24px;">
<h1 style="margin:0;color:#fff;font-size:20px;">申请已通过</h1></div>
<div style="padding:24px;color:#374151;font-size:15px;line-height:1.7;">
<p>${zhGreetingLine}</p>
<p>您加入 <strong>${escapeHtml(propertyName)}</strong> 的申请已通过审核。</p>
<p>您现在可以登录 ClearStrata，进入该物业的专属空间。</p>
<p>如您已登录，请刷新页面后重试。<br/>如尚未登录，请使用申请时的邮箱登录。</p>
<p><a href="${signInUrl}" style="display:inline-block;background:#1D9E75;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">前往登录</a></p>
<p style="color:#9ca3af;font-size:12px;margin-top:24px;">—— ClearStrata</p>
</div></div></body></html>`;
      }
    } else {
      const reason =
        typeof jr.rejection_reason === "string" && jr.rejection_reason.trim()
          ? jr.rejection_reason.trim()
          : "";
      if (locale === "en") {
        subject = "Your property access request was not approved";
        html = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<div style="background:#f3f4f6;padding:16px 24px;border-bottom:1px solid #e5e7eb;">
<h1 style="margin:0;color:#111827;font-size:18px;">Request not approved</h1></div>
<div style="padding:24px;color:#374151;font-size:15px;line-height:1.6;">
<p>${enGreetingLine}</p>
<p>Your request to join <strong>${escapeHtml(propertyName)}</strong> was not approved.</p>
${reason ? `<p style="background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:8px;">${escapeHtml(reason)}</p>` : ""}
<p>If you have questions, please contact your property administrator.</p>
<p style="color:#9ca3af;font-size:12px;margin-top:24px;">— ClearStrata</p>
</div></div></body></html>`;
      } else {
        subject = "您的物业加入申请未通过";
        html = `<!DOCTYPE html><html lang="zh"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
<div style="background:#f3f4f6;padding:16px 24px;border-bottom:1px solid #e5e7eb;">
<h1 style="margin:0;color:#111827;font-size:18px;">申请未通过</h1></div>
<div style="padding:24px;color:#374151;font-size:15px;line-height:1.7;">
<p>${zhGreetingLine}</p>
<p>很抱歉，您加入 <strong>${escapeHtml(propertyName)}</strong> 的申请未通过审核。</p>
${reason ? `<p style="background:#fef2f2;border:1px solid #fecaca;padding:12px;border-radius:8px;">原因：${escapeHtml(reason)}</p>` : ""}
<p>如有疑问，请联系物业管理员。</p>
<p style="color:#9ca3af;font-size:12px;margin-top:24px;">—— ClearStrata</p>
</div></div></body></html>`;
      }
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromResolved,
        to: [recipientEmail],
        subject,
        html,
      }),
    });

    const resendData = (await resendRes.json()) as Record<string, unknown>;
    if (!resendRes.ok) {
      console.error("send-join-decision-email Resend error", resendRes.status, resendData);
      return jsonResponse(
        {
          error: typeof resendData.message === "string"
            ? resendData.message
            : "Resend error",
          code: "RESEND_API_ERROR",
          details: resendData,
        },
        502,
      );
    }

    return jsonResponse({ success: true, email_id: resendData.id }, 200);
  } catch (err) {
    console.error("send-join-decision-email", err);
    return jsonResponse({ error: String(err), code: "INTERNAL_ERROR" }, 500);
  }
});

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
