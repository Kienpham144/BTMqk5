import { createClient } from "npm:@supabase/supabase-js@2";

const FEEDBACK_TO_EMAIL = "kiensqchtmtckgm@gmail.com";

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

function buildAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    throw new Error("Thiếu cấu hình máy chủ, vui lòng liên hệ quản trị.");
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }
  if (req.method !== "POST") {
    return json({ error: "Phương thức không hợp lệ" }, 405);
  }

  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body) return json({ error: "Thiếu dữ liệu gửi lên" }, 400);

    const fullName = (body.full_name ?? "").toString().trim();
    const email = (body.email ?? "").toString().trim();
    const subject = (body.subject ?? "").toString().trim();
    const content = (body.content ?? "").toString().trim();

    if (!content) return json({ error: "Vui lòng nhập nội dung ý kiến" }, 400);

    const supabaseAdmin = buildAdminClient();

    const { error: insErr } = await supabaseAdmin.from("feedback").insert({
      full_name: fullName || null,
      email: email || null,
      subject: subject || null,
      content,
    });
    if (insErr) return json({ error: insErr.message }, 400);

    // Gửi email thông báo qua Resend (best-effort, không chặn nếu thiếu cấu hình).
    let emailSent = false;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const fromDomain = Deno.env.get("RESEND_FROM_DOMAIN");

    if (resendKey && fromDomain) {
      const now = new Date().toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;">
          <div style="background:#b91c1c;color:#ffffff;padding:16px 24px;">
            <h2 style="margin:0;font-size:18px;">Đóng góp ý kiến mới</h2>
          </div>
          <div style="padding:24px;">
            <p style="margin:0 0 16px;color:#374151;font-size:14px;">Có một ý kiến mới được gửi từ website, vào lúc <strong>${escapeHtml(now)}</strong>.</p>
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#1f2937;">
              <tr>
                <td style="padding:8px 0;width:120px;color:#6b7280;font-weight:bold;">Họ và tên</td>
                <td style="padding:8px 0;">${escapeHtml(fullName || "(không có)")}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-weight:bold;">Email</td>
                <td style="padding:8px 0;">${escapeHtml(email || "(không có)")}</td>
              </tr>
              <tr>
                <td style="padding:8px 0;color:#6b7280;font-weight:bold;">Tiêu đề</td>
                <td style="padding:8px 0;">${escapeHtml(subject || "(không có)")}</td>
              </tr>
            </table>
            <div style="margin-top:16px;background:#f9fafb;border-radius:6px;padding:16px;">
              <p style="margin:0 0 8px;color:#6b7280;font-weight:bold;">Nội dung</p>
              <p style="margin:0;color:#1f2937;white-space:pre-wrap;line-height:1.6;">${escapeHtml(content)}</p>
            </div>
          </div>
          <div style="background:#f3f4f6;padding:12px 24px;font-size:12px;color:#9ca3af;">
            Email tự động từ hệ thống website — Bộ Tham mưu Quân khu 5.
          </div>
        </div>
      `;

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `Website Góp ý <noreply@${fromDomain}>`,
            to: [FEEDBACK_TO_EMAIL],
            reply_to: email || undefined,
            subject: `[Góp ý] ${subject || "Không tiêu đề"}`,
            html,
          }),
        });
        emailSent = res.ok;
      } catch {
        emailSent = false;
      }
    }

    return json({ ok: true, email_sent: emailSent });
  } catch (e) {
    const msg = (e as Error)?.message || "Lỗi không xác định";
    return json({ error: msg }, 500);
  }
});
