import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const MANAGER_EMAIL = "gani.xhepa@dwellproperty.ca";

/** 与 `send-meeting-invite` 会议邀请邮件一致的 logo */
const CLEARSTRATA_EMAIL_LOGO_URL = "https://clearstrata.ai/logo-email-final.png";

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

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildOwnerRequestNoticeHtml(params: {
  propertyName: string;
  propertyId: string;
  unitNo: string;
  submitterName: string;
  submitterEmail: string;
  contact: string;
  createdAt: string;
  requestTitle: string;
  requestContent: string;
  attachmentBlockHtml: string;
}): string {
  const safe = {
    propertyName: escapeHtml(params.propertyName),
    propertyId: escapeHtml(params.propertyId),
    unitNo: escapeHtml(params.unitNo),
    submitterName: escapeHtml(params.submitterName),
    submitterEmail: escapeHtml(params.submitterEmail),
    contact: escapeHtml(params.contact),
    createdAt: escapeHtml(params.createdAt),
    requestTitle: escapeHtml(params.requestTitle),
    requestContent: escapeHtml(params.requestContent),
  };

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>业主诉求递交通知</title>
</head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f9fc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:#16a34a;padding:20px 24px;text-align:center;">
              <div style="margin-bottom:14px;">
                <img src="${CLEARSTRATA_EMAIL_LOGO_URL}" alt="ClearStrata" width="180" height="48" style="height:48px;width:auto;max-width:220px;object-fit:contain;display:block;margin:0 auto;border:0;outline:none;" />
              </div>
              <div style="font-size:20px;font-weight:700;color:#ffffff;line-height:1.35;">
                业主诉求递交通知<span style="font-weight:600;opacity:0.95;"> / Owner Request Submitted</span>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 32px 8px;color:#374151;font-size:15px;line-height:1.6;">
              <p style="margin:0 0 12px;color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">物业信息 / Property</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;">
                <tr>
                  <td style="padding:0 0 10px;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;font-weight:600;">物业名称 / Property name</td>
                  <td style="padding:0 0 10px 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;text-align:right;word-break:break-word;">${safe.propertyName}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;font-weight:600;">物业 ID / Property ID</td>
                  <td style="padding:10px 0 0 12px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827;text-align:right;word-break:break-all;font-family:ui-monospace,monospace;">${safe.propertyId}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;font-weight:600;">房号 / Unit</td>
                  <td style="padding:10px 0 0 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;text-align:right;">${safe.unitNo}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;font-weight:600;">提交人姓名 / Submitter</td>
                  <td style="padding:10px 0 0 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;text-align:right;">${safe.submitterName}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;font-weight:600;">提交人邮箱 / Email</td>
                  <td style="padding:10px 0 0 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;text-align:right;word-break:break-all;">${safe.submitterEmail}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:12px;color:#6b7280;font-weight:600;">联系方式 / Contact</td>
                  <td style="padding:10px 0 0 12px;border-bottom:1px solid #e5e7eb;font-size:14px;color:#111827;text-align:right;word-break:break-word;">${safe.contact}</td>
                </tr>
                <tr>
                  <td style="padding:10px 0 0;font-size:12px;color:#6b7280;font-weight:600;">创建时间 / Created</td>
                  <td style="padding:10px 0 0 12px;font-size:13px;color:#111827;text-align:right;word-break:break-word;">${safe.createdAt}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 28px;color:#374151;font-size:15px;line-height:1.65;">
              <p style="margin:0 0 12px;color:#111827;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">诉求详情 / Request details</p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:18px 20px;margin-bottom:16px;">
                <tr>
                  <td style="padding:0 0 8px;">
                    <p style="margin:0;color:#6b7280;font-size:12px;font-weight:600;">诉求标题 / Title</p>
                    <p style="margin:6px 0 0;color:#111827;font-size:16px;font-weight:700;">${safe.requestTitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 0 0;border-top:1px solid #e5e7eb;">
                    <p style="margin:0;color:#6b7280;font-size:12px;font-weight:600;">诉求正文 / Description</p>
                    <div style="margin-top:10px;white-space:pre-wrap;line-height:1.65;color:#1f2937;font-size:14px;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;">
${safe.requestContent}
                    </div>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;color:#111827;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">附件 / Attachments</p>
              <div style="font-size:14px;color:#374151;line-height:1.6;">
${params.attachmentBlockHtml}
              </div>
              <div style="margin-top:22px;padding:14px 16px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;color:#166534;font-size:13px;line-height:1.65;">
                <strong style="display:block;margin-bottom:6px;color:#15803d;">ClearStrata 说明</strong>
                本诉求已在 ClearStrata 内公开记录，处理进程和业主评价将接受本物业成员公共监督。
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:18px 32px 24px;border-top:1px solid #f3f4f6;background:#fafafa;">
              <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.55;">
                本邮件由 ClearStrata 系统自动发送，请勿直接回复。<br/>
                Automated message from ClearStrata — please do not reply to this address.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function normalizeAttachmentUrls(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return [value];
    }
  }
  return [];
}

serve(async (req) => {
  console.log("[send-owner-request-to-manager] method:", req.method);
  console.log("[send-owner-request-to-manager] origin:", req.headers.get("origin"));

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
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      console.error("[send-owner-request-to-manager] missing env");
      return json({ ok: false, error: "Missing server configuration" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ ok: false, error: "Missing Authorization Bearer token" }, 401);
    }

    let payload: { requestId?: string };
    try {
      payload = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const requestId = payload.requestId;
    if (!requestId) {
      return json({ ok: false, error: "Missing requestId" }, 400);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error("[send-owner-request-to-manager] auth error:", userError);
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const userId = userData.user.id;

    const { data: ownerRequest, error: requestError } = await serviceClient
      .from("property_manager_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !ownerRequest) {
      console.error("[send-owner-request-to-manager] request not found:", requestError);
      return json({ ok: false, error: "Request not found" }, 404);
    }

    const propertyId = ownerRequest.property_id;

    const { data: membership, error: membershipError } = await serviceClient
      .from("property_members")
      .select("status")
      .eq("property_id", propertyId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      console.error("[send-owner-request-to-manager] membership error:", membershipError);
      return json({ ok: false, error: "Failed to verify membership" }, 500);
    }

    if (!membership) {
      return json({ ok: false, error: "Forbidden" }, 403);
    }

    const createdBy = ownerRequest.created_by ? String(ownerRequest.created_by) : "";
    if (!createdBy || createdBy !== userId) {
      return json({ ok: false, error: "Forbidden" }, 403);
    }

    if (String(ownerRequest.status) !== "pending") {
      return json({ ok: false, error: "Request already submitted to manager" }, 403);
    }

    const { data: property } = await serviceClient
      .from("properties")
      .select("name")
      .eq("id", propertyId)
      .maybeSingle();

    const { data: submitterProfile } = await serviceClient
      .from("profiles")
      .select("full_name_en, full_name_zh, email")
      .eq("id", ownerRequest.created_by)
      .maybeSingle();

    const submitterName =
      submitterProfile?.full_name_zh ||
      submitterProfile?.full_name_en ||
      "Unknown submitter";

    const submitterEmail = submitterProfile?.email || "";

    const attachments = normalizeAttachmentUrls(ownerRequest.attachment_urls);

    const propertyIdStr = String(propertyId);
    const propertyDisplayName = property?.name ? String(property.name) : propertyIdStr;

    const attachmentHtmlSafe = attachments.length
      ? `<ul style="margin:0;padding-left:20px;">${attachments
          .map((url) => `<li style="margin:6px 0;"><a href="${escapeHtml(url)}" style="color:#15803d;word-break:break-all;">${escapeHtml(url)}</a></li>`)
          .join("")}</ul>`
      : `<p style="margin:0;color:#6b7280;">无附件 / No attachments</p>`;

    const html = buildOwnerRequestNoticeHtml({
      propertyName: propertyDisplayName,
      propertyId: propertyIdStr,
      unitNo: ownerRequest.unit_no ? String(ownerRequest.unit_no) : "—",
      submitterName,
      submitterEmail: submitterEmail || "—",
      contact: ownerRequest.contact ? String(ownerRequest.contact) : "—",
      createdAt: String(ownerRequest.created_at ?? ""),
      requestTitle: String(ownerRequest.title ?? ""),
      requestContent: String(ownerRequest.content ?? ""),
      attachmentBlockHtml: attachmentHtmlSafe,
    });

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ClearStrata <no-reply@clearstrata.ai>",
        to: [MANAGER_EMAIL],
        subject: "业主诉求递交通知 / Owner Request Submitted — ClearStrata",
        html,
      }),
    });

    const resendText = await resendResponse.text();

    console.log("[send-owner-request-to-manager] resend status:", resendResponse.status);
    console.log("[send-owner-request-to-manager] resend response:", resendText);

    if (!resendResponse.ok) {
      console.error("[send-owner-request-to-manager] resend failed:", resendText);
      return json({ ok: false, error: "Failed to send email", detail: resendText }, 502);
    }

    const { error: updateError } = await serviceClient
      .from("property_manager_requests")
      .update({
        status: "sent",
        sent_to_manager_at: new Date().toISOString(),
        manager_email: MANAGER_EMAIL,
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("[send-owner-request-to-manager] update failed:", updateError);
      return json({ ok: false, error: "Email sent but failed to update request" }, 500);
    }

    return json({
      ok: true,
      message: "Owner request sent to property manager",
      managerEmail: MANAGER_EMAIL,
    });
  } catch (error) {
    console.error("[send-owner-request-to-manager] unexpected error:", error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});
