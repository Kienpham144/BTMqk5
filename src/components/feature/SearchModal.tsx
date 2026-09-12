import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Search,
  X,
  Loader2,
  AlertCircle,
  FileText,
  Video,
  Trophy,
  Newspaper,
  LayoutGrid,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import {
  getPageResults,
  loadSearchData,
  normalizeText,
  type SearchResult,
  type SearchResultType,
} from "@/lib/search";

const GROUP_ORDER: SearchResultType[] = ["page", "news", "competition", "document", "video"];

const GROUP_META: Record<
  SearchResultType,
  { label: string; icon: LucideIcon; chip: string }
> = {
  page: { label: "Menu & Trang", icon: LayoutGrid, chip: "bg-military-gold/25 text-military-gold-dark" },
  news: { label: "Tin bài", icon: Newspaper, chip: "bg-military-red/10 text-military-red" },
  competition: { label: "Cuộc thi", icon: Trophy, chip: "bg-military-gold-dark/15 text-military-gold-dark" },
  document: { label: "Văn bản, tài liệu", icon: FileText, chip: "bg-military-red-dark/10 text-military-red-dark" },
  video: { label: "Video", icon: Video, chip: "bg-military-cream-dark/60 text-military-red-dark" },
};

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [all, setAll] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Mở ô tìm kiếm: nạp dữ liệu từ Backend và tự đưa con trỏ vào ô nhập.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setError("");
    setAll(getPageResults());
    setLoading(true);
    let active = true;
    loadSearchData()
      .then((res) => {
        if (!active) return;
        setAll([...getPageResults(), ...res]);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Không thể tải dữ liệu tìm kiếm.");
        setLoading(false);
      });
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [open]);

  // Đóng bằng phím Esc và khóa cuộn nền khi ô tìm kiếm đang mở.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  const results = useMemo(() => {
    const q = normalizeText(query);
    if (!q) return [];
    return all.filter((r) =>
      normalizeText(`${r.title} ${r.description} ${r.meta ?? ""}`).includes(q),
    );
  }, [all, query]);

  const grouped = useMemo(
    () =>
      GROUP_ORDER.map((type) => ({
        type,
        items: results.filter((r) => r.type === type),
      })).filter((g) => g.items.length > 0),
    [results],
  );

  const go = (r: SearchResult) => {
    onClose();
    navigate(r.path);
  };

  if (!open) return null;

  const trimmed = query.trim();
  const hasQuery = trimmed.length > 0;

  return (
    <div className="fixed inset-0 z-[100] flex justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-2xl mx-4 mt-20 md:mt-28 h-fit bg-white rounded-2xl border-2 border-military-gold/50 shadow-2xl overflow-hidden">
        {/* Ô nhập từ khóa */}
        <div className="flex items-center gap-3 px-4 md:px-5 py-4 border-b border-military-cream-dark">
          <Search className="w-5 h-5 text-military-red shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm menu, tin bài, văn bản, video, cuộc thi..."
            className="flex-1 min-w-0 text-sm md:text-base text-foreground-900 placeholder:text-foreground-400 outline-none bg-transparent"
          />
          {hasQuery && (
            <button
              aria-label="Xóa từ khóa"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="w-7 h-7 shrink-0 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-cream transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            aria-label="Đóng tìm kiếm"
            onClick={onClose}
            className="w-8 h-8 shrink-0 flex items-center justify-center rounded-full border border-military-cream-dark text-foreground-600 hover:bg-military-cream hover:text-military-red transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Kết quả */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-14 text-foreground-500">
              <Loader2 className="w-7 h-7 text-military-red animate-spin mb-3" />
              <p className="text-sm">Đang tải dữ liệu tìm kiếm...</p>
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 m-4 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-4 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : !hasQuery ? (
            <div className="px-5 py-10 text-center">
              <div className="w-14 h-14 rounded-full bg-military-red/10 flex items-center justify-center mx-auto mb-3">
                <Search className="w-7 h-7 text-military-red" />
              </div>
              <p className="text-sm font-semibold text-foreground-700 mb-1">
                Nhập từ khóa để bắt đầu tìm kiếm
              </p>
              <p className="text-xs text-foreground-500 max-w-md mx-auto">
                Tìm nhanh theo menu, tin bài trong các chuyên mục, văn bản tài liệu, video và các cuộc thi.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-military-cream flex items-center justify-center mx-auto mb-3">
                <RefreshCw className="w-6 h-6 text-military-gold-dark" />
              </div>
              <p className="text-sm font-semibold text-foreground-700 mb-1">
                Không tìm thấy kết quả cho "{trimmed}"
              </p>
              <p className="text-xs text-foreground-500">
                Hãy thử từ khóa khác hoặc ngắn hơn.
              </p>
            </div>
          ) : (
            <div className="p-2">
              {grouped.map((group) => {
                const meta = GROUP_META[group.type];
                const Icon = meta.icon;
                return (
                  <div key={group.type} className="mb-1">
                    <div className="flex items-center gap-2 px-3 pt-3 pb-1.5">
                      <Icon className="w-4 h-4 text-military-gold-dark" />
                      <span className="text-xs font-extrabold uppercase tracking-wide text-foreground-600">
                        {meta.label}
                      </span>
                      <span className="text-xs font-bold text-foreground-400">
                        ({group.items.length})
                      </span>
                    </div>
                    <div className="space-y-1">
                      {group.items.map((r) => (
                        <button
                          key={r.key}
                          onClick={() => go(r)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-military-cream transition-colors text-left group cursor-pointer"
                        >
                          <span
                            className={`w-10 h-10 shrink-0 rounded-lg flex items-center justify-center ${meta.chip}`}
                          >
                            <Icon className="w-5 h-5" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-military-red-dark truncate group-hover:text-military-red transition-colors">
                              {r.title}
                            </span>
                            <span className="block text-xs text-foreground-600 line-clamp-1">
                              {r.meta ? `${r.meta}` : r.description}
                              {r.meta && r.description ? ` · ${r.description}` : ""}
                            </span>
                          </span>
                          <ArrowRight className="w-4 h-4 shrink-0 text-foreground-300 group-hover:text-military-red transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}