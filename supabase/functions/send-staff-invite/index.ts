/**
 * Council / admin / property_admin: staff invite lifecycle via Resend.
 * Independent of manager_invites + accept-manager-invite.
 *
 * verify_jwt = false — Authorization Bearer JWT from app is verified inside this handler
 * (anon client). DB writes use service_role.
 *
 * Actions (body.action; default "send"):
 *   send         — first invite (legacy body compatible)
 *   resend       — cancel-or-keep history + new pending + new token + email
 *   edit_resend  — same, using new name/email/staff_type (never UPDATE old email/token)
 *   cancel       — pending → cancelled (no DELETE)
 *
 * Never mutates accepted rows (status / email / full_name / staff_type / token /
 * accepted_by / accepted_at). Never writes property_members.
 *
 * APP_BASE_URL: optional secret; normalized to origin only. Empty / invalid /
 * clearstrata.ai / www.clearstrata.ai → https://app.clearstrata.ai.
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
 * Intentionally excludes `manager` — managers cannot invite staff.
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

type InviteAction = "send" | "resend" | "edit_resend" | "cancel";
const INVITE_ACTIONS = new Set<InviteAction>([
  "send",
  "resend",
  "edit_resend",
  "cancel",
]);

interface Body {
  action?: string;
  propertyId?: string;
  property_id?: string;
  inviteId?: string;
  invite_id?: string;
  staffEmail?: string;
  staff_email?: string;
  staffName?: string;
  staff_name?: string;
  staffType?: string;
  staff_type?: string;
}

interface InviteRow {
  id: string;
  property_id: string;
  email: string;
  full_name: string | null;
  staff_type: string;
  status: string;
  expires_at: string | null;
}

const INVITE_SELECT =
  "id,property_id,email,full_name,staff_type,status,expires_at";

function alreadyAcceptedResponse(): Response {
  return json(
    {
      ok: false,
      code: "STAFF_INVITE_ALREADY_ACCEPTED",
      message:
        "该职员邀请已经接受，不能重新发送。 / This staff invitation has already been accepted.",
    },
    409,
  );
}

function pendingExistsResponse(): Response {
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

function clockExpired(expiresAt: string | null | undefined): boolean {
  if (!expiresAt) return true;
  const t = new Date(expiresAt).getTime();
  if (Number.isNaN(t)) return true;
  return t <= Date.now();
}

function isUniqueViolation(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "23505") return true;
  const msg = String(err.message ?? "").toLowerCase();
  return msg.includes("uq_staff_invites_pending_property_email") ||
    msg.includes("duplicate key");
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
        <tr><td style="background:#35C3D6;padding:16px 20px;text-align:center;">
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
              <a href="${params.acceptLink}" style="display:inline-block;background:#35C3D6;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 28px;border-radius:8px;">接受职员邀请 / Accept Staff Invitation</a>
            </td></tr>
          </table>

          <p style="margin:20px 0 0;color:#6b7280;font-size:12px;line-height:1.6;">
            若按钮无法打开：<a href="${params.acceptLink}" style="color:#35C3D6;word-break:break-all;">${params.acceptLink}</a>
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

  const actionRaw = String(raw.action ?? "send").trim().toLowerCase();
  const action: InviteAction = INVITE_ACTIONS.has(actionRaw as InviteAction)
    ? (actionRaw as InviteAction)
    : ("" as InviteAction);
  if (!action) {
    return json(
      {
        ok: false,
        code: "INVALID_ACTION",
        message: "action must be one of: send, resend, edit_resend, cancel",
      },
      400,
    );
  }

  const propertyId = String(raw.propertyId ?? raw.property_id ?? "").trim();
  const inviteId = String(raw.inviteId ?? raw.invite_id ?? "").trim();
  const staffName =
    String(raw.staffName ?? raw.staff_name ?? "").trim() || null;
  const staffEmail = normalizeEmail(
    String(raw.staffEmail ?? raw.staff_email ?? ""),
  );
  const staffTypeRaw = String(raw.staffType ?? raw.staff_type ?? "")
    .trim()
    .toLowerCase();

  console.log("✅ send-staff-invite received payload", {
    action,
    propertyId,
    inviteId: inviteId || null,
    staffName,
    staffEmail: staffEmail || null,
    staffType: staffTypeRaw || null,
  });

  if (!propertyId) {
    return json({ ok: false, message: "propertyId is required" }, 400);
  }
  if (action === "resend" || action === "edit_resend" || action === "cancel") {
    if (!inviteId) {
      return json({ ok: false, message: "inviteId is required" }, 400);
    }
  }
  if (action === "send" || action === "edit_resend") {
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

    async function loadInvite(
      id: string,
    ): Promise<{ row: InviteRow | null; error: string | null }> {
      const { data, error } = await svc
        .from("staff_invites")
        .select(INVITE_SELECT)
        .eq("id", id)
        .eq("property_id", propertyId)
        .maybeSingle();
      if (error) return { row: null, error: error.message ?? "lookup_failed" };
      return { row: (data as InviteRow | null) ?? null, error: null };
    }

    async function findPendingByEmail(
      email: string,
    ): Promise<{ row: InviteRow | null; error: string | null }> {
      const { data, error } = await svc
        .from("staff_invites")
        .select(INVITE_SELECT)
        .eq("property_id", propertyId)
        .eq("status", "pending");
      if (error) return { row: null, error: error.message ?? "lookup_failed" };
      const match = (data ?? []).find(
        (r) => normalizeEmail(String((r as InviteRow).email ?? "")) === email,
      ) as InviteRow | undefined;
      return { row: match ?? null, error: null };
    }

    async function updateStatusIf(
      id: string,
      fromStatus: string,
      toStatus: string,
    ): Promise<{ hit: boolean; error: string | null }> {
      const { data, error } = await svc
        .from("staff_invites")
        .update({ status: toStatus })
        .eq("id", id)
        .eq("property_id", propertyId)
        .eq("status", fromStatus)
        .select("id");
      if (error) return { hit: false, error: error.message ?? "update_failed" };
      return { hit: Array.isArray(data) && data.length > 0, error: null };
    }

    async function restoreIf(
      id: string,
      fromStatus: string,
      toStatus: string,
    ): Promise<void> {
      const { error } = await svc
        .from("staff_invites")
        .update({ status: toStatus })
        .eq("id", id)
        .eq("property_id", propertyId)
        .eq("status", fromStatus);
      if (error) {
        console.error("❌ send-staff-invite restore failed", {
          id,
          fromStatus,
          toStatus,
          error,
        });
      }
    }

    async function membershipConflict(
      email: string,
      staffType: StaffType,
    ): Promise<Response | null> {
      let existingUserId: string | null = null;
      try {
        const { data: rpcUid, error: rpcErr } = await svc.rpc(
          "get_auth_user_id_by_email",
          { p_email: email },
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
      if (!existingUserId) return null;

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
        return null;
      }
      if (!existingMember) return null;

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

    async function insertPendingAndEmail(params: {
      email: string;
      name: string | null;
      staffType: StaffType;
      compensation?: { id: string; fromStatus: string; toStatus: string };
    }): Promise<Response> {
      const token = crypto.randomUUID();
      const expiresAt = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000,
      ).toISOString();

      const { data: inserted, error: insErr } = await svc
        .from("staff_invites")
        .insert({
          property_id: propertyId,
          email: params.email,
          full_name: params.name,
          staff_type: params.staffType,
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
        if (params.compensation) {
          await restoreIf(
            params.compensation.id,
            params.compensation.fromStatus,
            params.compensation.toStatus,
          );
        }
        if (isUniqueViolation(insErr)) {
          return pendingExistsResponse();
        }
        return json(
          {
            ok: false,
            message: insErr?.message ?? "insert_failed",
            error: insErr?.message ?? "insert_failed",
          },
          500,
        );
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

      const normalizedBaseUrl = normalizeAppBaseUrl(Deno.env.get("APP_BASE_URL"));
      const logoUrl = `${normalizedBaseUrl}/logo-email.png`;
      const acceptLink = `${normalizedBaseUrl}/staff-invite?token=${encodeURIComponent(token)}`;
      const displayName =
        params.name || params.email.split("@")[0] || "Staff";

      const html = buildStaffInviteHtml({
        recipientName: displayName,
        propertyName: String(property.name ?? "Property"),
        inviterLabel,
        staffType: params.staffType,
        logoUrl,
        acceptLink,
      });

      const resend = new Resend(Deno.env.get("RESEND_API_KEY")!.trim());
      const res = await resend.emails.send({
        from: "ClearStrata <noreply@clearstrata.ai>",
        to: params.email,
        subject: STAFF_TYPE_SUBJECTS[params.staffType],
        html,
      });

      if (res.error) {
        console.error("❌ send-staff-invite Resend rejected", res.error);
        const errMsg =
          typeof (res.error as { message?: string }).message === "string"
            ? (res.error as { message?: string }).message
            : "Resend failed";
        // Row already persisted; do not DELETE; do not restore old pending
        // (unique index would collide with the new pending row).
        return json(
          {
            ok: false,
            code: "EMAIL_FAILED",
            message:
              "邀请已创建但邮件发送失败，请稍后重试。 Invitation created but email delivery failed.",
            error: errMsg,
            invite_id: inserted.id,
          },
          502,
        );
      }

      console.log("✅ send-staff-invite final success", {
        action,
        invite_id: inserted.id,
        email_id: res.data?.id,
        to: params.email,
        staff_type: params.staffType,
        compensated_from: params.compensation?.id ?? null,
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
    }

    async function rejectIfAccepted(row: InviteRow): Promise<Response | null> {
      if (row.status === "accepted") return alreadyAcceptedResponse();
      return null;
    }

    async function cancelPendingOrReject(
      row: InviteRow,
    ): Promise<{ ok: true; compensation: { id: string; fromStatus: string; toStatus: string } | null } | { ok: false; response: Response }> {
      if (row.status === "accepted") {
        return { ok: false, response: alreadyAcceptedResponse() };
      }
      if (row.status !== "pending") {
        return { ok: true, compensation: null };
      }
      const upd = await updateStatusIf(row.id, "pending", "cancelled");
      if (upd.error) {
        return {
          ok: false,
          response: json(
            {
              ok: false,
              message: upd.error,
              error: upd.error,
            },
            500,
          ),
        };
      }
      if (upd.hit) {
        return {
          ok: true,
          compensation: {
            id: row.id,
            fromStatus: "cancelled",
            toStatus: "pending",
          },
        };
      }
      const again = await loadInvite(row.id);
      if (again.error) {
        return {
          ok: false,
          response: json(
            { ok: false, message: again.error, error: again.error },
            500,
          ),
        };
      }
      if (!again.row || again.row.status === "accepted") {
        return { ok: false, response: alreadyAcceptedResponse() };
      }
      return { ok: true, compensation: null };
    }

    // ── cancel ────────────────────────────────────────────────────────────
    if (action === "cancel") {
      const loaded = await loadInvite(inviteId);
      if (loaded.error) {
        return json(
          { ok: false, message: loaded.error, error: loaded.error },
          500,
        );
      }
      if (!loaded.row) {
        return json(
          {
            ok: false,
            code: "STAFF_INVITE_NOT_FOUND",
            message: "邀请不存在。 / Invitation not found.",
          },
          404,
        );
      }
      const accepted = await rejectIfAccepted(loaded.row);
      if (accepted) return accepted;
      if (loaded.row.status !== "pending") {
        return json(
          {
            ok: false,
            code: "STAFF_INVITE_NOT_PENDING",
            message:
              "只能撤销等待接受的职员邀请。 / Only a pending staff invitation can be cancelled.",
          },
          409,
        );
      }
      const upd = await updateStatusIf(inviteId, "pending", "cancelled");
      if (upd.error) {
        return json(
          { ok: false, message: upd.error, error: upd.error },
          500,
        );
      }
      if (!upd.hit) {
        const again = await loadInvite(inviteId);
        if (again.row?.status === "accepted") return alreadyAcceptedResponse();
        return json(
          {
            ok: false,
            code: "STAFF_INVITE_NOT_PENDING",
            message:
              "只能撤销等待接受的职员邀请。 / Only a pending staff invitation can be cancelled.",
          },
          409,
        );
      }
      return json(
        { ok: true, message: "Staff invitation cancelled", invite_id: inviteId },
        200,
      );
    }

    // ── send ──────────────────────────────────────────────────────────────
    if (action === "send") {
      const staffType = staffTypeRaw as StaffType;
      const pending = await findPendingByEmail(staffEmail);
      if (pending.error) {
        return json(
          {
            ok: false,
            message: pending.error,
            error: pending.error,
          },
          500,
        );
      }
      if (pending.row && !clockExpired(pending.row.expires_at)) {
        return pendingExistsResponse();
      }

      const conflict = await membershipConflict(staffEmail, staffType);
      if (conflict) return conflict;

      let sendCompensation:
        | { id: string; fromStatus: string; toStatus: string }
        | undefined;
      if (pending.row && clockExpired(pending.row.expires_at)) {
        const expired = await updateStatusIf(pending.row.id, "pending", "expired");
        if (expired.error) {
          return json(
            { ok: false, message: expired.error, error: expired.error },
            500,
          );
        }
        if (!expired.hit) {
          const again = await loadInvite(pending.row.id);
          if (again.row?.status === "accepted") return alreadyAcceptedResponse();
          const still = await findPendingByEmail(staffEmail);
          if (still.row && !clockExpired(still.row.expires_at)) {
            return pendingExistsResponse();
          }
        } else {
          sendCompensation = {
            id: pending.row.id,
            fromStatus: "expired",
            toStatus: "pending",
          };
        }
      }

      return await insertPendingAndEmail({
        email: staffEmail,
        name: staffName,
        staffType,
        compensation: sendCompensation,
      });
    }

    // ── resend / edit_resend ──────────────────────────────────────────────
    const loaded = await loadInvite(inviteId);
    if (loaded.error) {
      return json(
        { ok: false, message: loaded.error, error: loaded.error },
        500,
      );
    }
    if (!loaded.row) {
      return json(
        {
          ok: false,
          code: "STAFF_INVITE_NOT_FOUND",
          message: "邀请不存在。 / Invitation not found.",
        },
        404,
      );
    }
    const accepted = await rejectIfAccepted(loaded.row);
    if (accepted) return accepted;

    let nextEmail: string;
    let nextName: string | null;
    let nextType: StaffType;

    if (action === "resend") {
      nextEmail = normalizeEmail(String(loaded.row.email ?? ""));
      nextName = loaded.row.full_name;
      const st = String(loaded.row.staff_type ?? "").toLowerCase();
      if (!STAFF_TYPES.has(st as StaffType) || !nextEmail.includes("@")) {
        return json(
          {
            ok: false,
            code: "STAFF_INVITE_NOT_FOUND",
            message: "邀请无效或不存在。 / Invitation not found.",
          },
          400,
        );
      }
      nextType = st as StaffType;
    } else {
      nextEmail = staffEmail;
      nextName = staffName;
      nextType = staffTypeRaw as StaffType;
    }

    const otherPending = await findPendingByEmail(nextEmail);
    if (otherPending.error) {
      return json(
        {
          ok: false,
          message: otherPending.error,
          error: otherPending.error,
        },
        500,
      );
    }
    if (
      otherPending.row &&
      otherPending.row.id !== loaded.row.id &&
      !clockExpired(otherPending.row.expires_at)
    ) {
      return pendingExistsResponse();
    }
    if (
      otherPending.row &&
      otherPending.row.id !== loaded.row.id &&
      clockExpired(otherPending.row.expires_at)
    ) {
      const expOther = await updateStatusIf(
        otherPending.row.id,
        "pending",
        "expired",
      );
      if (expOther.error) {
        return json(
          { ok: false, message: expOther.error, error: expOther.error },
          500,
        );
      }
      if (!expOther.hit) {
        const again = await loadInvite(otherPending.row.id);
        if (again.row?.status === "accepted") return alreadyAcceptedResponse();
        const still = await findPendingByEmail(nextEmail);
        if (
          still.row &&
          still.row.id !== loaded.row.id &&
          !clockExpired(still.row.expires_at)
        ) {
          return pendingExistsResponse();
        }
      }
    }

    const conflict = await membershipConflict(nextEmail, nextType);
    if (conflict) return conflict;

    // Clock-expired pending on THIS row: resend still cancels it (spec).
    // Expired/cancelled history rows are left unchanged.
    const vacated = await cancelPendingOrReject(loaded.row);
    if (!vacated.ok) return vacated.response;

    return await insertPendingAndEmail({
      email: nextEmail,
      name: nextName,
      staffType: nextType,
      compensation: vacated.compensation ?? undefined,
    });
  } catch (error) {
    logFullCatchError(error);
    const msg = error instanceof Error ? error.message : "unknown_error";
    return json({ ok: false, error: msg, message: msg }, 500);
  }
});
