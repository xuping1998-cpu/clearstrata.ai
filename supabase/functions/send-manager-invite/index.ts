/**
 * Council / property_admin / property admin: send manager invite email via Resend.
 * Mirrors send-meeting-invite: CORS, APP_BASE_URL normalisation, Resend branding.
 *
 * verify_jwt = false — pass user JWT from app; DB via service_role.
 *
 * Secrets: RESEND_API_KEY, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, APP_BASE_URL (optional).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function normalizeBase(raw?: string | null): string {
  const fallback = "https://clearstrata.ai";
  if (!raw) return fallback;
  const cleaned = raw.trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!cleaned) return fallback;
  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  try {
    return new URL(withProtocol).origin;
  } catch {
    console.warn("[send-manager-invite] invalid APP_BASE_URL:", raw);
    return fallback;
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

function apiJson(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const INVITER_ROLES = new Set(["council", "admin", "property_admin"]);

interface Body {
  propertyId?: string;
  property_id?: string;
  managerName?: string;
  manager_name?: string;
  managerEmail?: string;
  manager_email?: string;
}

function buildManagerInviteHtml(params: {
  recipientName: string;
  propertyName: string;
  inviterLabel: string;
  acceptLink: string;
  signInUrl: string;
}): string {
  const safe = {
    recipientName: escapeHtml(params.recipientName),
    propertyName: escapeHtml(params.propertyName),
    inviterLabel: escapeHtml(params.inviterLabel),
  };

  return `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>物业经理邀请 / Property Manager Invitation</title></head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f9fc;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04);">
        <tr><td style="background:#16a34a;padding:16px 20px;text-align:center;">
          <div style="margin-bottom:12px;"><img src="https://clearstrata.ai/logo-email-final.png" alt="ClearStrata" style="height:48px;object-fit:contain;display:block;margin:0 auto;" /></div>
          <div style="font-size:22px;font-weight:600;color:#ffffff;">物业经理邀请 / Property Manager Invitation</div>
        </td></tr>
        <tr><td style="padding:32px 32px 24px;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65;">
            ${safe.recipientName} 您好，<br/><br/>
            你已被邀请成为以下物业的物业经理：<br/>
            Hi ${safe.recipientName}, <br/><br/>
            You have been invited as the Property Manager for the following property:
          </p>
          <table role="presentation" width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 22px;">
            <tr><td style="padding:0 0 12px;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">物业 Property</p>
              <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">${safe.propertyName}</p>
            </td></tr>
            <tr><td style="padding:12px 0 0;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">邀请人 Invited by</p>
              <p style="margin:0;color:#111827;font-size:15px;">${safe.inviterLabel}</p>
            </td></tr>
          </table>
          <p style="margin:16px 0 8px;color:#374151;font-size:14px;">有效期 Valid for: <strong>7 天 · 7 days</strong></p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:24px;">
            <tr><td align="center" style="padding:0 0 12px;">
              <a href="${params.acceptLink}" style="display:inline-block;background:#1D9E75;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">接受邀请 / Accept Invitation</a>
            </td></tr>
            <tr><td align="center" style="padding:0 0 8px;">
              <a href="${params.signInUrl}" style="display:inline-block;background:#ffffff;color:#374151;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;border:1px solid #d1d5db;">仅登录 Continue to sign in</a>
            </td></tr>
          </table>
          <p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
            若按钮无法打开：<a href="${params.acceptLink}" style="color:#1D9E75;word-break:break-all;">${params.acceptLink}</a>
          </p>
          <p style="margin:16px 0 0;color:#9ca3af;font-size:11px;line-height:1.5;">
            如果你不是该物业经理，请忽略此邮件。<br/>
            If you were not expecting this invitation, you can ignore this email.
          </p>
        </td></tr>
        <tr><td style="padding:20px 32px 28px;border-top:1px solid #f3f4f6;background:#fafafa;">
          <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">此邮件由 ClearStrata 系统自动发送。</p>
        </td></tr>
      </table>
    </td></tr></table>
</body></html>`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return apiJson({ ok: false, message: "Method not allowed" }, 405);
  }

  const missing: string[] = [];
  if (!Deno.env.get("RESEND_API_KEY")?.trim()) missing.push("RESEND_API_KEY");
  if (!Deno.env.get("SUPABASE_URL")?.trim()) missing.push("SUPABASE_URL");
  if (!Deno.env.get("SUPABASE_ANON_KEY")?.trim()) missing.push("SUPABASE_ANON_KEY");
  if (!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim()) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (missing.length) {
    return apiJson({ ok: false, message: `missing env: ${missing[0]}`, missing }, 503);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return apiJson({ ok: false, message: "Missing Authorization Bearer" }, 401);
  }

  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch {
    return apiJson({ ok: false, message: "Invalid JSON body" }, 400);
  }

  const propertyId = String(raw.propertyId ?? raw.property_id ?? "").trim();
  const managerName = String(raw.managerName ?? raw.manager_name ?? "").trim() || null;
  const managerEmail = normalizeEmail(String(raw.managerEmail ?? raw.manager_email ?? ""));

  if (!propertyId) return apiJson({ ok: false, message: "propertyId is required" }, 400);
  if (!managerEmail || !managerEmail.includes("@")) {
    return apiJson({ ok: false, message: "managerEmail is invalid" }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
  const supabaseSr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: udata, error: uerr } = await userClient.auth.getUser();
  if (uerr || !udata?.user?.id) {
    return apiJson({ ok: false, message: "Unauthorized" }, 401);
  }
  const userId = udata.user.id;

  const svc = createClient(supabaseUrl, supabaseSr, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: membership, error: mer } = await svc
    .from("property_members")
    .select("role")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (mer) {
    console.error("[send-manager-invite] membership", mer);
    return apiJson({ ok: false, message: "Failed to verify role" }, 500);
  }
  const role = membership?.role as string | undefined;
  if (!role || !INVITER_ROLES.has(role)) {
    return apiJson({ ok: false, message: "Forbidden: only council, admin or property_admin can invite" }, 403);
  }

  const { data: property, error: perr } = await svc
    .from("properties")
    .select("id,name")
    .eq("id", propertyId)
    .maybeSingle();
  if (perr || !property) {
    return apiJson({ ok: false, message: "Property not found" }, 404);
  }

  const { data: inviterProfile } = await svc
    .from("profiles")
    .select("full_name_zh,full_name_en,email")
    .eq("id", userId)
    .maybeSingle();

  const inviterLabel =
    (inviterProfile?.full_name_zh as string)?.trim() ||
    (inviterProfile?.full_name_en as string)?.trim() ||
    (inviterProfile?.email as string)?.trim() ||
    "Property";

  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: pendingRow } = await svc
    .from("manager_invites")
    .select("id")
    .eq("property_id", propertyId)
    .eq("email", managerEmail)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingRow?.id) {
    const { error: upErr } = await svc.from("manager_invites").update({
      token,
      expires_at: expiresAt,
      full_name: managerName,
      invited_by: userId,
      updated_at: new Date().toISOString(),
    }).eq("id", pendingRow.id);
    if (upErr) {
      console.error("[send-manager-invite] update pending", upErr);
      return apiJson({ ok: false, message: upErr.message }, 500);
    }
  } else {
    const { error: insErr } = await svc.from("manager_invites").insert({
      property_id: propertyId,
      email: managerEmail,
      full_name: managerName,
      role: "manager",
      token,
      status: "pending",
      invited_by: userId,
      expires_at: expiresAt,
    });
    if (insErr) {
      console.error("[send-manager-invite] insert", insErr);
      return apiJson({ ok: false, message: insErr.message }, 500);
    }
  }

  const base = normalizeBase(Deno.env.get("APP_BASE_URL"));
  const acceptLink = `${base}/manager-invite?token=${encodeURIComponent(token)}`;
  const signInUrl = `${base}/login?redirect=${encodeURIComponent(`/manager-invite?token=${token}`)}`;

  const displayName =
    managerName ||
    managerEmail.split("@")[0] ||
    "Property Manager";

  const html = buildManagerInviteHtml({
    recipientName: displayName,
    propertyName: String(property.name ?? "Property"),
    inviterLabel,
    acceptLink,
    signInUrl,
  });

  const resend = new Resend(Deno.env.get("RESEND_API_KEY")!.trim());
  try {
    const res = await resend.emails.send({
      from: "ClearStrata <noreply@clearstrata.ai>",
      to: managerEmail,
      subject: "ClearStrata 物业经理邀请 / Property Manager Invitation",
      html,
    });
    if (res.error) {
      console.error("[send-manager-invite] Resend error", res.error);
      return apiJson({ ok: false, message: "Resend failed", detail: res.error }, 502);
    }
    return apiJson({ ok: true, message: "Email sent", email_id: res.data?.id });
  } catch (e) {
    console.error("[send-manager-invite] send threw", e);
    return apiJson({ ok: false, message: "Failed to send email", detail: String(e) }, 500);
  }
});
