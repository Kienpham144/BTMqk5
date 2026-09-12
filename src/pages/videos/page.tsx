import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Video,
  RefreshCw,
  AlertCircle,
  Calendar,
  Clapperboard,
  Play,
  LayoutGrid,
  Folder,
} from "lucide-react";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import { listVideos, type VideoItem } from "@/lib/supabase";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

const CATEGORY_ORDER = [
  "Học tập chính trị",
  "Thông tin tuyên truyền",
  "Học tập và làm theo Bác",
];

export default function Videos() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  useEffect(() => {
    let active = true;
    listVideos()
      .then((data) => {
        if (!active) return;
        setVideos(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Không thể tải video.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    videos.forEach((v) => {
      const c = v.category?.trim();
      if (c) counts.set(c, (counts.get(c) || 0) + 1);
    });
    const known = CATEGORY_ORDER.filter((c) => counts.has(c));
    const extra = Array.from(counts.keys()).filter((c) => !CATEGORY_ORDER.includes(c)).sort();
    return [...known, ...extra].map((c) => ({ name: c, count: counts.get(c) || 0 }));
  }, [videos]);

  const filtered = useMemo(() => {
    if (activeCategory === "all") return videos;
    return videos.filter((v) => (v.category?.trim() || "") === activeCategory);
  }, [videos, activeCategory]);

  return (
    <div className="min-h-screen bg-military-cream">
      <Navbar />

      {/* Header */}
      <section className="bg-gradient-to-r from-military-red to-military-red-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="inline-flex items-center gap-2 bg-white/15 px-4 py-2 rounded-full text-sm font-bold mb-4">
            <Clapperboard className="w-4 h-4 text-military-gold" />
            Thư viện video
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">
            Thư Viện Video
          </h1>
          <p className="text-white/80 text-lg max-w-2xl">
            Video, phóng sự, tư liệu tuyên truyền pháp luật và hoạt động của Bộ Tham mưu Quân khu 5.
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
                        <span className="truncate">Tất cả video</span>
                      </span>
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                          activeCategory === "all"
                            ? "bg-military-red text-white"
                            : "bg-military-cream-dark/50 text-foreground-600"
                        }`}
                      >
                        {videos.length}
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
                </div>
              </aside>

              {/* Danh sách video */}
              <div className="flex-1 min-w-0">
                {videos.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-military-cream-dark">
                    <div className="w-20 h-20 rounded-full bg-military-red/10 flex items-center justify-center mx-auto mb-4">
                      <Play className="w-10 h-10 text-military-red" />
                    </div>
                    <h2 className="text-xl font-extrabold text-military-red-dark mb-2">
                      Chưa có video
                    </h2>
                    <p className="text-foreground-600 text-sm">
                      Thư viện video đang được cập nhật. Vui lòng quay lại sau.
                    </p>
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="text-center py-20 bg-white rounded-2xl border border-military-cream-dark">
                    <div className="w-16 h-16 rounded-full bg-military-red/10 flex items-center justify-center mx-auto mb-4">
                      <Folder className="w-8 h-8 text-military-red" />
                    </div>
                    <h2 className="text-lg font-extrabold text-military-red-dark mb-2">
                      Không có video phù hợp
                    </h2>
                    <p className="text-foreground-600 text-sm">
                      Hãy thử chọn danh mục khác để xem thêm video.
                    </p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filtered.map((v) => (
                      <div
                        key={v.id}
                        className="bg-white rounded-xl overflow-hidden border border-military-cream-dark hover:border-military-gold transition-colors"
                      >
                        <div className="relative aspect-video bg-black">
                          {v.video_url ? (
                            <video
                              src={v.video_url}
                              controls
                              preload="metadata"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-white/50">
                              <Video className="w-10 h-10" />
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <h3 className="font-bold text-military-red-dark mb-1 line-clamp-2">
                            {v.title}
                          </h3>
                          {v.description && (
                            <p className="text-sm text-foreground-700 mb-2 line-clamp-2">
                              {v.description}
                            </p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-500">
                            {v.category && (
                              <span className="inline-flex items-center gap-1 bg-military-cream px-2 py-0.5 rounded-full font-semibold">
                                <Folder className="w-3 h-3" />
                                {v.category}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(v.created_at)}
                            </span>
                          </div>
                        </div>
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