/**
 * Meeting invitation emails via Resend.
 *
 * Secrets (Supabase Dashboard → Project Settings → Edge Functions → Secrets):
 * - RESEND_API_KEY (required)
 * - From address is fixed in code: ClearStrata <noreply@clearstrata.ai> (must be verified in Resend).
 * Redeploy after changing secrets: `supabase functions deploy send-meeting-invite`
 *
 * Product: until Resend production access is enabled, use only Resend-approved test recipients
 * to verify the flow; external addresses will get RESEND_TESTING_RESTRICTION until domain is verified.
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

interface InviteRequest {
  meeting_id: string;
  user_id: string;
  /** Required — must match meetings.property_id (multi-tenant guard). */
  property_id: string;
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

/** Unified JSON body for clients: always includes ok, message, detail. */
function apiResponse(
  ok: boolean,
  message: string,
  detail: unknown,
  status: number,
): Response {
  return new Response(JSON.stringify({ ok, message, detail }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  return new Response(
    JSON.stringify({
      ok: false,
      message,
      detail: unknownToSerializable(detail),
    }),
    {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    },
  );
}

async function upsertInvitationDelivery(
  supabase: ReturnType<typeof createClient>,
  params: {
    meeting_id: string;
    property_id: string;
    recipient_user_id: string;
    email: string;
    delivery_status: "sent" | "failed";
  },
) {
  const { error } = await supabase.from("meeting_invitations").upsert(
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
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    console.log("🚨 FUNCTION START", new Date().toISOString());

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

    let body: InviteRequest;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[send-meeting-invite] Invalid JSON body", e);
      return apiResponse(false, "Invalid JSON body", null, 400);
    }

    const { meeting_id, user_id, property_id: propertyIdRaw, locale: localeRaw } = body;
    const locale: "en" | "zh" = localeRaw === "en" ? "en" : "zh";
    const property_id = typeof propertyIdRaw === "string" ? propertyIdRaw.trim() : "";

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const [{ data: meeting, error: meetingErr }, { data: profile, error: profileErr }] =
      await Promise.all([
        supabase.from("meetings").select("*").eq("id", meeting_id).eq("property_id", property_id)
          .maybeSingle(),
        supabase.from("profiles").select("full_name_en, full_name_zh, email").eq("id", user_id)
          .maybeSingle(),
      ]);

    if (meetingErr || !meeting) {
      return apiResponse(false, "Meeting not found", { meetingErr }, 404);
    }

    const [{ count: invitationCount, error: invErr }, { count: memberCount, error: memErr }] =
      await Promise.all([
        supabase
          .from("meeting_invitations")
          .select("id", { count: "exact", head: true })
          .eq("meeting_id", meeting_id)
          .eq("property_id", property_id)
          .eq("recipient_user_id", user_id),
        supabase
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

    const appBaseUrl = Deno.env.get("APP_BASE_URL") || "http://localhost:5173";
    const signInUrl = `${appBaseUrl.replace(/\/$/, "")}/voting/${meeting_id}`;

    const titleForSubject = locale === "en"
      ? ((meeting.title_en || meeting.title_zh || "Meeting") as string)
      : ((meeting.title_zh || meeting.title_en || "会议") as string);

    const emailHtml = buildEmailHtml(meeting, recipientName, signInUrl, locale);
    const subject = locale === "en"
      ? `Meeting invitation: ${titleForSubject}`
      : `会议邀请：${titleForSubject}`;

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

      const res = await resend.emails.send({
        from: "ClearStrata <noreply@clearstrata.ai>",
        to: email,
        subject,
        html: emailHtml,
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

        await upsertInvitationDelivery(supabase, {
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
      await upsertInvitationDelivery(supabase, {
        meeting_id,
        property_id,
        recipient_user_id: user_id,
        email,
        delivery_status: "sent",
      });
      console.log("[send-meeting-invite] success", { email_id: emailId });
      return apiResponse(true, "Email sent", { email_id: emailId }, 200);
    } catch (err) {
      console.error("❌ resend error FULL", JSON.stringify(unknownToSerializable(err), null, 2));
      console.error("❌ resend error raw object", err);

      await upsertInvitationDelivery(supabase, {
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
