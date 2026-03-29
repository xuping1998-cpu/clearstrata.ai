import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MeetingRequest {
  transcription: string;
  meetingTitle: string;
  meetingDate: string;
  language: string;
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
          setupInstructions: {
            step1: "Get your API key from https://console.anthropic.com/settings/keys",
            step2: "Add it to your Supabase project secrets",
            step3: "Restart this Edge Function"
          }
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const { transcription, meetingTitle, meetingDate, language }: MeetingRequest = await req.json();

    if (!transcription) {
      return new Response(
        JSON.stringify({ error: "No transcription provided" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const systemPrompt = language === "zh"
      ? `你是一个专业的会议记录助手。请根据提供的会议录音转录内容，生成一份完整的会议纪要。

会议纪要应该包括以下部分（使用 JSON 格式返回）：
1. agenda: 会议议程（从讨论内容中提取主要议题）
2. minutes: 会议纪要（详细记录讨论的内容、观点和过程）
3. decisions: 决议事项（明确记录达成的决定和共识）
4. action_items: 行动事项（列出后续需要执行的任务、责任人和时间）

请确保：
- 使用清晰、专业的语言
- 保持客观、准确
- 突出重点和关键决策
- 结构清晰、易于阅读

请只返回有效的 JSON 格式，不要包含任何其他文字说明。`
      : `You are a professional meeting minutes assistant. Based on the provided meeting audio transcription, generate a complete meeting record.

The meeting record should include the following sections (return in JSON format):
1. agenda: Meeting agenda (extract main topics from the discussion)
2. minutes: Meeting minutes (detailed record of discussions, viewpoints, and process)
3. decisions: Decisions made (clearly record decisions and consensus reached)
4. action_items: Action items (list follow-up tasks, responsible persons, and timelines)

Please ensure:
- Use clear, professional language
- Maintain objectivity and accuracy
- Highlight key points and decisions
- Clear structure and easy to read

Please return only valid JSON format without any additional text or explanations.`;

    const userPrompt = `Meeting Title: ${meetingTitle}
Meeting Date: ${meetingDate}

Transcription:
${transcription}

Please generate a structured meeting record in JSON format with fields: agenda, minutes, decisions, action_items`;

    const completionResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicApiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
      }),
    });

    if (!completionResponse.ok) {
      const error = await completionResponse.text();
      throw new Error(`AI generation failed: ${error}`);
    }

    const completionData = await completionResponse.json();
    const responseText = completionData.content[0].text;

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : responseText;

    const generatedContent = JSON.parse(jsonText);

    return new Response(
      JSON.stringify({
        transcription: transcription,
        agenda: generatedContent.agenda || "",
        minutes: generatedContent.minutes || "",
        decisions: generatedContent.decisions || "",
        action_items: generatedContent.action_items || "",
      }),
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
      JSON.stringify({
        error: error.message || "Internal server error",
        details: error.toString()
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
