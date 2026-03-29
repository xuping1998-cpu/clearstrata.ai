import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SearchRequest {
  title: string;
  description: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { title, description }: SearchRequest = await req.json();

    const mockCandidates: { [key: string]: any[] } = {
      "物业经理": [
        {
          name: "李明",
          contact: "liming@email.com / 9123-4567",
          experience: "5年物业管理经验，持有物业经理资格证",
        },
        {
          name: "张伟",
          contact: "zhangwei@email.com / 9234-5678",
          experience: "8年大型商业物业管理经验，擅长团队管理",
        },
        {
          name: "王芳",
          contact: "wangfang@email.com / 9345-6789",
          experience: "6年住宅物业管理经验，业主满意度高",
        },
      ],
      "保安": [
        {
          name: "陈强",
          contact: "chenqiang@email.com / 9456-7890",
          experience: "退伍军人，3年保安工作经验",
        },
        {
          name: "刘勇",
          contact: "liuyong@email.com / 9567-8901",
          experience: "5年夜班保安经验，持有保安员证",
        },
        {
          name: "赵军",
          contact: "zhaojun@email.com / 9678-9012",
          experience: "4年物业保安经验，责任心强",
        },
      ],
      "维修技师": [
        {
          name: "孙建国",
          contact: "sunjg@email.com / 9789-0123",
          experience: "10年电工经验，持有高级电工证",
        },
        {
          name: "周明",
          contact: "zhouming@email.com / 9890-1234",
          experience: "7年综合维修经验，擅长水电暖",
        },
        {
          name: "吴涛",
          contact: "wutao@email.com / 9901-2345",
          experience: "6年设备维护经验，反应迅速",
        },
      ],
    };

    let candidates = mockCandidates["物业经理"];

    if (title.includes("保安") || title.includes("Security")) {
      candidates = mockCandidates["保安"];
    } else if (title.includes("维修") || title.includes("技师") || title.includes("Maintenance") || title.includes("Technician")) {
      candidates = mockCandidates["维修技师"];
    } else if (title.includes("物业") || title.includes("经理") || title.includes("Property") || title.includes("Manager")) {
      candidates = mockCandidates["物业经理"];
    }

    const relevantCandidates = candidates.map(candidate => ({
      candidate_name: candidate.name,
      candidate_contact: candidate.contact,
      notes: candidate.experience,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        candidates: relevantCandidates,
        message: `找到 ${relevantCandidates.length} 位合适候选人`,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
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
