import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = (import.meta.env.VITE_PUBLIC_SUPABASE_URL as string).replace(/\/+$/, "");
const supabaseAnonKey = import.meta.env.VITE_PUBLIC_SUPABASE_ANON_KEY as string;

// Auth operations use a no-op lock. We deliberately avoid:
//   - navigator.locks (Web Locks API): shared across tabs, a stale/hung tab can
//     hold a lock forever with no reliable timeout, freezing this tab.
//   - any promise-chain / Set guard: nested calls could still deadlock.
// A no-op lock can NEVER deadlock. Supabase's GoTrueClient already de-duplicates
// concurrent token refreshes internally, so running without cross-tab locking is
// safe for this single-admin panel and eliminates the freeze at its root.
function authLock<R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> {
  return fn();
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    lock: authLock,
  },
});

export interface Profile {
  id: string;
  username: string | null;
  full_name: string | null;
  rank: string | null;
  position: string | null;
  unit: string | null;
  hometown: string | null;
  residence: string | null;
  avatar_url: string | null;
  role: string;
  batch: number | null;
  created_at: string;
  last_seen: string | null;
}

export interface QuizResult {
  id: number;
  user_id: string | null;
  username: string | null;
  full_name: string | null;
  rank: string | null;
  position: string | null;
  unit: string | null;
  phone: string | null;
  score: number;
  total: number;
  correct_count: number;
  answers: (number | string)[] | null;
  question_ids: number[] | null;
  competition_id: number | null;
  manual_grades: Record<string, number> | null;
  duration_seconds: number | null;
  violations: number;
  created_at: string;
}

export interface QuizQuestion {
  id: number;
  competition_id: number | null;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  order_index: number;
  created_at: string;
  type: string;
  grading_mode: string;
  essay_answers: string[];
  graded?: boolean;
  question_set: string;
}

export interface QuizSettings {
  id: number;
  time_limit_minutes: number;
  score_per_question: number;
  passing_score: number;
  show_ranking: boolean;
  anti_cheat_enabled: boolean;
}

export type CompetitionStatus = "open" | "coming" | "closed";

export interface Competition {
  id: number;
  title: string;
  description: string | null;
  status: CompetitionStatus;
  featured: boolean;
  image_url: string | null;
  start_date: string | null;
  end_date: string | null;
  time_limit_minutes: number;
  score_per_question: number;
  passing_score: number;
  require_login: boolean;
  shuffle_questions: boolean;
  num_questions: number;
  allow_retake: boolean;
  restricted: boolean;
  allowed_user_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface CompetitionInput {
  title: string;
  description?: string | null;
  status?: CompetitionStatus;
  featured?: boolean;
  image_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  time_limit_minutes?: number;
  score_per_question?: number;
  passing_score?: number;
  require_login?: boolean;
  shuffle_questions?: boolean;
  num_questions?: number;
  allow_retake?: boolean;
  restricted?: boolean;
  allowed_user_ids?: string[] | null;
}

export interface NewAccount {
  username: string;
  password: string;
  full_name: string;
  rank: string;
  position: string;
  unit: string;
  batch?: number | null;
}

export async function getCurrentUser() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.user ?? null;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) return null;
  return (data as Profile) ?? null;
}

export async function listProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "user")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

export async function listAdmins(): Promise<Profile[]> {
  const data = await callEdgeFunction("admin-users", { action: "list-admins" });
  return (data as { admins?: Profile[] })?.admins ?? [];
}

export async function createAdmin(admin: {
  username: string;
  password: string;
  full_name: string;
  rank?: string;
  position?: string;
  unit?: string;
}) {
  return callEdgeFunction("admin-users", { action: "create-admin", ...admin });
}

export async function updateProfile(id: string, updates: Partial<Omit<Profile, "id" | "created_at" | "role">>) {
  const { error } = await supabase.from("profiles").update(updates).eq("id", id);
  if (error) throw error;
}

// Người dùng đang đăng nhập tự cập nhật hồ sơ của mình. Việc này đi qua một
// hàm an toàn ở Backend (chỉ cho phép sửa các trường hồ sơ, không thể đổi vai
// trò), nên người dùng thường cũng cập nhật được mà không đụng tới quyền.
export async function updateMyProfile(updates: {
  full_name?: string;
  rank?: string;
  position?: string;
  unit?: string;
  hometown?: string;
  residence?: string;
  avatar_url?: string;
}) {
  const { error } = await supabase.rpc("update_my_profile", { p_updates: updates });
  if (error) throw error;
}

// Tải ảnh đại diện lên kho lưu trữ rồi trả về đường dẫn xem được ngay.
export async function uploadAvatar(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("public")
    .upload(`avatars/${fileName}`, file, { upsert: false });
  if (error) throw error;

  // Ảnh trong Backend cần kèm khóa khi truy cập, nên lưu đường dẫn có chữ ký
  // dài hạn để hiển thị trực tiếp bằng thẻ ảnh.
  const { data: signed } = await supabase.storage
    .from("public")
    .createSignedUrl(`avatars/${fileName}`, 315360000);
  if (!signed?.signedUrl) throw new Error("Không thể tạo đường dẫn ảnh.");
  return signed.signedUrl;
}

export async function deleteProfile(id: string) {
  return callEdgeFunction("admin-users", {
    action: "delete-user",
    userId: id,
  });
}

// Xóa nhiều tài khoản trong một lần gọi. Trả về số lượng đã xóa và danh sách
// tài khoản xóa lỗi (nếu có) để màn hình quản trị báo lại cho người dùng.
export async function deleteProfiles(ids: string[]): Promise<{
  ok: boolean;
  deleted: number;
  failed: Array<{ id: string; error: string }>;
}> {
  if (ids.length === 0) return { ok: true, deleted: 0, failed: [] };
  const data = await callEdgeFunction("admin-users", {
    action: "delete-users",
    userIds: ids,
  }, 180000);
  return {
    ok: true,
    deleted: Number((data as { deleted?: number })?.deleted ?? 0),
    failed: (data as { failed?: Array<{ id: string; error: string }> })?.failed ?? [],
  };
}

export async function resetUserPassword(id: string, newPassword: string) {
  return callEdgeFunction("admin-users", {
    action: "update-user",
    userId: id,
    updates: { password: newPassword },
  });
}

export async function updateAdminProfile(
  id: string,
  updates: {
    full_name?: string;
    rank?: string;
    position?: string;
    unit?: string;
    hometown?: string;
    residence?: string;
    avatar_url?: string;
    password?: string;
  },
) {
  return callEdgeFunction("admin-users", {
    action: "update-user",
    userId: id,
    updates,
  });
}

export async function signIn(identifier: string, password: string) {
  const email = identifier.includes("@")
    ? identifier.trim().toLowerCase()
    : `${identifier.trim().toLowerCase()}@qk5.local`;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data.user;
}

export async function signOut() {
  await supabase.auth.signOut();
}

async function callEdgeFunction(functionName: string, body: unknown, timeoutMs = 60000) {
  const url = `${supabaseUrl}/functions/v1/${functionName}`;
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token || "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: supabaseAnonKey,
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Hẹn giờ cho mỗi lần gọi máy chủ: nếu máy chủ không phản hồi kịp, tự ngắt
  // kết nối để nút không bị "xoay mãi không dừng", đồng thời trả lỗi rõ ràng
  // để người dùng biết và thử lại (thay vì đợi vô hạn như trước).
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = await res.json().catch(() => ({ error: "Lỗi phản hồi từ server" }));
    if (!res.ok) throw new Error(data?.error || `Lỗi ${res.status}: ${res.statusText}`);
    if (data?.error) throw new Error(data.error);
    return data;
  } catch (err) {
    if ((err as Error)?.name === "AbortError") {
      throw new Error("Máy chủ phản hồi quá chậm, hãy thử lại.");
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export async function bootstrapAdmin(email: string, password: string, fullName: string) {
  return callEdgeFunction("admin-users", {
    action: "bootstrap-admin",
    email,
    password,
    fullName,
  });
}

export async function checkAdminRole(): Promise<boolean> {
  try {
    const data = await callEdgeFunction("admin-users", { action: "check-role" });
    return (data as { isAdmin?: boolean })?.isAdmin === true;
  } catch {
    return false;
  }
}

export async function createUsers(
  users: NewAccount[],
  onProgress?: (done: number, total: number) => void,
) {
  // Tạo hàng loạt nếu gửi cả danh sách trong 1 lần gọi sẽ bị máy chủ ngắt vì
  // xử lý quá lâu (lỗi 504). Vì vậy chia thành nhiều gói nhỏ: mỗi gói gọi
  // backend 1 lần, gói sau nối tiếp gói trước để mỗi lần gọi luôn nhanh.
  const BATCH_SIZE = 5;
  const results: Array<{ username: string; ok?: boolean; error?: string }> = [];
  const total = users.length;

  for (let i = 0; i < total; i += BATCH_SIZE) {
    const batch = users.slice(i, i + BATCH_SIZE);
    try {
      const data = await callEdgeFunction(
        "admin-users",
        { action: "create-users", users: batch },
        180000,
      );
      const batchResults =
        (data as { results?: Array<{ username: string; ok?: boolean; error?: string }> })?.results ||
        [];
      // Phòng trường hợp backend trả về thiếu, vẫn ghi nhận đủ số người trong gói.
      batch.forEach((u, idx) => {
        const got = batchResults[idx];
        results.push(got ? { ...got, username: got.username || u.username } : { username: u.username, error: "Không rõ kết quả" });
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Lỗi không xác định";
      // Gói này lỗi thì đánh dấu lỗi cho từng người, không làm hỏng cả danh sách.
      batch.forEach((u) => results.push({ username: u.username, error: msg }));
    }
    onProgress?.(Math.min(i + BATCH_SIZE, total), total);
  }

  return { results };
}

export interface QuizProgress {
  id: number;
  user_id: string;
  competition_id: number | null;
  current_index: number;
  // Cột jsonb linh hoạt: lưu trọn gói tiến trình (đáp án theo thứ tự hiển thị,
  // mốc hết giờ, thời điểm bắt đầu, thứ tự câu đã xáo) để hồi phục y nguyên.
  answers: unknown;
  deadline: string | null;
  created_at: string;
  updated_at: string;
}

export async function getQuizProgress(competitionId: number, userId: string): Promise<QuizProgress | null> {
  const { data, error } = await supabase
    .from("quiz_progress")
    .select("*")
    .eq("competition_id", competitionId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return null;
  return (data as QuizProgress) ?? null;
}

export async function saveQuizProgress(params: {
  competitionId: number;
  userId: string;
  currentIndex: number;
  answers: unknown;
  deadline: string;
}) {
  const { error } = await supabase
    .from("quiz_progress")
    .upsert(
      {
        user_id: params.userId,
        competition_id: params.competitionId,
        current_index: params.currentIndex,
        answers: params.answers,
        deadline: params.deadline,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,competition_id" },
    );
  if (error) throw error;
}

export async function clearQuizProgress(competitionId: number, userId: string) {
  const { error } = await supabase
    .from("quiz_progress")
    .delete()
    .eq("competition_id", competitionId)
    .eq("user_id", userId);
  if (error) throw error;
}

// Một lượt "bỏ thi": thí sinh đã bắt đầu làm bài nhưng rời đi quá lâu và
// không quay lại nộp, nên tiến trình vẫn còn sót lại và đã quá hạn.
export interface AbandonedAttempt {
  user_id: string;
  competition_id: number | null;
  deadline: string | null;
  updated_at: string;
  full_name: string | null;
  username: string | null;
  rank: string | null;
  position: string | null;
  unit: string | null;
}

// Liệt kê các lượt bỏ thi (dành cho quản trị viên). Tiến trình làm bài bị xóa
// ngay khi nộp, nên một dòng tiến trình còn sót lại + đã quá hạn = bỏ thi.
export async function listAbandonedAttempts(): Promise<AbandonedAttempt[]> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("quiz_progress")
    .select("user_id, competition_id, deadline, updated_at, answers")
    .lt("deadline", nowIso);
  if (error) throw error;

  const rows = (data as Array<{
    user_id: string;
    competition_id: number | null;
    deadline: string | null;
    updated_at: string;
    answers: unknown;
  }>) ?? [];

  // Bỏ qua cuộc thi không giới hạn thời gian (gói tiến trình có deadline = null),
  // vì những cuộc thi đó không thể "hết giờ".
  const abandoned = rows.filter((r) => {
    const pkg = r.answers as { deadline?: number | null } | null;
    return !!pkg && typeof pkg.deadline === "number";
  });

  const userIds = Array.from(new Set(abandoned.map((r) => r.user_id).filter(Boolean)));
  const profileMap = new Map<
    string,
    { full_name: string | null; username: string | null; rank: string | null; position: string | null; unit: string | null }
  >();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, username, rank, position, unit")
      .in("id", userIds);
    (profiles ?? []).forEach((p) => {
      const row = p as {
        id: string;
        full_name: string | null;
        username: string | null;
        rank: string | null;
        position: string | null;
        unit: string | null;
      };
      profileMap.set(row.id, row);
    });
  }

  return abandoned.map((r) => {
    const p = profileMap.get(r.user_id);
    return {
      user_id: r.user_id,
      competition_id: r.competition_id,
      deadline: r.deadline,
      updated_at: r.updated_at,
      full_name: p?.full_name ?? null,
      username: p?.username ?? null,
      rank: p?.rank ?? null,
      position: p?.position ?? null,
      unit: p?.unit ?? null,
    };
  });
}

export interface GuestInfo {
  fullName: string;
  phone: string;
  unit: string;
  rank?: string;
  position?: string;
}

export async function saveQuizResult(
  score: number,
  total: number,
  correctCount: number,
  answers: (number | string)[],
  competitionId?: number | null,
  durationSeconds?: number | null,
  guest?: GuestInfo | null,
  violations?: number | null,
  questionIds?: number[] | null,
) {
  const user = await getCurrentUser();
  if (!user && !guest) return { ok: false as const, error: "Chưa có thông tin người thi" };

  const profile = user ? await getProfile(user.id) : null;
  const { error } = await supabase.from("quiz_results").insert({
    user_id: user?.id ?? null,
    username: user ? (profile?.username ?? null) : null,
    full_name: user ? (profile?.full_name ?? null) : guest?.fullName ?? null,
    rank: user ? (profile?.rank ?? null) : guest?.rank ?? null,
    position: user ? (profile?.position ?? null) : guest?.position ?? null,
    unit: user ? (profile?.unit ?? null) : guest?.unit ?? null,
    phone: guest?.phone ?? null,
    score,
    total,
    correct_count: correctCount,
    answers,
    question_ids: questionIds && questionIds.length > 0 ? questionIds : null,
    competition_id: competitionId ?? null,
    duration_seconds: durationSeconds ?? null,
    violations: violations ?? 0,
  });
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function updateQuizResultGrade(id: number, manualGrades: Record<string, number>) {
  const { error } = await supabase
    .from("quiz_results")
    .update({ manual_grades: manualGrades })
    .eq("id", id);
  if (error) throw error;
}

// Cho phép quản trị viên chỉnh sửa toàn bộ kết quả bài thi của thí sinh:
// điểm số, số câu đúng, đáp án từng câu và điểm chấm tay (tự luận).
export async function updateQuizResultFull(
  id: number,
  updates: {
    score?: number;
    correct_count?: number;
    answers?: (number | string)[];
    manual_grades?: Record<string, number> | null;
  },
) {
  const { error } = await supabase
    .from("quiz_results")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQuizResult(id: number) {
  const { error } = await supabase.from("quiz_results").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteQuizResults(ids: number[]) {
  if (ids.length === 0) return;
  const CHUNK_SIZE = 100;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("quiz_results").delete().in("id", chunk);
    if (error) throw error;
  }
}

// Kiểm tra xem một người đã từng hoàn thành (có kết quả) cuộc thi này chưa.
// Dùng để chặn thi lại khi cuộc thi đặt chế độ "chỉ thi 1 lần duy nhất".
export async function hasCompletedAttempt(
  competitionId: number,
  opts: { userId?: string | null; phone?: string | null },
): Promise<boolean> {
  let query = supabase
    .from("quiz_results")
    .select("id", { count: "exact", head: true })
    .eq("competition_id", competitionId);
  if (opts.userId) {
    query = query.eq("user_id", opts.userId);
  } else if (opts.phone) {
    query = query.eq("phone", opts.phone);
  } else {
    return false;
  }
  const { count, error } = await query;
  if (error) return false;
  return (count ?? 0) > 0;
}

// Chuẩn hóa câu trả lời tự luận để so khớp: bỏ dấu, thường hóa khoảng trắng.
export function normalizeEssayAnswer(text: string): string {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// So khớp câu trả lời tự luận với danh sách đáp án đúng.
export function isEssayAnswerCorrect(userAnswer: string, correctAnswers: string[]): boolean {
  const ua = normalizeEssayAnswer(userAnswer);
  if (!ua) return false;
  return (correctAnswers || []).some((a) => normalizeEssayAnswer(a) === ua);
}

export async function listQuizResults(): Promise<QuizResult[]> {
  const { data, error } = await supabase
    .from("quiz_results")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as QuizResult[]) ?? [];
}

// Toàn bộ kết quả thi của một người dùng cụ thể (theo mã tài khoản).
// Dùng cho cả màn quản trị (xem lịch sử từng người) lẫn trang cá nhân
// (người dùng tự xem lịch sử thi của mình).
export async function listQuizResultsByUser(userId: string): Promise<QuizResult[]> {
  const { data, error } = await supabase
    .from("quiz_results")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as QuizResult[]) ?? [];
}

export interface SiteStats {
  questions: number;
  competitions: number;
  participants: number;
  units: number;
  visits: number;
  news: number;
}

export async function getSiteStats(): Promise<SiteStats> {
  // Đọc từ view tổng hợp trong Backend: view chạy với quyền của chủ sở hữu nên
  // kể cả khách chưa đăng nhập vẫn đọc được con số tổng của "Lượt tham gia thi",
  // mà không làm lộ dữ liệu chi tiết của từng người thi. View chỉ trả về con số.
  try {
    const { data, error } = await supabase
      .from("site_stats_view")
      .select("questions, competitions, participants, units, visits, news")
      .maybeSingle();
    if (!error && data) {
      return {
        questions: Number(data.questions ?? 0),
        competitions: Number(data.competitions ?? 0),
        participants: Number(data.participants ?? 0),
        units: Number(data.units ?? 0),
        visits: Number(data.visits ?? 0),
        news: Number(data.news ?? 0),
      };
    }
    throw error ?? new Error("Không nạp được thống kê.");
  } catch {
    // Dự phòng nếu view lỗi: đếm trực tiếp các bảng công khai (không gồm lượt thi).
    const [questions, competitions, visits, news] = await Promise.all([
      supabase.from("quiz_questions").select("*", { count: "exact", head: true }),
      supabase.from("competitions").select("*", { count: "exact", head: true }),
      supabase.from("site_visits").select("visits").eq("id", 1).maybeSingle(),
      supabase.from("news_posts").select("*", { count: "exact", head: true }),
    ]);
    return {
      questions: questions.count ?? 0,
      competitions: competitions.count ?? 0,
      participants: 0,
      units: 0,
      visits: (visits.data?.visits as number) ?? 0,
      news: news.count ?? 0,
    };
  }
}

// Đếm lượt truy cập trang chủ: dùng hàm RPC đếm nguyên tử trong Backend.
// Cách này server tự cộng 1 một cách an toàn, không bị mất lượt kể cả khi
// nhiều người truy cập đồng thời (không còn hiện tượng "đọc rồi ghi đè").
export async function incrementSiteVisits(): Promise<void> {
  try {
    await supabase.rpc("increment_site_visits");
  } catch {
    // Nếu không đếm được (ví dụ lỗi mạng), bỏ qua để không ảnh hưởng trang.
  }
}

export async function countAccounts(): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "user");
  if (error) return 0;
  return count ?? 0;
}

export async function listQuizQuestions(competitionId?: number): Promise<QuizQuestion[]> {
  let query = supabase
    .from("quiz_questions")
    .select("*")
    .order("order_index", { ascending: true });
  if (competitionId != null) {
    query = query.eq("competition_id", competitionId);
  }
  const { data, error } = await query;
  if (error) throw error;
  return (data as QuizQuestion[]) ?? [];
}

// Danh sách các bộ đề (question_set) riêng biệt của một cuộc thi, sắp xếp
// theo thứ tự xuất hiện. Dùng để cho thí sinh tự chọn bộ đề trước khi thi.
export async function listQuizQuestionSets(competitionId: number): Promise<string[]> {
  const { data, error } = await supabase
    .from("quiz_questions")
    .select("question_set")
    .eq("competition_id", competitionId);
  if (error) throw error;
  const sets = new Set<string>();
  (data ?? []).forEach((row) => {
    const s = ((row as { question_set?: string | null }).question_set ?? "").trim();
    if (s) sets.add(s);
  });
  return Array.from(sets).sort();
}

export async function createQuizQuestion(question: Omit<QuizQuestion, "id" | "created_at">) {
  const { data, error } = await supabase
    .from("quiz_questions")
    .insert({
      competition_id: question.competition_id ?? null,
      question: question.question,
      options: question.options,
      answer: question.answer,
      explanation: question.explanation,
      order_index: question.order_index,
      type: question.type ?? "mcq",
      grading_mode: question.grading_mode ?? "auto",
      essay_answers: question.essay_answers ?? [],
      graded: question.graded ?? true,
      question_set: question.question_set ?? "",
    })
    .select()
    .single();
  if (error) throw error;
  return data as QuizQuestion;
}

export async function createQuizQuestionsBulk(
  questions: Array<Omit<QuizQuestion, "id" | "created_at">>,
  onProgress?: (done: number, total: number) => void,
) {
  const rows = questions.map((q) => ({
    competition_id: q.competition_id ?? null,
    question: q.question,
    options: q.options,
    answer: q.answer,
    explanation: q.explanation,
    order_index: q.order_index,
    type: q.type ?? "mcq",
    grading_mode: q.grading_mode ?? "auto",
    essay_answers: q.essay_answers ?? [],
    graded: q.graded ?? true,
    question_set: q.question_set ?? "",
  }));

  // Nhập theo từng lô nhỏ để tránh bị nghẽn/timeout khi dán cả trăm câu một lúc.
  const CHUNK_SIZE = 50;
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("quiz_questions").insert(chunk);
    if (error) throw error;
    onProgress?.(Math.min(i + CHUNK_SIZE, rows.length), rows.length);
  }
}

export async function importQuizQuestionsViaServer(params: {
  competitionId: number;
  startIndex: number;
  questions: Array<{ question: string; options: string[]; answer: number; explanation: string; question_set?: string }>;
  onProgress?: (done: number, total: number) => void;
}): Promise<number> {
  // Ghi câu hỏi trực tiếp từ trình duyệt theo từng lô nhỏ. Cách này không phụ
  // thuộc vào hàm chạy phía máy chủ (vốn dễ bị "Failed to fetch"/mất kết nối và
  // làm trang đứng im). Quyền ghi được RLS kiểm tra qua is_admin(), nên chỉ tài
  // khoản quản trị mới ghi được — an toàn và chạy ổn định.
  const CHUNK_SIZE = 50;
  const total = params.questions.length;
  let inserted = 0;

  for (let i = 0; i < total; i += CHUNK_SIZE) {
    const chunk = params.questions.slice(i, i + CHUNK_SIZE).map((q, j) => ({
      competition_id: params.competitionId,
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      order_index: params.startIndex + i + j,
      type: "mcq",
      grading_mode: "auto",
      essay_answers: [],
      graded: true,
      question_set: q.question_set ?? "",
    }));

    const { error } = await supabase.from("quiz_questions").insert(chunk);
    if (error) throw error;
    inserted += chunk.length;
    params.onProgress?.(Math.min(i + CHUNK_SIZE, total), total);
  }

  return inserted;
}

export async function updateQuizQuestion(id: number, question: Partial<Omit<QuizQuestion, "id" | "created_at">>) {
  const { error } = await supabase
    .from("quiz_questions")
    .update(question)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteQuizQuestion(id: number) {
  const { error } = await supabase.from("quiz_questions").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteQuizQuestions(ids: number[]) {
  if (ids.length === 0) return;
  // Xóa theo lô nhỏ để tránh câu lệnh IN quá dài khi có vài trăm câu trùng.
  const CHUNK_SIZE = 100;
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    const chunk = ids.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase.from("quiz_questions").delete().in("id", chunk);
    if (error) throw error;
  }
}

// Gán một bộ đề cho nhiều câu hỏi cùng lúc (dùng cho màn "Quản lý bộ đề").
export async function updateQuizQuestionSet(questionIds: number[], questionSet: string): Promise<void> {
  if (questionIds.length === 0) return;
  const CHUNK_SIZE = 100;
  for (let i = 0; i < questionIds.length; i += CHUNK_SIZE) {
    const chunk = questionIds.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from("quiz_questions")
      .update({ question_set: questionSet })
      .in("id", chunk);
    if (error) throw error;
  }
}

// Đổi tên một bộ đề: cập nhật mọi câu hỏi đang mang tên cũ sang tên mới.
export async function renameQuizQuestionSet(
  competitionId: number,
  oldName: string,
  newName: string,
): Promise<void> {
  const { error } = await supabase
    .from("quiz_questions")
    .update({ question_set: newName })
    .eq("competition_id", competitionId)
    .eq("question_set", oldName);
  if (error) throw error;
}

// Gỡ một bộ đề: xóa nhãn bộ đề khỏi mọi câu hỏi đang mang tên đó (không xóa câu hỏi).
export async function clearQuizQuestionSet(competitionId: number, setName: string): Promise<void> {
  const { error } = await supabase
    .from("quiz_questions")
    .update({ question_set: "" })
    .eq("competition_id", competitionId)
    .eq("question_set", setName);
  if (error) throw error;
}

export async function getQuizSettings(): Promise<QuizSettings | null> {
  const { data, error } = await supabase
    .from("quiz_settings")
    .select("*")
    .maybeSingle();
  if (error) return null;
  return (data as QuizSettings) ?? null;
}

export async function updateQuizSettings(settings: Partial<QuizSettings>) {
  const { data: existing } = await supabase.from("quiz_settings").select("id").maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("quiz_settings")
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("quiz_settings").insert({
      time_limit_minutes: settings.time_limit_minutes ?? 20,
      score_per_question: settings.score_per_question ?? 1,
      passing_score: settings.passing_score ?? 7,
      show_ranking: settings.show_ranking ?? true,
      anti_cheat_enabled: settings.anti_cheat_enabled ?? true,
    });
    if (error) throw error;
  }
}

// ---------------- Bảng xếp hạng (công khai cho người dùng) ----------------

// Một dòng trong bảng xếp hạng, chỉ gồm các trường an toàn để hiển thị công khai
// (không gồm số điện thoại, đáp án, điểm chấm tay hay mã tài khoản).
export interface RankingEntry {
  id: number;
  competition_id: number | null;
  full_name: string | null;
  username: string | null;
  rank: string | null;
  position: string | null;
  unit: string | null;
  score: number;
  total: number;
  correct_count: number;
  duration_seconds: number | null;
  created_at: string;
}

// Đọc trạng thái "cho phép người dùng xem bảng xếp hạng". Mặc định "bật".
export async function getRankingVisibility(): Promise<boolean> {
  const { data, error } = await supabase
    .from("quiz_settings")
    .select("show_ranking")
    .maybeSingle();
  if (error) return true;
  return data?.show_ranking !== false;
}

// Bật/tắt chế độ xem bảng xếp hạng công khai (chỉ admin, do RLS kiểm soát).
export async function setRankingVisibility(enabled: boolean): Promise<void> {
  const { data: existing } = await supabase
    .from("quiz_settings")
    .select("id")
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("quiz_settings")
      .update({ show_ranking: enabled, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("quiz_settings").insert({
      time_limit_minutes: 20,
      score_per_question: 1,
      passing_score: 7,
      show_ranking: enabled,
    });
    if (error) throw error;
  }
}

// Đọc trạng thái chống gian lận (chặn đổi tab, copy, chuột phải... trong phòng thi).
// Mặc định "bật" nếu đọc lỗi hoặc chưa có cài đặt.
export async function getAntiCheatEnabled(): Promise<boolean> {
  const { data, error } = await supabase
    .from("quiz_settings")
    .select("anti_cheat_enabled")
    .maybeSingle();
  if (error) return true;
  return data?.anti_cheat_enabled !== false;
}

// Bật/tắt chế độ chống gian lận (chỉ admin, do RLS kiểm soát).
export async function setAntiCheatEnabled(enabled: boolean): Promise<void> {
  const { data: existing } = await supabase
    .from("quiz_settings")
    .select("id")
    .maybeSingle();
  if (existing) {
    const { error } = await supabase
      .from("quiz_settings")
      .update({ anti_cheat_enabled: enabled, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("quiz_settings").insert({
      time_limit_minutes: 20,
      score_per_question: 1,
      passing_score: 7,
      show_ranking: true,
      anti_cheat_enabled: enabled,
    });
    if (error) throw error;
  }
}

// Toàn bộ dữ liệu bảng xếp hạng (đọc qua view công khai chạy quyền hệ thống,
// nên cả khách chưa đăng nhập cũng xem được mà không lộ dữ liệu riêng tư).
export async function listRankingResults(): Promise<RankingEntry[]> {
  const { data, error } = await supabase.from("ranking_view").select("*");
  if (error) throw error;
  return (data as RankingEntry[]) ?? [];
}

// ---------------- Home hero (Banner trang chủ) ----------------

export interface HomeHero {
  id: number;
  badge: string | null;
  title: string;
  description: string | null;
  image_url: string | null;
  competition_id: number | null;
  type: string;
  news_id: number | null;
  sort_order: number;
  updated_at: string | null;
}

export interface HomeHeroInput {
  badge: string;
  title: string;
  description: string;
  image_url: string;
  competition_id: number | null;
  type?: string;
  news_id?: number | null;
  sort_order?: number;
}

export async function listHomeHeroes(): Promise<HomeHero[]> {
  const { data, error } = await supabase
    .from("home_hero")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as HomeHero[]) ?? [];
}

export async function createHomeHero(input: HomeHeroInput): Promise<HomeHero> {
  const { data, error } = await supabase
    .from("home_hero")
    .insert({
      badge: input.badge,
      title: input.title,
      description: input.description,
      image_url: input.image_url,
      competition_id: input.competition_id,
      type: input.type ?? "manual",
      news_id: input.news_id ?? null,
      sort_order: input.sort_order ?? 0,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw error;
  return data as HomeHero;
}

export async function updateHomeHero(id: number, input: Partial<HomeHeroInput>) {
  const { error } = await supabase
    .from("home_hero")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteHomeHero(id: number) {
  const { error } = await supabase.from("home_hero").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadHomeHeroImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `hero-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("public")
    .upload(`home/${fileName}`, file, { upsert: false });
  if (error) throw error;

  // Readdy Backend public URLs require an apikey header, which <img> cannot
  // attach, so store a long-lived signed URL for direct rendering.
  const { data: signed } = await supabase.storage
    .from("public")
    .createSignedUrl(`home/${fileName}`, 31536000);
  if (!signed?.signedUrl) throw new Error("Không thể tạo đường dẫn ảnh.");
  return signed.signedUrl;
}

// ---------------- Competitions (Cuộc thi) ----------------

export async function listCompetitions(): Promise<Competition[]> {
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as Competition[]) ?? [];
}

export async function listFeaturedCompetitions(limit = 4): Promise<Competition[]> {
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("featured", true)
    .neq("status", "closed")
    .order("id", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return (data as Competition[]) ?? [];
}

export async function getCompetition(id: number): Promise<Competition | null> {
  const { data, error } = await supabase
    .from("competitions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as Competition) ?? null;
}

export async function createCompetition(input: CompetitionInput): Promise<Competition> {
  const { data, error } = await supabase
    .from("competitions")
    .insert({
      title: input.title,
      description: input.description ?? null,
      status: input.status ?? "coming",
      featured: input.featured ?? false,
      image_url: input.image_url ?? null,
      start_date: input.start_date ?? null,
      end_date: input.end_date ?? null,
      time_limit_minutes: input.time_limit_minutes ?? 20,
      score_per_question: input.score_per_question ?? 1,
      passing_score: input.passing_score ?? 7,
      require_login: input.require_login ?? false,
      shuffle_questions: input.shuffle_questions ?? true,
      num_questions: input.num_questions ?? 0,
      allow_retake: input.allow_retake ?? true,
      restricted: input.restricted ?? false,
      allowed_user_ids: input.allowed_user_ids ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Competition;
}

export async function updateCompetition(id: number, input: Partial<CompetitionInput>) {
  const { error } = await supabase
    .from("competitions")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteCompetition(id: number) {
  await supabase.from("quiz_questions").delete().eq("competition_id", id);
  const { error } = await supabase.from("competitions").delete().eq("id", id);
  if (error) throw error;
}

export async function countCompetitionQuestions(id: number): Promise<number> {
  const { count, error } = await supabase
    .from("quiz_questions")
    .select("*", { count: "exact", head: true })
    .eq("competition_id", id);
  if (error) return 0;
  return count ?? 0;
}

// ---------------- News (Bản tin thời sự) ----------------

export interface NewsPost {
  id: number;
  title: string;
  category: string;
  image_url: string | null;
  content: string | null;
  featured: boolean;
  sort_order: number;
  status: string;
  views: number;
  created_at: string;
  updated_at: string;
}

export interface NewsPostInput {
  title: string;
  category: string;
  image_url?: string | null;
  content?: string | null;
  featured?: boolean;
  sort_order?: number;
  status?: string;
  views?: number;
}

export async function listNewsPosts(): Promise<NewsPost[]> {
  const { data, error } = await supabase
    .from("news_posts")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as NewsPost[]) ?? [];
}

export async function listFeaturedNewsPosts(limit = 12): Promise<NewsPost[]> {
  const { data, error } = await supabase
    .from("news_posts")
    .select("*")
    .eq("featured", true)
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as NewsPost[]) ?? [];
}

export async function listFeaturedNews(): Promise<NewsPost[]> {
  const { data, error } = await supabase
    .from("news_posts")
    .select("*")
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);
  if (error) throw error;
  return (data as NewsPost[]) ?? [];
}

export async function listPublishedNews(limit = 50): Promise<NewsPost[]> {
  const { data, error } = await supabase
    .from("news_posts")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as NewsPost[]) ?? [];
}

export async function createNewsPost(input: NewsPostInput) {
  const { data, error } = await supabase
    .from("news_posts")
    .insert({
      title: input.title,
      category: input.category,
      image_url: input.image_url ?? null,
      content: input.content ?? null,
      featured: input.featured ?? false,
      sort_order: input.sort_order ?? 0,
      status: input.status ?? "published",
    })
    .select()
    .single();
  if (error) throw error;
  return data as NewsPost;
}

export async function updateNewsPost(id: number, input: Partial<NewsPostInput>) {
  const { error } = await supabase
    .from("news_posts")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteNewsPost(id: number) {
  const { error } = await supabase.from("news_posts").delete().eq("id", id);
  if (error) throw error;
}

export async function listNewsByCategory(
  category: string,
  limit = 6,
): Promise<NewsPost[]> {
  const { data, error } = await supabase
    .from("news_posts")
    .select("*")
    .eq("category", category)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as NewsPost[]) ?? [];
}

export async function getNewsById(id: number): Promise<NewsPost | null> {
  const { data, error } = await supabase
    .from("news_posts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as NewsPost) ?? null;
}

export async function incrementNewsViews(id: number) {
  const { data, error } = await supabase
    .from("news_posts")
    .select("views")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return;
  const current = typeof data.views === "number" ? data.views : 0;
  await supabase
    .from("news_posts")
    .update({ views: current + 1, updated_at: new Date().toISOString() })
    .eq("id", id);
}

export async function uploadNewsImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `news-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("public")
    .upload(`news/${fileName}`, file, { upsert: false });
  if (error) throw error;

  // Readdy Backend public URLs require an apikey header, which <img> cannot
  // attach, so store a long-lived signed URL for direct rendering.
  const { data: signed } = await supabase.storage
    .from("public")
    .createSignedUrl(`news/${fileName}`, 31536000);
  if (!signed?.signedUrl) throw new Error("Không thể tạo đường dẫn ảnh.");
  return signed.signedUrl;
}

// ---------------- Documents (Thư viện tài liệu) ----------------

export interface DocumentItem {
  id: number;
  title: string;
  description: string | null;
  file_name: string | null;
  file_url: string | null;
  file_size: number | null;
  category: string | null;
  sort_order: number;
  created_at: string;
}

export async function listDocuments(): Promise<DocumentItem[]> {
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as DocumentItem[]) ?? [];
}

export async function createDocument(input: {
  title: string;
  description?: string;
  file_name: string;
  file_url: string;
  file_size: number;
  category?: string | null;
}): Promise<DocumentItem> {
  const { data, error } = await supabase
    .from("documents")
    .insert({
      title: input.title,
      description: input.description ?? null,
      file_name: input.file_name,
      file_url: input.file_url,
      file_size: input.file_size,
      category: input.category ?? null,
      sort_order: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DocumentItem;
}

export async function deleteDocument(id: number) {
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadDocumentFile(
  file: File,
): Promise<{ fileName: string; url: string; size: number }> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "") || "bin";
  const safeName = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("public")
    .upload(`documents/${safeName}`, file, { upsert: false });
  if (error) throw error;

  const { data: signed } = await supabase.storage
    .from("public")
    .createSignedUrl(`documents/${safeName}`, 31536000);
  if (!signed?.signedUrl) throw new Error("Không thể tạo đường dẫn tài liệu.");
  return { fileName: file.name, url: signed.signedUrl, size: file.size };
}

// ---------------- Videos (Thư viện video) ----------------

export interface VideoItem {
  id: number;
  title: string;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  category: string | null;
  sort_order: number;
  created_at: string;
}

export async function listVideos(): Promise<VideoItem[]> {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as VideoItem[]) ?? [];
}

export async function createVideo(input: {
  title: string;
  description?: string;
  video_url: string;
  thumbnail_url?: string | null;
  category?: string | null;
}): Promise<VideoItem> {
  const { data, error } = await supabase
    .from("videos")
    .insert({
      title: input.title,
      description: input.description ?? null,
      video_url: input.video_url,
      thumbnail_url: input.thumbnail_url ?? null,
      category: input.category ?? null,
      sort_order: 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as VideoItem;
}

export async function deleteVideo(id: number) {
  const { error } = await supabase.from("videos").delete().eq("id", id);
  if (error) throw error;
}

export async function uploadVideoFile(
  file: File,
): Promise<{ fileName: string; url: string; size: number }> {
  const ext = (file.name.split(".").pop() || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "") || "mp4";
  const safeName = `video-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage
    .from("public")
    .upload(`videos/${safeName}`, file, { upsert: false });
  if (error) throw error;

  const { data: signed } = await supabase.storage
    .from("public")
    .createSignedUrl(`videos/${safeName}`, 31536000);
  if (!signed?.signedUrl) throw new Error("Không thể tạo đường dẫn video.");
  return { fileName: file.name, url: signed.signedUrl, size: file.size };
}

// ---------------- Feedback (Đóng góp ý kiến) ----------------

export interface FeedbackInput {
  full_name: string;
  email: string;
  subject: string;
  content: string;
}

export async function submitFeedback(input: FeedbackInput): Promise<void> {
  const url = `${supabaseUrl}/functions/v1/feedback`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify(input),
  });
  const data = await res.json().catch(() => ({ error: "Lỗi phản hồi từ máy chủ" }));
  if (!res.ok) throw new Error(data?.error || "Gửi ý kiến thất bại, vui lòng thử lại.");
  if (data?.error) throw new Error(data.error);
}

export interface FeedbackItem {
  id: number;
  full_name: string | null;
  email: string | null;
  subject: string | null;
  content: string | null;
  created_at: string;
}

export async function listFeedback(): Promise<FeedbackItem[]> {
  const { data, error } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as FeedbackItem[]) ?? [];
}

export async function deleteFeedback(id: number) {
  const { error } = await supabase.from("feedback").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- Chat (Phòng chat / Messenger) ----------------

export interface ChatRoom {
  id: number;
  name: string | null;
  type: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: number;
  room_id: number;
  sender_id: string;
  content: string;
  edited: boolean;
  created_at: string;
  updated_at: string;
}

export interface ChatMember {
  id: number;
  room_id: number;
  user_id: string;
  created_at: string;
}

// Danh sách người dùng để chọn khi tạo phòng chat (cả người dùng lẫn quản trị).
// Nhờ quyền RLS, tài khoản đã đăng nhập đều xem được danh sách này.
export async function listChatUsers(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, rank, position, unit, avatar_url, role")
    .order("full_name", { ascending: true });
  if (error) throw error;
  return (data as Profile[]) ?? [];
}

// ---------------- Người đang hoạt động (Online) ----------------

// Ghi lại mốc thời gian hoạt động mới nhất của người đang đăng nhập.
// Đi qua hàm an toàn ở Backend nên người dùng thường cũng cập nhật được
// (bảng hồ sơ chỉ cho quản trị viên sửa trực tiếp).
export async function touchLastSeen(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  await supabase.rpc("touch_last_seen");
}

export interface OnlineUser {
  id: string;
  username: string | null;
  full_name: string | null;
  rank: string | null;
  position: string | null;
  unit: string | null;
  avatar_url: string | null;
  role: string;
  last_seen: string | null;
}

// Danh sách tài khoản đang hoạt động trong vòng `minutes` phút gần đây,
// sắp xếp theo lúc vừa hoạt động gần nhất lên đầu.
export async function listOnlineUsers(minutes = 5): Promise<OnlineUser[]> {
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, full_name, rank, position, unit, avatar_url, role, last_seen")
    .gt("last_seen", since)
    .order("last_seen", { ascending: false });
  if (error) throw error;
  return (data as OnlineUser[]) ?? [];
}

// Danh sách phòng chat của người dùng hiện tại (admin thì thấy tất cả phòng).
// RLS tự lọc: chỉ trả về phòng mà người dùng là thành viên.
export async function listMyChatRooms(): Promise<ChatRoom[]> {
  const { data, error } = await supabase
    .from("chat_rooms")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data as ChatRoom[]) ?? [];
}

// Tạo phòng chat mới và thêm người tạo + các thành viên được chọn vào phòng.
// Chỉ quản trị viên (admin) mới được tạo phòng; người dùng thường bị từ chối.
export async function createChatRoom(name: string, memberIds: string[]): Promise<ChatRoom> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Chưa đăng nhập");

  const profile = await getProfile(user.id);
  if (profile?.role !== "admin") {
    throw new Error("Chỉ quản trị viên mới được tạo phòng chat.");
  }

  const { data, error } = await supabase
    .from("chat_rooms")
    .insert({ name, type: "group", created_by: user.id })
    .select()
    .single();
  if (error) throw error;
  const room = data as ChatRoom;

  const ids = Array.from(new Set([user.id, ...memberIds].filter(Boolean))) as string[];
  if (ids.length > 0) {
    const { error: mErr } = await supabase
      .from("chat_room_members")
      .insert(ids.map((uid) => ({ room_id: room.id, user_id: uid })));
    if (mErr) throw mErr;
  }
  return room;
}

// Lấy hồ sơ của các thành viên trong một phòng (để hiển thị tên/ảnh người gửi).
export async function listChatRoomMembers(roomId: number): Promise<Profile[]> {
  const { data: members, error } = await supabase
    .from("chat_room_members")
    .select("user_id")
    .eq("room_id", roomId);
  if (error) throw error;
  const ids = (members ?? []).map((m) => m.user_id).filter(Boolean) as string[];
  if (ids.length === 0) return [];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, rank, position, unit, avatar_url, role")
    .in("id", ids);
  return (profiles as Profile[]) ?? [];
}

// Lấy toàn bộ tin nhắn của một phòng, sắp xếp từ cũ đến mới.
export async function listChatMessages(roomId: number): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ChatMessage[]) ?? [];
}

// Gửi một tin nhắn vào phòng.
export async function sendChatMessage(roomId: number, content: string): Promise<ChatMessage> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Chưa đăng nhập");
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ room_id: roomId, sender_id: user.id, content })
    .select()
    .single();
  if (error) throw error;
  return data as ChatMessage;
}

// Đánh dấu phòng chat đã đọc: ghi lại mốc thời gian hiện tại cho thành viên
// đang đăng nhập, để sau này tính được tin nhắn nào là "chưa đọc".
export async function markChatRoomRead(roomId: number): Promise<void> {
  await supabase.rpc("mark_chat_room_read", { p_room_id: roomId });
}

// Đếm tổng số tin nhắn chưa đọc của người dùng hiện tại trên mọi phòng chat.
// Dùng để hiện dấu đỏ nhỏ bên góc ảnh đại diện khi có tin nhắn mới.
export async function getUnreadChatCount(): Promise<number> {
  const { data, error } = await supabase.rpc("get_unread_chat_count");
  if (error) return 0;
  return Number(data ?? 0);
}

// Sửa nội dung tin nhắn. Người gửi sửa được tin của chính mình, quản trị viên
// sửa được mọi tin nhắn (quyền do RLS kiểm soát).
export async function updateChatMessage(id: number, content: string) {
  const { error } = await supabase
    .from("chat_messages")
    .update({ content, edited: true, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// Xóa tin nhắn. Người gửi xóa được tin của chính mình, quản trị viên xóa được
// mọi tin nhắn (quyền do RLS kiểm soát).
export async function deleteChatMessage(id: number) {
  const { error } = await supabase.from("chat_messages").delete().eq("id", id);
  if (error) throw error;
}

// Xóa toàn bộ phòng chat (chỉ admin). Các tin nhắn và thành viên tự xóa theo.
export async function deleteChatRoom(id: number) {
  const { error } = await supabase.from("chat_rooms").delete().eq("id", id);
  if (error) throw error;
}

// ---------------- Chat riêng (1-1) & cài đặt ----------------

// Phòng chat kèm hồ sơ "người kia" (chỉ áp dụng cho phòng chat riêng).
export interface ChatRoomWithPeer extends ChatRoom {
  peer?: Profile;
}

// Đọc trạng thái bật/tắt tính năng chat riêng. Mặc định "bật" nếu đọc lỗi.
export async function getDirectChatEnabled(): Promise<boolean> {
  const { data, error } = await supabase
    .from("chat_settings")
    .select("direct_chat_enabled")
    .eq("id", 1)
    .maybeSingle();
  if (error) return true;
  return data?.direct_chat_enabled !== false;
}

// Bật/tắt tính năng chat riêng (chỉ admin, do RLS kiểm soát).
export async function setDirectChatEnabled(enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from("chat_settings")
    .update({ direct_chat_enabled: enabled, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

// Đọc trạng thái "cho phép người dùng thường nhắn riêng với quản trị viên".
// Mặc định "cho phép" nếu đọc lỗi.
export async function getDirectChatAdminEnabled(): Promise<boolean> {
  const { data, error } = await supabase
    .from("chat_settings")
    .select("users_can_message_admins")
    .eq("id", 1)
    .maybeSingle();
  if (error) return true;
  return data?.users_can_message_admins !== false;
}

// Bật/tắt "cho phép người dùng thường nhắn riêng với quản trị viên" (chỉ admin).
export async function setDirectChatAdminEnabled(enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from("chat_settings")
    .update({ users_can_message_admins: enabled, updated_at: new Date().toISOString() })
    .eq("id", 1);
  if (error) throw error;
}

// Tìm phòng chat riêng hiện có giữa hai người, nếu chưa có thì tạo mới.
// Thao tác chạy ở Backend (bỏ qua giới hạn "chỉ admin tạo phòng") nên mọi
// tài khoản đều có thể bắt đầu chat riêng với nhau.
export async function getOrCreateDirectRoom(otherUserId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_or_create_direct_room", {
    p_other_user_id: otherUserId,
  });
  if (error) throw new Error(error.message || "Không thể mở chat riêng.");
  return data as number;
}

// Danh sách phòng chat của tôi, kèm hồ sơ "người kia" cho các phòng chat riêng.
export async function listMyChatRoomsWithPeers(): Promise<ChatRoomWithPeer[]> {
  const user = await getCurrentUser();
  const rooms = await listMyChatRooms();
  if (!user || rooms.length === 0) return rooms;

  const directIds = rooms.filter((r) => r.type === "direct").map((r) => r.id);
  if (directIds.length === 0) return rooms;

  const { data: memberships } = await supabase
    .from("chat_room_members")
    .select("room_id, user_id")
    .in("room_id", directIds);

  const myId = user.id;
  const peers = (memberships ?? []).filter((m) => m.user_id !== myId);
  const peerIds = peers.map((m) => m.user_id);
  if (peerIds.length === 0) return rooms;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, full_name, rank, position, unit, avatar_url, role")
    .in("id", peerIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const peerByRoom = new Map<number, Profile>();
  for (const m of peers) {
    const p = profileMap.get(m.user_id);
    if (p) peerByRoom.set(m.room_id, p);
  }

  return rooms.map((r) =>
    r.type === "direct" ? { ...r, peer: peerByRoom.get(r.id) } : r,
  );
}

// Danh sách phòng cho trang quản trị: kèm tên các thành viên trong phòng chat
// riêng, giúp admin thấy ngay "ai đang nhắn với ai".
export interface AdminChatRoom extends ChatRoom {
  memberNames?: string[];
}

export async function listAdminChatRooms(): Promise<AdminChatRoom[]> {
  const rooms = await listMyChatRooms();
  if (rooms.length === 0) return rooms;

  const directIds = rooms.filter((r) => r.type === "direct").map((r) => r.id);
  if (directIds.length === 0) return rooms;

  const { data: memberships } = await supabase
    .from("chat_room_members")
    .select("room_id, user_id")
    .in("room_id", directIds);

  const allIds = (memberships ?? []).map((m) => m.user_id);
  if (allIds.length === 0) return rooms;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username")
    .in("id", allIds);

  const nameMap = new Map(
    (profiles ?? []).map((p) => [p.id, p.full_name || p.username || "Người dùng"]),
  );
  const namesByRoom = new Map<number, string[]>();
  for (const m of memberships ?? []) {
    const name = nameMap.get(m.user_id);
    if (!name) continue;
    const arr = namesByRoom.get(m.room_id) ?? [];
    arr.push(name);
    namesByRoom.set(m.room_id, arr);
  }

  return rooms.map((r) =>
    r.type === "direct" ? { ...r, memberNames: namesByRoom.get(r.id) ?? [] } : r,
  );
}

// ---------------- Announcements (Thông báo chạy chữ trang chủ) ----------------

export interface Announcement {
  id: number;
  content: string;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// Toàn bộ thông báo (dùng cho trang quản trị: xem cả thông báo đang tắt).
export async function listAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as Announcement[]) ?? [];
}

// Chỉ những thông báo đang bật (dùng cho dải chạy chữ ở trang chủ).
export async function listActiveAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (error) throw error;
  return (data as Announcement[]) ?? [];
}

export async function createAnnouncement(input: {
  content: string;
  active?: boolean;
  sort_order?: number;
}): Promise<Announcement> {
  const { data, error } = await supabase
    .from("announcements")
    .insert({
      content: input.content,
      active: input.active ?? true,
      sort_order: input.sort_order ?? 0,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Announcement;
}

export async function updateAnnouncement(
  id: number,
  input: Partial<{ content: string; active: boolean; sort_order: number }>,
) {
  const { error } = await supabase
    .from("announcements")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAnnouncement(id: number) {
  const { error } = await supabase.from("announcements").delete().eq("id", id);
  if (error) throw error;
}