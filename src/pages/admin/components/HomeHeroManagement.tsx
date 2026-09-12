import { useState, useEffect, useMemo } from "react";
import {
  Image as ImageIcon,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Upload,
  Trash2,
  LayoutTemplate,
  Plus,
  Pencil,
  X,
  ArrowUp,
  ArrowDown,
  PenLine,
  Trophy,
  Newspaper,
} from "lucide-react";
import {
  listHomeHeroes,
  createHomeHero,
  updateHomeHero,
  deleteHomeHero,
  uploadHomeHeroImage,
  listCompetitions,
  listNewsPosts,
  type HomeHero,
  type Competition,
  type NewsPost,
} from "@/lib/supabase";

type BannerType = "manual" | "competition" | "news";

interface BannerForm {
  id: number | null;
  type: BannerType;
  badge: string;
  title: string;
  description: string;
  image_url: string;
  competition_id: string;
  news_id: string;
  sort_order: number;
}

const emptyForm: BannerForm = {
  id: null,
  type: "manual",
  badge: "",
  title: "",
  description: "",
  image_url: "",
  competition_id: "",
  news_id: "",
  sort_order: 0,
};

const BANNER_TYPES: Array<{ key: BannerType; label: string; icon: typeof PenLine }> = [
  { key: "manual", label: "Tự soạn", icon: PenLine },
  { key: "competition", label: "Cuộc thi", icon: Trophy },
  { key: "news", label: "Tin / Bản tin", icon: Newspaper },
];

const TYPE_LABELS: Record<BannerType, string> = {
  manual: "Tự soạn",
  competition: "Cuộc thi",
  news: "Tin / Bản tin",
};

function typeLabel(value: string | null | undefined): string {
  if (value === "competition" || value === "news" || value === "manual") {
    return TYPE_LABELS[value];
  }
  return TYPE_LABELS.manual;
}

export default function HomeHeroManagement() {
  const [heroes, setHeroes] = useState<HomeHero[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [newsCategory, setNewsCategory] = useState("");
  const [editing, setEditing] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([listHomeHeroes(), listCompetitions(), listNewsPosts()])
      .then(([hs, comps, posts]) => {
        setHeroes(hs);
        setCompetitions(comps);
        setNews(posts);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Lỗi tải danh sách banner.");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  // Danh sách chủ đề (chuyên mục) của bản tin — dùng để lọc tin khi chọn banner.
  const newsCategories = useMemo(
    () => Array.from(new Set(news.map((n) => n.category).filter(Boolean))) as string[],
    [news],
  );

  const newsByCategory = useMemo(() => {
    if (!newsCategory) return news;
    return news.filter((n) => n.category === newsCategory);
  }, [news, newsCategory]);

  const resetForm = () => {
    setForm(emptyForm);
    setNewsCategory("");
    setEditing(false);
  };

  const startEdit = (h: HomeHero) => {
    const type: BannerType =
      h.type === "competition" || h.type === "news" ? h.type : "manual";
    const relatedNews = h.news_id != null ? news.find((n) => n.id === h.news_id) : undefined;
    setForm({
      id: h.id,
      type,
      badge: h.badge || "",
      title: h.title || "",
      description: h.description || "",
      image_url: h.image_url || "",
      competition_id: h.competition_id != null ? String(h.competition_id) : "",
      news_id: h.news_id != null ? String(h.news_id) : "",
      sort_order: h.sort_order ?? 0,
    });
    setNewsCategory(relatedNews?.category || "");
    setEditing(true);
    setSuccess("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Chọn cuộc thi làm nguồn banner → tự điền nội dung (vẫn sửa lại được sau đó).
  const applyCompetition = (comp: Competition | undefined) => {
    if (!comp) return;
    setForm((prev) => ({
      ...prev,
      competition_id: String(comp.id),
      title: comp.title,
      description: comp.description || prev.description,
      image_url: comp.image_url || prev.image_url,
      badge: prev.badge.trim() ? prev.badge : "Cuộc thi",
    }));
  };

  // Chọn bản tin làm nguồn banner → tự điền nội dung (vẫn sửa lại được sau đó).
  const applyNews = (post: NewsPost | undefined) => {
    if (!post) return;
    setForm((prev) => ({
      ...prev,
      news_id: String(post.id),
      title: post.title,
      description: post.content || prev.description,
      image_url: post.image_url || prev.image_url,
      badge: post.category || prev.badge,
    }));
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!form.title.trim()) {
      setError("Vui lòng nhập tiêu đề banner.");
      return;
    }
    if (form.type === "competition" && !form.competition_id) {
      setError("Vui lòng chọn cuộc thi cho banner.");
      return;
    }
    if (form.type === "news" && !form.news_id) {
      setError("Vui lòng chọn bản tin cho banner.");
      return;
    }
    setSaving(true);
    try {
      const isCompetition = form.type === "competition";
      const isNews = form.type === "news";
      const payload = {
        badge: form.badge.trim(),
        title: form.title.trim(),
        description: form.description.trim(),
        image_url: form.image_url.trim(),
        type: form.type,
        competition_id:
          isNews || !form.competition_id ? null : parseInt(form.competition_id, 10),
        news_id: isNews && form.news_id ? parseInt(form.news_id, 10) : null,
        sort_order: form.sort_order,
      };
      if (form.id != null) {
        await updateHomeHero(form.id, payload);
        setSuccess("Đã cập nhật banner!");
      } else {
        await createHomeHero(payload);
        setSuccess("Đã thêm banner mới!");
      }
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu banner.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (h: HomeHero) => {
    if (!window.confirm(`Xóa banner "${h.title}"? Hành động này không thể hoàn tác.`)) return;
    setError("");
    setSuccess("");
    try {
      await deleteHomeHero(h.id);
      setSuccess("Đã xóa banner.");
      if (form.id === h.id) resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa banner.");
    }
  };

  const handleMove = async (h: HomeHero, dir: -1 | 1) => {
    setError("");
    setSuccess("");
    try {
      await updateHomeHero(h.id, { sort_order: (h.sort_order ?? 0) + dir });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi sắp xếp banner.");
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const url = await uploadHomeHeroImage(file);
      setForm((prev) => ({ ...prev, image_url: url }));
      setSuccess("Đã tải ảnh lên. Nhấn Lưu để áp dụng.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải ảnh lên.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-military-cream-dark p-6 flex items-center justify-center py-16">
        <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 bg-military-green/10 border border-military-green/30 text-military-green rounded-lg p-3 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Danh sách banner hiện có */}
      <div className="bg-white rounded-2xl border border-military-cream-dark p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-military-red-dark">Danh sách banner trang chủ</h2>
              <p className="text-xs text-foreground-600">
                Các banner sẽ hiển thị luân phiên (slideshow) ở đầu trang chủ
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetForm();
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm banner
          </button>
        </div>

        {heroes.length === 0 ? (
          <div className="text-center text-foreground-600 py-12">
            <LayoutTemplate className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
            <p className="text-sm">Chưa có banner nào. Nhấn "Thêm banner" để tạo banner đầu tiên.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {heroes.map((h) => (
              <div
                key={h.id}
                className="flex items-center gap-4 p-3 rounded-xl border border-military-cream-dark hover:border-military-gold transition-colors bg-military-cream/30"
              >
                <div className="w-28 h-16 rounded-lg overflow-hidden bg-military-cream shrink-0">
                  {h.image_url ? (
                    <img
                      src={h.image_url}
                      alt={h.title}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-military-cream-dark">
                      <ImageIcon className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-military-red/10 text-military-red text-[11px] font-bold whitespace-nowrap">
                      {typeLabel(h.type)}
                    </span>
                    <p className="font-bold text-military-red-dark truncate">{h.title}</p>
                  </div>
                  <p className="text-xs text-foreground-600 truncate">
                    {h.badge ? `${h.badge} · ` : ""}Vị trí {h.sort_order}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => handleMove(h, -1)}
                    title="Lên trước"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-600 hover:text-military-red hover:bg-military-red/10 transition-colors cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(h, 1)}
                    title="Xuống sau"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-600 hover:text-military-red hover:bg-military-red/10 transition-colors cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startEdit(h)}
                    title="Sửa"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-600 hover:text-military-red hover:bg-military-red/10 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(h)}
                    title="Xóa"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-600 hover:text-military-red hover:bg-military-red/10 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form thêm/sửa banner */}
      <div className="bg-white rounded-2xl border border-military-cream-dark p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="font-bold text-military-red-dark">
            {editing ? "Sửa banner" : "Thêm banner mới"}
          </h2>
          {editing && (
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-sm font-semibold text-foreground-600 hover:text-military-red transition-colors whitespace-nowrap cursor-pointer"
            >
              <X className="w-4 h-4" />
              Hủy sửa
            </button>
          )}
        </div>

        {/* Chọn loại banner */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-military-red-dark mb-2">
            Loại banner
          </label>
          <div className="inline-flex items-center gap-1 bg-military-cream border border-military-cream-dark rounded-full p-1">
            {BANNER_TYPES.map(({ key, label, icon: Icon }) => {
              const active = form.type === key;
              return (
                <button
                  key={key}
                  onClick={() => setForm((prev) => ({ ...prev, type: key }))}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    active
                      ? "bg-military-red text-white"
                      : "text-foreground-600 hover:text-military-red"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-foreground-500 mt-2">
            {form.type === "manual" &&
              "Tự nhập toàn bộ nội dung banner theo ý bạn."}
            {form.type === "competition" &&
              "Chọn một cuộc thi có sẵn — nội dung sẽ được điền tự động, bấm nút sẽ dẫn tới cuộc thi đó."}
            {form.type === "news" &&
              "Chọn một bản tin có sẵn theo chủ đề — bấm nút sẽ mở đúng bản tin đó."}
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: form */}
          <div className="space-y-4">
            {form.type === "competition" && (
              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                  Chọn cuộc thi
                </label>
                <select
                  value={form.competition_id}
                  onChange={(e) => {
                    const val = e.target.value;
                    const comp = competitions.find((c) => String(c.id) === val);
                    setForm((prev) => ({ ...prev, competition_id: val }));
                    applyCompetition(comp);
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
                >
                  <option value="">— Chọn cuộc thi —</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-foreground-500 mt-1">
                  Nội dung (tiêu đề, mô tả, ảnh) sẽ tự điền theo cuộc thi, bạn vẫn sửa lại được.
                </p>
              </div>
            )}

            {form.type === "news" && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                    Chủ đề (chuyên mục)
                  </label>
                  <select
                    value={newsCategory}
                    onChange={(e) => {
                      setNewsCategory(e.target.value);
                      setForm((prev) => ({ ...prev, news_id: "" }));
                    }}
                    className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
                  >
                    <option value="">— Tất cả chủ đề —</option>
                    {newsCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                    Chọn bản tin
                  </label>
                  <select
                    value={form.news_id}
                    onChange={(e) => {
                      const val = e.target.value;
                      const post = news.find((n) => String(n.id) === val);
                      setForm((prev) => ({ ...prev, news_id: val }));
                      applyNews(post);
                    }}
                    className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
                  >
                    <option value="">— Chọn bản tin —</option>
                    {newsByCategory.map((n) => (
                      <option key={n.id} value={String(n.id)}>
                        {n.category ? `[${n.category}] ` : ""}
                        {n.title}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-foreground-500 mt-1">
                    Nội dung (tiêu đề, mô tả, ảnh) sẽ tự điền theo bản tin, bạn vẫn sửa lại được.
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                Nhãn nhỏ (badge)
              </label>
              <input
                type="text"
                value={form.badge}
                onChange={(e) => setForm((prev) => ({ ...prev, badge: e.target.value }))}
                placeholder="VD: Cuộc Thi Trực Tuyến"
                className="w-full px-4 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                Tiêu đề banner
              </label>
              <textarea
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="VD: THI TÌM HIỂU 80 NĂM THÀNH LẬP BỘ THAM MƯU QUÂN KHU 5"
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-white text-sm resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                Mô tả ngắn
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Mô tả ngắn hiển thị dưới tiêu đề..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-white text-sm resize-none"
              />
            </div>

            {form.type === "manual" && (
              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                  Cuộc thi cho nút "Tham gia ngay"
                </label>
                <select
                  value={form.competition_id}
                  onChange={(e) => setForm((prev) => ({ ...prev, competition_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
                >
                  <option value="">— Tự động (cuộc thi đang mở đầu tiên) —</option>
                  {competitions.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-foreground-500 mt-1">
                  Chọn cuộc thi cụ thể, hoặc để trống để hệ thống tự chọn cuộc thi đang mở.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                Thứ tự hiển thị
              </label>
              <input
                type="number"
                value={form.sort_order}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, sort_order: parseInt(e.target.value, 10) || 0 }))
                }
                className="w-full px-4 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
              />
              <p className="text-xs text-foreground-500 mt-1">
                Banner có thứ tự nhỏ sẽ hiển thị trước.
              </p>
            </div>
          </div>

          {/* Right: image */}
          <div>
            <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
              Ảnh banner
            </label>
            <div className="rounded-xl border-2 border-dashed border-military-cream-dark overflow-hidden bg-military-cream/30">
              {form.image_url ? (
                <div className="relative">
                  <img
                    src={form.image_url}
                    alt="Banner trang chủ"
                    className="w-full h-56 object-cover object-top"
                  />
                  <button
                    onClick={() => setForm((prev) => ({ ...prev, image_url: "" }))}
                    className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors cursor-pointer"
                    title="Xóa ảnh"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-full h-56 flex flex-col items-center justify-center text-foreground-500">
                  <ImageIcon className="w-10 h-10 mb-2 text-military-cream-dark" />
                  <p className="text-sm">Chưa có ảnh banner</p>
                </div>
              )}
            </div>
            <label className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-military-red/10 text-military-red font-bold rounded-lg border-2 border-military-red hover:bg-military-red hover:text-white transition-all whitespace-nowrap cursor-pointer">
              <Upload className="w-4 h-4" />
              {uploading ? "Đang tải..." : "Tải ảnh lên"}
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="text-xs text-foreground-500 mt-2">
              Hoặc dán đường dẫn ảnh vào bên dưới.
            </p>
            <input
              type="text"
              value={form.image_url}
              onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
              placeholder="https://..."
              className="w-full mt-2 px-4 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t border-military-cream-dark">
          <button
            onClick={resetForm}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-foreground-700 font-bold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
          >
            Nhập lại
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-60 whitespace-nowrap cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? "Đang lưu..." : editing ? "Cập nhật banner" : "Thêm banner"}
          </button>
        </div>
      </div>
    </div>
  );
}