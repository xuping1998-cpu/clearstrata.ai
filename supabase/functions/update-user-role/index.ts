import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

type Body = {
  user_id?: string;
  role?: string;
};

type ProfileRole = "owner" | "council" | "admin" | "manager";

const META_ROLES = new Set(["user", "council", "admin", "manager"]);

function mapToProfileRole(meta: string): ProfileRole {
  if (meta === "council") return "council";
  if (meta === "admin") return "admin";
  if (meta === "manager") return "manager";
  return "owner";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !anonKey || !serviceKey) {
    return new Response(
      JSON.stringify({ error: "Server configuration error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = body.user_id?.trim();
  const metaRole = body.role?.trim();
  if (!userId || !metaRole || !META_ROLES.has(metaRole)) {
    return new Response(
      JSON.stringify({
        error: "user_id and valid role (user|council|admin|manager) required",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: caller, error: callerErr } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (callerErr || !caller?.role) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (caller.role !== "council" && caller.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: targetProfile, error: targetErr } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (targetErr || !targetProfile?.role) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (caller.role === "council") {
    if (metaRole !== "user" && metaRole !== "council") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (targetProfile.role === "admin" || targetProfile.role === "manager") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (metaRole === "admin" && caller.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (metaRole === "manager" && caller.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: existingAuth, error: getErr } = await adminClient.auth.admin.getUserById(
    userId,
  );
  if (getErr || !existingAuth.user) {
    return new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const prevMeta = existingAuth.user.user_metadata || {};
  const { error: authErr } = await adminClient.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...prevMeta,
      role: metaRole,
    },
  });

  if (authErr) {
    console.error("[update-user-role] auth update failed:", authErr);
    return new Response(JSON.stringify({ error: authErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const profileRole = mapToProfileRole(metaRole);
  const { error: profErr } = await adminClient
    .from("profiles")
    .update({
      role: profileRole,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);

  if (profErr) {
    console.error("[update-user-role] profile update failed:", profErr);
    return new Response(JSON.stringify({ error: profErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
