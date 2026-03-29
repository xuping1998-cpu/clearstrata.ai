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

    const { question, fileBase64, mimeType, invoiceData } = await req.json();

    if (!question) {
      return new Response(
        JSON.stringify({ error: "question is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `你是一位专业的物业财务顾问。请用中文回答所有问题，用通俗易懂的语言解释发票内容。

你需要：
1. 用通俗易懂的中文解释发票内容（避免专业术语）
2. 逐项说明每笔费用的含义
3. 如果提供了历史数据，对比分析金额是否合理
4. 指出任何可疑或异常的项目
5. 给出简单明了的总结

回答要亲切、易懂，像朋友帮你看账单一样。如果发现问题，要明确指出并建议业主如何处理。
无论用户用什么语言提问，你都必须用中文回答。`;

    const userContent: Array<Record<string, unknown>> = [];

    if (fileBase64) {
      const mediaType = mimeType || "image/jpeg";
      const isImage = mediaType.startsWith("image/");

      if (isImage) {
        userContent.push({
          type: "image",
          source: { type: "base64", media_type: mediaType, data: fileBase64 },
        });
      } else {
        userContent.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
        });
      }
    }

    let contextText = "";
    if (invoiceData) {
      contextText = `\n\n以下是该发票的已提取数据：\n${JSON.stringify(invoiceData, null, 2)}`;
    }

    userContent.push({
      type: "text",
      text: question + contextText,
    });

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
          max_tokens: 3000,
          system: systemPrompt,
          messages: [{ role: "user", content: userContent }],
          temperature: 0.5,
        }),
      }
    );

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      console.error("Anthropic API error:", errText);
      return new Response(
        JSON.stringify({ error: "AI service error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await anthropicResponse.json();
    const message = data.content[0]?.text;

    if (!message) {
      return new Response(
        JSON.stringify({ error: "No response from AI" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message }),
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
