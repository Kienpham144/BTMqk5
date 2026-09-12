import { createClient } from "npm:@supabase/supabase-js@2";

const ADMIN_EMAIL = "kiensqchtmtckgm@gmail.com";
const EMAIL_DOMAIN = "qk5.local";

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
    throw new Error("Thiếu cấu hình máy chủ, vui lòng liên hệ quản trị.");
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
    if (!body) {
      return json({ error: "Thiếu dữ liệu gửi lên" }, 400);
    }
    const action = (body?.action as string) || "create-users";
    const supabaseAdmin = buildAdminClient();

    if (action === "bootstrap-admin") {
      const email = (body?.email || "").toString().trim().toLowerCase();
      const password = body?.password?.toString() || "";
      const fullName = (body?.fullName || "Quản trị viên").toString();

      if (!email || !password) return json({ error: "Thiếu email hoặc mật khẩu" }, 400);
      if (email !== ADMIN_EMAIL) return json({ error: "Email không được phép đăng ký quản trị" }, 403);
      if (password.length < 6) return json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, 400);

      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) {
        if (error.message?.toLowerCase().includes("already")) {
          return json({ error: "Tài khoản quản trị đã tồn tại, vui lòng đăng nhập." }, 400);
        }
        return json({ error: error.message }, 400);
      }

      const { error: pErr } = await supabaseAdmin
        .from("profiles")
        .insert({ id: data.user.id, username: email, full_name: fullName, role: "admin" });

      if (pErr) return json({ error: pErr.message }, 400);

      return json({ ok: true });
    }

    // ---- Authenticated actions ----
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Chưa đăng nhập" }, 401);

    let userId = decodeJwtPayload(token)?.sub?.toString() || "";

    if (!userId) {
      const { data: gotUser, error: getUserErr } = await supabaseAdmin.auth.getUser(token);
      if (!getUserErr && gotUser?.user?.id) userId = gotUser.user.id;
    }
    if (!userId) return json({ error: "Phiên đăng nhập không hợp lệ" }, 401);

    const { data: profile, error: profileErr } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (profileErr) {
      return json({ error: `Không đọc được hồ sơ người dùng: ${profileErr.message}` }, 400);
    }

    if (action === "check-role") {
      return json({ isAdmin: profile?.role === "admin" });
    }

    if (profile?.role !== "admin") return json({ error: "Bạn không có quyền quản trị" }, 403);

    if (action === "list-admins") {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("role", "admin")
        .order("created_at", { ascending: true });
      if (error) return json({ error: error.message }, 400);
      return json({ admins: data ?? [] });
    }

    if (action === "create-admin") {
      const username = (body?.username || "").toString().trim().toLowerCase();
      const password = body?.password?.toString() || "";
      const fullName = (body?.full_name || "").toString().trim();

      if (!username || !password || !fullName) {
        return json({ error: "Thiếu tên đăng nhập / mật khẩu / họ tên quản trị viên" }, 400);
      }
      if (password.length < 6) return json({ error: "Mật khẩu phải có ít nhất 6 ký tự" }, 400);

      const email = `${username}@${EMAIL_DOMAIN}`;
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (error) {
        if (error.message?.toLowerCase().includes("already")) {
          return json({ error: "Tên đăng nhập này đã tồn tại." }, 400);
        }
        return json({ error: error.message }, 400);
      }

      const { error: pErr } = await supabaseAdmin.from("profiles").insert({
        id: data.user.id,
        username,
        full_name: fullName,
        rank: body?.rank?.toString() || null,
        position: body?.position?.toString() || null,
        unit: body?.unit?.toString() || null,
        role: "admin",
      });

      if (pErr) return json({ error: pErr.message }, 400);
      return json({ ok: true });
    }

    if (action === "delete-user") {
      const targetId = (body?.userId || "").toString();
      if (!targetId) return json({ error: "Thiếu id tài khoản" }, 400);

      if (targetId === userId) {
        return json({ error: "Không thể xóa tài khoản quản trị đang đăng nhập." }, 400);
      }

      const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(targetId);
      const { error: pDelErr } = await supabaseAdmin.from("profiles").delete().eq("id", targetId);

      if (authDelErr || pDelErr) {
        return json({ error: (authDelErr?.message || pDelErr?.message || "Lỗi xóa tài khoản") }, 400);
      }
      return json({ ok: true });
    }

    if (action === "delete-users") {
      const rawIds = Array.isArray(body?.userIds) ? body.userIds : [];
      const ids = rawIds.map((v) => (v || "").toString()).filter(Boolean);
      if (ids.length === 0) return json({ error: "Danh sách tài khoản trống" }, 400);

      const failed: Array<{ id: string; error: string }> = [];
      let deleted = 0;

      for (const targetId of ids) {
        if (targetId === userId) {
          failed.push({ id: targetId, error: "Không thể xóa tài khoản đang đăng nhập." });
          continue;
        }
        const { error: authDelErr } = await supabaseAdmin.auth.admin.deleteUser(targetId);
        const { error: pDelErr } = await supabaseAdmin.from("profiles").delete().eq("id", targetId);
        if (authDelErr || pDelErr) {
          failed.push({
            id: targetId,
            error: authDelErr?.message || pDelErr?.message || "Lỗi xóa tài khoản",
          });
        } else {
          deleted += 1;
        }
      }

      return json({ ok: true, deleted, failed });
    }

    if (action === "update-user") {
      const targetId = (body?.userId || "").toString();
      const updates = (body?.updates ?? {}) as Record<string, unknown>;
      if (!targetId) return json({ error: "Thiếu id tài khoản" }, 400);

      const profileUpdates: Record<string, unknown> = {};
      if (updates.full_name !== undefined) profileUpdates.full_name = updates.full_name;
      if (updates.rank !== undefined) profileUpdates.rank = updates.rank;
      if (updates.position !== undefined) profileUpdates.position = updates.position;
      if (updates.unit !== undefined) profileUpdates.unit = updates.unit;
      if (updates.hometown !== undefined) profileUpdates.hometown = updates.hometown;
      if (updates.residence !== undefined) profileUpdates.residence = updates.residence;
      if (updates.avatar_url !== undefined) profileUpdates.avatar_url = updates.avatar_url;
      if (updates.batch !== undefined) profileUpdates.batch = updates.batch === null ? null : Number(updates.batch);

      if (Object.keys(profileUpdates).length > 0) {
        const { error: pUpdErr } = await supabaseAdmin
          .from("profiles")
          .update(profileUpdates)
          .eq("id", targetId);
        if (pUpdErr) return json({ error: pUpdErr.message }, 400);
      }

      const newPassword = updates.password?.toString() || "";
      if (newPassword && newPassword.length >= 6) {
        const { error: pwErr } = await supabaseAdmin.auth.admin.updateUserById(targetId, {
          password: newPassword,
        });
        if (pwErr) return json({ error: pwErr.message }, 400);
      }

      return json({ ok: true });
    }

    const users = body?.users as unknown[] || [];
    if (!Array.isArray(users) || users.length === 0) {
      return json({ error: "Danh sách tài khoản trống" }, 400);
    }

    const results: Array<Record<string, unknown>> = new Array(users.length);
    const CONCURRENCY = 5;
    let cursor = 0;

    async function worker() {
      while (cursor < users.length) {
        const i = cursor++;
        const item = (users[i] ?? {}) as Record<string, unknown>;
        const username = (item.username || "").toString().trim().toLowerCase();
        const password = item.password?.toString() || "";
        const fullName = (item.full_name || "").toString().trim();

        if (!username || !password || !fullName) {
          results[i] = { username: username || "(thiếu)", error: "Thiếu họ tên / tên đăng nhập / mật khẩu" };
          continue;
        }
        if (password.length < 6) {
          results[i] = { username, error: "Mật khẩu phải có ít nhất 6 ký tự" };
          continue;
        }

        const email = `${username}@${EMAIL_DOMAIN}`;

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (error) {
          results[i] = { username, error: error.message };
          continue;
        }

        const batch = item.batch != null ? Number(item.batch) : null;
        const { error: pErr } = await supabaseAdmin.from("profiles").insert({
          id: data.user.id,
          username,
          full_name: fullName,
          rank: item.rank?.toString() || null,
          position: item.position?.toString() || null,
          unit: item.unit?.toString() || null,
          batch: Number.isFinite(batch) ? batch : null,
          role: "user",
        });

        results[i] = pErr ? { username, error: pErr.message } : { username, ok: true };
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(CONCURRENCY, users.length) }, () => worker()),
    );

    return json({ results });
  } catch (e) {
    const msg = (e as Error)?.message || "Lỗi không xác định";
    return json({ error: msg }, 500);
  }
});
