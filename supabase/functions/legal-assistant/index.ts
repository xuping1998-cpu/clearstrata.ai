import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SYSTEM_PROMPT = `You are a legal assistant specializing in strata/condo law and property management regulations. You help answer questions about:

- Strata bylaws and regulations
- Property management compliance
- Insurance requirements
- Owner rights and responsibilities
- Meeting procedures and voting rules
- Dispute resolution processes
- Maintenance and repair obligations
- Financial and budgeting requirements

Provide clear, helpful answers in plain language. Always remind users to consult with a qualified lawyer for specific legal advice.

When responding:
1. Be concise and practical
2. Reference relevant legal principles when applicable
3. Suggest next steps when appropriate
4. Always include a disclaimer that this is general information, not legal advice`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const anthropicApiKey = Deno.env.get("ANTHROPIC_API_KEY");

    if (!anthropicApiKey) {
      return new Response(
        JSON.stringify({
          error: "Anthropic API key not configured. Please add ANTHROPIC_API_KEY to your Edge Function secrets.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { messages, language } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Invalid request: messages array required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const systemMessage = language === "zh"
      ? `你是一位专门研究物业管理法规和业主委员会法律的法律助手。你帮助回答关于：

- 物业管理条例和规定
- 合规要求
- 保险要求
- 业主权利和责任
- 会议程序和投票规则
- 纠纷解决流程
- 维修和保养义务
- 财务和预算要求

请用简洁明了的语言提供帮助。始终提醒用户就具体法律建议咨询合格的律师。

回答时：
1. 简洁实用
2. 适当引用相关法律原则
3. 建议适当的下一步行动
4. 始终包含免责声明，说明这是一般信息，而非法律建议`
      : SYSTEM_PROMPT;

    const anthropicResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2048,
        system: systemMessage,
        messages: messages,
        temperature: 0.7,
      }),
    });

    if (!anthropicResponse.ok) {
      const error = await anthropicResponse.text();
      console.error("Anthropic API error:", error);
      return new Response(
        JSON.stringify({ error: "Failed to get response from AI service" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data = await anthropicResponse.json();
    const assistantMessage = data.content[0]?.text;

    if (!assistantMessage) {
      return new Response(
        JSON.stringify({ error: "No response from AI service" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
