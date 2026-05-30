/**
 * Accept a DIRECTED OWNER invitation — two-step direct entry.
 *
 * Input: { token }   (NO password / NO email / NO full_name / NO OTP)
 *
 * Flow (all DB writes via service_role; RLS bypassed):
 *   1. Load owner_invites by token; must be status='pending' AND not expired.
 *      - token exists but status='accepted' → { ok:false, code:'invite_already_used' }
 *      - otherwise missing/expired/revoked → { ok:false, code:'invalid_or_expired' }
 *   2. Resolve property name.
 *   3. Resolve / create auth user for invite.email (email_confirm=true, NO password).
 *   4. Upsert profiles (email + full_name → full_name_en/zh; never touches role/app_role).
 *   5. Existing membership guard:
 *      - active owner            → idempotent (mark accepted + issue magic link).
 *      - active non-owner        → { ok:false, code:'conflict_existing_member' } (no overwrite).
 *   6. Upsert property_members (role='owner', status='active', + unit_no/approved_* if present).
 *   7. Upsert residents (mirrors approve_join_request_final: bind roster row / insert).
 *   8. Mark owner_invites accepted (atomic; single-use).
 *   9. Generate magiclink → return action_link (front-end navigates to it).
 *
 * verify_jwt = false — public token endpoint (the unauthenticated owner clicks the link).
 *
 * STRICT BOUNDARIES:
 *   - Accepted tokens NEVER mint a new magic link (single-use; no re-login backdoor).
 *   - Does NOT touch staff_invites / manager_invites / join_requests / submit_join_request.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2";

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

const APP_BASE_DEFAULT_ORIGIN = "https://app.clearstrata.ai";

function normalizeAppBaseUrl(raw?: string | null): string {
  const cleaned = (raw ?? "").trim().replace(/[\u200B-\u200D\uFEFF]/g, "");
  if (!cleaned) return APP_BASE_DEFAULT_ORIGIN;
  const withProtocol = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  let origin: string;
  try {
    origin = new URL(withProtocol).origin;
  } catch {
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

/** Extract a column name from a PostgREST (PGRST204) or Postgres (42703) error. */
function extractMissingColumn(error: unknown): string | null {
  const msg = String((error as { message?: string })?.message ?? "");
  const m1 = msg.match(/Could not find the '([^']+)' column/);
  if (m1) return m1[1];
  const m2 = msg.match(/column "([^"]+)"/);
  if (m2) return m2[1];
  return null;
}

function isMissingColumnError(error: unknown): boolean {
  const code = String((error as { code?: string })?.code ?? "");
  if (code === "PGRST204" || code === "42703") return true;
  return /Could not find the '.*' column|column ".*" .*does not exist/.test(
    String((error as { message?: string })?.message ?? ""),
  );
}

interface OwnerInviteRow {
  id: string;
  property_id: string;
  email: string;
  full_name: string;
  unit_no: string;
  status: string;
  invited_by: string | null;
  expires_at: string | null;
}

async function loadInviteByToken(
  svc: SupabaseClient,
  token: string,
): Promise<OwnerInviteRow | null> {
  const { data, error } = await svc
    .from("owner_invites")
    .select("id,property_id,email,full_name,unit_no,status,invited_by,expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  return data as OwnerInviteRow;
}

/**
 * Upsert that tolerates optional columns missing from the live schema:
 * on a missing-column error it strips that key (if optional) and retries.
 */
async function upsertWithColumnFallback(
  svc: SupabaseClient,
  table: string,
  payload: Record<string, unknown>,
  onConflict: string,
  optionalKeys: Set<string>,
): Promise<{ error: unknown }> {
  const body: Record<string, unknown> = { ...payload };
  for (let attempt = 0; attempt <= optionalKeys.size + 1; attempt++) {
    const { error } = await svc.from(table).upsert(body, { onConflict });
    if (!error) return { error: null };
    if (isMissingColumnError(error)) {
      const col = extractMissingColumn(error);
      if (col && col in body && optionalKeys.has(col)) {
        delete body[col];
        continue;
      }
    }
    return { error };
  }
  return { error: null };
}

async function generateMagicLink(
  svc: SupabaseClient,
  email: string,
  redirectTo: string,
): Promise<string | null> {
  const { data, error } = await svc.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  if (error) {
    console.error("[accept-owner-invite] generateLink", error);
    return null;
  }
  const actionLink =
    (data?.properties as { action_link?: string } | undefined)?.action_link ??
    null;
  return actionLink ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return apiJson({ ok: false, code: "method", message: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !sr) {
    return apiJson({ ok: false, code: "config", message: "Server misconfigured" }, 503);
  }

  let token = "";
  try {
    const b = (await req.json()) as { token?: string };
    token = String(b.token ?? "").trim();
  } catch {
    return apiJson({ ok: false, code: "bad_body", message: "Invalid JSON" }, 400);
  }
  if (!token) {
    return apiJson({ ok: false, code: "invalid_or_expired", message: "token is required" }, 200);
  }

  const svc = createClient(supabaseUrl, sr, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── 1) Load + validate invite ──────────────────────────────────────────
  const invite = await loadInviteByToken(svc, token);
  if (!invite) {
    return apiJson({ ok: false, code: "invalid_or_expired", message: "邀请无效或已过期 / Invitation invalid or expired" }, 200);
  }

  // Single-use: an accepted token must NEVER mint a new magic link.
  if (invite.status === "accepted") {
    return apiJson({ ok: false, code: "invite_already_used", message: "邀请已被使用 / Invitation already used" }, 200);
  }
  if (invite.status !== "pending") {
    return apiJson({ ok: false, code: "invalid_or_expired", message: "邀请无效或已过期 / Invitation invalid or expired" }, 200);
  }
  const exp = invite.expires_at ? new Date(invite.expires_at).getTime() : Number.NaN;
  if (Number.isNaN(exp) || exp < Date.now()) {
    await svc
      .from("owner_invites")
      .update({ status: "expired" })
      .eq("id", invite.id)
      .eq("status", "pending");
    return apiJson({ ok: false, code: "invalid_or_expired", message: "邀请已过期 / Invitation expired" }, 200);
  }

  const email = String(invite.email ?? "").trim().toLowerCase();
  const fullName = String(invite.full_name ?? "").trim();
  const unitNo = String(invite.unit_no ?? "").trim();
  const propertyId = invite.property_id;
  const appBaseUrl = normalizeAppBaseUrl(Deno.env.get("APP_BASE_URL"));
  const redirectTo = `${appBaseUrl}/?propertyId=${encodeURIComponent(propertyId)}`;

  // ── 2) Property name (best-effort) ─────────────────────────────────────
  const { data: prop } = await svc
    .from("properties")
    .select("name")
    .eq("id", propertyId)
    .maybeSingle();
  const propertyName = (prop?.name as string | undefined) ?? "";

  // ── 3) Resolve / create auth user (NO password) ────────────────────────
  let userId: string | null = null;
  try {
    const { data: rpcUid } = await svc.rpc("get_auth_user_id_by_email", { p_email: email });
    if (typeof rpcUid === "string" && rpcUid) userId = rpcUid;
  } catch (e) {
    console.warn("[accept-owner-invite] get_auth_user_id_by_email threw (non-fatal)", e);
  }

  if (!userId) {
    const { data: nu, error: cErr } = await svc.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName, property_id: propertyId, unit_no: unitNo },
    });
    if (nu?.user?.id) {
      userId = nu.user.id;
    } else {
      const msg = (cErr?.message ?? "").toLowerCase();
      const dup = msg.includes("already") || msg.includes("registered") || msg.includes("exists");
      if (dup) {
        const { data: second } = await svc.rpc("get_auth_user_id_by_email", { p_email: email });
        if (typeof second === "string" && second) userId = second;
      }
      if (!userId) {
        console.error("[accept-owner-invite] createUser failed", cErr);
        return apiJson({ ok: false, code: "auth_create_failed", message: cErr?.message ?? "创建账号失败" }, 500);
      }
    }
  }

  // ── 4) Upsert profiles (insert if missing; backfill names only if empty) ─
  const { data: prevProf } = await svc
    .from("profiles")
    .select("id,full_name_en,full_name_zh")
    .eq("id", userId)
    .maybeSingle();

  if (!prevProf) {
    const { error: insProfErr } = await svc.from("profiles").insert({
      id: userId,
      email,
      full_name_en: fullName,
      full_name_zh: fullName,
    });
    if (insProfErr && insProfErr.code !== "23505") {
      console.error("[accept-owner-invite] profile insert", insProfErr);
      return apiJson({ ok: false, code: "profile_failed", message: insProfErr.message }, 500);
    }
  } else {
    const patch: Record<string, unknown> = {};
    if (!String(prevProf.full_name_en ?? "").trim() && fullName) patch.full_name_en = fullName;
    if (!String(prevProf.full_name_zh ?? "").trim() && fullName) patch.full_name_zh = fullName;
    if (Object.keys(patch).length > 0) {
      const { error: upProfErr } = await svc.from("profiles").update(patch).eq("id", userId);
      if (upProfErr) {
        console.warn("[accept-owner-invite] profile name backfill (non-fatal)", upProfErr);
      }
    }
  }

  // ── 5) Existing membership guard ───────────────────────────────────────
  const { data: existingMember, error: emErr } = await svc
    .from("property_members")
    .select("id,role,status")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();
  if (emErr) {
    console.error("[accept-owner-invite] property_members select", emErr);
    return apiJson({ ok: false, code: "member_lookup_failed", message: emErr.message }, 500);
  }

  const existingRole = String(existingMember?.role ?? "").toLowerCase();
  const existingStatus = String(existingMember?.status ?? "").toLowerCase();
  const alreadyActiveOwner = existingStatus === "active" && existingRole === "owner";

  if (existingMember && existingStatus === "active" && existingRole && existingRole !== "owner") {
    return apiJson(
      {
        ok: false,
        code: "conflict_existing_member",
        message:
          "该账号在本物业已是其他角色，无法作为业主接受邀请。 This account already holds another role in this property.",
      },
      200,
    );
  }

  // ── 6) Upsert property_members (skip overwrite if already active owner) ──
  if (!alreadyActiveOwner) {
    const pmOptional = new Set(["unit_no", "approved_by", "approved_at"]);
    const pmPayload: Record<string, unknown> = {
      property_id: propertyId,
      user_id: userId,
      role: "owner",
      status: "active",
      unit_no: unitNo || null,
      approved_by: invite.invited_by ?? null,
      approved_at: new Date().toISOString(),
    };
    const { error: pmErr } = await upsertWithColumnFallback(
      svc,
      "property_members",
      pmPayload,
      "property_id,user_id",
      pmOptional,
    );
    if (pmErr) {
      console.error("[accept-owner-invite] property_members upsert", pmErr);
      return apiJson({ ok: false, code: "member_upsert_failed", message: String((pmErr as { message?: string }).message ?? "member upsert failed") }, 500);
    }
  }

  // ── 7) Upsert residents (mirror approve_join_request_final intent) ──────
  await upsertResidents(svc, { propertyId, userId, unitNo, fullName, email });

  // ── 8) Mark invite accepted (atomic single-use) ────────────────────────
  const { data: touched, error: updInviteErr } = await svc
    .from("owner_invites")
    .update({
      status: "accepted",
      accepted_by: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id)
    .eq("status", "pending")
    .select("id");
  if (updInviteErr) {
    console.error("[accept-owner-invite] invite finalize", updInviteErr);
    return apiJson({ ok: false, code: "invite_update_failed", message: updInviteErr.message }, 500);
  }
  if (!touched?.length) {
    // Lost the race — another request already accepted it.
    return apiJson({ ok: false, code: "invite_already_used", message: "邀请已被使用 / Invitation already used" }, 200);
  }

  // ── 8b) Revoke other PENDING invites for the same unit (lifecycle consistency).
  //       Keeps audit history (no delete); only pending rows flip to revoked.
  //       Failure here must NOT affect the accepted main flow → warn only.
  try {
    const unitKey = unitNo.trim().toLowerCase();
    const { data: siblings, error: sibErr } = await svc
      .from("owner_invites")
      .select("id,unit_no")
      .eq("property_id", propertyId)
      .eq("status", "pending")
      .neq("id", invite.id)
      .ilike("unit_no", unitNo.trim());
    if (sibErr) {
      console.warn("[accept-owner-invite] sibling pending lookup (non-fatal)", sibErr);
    } else if (Array.isArray(siblings) && siblings.length > 0) {
      const staleIds = siblings
        .filter((r) => String(r.unit_no ?? "").trim().toLowerCase() === unitKey)
        .map((r) => r.id as string);
      if (staleIds.length > 0) {
        const { error: revErr } = await svc
          .from("owner_invites")
          .update({ status: "revoked", updated_at: new Date().toISOString() })
          .in("id", staleIds)
          .eq("status", "pending");
        if (revErr) {
          console.warn("[accept-owner-invite] revoke same-unit pending (non-fatal)", revErr);
        } else {
          console.log("[accept-owner-invite] revoked stale pending invites", {
            propertyId,
            unit_no: unitNo,
            count: staleIds.length,
          });
        }
      }
    }
  } catch (e) {
    console.warn("[accept-owner-invite] revoke same-unit pending threw (non-fatal)", e);
  }

  // ── 9) Magic link → front-end navigates to it (auto session, no OTP) ────
  const actionLink = await generateMagicLink(svc, email, redirectTo);
  if (!actionLink) {
    // Membership is already active; user can simply log in later.
    return apiJson(
      {
        ok: true,
        property_id: propertyId,
        property_name: propertyName,
        action_link: null,
        fallback_login: `${appBaseUrl}/login?email=${encodeURIComponent(email)}`,
        message: "已加入物业，但自动登录链接生成失败，请使用邮箱登录。",
      },
      200,
    );
  }

  console.log("✅ accept-owner-invite success", { invite_id: invite.id, property_id: propertyId });
  return apiJson(
    { ok: true, property_id: propertyId, property_name: propertyName, action_link: actionLink },
    200,
  );
});

/**
 * Residents upsert mirroring approve_join_request_final: prefer binding an
 * existing roster row for the unit; otherwise update the user's row or insert.
 * Best-effort + column-tolerant: residents accuracy must not block membership.
 */
async function upsertResidents(
  svc: SupabaseClient,
  args: { propertyId: string; userId: string; unitNo: string; fullName: string; email: string },
): Promise<void> {
  const { propertyId, userId, unitNo, fullName, email } = args;
  const optional = new Set([
    "name_en",
    "name_zh",
    "email",
    "phone",
    "role",
    "status",
    "strata_fee_status",
    "language_pref",
  ]);

  try {
    // (a) Row already owned by this user?
    const { data: own } = await svc
      .from("residents")
      .select("id")
      .eq("property_id", propertyId)
      .eq("user_id", userId)
      .maybeSingle();

    if (own?.id) {
      await updateResidentsRow(svc, own.id as string, { unitNo, fullName, email }, optional);
      return;
    }

    // (b) Unoccupied roster row for this unit → bind it.
    if (unitNo) {
      const { data: roster } = await svc
        .from("residents")
        .select("id,user_id")
        .eq("property_id", propertyId)
        .ilike("unit_no", unitNo)
        .is("user_id", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (roster?.id) {
        await updateResidentsRow(
          svc,
          roster.id as string,
          { unitNo, fullName, email, userId },
          optional,
        );
        return;
      }

      // (c) Unit already bound to another active user → don't clobber; log only.
      const { data: other } = await svc
        .from("residents")
        .select("id,user_id")
        .eq("property_id", propertyId)
        .ilike("unit_no", unitNo)
        .not("user_id", "is", null)
        .neq("user_id", userId)
        .limit(1)
        .maybeSingle();
      if (other?.id) {
        console.warn("[accept-owner-invite] residents unit already bound to another user; membership stands", {
          propertyId,
          unitNo,
        });
        return;
      }
    }

    // (d) Insert fresh roster row.
    const insertPayload: Record<string, unknown> = {
      property_id: propertyId,
      user_id: userId,
      unit_no: unitNo,
      name_en: fullName,
      name_zh: fullName,
      email,
      role: "owner",
      status: "active",
      strata_fee_status: "current",
    };
    const body: Record<string, unknown> = { ...insertPayload };
    for (let attempt = 0; attempt <= optional.size + 1; attempt++) {
      const { error } = await svc.from("residents").insert(body);
      if (!error) return;
      if (isMissingColumnError(error)) {
        const col = extractMissingColumn(error);
        if (col && col in body && optional.has(col)) {
          delete body[col];
          continue;
        }
      }
      console.warn("[accept-owner-invite] residents insert (non-fatal)", error);
      return;
    }
  } catch (e) {
    console.warn("[accept-owner-invite] residents upsert threw (non-fatal)", e);
  }
}

async function updateResidentsRow(
  svc: SupabaseClient,
  rowId: string,
  args: { unitNo: string; fullName: string; email: string; userId?: string },
  optional: Set<string>,
): Promise<void> {
  const patch: Record<string, unknown> = {
    unit_no: args.unitNo,
    name_en: args.fullName,
    name_zh: args.fullName,
    email: args.email,
    role: "owner",
    status: "active",
  };
  if (args.userId) patch.user_id = args.userId;

  const body: Record<string, unknown> = { ...patch };
  for (let attempt = 0; attempt <= optional.size + 1; attempt++) {
    const { error } = await svc.from("residents").update(body).eq("id", rowId);
    if (!error) return;
    if (isMissingColumnError(error)) {
      const col = extractMissingColumn(error);
      if (col && col in body && optional.has(col)) {
        delete body[col];
        continue;
      }
    }
    console.warn("[accept-owner-invite] residents update (non-fatal)", error);
    return;
  }
}
