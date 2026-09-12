import { createClient } from "npm:@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(base64);
    const utf8 = decodeURIComponent(
      decoded.split("").map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0")).join("")
    );
    return JSON.parse(utf8);
  } catch {
    return null;
  }
}

function buildAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Thiếu cấu hình máy chủ.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  try {
    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    if (!body) return json({ error: "Thiếu dữ liệu gửi lên" }, 400);

    const supabaseAdmin = buildAdminClient();

    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Chưa đăng nhập" }, 401);

    const payload = decodeJwtPayload(token);
    const userId = payload?.sub?.toString() || "";
    if (!userId) return json({ error: "Phiên đăng nhập không hợp lệ" }, 401);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profile?.role !== "admin") return json({ error: "Bạn không có quyền quản trị" }, 403);

    const competitionId = Number(body.competitionId);
    if (!Number.isFinite(competitionId)) return json({ error: "Thiếu cuộc thi" }, 400);

    const rawQuestions = body.questions;
    if (!Array.isArray(rawQuestions) || rawQuestions.length === 0) {
      return json({ error: "Danh sách câu hỏi trống" }, 400);
    }
    if (rawQuestions.length > 2000) {
      return json({ error: "Chỉ hỗ trợ tối đa 2000 câu mỗi lần nhập" }, 400);
    }

    const startIndex = Number.isFinite(Number(body.startIndex)) ? Number(body.startIndex) : 1;

    const rows = (rawQuestions as unknown[]).map((item, i) => {
      const q = (item ?? {}) as Record<string, unknown>;
      return {
        competition_id: competitionId,
        question: (q.question ?? "").toString(),
        options: Array.isArray(q.options) ? q.options : [],
        answer: Number.isFinite(Number(q.answer)) ? Number(q.answer) : 0,
        explanation: (q.explanation ?? "").toString(),
        order_index: startIndex + i,
        type: "mcq",
        grading_mode: "auto",
        essay_answers: [],
        graded: true,
        question_set: (q.question_set ?? "").toString(),
      };
    });

    const invalid = rows.filter((r) => !r.question.trim() || (r.options as unknown[]).length < 2);
    if (invalid.length > 0) {
      return json({ error: `Có ${invalid.length} câu thiếu nội dung hoặc chưa đủ đáp án.` }, 400);
    }

    const CHUNK_SIZE = 500;
    let inserted = 0;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE);
      const { error } = await supabaseAdmin.from("quiz_questions").insert(chunk);
      if (error) return json({ error: error.message, inserted }, 400);
      inserted += chunk.length;
    }

    return json({ ok: true, inserted });
  } catch (e) {
    const msg = (e as Error)?.message || "Lỗi không xác định";
    return json({ error: msg }, 500);
  }
});
