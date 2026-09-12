import { useState, useEffect } from "react";
import {
  Megaphone,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Plus,
  Pencil,
  X,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  listAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  type Announcement,
} from "@/lib/supabase";

interface AnnouncementForm {
  id: number | null;
  content: string;
  active: boolean;
  sort_order: number;
}

const emptyForm: AnnouncementForm = {
  id: null,
  content: "",
  active: true,
  sort_order: 0,
};

export default function AnnouncementManagement() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<AnnouncementForm>(emptyForm);
  const [editing, setEditing] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    listAnnouncements()
      .then((data) => {
        setItems(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Lỗi tải danh sách thông báo.");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditing(false);
  };

  const startEdit = (a: Announcement) => {
    setForm({
      id: a.id,
      content: a.content || "",
      active: a.active !== false,
      sort_order: a.sort_order ?? 0,
    });
    setEditing(true);
    setSuccess("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!form.content.trim()) {
      setError("Vui lòng nhập nội dung thông báo.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        content: form.content.trim(),
        active: form.active,
        sort_order: form.sort_order,
      };
      if (form.id != null) {
        await updateAnnouncement(form.id, payload);
        setSuccess("Đã cập nhật thông báo!");
      } else {
        await createAnnouncement(payload);
        setSuccess("Đã thêm thông báo mới!");
      }
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu thông báo.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (a: Announcement) => {
    if (!window.confirm("Xóa thông báo này? Hành động không thể hoàn tác.")) return;
    setError("");
    setSuccess("");
    try {
      await deleteAnnouncement(a.id);
      setSuccess("Đã xóa thông báo.");
      if (form.id === a.id) resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa thông báo.");
    }
  };

  const toggleActive = async (a: Announcement) => {
    setError("");
    setSuccess("");
    try {
      await updateAnnouncement(a.id, { active: !a.active });
      setSuccess(a.active ? "Đã tạm ẩn thông báo." : "Đã bật hiển thị thông báo.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi cập nhật trạng thái.");
    }
  };

  const handleMove = async (a: Announcement, dir: -1 | 1) => {
    setError("");
    setSuccess("");
    try {
      await updateAnnouncement(a.id, { sort_order: (a.sort_order ?? 0) + dir });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi sắp xếp thông báo.");
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

      {/* Danh sách thông báo */}
      <div className="bg-white rounded-2xl border border-military-cream-dark p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-military-red-dark">Danh sách thông báo</h2>
              <p className="text-xs text-foreground-600">
                Các thông báo đang bật sẽ chạy chữ ở đầu trang chủ
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
            Thêm thông báo
          </button>
        </div>

        {items.length === 0 ? (
          <div className="text-center text-foreground-600 py-12">
            <Megaphone className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
            <p className="text-sm">Chưa có thông báo nào. Nhấn "Thêm thông báo" để tạo thông báo đầu tiên.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <div
                key={a.id}
                className={`flex items-start gap-4 p-3 rounded-xl border transition-colors ${
                  a.active
                    ? "border-military-cream-dark bg-military-cream/30 hover:border-military-gold"
                    : "border-military-cream-dark bg-white opacity-70"
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0 mt-0.5">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-military-red-dark break-words">{a.content}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${
                        a.active
                          ? "bg-military-green/10 text-military-green"
                          : "bg-foreground-600/10 text-foreground-600"
                      }`}
                    >
                      {a.active ? "Đang hiển thị" : "Đang ẩn"}
                    </span>
                    <span className="text-xs text-foreground-600">Vị trí {a.sort_order}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleActive(a)}
                    title={a.active ? "Tạm ẩn" : "Bật hiển thị"}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-600 hover:text-military-red hover:bg-military-red/10 transition-colors cursor-pointer"
                  >
                    {a.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleMove(a, -1)}
                    title="Lên trước"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-600 hover:text-military-red hover:bg-military-red/10 transition-colors cursor-pointer"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleMove(a, 1)}
                    title="Xuống sau"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-600 hover:text-military-red hover:bg-military-red/10 transition-colors cursor-pointer"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => startEdit(a)}
                    title="Sửa"
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-600 hover:text-military-red hover:bg-military-red/10 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(a)}
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

      {/* Form thêm/sửa */}
      <div className="bg-white rounded-2xl border border-military-cream-dark p-6">
        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="font-bold text-military-red-dark">
            {editing ? "Sửa thông báo" : "Thêm thông báo mới"}
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

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
              Nội dung thông báo
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              placeholder="VD: Cuộc thi trực tuyến đang diễn ra, mời các đồng chí tham gia..."
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-white text-sm resize-none"
            />
            <p className="text-xs text-foreground-500 mt-1">
              {form.content.length}/500 ký tự
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                Trạng thái hiển thị
              </label>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, active: !prev.active }))}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 font-bold text-sm transition-colors whitespace-nowrap cursor-pointer ${
                  form.active
                    ? "border-military-green bg-military-green/10 text-military-green"
                    : "border-military-cream-dark bg-white text-foreground-600"
                }`}
              >
                {form.active ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {form.active ? "Đang hiển thị" : "Đang ẩn"}
              </button>
              <p className="text-xs text-foreground-500 mt-1">
                Chỉ thông báo đang hiển thị mới xuất hiện ở trang chủ.
              </p>
            </div>

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
                Số nhỏ hơn sẽ chạy trước trong dải thông báo.
              </p>
            </div>
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
            {saving ? "Đang lưu..." : editing ? "Cập nhật thông báo" : "Thêm thông báo"}
          </button>
        </div>
      </div>
    </div>
  );
}