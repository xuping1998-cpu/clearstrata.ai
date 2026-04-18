/**
 * Exchange a one-time invite token for Supabase session tokens + meeting id.
 * Caller must use anon key on invoke; handler uses service role only.
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
} as const;

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

Deno.serve(async (req: Request) => {
  console.log("[consume-invite-token] method", req.method);
  console.log("[consume-invite-token] origin", req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: { ...corsHeaders },
    });
  }

  if (req.method !== "POST") {
    return json({ ok: false, message: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  /** Public anon key — required for verifyOtp after admin.generateLink (same as Dashboard API key). */
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({
      ok: false,
      message: "Server misconfigured (SUPABASE_URL / SERVICE_ROLE / ANON_KEY)",
    }, 503);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const verifyClient = createClient(supabaseUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  let body: { token?: string };
  try {
    body = (await req.json()) as { token?: string };
  } catch {
    return json({ ok: false, message: "Invalid JSON body" }, 400);
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return json({ ok: false, message: "token is required" }, 400);
  }

  const now = new Date().toISOString();

  try {
    const { data: claimed, error: claimErr } = await admin
      .from("invite_tokens")
      .update({ used_at: now })
      .eq("token", token)
      .is("used_at", null)
      .gt("expires_at", now)
      .select("id, user_id, meeting_id")
      .maybeSingle();

    if (claimErr) {
      console.error("[consume-invite-token] claim error", claimErr);
      return json(
        { ok: false, message: "Token validation failed", detail: claimErr.message },
        400,
      );
    }

    if (!claimed) {
      return json(
        { ok: false, message: "Invalid, expired, or already used token" },
        400,
      );
    }

    const row = claimed as { id: string; user_id: string; meeting_id: string };

    const { data: meetingRow, error: meetingErr } = await admin
      .from("meetings")
      .select("property_id")
      .eq("id", row.meeting_id)
      .maybeSingle();

    if (meetingErr || !meetingRow) {
      await admin.from("invite_tokens").update({ used_at: null }).eq("id", row.id);
      console.error("[consume-invite-token] meeting lookup", meetingErr);
      return json({ ok: false, message: "Meeting not found" }, 404);
    }

    const propertyId = meetingRow.property_id as string | null;
    if (!propertyId) {
      await admin.from("invite_tokens").update({ used_at: null }).eq("id", row.id);
      return json({ ok: false, message: "Meeting has no property context" }, 500);
    }

    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(
      row.user_id,
    );
    if (userErr || !userData.user?.email) {
      await admin.from("invite_tokens").update({ used_at: null }).eq("id", row.id);
      console.error("[consume-invite-token] getUser", userErr);
      return json({ ok: false, message: "User not found" }, 500);
    }

    const email = userData.user.email;

    const { data: linkData, error: glErr } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });

    const hashed =
      linkData?.properties &&
      typeof (linkData.properties as Record<string, unknown>).hashed_token === "string"
        ? (linkData.properties as Record<string, string>).hashed_token
        : null;

    if (glErr || !hashed) {
      await admin.from("invite_tokens").update({ used_at: null }).eq("id", row.id);
      console.error("[consume-invite-token] generateLink", glErr, linkData);
      return json(
        {
          ok: false,
          message: "Could not create auth link",
          detail: glErr?.message ?? "missing hashed_token",
        },
        500,
      );
    }

    const { data: otpData, error: otpErr } = await verifyClient.auth.verifyOtp({
      type: "email",
      token_hash: hashed,
    });

    if (otpErr || !otpData.session) {
      await admin.from("invite_tokens").update({ used_at: null }).eq("id", row.id);
      console.error("[consume-invite-token] verifyOtp", otpErr);
      return json(
        {
          ok: false,
          message: "Could not establish session",
          detail: otpErr?.message ?? "no session",
        },
        500,
      );
    }

    const session = otpData.session;

    return json({
      ok: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      meetingId: row.meeting_id,
      propertyId,
    }, 200);
  } catch (e) {
    console.error("[consume-invite-token] unhandled", e);
    return json({ ok: false, message: "Unexpected error", detail: String(e) }, 500);
  }
});
