/**
 * Council / admin / property_admin / manager: send direct member notification.
 * Writes `public.user_notifications` and delivers email via Resend.
 * Both must succeed before returning `{ ok: true }`.
 *
 * verify_jwt = false — Authorization Bearer JWT verified inside handler (anon client).
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

const APP_BASE_DEFAULT_ORIGIN = "https://app.clearstrata.ai";

const SENDER_ROLES = new Set([
  "council",
  "admin",
  "property_admin",
  "manager",
]);

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function logFullCatchError(error: unknown): void {
  const err = error as { message?: string; stack?: string; cause?: unknown };
  console.error("❌ send-member-notification FULL ERROR", {
    message: err?.message,
    stack: err?.stack,
    cause: err?.cause,
    error,
  });
}

function normalizeAppBaseUrl(raw?: string | null): string {
  const cleaned = (raw ?? "").trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!cleaned) {
    return APP_BASE_DEFAULT_ORIGIN;
  }
  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  let origin: string;
  try {
    origin = new URL(withProtocol).origin;
  } catch {
    console.warn(
      "[send-member-notification] invalid APP_BASE_URL, fallback:",
      APP_BASE_DEFAULT_ORIGIN,
      cleaned,
    );
    return APP_BASE_DEFAULT_ORIGIN;
  }
  try {
    const host = new URL(origin).hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "clearstrata.ai" || host === "www.clearstrata.ai") {
      return "https://app.clearstrata.ai";
    }
  } catch {
    return APP_BASE_DEFAULT_ORIGIN;
  }
  return origin;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface Body {
  property_id?: string;
  propertyId?: string;
  recipient_user_id?: string;
  recipientUserId?: string;
  title?: string;
  message?: string;
  priority?: string;
}

function buildMemberNotificationHtml(params: {
  title: string;
  message: string;
  openLink: string;
  logoUrl: string;
}): string {
  const safe = {
    title: escapeHtml(params.title),
    message: escapeHtml(params.message),
    logoUrl: escapeHtml(params.logoUrl),
  };

  return `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>ClearStrata 通知 / Notification</title></head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f9fc;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04);">
        <tr><td style="background:#35C3D6;padding:16px 20px;text-align:center;">
          <div style="margin-bottom:12px;"><img src="${safe.logoUrl}" alt="ClearStrata" style="height:48px;object-fit:contain;display:block;margin:0 auto;" /></div>
          <div style="font-size:22px;font-weight:600;color:#ffffff;">ClearStrata 通知 / Notification</div>
        </td></tr>
        <tr><td style="padding:32px 32px 24px;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:600;">标题 / Title</p>
          <p style="margin:0 0 20px;color:#111827;font-size:16px;font-weight:600;line-height:1.5;">${safe.title}</p>
          <p style="margin:0 0 8px;color:#6b7280;font-size:12px;font-weight:600;">内容 / Message</p>
          <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.65;white-space:pre-wrap;">${safe.message}</p>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr><td align="center" style="padding:0 0 12px;">
              <a href="${params.openLink}" style="display:inline-block;background:#35C3D6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">打开 ClearStrata / Open ClearStrata</a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
            若按钮无法打开：<a href="${params.openLink}" style="color:#35C3D6;word-break:break-all;">${params.openLink}</a>
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
    return json({ ok: false, message: "Method not allowed" }, 405);
  }

  const missing: string[] = [];
  if (!Deno.env.get("RESEND_API_KEY")?.trim()) missing.push("RESEND_API_KEY");
  if (!Deno.env.get("SUPABASE_URL")?.trim()) missing.push("SUPABASE_URL");
  if (!Deno.env.get("SUPABASE_ANON_KEY")?.trim()) missing.push("SUPABASE_ANON_KEY");
  if (!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim()) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }
  if (missing.length) {
    console.error("❌ send-member-notification missing env", { missing });
    return json({ ok: false, message: `missing env: ${missing[0]}`, missing }, 503);
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json({ ok: false, message: "Missing Authorization Bearer" }, 401);
  }

  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch (error) {
    logFullCatchError(error);
    const msg = error instanceof Error ? error.message : "unknown_error";
    return json({ ok: false, error: msg, message: msg }, 500);
  }

  const propertyId = String(raw.property_id ?? raw.propertyId ?? "").trim();
  const recipientUserId = String(
    raw.recipient_user_id ?? raw.recipientUserId ?? "",
  ).trim();
  const title = String(raw.title ?? "").trim();
  const message = String(raw.message ?? "").trim();

  if (!propertyId) {
    return json({ ok: false, message: "property_id is required" }, 400);
  }
  if (!recipientUserId) {
    return json({ ok: false, message: "recipient_user_id is required" }, 400);
  }
  if (!title || !message) {
    return json({ ok: false, message: "title and message are required" }, 400);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseSr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: udata, error: uerr } = await userClient.auth.getUser();
    if (uerr || !udata?.user?.id) {
      return json({
        ok: false,
        message: "Unauthorized",
        error: uerr?.message ?? "Unauthorized",
      }, 401);
    }
    const senderId = udata.user.id;

    const svc = createClient(supabaseUrl, supabaseSr, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: membership, error: mer } = await svc
      .from("property_members")
      .select("role")
      .eq("property_id", propertyId)
      .eq("user_id", senderId)
      .eq("status", "active")
      .maybeSingle();

    if (mer) {
      return json({
        ok: false,
        message: mer.message ?? "Failed to verify role",
        error: mer.message ?? "unknown",
      }, 500);
    }

    const senderRole = membership?.role as string | undefined;
    if (!senderRole || !SENDER_ROLES.has(senderRole)) {
      return json({
        ok: false,
        code: "not_authorized",
        message: "Forbidden: insufficient role to send member notifications",
      }, 403);
    }

    const { data: recipientMember, error: rmErr } = await svc
      .from("property_members")
      .select("user_id")
      .eq("property_id", propertyId)
      .eq("user_id", recipientUserId)
      .eq("status", "active")
      .maybeSingle();

    if (rmErr) {
      return json({
        ok: false,
        message: rmErr.message ?? "recipient lookup failed",
        error: rmErr.message ?? "unknown",
      }, 500);
    }
    if (!recipientMember) {
      return json({
        ok: false,
        code: "recipient_not_member",
        message: "Recipient is not an active member of this property",
      }, 404);
    }

    const { data: recipientProfile, error: rpErr } = await svc
      .from("profiles")
      .select("email, full_name_zh, full_name_en")
      .eq("id", recipientUserId)
      .maybeSingle();

    if (rpErr) {
      return json({
        ok: false,
        message: rpErr.message ?? "profile lookup failed",
        error: rpErr.message ?? "unknown",
      }, 500);
    }

    const recipientEmail = String(recipientProfile?.email ?? "").trim().toLowerCase();
    if (!recipientEmail || !recipientEmail.includes("@")) {
      return json({
        ok: false,
        code: "recipient_no_email",
        message: "Recipient has no valid email address",
      }, 400);
    }

    const { data: inserted, error: insErr } = await svc
      .from("user_notifications")
      .insert({
        user_id: recipientUserId,
        type: "direct_message",
        title,
        message,
        link: null,
        is_read: false,
        related_property_id: propertyId,
      })
      .select("id")
      .maybeSingle();

    if (insErr || !inserted?.id) {
      console.error("❌ send-member-notification user_notifications insert", insErr);
      return json({
        ok: false,
        code: "notification_insert_failed",
        message: insErr?.message ?? "Failed to create notification",
        error: insErr?.message ?? "insert_failed",
      }, 500);
    }

    const notificationId = inserted.id as string;
    const normalizedBaseUrl = normalizeAppBaseUrl(Deno.env.get("APP_BASE_URL"));
    const logoUrl = `${normalizedBaseUrl}/logo-email.png`;
    const openLink =
      `${normalizedBaseUrl}/?propertyId=${encodeURIComponent(propertyId)}`;

    const html = buildMemberNotificationHtml({
      title,
      message,
      openLink,
      logoUrl,
    });

    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!.trim());
    const res = await resend.emails.send({
      from: "ClearStrata <noreply@clearstrata.ai>",
      to: recipientEmail,
      subject: `[ClearStrata] ${title}`,
      html,
    });

    if (res.error) {
      console.error("❌ send-member-notification Resend rejected", res.error);
      await svc.from("user_notifications").delete().eq("id", notificationId);
      const errMsg =
        typeof (res.error as { message?: string }).message === "string"
          ? (res.error as { message?: string }).message
          : "Resend failed";
      return json({
        ok: false,
        code: "email_failed",
        message: "Notification created but email delivery failed",
        error: errMsg,
      }, 502);
    }

    console.log("✅ send-member-notification success", {
      notification_id: notificationId,
      email_id: res.data?.id,
      to: recipientEmail,
      property_id: propertyId,
    });

    return json({
      ok: true,
      notification_id: notificationId,
      email_id: res.data?.id,
    }, 200);
  } catch (error) {
    logFullCatchError(error);
    const msg = error instanceof Error ? error.message : "unknown_error";
    return json({ ok: false, error: msg, message: msg }, 500);
  }
});
