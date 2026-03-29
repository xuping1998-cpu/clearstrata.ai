import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SearchRequest {
  title: string;
  description: string;
  category: string;
}

interface VendorResult {
  company_name: string;
  phone: string;
  website: string;
  address: string;
  description_en: string;
  description_zh: string;
  price_reference: string;
}

const webSearchTool = {
  type: "web_search_20250305",
  name: "web_search",
  max_uses: 5,
  user_location: {
    type: "approximate",
    city: "Vancouver",
    region: "British Columbia",
    country: "CA",
    timezone: "America/Vancouver",
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "ANTHROPIC_API_KEY not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { title, description, category }: SearchRequest = await req.json();

    const categoryLabels: Record<string, string> = {
      landscaping: "landscaping, gardening, lawn care, bark mulch, tree service",
      cleaning: "cleaning, pressure washing, window cleaning, janitorial",
      plumbing: "plumbing, pipe repair, drain cleaning, water heater",
      electrical: "electrical, wiring, lighting, panel upgrade, electrician",
      hvac: "HVAC, heating, cooling, air conditioning, furnace",
      roofing: "roofing, roof repair, gutter, shingle",
      painting: "painting, interior painting, exterior painting, staining",
      elevator: "elevator maintenance, elevator repair, lift service",
      fire_safety: "fire safety, fire alarm, sprinkler, fire extinguisher",
      security: "security, access control, CCTV, surveillance, intercom",
      waterproofing:
        "waterproofing, membrane, sealant, foundation waterproofing",
      general_maintenance:
        "general maintenance, handyman, building maintenance",
    };

    const serviceType = categoryLabels[category] || category || title;

    const systemPrompt = `Search 3 real Vancouver ${serviceType} vendors. Return ONLY a JSON array, no markdown. Each: {"company_name":"","phone":"","website":"","address":"","description_en":"","description_zh":"","price_reference":""}`;

    const userMessage = `Vancouver ${serviceType}: ${title}. ${description}`;

    let allContent: unknown[] = [];
    let continueLoop = true;
    let messages: { role: string; content: unknown }[] = [
      { role: "user", content: userMessage },
    ];

    while (continueLoop) {
      const anthropicResponse = await fetch(
        "https://api.anthropic.com/v1/messages",
        {
          method: "POST",
          headers: {
            "x-api-key": anthropicApiKey,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: systemPrompt,
            messages,
            tools: [webSearchTool],
          }),
        }
      );

      if (!anthropicResponse.ok) {
        const errorBody = await anthropicResponse.text();
        console.error(
          `Anthropic API error [${anthropicResponse.status}]:`,
          errorBody
        );

        let detail = `API returned ${anthropicResponse.status}`;
        try {
          const parsed = JSON.parse(errorBody);
          if (parsed?.error?.message) {
            detail = parsed.error.message;
          }
        } catch {
          // use status code detail
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: detail,
          }),
          {
            status: 502,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const data = await anthropicResponse.json();

      if (data.content) {
        allContent = allContent.concat(data.content);
      }

      if (data.stop_reason === "pause_turn") {
        messages = [
          ...messages,
          { role: "assistant", content: data.content },
        ];
      } else {
        continueLoop = false;
      }
    }

    let responseText = "";
    for (const block of allContent) {
      if ((block as { type: string }).type === "text") {
        responseText += (block as { type: string; text: string }).text;
      }
    }

    let vendors: VendorResult[] = [];
    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        vendors = JSON.parse(jsonMatch[0]);
      }
    } catch (parseErr) {
      console.error("Failed to parse vendor results:", parseErr);
      console.error("Raw response text:", responseText);
    }

    return new Response(
      JSON.stringify({
        success: true,
        vendors,
        count: vendors.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
