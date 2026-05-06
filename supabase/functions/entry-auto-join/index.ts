/**
 * entry-auto-join: QR property entry form submission handler.
 *
 * Responsibilities:
 * - Validates invite code against property_invite_codes
 * - Checks unit_whitelist (non-whitelist → error, no user created, no writes)
 * - Finds or creates user by email (service role)
 * - Determines outcome: auto_approved / pending_submitted / already_member
 * - Writes property_members (auto_approved) or join_requests (pending cases)
 * - Creates a one-time entry_token (10-minute TTL)
 * - Returns redirectUrl: "/entry/auto-login?token=xxx"
 *
 * Security: service_role only, never exposes key to frontend.
 * Called by: /entry form submit (no caller auth required).
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
} as const;

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

function err(reason: string, message: string, status = 200): Response {
  return json({ ok: false, reason, message }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return err("method_not_allowed", "POST required", 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return err("server_error", "Server misconfigured", 503);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  let body: {
    propertyId?: string;
    inviteCode?: string;
    fullName?: string;
    email?: string;
    unitNo?: string;
  };
  try {
    body = await req.json();
  } catch {
    return err("invalid_json", "Invalid JSON body", 400);
  }

  const propertyId = (body.propertyId ?? "").trim();
  const inviteCode = (body.inviteCode ?? "").trim();
  const fullName = (body.fullName ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();
  const unitNo = (body.unitNo ?? "").trim();

  if (!propertyId || !email || !unitNo) {
    return err("missing_fields", "propertyId, email, and unitNo are required", 400);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return err("invalid_email", "Invalid email format", 400);
  }

  try {
    // 1. Verify property exists
    const { data: property } = await admin
      .from("properties")
      .select("id, name")
      .eq("id", propertyId)
      .maybeSingle();
    if (!property) return err("invalid_property", "Property not found");

    // 2. Validate invite code only when one was provided
    if (inviteCode) {
      const { data: pics } = await admin
        .from("property_invite_codes")
        .select("id, unit_no, code")
        .eq("property_id", propertyId)
        .eq("is_active", true);

      type PicRow = { id: string; unit_no: string | null; code: string };
      const pic = (pics as PicRow[] | null)?.find(
        (p) => p.code?.toLowerCase() === inviteCode.toLowerCase(),
      ) ?? null;

      if (!pic) return err("invalid_invite", "Invalid or inactive invite code");

      // If invite is unit-scoped, submitted unitNo must match
      if (
        pic.unit_no &&
        pic.unit_no.trim() !== "" &&
        pic.unit_no.trim().toLowerCase() !== unitNo.toLowerCase()
      ) {
        return err("invite_unit_mismatch", "Invite code is bound to a different unit");
      }
    }

    // 3. Check unit_whitelist — non-whitelist units are rejected immediately, nothing is written
    const { data: wlRow } = await admin
      .from("unit_whitelist")
      .select("id")
      .eq("property_id", propertyId)
      .eq("unit_no", unitNo)
      .eq("is_active", true)
      .maybeSingle();
    if (!wlRow) {
      return err("unit_not_found", "This unit is not on the whitelist for this property");
    }

    // 4. Find or create user by email (service role bypasses auth RLS)
    const { data: existingUserId } = await admin.rpc("get_auth_user_id_by_email", {
      p_email: email,
    });

    let userId: string;
    if (existingUserId) {
      userId = existingUserId as string;
    } else {
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: fullName || email },
      });

      if (createErr || !newUser?.user?.id) {
        const msg = (createErr?.message ?? "").toLowerCase();
        const isAlreadyRegistered =
          msg.includes("already registered") ||
          msg.includes("already exists") ||
          msg.includes("user already registered");

        if (isAlreadyRegistered) {
          // User exists in auth.users but has no profiles row (e.g. magic-link signup without
          // completing profile creation). Scan listUsers to recover their ID.
          console.warn("[entry-auto-join] createUser 'already registered' — scanning listUsers for", email);
          let foundId: string | null = null;
          for (let page = 1; page <= 20 && !foundId; page++) {
            const { data: listData } = await admin.auth.admin.listUsers({ page, perPage: 100 });
            if (!listData?.users?.length) break;
            type AuthUser = { id: string; email?: string };
            const found = (listData.users as AuthUser[]).find(
              (u) => u.email?.toLowerCase() === email.toLowerCase(),
            );
            if (found) foundId = found.id;
            if (listData.users.length < 100) break;
          }

          if (!foundId) {
            // Cannot locate user — return structured error so frontend can show login redirect
            console.error("[entry-auto-join] already_registered but listUsers found no match for", email);
            return err(
              "already_registered",
              "该邮箱已注册，请直接登录后继续进入物业。",
            );
          }

          userId = foundId;
          // Ensure profile row exists so future RPC lookups succeed
          await admin.from("profiles").upsert(
            { id: userId, email, full_name_en: fullName || email },
            { onConflict: "id", ignoreDuplicates: true },
          );
          console.log("[entry-auto-join] recovered user from listUsers", userId);
        } else {
          console.error("[entry-auto-join] createUser error", createErr);
          return err("user_creation_failed", createErr?.message ?? "Could not create user", 500);
        }
      } else {
        userId = newUser.user.id;
        // Attempt to create profile row (ignore conflict — trigger may have already done it)
        await admin.from("profiles").upsert(
          { id: userId, email, full_name_en: fullName || email },
          { onConflict: "id", ignoreDuplicates: true },
        );
      }
    }

    // ── Helper: upsert a pending join_request and return pending_submitted response ────────────
    async function writePending(
      flag: string,
      reason: string,
      reasonMsg: string,
    ): Promise<Response> {
      const { data: pendingRow, error: insertErr } = await admin
        .from("join_requests")
        .upsert(
          {
            property_id: propertyId,
            user_id: userId,
            full_name: fullName || email,
            email,
            unit_no: unitNo,
            status: "pending",
            requested_role: "owner",
            invite_code: inviteCode || null,
            whitelist_matched: true,
            review_flag: flag,
            review_reason: reasonMsg,
            source: "entry",
          },
          { onConflict: "property_id,user_id" },
        )
        .select("id")
        .single();

      if (insertErr) {
        console.error("[entry-auto-join] join_request upsert failed", flag, insertErr);
        return err("insert_failed", insertErr.message, 400);
      }

      console.log(`[entry-auto-join] pending_submitted flag=${flag} property=${propertyId} unit=${unitNo} user=${userId}`);
      return json({
        ok: true,
        kind: "pending_submitted",
        reason,
        message: reasonMsg,
        request_id: (pendingRow as { id: string } | null)?.id ?? null,
        redirectUrl: "/join/pending",
        propertyName: (property as { name?: string }).name ?? "",
      });
    }

    // 5. Fetch submitter's active membership for this property (if any)
    type MemberRow = { id: string; unit_no: string | null };
    const { data: submitterMembership } = await admin
      .from("property_members")
      .select("id, unit_no")
      .eq("property_id", propertyId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    const memberRow = submitterMembership as MemberRow | null;

    if (memberRow) {
      const existingUnit = (memberRow.unit_no ?? "").trim();
      const membershipId = memberRow.id;

      if (existingUnit !== "") {
        // ── Case A: active member with a recorded unit ──────────────────────────
        if (existingUnit === unitNo.trim()) {
          // Exact match — nothing to do
          console.log(`[entry-auto-join] already_member (unit match) property=${propertyId} user=${userId} unit=${existingUnit}`);
          return json({
            ok: true,
            kind: "already_member",
            message: "你已是本物业业主。如需更改房号，请联系理事会/管理员处理。",
            property_id: propertyId,
            propertyId,
            propertyName: (property as { name?: string }).name ?? "",
            unit_no: existingUnit,
            unitNo: existingUnit,
          });
        }

        // Different unit submitted — must NOT silently update; route to pending
        console.log(`[entry-auto-join] member unit=${existingUnit} submitted different unit=${unitNo} — checking occupancy`);

        const { data: occupantOfTarget } = await admin
          .from("property_members")
          .select("id, user_id")
          .eq("property_id", propertyId)
          .eq("unit_no", unitNo)
          .eq("status", "active")
          .maybeSingle();

        const targetOccupantUserId = occupantOfTarget
          ? (occupantOfTarget as { user_id: string }).user_id
          : null;

        if (targetOccupantUserId && targetOccupantUserId !== userId) {
          // Target unit occupied by someone else
          return writePending("occupied", "occupied", "房号已被占用，已提交业委会审核");
        }

        // Target unit free (or edge-case: same user somehow appears there)
        return writePending(
          "unit_change_request",
          "unit_change_request",
          "该账号已绑定其他房号，申请更换房号需业委会审核",
        );

      } else {
        // ── Case B: active member but unit_no is blank — fill it in if safe ──────
        const { data: occupantOfTarget } = await admin
          .from("property_members")
          .select("id, user_id")
          .eq("property_id", propertyId)
          .eq("unit_no", unitNo)
          .eq("status", "active")
          .maybeSingle();

        const targetOccupantUserId = occupantOfTarget
          ? (occupantOfTarget as { user_id: string }).user_id
          : null;

        if (!targetOccupantUserId || targetOccupantUserId === userId) {
          // Safe to assign — update the existing membership row
          const { error: updateErr } = await admin
            .from("property_members")
            .update({ unit_no: unitNo })
            .eq("id", membershipId);

          if (updateErr) {
            console.error("[entry-auto-join] unit update failed", updateErr);
            return err("update_failed", updateErr.message, 500);
          }

          console.log(`[entry-auto-join] already_member (unit filled) property=${propertyId} user=${userId} unit=${unitNo}`);
          return json({
            ok: true,
            kind: "already_member",
            message: "房号已更新，欢迎回来。",
            property_id: propertyId,
            propertyId,
            propertyName: (property as { name?: string }).name ?? "",
            unit_no: unitNo,
            unitNo,
          });
        }

        // Target unit occupied by someone else
        return writePending("occupied", "occupied", "房号已被占用，已提交业委会审核");
      }
    }

    // 6. No active membership — check unit occupancy for new-user flow
    const { data: occupantRow } = await admin
      .from("property_members")
      .select("id, user_id")
      .eq("property_id", propertyId)
      .eq("unit_no", unitNo)
      .eq("status", "active")
      .maybeSingle();

    if (occupantRow) {
      // Unit is taken by someone else (this user has no membership, so it's definitely another user)
      console.log(`[entry-auto-join] occupied (new user) property=${propertyId} unit=${unitNo} user=${userId}`);
      return writePending("occupied", "occupied", "房号已被占用，已提交业委会审核");
    }

    // Unit is free and user has no membership — eligible for auto approve
    const kind = "auto_approved";
    const finalRedirect = "/";
    const reason: string | null = null;

    const { error: pmErr } = await admin.from("property_members").insert({
      property_id: propertyId,
      user_id: userId,
      role: "owner",
      status: "active",
      unit_no: unitNo,
      created_at: new Date().toISOString(),
    });
    if (pmErr) {
      console.error("[entry-auto-join] property_members insert error", pmErr);
      return err("membership_failed", "Could not create membership record", 500);
    }

    await admin.from("join_requests").insert({
      property_id: propertyId,
      user_id: userId,
      requested_role: "owner",
      full_name: fullName || email,
      email,
      unit_no: unitNo,
      invite_code: inviteCode || null,
      whitelist_matched: true,
      status: "approved",
      review_flag: "auto_approved",
      source: "entry_auto_join",
    });

    // 7. Create one-time entry_token (10-minute TTL) for non-already_member outcomes
    const token =
      crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: tokenErr } = await admin.from("entry_tokens").insert({
      user_id: userId,
      property_id: propertyId,
      unit_no: unitNo,
      kind,
      reason,
      final_redirect: finalRedirect,
      token,
      expires_at: expiresAt,
    });
    if (tokenErr) {
      console.error("[entry-auto-join] entry_tokens insert error", tokenErr);
      return err("token_failed", "Could not create entry token", 500);
    }

    console.log(
      `[entry-auto-join] kind=${kind} reason=${reason ?? "null"} property=${propertyId} unit=${unitNo}`,
    );

    return json({
      ok: true,
      kind,
      reason,
      propertyId,
      propertyName: (property as { name?: string }).name ?? "",
      redirectUrl: `/entry/auto-login?token=${token}`,
    });
  } catch (e) {
    console.error("[entry-auto-join] unhandled error", e);
    return err("server_error", `Unexpected error: ${String(e)}`, 500);
  }
});
