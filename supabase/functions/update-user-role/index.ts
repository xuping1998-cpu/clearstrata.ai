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
  /** Required: role change is applied to this row only (`property_id` + `user_id`). */
  property_id?: string;
};

type ProfileRole = "owner" | "council" | "admin" | "manager";

const META_ROLES = new Set(["user", "council", "admin", "manager"]);

function mapToProfileRole(meta: string): ProfileRole {
  if (meta === "council") return "council";
  if (meta === "admin") return "admin";
  if (meta === "manager") return "manager";
  return "owner";
}

/** `property_members.role` (must match public.user_role). */
function mapMetaToPropertyMemberRole(meta: string): string {
  if (meta === "council") return "council";
  if (meta === "admin") return "admin";
  if (meta === "manager") return "manager";
  return "owner";
}

type PmRole = string;

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
  const propertyId = body.property_id?.trim();

  if (!userId) {
    return new Response(JSON.stringify({ error: "user_id is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!metaRole || !META_ROLES.has(metaRole)) {
    return new Response(
      JSON.stringify({ error: "valid role (user|council|admin|manager) required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
  if (!propertyId) {
    return new Response(
      JSON.stringify({ error: "property_id is required (property_members update is scoped by property + user)" }),
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
  const callerUid = userData.user.id;

  const { data: callerProfile, error: callerProfErr } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", callerUid)
    .maybeSingle();

  if (callerProfErr || !callerProfile?.role) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: callerPm, error: callerPmErr } = await adminClient
    .from("property_members")
    .select("role")
    .eq("property_id", propertyId)
    .eq("user_id", callerUid)
    .eq("status", "active")
    .maybeSingle();

  if (callerPmErr) {
    console.error("[update-user-role] callerPm", callerPmErr);
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const callerPmRole = callerPm?.role as PmRole | undefined;
  const isGlobalAdmin = callerProfile.role === "admin";

  const callerMayManageProperty =
    isGlobalAdmin ||
    callerPmRole === "admin" ||
    callerPmRole === "property_admin" ||
    callerPmRole === "council" ||
    callerPmRole === "manager";

  if (!callerMayManageProperty) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: targetPm, error: targetPmErr } = await adminClient
    .from("property_members")
    .select("role")
    .eq("property_id", propertyId)
    .eq("user_id", userId)
    .maybeSingle();

  if (targetPmErr || !targetPm?.role) {
    return new Response(JSON.stringify({ error: "User is not a member of this property" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const targetPmRole = targetPm.role as PmRole;
  const nextPmRole = mapMetaToPropertyMemberRole(metaRole);

  if (callerPmRole === "manager" && !isGlobalAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (isGlobalAdmin || callerPmRole === "admin") {
    // property-scoped admin or global admin: full role control on this property
  } else if (callerPmRole === "property_admin") {
    if (metaRole === "admin") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (metaRole === "manager") {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else if (callerPmRole === "council") {
    const councilMayAssignManager = metaRole === "manager" && targetPmRole === "owner";
    if (metaRole !== "user" && metaRole !== "council" && !councilMayAssignManager) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (
      targetPmRole === "admin" ||
      targetPmRole === "manager" ||
      targetPmRole === "property_admin"
    ) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else if (callerPmRole === "manager") {
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

  if (metaRole === "admin" && !isGlobalAdmin) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const councilPromotingOwnerToManager =
    metaRole === "manager" &&
    callerPmRole === "council" &&
    targetPmRole === "owner";

  if (metaRole === "manager" && !isGlobalAdmin && !councilPromotingOwnerToManager) {
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

  const { error: pmErr } = await adminClient
    .from("property_members")
    .update({ role: nextPmRole })
    .eq("property_id", propertyId)
    .eq("user_id", userId);

  if (pmErr) {
    console.error("[update-user-role] property_members update failed:", pmErr);
    return new Response(JSON.stringify({ error: pmErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
