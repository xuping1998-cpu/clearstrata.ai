/**
 * consume-entry-token: exchanges a one-time entry_token for a Supabase session.
 *
 * Flow:
 * 1. Validate token from entry_tokens (not expired, not used)
 * 2. Mark token as used (atomic claim)
 * 3. Generate a real Supabase session for the user (admin generateLink + verifyOtp)
 * 4. Return: access_token, refresh_token, final_redirect, propertyId, unitNo, kind, reason
 *
 * Security: service_role only. Token is single-use with 10-minute TTL.
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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") {
    return json({ ok: false, message: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  if (!supabaseUrl || !serviceKey || !anonKey) {
    return json({ ok: false, message: "Server misconfigured" }, 503);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const verifyClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  let body: { token?: string };
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, message: "Invalid JSON body" }, 400);
  }

  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return json({ ok: false, message: "token is required" }, 400);
  }

  const now = new Date().toISOString();

  try {
    // Atomically claim the token (used_at is null, not expired)
    const { data: claimed, error: claimErr } = await admin
      .from("entry_tokens")
      .update({ used_at: now })
      .eq("token", token)
      .is("used_at", null)
      .gt("expires_at", now)
      .select("id, user_id, property_id, unit_no, kind, reason, final_redirect")
      .maybeSingle();

    if (claimErr) {
      console.error("[consume-entry-token] claim error", claimErr);
      return json({ ok: false, message: "Token validation failed", detail: claimErr.message }, 400);
    }
    if (!claimed) {
      return json({ ok: false, message: "Invalid, expired, or already used token" }, 400);
    }

    type TokenRow = {
      id: string;
      user_id: string;
      property_id: string;
      unit_no: string;
      kind: string;
      reason: string | null;
      final_redirect: string;
    };
    const row = claimed as TokenRow;

    // Look up user email (needed for generateLink)
    const { data: userData, error: userErr } = await admin.auth.admin.getUserById(row.user_id);
    if (userErr || !userData.user?.email) {
      await admin.from("entry_tokens").update({ used_at: null }).eq("id", row.id);
      console.error("[consume-entry-token] getUserById error", userErr);
      return json({ ok: false, message: "User not found" }, 500);
    }

    const email = userData.user.email;

    // Generate a magic link for the user and extract hashed_token
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
      await admin.from("entry_tokens").update({ used_at: null }).eq("id", row.id);
      console.error("[consume-entry-token] generateLink error", glErr, linkData);
      return json(
        {
          ok: false,
          message: "Could not create auth link",
          detail: glErr?.message ?? "missing hashed_token",
        },
        500,
      );
    }

    // Exchange hashed_token for a real session
    const { data: otpData, error: otpErr } = await verifyClient.auth.verifyOtp({
      type: "email",
      token_hash: hashed,
    });

    if (otpErr || !otpData.session) {
      await admin.from("entry_tokens").update({ used_at: null }).eq("id", row.id);
      console.error("[consume-entry-token] verifyOtp error", otpErr);
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

    console.log(
      `[consume-entry-token] success kind=${row.kind} property=${row.property_id} unit=${row.unit_no}`,
    );

    return json({
      ok: true,
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      final_redirect: row.final_redirect,
      propertyId: row.property_id,
      unitNo: row.unit_no,
      kind: row.kind,
      reason: row.reason,
    });
  } catch (e) {
    console.error("[consume-entry-token] unhandled error", e);
    return json({ ok: false, message: "Unexpected error", detail: String(e) }, 500);
  }
});
