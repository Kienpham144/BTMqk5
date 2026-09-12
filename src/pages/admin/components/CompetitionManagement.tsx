import { useState, useEffect } from "react";
import {
  Trophy,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Flame,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Star,
  Users,
} from "lucide-react";
import {
  listCompetitions,
  createCompetition,
  updateCompetition,
  deleteCompetition,
  listProfiles,
  type Competition,
  type CompetitionStatus,
  type Profile,
} from "@/lib/supabase";
import CompetitionQuestions from "./CompetitionQuestions";

const STATUS_LABEL: Record<string, string> = {
  open: "Đang Mở",
  coming: "Sắp Diễn Ra",
  closed: "Đã Kết Thúc",
};

const STATUS_STYLE: Record<string, string> = {
  open: "bg-military-green text-white",
  coming: "bg-military-gold text-military-red-dark",
  closed: "bg-military-cream-dark text-foreground-700",
};

interface FormState {
  title: string;
  description: string;
  status: CompetitionStatus;
  featured: boolean;
  start_date: string;
  end_date: string;
  time_limit_minutes: number;
  score_per_question: number;
  require_login: boolean;
  shuffle_questions: boolean;
  num_questions: number;
  allow_retake: boolean;
  restricted: boolean;
  allowed_user_ids: string[];
}

const EMPTY_FORM: FormState = {
  title: "",
  description: "",
  status: "coming",
  featured: false,
  start_date: "",
  end_date: "",
  time_limit_minutes: 20,
  score_per_question: 1,
  require_login: false,
  shuffle_questions: true,
  num_questions: 0,
  allow_retake: true,
  restricted: false,
  allowed_user_ids: [],
};

export default function CompetitionManagement() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [accountSearch, setAccountSearch] = useState("");

  const load = () => {
    setLoading(true);
    setError("");
    listCompetitions()
      .then((data) => {
        setCompetitions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Lỗi tải danh sách cuộc thi.");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    listProfiles()
      .then(setProfiles)
      .catch(() => {});
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (c: Competition) => {
    setEditing(c);
    setForm({
      title: c.title,
      description: c.description || "",
      status: c.status,
      featured: c.featured,
      start_date: c.start_date || "",
      end_date: c.end_date || "",
      time_limit_minutes: c.time_limit_minutes,
      score_per_question: c.score_per_question,
      require_login: c.require_login,
      shuffle_questions: c.shuffle_questions,
      num_questions: c.num_questions,
      allow_retake: c.allow_retake,
      restricted: c.restricted,
      allowed_user_ids: c.allowed_user_ids ?? [],
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!form.title.trim()) {
      setError("Vui lòng nhập tiêu đề cuộc thi.");
      return;
    }
    if (!form.num_questions || form.num_questions < 1) {
      setError("Vui lòng nhập số câu trắc nghiệm (lớn hơn 0).");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateCompetition(editing.id, {
          title: form.title,
          description: form.description,
          status: form.status,
          featured: form.featured,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          time_limit_minutes: form.time_limit_minutes,
          score_per_question: form.score_per_question,
          require_login: form.require_login,
          shuffle_questions: form.shuffle_questions,
          num_questions: form.num_questions,
          allow_retake: form.allow_retake,
          restricted: form.restricted,
          allowed_user_ids: form.restricted ? form.allowed_user_ids : null,
        });
        setSuccess("Đã cập nhật cuộc thi!");
      } else {
        await createCompetition({
          title: form.title,
          description: form.description,
          status: form.status,
          featured: form.featured,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          time_limit_minutes: form.time_limit_minutes,
          score_per_question: form.score_per_question,
          require_login: form.require_login,
          shuffle_questions: form.shuffle_questions,
          num_questions: form.num_questions,
          allow_retake: form.allow_retake,
          restricted: form.restricted,
          allowed_user_ids: form.restricted ? form.allowed_user_ids : null,
        });
        setSuccess("Đã thêm cuộc thi mới!");
      }
      setShowForm(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu cuộc thi.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c: Competition) => {
    if (!confirm(`Bạn có chắc muốn xóa cuộc thi "${c.title}"? Toàn bộ câu hỏi thuộc cuộc thi cũng sẽ bị xóa.`)) return;
    try {
      await deleteCompetition(c.id);
      if (expandedId === c.id) setExpandedId(null);
      setSuccess("Đã xóa cuộc thi!");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa cuộc thi.");
    }
  };

  const toggleFeatured = async (c: Competition) => {
    try {
      await updateCompetition(c.id, { featured: !c.featured });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi cập nhật nổi bật.");
    }
  };

  const toggleAllowed = (id: string) => {
    setForm((prev) => {
      const set = new Set(prev.allowed_user_ids);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...prev, allowed_user_ids: Array.from(set) };
    });
  };

  const filteredProfiles = accountSearch.trim()
    ? profiles.filter(
        (p) =>
          (p.username ?? "").toLowerCase().includes(accountSearch.toLowerCase()) ||
          (p.full_name ?? "").toLowerCase().includes(accountSearch.toLowerCase()) ||
          (p.unit ?? "").toLowerCase().includes(accountSearch.toLowerCase()),
      )
    : profiles;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-military-cream-dark p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-military-red-dark">Quản lý cuộc thi</h2>
              <p className="text-xs text-foreground-600">
                {competitions.length} cuộc thi · Đánh dấu nổi bật để hiển thị ở trang chủ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Thêm cuộc thi
            </button>
            <button
              onClick={load}
              className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-military-cream-dark hover:border-military-red text-military-red-dark transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 mb-4 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 bg-military-green/10 border border-military-green/30 text-military-green rounded-lg p-3 mb-4 text-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            <span>{success}</span>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
          </div>
        ) : competitions.length === 0 ? (
          <div className="text-center py-16 text-foreground-600">
            <Trophy className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
            <p className="text-sm">Chưa có cuộc thi nào. Nhấn "Thêm cuộc thi" để tạo mới.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {competitions.map((c) => (
              <div key={c.id} className="bg-military-cream/30 rounded-xl border border-military-cream-dark overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleFeatured(c)}
                      className={`shrink-0 mt-0.5 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                        c.featured
                          ? "featured-glow featured-shimmer text-[#5b3a00] border border-[#e0a51d]"
                          : "bg-military-cream text-foreground-600 border border-military-cream-dark hover:bg-military-gold/30 hover:text-military-red-dark hover:border-military-gold-dark"
                      }`}
                      title={c.featured ? "Bỏ nổi bật" : "Đánh dấu nổi bật"}
                    >
                      <Star className={`w-4 h-4 ${c.featured ? "fill-current star-twinkle" : ""}`} />
                      {c.featured ? "Nổi bật" : "Đánh dấu"}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-semibold text-military-red-dark text-sm">{c.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_STYLE[c.status] || "bg-gray-200 text-gray-700"}`}>
                          {STATUS_LABEL[c.status] || c.status}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          c.require_login
                            ? "bg-military-gold/20 text-military-red-dark border border-military-gold"
                            : "bg-military-green/10 text-military-green border border-military-green/30"
                        }`}>
                          {c.require_login ? "Cần đăng nhập" : "Không cần đăng nhập"}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-600">
                        {c.start_date && <span>{c.start_date}{c.end_date ? ` - ${c.end_date}` : ""}</span>}
                        <span>{c.time_limit_minutes} phút</span>
                        <span className="text-military-red-dark font-semibold">
                          {c.num_questions > 0 ? `${c.num_questions} câu trắc nghiệm` : "Tất cả trắc nghiệm"}
                        </span>
                        <span>{c.score_per_question}đ/câu</span>
                        <span className={c.shuffle_questions ? "text-military-green font-semibold" : "text-foreground-500"}>
                          {c.shuffle_questions ? "Xáo trộn câu hỏi" : "Không xáo trộn"}
                        </span>
                        <span className={c.allow_retake ? "text-military-green font-semibold" : "text-military-red-dark font-semibold"}>
                          {c.allow_retake ? "Thi lại thoải mái" : "Chỉ thi 1 lần"}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
                        className="inline-flex items-center gap-1 px-3 py-2 text-military-red-dark font-semibold text-xs rounded-lg border border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <HelpCircle className="w-4 h-4" />
                        Câu hỏi
                        {expandedId === c.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => openEdit(c)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                        title="Sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                {expandedId === c.id && (
                  <div className="px-4 pb-4">
                    <CompetitionQuestions competitionId={c.id} title={c.title} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-military-cream-dark w-full max-w-2xl my-8">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-military-cream-dark px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
                  <Trophy className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-military-red-dark">
                  {editing ? "Sửa cuộc thi" : "Thêm cuộc thi mới"}
                </h3>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="w-9 h-9 flex items-center justify-center rounded-full text-foreground-500 hover:bg-foreground-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Tiêu đề cuộc thi</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Tìm hiểu 80 năm thành lập Bộ Tham mưu Quân khu 5"
                  className="w-full px-4 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Mô tả</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Mô tả ngắn về cuộc thi..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-white text-sm resize-none"
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Trạng thái</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as CompetitionStatus })}
                    className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
                  >
                    <option value="open">Đang Mở</option>
                    <option value="coming">Sắp Diễn Ra</option>
                    <option value="closed">Đã Kết Thúc</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm font-semibold text-military-red-dark cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.featured}
                      onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                      className="w-4 h-4 accent-military-red"
                    />
                    <span className="inline-flex items-center gap-1">
                      <Flame className="w-4 h-4 text-military-red" />
                      Cuộc thi nổi bật (hiển thị trang chủ)
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-3 bg-military-cream/40 rounded-xl border border-military-cream-dark p-4">
                <div>
                  <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Chế độ dự thi</label>
                  <div className="inline-flex items-center rounded-full border border-military-cream-dark p-1 bg-white">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, require_login: false })}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        !form.require_login ? "bg-military-green text-white" : "text-foreground-600 hover:text-military-red-dark"
                      }`}
                    >
                      Không cần đăng nhập
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, require_login: true })}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        form.require_login ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red-dark"
                      }`}
                    >
                      Cần đăng nhập (cán bộ)
                    </button>
                  </div>
                  <p className="text-xs text-foreground-600 mt-1.5">
                    {form.require_login
                      ? "Chỉ cán bộ có tài khoản mới được vào thi."
                      : "Mọi người chỉ cần điền họ tên, SĐT, đơn vị là vào thi được."}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.shuffle_questions}
                    onChange={(e) => setForm({ ...form, shuffle_questions: e.target.checked })}
                    className="w-4 h-4 accent-military-green"
                  />
                  <span className="text-sm font-semibold text-foreground-700">
                    Xáo trộn thứ tự câu hỏi cho từng người thi (câu tự luận giữ nguyên)
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Số lần dự thi</label>
                  <div className="inline-flex items-center rounded-full border border-military-cream-dark p-1 bg-white">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, allow_retake: true })}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        form.allow_retake ? "bg-military-green text-white" : "text-foreground-600 hover:text-military-red-dark"
                      }`}
                    >
                      Thi lại thoải mái
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, allow_retake: false })}
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                        !form.allow_retake ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red-dark"
                      }`}
                    >
                      Chỉ thi 1 lần
                    </button>
                  </div>
                  <p className="text-xs text-foreground-600 mt-1.5">
                    {form.allow_retake
                      ? "Thí sinh được làm lại bài nhiều lần tùy ý."
                      : "Mỗi thí sinh chỉ được thi duy nhất 1 lần để lấy kết quả."}
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-military-cream/40 rounded-xl border border-military-cream-dark p-4">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.restricted}
                    onChange={(e) => setForm({ ...form, restricted: e.target.checked })}
                    className="w-4 h-4 accent-military-red"
                  />
                  <span className="text-sm font-semibold text-foreground-700 inline-flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-military-red" />
                    Giới hạn người được thi
                  </span>
                </div>
                <p className="text-xs text-foreground-600">
                  {form.restricted
                    ? "Chỉ những tài khoản được chọn bên dưới mới được vào thi (cuộc thi sẽ yêu cầu đăng nhập)."
                    : "Mọi tài khoản đăng nhập đều có thể tham gia."}
                </p>

                {form.restricted && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={accountSearch}
                      onChange={(e) => setAccountSearch(e.target.value)}
                      placeholder="Tìm theo tên đăng nhập, họ tên hoặc đơn vị..."
                      className="w-full px-4 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
                    />

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-foreground-600">
                        Đã chọn {form.allowed_user_ids.length} tài khoản
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setForm({
                              ...form,
                              allowed_user_ids: filteredProfiles.map((p) => p.id),
                            })
                          }
                          className="px-3 py-1.5 text-xs font-bold text-military-red-dark rounded-lg border border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Chọn tất cả
                        </button>
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, allowed_user_ids: [] })}
                          className="px-3 py-1.5 text-xs font-bold text-foreground-600 rounded-lg border border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
                        >
                          Bỏ chọn
                        </button>
                      </div>
                    </div>

                    <div className="max-h-56 overflow-y-auto rounded-lg border border-military-cream-dark bg-white divide-y divide-military-cream/60">
                      {profiles.length === 0 ? (
                        <div className="p-4 text-center text-xs text-foreground-500">
                          Đang tải danh sách tài khoản...
                        </div>
                      ) : filteredProfiles.length === 0 ? (
                        <div className="p-4 text-center text-xs text-foreground-500">
                          Không tìm thấy tài khoản nào phù hợp.
                        </div>
                      ) : (
                        filteredProfiles.map((p) => {
                          const checked = form.allowed_user_ids.includes(p.id);
                          return (
                            <label
                              key={p.id}
                              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-military-cream/40 transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleAllowed(p.id)}
                                className="w-4 h-4 accent-military-red shrink-0"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="text-sm font-bold text-military-red-dark truncate">
                                  {p.full_name || p.username || "Chưa có tên"}
                                </div>
                                <div className="text-xs text-foreground-500 truncate">
                                  @{p.username || "—"} · {p.unit || "Chưa có đơn vị"}
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Ngày bắt đầu</label>
                  <input
                    type="text"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    placeholder="VD: 01/10/2026"
                    className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Ngày kết thúc</label>
                  <input
                    type="text"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    placeholder="VD: 30/10/2026"
                    className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Thời gian (phút)</label>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={form.time_limit_minutes}
                    onChange={(e) => setForm({ ...form, time_limit_minutes: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Điểm / câu</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={0.1}
                    value={form.score_per_question}
                    onChange={(e) => setForm({ ...form, score_per_question: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
                  />
                  <p className="text-xs text-foreground-600 mt-1">Có thể nhập số thập phân, ví dụ 0.5</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Số câu trắc nghiệm (bốc ngẫu nhiên)</label>
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    value={form.num_questions}
                    onChange={(e) => setForm({ ...form, num_questions: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
                  />
                  <p className="text-xs text-foreground-600 mt-1">Số câu trắc nghiệm bốc ngẫu nhiên. Câu tự luận luôn xuất hiện và nằm ở cuối bài.</p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-military-cream-dark flex items-center gap-2 justify-end">
              <button
                onClick={() => setShowForm(false)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-foreground-700 font-bold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-60 whitespace-nowrap cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {saving ? "Đang lưu..." : "Lưu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}