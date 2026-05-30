/**
 * Council / admin / property_admin: send a DIRECTED OWNER invite email via Resend.
 *
 * Two-step direct invite (no password / no OTP / no join_request / no /entry):
 *   1. Inviter submits full_name + email + unit_no here → owner_invites(status='pending').
 *   2. Owner clicks /owner-invite?token=... → accept-owner-invite activates membership.
 *
 * verify_jwt = false — Authorization Bearer JWT from the app is verified inside this
 * handler (anon client). DB writes use service_role.
 *
 * STRICT BOUNDARIES:
 *   - manager CANNOT invite owners (only council / admin / property_admin).
 *   - Does NOT touch staff_invites / manager_invites / join_requests / submit_join_request.
 *   - Independent table: public.owner_invites.
 *
 * APP_BASE_URL: optional secret; normalized to origin only. Empty / invalid /
 * clearstrata.ai / www.clearstrata.ai → falls back to https://app.clearstrata.ai
 * (matches send-staff-invite).
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
  console.error("❌ send-owner-invite FULL ERROR", {
    message: err?.message,
    stack: err?.stack,
    cause: err?.cause,
    error,
  });
}

const APP_BASE_DEFAULT_ORIGIN = "https://app.clearstrata.ai";

function normalizeAppBaseUrl(raw?: string | null): string {
  const cleaned = (raw ?? "").trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!cleaned) return APP_BASE_DEFAULT_ORIGIN;
  const withProtocol = /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;
  let origin: string;
  try {
    origin = new URL(withProtocol).origin;
  } catch {
    console.warn(
      "[send-owner-invite] invalid APP_BASE_URL, fallback:",
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

function normalizeEmail(e: string): string {
  return e.trim().toLowerCase();
}

/**
 * Inviter gate: who may draft an owner invite. manager is intentionally EXCLUDED.
 */
const INVITER_ROLES = new Set(["council", "admin", "property_admin"]);

interface Body {
  propertyId?: string;
  property_id?: string;
  email?: string;
  ownerEmail?: string;
  owner_email?: string;
  fullName?: string;
  full_name?: string;
  unitNo?: string;
  unit_no?: string;
  note?: string;
}

function buildOwnerInviteHtml(params: {
  fullName: string;
  email: string;
  unitNo: string;
  propertyName: string;
  inviterLabel: string;
  logoUrl: string;
  acceptLink: string;
}): string {
  const safe = {
    fullName: escapeHtml(params.fullName),
    email: escapeHtml(params.email),
    unitNo: escapeHtml(params.unitNo),
    propertyName: escapeHtml(params.propertyName),
    inviterLabel: escapeHtml(params.inviterLabel),
    logoUrl: escapeHtml(params.logoUrl),
  };

  return `<!DOCTYPE html>
<html lang="zh">
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>业主邀请 / Owner Invitation</title></head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'PingFang SC','Microsoft YaHei',sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f9fc;padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 12px rgba(0,0,0,0.04);">
        <tr><td style="background:#35C3D6;padding:16px 20px;text-align:center;">
          <div style="margin-bottom:12px;"><img src="${safe.logoUrl}" alt="ClearStrata" style="height:48px;object-fit:contain;display:block;margin:0 auto;" /></div>
          <div style="font-size:22px;font-weight:600;color:#ffffff;">业主邀请 / Owner Invitation</div>
        </td></tr>
        <tr><td style="padding:32px 32px 24px;">
          <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.65;">
            ${safe.fullName} 您好，<br/><br/>
            您已被邀请加入 <strong>${safe.propertyName}</strong>。<br/><br/>
            Hi ${safe.fullName},<br/><br/>
            You have been invited to join <strong>${safe.propertyName}</strong>.
          </p>
          <table role="presentation" width="100%" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:20px 22px;">
            <tr><td style="padding:0 0 12px;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">姓名 / Name</p>
              <p style="margin:0;color:#111827;font-size:15px;font-weight:600;">${safe.fullName}</p>
            </td></tr>
            <tr><td style="padding:12px 0 12px;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">邮箱 / Email</p>
              <p style="margin:0;color:#111827;font-size:15px;">${safe.email}</p>
            </td></tr>
            <tr><td style="padding:12px 0 12px;border-bottom:1px solid #e5e7eb;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">房号 / Unit</p>
              <p style="margin:0;color:#111827;font-size:15px;">${safe.unitNo}</p>
            </td></tr>
            <tr><td style="padding:12px 0 0;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;">邀请人 / Invited by</p>
              <p style="margin:0;color:#111827;font-size:15px;">${safe.inviterLabel}</p>
            </td></tr>
          </table>

          <p style="margin:18px 0 8px;color:#374151;font-size:14px;">有效期 Valid for: <strong>7 天 · 7 days</strong></p>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top:18px;">
            <tr><td align="center" style="padding:0 0 8px;">
              <a href="${params.acceptLink}" style="display:inline-block;background:#35C3D6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">进入物业 / Enter Property</a>
            </td></tr>
          </table>

          <p style="margin:20px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
            若按钮无法打开：<a href="${params.acceptLink}" style="color:#35C3D6;word-break:break-all;">${params.acceptLink}</a>
          </p>
          <p style="margin:16px 0 0;color:#9ca3af;font-size:11px;line-height:1.5;">
            如果你不是该业主，请忽略此邮件。<br/>
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
    console.error("❌ send-owner-invite missing env", { missing });
    return json(
      { ok: false, code: "config", message: `missing env: ${missing[0]}`, missing },
      503,
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(
      { ok: false, code: "unauthorized", message: "Missing Authorization Bearer" },
      401,
    );
  }

  let raw: Body;
  try {
    raw = (await req.json()) as Body;
  } catch (error) {
    logFullCatchError(error);
    const msg = error instanceof Error ? error.message : "unknown_error";
    return json({ ok: false, code: "bad_body", error: msg, message: msg }, 400);
  }

  const propertyId = String(raw.propertyId ?? raw.property_id ?? "").trim();
  const fullName = String(raw.fullName ?? raw.full_name ?? "").trim();
  const email = normalizeEmail(
    String(raw.email ?? raw.ownerEmail ?? raw.owner_email ?? ""),
  );
  const unitNo = String(raw.unitNo ?? raw.unit_no ?? "").trim();
  const note = String(raw.note ?? "").trim() || null;

  if (!propertyId || !fullName || !email || !unitNo) {
    return json(
      {
        ok: false,
        code: "missing_required_fields",
        message:
          "property_id, full_name, email and unit_no are all required. / 姓名、邮箱、房号均为必填。",
      },
      400,
    );
  }
  if (!email.includes("@") || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json(
      {
        ok: false,
        code: "invalid_email",
        message: "Email is invalid. / 邮箱格式无效。",
      },
      400,
    );
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
      console.error("❌ send-owner-invite auth.getUser failed", {
        message: uerr?.message ?? "no-user",
      });
      return json(
        { ok: false, code: "unauthorized", message: "Unauthorized" },
        401,
      );
    }
    const userId = udata.user.id;

    const svc = createClient(supabaseUrl, supabaseSr, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // ── Inviter gate: active council / admin / property_admin (NO manager) ──
    const { data: membership, error: mer } = await svc
      .from("property_members")
      .select("role")
      .eq("property_id", propertyId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (mer) {
      console.error("❌ send-owner-invite inviter gate query", mer);
      return json(
        { ok: false, code: "forbidden", message: mer.message ?? "Failed to verify role" },
        500,
      );
    }
    const inviterRole = String(membership?.role ?? "").toLowerCase();
    if (!inviterRole || !INVITER_ROLES.has(inviterRole)) {
      return json(
        {
          ok: false,
          code: "forbidden",
          message:
            "Forbidden: only council, admin or property_admin can invite owners.",
        },
        403,
      );
    }

    // ── Property metadata ──────────────────────────────────────────────────
    const { data: property, error: perr } = await svc
      .from("properties")
      .select("id,name")
      .eq("id", propertyId)
      .maybeSingle();
    if (perr || !property) {
      console.error("❌ send-owner-invite properties query", { perr, property });
      return json(
        {
          ok: false,
          code: "forbidden",
          message: perr?.message ?? "Property not found",
        },
        perr ? 500 : 404,
      );
    }

    // ── Pending owner_invite dedup ─────────────────────────────────────────
    const { data: pendingRow, error: pendingErr } = await svc
      .from("owner_invites")
      .select("id")
      .eq("property_id", propertyId)
      .eq("email", email)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingErr) {
      console.error("❌ send-owner-invite owner_invites pending select", pendingErr);
      return json(
        { ok: false, code: "pending_exists", message: pendingErr.message ?? "invite lookup failed" },
        500,
      );
    }
    if (pendingRow?.id) {
      return json(
        {
          ok: false,
          code: "pending_exists",
          message:
            "该邮箱已有等待接受的业主邀请。 This email already has a pending owner invitation.",
        },
        409,
      );
    }

    // ── Existing active membership conflict ───────────────────────────────
    // owner / staff / any other active role are all mutually exclusive with a
    // fresh owner invite. Resolve auth user id by email; if found, gate here so
    // the conflict surfaces at SEND time, not at accept time.
    let existingUserId: string | null = null;
    try {
      const { data: rpcUid, error: rpcErr } = await svc.rpc(
        "get_auth_user_id_by_email",
        { p_email: email },
      );
      if (rpcErr) {
        console.warn("[send-owner-invite] get_auth_user_id_by_email (non-fatal)", rpcErr);
      } else if (typeof rpcUid === "string" && rpcUid) {
        existingUserId = rpcUid;
      }
    } catch (rpcCatch) {
      console.warn("[send-owner-invite] get_auth_user_id_by_email threw (non-fatal)", rpcCatch);
    }

    if (existingUserId) {
      const { data: existingMember, error: emErr } = await svc
        .from("property_members")
        .select("role,status,staff_type")
        .eq("property_id", propertyId)
        .eq("user_id", existingUserId)
        .eq("status", "active")
        .maybeSingle();
      if (emErr) {
        console.warn("[send-owner-invite] property_members conflict select (non-fatal)", emErr);
      } else if (existingMember) {
        const existingRole = String(existingMember.role ?? "").toLowerCase();
        const existingStaffType = existingMember.staff_type
          ? String(existingMember.staff_type).trim()
          : "";

        // Priority: owner → already_owner; staff_type present → email_is_staff;
        // any other active non-owner role → email_already_member.
        if (existingRole === "owner") {
          return json(
            {
              ok: false,
              code: "already_owner",
              message:
                "该邮箱已经是本物业业主。 This email is already an owner of this property.",
            },
            409,
          );
        }
        if (existingStaffType) {
          return json(
            {
              ok: false,
              code: "email_is_staff",
              message:
                "该邮箱已是本物业职员。如需邀请为业主，请先在成员管理移除其职员身份。 This email is already a staff member; remove the staff membership first.",
            },
            409,
          );
        }
        return json(
          {
            ok: false,
            code: "email_already_member",
            message:
              "该邮箱已是本物业其他身份成员，不能发送业主邀请。 This email is already an active member with another role.",
          },
          409,
        );
      }
    }

    // ── Inviter display label for email ────────────────────────────────────
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

    // ── Insert owner_invites row ───────────────────────────────────────────
    const { data: inserted, error: insErr } = await svc
      .from("owner_invites")
      .insert({
        property_id: propertyId,
        email,
        full_name: fullName,
        unit_no: unitNo,
        member_role: "owner",
        token,
        status: "pending",
        invited_by: userId,
        expires_at: expiresAt,
        note,
      })
      .select("id")
      .maybeSingle();

    if (insErr || !inserted?.id) {
      // Unique partial index race → surface as pending_exists.
      if (insErr?.code === "23505") {
        return json(
          {
            ok: false,
            code: "pending_exists",
            message:
              "该邮箱已有等待接受的业主邀请。 This email already has a pending owner invitation.",
          },
          409,
        );
      }
      console.error("❌ send-owner-invite owner_invites insert", insErr);
      return json(
        { ok: false, code: "config", message: insErr?.message ?? "insert_failed" },
        500,
      );
    }

    // ── Email (Resend) ─────────────────────────────────────────────────────
    const normalizedBaseUrl = normalizeAppBaseUrl(Deno.env.get("APP_BASE_URL"));
    const logoUrl = `${normalizedBaseUrl}/logo-email.png`;
    const acceptLink = `${normalizedBaseUrl}/owner-invite?token=${encodeURIComponent(token)}`;

    const html = buildOwnerInviteHtml({
      fullName,
      email,
      unitNo,
      propertyName: String(property.name ?? "Property"),
      inviterLabel,
      logoUrl,
      acceptLink,
    });

    const resend = new Resend(Deno.env.get("RESEND_API_KEY")!.trim());
    const res = await resend.emails.send({
      from: "ClearStrata <noreply@clearstrata.ai>",
      to: email,
      subject: "ClearStrata 业主邀请 / Owner Invitation",
      html,
    });

    if (res.error) {
      console.error("❌ send-owner-invite Resend rejected", res.error);
      const errMsg =
        typeof (res.error as { message?: string }).message === "string"
          ? (res.error as { message?: string }).message
          : "Resend failed";
      return json(
        {
          ok: false,
          code: "email_send_failed",
          message:
            "邀请已创建但邮件发送失败，请稍后重试。 Invitation created but email delivery failed.",
          error: errMsg,
          invite_id: inserted.id,
        },
        502,
      );
    }

    console.log("✅ send-owner-invite success", {
      invite_id: inserted.id,
      email_id: res.data?.id,
      to: email,
      property_id: propertyId,
    });

    return json({ ok: true, invite_id: inserted.id, email_id: res.data?.id }, 200);
  } catch (error) {
    logFullCatchError(error);
    const msg = error instanceof Error ? error.message : "unknown_error";
    return json({ ok: false, code: "config", error: msg, message: msg }, 500);
  }
});
