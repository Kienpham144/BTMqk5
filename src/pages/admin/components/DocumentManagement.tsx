import { useState, useEffect, useRef } from "react";
import {
  FileText,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Upload,
  Trash2,
  Plus,
} from "lucide-react";
import {
  listDocuments,
  createDocument,
  deleteDocument,
  uploadDocumentFile,
  type DocumentItem,
} from "@/lib/supabase";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function formatSize(bytes: number | null): string {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentManagement() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const CATEGORIES = [
    "Bài giảng điện tử",
    "Học tập và thực hành theo Bác",
    "Học tập, nghiên cứu chuyên đề đợt 1",
    "Học tập, nghiên cứu chuyên đề đợt 2",
    "Tài liệu Hội nghị TW2 khóa XIV",
    "Tài liệu Hội nghị TW3 khóa XIV",
    "Tài liệu quản lý GDCT",
  ];

  const load = () => {
    setLoading(true);
    setError("");
    listDocuments()
      .then((data) => {
        setDocs(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Lỗi tải danh sách tài liệu.");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
  }, []);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("");
    setFileName("");
    setFileUrl("");
    setFileSize(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setSuccess("");
    try {
      const res = await uploadDocumentFile(file);
      setFileName(res.fileName);
      setFileUrl(res.url);
      setFileSize(res.size);
      if (!title.trim()) setTitle(res.fileName.replace(/\.[^.]+$/, ""));
      setSuccess("Đã tải tài liệu lên. Nhấn Lưu để hoàn tất.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi tải tài liệu lên.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");
    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề tài liệu.");
      return;
    }
    if (!fileUrl) {
      setError("Vui lòng chọn tập tin tài liệu để tải lên.");
      return;
    }
    setSaving(true);
    try {
      await createDocument({
        title: title.trim(),
        description: description.trim(),
        category: category.trim() || null,
        file_name: fileName,
        file_url: fileUrl,
        file_size: fileSize,
      });
      setSuccess("Đã thêm tài liệu mới!");
      resetForm();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi lưu tài liệu.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d: DocumentItem) => {
    if (!window.confirm(`Xóa tài liệu "${d.title}"? Hành động này không thể hoàn tác.`)) return;
    setError("");
    setSuccess("");
    try {
      await deleteDocument(d.id);
      setSuccess("Đã xóa tài liệu.");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa tài liệu.");
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

      {/* Form tải lên tài liệu mới */}
      <div className="bg-white rounded-2xl border border-military-cream-dark p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
            <Upload className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-military-red-dark">Thêm tài liệu mới</h2>
            <p className="text-xs text-foreground-600">
              Tải lên tập tin văn bản (PDF, Word, Excel, PowerPoint...)
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                Tiêu đề tài liệu
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Điều lệnh quản lý bộ đội"
                className="w-full px-4 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                Danh mục
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
              >
                <option value="">-- Chọn danh mục --</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                Mô tả (không bắt buộc)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mô tả ngắn về tài liệu..."
                className="w-full px-4 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
              Tập tin tài liệu
            </label>
            <div className="rounded-xl border-2 border-dashed border-military-cream-dark bg-military-cream/30 p-6">
              {fileName ? (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-military-red-dark truncate">{fileName}</p>
                    <p className="text-xs text-foreground-600">{formatSize(fileSize)}</p>
                  </div>
                  <button
                    onClick={resetForm}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-military-red hover:text-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Bỏ chọn
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <FileText className="w-10 h-10 mb-2 text-military-cream-dark" />
                  <p className="text-sm text-foreground-600">
                    {uploading ? "Đang tải tài liệu lên..." : "Chưa chọn tập tin"}
                  </p>
                </div>
              )}
            </div>
            <label className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-military-red/10 text-military-red font-bold rounded-lg border-2 border-military-red hover:bg-military-red hover:text-white transition-all whitespace-nowrap cursor-pointer">
              <Upload className="w-4 h-4" />
              {uploading ? "Đang tải..." : "Chọn tập tin"}
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFile}
                disabled={uploading}
                className="hidden"
              />
            </label>
            <p className="text-xs text-foreground-500 mt-2">
              Hỗ trợ PDF, Word (.doc/.docx), Excel, PowerPoint và các định dạng văn bản khác.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-military-cream-dark">
            <button
              onClick={resetForm}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-foreground-700 font-bold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
            >
              Nhập lại
            </button>
            <button
              onClick={handleSave}
              disabled={saving || uploading}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-60 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              {saving ? "Đang lưu..." : "Thêm tài liệu"}
            </button>
          </div>
        </div>
      </div>

      {/* Danh sách tài liệu hiện có */}
      <div className="bg-white rounded-2xl border border-military-cream-dark p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-military-red-dark">Danh sách tài liệu ({docs.length})</h2>
            <p className="text-xs text-foreground-600">
              Các tài liệu sẽ hiển thị công khai tại trang "Thư viện tài liệu"
            </p>
          </div>
        </div>

        {docs.length === 0 ? (
          <div className="text-center text-foreground-600 py-12">
            <FileText className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
            <p className="text-sm">Chưa có tài liệu nào. Hãy tải lên tài liệu đầu tiên ở trên.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {docs.map((d) => (
              <div
                key={d.id}
                className="flex items-center gap-4 p-3 rounded-xl border border-military-cream-dark hover:border-military-gold transition-colors bg-military-cream/30"
              >
                <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-military-red-dark truncate">{d.title}</p>
                  <p className="text-xs text-foreground-600 truncate">
                    {d.category ? `${d.category} · ` : ""}{d.file_name}
                    {d.file_size != null ? ` · ${formatSize(d.file_size)}` : ""} · {formatDate(d.created_at)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(d)}
                  title="Xóa"
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-600 hover:text-military-red hover:bg-military-red/10 transition-colors shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}