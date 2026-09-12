import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar, Newspaper, Image as ImageIcon } from "lucide-react";
import { listFeaturedNewsPosts, type NewsPost } from "@/lib/supabase";
import NewsModal from "@/components/feature/NewsModal";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

function usePerView() {
  const [perView, setPerView] = useState(3);
  useEffect(() => {
    const compute = () => {
      const w = window.innerWidth;
      if (w < 640) setPerView(1);
      else if (w < 1024) setPerView(2);
      else setPerView(3);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);
  return perView;
}

export default function NewsCarousel() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<NewsPost | null>(null);
  const perView = usePerView();

  useEffect(() => {
    let active = true;
    listFeaturedNewsPosts(12)
      .then((data) => {
        if (!active) return;
        setPosts(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const maxIndex = useMemo(
    () => Math.max(0, posts.length - perView),
    [posts.length, perView],
  );

  // Giữ index hợp lệ khi thay đổi kích thước / dữ liệu
  useEffect(() => {
    setCurrent((c) => Math.min(c, maxIndex));
  }, [maxIndex]);

  // Tự động lướt
  useEffect(() => {
    if (maxIndex <= 0) return;
    const timer = setInterval(() => {
      setCurrent((c) => (c >= maxIndex ? 0 : c + 1));
    }, 4000);
    return () => clearInterval(timer);
  }, [maxIndex]);

  const prev = () => setCurrent((c) => (c <= 0 ? maxIndex : c - 1));
  const next = () => setCurrent((c) => (c >= maxIndex ? 0 : c + 1));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-14">
        <div className="w-4 h-4 border-2 border-military-red border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-military-cream-dark p-10 text-center text-foreground-600">
        <Newspaper className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
        <p className="text-sm">
          Chưa có tin nổi bật nào. Vào Trang Quản Trị → Quản lý bài viết → bấm nút{" "}
          <span className="font-bold text-military-red">"Nổi bật"</span> (⭐) để đưa bản tin lên dải tin này.
        </p>
      </div>
    );
  }

  const itemWidth = 100 / perView;

  return (
    <>
      <div className="relative">
        {/* Khu trượt */}
        <div className="overflow-hidden">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${current * itemWidth}%)` }}
          >
            {posts.map((item) => (
              <div
                key={item.id}
                className="shrink-0 px-2.5"
                style={{ width: `${itemWidth}%` }}
              >
                <button
                  onClick={() => setSelected(item)}
                  className="group relative w-full h-60 md:h-72 rounded-xl overflow-hidden text-left cursor-pointer"
                >
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-military-gold-dark bg-military-cream">
                      <ImageIcon className="w-14 h-14" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-military-gold text-military-red-dark">
                      {item.category}
                    </span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <div className="flex items-center gap-1 text-[11px] text-white/80 mb-1.5">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(item.created_at)}</span>
                    </div>
                    <h3 className="font-bold text-white leading-snug line-clamp-2 group-hover:text-military-gold transition-colors">
                      {item.title}
                    </h3>
                  </div>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Mũi tên trái/phải */}
        {maxIndex > 0 && (
          <>
            <button
              onClick={prev}
              aria-label="Tin trước"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white text-military-red-dark shadow-lg border border-military-cream-dark hover:bg-military-red hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={next}
              aria-label="Tin tiếp theo"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-white text-military-red-dark shadow-lg border border-military-cream-dark hover:bg-military-red hover:text-white transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Dấu chấm */}
      {maxIndex > 0 && (
        <div className="flex items-center justify-center gap-2 mt-5">
          {Array.from({ length: maxIndex + 1 }).map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              aria-label={`Chuyển đến tin ${idx + 1}`}
              className={`h-2 rounded-full transition-all cursor-pointer ${
                idx === current
                  ? "w-6 bg-military-red"
                  : "w-2 bg-military-cream-dark hover:bg-military-gold"
              }`}
            />
          ))}
        </div>
      )}

      <NewsModal post={selected} onClose={() => setSelected(null)} />
    </>
  );
}