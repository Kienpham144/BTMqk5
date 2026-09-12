import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Download,
  RefreshCw,
  BookOpen,
  AlertCircle,
  Calendar,
  FolderOpen,
  LayoutGrid,
  Folder,
} from "lucide-react";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import { listDocuments, type DocumentItem } from "@/lib/supabase";

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

const CATEGORY_ORDER = [
  "Bài giảng điện tử",
  "Học tập và thực hành theo Bác",
  "Học tập, nghiên cứu chuyên đề đợt 1",
  "Học tập, nghiên cứu chuyên đề đợt 2",
  "Tài liệu Hội nghị TW2 khóa XIV",
  "Tài liệu Hội nghị TW3 khóa XIV",
  "Tài liệu quản lý GDCT",
];

const FILE_TYPES = [
  { label: "PDF", ext: "pdf", cls: "bg-[#e53e3e]", badge: "Đỏ" },
  { label: "DOCX", ext: "docx", cls: "bg-[#2b579a]", badge: "Xanh" },
  { label: "XLSX", ext: "xlsx", cls: "bg-[#217346]", badge: "Xanh lá" },
  { label: "PPTX", ext: "pptx", cls: "bg-[#d24726]", badge: "Cam" },
];

function getFileExt(name: string | null): string {
  if (!name) return "";
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

export default function Materials() {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeFileType, setActiveFileType] = useState("");

  useEffect(() => {
    let active = true;
    listDocuments()
      .then((data) => {
        if (!active) return;
        setDocs(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Không thể tải tài liệu.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    docs.forEach((d) => {
      const c = d.category?.trim();
      if (c) counts.set(c, (counts.get(c) || 0) + 1);
    });
    const known = CATEGORY_ORDER.filter((c) => counts.has(c));
    const extra = Array.from(counts.keys()).filter((c) => !CATEGORY_ORDER.includes(c)).sort();
    return [...known, ...extra].map((c) => ({ name: c, count: counts.get(c) || 0 }));
  }, [docs]);

  const filtered = useMemo(() => {
    return docs.filter((d) => {
      if (activeCategory !== "all" && (d.category?.trim() || "") !== activeCategory) return false;
      if (activeFileType) {
        const ext = getFileExt(d.file_name);
        // Phân nhóm doc vs docx, xls vs xlsx...
        const typeKey = FILE_TYPES.find((t) => t.ext === activeFileType)?.ext || activeFileType;
        if (ext !== typeKey && !(typeKey === "docx" && ext === "doc") && !(typeKey === "xlsx" && ext === "xls") && !(typeKey === "pptx" && ext === "ppt")) {
          return false;
        }
      }
      return true;
    });
  }, [docs, activeCategory, activeFileType]);

  return (
    <div className="min-h-screen bg-military-cream">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-r from-military-red to-military-red-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="inline-flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full text-sm font-bold mb-4">
            <FolderOpen className="w-4 h-4 text-military-gold" />
            Kho tư liệu
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">
            Thư Viện Tài Liệu
          </h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Kho văn bản, tài liệu pháp luật và tư liệu phục vụ công tác tuyên truyền, học tập của cán bộ, chiến sĩ.
          </p>
        </div>
      </section>

      {/* Nội dung với sidebar */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-4 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Sidebar danh mục */}
              <aside className="w-full lg:w-64 shrink-0">
                <div className="bg-white rounded-2xl border border-military-cream-dark p-5">
                  <div className="flex items-center gap-2 text-military-red-dark font-extrabold text-sm uppercase mb-4">
                    <LayoutGrid className="w-4 h-4 text-military-gold" />
                    Danh mục
                  </div>
                  <nav className="space-y-1">
                    <button
                      onClick={() => setActiveCategory("all")}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                        activeCategory === "all"
                          ? "bg-military-red/10 text-military-red"
                          : "text-foreground-700 hover:bg-military-cream"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <LayoutGrid className="w-4 h-4 shrink-0 text-military-gold" />
                        <span className="truncate">Tất cả tài liệu</span>
                      </span>
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                          activeCategory === "all"
                            ? "bg-military-red text-white"
                            : "bg-military-cream-dark/50 text-foreground-600"
                        }`}
                      >
                        {docs.length}
                      </span>
                    </button>
                    {categories.map((c) => (
                      <button
                        key={c.name}
                        onClick={() => setActiveCategory(c.name)}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors cursor-pointer ${
                          activeCategory === c.name
                            ? "bg-military-red/10 text-military-red"
                            : "text-foreground-700 hover:bg-military-cream"
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Folder className="w-4 h-4 shrink-0 text-military-gold" />
                          <span className="truncate">{c.name}</span>
                        </span>
                        <span
                          className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                            activeCategory === c.name
                              ? "bg-military-red text-white"
                              : "bg-military-cream-dark/50 text-foreground-600"
                          }`}
                        >
                          {c.count}
                        </span>
                      </button>
                    ))}
                  </nav>

                  <div className="flex items-center gap-2 text-military-red-dark font-extrabold text-sm uppercase mt-6 mb-4">
                    <FolderOpen className="w-4 h-4 text-military-gold" />
                    Loại file
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {FILE_TYPES.map((t) => (
                      <button
                        key={t.ext}
                        onClick={() => setActiveFileType(activeFileType === t.ext ? "" : t.ext)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                          activeFileType === t.ext
                            ? `${t.cls} text-white`
                            : "bg-military-cream text-foreground-700 hover:bg-military-cream-dark/50"
                        }`}
                      >
                        <FileText className="w-3.5 h-3.5" />
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              </aside>

              {/* Danh sách tài liệu */}
              <div className="flex-1 min-w-0">
                {docs.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-military-cream-dark">
                    <div className="w-20 h-20 rounded-full bg-military-red/10 flex items-center justify-center mx-auto mb-4">
                      <BookOpen className="w-10 h-10 text-military-red" />
                    </div>
                    <h2 className="text-xl font-extrabold text-military-red-dark mb-2">
                      Chưa có tài liệu
                    </h2>
                    <p className="text-foreground-600 text-sm">
                      Kho tài liệu đang được cập nhật. Vui lòng quay lại sau.
                    </p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-military-cream-dark">
                    <div className="w-16 h-16 rounded-full bg-military-red/10 flex items-center justify-center mx-auto mb-4">
                      <FolderOpen className="w-8 h-8 text-military-red" />
                    </div>
                    <h2 className="text-lg font-extrabold text-military-red-dark mb-2">
                      Không có tài liệu phù hợp
                    </h2>
                    <p className="text-foreground-600 text-sm">
                      Hãy thử bỏ bớt bộ lọc danh mục hoặc loại file để xem thêm kết quả.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filtered.map((doc) => (
                      <div
                        key={doc.id}
                        className="bg-white rounded-xl border border-military-cream-dark p-5 flex items-start gap-4 hover:border-military-gold transition-colors"
                      >
                        <div className="w-12 h-12 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-military-red-dark mb-1">{doc.title}</h3>
                          {doc.description && (
                            <p className="text-sm text-foreground-700 mb-2">{doc.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-foreground-500">
                            {doc.category && (
                              <span className="inline-flex items-center gap-1">
                                <Folder className="w-3.5 h-3.5" />
                                {doc.category}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(doc.created_at)}
                            </span>
                            {doc.file_size != null && <span>{formatSize(doc.file_size)}</span>}
                          </div>
                        </div>
                        {doc.file_url && (
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-military-red text-white text-sm font-bold rounded-lg hover:bg-military-red-dark transition-colors shrink-0 whitespace-nowrap"
                          >
                            <Download className="w-4 h-4" />
                            Tải xuống
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-center mt-10">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-military-red text-military-red font-bold rounded-lg hover:bg-military-red hover:text-white transition-all whitespace-nowrap"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}