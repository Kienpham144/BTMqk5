import { useState, useEffect, useRef } from "react";
import {
  Newspaper,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  RefreshCw,
  Upload,
  ImageIcon,
  AlertCircle,
  CheckCircle2,
  Star,
} from "lucide-react";
import {
  listNewsPosts,
  createNewsPost,
  updateNewsPost,
  deleteNewsPost,
  uploadNewsImage,
  type NewsPost,
} from "@/lib/supabase";

const EMPTY_FORM = {
  title: "",
  category: "Bản tin thời sự",
  content: "",
  featured: false,
  status: "published",
};

interface FormState {
  title: string;
  category: string;
  content: string;
  featured: boolean;
  status: string;
}

export default function NewsManagement() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [imageUrl, setImageUrl] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAll = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listNewsPosts();
      setPosts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải dữ liệu bản tin.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setImageUrl("");
  };

  const openAdd = () => {
    setEditingId(null);
    resetForm();
    setShowAdd(true);
    setError("");
    setSuccess("");
  };

  const startEdit = (post: NewsPost) => {
    setEditingId(post.id);
    setShowAdd(false);
    setForm({
      title: post.title,
      category: post.category,
      content: post.content ?? "",
      featured: post.featured,
      status: post.status,
    });
    setImageUrl(post.image_url ?? "");
    setError("");
    setSuccess("");
  };

  const cancelForm = () => {
    setShowAdd(false);
    setEditingId(null);
    resetForm();
  };

  const handlePickImage = async (file: File | undefined) => {
    if (!file) return;
    setError("");
    setSuccess("");
    setUploading(true);
    try {
      const url = await uploadNewsImage(file);
      setImageUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải ảnh lên.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!form.title.trim()) {
      setError("Vui lòng nhập tiêu đề bản tin.");
      return;
    }
    const sortOrder =
      editingId != null
        ? (posts.find((p) => p.id === editingId)?.sort_order ?? 0)
        : posts.length + 1;

    const payload = {
      title: form.title.trim(),
      category: form.category.trim() || "Bản tin thời sự",
      content: form.content.trim(),
      image_url: imageUrl || null,
      featured: form.featured,
      status: form.status,
      sort_order: sortOrder,
    };

    try {
      if (editingId != null) {
        await updateNewsPost(editingId, payload);
        setSuccess("Đã cập nhật bản tin!");
      } else {
        await createNewsPost(payload);
        setSuccess("Đã thêm bản tin mới!");
      }
      cancelForm();
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu bản tin.");
    }
  };

  const handleToggleFeatured = async (post: NewsPost) => {
    try {
      await updateNewsPost(post.id, { featured: !post.featured });
      setSuccess(post.featured ? "Đã bỏ đánh dấu nổi bật." : "Đã đánh dấu bản tin nổi bật.");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi cập nhật trạng thái.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa bản tin này?")) return;
    setError("");
    try {
      await deleteNewsPost(id);
      setSuccess("Đã xóa bản tin.");
      loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa bản tin.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-military-cream-dark p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
              <Newspaper className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-military-red-dark">Quản lý bài viết &amp; nội dung</h2>
              <p className="text-xs text-foreground-600">
                {posts.length} bài viết · Thêm, sửa, xóa nội dung cho mọi chuyên mục menu
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setShowAdd(false); setEditingId(null); loadAll(); }}
              className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-military-cream-dark hover:border-military-red text-military-red-dark transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Đăng bản tin
            </button>
          </div>
        </div>

        {(error || success) && (
          <div
            className={`flex items-start gap-2 rounded-lg p-3 mb-4 text-sm ${
              error
                ? "bg-military-red/5 border border-military-red/30 text-military-red"
                : "bg-military-green/10 border border-military-green/30 text-military-green"
            }`}
          >
            {error ? (
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
            )}
            <span>{error || success}</span>
          </div>
        )}

        {(showAdd || editingId != null) && (
          <div className="bg-military-cream/50 rounded-xl border border-military-cream-dark p-5 mb-5">
            <h3 className="font-bold text-military-red-dark mb-4">
              {editingId != null ? "Chỉnh sửa bản tin" : "Đăng bản tin mới"}
            </h3>
            <div className="grid lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Tiêu đề *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Nhập tiêu đề bản tin..."
                    className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-white text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Chuyên mục</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-3 rounded-lg border border-military-cream-dark bg-white text-sm"
                    >
                      <optgroup label="Bản tin thời sự">
                        <option value="Bản tin thời sự">Bản tin thời sự</option>
                        <option value="Thông báo">Thông báo</option>
                      </optgroup>
                      <optgroup label="Tuyên truyền giáo dục - Phổ biến pháp luật">
                        <option value="Tuyên truyền giáo dục">Tuyên truyền giáo dục</option>
                        <option value="Phổ biến pháp luật tuyên truyền">Phổ biến pháp luật tuyên truyền</option>
                        <option value="Lời Bác dạy">Lời Bác dạy</option>
                        <option value="Mỗi tuần một điều luật">Mỗi tuần một điều luật</option>
                      </optgroup>
                      <optgroup label="Công tác xây dựng Đảng">
                        <option value="Công tác xây dựng Đảng">Công tác xây dựng Đảng</option>
                        <option value="Công tác quần chúng, dân vận, chính sách">Công tác quần chúng, dân vận, chính sách</option>
                      </optgroup>
                      <optgroup label="Bảo vệ nền tảng tư tưởng của Đảng">
                        <option value="Bảo vệ nền tảng tư tưởng của Đảng">Bảo vệ nền tảng tư tưởng của Đảng</option>
                      </optgroup>
                      <optgroup label="Học tập và làm theo Bác">
                        <option value="Học tập và làm theo Bác">Học tập và làm theo Bác</option>
                      </optgroup>
                      <optgroup label="Thi đua khen thưởng">
                        <option value="Thi đua khen thưởng">Thi đua khen thưởng</option>
                      </optgroup>
                      <optgroup label="Văn hóa, câu lạc bộ">
                        <option value="Văn hóa, câu lạc bộ">Văn hóa, câu lạc bộ</option>
                      </optgroup>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Trạng thái</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full px-3 py-3 rounded-lg border border-military-cream-dark bg-white text-sm"
                    >
                      <option value="published">Đã đăng</option>
                      <option value="draft">Bản nháp</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Nội dung</label>
                  <textarea
                    value={form.content}
                    onChange={(e) => setForm({ ...form, content: e.target.value })}
                    placeholder="Nhập nội dung bản tin..."
                    rows={5}
                    className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-white text-sm resize-none"
                  />
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={form.featured}
                    onChange={(e) => setForm({ ...form, featured: e.target.checked })}
                    className="w-4 h-4 accent-military-red"
                  />
                  <span className="text-sm font-semibold text-military-red-dark">Đánh dấu nổi bật (hiện đầu trang)</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Ảnh báo</label>
                <div
                  className="relative w-full h-56 rounded-lg border-2 border-dashed border-military-gold/40 bg-white overflow-hidden flex items-center justify-center"
                >
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt="Ảnh báo"
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex flex-col items-center gap-2 text-foreground-500">
                      <ImageIcon className="w-10 h-10 text-military-gold-dark" />
                      <span className="text-xs font-medium">Chưa có ảnh</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-military-red-dark text-white font-bold rounded-lg hover:bg-military-red transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? "Đang tải..." : "Tải ảnh lên"}
                  </button>
                  {imageUrl && (
                    <button
                      onClick={() => setImageUrl("")}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-foreground-700 font-bold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Bỏ ảnh
                    </button>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handlePickImage(e.target.files?.[0])}
                  />
                </div>
                <p className="text-xs text-foreground-600 mt-2">
                  Định dạng ảnh JPG, PNG. Ảnh sẽ hiển thị ở đầu trang bản tin thời sự.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 mt-5">
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {editingId != null ? "Lưu thay đổi" : "Đăng bản tin"}
              </button>
              <button
                onClick={cancelForm}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-foreground-700 font-bold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-16 text-foreground-600">
            <Newspaper className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
            <p className="text-sm">Chưa có bản tin nào. Nhấn "Đăng bản tin" để tạo mới.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="bg-white rounded-xl border border-military-cream-dark overflow-hidden hover:shadow-lg transition-all"
              >
                <div className="relative h-36 overflow-hidden bg-military-cream">
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-military-gold-dark">
                      <ImageIcon className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1.5">
                    <span className="px-2 py-0.5 rounded-full bg-military-red text-white text-[11px] font-bold">
                      {post.category}
                    </span>
                    {post.status === "draft" && (
                      <span className="px-2 py-0.5 rounded-full bg-foreground-700 text-white text-[11px] font-bold">
                        Nháp
                      </span>
                    )}
                  </div>
                  {post.featured && (
                    <div className="absolute top-2 right-2">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-military-gold text-military-red-dark text-[11px] font-bold">
                        <Star className="w-3 h-3" />
                        Nổi bật
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-military-red-dark text-sm mb-1 line-clamp-2">
                    {post.title}
                  </h3>
                  <p className="text-xs text-foreground-600 mb-3 line-clamp-2">
                    {post.content || "—"}
                  </p>
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => handleToggleFeatured(post)}
                      className={`inline-flex items-center gap-1.5 text-xs font-bold rounded-full px-3 py-1.5 border-2 transition-colors cursor-pointer ${
                        post.featured
                          ? "bg-military-gold text-military-red-dark border-military-gold-dark"
                          : "bg-white text-foreground-600 border-military-cream-dark hover:border-military-gold"
                      }`}
                      title={post.featured ? "Bỏ khỏi tin nổi bật" : "Đưa vào Tin Tức Nổi Bật"}
                    >
                      {post.featured ? <Star className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                      {post.featured ? "Nổi bật" : "Thêm nổi bật"}
                    </button>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => startEdit(post)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                        title="Sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(post.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}