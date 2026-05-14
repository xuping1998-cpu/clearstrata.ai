/**
 * Meeting invitation emails via Resend.
 *
 * Secrets (Supabase Dashboard → Project Settings → Edge Functions → Secrets):
 * - APP_BASE_URL (optional): public app origin; path/query stripped. Empty/unset or marketing host
 *   `clearstrata.ai` → https://clearstrataaiserena.vercel.app (current test app).
 * - RESEND_API_KEY (required)
 * - From address is fixed in code: ClearStrata <noreply@clearstrata.ai> (must be verified in Resend).
 * Redeploy after changing secrets: `supabase functions deploy send-meeting-invite`
 * Auth: do not rely on `Authorization` user JWT (ES256 can cause 401 at the gateway).
 * Use `supabase/config.toml` `[functions.send-meeting-invite] verify_jwt = false` and call
 * `invoke` with the anon key in `Authorization` from the app. DB access uses service role only.
 *
 * Product: until Resend production access is enabled, use only Resend-approved test recipients
 * to verify the flow; external addresses will get RESEND_TESTING_RESTRICTION until domain is verified.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const APP_BASE_DEFAULT_ORIGIN = "https://clearstrataaiserena.vercel.app";

/** Public web origin for email links; never points marketing `clearstrata.ai` at test app. */
function normalizeAppBaseUrl(raw?: string | null): string {
  const value = (raw ?? "").trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!value) return APP_BASE_DEFAULT_ORIGIN;

  const withProtocol =
    value.startsWith("http://") || value.startsWith("https://")
      ? value
      : `https://${value}`;

  try {
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "clearstrata.ai") {
      return APP_BASE_DEFAULT_ORIGIN;
    }

    return url.origin;
  } catch {
    console.warn("[send-meeting-invite] invalid APP_BASE_URL:", raw);
    return APP_BASE_DEFAULT_ORIGIN;
  }
}

/** Request body: snake_case or camelCase (invoke from app uses camelCase). */
interface InviteRequestBody {
  meeting_id?: string;
  meetingId?: string;
  user_id?: string;
  userId?: string;
  property_id?: string;
  propertyId?: string;
  locale?: "en" | "zh";
  user_email?: string;
}

/** First non-empty time string: `start_time` → `meeting_time` → `scheduled_at` (DB canonical). */
function pickMeetingStartRaw(meeting: Record<string, unknown>): string | null {
  const start_time = meeting["start_time"];
  const meeting_time = meeting["meeting_time"];
  const scheduled_at = meeting["scheduled_at"];

  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() !== "" ? v.trim() : null;

  const meetingTimeRaw =
    str(start_time) || str(meeting_time) || str(scheduled_at);

  return meetingTimeRaw ?? null;
}

function formatWhenZhFromDate(startTime: Date): string {
  return `${startTime.getFullYear()}年${startTime.getMonth() + 1}月${startTime.getDate()}日 ${startTime.getHours()}:${
    String(startTime.getMinutes()).padStart(2, "0")
  }`;
}

function formatWhenEnFromDate(startTime: Date): string {
  return startTime.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Meeting start time for display (locale picks zh vs en formatting). */
function getMeetingEmailDisplay(
  meeting: Record<string, unknown>,
  locale: "en" | "zh",
): {
  formattedTimeZh: string;
  formattedTimeEn: string;
  formattedTime: string;
} {
  const startRaw = pickMeetingStartRaw(meeting);
  let formattedTimeZh = "待定";
  let formattedTimeEn = "TBD";
  if (startRaw) {
    const startTime = new Date(startRaw);
    if (!Number.isNaN(startTime.getTime())) {
      formattedTimeZh = formatWhenZhFromDate(startTime);
      formattedTimeEn = formatWhenEnFromDate(startTime);
    }
  }
  const formattedTime = locale === "en" ? formattedTimeEn : formattedTimeZh;
  return { formattedTimeZh, formattedTimeEn, formattedTime };
}

/** zh: title_zh > title > 默认；en: title_en > title > 默认 */
function resolveMeetingTitle(m: Record<string, unknown>, locale: "en" | "zh"): string {
  const generic = typeof m.title === "string" && m.title.trim() ? m.title.trim() : "";
  if (locale === "zh") {
    const zh = typeof m.title_zh === "string" && m.title_zh.trim() ? m.title_zh.trim() : "";
    if (zh) return zh;
    if (generic) return generic;
    return "会议通知";
  }
  const en = typeof m.title_en === "string" && m.title_en.trim() ? m.title_en.trim() : "";
  if (en) return en;
  if (generic) return generic;
  return "Meeting Invitation";
}

function formatDurationText(m: Record<string, unknown>, locale: "en" | "zh"): string {
  const raw = m.duration_minutes ?? m.duration;
  const n = typeof raw === "number" && Number.isFinite(raw) ? raw : null;
  if (n === null) return "—";
  return locale === "en" ? `${n} minutes` : `${n} 分钟`;
}

/** 有 location 显示；否则中英文 fallback */
function formatLocationText(m: Record<string, unknown>, locale: "en" | "zh"): string {
  const loc = typeof m.location === "string" && m.location.trim() ? m.location.trim() : "";
  if (loc) return loc;
  return locale === "en" ? "Online / To be confirmed" : "线上 / 待确认";
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Stripe/Notion-style invitation; all copy from params (plain HTML, no Resend `data`). */
interface InviteEmailHtmlParams {
  locale: "en" | "zh";
  recipientName: string;
  meetingTitle: string;
  formattedTime: string;
  durationText: string;
  locationText: string;
  organizerName: string;
  inviteLink: string;
  signInUrl: string;
  logoUrl: string;
}

function buildEmailHtml(p: InviteEmailHtmlParams): string {
  const {
    locale,
    recipientName,
    meetingTitle,
    formattedTime,
    durationText,
    locationText,
    organizerName,
    inviteLink,
    signInUrl,
    logoUrl,
  } = p;

  const safe = {
    recipientName: escapeHtml(recipientName),
    meetingTitle: escapeHtml(meetingTitle),
    formattedTime: escapeHtml(formattedTime),
    durationText: escapeHtml(durationText),
    locationText: escapeHtml(locationText),
    organizerName: escapeHtml(organizerName),
    logoUrl: escapeHtml(logoUrl),
  };

  if (locale === "en") {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Meeting invitation</title>
</head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f9fc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:#16a34a;padding:16px 20px;text-align:center;">
              <div style="margin-bottom:12px;">
                <img
                  src="${safe.logoUrl}"
                  alt="ClearStrata"
                  style="height:48px;object-fit:contain;display:block;margin:0 auto;"
                />
              </div>
              <div style="font-size:22px;font-weight:600;color:#ffffff;">
                会议邀请 / Meeting Invitation
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65;">
                Hi ${safe.recipientName},<br /><br />
                You&rsquo;ve been invited to a meeting. Details are below.
              </p>
              <table role="presentation" width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 22px;">
                <tr><td style="padding:0 0 12px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Meeting</p>
                  <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">${safe.meetingTitle}</p>
                </td></tr>
                <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">When</p>
                  <p style="margin:0;color:#111827;font-size:15px;">${safe.formattedTime}</p>
                </td></tr>
                <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Duration</p>
                  <p style="margin:0;color:#111827;font-size:15px;">${safe.durationText}</p>
                </td></tr>
                <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Location</p>
                  <p style="margin:0;color:#111827;font-size:15px;">${safe.locationText}</p>
                </td></tr>
                <tr><td style="padding:12px 0 0;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">Organizer</p>
                  <p style="margin:0;color:#111827;font-size:15px;">${safe.organizerName}</p>
                </td></tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;">
                <tr>
                  <td align="center" style="padding:0 0 12px;">
                    <a href="${inviteLink}" style="display:inline-block;background:#1D9E75;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">View meeting &middot; Enter app</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 0 8px;">
                    <a href="${signInUrl}" style="display:inline-block;background:#ffffff;color:#374151;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;border:1px solid #d1d5db;">Sign in only</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
                If the button doesn&rsquo;t work, copy and paste this link into your browser:<br />
                <a href="${inviteLink}" style="color:#1D9E75;word-break:break-all;">${inviteLink}</a>
              </p>
              <p style="margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
                Sign-in only: <a href="${signInUrl}" style="color:#1D9E75;word-break:break-all;">${signInUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #f3f4f6;background:#fafafa;">
              <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
                This is an automated message from ClearStrata. Please do not reply to this email.
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

  return `<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>会议邀请</title>
</head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f9fc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04);">
          <tr>
            <td style="background:#16a34a;padding:16px 20px;text-align:center;">
              <div style="margin-bottom:12px;">
                <img
                  src="${safe.logoUrl}"
                  alt="ClearStrata"
                  style="height:48px;object-fit:contain;display:block;margin:0 auto;"
                />
              </div>
              <div style="font-size:22px;font-weight:600;color:#ffffff;">
                会议邀请 / Meeting Invitation
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65;">
                ${safe.recipientName} 您好，<br /><br />
                您已被邀请参加以下会议，详情如下。
              </p>
              <table role="presentation" width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 22px;">
                <tr><td style="padding:0 0 12px;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">会议</p>
                  <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">${safe.meetingTitle}</p>
                </td></tr>
                <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">时间</p>
                  <p style="margin:0;color:#111827;font-size:15px;">${safe.formattedTime}</p>
                </td></tr>
                <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">时长</p>
                  <p style="margin:0;color:#111827;font-size:15px;">${safe.durationText}</p>
                </td></tr>
                <tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">地点</p>
                  <p style="margin:0;color:#111827;font-size:15px;">${safe.locationText}</p>
                </td></tr>
                <tr><td style="padding:12px 0 0;">
                  <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">组织者</p>
                  <p style="margin:0;color:#111827;font-size:15px;">${safe.organizerName}</p>
                </td></tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:28px;">
                <tr>
                  <td align="center" style="padding:0 0 12px;">
                    <a href="${inviteLink}" style="display:inline-block;background:#1D9E75;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">查看会议 · 进入系统</a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:0 0 8px;">
                    <a href="${signInUrl}" style="display:inline-block;background:#ffffff;color:#374151;font-size:14px;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:8px;border:1px solid #d1d5db;">仅登录系统</a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
                若按钮无法打开，请将以下链接复制到浏览器地址栏：<br />
                <a href="${inviteLink}" style="color:#1D9E75;word-break:break-all;">${inviteLink}</a>
              </p>
              <p style="margin:16px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
                仅登录：<a href="${signInUrl}" style="color:#1D9E75;word-break:break-all;">${signInUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 28px;border-top:1px solid #f3f4f6;background:#fafafa;">
              <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
                此邮件由 ClearStrata 系统自动发送，请勿直接回复。
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

/** JSON API responses (always CORS + Content-Type for browser invoke). */
function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

/** Unified JSON body for clients: always includes ok, message, detail. */
function apiResponse(
  ok: boolean,
  message: string,
  detail: unknown,
  status: number,
): Response {
  return json({ ok, message, detail }, status);
}

/** Plain JSON.stringify(err) drops Error fields; use this for logs + response detail. */
function unknownToSerializable(err: unknown): unknown {
  if (err instanceof Error) {
    const base: Record<string, unknown> = {
      name: err.name,
      message: err.message,
      stack: err.stack,
    };
    const withCause = err as Error & { cause?: unknown };
    if (withCause.cause !== undefined) {
      base.cause = unknownToSerializable(withCause.cause);
    }
    return base;
  }
  if (err !== null && typeof err === "object") {
    try {
      return JSON.parse(JSON.stringify(err)) as unknown;
    } catch {
      return { value: String(err) };
    }
  }
  return { value: String(err) };
}

function sendEmailFailedResponse(
  message: string,
  detail: unknown,
  status: number,
): Response {
  return json(
    {
      ok: false,
      message,
      detail: unknownToSerializable(detail),
    },
    status,
  );
}

async function upsertInvitationDelivery(
  supabaseAdmin: ReturnType<typeof createClient>,
  params: {
    meeting_id: string;
    property_id: string;
    recipient_user_id: string;
    email: string;
    delivery_status: "sent" | "failed";
  },
) {
  const { error } = await supabaseAdmin.from("meeting_invitations").upsert(
    {
      meeting_id: params.meeting_id,
      property_id: params.property_id,
      recipient_user_id: params.recipient_user_id,
      email: params.email,
      delivery_channel: "email",
      delivery_status: params.delivery_status,
      sent_at: params.delivery_status === "sent" ? new Date().toISOString() : null,
    },
    { onConflict: "meeting_id,recipient_user_id" },
  );
  if (error) {
    console.error("send-meeting-invite: invitation upsert failed", error);
  }
  return { error };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log("🚨 FUNCTION START", new Date().toISOString());
    console.log("SEND_MEETING_INVITE_VERSION = 2026-04-17-01");
    console.log("SENTINEL_SCHEDULED_AT_ONLY_BUILD");

    const missingEnv: string[] = [];
    if (!Deno.env.get("RESEND_API_KEY")?.trim()) missingEnv.push("RESEND_API_KEY");
    if (!Deno.env.get("SUPABASE_URL")?.trim()) missingEnv.push("SUPABASE_URL");
    if (!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim()) {
      missingEnv.push("SUPABASE_SERVICE_ROLE_KEY");
    }
    if (missingEnv.length > 0) {
      const name = missingEnv[0];
      console.error("[send-meeting-invite] missing env:", missingEnv);
      return apiResponse(false, `missing env var: ${name}`, { missing: missingEnv }, 503);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY")!.trim();

    let raw: InviteRequestBody;
    try {
      raw = (await req.json()) as InviteRequestBody;
    } catch (e) {
      console.error("[send-meeting-invite] Invalid JSON body", e);
      return apiResponse(false, "Invalid JSON body", null, 400);
    }

    const meeting_id = String(raw.meeting_id ?? raw.meetingId ?? "").trim();
    const user_id = String(raw.user_id ?? raw.userId ?? "").trim();
    const property_id = String(raw.property_id ?? raw.propertyId ?? "").trim();
    const locale: "en" | "zh" = raw.locale === "en" ? "en" : "zh";

    console.log("[send-meeting-invite] params", {
      meeting_id,
      property_id,
      user_id,
      locale,
    });

    if (!meeting_id || !user_id) {
      return apiResponse(false, "meeting_id and user_id are required", null, 400);
    }
    if (!property_id) {
      return apiResponse(false, "property_id is required", null, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const [{ data: meeting, error: meetingErr }, { data: profile, error: profileErr }] =
      await Promise.all([
        supabaseAdmin.from("meetings").select(
          "id, property_id, title_en, title_zh, scheduled_at, duration_minutes, is_virtual, meeting_link, location, created_by",
        ).eq("id", meeting_id).eq("property_id", property_id)
          .maybeSingle(),
        supabaseAdmin.from("profiles").select("full_name_en, full_name_zh, email").eq("id", user_id)
          .maybeSingle(),
      ]);

    if (meetingErr) {
      console.error("[send-meeting-invite] meeting query error", meetingErr);
      return apiResponse(false, "Meeting query failed", meetingErr, 500);
    }
    if (!meeting) {
      return apiResponse(false, "Meeting not found", null, 404);
    }

    const [{ count: invitationCount, error: invErr }, { count: memberCount, error: memErr }] =
      await Promise.all([
        supabaseAdmin
          .from("meeting_invitations")
          .select("id", { count: "exact", head: true })
          .eq("meeting_id", meeting_id)
          .eq("property_id", property_id)
          .eq("recipient_user_id", user_id),
        supabaseAdmin
          .from("property_members")
          .select("user_id", { count: "exact", head: true })
          .eq("property_id", property_id)
          .eq("user_id", user_id)
          .eq("status", "active"),
      ]);

    if (invErr || memErr) {
      return apiResponse(false, "Authorization check failed", { invErr, memErr }, 500);
    }
    const okInvite = (invitationCount ?? 0) > 0;
    const okMember = (memberCount ?? 0) > 0;
    if (!okInvite && !okMember) {
      return apiResponse(
        false,
        "Recipient is not invited to this meeting and is not an active member of this property.",
        { code: "FORBIDDEN" },
        403,
      );
    }

    if (profileErr || !profile || !profile.email) {
      return apiResponse(false, "User profile or email not found", { profileErr }, 404);
    }

    const recipientName = locale === "en"
      ? (profile.full_name_en || profile.full_name_zh || "Owner")
      : (profile.full_name_zh || profile.full_name_en || "业主");

    const normalizedBaseUrl = normalizeAppBaseUrl(Deno.env.get("APP_BASE_URL"));
    const logoUrl = `${normalizedBaseUrl}/logo-email.png`;
    const meetingUrl = `${normalizedBaseUrl}/meetings/${meeting_id}?entry=invite`;
    const signInUrl =
      `${normalizedBaseUrl}/login?redirect=${
        encodeURIComponent(`/meetings/${meeting_id}?entry=invite`)
      }`;
    const inviteLink = meetingUrl;

    const inviteToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { error: tokenInsErr } = await supabaseAdmin.from("invite_tokens").insert({
      user_id,
      meeting_id,
      token: inviteToken,
      expires_at: expiresAt,
    });
    if (tokenInsErr) {
      console.error("[send-meeting-invite] invite_tokens insert failed", tokenInsErr);
      return apiResponse(false, "Could not create invite token", { detail: tokenInsErr.message }, 500);
    }

    console.log("[send-meeting-invite] base url debug:", {
      raw: Deno.env.get("APP_BASE_URL"),
      normalizedBaseUrl,
      meetingUrl,
      signInUrl,
      logoUrl,
    });

    console.log("meeting raw:", meeting);

    const m = meeting as Record<string, unknown>;
    const displayMeta = getMeetingEmailDisplay(m, locale);
    const meetingTitle = resolveMeetingTitle(m, locale);
    const formattedTime = displayMeta.formattedTime;
    const durationText = formatDurationText(m, locale);
    const locationText = formatLocationText(m, locale);

    let organizerName = "—";
    const createdBy = m.created_by as string | undefined;
    if (createdBy) {
      const { data: orgProf } = await supabaseAdmin.from("profiles").select("full_name_en, full_name_zh").eq(
        "id",
        createdBy,
      ).maybeSingle();
      if (orgProf) {
        organizerName = locale === "en"
          ? (orgProf.full_name_en || orgProf.full_name_zh || "—")
          : (orgProf.full_name_zh || orgProf.full_name_en || "—");
      }
    }

    console.log("[send-meeting-invite] email fields", {
      normalizedBaseUrl,
      meetingUrl,
      signInUrl,
      logoUrl,
      meetingTitle,
      formattedTime,
    });

    const htmlTemplate = buildEmailHtml({
      locale,
      recipientName,
      meetingTitle,
      formattedTime,
      durationText,
      locationText,
      organizerName,
      inviteLink,
      signInUrl,
      logoUrl,
    });

    const email = profile.email as string;
    const meetingId = meeting_id;
    const propertyId = property_id;

    console.log("payload:", {
      meetingId,
      propertyId,
      email,
    });

    const resend = new Resend(resendApiKey);

    try {
      console.log("📨 sending email to:", email);

      // Resend only applies `data` when using their template system; plain `html` is sent as-is.
      const res = await resend.emails.send({
        from: "ClearStrata <noreply@clearstrata.ai>",
        to: email,
        subject: "会议邀请 / Meeting Invitation",
        html: htmlTemplate,
      });

      console.log("✅ resend success", res);

      if (res.error) {
        const errPayload = res.error as Record<string, unknown>;
        console.error("❌ resend error FULL", JSON.stringify(res.error, null, 2));

        const resendName =
          typeof errPayload.name === "string" ? errPayload.name : "";
        const resendMessage =
          typeof errPayload.message === "string"
            ? errPayload.message
            : JSON.stringify(errPayload);
        const msgLower = resendMessage.toLowerCase();
        const isTestingRecipientRestriction =
          resendName === "validation_error" &&
          /testing email|only send|verify a domain|can only send/i.test(msgLower);

        await supabaseAdmin.from("invite_tokens").delete().eq("token", inviteToken);
        await upsertInvitationDelivery(supabaseAdmin, {
          meeting_id,
          property_id,
          recipient_user_id: user_id,
          email,
          delivery_status: "failed",
        });

        if (isTestingRecipientRestriction) {
          return sendEmailFailedResponse(
            "Resend is in test mode: only allowed recipients can receive mail until production access is enabled.",
            {
              code: "RESEND_TESTING_RESTRICTION",
              message_zh: "当前邮箱发送受限，请先完成邮件服务正式发送权限开通",
              message_en:
                "Email sending is restricted. Verify your domain in Resend and enable production sending, or use an allowed test recipient until then.",
              resend: res.error,
            },
            502,
          );
        }

        return sendEmailFailedResponse(
          `Resend rejected the request: ${resendMessage}`,
          { code: "RESEND_API_ERROR", resend: res.error },
          502,
        );
      }

      const emailId = res.data?.id;
      const { error: invDeliveryErr } = await upsertInvitationDelivery(supabaseAdmin, {
        meeting_id,
        property_id,
        recipient_user_id: user_id,
        email,
        delivery_status: "sent",
      });
      if (!invDeliveryErr) {
        const noticeSentIso = new Date().toISOString();
        const { error: noticeSentErr } = await supabaseAdmin
          .from("meetings")
          .update({ notice_sent_at: noticeSentIso })
          .eq("id", meeting_id)
          .is("notice_sent_at", null);
        if (noticeSentErr) {
          console.warn("[send-meeting-invite] meetings.notice_sent_at update failed (non-fatal)", noticeSentErr);
        }
      }
      console.log("[send-meeting-invite] success", { email_id: emailId });
      return apiResponse(true, "Email sent", { email_id: emailId }, 200);
    } catch (err) {
      console.error("❌ resend error FULL", JSON.stringify(unknownToSerializable(err), null, 2));
      console.error("❌ resend error raw object", err);

      await supabaseAdmin.from("invite_tokens").delete().eq("token", inviteToken);
      await upsertInvitationDelivery(supabaseAdmin, {
        meeting_id,
        property_id,
        recipient_user_id: user_id,
        email,
        delivery_status: "failed",
      });

      return sendEmailFailedResponse("Failed to send email", err, 500);
    }
  } catch (err) {
    const serial = unknownToSerializable(err);
    console.error("[send-meeting-invite] unhandled", JSON.stringify(serial, null, 2), err);
    return apiResponse(
      false,
      "Unexpected error while sending invitation",
      { code: "INTERNAL_ERROR", detail: serial },
      500,
    );
  }
});
