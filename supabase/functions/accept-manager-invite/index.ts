/**
 * Accept property manager invite: preview (token-only) or set password + activate (token + password).
 * Uses service role for auth.users + profiles + property_members + manager_invites.
 * verify_jwt = false — no caller JWT required.
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

async function loadInviteRow(
  svc: ReturnType<typeof createClient>,
  token: string,
): Promise<{
  invite: Record<string, unknown>;
  propertyName?: string;
} | null> {
  const { data: invite, error: invErr } = await svc
    .from("manager_invites")
    .select("id,property_id,email,full_name,status,expires_at")
    .eq("token", token)
    .maybeSingle();

  if (invErr || !invite) return null;

  const { data: prop } = await svc
    .from("properties")
    .select("name")
    .eq("id", invite.property_id as string)
    .maybeSingle();

  return {
    invite: invite as Record<string, unknown>,
    propertyName: prop?.name as string | undefined,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return apiJson({ ok: false, code: "METHOD", message: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !sr) {
    return apiJson({ ok: false, code: "CONFIG", message: "Server misconfigured" }, 503);
  }

  let token = "";
  let passwordRaw = "";
  try {
    const b = (await req.json()) as { token?: string; password?: string };
    token = String(b.token ?? "").trim();
    passwordRaw = String(b.password ?? "");
  } catch {
    return apiJson({ ok: false, code: "BAD_BODY", message: "Invalid JSON" }, 400);
  }

  if (!token) {
    return apiJson({ ok: false, code: "BAD_TOKEN", message: "token is required" }, 400);
  }

  const svc = createClient(supabaseUrl, sr, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const row = await loadInviteRow(svc, token);
  if (!row) {
    return apiJson({ ok: false, code: "INVALID_TOKEN", message: "邀请无效或已失效" }, 200);
  }

  const { invite, propertyName } = row;
  const now = Date.now();
  const exp = invite.expires_at
    ? new Date(invite.expires_at as string).getTime()
    : NaN;

  if (invite.status !== "pending") {
    return apiJson({ ok: false, code: "NOT_PENDING", message: "邀请不可用或已被处理" }, 200);
  }

  if (Number.isNaN(exp) || exp < now) {
    await svc.from("manager_invites").update({ status: "expired" }).eq("id", invite.id);
    return apiJson({ ok: false, code: "EXPIRED", message: "邀请已过期" }, 200);
  }

  const previewMode = passwordRaw.trim() === "";

  // ── Preview: token only (no password) → show acceptance form ─────────────
  if (previewMode) {
    return apiJson({
      preview: true,
      email: invite.email as string,
      propertyName: propertyName ?? "",
    }, 200);
  }

  const password = passwordRaw;
  if (password.length < 8) {
    return apiJson(
      {
        ok: false,
        code: "WEAK_PASSWORD",
        message: "密码至少 8 位",
      },
      200,
    );
  }

  const inviteEmailOriginal = String(invite.email ?? "").trim();
  const emailNorm = inviteEmailOriginal.toLowerCase();

  // ── Resolve or create auth user ────────────────────────────────────────────
  const { data: existingId, error: rpcErr } = await svc.rpc("get_auth_user_id_by_email", {
    p_email: emailNorm,
  });

  if (rpcErr) {
    console.error("[accept-manager-invite] get_auth_user_id_by_email", rpcErr);
    return apiJson({ ok: false, code: "RPC", message: "服务器错误，请稍后重试" }, 500);
  }

  const mdName = String(invite.full_name ?? "").trim() || emailNorm;

  let userId: string;

  if (existingId && typeof existingId === "string") {
    userId = existingId;
    const { error: updAuthErr } = await svc.auth.admin.updateUserById(userId, {
      password,
      email_confirm: true,
    });
    if (updAuthErr) {
      console.error("[accept-manager-invite] updateUserById", updAuthErr);
      return apiJson(
        { ok: false, code: "AUTH_UPDATE_FAILED", message: updAuthErr.message },
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
          console.error("[accept-manager-invite] createUser dup but no RPC id", cErr);
          return apiJson({ ok: false, code: "AUTH_CONFLICT", message: "邮箱处理失败，请联系支持" }, 500);
        }
        userId = second;
        const { error: u2 } = await svc.auth.admin.updateUserById(userId, {
          password,
          email_confirm: true,
        });
        if (u2) {
          console.error("[accept-manager-invite] updateUser after dup", u2);
          return apiJson({ ok: false, code: "AUTH_UPDATE_FAILED", message: u2.message }, 500);
        }
      } else {
        console.error("[accept-manager-invite] createUser", cErr);
        return apiJson(
          { ok: false, code: "AUTH_CREATE_FAILED", message: cErr?.message ?? "创建账号失败" },
          500,
        );
      }
    }
  }

  // ── profiles: preserve role/app_role — never elevate to platform_admin here ──
  const displayNameEn = mdName;

  const { data: prevProf } = await svc.from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (!prevProf) {
    const ins = await svc.from("profiles").insert({
      id: userId,
      email: emailNorm,
      full_name_en: displayNameEn,
      role: "owner",
    });
    if (ins.error?.code === "23505") {
      await svc.from("profiles").update({
        email: emailNorm,
        full_name_en: displayNameEn,
      }).eq("id", userId);
    } else if (ins.error) {
      console.error("[accept-manager-invite] profile insert", ins.error);
      return apiJson({ ok: false, code: "PROFILE_FAILED", message: ins.error.message }, 500);
    }
  } else {
    const { error: upProfErr } = await svc.from("profiles").update({
      email: emailNorm,
      full_name_en: displayNameEn,
    }).eq("id", userId);
    if (upProfErr) {
      console.error("[accept-manager-invite] profile update", upProfErr);
      return apiJson({ ok: false, code: "PROFILE_FAILED", message: upProfErr.message }, 500);
    }
  }

  const { data: existing } = await svc
    .from("property_members")
    .select("role")
    .eq("property_id", invite.property_id as string)
    .eq("user_id", userId)
    .maybeSingle();

  const existingRole = existing?.role as string | undefined;
  if (existingRole && existingRole !== "manager") {
    return apiJson({
      ok: false,
      code: "EXISTING_OTHER_ROLE",
      message:
        "该账号在本物业已是其他角色，无法用此链接成为物业经理",
    }, 200);
  }

  const { error: upsertErr } = await svc.from("property_members").upsert(
    {
      property_id: invite.property_id,
      user_id: userId,
      role: "manager",
      status: "active",
    },
    { onConflict: "property_id,user_id" },
  );

  if (upsertErr) {
    console.error("[accept-manager-invite] property_members upsert", upsertErr);
    return apiJson({ ok: false, code: "UPSERT_FAILED", message: upsertErr.message }, 500);
  }

  const { data: touched, error: updInviteErr } = await svc
    .from("manager_invites")
    .update({
      status: "accepted",
      accepted_by: userId,
      accepted_at: new Date().toISOString(),
    })
    .eq("id", invite.id as string)
    .eq("status", "pending")
    .select("id");

  if (updInviteErr) {
    console.error("[accept-manager-invite] update invite", updInviteErr);
    return apiJson({ ok: false, code: "INVITE_UPDATE_FAILED", message: updInviteErr.message }, 500);
  }

  if (!touched?.length) {
    return apiJson({ ok: false, code: "RACE", message: "邀请已被处理，请刷新或登录查看" }, 200);
  }

  return apiJson({
    ok: true,
    email: inviteEmailOriginal,
  });
});
