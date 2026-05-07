import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const MANAGER_EMAIL = "gani.xhepa@dwellproperty.ca";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeAttachmentUrls(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
    } catch {
      return [value];
    }
  }
  return [];
}

serve(async (req) => {
  console.log("[send-owner-request-to-manager] method:", req.method);
  console.log("[send-owner-request-to-manager] origin:", req.headers.get("origin"));

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ ok: false, error: "Method not allowed" }, 405);
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      console.error("[send-owner-request-to-manager] missing env");
      return json({ ok: false, error: "Missing server configuration" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return json({ ok: false, error: "Missing Authorization Bearer token" }, 401);
    }

    let payload: { requestId?: string };
    try {
      payload = await req.json();
    } catch {
      return json({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const requestId = payload.requestId;
    if (!requestId) {
      return json({ ok: false, error: "Missing requestId" }, 400);
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error("[send-owner-request-to-manager] auth error:", userError);
      return json({ ok: false, error: "Unauthorized" }, 401);
    }

    const userId = userData.user.id;

    const { data: ownerRequest, error: requestError } = await serviceClient
      .from("property_manager_requests")
      .select("*")
      .eq("id", requestId)
      .single();

    if (requestError || !ownerRequest) {
      console.error("[send-owner-request-to-manager] request not found:", requestError);
      return json({ ok: false, error: "Request not found" }, 404);
    }

    const propertyId = ownerRequest.property_id;

    const { data: membership, error: membershipError } = await serviceClient
      .from("property_members")
      .select("role,status")
      .eq("property_id", propertyId)
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (membershipError) {
      console.error("[send-owner-request-to-manager] membership error:", membershipError);
      return json({ ok: false, error: "Failed to verify membership" }, 500);
    }

    const allowedRoles = ["council", "admin", "property_admin", "manager"];
    if (!membership || !allowedRoles.includes(String(membership.role))) {
      return json({ ok: false, error: "Forbidden" }, 403);
    }

    const { data: property } = await serviceClient
      .from("properties")
      .select("name")
      .eq("id", propertyId)
      .maybeSingle();

    const { data: submitterProfile } = await serviceClient
      .from("profiles")
      .select("full_name_en, full_name_zh, email")
      .eq("id", ownerRequest.created_by)
      .maybeSingle();

    const submitterName =
      submitterProfile?.full_name_zh ||
      submitterProfile?.full_name_en ||
      "Unknown submitter";

    const submitterEmail = submitterProfile?.email || "";

    const attachments = normalizeAttachmentUrls(ownerRequest.attachment_urls);

    const attachmentHtml = attachments.length
      ? `<ul>${attachments
          .map((url) => `<li><a href="${escapeHtml(url)}">${escapeHtml(url)}</a></li>`)
          .join("")}</ul>`
      : `<p style="color:#64748b;">无附件 / No attachments</p>`;

    const html = `
      <div style="font-family: Arial, sans-serif; background:#f8fafc; padding:24px;">
        <div style="max-width:720px; margin:0 auto; background:#ffffff; border:1px solid #e2e8f0; border-radius:16px; overflow:hidden;">
          <div style="background:#0f766e; color:#ffffff; padding:24px;">
            <div style="font-size:22px; font-weight:700;">ClearStrata</div>
            <div style="font-size:16px; margin-top:6px;">新的业主诉求 / New Owner Request</div>
          </div>

          <div style="padding:24px; color:#0f172a;">
            <h2 style="margin:0 0 16px;">${escapeHtml(ownerRequest.title)}</h2>

            <table style="width:100%; border-collapse:collapse; font-size:14px;">
              <tr>
                <td style="padding:8px 0; color:#64748b; width:160px;">物业名称</td>
                <td style="padding:8px 0;">${escapeHtml(property?.name || propertyId)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#64748b;">房号</td>
                <td style="padding:8px 0;">${escapeHtml(ownerRequest.unit_no || "-")}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#64748b;">提交人</td>
                <td style="padding:8px 0;">${escapeHtml(submitterName)}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#64748b;">提交人邮箱</td>
                <td style="padding:8px 0;">${escapeHtml(submitterEmail || "-")}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#64748b;">联系方式</td>
                <td style="padding:8px 0;">${escapeHtml(ownerRequest.contact || "-")}</td>
              </tr>
              <tr>
                <td style="padding:8px 0; color:#64748b;">创建时间</td>
                <td style="padding:8px 0;">${escapeHtml(ownerRequest.created_at)}</td>
              </tr>
            </table>

            <div style="margin-top:20px;">
              <div style="font-weight:700; margin-bottom:8px;">诉求内容</div>
              <div style="white-space:pre-wrap; line-height:1.6; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:16px;">
                ${escapeHtml(ownerRequest.content)}
              </div>
            </div>

            <div style="margin-top:20px;">
              <div style="font-weight:700; margin-bottom:8px;">附件</div>
              ${attachmentHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "ClearStrata <onboarding@resend.dev>",
        to: [MANAGER_EMAIL],
        subject: "新的业主诉求 / New Owner Request - ClearStrata",
        html,
      }),
    });

    const resendText = await resendResponse.text();

    if (!resendResponse.ok) {
      console.error("[send-owner-request-to-manager] resend failed:", resendText);
      return json({ ok: false, error: "Failed to send email", detail: resendText }, 502);
    }

    const { error: updateError } = await serviceClient
      .from("property_manager_requests")
      .update({
        status: "sent",
        sent_to_manager_at: new Date().toISOString(),
        manager_email: MANAGER_EMAIL,
      })
      .eq("id", requestId);

    if (updateError) {
      console.error("[send-owner-request-to-manager] update failed:", updateError);
      return json({ ok: false, error: "Email sent but failed to update request" }, 500);
    }

    return json({
      ok: true,
      message: "Owner request sent to property manager",
      managerEmail: MANAGER_EMAIL,
    });
  } catch (error) {
    console.error("[send-owner-request-to-manager] unexpected error:", error);
    return json({
      ok: false,
      error: error instanceof Error ? error.message : "Unexpected error",
    }, 500);
  }
});
