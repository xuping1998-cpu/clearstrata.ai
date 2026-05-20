/**
 * Join request approved/rejected emails via Resend (same stack as send-meeting-invite).
 * Verifies caller is property staff and join_requests row matches decision before sending.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    return new Response("ok", { status: 200, headers: corsHeaders });
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
    const safeName = hasName ? escapeHtml(jr.full_name!.trim()) : "";
    const zhGreetingLine = hasName ? `${safeName}，您好：` : "您好：";
    const enGreetingLine = hasName ? `Hello ${safeName},` : "Hello,";

    const appBase =
      Deno.env.get("APP_BASE_URL")?.replace(/\/$/, "") || "https://www.clearstrata.ai";
    const logoUrl = `${appBase}/logo-email.png`;
    const enterUrl = `${appBase}/?propertyId=${encodeURIComponent(jr.property_id as string)}`;
    const reapplyUrl = `${appBase}/entry?propertyId=${encodeURIComponent(jr.property_id as string)}`;

    const approved = decision === "approved";
    const reason =
      !approved && typeof jr.rejection_reason === "string" && jr.rejection_reason.trim()
        ? jr.rejection_reason.trim()
        : "";

    const safeProperty = escapeHtml(propertyName);
    const titleZh = approved ? "申请已通过" : "申请未通过";
    const titleEn = approved ? "Application Approved" : "Application Not Approved";
    const introZh = approved
      ? `恭喜！您已获准加入 <strong>${safeProperty}</strong>。`
      : `很抱歉，您加入 <strong>${safeProperty}</strong> 的申请未通过审核。`;
    const introEn = approved
      ? `Congratulations! Your request to join <strong>${safeProperty}</strong> has been approved.`
      : `We&rsquo;re sorry. Your request to join <strong>${safeProperty}</strong> was not approved.`;
    const ctaZh = approved ? "进入物业" : "重新提交申请";
    const ctaEn = approved ? "Enter Property" : "Reapply";
    const ctaUrl = approved ? enterUrl : reapplyUrl;
    const reasonBlock = reason
      ? `<tr><td style="padding:0 32px 4px;">
                <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:14px 16px;color:#991b1b;font-size:14px;line-height:1.6;">
                  <p style="margin:0 0 4px;font-weight:600;">原因 / Reason</p>
                  <p style="margin:0;white-space:pre-wrap;">${escapeHtml(reason)}</p>
                </div>
              </td></tr>`
      : "";

    const subject = approved
      ? "申请已通过 / Application Approved"
      : "申请未通过 / Application Not Approved";

    const htmlLang = locale === "en" ? "en" : "zh";
    const html = `<!DOCTYPE html>
<html lang="${htmlLang}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${titleZh} / ${titleEn}</title>
</head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f9fc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:#28C7D9;padding:24px 20px;text-align:center;">
              <div style="margin-bottom:12px;">
                <img
                  src="${escapeHtml(logoUrl)}"
                  alt="ClearStrata"
                  style="height:48px;object-fit:contain;display:block;margin:0 auto;"
                />
              </div>
              <div style="font-size:20px;font-weight:600;color:#ffffff;letter-spacing:0.02em;">
                加入申请结果 / Join Request Update
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 8px;">
              <p style="margin:0 0 16px;color:#111827;font-size:18px;font-weight:600;line-height:1.4;">
                ${titleZh} / ${titleEn}
              </p>
              <p style="margin:0 0 18px;color:#374151;font-size:15px;line-height:1.7;">
                ${zhGreetingLine}<br />${enGreetingLine}
              </p>
              <p style="margin:0 0 12px;color:#374151;font-size:15px;line-height:1.7;">
                ${introZh}
              </p>
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;">
                ${introEn}
              </p>
            </td>
          </tr>
          ${reasonBlock}
          <tr>
            <td style="padding:18px 32px 8px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="${ctaUrl}" style="display:inline-block;background:#28C7D9;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">${ctaZh} / ${ctaEn}</a>
                  </td>
                </tr>
              </table>
              <p style="margin:18px 0 0;color:#6b7280;font-size:12px;line-height:1.6;text-align:center;">
                <a href="${ctaUrl}" style="color:#0e8ea0;word-break:break-all;">${ctaUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 32px 28px;border-top:1px solid #f3f4f6;background:#fafafa;">
              <p style="margin:0 0 6px;color:#6b7280;font-size:13px;line-height:1.6;">
                如有疑问，请联系物业管理员。
              </p>
              <p style="margin:0;color:#6b7280;font-size:13px;line-height:1.6;">
                Questions? Please contact your property administrator.
              </p>
              <p style="margin:12px 0 0;color:#9ca3af;font-size:11px;line-height:1.5;">
                此邮件由 ClearStrata 系统自动发送，请勿直接回复。 / This is an automated message from ClearStrata. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

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
