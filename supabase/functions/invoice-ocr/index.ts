import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");
    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({ error: "Anthropic API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { fileBase64, mimeType } = await req.json();

    if (!fileBase64) {
      return new Response(
        JSON.stringify({ error: "fileBase64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const mediaType = mimeType || "application/pdf";
    const isImage = mediaType.startsWith("image/");

    const fileContent = isImage
      ? { type: "image", source: { type: "base64", media_type: mediaType, data: fileBase64 } }
      : { type: "document", source: { type: "base64", media_type: "application/pdf", data: fileBase64 } };

    const prompt = `请从这张发票中提取所有信息。返回一个JSON对象，包含以下字段：
{
  "vendor_name": "供应商/公司名称",
  "invoice_number": "发票编号",
  "invoice_date": "YYYY-MM-DD格式",
  "due_date": "YYYY-MM-DD格式，如无则为null",
  "subtotal": 税前金额（数字）,
  "tax_amount": HST/GST税额（数字）,
  "total_amount": 含税总额（数字）,
  "hst_number": "HST/GST税号，如无则为null",
  "currency": "CAD或USD",
  "description": "服务/商品简要描述",
  "category": "以下之一：maintenance, utilities, insurance, professional_services, cleaning, landscaping, security, elevator, plumbing, electrical, general",
  "line_items": [{"description": "项目描述", "amount": 金额数字}],
  "has_anomalies": false,
  "anomaly_notes": ""
}
只返回合法的JSON，不要包含markdown标记或其他文字。`;

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
          messages: [
            {
              role: "user",
              content: [fileContent, { type: "text", text: prompt }],
            },
          ],
          temperature: 0,
        }),
      }
    );

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI识别服务出错", details: errText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiResult = await anthropicResponse.json();
    const rawText = aiResult.content[0]?.text || "";

    let extracted;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      extracted = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI返回结果解析失败", raw: rawText }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, extracted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
