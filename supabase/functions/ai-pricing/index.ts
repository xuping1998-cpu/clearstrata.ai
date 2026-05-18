import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PricingRequest {
  title: string;
  description: string;
  job_type: string;
  category: string;
  estimated_budget: number;
  floor_plan_base64?: string;
  floor_plan_text?: string;
  /** Required unless job_id is provided (then property_id is derived from the job row). */
  property_id?: string;
  /** When provided with property_id, must match procurement_jobs.property_id. */
  job_id?: string;
  /** OCR-parsed procurement quote attachment (procurement_jobs.parsed_quote_json). */
  parsed_quote?: Record<string, unknown> | null;
  /** Human-readable quote context built on the client from parsed_quote. */
  quote_context?: string | null;
}

/** Light vendor name redaction for third-party model prompts (same-property rows only). */
function redactVendorName(raw: unknown): string {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return "—";
  if (s.length <= 2) return "[vendor]";
  return `${s[0]}***${s[s.length - 1]!}`;
}

function buildSystemPrompt(
  historyContext: string,
  hasFloorPlan: boolean,
  hasQuoteContext: boolean,
): string {
  let prompt = `你是一位专业的物业维修采购定价顾问，专注于加拿大温哥华地区的Strata物业管理。

你的任务是根据工程描述，给出合理的价格区间估计。请特别注意根据实际工作量（面积、单元数量、楼层数等）来调整估价。
${hasQuoteContext ? `
## 报价附件 OCR 优先（必须遵守）
当用户消息中包含「采购报价附件 OCR 解析结果」时：
1. **优先**依据 OCR 报价内容判断报价性质、计费单位与合理市场区间；
2. **不要**仅凭项目标题中的关键词套用下方静态价表；
3. 若 OCR 显示月度维护、单台设备、住宅 strata 等，必须按该计费单位估价；
4. 若 parsed_quote 中有 total_amount，将其作为**当前供应商报价锚点**进行合理性核验；
5. 给出的市场区间必须与 OCR 中的计费单位一致（per month / per unit / per visit / project total 等）；
6. 若无法判断计费单位，必须在 reasoning 中明确说明「计费单位不确定」，不要给出过度精确的区间。

### 电梯维保例外（重要）
若 OCR 显示：monthly maintenance、单台住宅电梯、one unit、金额约 CAD 711.90 等月度单台维保特征：
- **禁止**套用下方泛化「电梯维修保养 $2,000-$10,000」区间；
- 应判断为**月度单台维保价格核验**，区间与 reasoning 须以 monthly / per elevator 为单位说明。

## 静态价表使用顺序
下方温哥华常见价格参考表**仅作 fallback**：
- 有 quote_context / parsed_quote 时：quote_context 优先 → 项目描述次之 → 静态价表最后；
- 无 OCR 报价时：描述 + 静态价表 + 历史成交数据。
` : ""}

## 定价参考因素：
1. 工程类型和复杂度
2. 温哥华当地市场行情（包括人工费、材料费）
3. 楼盘规模（单元数量、面积等直接影响价格）
4. 季节性因素
5. 清涟Strata历史成交价格数据
${historyContext}

## 温哥华Strata物业维修常见价格参考（CAD）：

### 清洁与压力清洗
- 压力清洗（小型，<20单元，地面/车库）：$500-$1,200
- 压力清洗（中型，20-60单元，地面+阳台）：$800-$2,000
- 压力清洗（大型，60-100单元，地面+阳台+玻璃）：$800-$1,500
- 压力清洗（超大型，>100单元）：$2,000-$4,000
- 外墙清洗：$2,000-$8,000（按楼层和面积）
- 地下车库深度清洁：$500-$2,000
- 公共区域深度清洁（大堂、走廊等）：$500-$2,000
- 窗户清洗（整栋，按单元数）：$8-$25/单元

### 水管
- 小型维修（漏水、疏通）：$150-$500
- 中型维修（更换管道段）：$500-$2,000
- 大型维修（主管道更换）：$2,000-$8,000

### 电气
- 小型维修（开关、插座）：$100-$400
- 中型维修（面板升级）：$1,000-$3,500
- 照明系统更换（公共区域）：$1,000-$5,000

### 暖通空调
- 维修保养：$200-$800
- 设备更换：$3,000-$8,000

### 屋顶
- 局部维修：$500-$2,000
- 整体更换：$8,000-$25,000

### 油漆
- 单元内部：$2,000-$5,000
- 公共区域（走廊、大堂）：$5,000-$15,000
- 外墙涂装：$10,000-$50,000

### 电梯
- 维修保养：$2,000-$10,000

### 消防安全
- 消防系统检查/维修：$500-$3,000
- 灭火器更换/检查：$200-$1,000

### 门禁与安防
- 门禁系统维修/升级：$1,000-$5,000
- 摄像头系统：$2,000-$10,000

### 园艺景观
- 日常维护：$300-$1,500
- 大型景观工程：$3,000-$15,000
- Bark Mulch（树皮覆盖物）：$50-$70/立方码（含运费），铺设人工费$30-$50/立方码
- Top Soil（表土）：$40-$60/立方码（含运费）
- River Rock（河石）：$80-$120/立方码（含运费）
- 草坪铺设：$3-$6/平方英尺
- 灌溉系统安装：$2,000-$6,000

### 防水处理
- 局部防水：$1,000-$5,000
- 屋顶/地下室整体防水：$5,000-$20,000`;

  if (hasFloorPlan) {
    prompt += `

## 楼面图/地块分析指引：
用户已提供楼面图（floor plan）或地块图信息。请务必：
1. 仔细从图纸或文字中提取所有面积数据（平方英尺/平方米/英亩等）
2. 识别不同区域（花园、草坪、车道、建筑占地等）
3. 根据工程描述中的施工深度/厚度，精确计算所需材料量
4. 常用换算：
   - 1立方码 = 27立方英尺
   - 1英寸深度覆盖1平方英尺 = 1/12立方英尺
   - X平方英尺 × 深度(英寸) / 12 / 27 = 所需立方码数
   - 1平方米 = 10.764平方英尺
   - 1英亩 = 43,560平方英尺
5. 材料量计算时建议加10%余量以应对损耗
6. 分别列出材料费和人工费

## 重要：输出中必须包含material_calc字段，详细说明面积测算和材料量计算过程。`;
  }

  prompt += `

## 重要提醒：
- 估价必须基于温哥华本地市场实际行情，不要高估
- 大规模批量作业（如整栋楼压力清洗）通常有规模折扣，单价会降低
- 请根据描述中的具体工作量（单元数、面积等）合理估算

## 输出要求：
你必须只返回一个严格合法的 JSON 对象，不要包含任何其他文字：
- property names must be double quoted
- no trailing commas
- no markdown code fences or prose outside the JSON object

{
  "low": 0,
  "high": 0,
  "reasoning": "简要中文说明，包含关键计算依据"${hasFloorPlan ? `,
  "material_calc": "详细的材料量计算过程（从图纸面积到材料量与总价）"` : ""}
}`;

  return prompt;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OPENAI_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    console.log("AI_PRICING_PROVIDER", "openai");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    let body: PricingRequest;
    try {
      body = await req.json() as PricingRequest;
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      title,
      description,
      job_type,
      category,
      estimated_budget,
      floor_plan_base64,
      floor_plan_text,
      parsed_quote,
      quote_context,
    } = body;

    let resolvedPropertyId = typeof body.property_id === "string" ? body.property_id.trim() : "";
    const jobId = typeof body.job_id === "string" ? body.job_id.trim() : "";

    if (!resolvedPropertyId && jobId) {
      const { data: jobRow, error: jobErr } = await supabase
        .from("procurement_jobs")
        .select("property_id")
        .eq("id", jobId)
        .maybeSingle();
      if (jobErr || !jobRow?.property_id) {
        return new Response(
          JSON.stringify({ error: "job_id not found or missing property_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      resolvedPropertyId = String(jobRow.property_id);
    }

    if (resolvedPropertyId && jobId) {
      const { data: jobCheck, error: jobCheckErr } = await supabase
        .from("procurement_jobs")
        .select("property_id")
        .eq("id", jobId)
        .maybeSingle();
      if (jobCheckErr || !jobCheck?.property_id) {
        return new Response(
          JSON.stringify({ error: "job_id not found" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (String(jobCheck.property_id) !== resolvedPropertyId) {
        return new Response(
          JSON.stringify({ error: "property_id does not match job_id" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (!resolvedPropertyId) {
      return new Response(
        JSON.stringify({ error: "property_id is required (or pass job_id to derive it)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: historyData } = await supabase
      .from("price_history")
      .select("title, category, final_price, vendor_name, completed_at, job_type")
      .eq("property_id", resolvedPropertyId)
      .order("completed_at", { ascending: false })
      .limit(50);

    let historyContext = "";
    if (historyData && historyData.length > 0) {
      historyContext = `\n\n## 清涟历史成交价格数据（共${historyData.length}条记录）：\n`;
      historyData.forEach((record: Record<string, unknown>) => {
        const vn = redactVendorName(record.vendor_name);
        historyContext += `- 项目: ${record.title} | 类别: ${record.category || "未分类"} | 成交价: $${record.final_price} | 供应商: ${vn} | 完成时间: ${record.completed_at || "未知"}\n`;
      });
    } else {
      historyContext = "\n\n目前暂无历史成交数据，请完全基于温哥华市场数据进行估价。";
    }

    const hasFloorPlan = !!(floor_plan_base64 || floor_plan_text);
    const quoteContextText =
      typeof quote_context === "string" ? quote_context.trim() : "";
    const hasQuoteContext = quoteContextText.length > 0;
    const systemPrompt = buildSystemPrompt(historyContext, hasFloorPlan, hasQuoteContext);

    let floorPlanInfo = "";
    if (floor_plan_text) {
      floorPlanInfo = `\n\n## 楼面图/地块提取文字信息：\n${floor_plan_text}`;
    }

    let quoteSection = "";
    if (hasQuoteContext) {
      quoteSection = `## 采购报价附件 OCR 解析结果（优先级最高）\n${quoteContextText}\n\n`;
      const anchor =
        parsed_quote &&
        typeof parsed_quote === "object" &&
        parsed_quote.total_amount != null &&
        parsed_quote.total_amount !== ""
          ? `\n当前供应商报价锚点（total_amount）：${parsed_quote.total_amount}${
              parsed_quote.currency ? ` ${parsed_quote.currency}` : " CAD"
            }\n`
          : "";
      if (anchor) quoteSection += anchor;
      quoteSection +=
        "请优先依据以上 OCR 报价内容判断报价性质与计费单位，再给出市场合理区间。\n\n";
    }

    const userMessage = `${quoteSection}请为以下工程项目估价：

项目标题：${title}
项目描述：${description}
工程类型：${job_type === "maintenance" ? "维修" : "采购"}
类别：${category || "未分类"}
${estimated_budget > 0 ? `业主预算：$${estimated_budget}` : "业主未提供预算"}
${floorPlanInfo}
${hasFloorPlan ? "\n请务必从楼面图中提取面积数据，结合工程描述中的施工规格（深度、厚度等），精确计算所需材料量和合理总价。" : ""}

请给出合理的价格区间。`;

    type ChatMessage = {
      role: "system" | "user";
      content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
    };

    const messages: ChatMessage[] = [{ role: "system", content: systemPrompt }];

    if (floor_plan_base64) {
      const mediaType = floor_plan_base64.startsWith("/9j/") ? "image/jpeg" : "image/png";
      messages.push({
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: { url: `data:${mediaType};base64,${floor_plan_base64}` },
          },
          {
            type: "text",
            text: userMessage,
          },
        ],
      });
    } else {
      messages.push({ role: "user", content: userMessage });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: hasFloorPlan ? 2048 : 512,
        messages,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      console.error("OpenAI API error:", errorText);
      return new Response(
        JSON.stringify({ error: "AI service unavailable" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await openaiResponse.json();
    const responseText = data.choices?.[0]?.message?.content || "";

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "Failed to parse AI response" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let estimate: { low?: number; high?: number; reasoning?: string; material_calc?: string | null };
    try {
      estimate = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("AI_PRICING_JSON_PARSE_ERROR", {
        parseErr,
        responseText,
      });
      return new Response(
        JSON.stringify({ error: "Failed to parse OpenAI pricing JSON" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        low: estimate.low,
        high: estimate.high,
        reasoning: estimate.reasoning,
        material_calc: estimate.material_calc || null,
      }),
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
