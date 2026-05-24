/**
 * Council / admin / property_admin: send STAFF (lawyer / auditor / finance / accountant)
 * collaboration invite email via Resend. Independent of manager_invites + accept-manager-invite.
 *
 * verify_jwt = false — Authorization Bearer JWT from app is verified inside this handler
 * (anon client). DB writes use service_role.
 *
 * Phase 2B scope:
 *   - Write `public.staff_invites` row (token, expires_at, status='pending').
 *   - Notify recipient via Resend that an invite has been created.
 *   - DO NOT include a real /staff-invite?token=... link (acceptance page lands in Phase 2C).
 *   - DO NOT write `public.property_members` (acceptance flow will do that later).
 *
 * APP_BASE_URL: optional secret; normalized to origin only. Empty / invalid / clearstrata.ai / www.clearstrata.ai →
 * falls back to https://app.clearstrata.ai (matches send-manager-invite).
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

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function logFullCatchError(error: unknown): void {
  const err = error as { message?: string; stack?: string; cause?: unknown };
  console.error("❌ send-staff-invite FULL ERROR", {
    message: err?.message,
    stack: err?.stack,
    cause: err?.cause,
    error,
  });
}

const APP_BASE_DEFAULT_ORIGIN = "https://app.clearstrata.ai";

function normalizeAppBaseUrl(raw?: string | null): string {
  const cleaned = (raw ?? "").trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!cleaned) {
    console.log(
      "✅ send-staff-invite APP_BASE_URL empty → using default origin",
      APP_BASE_DEFAULT_ORIGIN,
    );
    return APP_BASE_DEFAULT_ORIGIN;
  }
  const withProtocol = /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;
  let origin: string;
  try {
    origin = new URL(withProtocol).origin;
  } catch {
    console.warn(
      "[send-staff-invite] invalid APP_BASE_URL, fallback:",
      APP_BASE_DEFAULT_ORIGIN,
      cleaned,
    );
    return APP_BASE_DEFAULT_ORIGIN;
  }
  try {
    const host = new URL(origin).hostname.replace(/^www\./i, "").toLowerCase();
    if (host === "clearstrata.ai" || host === "www.clearstrata.ai") {
      console.log(
        "✅ send-staff-invite APP_BASE_URL is marketing host → forcing app origin",
        "https://app.clearstrata.ai",
      );
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

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

/**
 * Inviter gate: who is allowed to draft a staff invite for this property.
 * Intentionally excludes `manager` — managers cannot invite staff in Phase 2.
 */
const INVITER_ROLES = new Set(["council", "admin", "property_admin"]);

type StaffType = "lawyer" | "auditor" | "finance" | "accountant";
const STAFF_TYPES = new Set<StaffType>([
  "lawyer",
  "auditor",
  "finance",
  "accountant",
]);

const STAFF_TYPE_LABELS: Record<StaffType, { zh: string; en: string }> = {
  lawyer: { zh: "律师", en: "Legal Counsel" },
  auditor: { zh: "审计", en: "Auditor" },
  finance: { zh: "财务", en: "Finance" },
  accountant: { zh: "会计", en: "Accountant" },
};

const STAFF_TYPE_SUBJECTS: Record<StaffType, string> = {
  lawyer: "ClearStrata 律师协作邀请 / Legal Counsel Invitation",
  auditor: "ClearStrata 审计协作邀请 / Auditor Invitation",
  finance: "ClearStrata 财务协作邀请 / Finance Invitation",
  accountant: "ClearStrata 会计协作邀请 / Accountant Invitation",
};

const STAFF_TYPE_TITLES: Record<StaffType, string> = {
  lawyer: "律师协作邀请 / Legal Counsel Invitation",
  auditor: "审计协作邀请 / Auditor Invitation",
  finance: "财务协作邀请 / Finance Invitation",
  accountant: "会计协作邀请 / Accountant Invitation",
};

interface Body {
  propertyId?: string;
  property_id?: string;
  staffEmail?: string;
  staff_email?: string;
  staffName?: string;
  staff_name?: string;
  staffType?: string;
  staff_type?: string;
}

function buildStaffInviteHtml(params: {
  recipientName: string;
  propertyName: string;
  inviterLabel: string;
  staffType: StaffType;
  logoUrl: string;
  acceptLink: string;
}): string {
  const labels = STAFF_TYPE_LABELS[params.staffType];
  const title = STAFF_TYPE_TITLES[params.staffType];
  const safe = {
    recipientName: escapeHtml(params.recipientName),
    propertyName: escapeHtml(params.propertyName),
    inviterLabel: escapeHtml(params.inviterLabel),
    logoUrl: escapeHtml(params.logoUrl),
    labelZh: escapeHtml(labels.zh),
    labelEn: escapeHtml(labels.en),
    title: escapeHtml(title),
  };

  return `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${safe.title}</title></head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f9fc;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04);">
        <tr><td style="background:#0f766e;padding:16px 20px;text-align:center;">
          <div style="margin-bottom:12px;"><img src="${safe.logoUrl}" alt="ClearStrata" style="height:48px;object-fit:contain;display:block;margin:0 auto;" /></div>
          <div style="font-size:22px;font-weight:600;color:#ffffff;">${safe.title}</div>
        </td></tr>
        <tr><td style="padding:32px 32px 24px;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65;">
            ${safe.recipientName} 您好，<br/><br/>
            您已被邀请以 <strong>${safe.labelZh}</strong> 身份加入以下物业的协作后台：<br/><br/>
            Hi ${safe.recipientName},<br/><br/>
            You have been invited to collaborate on the following property as a <strong>${safe.labelEn}</strong>:
          </p>
          <table role="presentation" width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 22px;">
            <tr><td style="padding:0 0 12px;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">物业 Property</p>
              <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">${safe.propertyName}</p>
            </td></tr>
            <tr><td style="padding:12px 0 12px;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">职员类型 Staff Type</p>
              <p style="margin:0;color:#111827;font-size:15px;">${safe.labelZh} / ${safe.labelEn}</p>
            </td></tr>
            <tr><td style="padding:12px 0 0;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">邀请人 Invited by</p>
              <p style="margin:0;color:#111827;font-size:15px;">${safe.inviterLabel}</p>
            </td></tr>
          </table>

          <div style="margin:20px 0 0;padding:14px 16px;border-radius:10px;background:#fff7ed;border:1px solid #fed7aa;">
            <p style="margin:0;color:#9a3412;font-size:13px;line-height:1.6;">
              <strong>只读访问 / Read-only access</strong><br/>
              受邀职员接受后，将获得本物业资料的只读访问权限，可能包括财务发票、会议资料、业主/住户资料等。<br/>
              Once accepted, the invited staff will receive read-only access to this property's records, which may include finance invoices, meeting materials, and owner/resident information.
            </p>
          </div>

          <p style="margin:18px 0 8px;color:#374151;font-size:14px;">有效期 Valid for: <strong>7 天 · 7 days</strong></p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;">
            <tr><td align="center" style="padding:0 0 8px;">
              <a href="${params.acceptLink}" style="display:inline-block;background:#1D9E75;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">接受职员邀请 / Accept Staff Invitation</a>
            </td></tr>
          </table>

          <p style="margin:20px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
            若按钮无法打开：<a href="${params.acceptLink}" style="color:#1D9E75;word-break:break-all;">${params.acceptLink}</a>
          </p>
          <p style="margin:16px 0 0;color:#9ca3af;font-size:11px;line-height:1.5;">
            如果你不是该协作人员，请忽略此邮件。<br/>
            If you were not expecting this invitation, you can safely ignore this email.
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
    console.error("❌ send-staff-invite missing env", { missing });
    return json(
      { ok: false, message: `missing env: ${missing[0]}`, missing },
      503,
    );
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

  const propertyId = String(raw.propertyId ?? raw.property_id ?? "").trim();
  const staffName =
    String(raw.staffName ?? raw.staff_name ?? "").trim() || null;
  const staffEmail = normalizeEmail(
    String(raw.staffEmail ?? raw.staff_email ?? ""),
  );
  const staffTypeRaw = String(raw.staffType ?? raw.staff_type ?? "")
    .trim()
    .toLowerCase();

  console.log("✅ send-staff-invite received payload", {
    propertyId,
    staffName,
    staffEmail,
    staffType: staffTypeRaw,
  });

  if (!propertyId) {
    return json({ ok: false, message: "propertyId is required" }, 400);
  }
  if (!staffEmail || !staffEmail.includes("@")) {
    return json({ ok: false, message: "staffEmail is invalid" }, 400);
  }
  if (!STAFF_TYPES.has(staffTypeRaw as StaffType)) {
    return json(
      {
        ok: false,
        code: "INVALID_STAFF_TYPE",
        message:
          "staffType must be one of: lawyer, auditor, finance, accountant",
      },
      400,
    );
  }
  const staffType = staffTypeRaw as StaffType;

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
      console.error("❌ send-staff-invite auth.getUser failed", {
        message: uerr?.message ?? "no-user",
      });
      return json(
        {
          ok: false,
          message: "Unauthorized",
          error: uerr?.message ?? "Unauthorized",
        },
        401,
      );
    }
    const userId = udata.user.id;

    const svc = createClient(supabaseUrl, supabaseSr, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── Inviter gate ──────────────────────────────────────────────────────
    const { data: membership, error: mer } = await svc
      .from("property_members")
      .select("role")
      .eq("property_id", propertyId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (mer) {
      console.error("❌ send-staff-invite inviter gate query", mer);
      return json(
        {
          ok: false,
          message: mer.message ?? "Failed to verify role",
          error: mer.message ?? "unknown",
        },
        500,
      );
    }
    const inviterRole = membership?.role as string | undefined;
    if (!inviterRole || !INVITER_ROLES.has(inviterRole)) {
      console.error("❌ send-staff-invite forbidden inviter role", {
        inviterRole,
      });
      return json(
        {
          ok: false,
          code: "FORBIDDEN",
          message:
            "Forbidden: only council, admin or property_admin can invite staff",
        },
        403,
      );
    }

    // ── Property metadata ─────────────────────────────────────────────────
    const { data: property, error: perr } = await svc
      .from("properties")
      .select("id,name")
      .eq("id", propertyId)
      .maybeSingle();
    if (perr || !property) {
      console.error("❌ send-staff-invite properties query", { perr, property });
      return json(
        {
          ok: false,
          message: perr?.message ?? "Property not found",
          error: perr?.message ?? "property_not_found",
        },
        perr ? 500 : 404,
      );
    }

    // ── Pending staff_invite dedup ───────────────────────────────────────
    const { data: pendingRow, error: pendingErr } = await svc
      .from("staff_invites")
      .select("id,staff_type")
      .eq("property_id", propertyId)
      .eq("email", staffEmail)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingErr) {
      console.error("❌ send-staff-invite staff_invites pending select", pendingErr);
      return json(
        {
          ok: false,
          message: pendingErr.message ?? "invite lookup failed",
          error: pendingErr.message ?? "unknown",
        },
        500,
      );
    }
    if (pendingRow?.id) {
      console.warn("⚠️ send-staff-invite pending exists", pendingRow);
      return json(
        {
          ok: false,
          code: "STAFF_INVITE_PENDING_EXISTS",
          message:
            "该邮箱已有已发送、等待接受的职员邀请。 This email already has a sent staff invitation waiting for acceptance.",
        },
        409,
      );
    }

    // ── Existing membership conflict (best-effort) ───────────────────────
    // Resolve auth user id via service-role RPC; if not found, treat as new
    // recipient (do not block legitimate first-time invites).
    let existingUserId: string | null = null;
    try {
      const { data: rpcUid, error: rpcErr } = await svc.rpc(
        "get_auth_user_id_by_email",
        { p_email: staffEmail },
      );
      if (rpcErr) {
        console.warn(
          "[send-staff-invite] get_auth_user_id_by_email error (non-fatal)",
          rpcErr,
        );
      } else if (typeof rpcUid === "string" && rpcUid) {
        existingUserId = rpcUid;
      }
    } catch (rpcCatch) {
      console.warn(
        "[send-staff-invite] get_auth_user_id_by_email threw (non-fatal)",
        rpcCatch,
      );
    }

    if (existingUserId) {
      const { data: existingMember, error: emErr } = await svc
        .from("property_members")
        .select("role,staff_type,status")
        .eq("property_id", propertyId)
        .eq("user_id", existingUserId)
        .eq("status", "active")
        .maybeSingle();

      if (emErr) {
        console.warn(
          "[send-staff-invite] property_members conflict select (non-fatal)",
          emErr,
        );
      } else if (existingMember) {
        const existingRole = String(existingMember.role ?? "").toLowerCase();
        const existingStaffType = existingMember.staff_type
          ? String(existingMember.staff_type).toLowerCase()
          : null;

        if (existingRole !== "viewer") {
          return json(
            {
              ok: false,
              code: "EXISTING_OTHER_ROLE",
              message:
                "该账号在本物业已是其他角色，无法发起职员邀请。 This account already has another role in the property.",
            },
            409,
          );
        }
        if (existingStaffType === staffType) {
          return json(
            {
              ok: false,
              code: "ALREADY_STAFF",
              message:
                "该账号已是本物业的该类职员。 This account is already an active staff of this type.",
            },
            409,
          );
        }
        return json(
          {
            ok: false,
            code: "EXISTING_OTHER_STAFF_TYPE",
            message:
              "该账号在本物业已是其他类型的职员，请先调整再发起邀请。 This account is already a different staff type in this property.",
          },
          409,
        );
      }
    }

    // ── Inviter display label for email ──────────────────────────────────
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
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    // ── Insert staff_invites row ─────────────────────────────────────────
    const { data: inserted, error: insErr } = await svc
      .from("staff_invites")
      .insert({
        property_id: propertyId,
        email: staffEmail,
        full_name: staffName,
        staff_type: staffType,
        member_role: "viewer",
        token,
        status: "pending",
        invited_by: userId,
        expires_at: expiresAt,
      })
      .select("id")
      .maybeSingle();

    if (insErr || !inserted?.id) {
      console.error("❌ send-staff-invite staff_invites insert", insErr);
      return json(
        {
          ok: false,
          message: insErr?.message ?? "insert_failed",
          error: insErr?.message ?? "insert_failed",
        },
        500,
      );
    }

    // ── Email (Resend) ───────────────────────────────────────────────────
    const normalizedBaseUrl = normalizeAppBaseUrl(Deno.env.get("APP_BASE_URL"));
    const logoUrl = `${normalizedBaseUrl}/logo-email.png`;
    const acceptLink = `${normalizedBaseUrl}/staff-invite?token=${encodeURIComponent(token)}`;

    const displayName = staffName || staffEmail.split("@")[0] || "Staff";

    const html = buildStaffInviteHtml({
      recipientName: displayName,
      propertyName: String(property.name ?? "Property"),
      inviterLabel,
      staffType,
      logoUrl,
      acceptLink,
    });

    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!.trim());
    const res = await resend.emails.send({
      from: "ClearStrata <noreply@clearstrata.ai>",
      to: staffEmail,
      subject: STAFF_TYPE_SUBJECTS[staffType],
      html,
    });

    if (res.error) {
      console.error("❌ send-staff-invite Resend rejected", res.error);
      const errMsg =
        typeof (res.error as { message?: string }).message === "string"
          ? (res.error as { message?: string }).message
          : "Resend failed";
      // Invite row already persisted; surface email failure separately.
      return json(
        {
          ok: false,
          code: "EMAIL_FAILED",
          message: "邀请已创建但邮件发送失败，请稍后重试。 Invitation created but email delivery failed.",
          error: errMsg,
          invite_id: inserted.id,
        },
        502,
      );
    }

    console.log("✅ send-staff-invite final success", {
      invite_id: inserted.id,
      email_id: res.data?.id,
      to: staffEmail,
      staff_type: staffType,
    });

    return json(
      {
        ok: true,
        message: "Staff invitation sent",
        invite_id: inserted.id,
        email_id: res.data?.id,
      },
      200,
    );
  } catch (error) {
    logFullCatchError(error);
    const msg = error instanceof Error ? error.message : "unknown_error";
    return json({ ok: false, error: msg, message: msg }, 500);
  }
});
