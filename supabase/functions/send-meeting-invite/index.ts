import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InviteRequest {
  meeting_id: string;
  user_id: string;
  /** UI language for email copy */
  locale?: "en" | "zh";
  /** Optional client hint; recipient email still loaded from profiles in DB */
  user_email?: string;
}

function formatDateZh(dateStr: string): string {
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const h = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${y}年${m}月${day}日 ${h}:${min}`;
}

function formatDateEn(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildEmailHtml(
  meeting: Record<string, unknown>,
  recipientName: string,
  signInUrl: string,
  locale: "en" | "zh",
): string {
  const titleEn = (meeting.title_en || meeting.title_zh || "Meeting") as string;
  const titleZh = (meeting.title_zh || meeting.title_en || "会议") as string;
  const dateFormatted = locale === "en"
    ? formatDateEn(meeting.scheduled_date as string)
    : formatDateZh(meeting.scheduled_date as string);
  const durationMin = meeting.duration_minutes as number | null | undefined;
  const duration = locale === "en"
    ? (durationMin ? `${durationMin} min` : "TBD")
    : (durationMin ? `${durationMin} 分钟` : "待定");
  const location = meeting.is_virtual
    ? (meeting.meeting_link
      ? (locale === "en" ? "Online meeting" : "在线会议")
      : (locale === "en" ? "Online (link TBD)" : "在线会议（链接待定）"))
    : ((meeting.location as string) || (locale === "en" ? "TBD" : "待定"));

  if (locale === "en") {
    const title = titleEn;
    return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1D9E75,#178a66);padding:32px 28px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Meeting invitation</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">ClearStrata</p>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
        Hello ${recipientName},<br/>You are invited to the following meeting:
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;width:88px;vertical-align:top;">Meeting</td>
            <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${title}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;vertical-align:top;">When</td>
            <td style="padding:8px 0;color:#111827;font-size:14px;">${dateFormatted}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;vertical-align:top;">Duration</td>
            <td style="padding:8px 0;color:#111827;font-size:14px;">${duration}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;vertical-align:top;">Location</td>
            <td style="padding:8px 0;color:#111827;font-size:14px;">${location}</td>
          </tr>
        </table>
      </div>
      ${meeting.is_virtual && meeting.meeting_link
        ? `<a href="${meeting.meeting_link}" style="display:inline-block;background:#1D9E75;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-bottom:16px;">Join online</a><br/><br/>`
        : ""}
      <a href="${signInUrl}" style="display:inline-block;background:#1D9E75;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">Open sign-in</a>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">
        This message was sent automatically by ClearStrata. Please do not reply to this email.
      </p>
    </div>
  </div>
</body>
</html>`;
  }

  const title = titleZh;
  return `
<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    <div style="background:linear-gradient(135deg,#1D9E75,#178a66);padding:32px 28px;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">会议邀请</h1>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Meeting Invitation</p>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.6;">
        ${recipientName} 您好，<br/>您已被邀请参加以下会议：
      </p>
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;width:72px;vertical-align:top;">会议</td>
            <td style="padding:8px 0;color:#111827;font-size:14px;font-weight:600;">${title}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;vertical-align:top;">时间</td>
            <td style="padding:8px 0;color:#111827;font-size:14px;">${dateFormatted}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;vertical-align:top;">时长</td>
            <td style="padding:8px 0;color:#111827;font-size:14px;">${duration}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px 8px 0;color:#6b7280;font-size:13px;vertical-align:top;">地点</td>
            <td style="padding:8px 0;color:#111827;font-size:14px;">${location}</td>
          </tr>
        </table>
      </div>
      ${meeting.is_virtual && meeting.meeting_link
        ? `<a href="${meeting.meeting_link}" style="display:inline-block;background:#1D9E75;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-bottom:16px;">加入在线会议</a><br/><br/>`
        : ""}
      <a href="${signInUrl}" style="display:inline-block;background:#1D9E75;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">前往签到</a>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.5;">
        此邮件由 ClearStrata 系统自动发送，请勿直接回复。
      </p>
    </div>
  </div>
</body>
</html>`;
}

function resolveFromHeader(): string {
  const full = Deno.env.get("RESEND_FROM")?.trim();
  if (full) return full;
  const domain = Deno.env.get("RESEND_SENDER_DOMAIN")?.trim();
  if (domain && domain.includes("@")) {
    return `ClearStrata <${domain}>`;
  }
  // Resend test sender (verify in Resend dashboard for your account)
  return "ClearStrata <onboarding@resend.dev>";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: InviteRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { meeting_id, user_id, locale: localeRaw } = body;
    const locale: "en" | "zh" = localeRaw === "en" ? "en" : "zh";

    if (!meeting_id || !user_id) {
      return new Response(
        JSON.stringify({ error: "meeting_id and user_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const [{ data: meeting, error: meetingErr }, { data: profile, error: profileErr }] = await Promise.all([
      supabase.from("meetings").select("*").eq("id", meeting_id).maybeSingle(),
      supabase.from("profiles").select("full_name_en, full_name_zh, email").eq("id", user_id).maybeSingle(),
    ]);

    if (meetingErr || !meeting) {
      return new Response(
        JSON.stringify({ error: "Meeting not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (profileErr || !profile || !profile.email) {
      return new Response(
        JSON.stringify({ error: "User profile or email not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const recipientName = locale === "en"
      ? (profile.full_name_en || profile.full_name_zh || "Owner")
      : (profile.full_name_zh || profile.full_name_en || "业主");

    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "http://localhost:5173";
    const signInUrl = `${appBaseUrl.replace(/\/$/, "")}/voting/${meeting_id}`;

    const titleForSubject = locale === "en"
      ? ((meeting.title_en || meeting.title_zh || "Meeting") as string)
      : ((meeting.title_zh || meeting.title_en || "会议") as string);

    const emailHtml = buildEmailHtml(meeting, recipientName, signInUrl, locale);
    const subject = locale === "en"
      ? `Meeting invitation: ${titleForSubject}`
      : `会议邀请：${titleForSubject}`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: resolveFromHeader(),
        to: [profile.email],
        subject,
        html: emailHtml,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: resendData }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({ success: true, email_id: resendData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
