import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const MANAGER_EMAIL = "gani.xhepa@dwellproperty.ca";

/** 与会议邀请等品牌邮件一致的 logo（ClearStrata 邮件标准 v1） */
const CLEARSTRATA_EMAIL_LOGO_URL = "https://clearstrata.ai/logo-email-final.png";

/** 与 `send-meeting-invite` 同源：仅从 env 推导公开站点 origin（用于 CTA 链接） */
function normalizeBase(raw?: string | null): string {
  const fallback = "https://clearstrata.ai";
  if (!raw) return fallback;
  const cleaned = raw.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!cleaned) return fallback;
  const withProtocol = /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    console.warn("[send-owner-request-to-manager] invalid APP_BASE_URL:", raw);
    return fallback;
  }
}

function managerTasksOwnerRequestUrl(
  normalizedOrigin: string,
  propertyId: string,
  requestId: string,
): string {
  const origin = normalizedOrigin.replace(/\/+$/, "");
  const u = new URL(`${origin}/manager-tasks`);
  u.searchParams.set("propertyId", propertyId);
  u.searchParams.set("task_type", "owner_request");
  u.searchParams.set("requestId", requestId);
  return u.href;
}

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
  attachments: string[];
  ctaUrl: string;
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
    ctaUrl: escapeHtml(params.ctaUrl),
  };

  const infoCell = (labelZh: string, labelEn: string, value: string) => `
  <td width="50%" valign="top" style="padding:6px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
      <tr>
        <td style="padding:14px 16px;">
          <p style="margin:0 0 6px;color:#64748b;font-size:11px;font-weight:600;line-height:1.35;text-transform:none;letter-spacing:0;">
            ${escapeHtml(labelZh)}<span style="color:#94a3b8;font-weight:500;"> / ${escapeHtml(labelEn)}</span>
          </p>
          <p style="margin:0;color:#1E3A8A;font-size:14px;font-weight:600;line-height:1.45;word-break:break-word;">${value}</p>
        </td>
      </tr>
    </table>
  </td>`;

  const attachmentButtonsHtml = params.attachments.length === 0
    ? `<p style="margin:0;color:#475569;font-size:14px;">无附件</p>`
    : params.attachments
      .map((url, i) => {
        const href = escapeHtml(url);
        const n = i + 1;
        return `
            <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 10px 0;">
              <tr>
                <td>
                  <a href="${href}" target="_blank" rel="noopener noreferrer" style="display:inline-block;background:#EFF6FF;border:1px solid #BFDBFE;color:#1E3A8A;font-size:14px;font-weight:600;text-decoration:none;padding:12px 20px;border-radius:10px;">查看附件 ${n}</a>
                  <span style="font-size:12px;color:#94a3b8;margin-left:8px;display:inline;">View attachment ${n}</span>
                </td>
              </tr>
            </table>`;
      })
      .join("");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>业主诉求通知</title>
  <style type="text/css">
    .cs-owner-cta{background-color:#16A34A!important;}
    .cs-owner-cta:hover{background-color:#15803D!important;}
  </style>
</head>
<body style="margin:0;padding:0;background:#EFF6FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei','Noto Sans SC',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#EFF6FF;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(30,58,138,0.08),0 1px 3px rgba(15,23,42,0.06);">

          <!-- 顶部浅蓝品牌区 -->
          <tr>
            <td style="background:linear-gradient(180deg,#3B82F6 0%,#2563EB 100%);padding:28px 28px 24px;text-align:center;">
              <img src="${CLEARSTRATA_EMAIL_LOGO_URL}" alt="ClearStrata" width="200" height="52" style="height:52px;width:auto;max-width:240px;display:block;margin:0 auto;border:0;outline:none;" />
              <h1 style="margin:20px 0 8px;color:#FFFFFF;font-size:22px;font-weight:700;line-height:1.3;letter-spacing:-0.02em;">
                业主诉求通知<br/><span style="font-size:16px;font-weight:600;opacity:0.95;display:inline-block;margin-top:6px;">Owner Request Notification</span>
              </h1>
              <p style="margin:0;color:rgba(255,255,255,0.92);font-size:14px;font-weight:500;line-height:1.5;">
                物业公开监督事项通知
              </p>
            </td>
          </tr>

          <!-- 诉求大标题 -->
          <tr>
            <td style="padding:28px 28px 8px;color:#475569;background:#EFF6FF;border-bottom:1px solid #BFDBFE;">
              <p style="margin:0;color:#475569;font-size:12px;font-weight:600;letter-spacing:0.06em;text-transform:uppercase;">OWNER REQUEST TITLE</p>
              <p style="margin:10px 0 0;color:#1E3A8A;font-size:24px;font-weight:800;line-height:1.35;letter-spacing:-0.025em;">
                ${safe.requestTitle}
              </p>
            </td>
          </tr>

          <!-- 信息卡 · 浅蓝 -->
          <tr>
            <td style="padding:20px 22px;background:#EFF6FF;border-bottom:1px solid #BFDBFE;">
              <p style="margin:0 0 14px;color:#1E3A8A;font-size:13px;font-weight:700;">关键信息<span style="color:#64748b;font-weight:600;"> · Key facts</span></p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  ${infoCell("物业名称", "Property name", safe.propertyName)}
                  ${infoCell("物业 ID", "Property ID", `<span style="font-size:13px;font-family:ui-monospace,Menlo,Consolas,monospace;">${safe.propertyId}</span>`)}
                </tr>
                <tr>
                  ${infoCell("房号", "Unit no.", safe.unitNo)}
                  ${infoCell("提交人", "Submitted by", safe.submitterName)}
                </tr>
                <tr>
                  ${infoCell("提交人邮箱", "Submitter email", safe.submitterEmail)}
                  ${infoCell("联系方式", "Contact", safe.contact)}
                </tr>
                <tr>
                  <td colspan="2" valign="top" style="padding:6px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:12px;">
                      <tr>
                        <td style="padding:14px 16px;">
                          <p style="margin:0 0 6px;color:#64748b;font-size:11px;font-weight:600;line-height:1.35;">
                            提交时间<span style="color:#94a3b8;"> / Submitted at</span>
                          </p>
                          <p style="margin:0;color:#1E3A8A;font-size:14px;font-weight:600;line-height:1.45;word-break:break-word;">${safe.createdAt}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- 诉求内容卡 -->
          <tr>
            <td style="padding:28px 28px;color:#475569;background:#FFFFFF;">
              <p style="margin:0 0 12px;color:#1E3A8A;font-size:15px;font-weight:700;">业主诉求内容<span style="color:#64748b;font-weight:600;font-size:14px;"> / Request detail</span></p>
              <div style="background:#FFFFFF;border:1px solid #E2E8F0;border-radius:14px;padding:22px 24px;line-height:1.75;color:#475569;font-size:15px;white-space:pre-wrap;text-align:left;">${safe.requestContent}</div>
            </td>
          </tr>

          <!-- 附件区 -->
          <tr>
            <td style="padding:0 28px 28px;background:#FFFFFF;">
              <p style="margin:0 0 12px;color:#1E3A8A;font-size:15px;font-weight:700;">附件<span style="color:#64748b;font-weight:600;font-size:14px;"> / Attachments</span></p>
              <div>${attachmentButtonsHtml}</div>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 28px 36px;background:#EFF6FF;text-align:center;border-top:1px solid #BFDBFE;">
              <table role="presentation" cellspacing="0" cellpadding="0" align="center" style="margin:0 auto;">
                <tr>
                  <td style="border-radius:12px;background:#16A34A;mso-padding-alt:0;">
                    <a class="cs-owner-cta" href="${safe.ctaUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;padding:16px 32px;border-radius:12px;background:#16A34A;line-height:1.2;mso-line-height-rule:exactly;font-family:inherit;">
                      打开 ClearStrata 处理诉求
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:14px 0 0;color:#64748b;font-size:12px;line-height:1.5;">Opens ClearStrata to handle this owner request securely.</p>
            </td>
          </tr>

          <!-- 底部说明 -->
          <tr>
            <td style="padding:22px 28px;background:#F8FAFC;border-top:1px solid #E2E8F0;text-align:center;">
              <p style="margin:0;color:#475569;font-size:13px;line-height:1.7;">
                此邮件由 ClearStrata 自动发送。<br/>
                业主诉求处理过程将向全体业主公开监督，物业经理的处理结果也将向业主公开展示。
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

    const normalizedBaseUrl = normalizeBase(Deno.env.get("APP_BASE_URL"));
    const ctaUrl = managerTasksOwnerRequestUrl(
      normalizedBaseUrl,
      propertyIdStr,
      String(requestId),
    );

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
      attachments,
      ctaUrl,
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
        subject: "业主诉求通知 / Owner Request Notification — ClearStrata",
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
