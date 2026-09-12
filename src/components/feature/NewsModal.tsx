import { useEffect } from "react";
import {
  Calendar,
  Eye,
  Image as ImageIcon,
  X,
} from "lucide-react";
import type { NewsPost } from "@/lib/supabase";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

interface NewsModalProps {
  post: NewsPost | null;
  onClose: () => void;
}

export default function NewsModal({ post, onClose }: NewsModalProps) {
  useEffect(() => {
    if (!post) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKey);
    };
  }, [post, onClose]);

  if (!post) return null;

  const paragraphs = post.content
    ? post.content
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start md:items-center justify-center p-4 md:p-6 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={post.title}
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl my-8 md:my-0 overflow-hidden">
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Đóng"
          className="absolute top-4 right-4 z-10 w-9 h-9 flex items-center justify-center rounded-full bg-black/40 text-white hover:bg-black/60 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="max-h-[86vh] overflow-y-auto">
          {/* Image */}
          <div className="relative h-56 md:h-72 bg-military-cream shrink-0">
            {post.image_url ? (
              <img
                src={post.image_url}
                alt={post.title}
                className="w-full h-full object-cover object-top"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-military-gold-dark">
                <ImageIcon className="w-16 h-16" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-military-gold text-military-red-dark">
                {post.category}
              </span>
            </div>
          </div>

          {/* Body */}
          <div className="p-5 md:p-8">
            <h2 className="text-xl md:text-2xl font-extrabold text-military-red-dark leading-tight mb-4">
              {post.title}
            </h2>

            <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-600 mb-6 pb-4 border-b border-military-cream-dark">
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-4 h-4 text-military-gold-dark" />
                {formatDate(post.created_at)}
              </span>
              {typeof post.views === "number" && (
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-4 h-4 text-military-gold-dark" />
                  {post.views.toLocaleString("vi-VN")} lượt xem
                </span>
              )}
            </div>

            {paragraphs.length > 0 ? (
              <div className="text-foreground-950 leading-relaxed">
                {paragraphs.map((p, idx) => (
                  <p
                    key={idx}
                    className={`mb-4 ${idx === 0 ? "font-medium text-foreground-950" : ""}`}
                  >
                    {p}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-foreground-700">Nội dung đang cập nhật.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 md:px-8 py-4 border-t border-military-cream-dark bg-military-cream">
          <div className="flex items-center justify-between gap-4">
            <span className="text-xs text-foreground-600">
              Đóng cửa sổ bằng cách bấm ra ngoài hoặc phím ESC
            </span>
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-red-dark text-white text-sm font-bold rounded-lg hover:bg-military-red transition-colors whitespace-nowrap cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}