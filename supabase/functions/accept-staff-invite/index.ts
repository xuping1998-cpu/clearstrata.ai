/**
 * Accept staff (lawyer / auditor / finance / accountant) invitation.
 *
 * - Preview mode (POST { token } or { token, preview: true }): returns invite metadata.
 * - Accept mode  (POST { token, password, fullName? }): creates/updates auth user,
 *   upserts profile, writes property_members(role='viewer', staff_type=invite.staff_type, status='active'),
 *   marks staff_invites.status = 'accepted' atomically.
 *
 * verify_jwt = false — no caller JWT required (token in body identifies invite).
 * Uses service_role for all DB writes (RLS already restricts who can READ/WRITE staff_invites).
 *
 * STRICT BOUNDARIES (Phase 2C):
 *   - Does NOT touch manager_invites / accept-manager-invite / send-manager-invite.
 *   - Does NOT alter the user_role enum.
 *   - Does NOT change profiles.app_role.
 *   - Never overwrites an **active** non-viewer membership (owner / council / manager /
 *     admin / property_admin, etc.). Staff Invite must not cover a live governance role.
 *   - A **removed** historical membership for the same (property_id, user_id) MAY be reused
 *     in place as viewer staff (UPDATE; UNIQUE forbids INSERT). This is not owner restoration
 *     and does not rebind residents.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

function apiJson(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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

interface InviteRow {
  id: string;
  property_id: string;
  email: string;
  full_name: string | null;
  staff_type: string;
  status: string;
  expires_at: string | null;
}

async function loadInvite(
  svc: ReturnType<typeof createClient>,
  token: string,
): Promise<{ invite: InviteRow; propertyName: string | null } | null> {
  const { data, error } = await svc
    .from("staff_invites")
    .select("id,property_id,email,full_name,staff_type,status,expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;

  const invite = data as InviteRow;
  const { data: prop } = await svc
    .from("properties")
    .select("name")
    .eq("id", invite.property_id)
    .maybeSingle();

  return {
    invite,
    propertyName: (prop?.name as string | undefined) ?? null,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return apiJson(
      { ok: false, code: "METHOD", message: "Method not allowed" },
      405,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !sr) {
    return apiJson(
      { ok: false, code: "CONFIG", message: "Server misconfigured" },
      503,
    );
  }

  let token = "";
  let passwordRaw = "";
  let formFullName = "";
  let explicitPreview = false;
  try {
    const b = (await req.json()) as {
      token?: string;
      password?: string;
      fullName?: string;
      full_name?: string;
      preview?: boolean;
    };
    token = String(b.token ?? "").trim();
    passwordRaw = String(b.password ?? "");
    formFullName = String(b.fullName ?? b.full_name ?? "").trim();
    explicitPreview = b.preview === true;
  } catch {
    return apiJson(
      { ok: false, code: "BAD_BODY", message: "Invalid JSON" },
      400,
    );
  }

  if (!token) {
    return apiJson(
      { ok: false, code: "BAD_TOKEN", message: "token is required" },
      400,
    );
  }

  const svc = createClient(supabaseUrl, sr, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const loaded = await loadInvite(svc, token);
  if (!loaded) {
    return apiJson(
      {
        ok: false,
        code: "STAFF_INVITE_NOT_FOUND",
        message: "邀请无效或不存在 / Invitation not found",
      },
      200,
    );
  }

  const { invite, propertyName } = loaded;
  const staffTypeRaw = String(invite.staff_type ?? "").toLowerCase();
  if (!STAFF_TYPES.has(staffTypeRaw as StaffType)) {
    console.error("[accept-staff-invite] unexpected staff_type on row", {
      invite_id: invite.id,
      staffTypeRaw,
    });
    return apiJson(
      {
        ok: false,
        code: "STAFF_INVITE_NOT_FOUND",
        message: "邀请无效或不存在 / Invitation not found",
      },
      200,
    );
  }
  const staffType = staffTypeRaw as StaffType;
  const staffTypeLabel = STAFF_TYPE_LABELS[staffType];

  const now = Date.now();
  const exp = invite.expires_at
    ? new Date(invite.expires_at).getTime()
    : Number.NaN;

  if (invite.status === "accepted" || invite.status === "cancelled") {
    return apiJson(
      {
        ok: false,
        code: "STAFF_INVITE_ALREADY_USED",
        message: "邀请已被使用 / Invitation already used",
      },
      200,
    );
  }
  if (invite.status === "expired") {
    return apiJson(
      {
        ok: false,
        code: "STAFF_INVITE_EXPIRED",
        message: "邀请已过期 / Invitation expired",
      },
      200,
    );
  }
  if (invite.status !== "pending") {
    return apiJson(
      {
        ok: false,
        code: "STAFF_INVITE_NOT_FOUND",
        message: "邀请无效或不存在 / Invitation not found",
      },
      200,
    );
  }
  if (Number.isNaN(exp) || exp < now) {
    await svc
      .from("staff_invites")
      .update({ status: "expired" })
      .eq("id", invite.id)
      .eq("status", "pending");
    return apiJson(
      {
        ok: false,
        code: "STAFF_INVITE_EXPIRED",
        message: "邀请已过期 / Invitation expired",
      },
      200,
    );
  }

  const inviteEmailOriginal = String(invite.email ?? "").trim();
  const emailNorm = inviteEmailOriginal.toLowerCase();

  // ── Preview mode ─────────────────────────────────────────────────────────
  if (explicitPreview || passwordRaw.trim() === "") {
    return apiJson(
      {
        ok: true,
        mode: "preview",
        propertyId: invite.property_id,
        propertyName: propertyName ?? "",
        staffEmail: inviteEmailOriginal,
        staffName: invite.full_name ?? "",
        staffType,
        staffTypeLabel,
        expiresAt: invite.expires_at,
      },
      200,
    );
  }

  // ── Accept mode ──────────────────────────────────────────────────────────
  const password = passwordRaw;
  if (password.length < 8) {
    return apiJson(
      {
        ok: false,
        code: "PASSWORD_TOO_SHORT",
        message: "密码至少需要 8 位 / Password must be at least 8 characters",
      },
      200,
    );
  }

  /**
   * Conflict pre-check (BEFORE touching auth.users) — only blocks if we can
   * resolve an existing auth user for this email AND they already have an
   * active membership that would be overwritten.
   */
  const { data: preExistingId, error: preRpcErr } = await svc.rpc(
    "get_auth_user_id_by_email",
    { p_email: emailNorm },
  );
  if (preRpcErr) {
    console.error(
      "[accept-staff-invite] get_auth_user_id_by_email (pre-check)",
      preRpcErr,
    );
    return apiJson(
      { ok: false, code: "RPC", message: "服务器错误，请稍后重试" },
      500,
    );
  }

  if (preExistingId && typeof preExistingId === "string") {
    const { data: pre, error: preErr } = await svc
      .from("property_members")
      .select("role,staff_type,status")
      .eq("property_id", invite.property_id)
      .eq("user_id", preExistingId)
      .eq("status", "active")
      .maybeSingle();

    if (preErr) {
      console.error(
        "[accept-staff-invite] property_members pre-check",
        preErr,
      );
      return apiJson(
        {
          ok: false,
          code: "MEMBER_LOOKUP_FAILED",
          message: preErr.message ?? "membership lookup failed",
        },
        500,
      );
    }

    if (pre) {
      const preRole = String(pre.role ?? "").toLowerCase();
      const preStaffType = pre.staff_type
        ? String(pre.staff_type).toLowerCase()
        : null;
      if (preRole !== "viewer") {
        return apiJson(
          {
            ok: false,
            code: "EXISTING_OTHER_ROLE",
            message:
              "此邮箱已是本物业成员，不能作为外部职员接受邀请 / Email already has a non-staff role in this property",
          },
          200,
        );
      }
      if (preStaffType && preStaffType !== staffType) {
        return apiJson(
          {
            ok: false,
            code: "EXISTING_OTHER_STAFF_TYPE",
            message:
              "此邮箱已是其他类型职员，请联系业委会处理 / Email already mapped to a different staff type",
          },
          200,
        );
      }
      // viewer + same staff_type → idempotent path handled later.
    }
  }

  // ── Resolve / create auth user (mirrors accept-manager-invite) ───────────
  const mdName =
    formFullName ||
    String(invite.full_name ?? "").trim() ||
    emailNorm.split("@")[0] ||
    emailNorm;

  let userId: string;

  if (preExistingId && typeof preExistingId === "string") {
    userId = preExistingId;
    const { error: updAuthErr } = await svc.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updAuthErr) {
      console.error("[accept-staff-invite] updateUserById", updAuthErr);
      return apiJson(
        {
          ok: false,
          code: "AUTH_UPDATE_FAILED",
          message: updAuthErr.message,
        },
        500,
      );
    }
  } else {
    const { data: nu, error: cErr } = await svc.auth.admin.createUser({
      email: emailNorm,
      password,
      email_confirm: true,
      user_metadata: { full_name: mdName },
    });

    if (nu?.user?.id) {
      userId = nu.user.id;
    } else {
      const msg = (cErr?.message ?? "").toLowerCase();
      const dup =
        msg.includes("already") ||
        msg.includes("registered") ||
        msg.includes("exists");

      if (dup) {
        const { data: second } = await svc.rpc("get_auth_user_id_by_email", {
          p_email: emailNorm,
        });
        if (!second || typeof second !== "string") {
          console.error(
            "[accept-staff-invite] createUser dup but no RPC id",
            cErr,
          );
          return apiJson(
            {
              ok: false,
              code: "AUTH_CONFLICT",
              message: "邮箱处理失败，请联系支持",
            },
            500,
          );
        }
        userId = second;

        // Re-run conflict check using freshly resolved id — could have been
        // created between pre-check and now (TOCTOU).
        const { data: late, error: lateErr } = await svc
          .from("property_members")
          .select("role,staff_type,status")
          .eq("property_id", invite.property_id)
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle();
        if (lateErr) {
          console.error(
            "[accept-staff-invite] late property_members check",
            lateErr,
          );
          return apiJson(
            {
              ok: false,
              code: "MEMBER_LOOKUP_FAILED",
              message: lateErr.message ?? "membership lookup failed",
            },
            500,
          );
        }
        if (late) {
          const lateRole = String(late.role ?? "").toLowerCase();
          const lateStaffType = late.staff_type
            ? String(late.staff_type).toLowerCase()
            : null;
          if (lateRole !== "viewer") {
            return apiJson(
              {
                ok: false,
                code: "EXISTING_OTHER_ROLE",
                message:
                  "此邮箱已是本物业成员，不能作为外部职员接受邀请 / Email already has a non-staff role in this property",
              },
              200,
            );
          }
          if (lateStaffType && lateStaffType !== staffType) {
            return apiJson(
              {
                ok: false,
                code: "EXISTING_OTHER_STAFF_TYPE",
                message:
                  "此邮箱已是其他类型职员，请联系业委会处理 / Email already mapped to a different staff type",
              },
              200,
            );
          }
        }

        const { error: u2 } = await svc.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
        });
        if (u2) {
          console.error("[accept-staff-invite] updateUser after dup", u2);
          return apiJson(
            { ok: false, code: "AUTH_UPDATE_FAILED", message: u2.message },
            500,
          );
        }
      } else {
        console.error("[accept-staff-invite] createUser", cErr);
        return apiJson(
          {
            ok: false,
            code: "AUTH_CREATE_FAILED",
            message: cErr?.message ?? "创建账号失败",
          },
          500,
        );
      }
    }
  }

  // ── profiles: minimal — never set/overwrite role or app_role ─────────────
  // Insert path: omit `role` so the column default ('owner', from
  // public.profiles definition) applies. We do NOT write 'viewer' here; the
  // viewer authorization is carried by property_members.role, not profiles.role.
  // Update path: only backfill full_name_en when the existing profile has none.
  // We do NOT touch role / app_role / email / status / preferred_language.
  const displayNameEn = mdName;

  const { data: prevProf } = await svc
    .from("profiles")
    .select("id,full_name_en")
    .eq("id", userId)
    .maybeSingle();

  if (!prevProf) {
    const ins = await svc.from("profiles").insert({
      id: userId,
      email: emailNorm,
      full_name_en: displayNameEn,
    });
    if (ins.error?.code === "23505") {
      // Race: profile was created concurrently — only backfill missing name.
      const { data: raceProf } = await svc
        .from("profiles")
        .select("full_name_en")
        .eq("id", userId)
        .maybeSingle();
      const raceName = String(
        (raceProf?.full_name_en as string | null) ?? "",
      ).trim();
      if (!raceName && displayNameEn) {
        await svc
          .from("profiles")
          .update({ full_name_en: displayNameEn })
          .eq("id", userId);
      }
    } else if (ins.error) {
      console.error("[accept-staff-invite] profile insert", ins.error);
      return apiJson(
        { ok: false, code: "PROFILE_FAILED", message: ins.error.message },
        500,
      );
    }
  } else {
    const existingName = String(
      (prevProf.full_name_en as string | null) ?? "",
    ).trim();
    if (!existingName && displayNameEn) {
      const { error: upProfErr } = await svc
        .from("profiles")
        .update({ full_name_en: displayNameEn })
        .eq("id", userId);
      if (upProfErr) {
        console.error("[accept-staff-invite] profile name backfill", upProfErr);
        return apiJson(
          { ok: false, code: "PROFILE_FAILED", message: upProfErr.message },
          500,
        );
      }
    }
    // else: keep existing profile untouched (no role / app_role / email writes).
  }

  // ── property_members ─────────────────────────────────────────────────────
  // No row            → INSERT viewer staff.
  // status=removed    → UPDATE in place to viewer staff (UNIQUE (property_id, user_id)).
  // otherwise         → existing viewer / active-non-viewer protection (unchanged).
  const { data: existingMember, error: emErr } = await svc
    .from("property_members")
    .select("id,role,staff_type,status")
    .eq("property_id", invite.property_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (emErr) {
    console.error("[accept-staff-invite] property_members select", emErr);
    return apiJson(
      {
        ok: false,
        code: "MEMBER_LOOKUP_FAILED",
        message: emErr.message ?? "membership lookup failed",
      },
      500,
    );
  }

  if (!existingMember) {
    const { error: insMemberErr } = await svc.from("property_members").insert({
      property_id: invite.property_id,
      user_id: userId,
      role: "viewer",
      staff_type: staffType,
      status: "active",
    });
    if (insMemberErr) {
      console.error(
        "[accept-staff-invite] property_members insert",
        insMemberErr,
      );
      return apiJson(
        {
          ok: false,
          code: "MEMBER_INSERT_FAILED",
          message: insMemberErr.message,
        },
        500,
      );
    }
  } else if (String(existingMember.status ?? "").toLowerCase() === "removed") {
    // Historical removed membership: reuse the same row as external viewer staff.
    // Concurrent restore to active owner/council/manager must not be overwritten:
    // UPDATE is gated on status='removed'.
    const memberId = existingMember.id as string;
    const acceptedAtIso = new Date().toISOString();
    const { data: reusedRows, error: reuseErr } = await svc
      .from("property_members")
      .update({
        role: "viewer",
        staff_type: staffType,
        status: "active",
        unit_no: null,
        unit_id: null,
        join_invite_code: null,
        join_entry_source: null,
        approved_at: acceptedAtIso,
      })
      .eq("id", memberId)
      .eq("property_id", invite.property_id)
      .eq("user_id", userId)
      .eq("status", "removed")
      .select("id");
    if (reuseErr) {
      console.error(
        "[accept-staff-invite] property_members reuse-removed",
        reuseErr,
      );
      return apiJson(
        {
          ok: false,
          code: "MEMBER_UPDATE_FAILED",
          message: reuseErr.message,
        },
        500,
      );
    }
    if (!reusedRows?.length) {
      const { data: raced, error: racedErr } = await svc
        .from("property_members")
        .select("id,role,status")
        .eq("id", memberId)
        .eq("property_id", invite.property_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (racedErr) {
        console.error(
          "[accept-staff-invite] property_members reuse-removed re-read",
          racedErr,
        );
        return apiJson(
          {
            ok: false,
            code: "MEMBER_LOOKUP_FAILED",
            message: racedErr.message ?? "membership lookup failed",
          },
          500,
        );
      }
      const racedRole = String(raced?.role ?? "").toLowerCase();
      const racedStatus = String(raced?.status ?? "").toLowerCase();
      if (racedStatus === "active" && racedRole !== "viewer") {
        return apiJson(
          {
            ok: false,
            code: "EXISTING_OTHER_ROLE",
            message:
              "此邮箱已是本物业成员，不能作为外部职员接受邀请 / Email already has a non-staff role in this property",
          },
          200,
        );
      }
      return apiJson(
        {
          ok: false,
          code: "MEMBER_UPDATE_CONFLICT",
          message:
            "成员状态已变化，无法完成职员邀请 / Membership changed during accept; staff invite was not applied",
        },
        200,
      );
    }
  } else {
    const existingRole = String(existingMember.role ?? "").toLowerCase();
    const existingStaffType = existingMember.staff_type
      ? String(existingMember.staff_type).toLowerCase()
      : null;
    const existingStatus = String(existingMember.status ?? "").toLowerCase();

    if (existingRole !== "viewer") {
      return apiJson(
        {
          ok: false,
          code: "EXISTING_OTHER_ROLE",
          message:
            "此邮箱已是本物业成员，不能作为外部职员接受邀请 / Email already has a non-staff role in this property",
        },
        200,
      );
    }
    if (existingStaffType && existingStaffType !== staffType) {
      return apiJson(
        {
          ok: false,
          code: "EXISTING_OTHER_STAFF_TYPE",
          message:
            "此邮箱已是其他类型职员，请联系业委会处理 / Email already mapped to a different staff type",
        },
        200,
      );
    }
    // viewer + same staff_type — reactivate if needed; do not change role.
    const needsReactivate = existingStatus !== "active";
    const needsStaffTypeBackfill = !existingStaffType;
    if (needsReactivate || needsStaffTypeBackfill) {
      const updatePayload: Record<string, unknown> = {};
      if (needsReactivate) updatePayload.status = "active";
      if (needsStaffTypeBackfill) updatePayload.staff_type = staffType;
      const { error: upMemberErr } = await svc
        .from("property_members")
        .update(updatePayload)
        .eq("id", existingMember.id as string);
      if (upMemberErr) {
        console.error(
          "[accept-staff-invite] property_members backfill",
          upMemberErr,
        );
        return apiJson(
          {
            ok: false,
            code: "MEMBER_UPDATE_FAILED",
            message: upMemberErr.message,
          },
          500,
        );
      }
    }
  }

  // ── Atomic invite finalisation ───────────────────────────────────────────
  const { data: touched, error: updInviteErr } = await svc
    .from("staff_invites")
    .update({
      status: "accepted",
      accepted_by: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id)
    .eq("status", "pending")
    .select("id");

  if (updInviteErr) {
    console.error("[accept-staff-invite] update invite", updInviteErr);
    return apiJson(
      {
        ok: false,
        code: "INVITE_UPDATE_FAILED",
        message: updInviteErr.message,
      },
      500,
    );
  }

  if (!touched?.length) {
    return apiJson(
      {
        ok: false,
        code: "STAFF_INVITE_ALREADY_USED",
        message: "邀请已被使用 / Invitation already used",
      },
      200,
    );
  }

  return apiJson(
    {
      ok: true,
      propertyId: invite.property_id,
      propertyName: propertyName ?? "",
      role: "viewer",
      staffType,
      staffTypeLabel,
      email: inviteEmailOriginal,
      message:
        "您已加入本物业，权限为只读职员。 You have joined this property as read-only staff.",
    },
    200,
  );
});
