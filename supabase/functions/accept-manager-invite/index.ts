/**
 * Accept property manager invitation (token). Uses user JWT email match vs invite row.
 * verify_jwt = false — validates JWT manually via anon client getUser().
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return apiJson({ ok: false, code: "METHOD", message: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const anon = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  const sr = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  if (!supabaseUrl || !anon || !sr) {
    return apiJson({ ok: false, code: "CONFIG", message: "Server misconfigured" }, 503);
  }

  let token = "";
  try {
    const b = (await req.json()) as { token?: string };
    token = String(b.token ?? "").trim();
  } catch {
    return apiJson({ ok: false, code: "BAD_BODY", message: "Invalid JSON" }, 400);
  }
  if (!token) {
    return apiJson({ ok: false, code: "BAD_TOKEN", message: "token is required" }, 400);
  }

  const svc = createClient(supabaseUrl, sr, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: invite, error: invErr } = await svc
    .from("manager_invites")
    .select("id,property_id,email,status,expires_at")
    .eq("token", token)
    .maybeSingle();

  if (invErr || !invite) {
    return apiJson({ ok: false, code: "INVALID_TOKEN", message: "邀请无效或已失效" }, 200);
  }

  const now = Date.now();
  const exp = invite.expires_at ? new Date(invite.expires_at as string).getTime() : NaN;
  if (invite.status !== "pending" || Number.isNaN(exp) || exp < now) {
    await svc.from("manager_invites").update({ status: "expired" }).eq("id", invite.id);
    return apiJson({ ok: false, code: "EXPIRED", message: "邀请已过期" }, 200);
  }

  const authHeader = req.headers.get("Authorization") ?? "";

  const { data: prop } = await svc
    .from("properties")
    .select("name")
    .eq("id", invite.property_id)
    .maybeSingle();

  const propertyName = prop?.name as string | undefined;

  if (!authHeader.startsWith("Bearer ")) {
    return apiJson({
      ok: false,
      code: "NEED_AUTH",
      message: "请先登录",
      propertyName,
      inviteEmail: invite.email,
      propertyId: invite.property_id,
    }, 200);
  }

  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: udata, error: uerr } = await userClient.auth.getUser();
  if (uerr || !udata?.user?.id) {
    return apiJson({
      ok: false,
      code: "NEED_AUTH",
      message: "请先登录",
      propertyName,
      inviteEmail: invite.email,
      propertyId: invite.property_id,
    }, 200);
  }

  const user = udata.user;
  const loginEmail = (user.email ?? "").trim().toLowerCase();
  const inviteEmail = String(invite.email ?? "").trim().toLowerCase();

  if (!loginEmail || loginEmail !== inviteEmail) {
    return apiJson({
      ok: false,
      code: "EMAIL_MISMATCH",
      message: "请使用被邀请的邮箱登录",
      inviteEmail: invite.email as string,
    }, 200);
  }

  const { data: existing } = await svc
    .from("property_members")
    .select("role")
    .eq("property_id", invite.property_id)
    .eq("user_id", user.id)
    .maybeSingle();

  const existingRole = existing?.role as string | undefined;
  if (existingRole && existingRole !== "manager") {
    return apiJson({
      ok: false,
      code: "EXISTING_OTHER_ROLE",
      message: "该账号在本物业已是其他角色，无法用此链接成为物业经理",
    }, 200);
  }

  const { error: upsertErr } = await svc.from("property_members").upsert(
    {
      property_id: invite.property_id,
      user_id: user.id,
      role: "manager",
      status: "active",
    },
    { onConflict: "property_id,user_id" },
  );

  if (upsertErr) {
    console.error("[accept-manager-invite] upsert", upsertErr);
    return apiJson({ ok: false, code: "UPSERT_FAILED", message: upsertErr.message }, 500);
  }

  const { error: updInviteErr } = await svc.from("manager_invites").update({
    status: "accepted",
    accepted_by: user.id,
    accepted_at: new Date().toISOString(),
  }).eq("id", invite.id);

  if (updInviteErr) {
    console.error("[accept-manager-invite] update invite", updInviteErr);
  }

  return apiJson({
    ok: true,
    propertyId: invite.property_id,
    message: "已接受邀请",
  });
});
