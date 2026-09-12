import { useState, useEffect, useRef } from "react";
import { Megaphone } from "lucide-react";
import { listActiveAnnouncements, type Announcement } from "@/lib/supabase";

// Tốc độ chạy (pixel mỗi giây) — đều tăm tắp, không phụ thuộc độ dài thông báo.
const SPEED = 70;

// Dải "THÔNG BÁO" chạy chữ ngay dưới thanh điều hướng ở trang chủ.
// Chạy bằng khung hình (requestAnimationFrame) để chuyển động mượt, không giật,
// và lặp lại liền mạch. Nội dung do quản trị viên nhập ở trang quản trị.
export default function AnnouncementBar() {
  const [items, setItems] = useState<Announcement[]>([]);
  const trackRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLSpanElement>(null);
  const posRef = useRef(0);
  const copyWidthRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    let active = true;
    listActiveAnnouncements()
      .then((data) => {
        if (active) setItems(data);
      })
      .catch(() => {
        /* Không có thông báo thì ẩn dải đi, không ảnh hưởng trang. */
      });
    return () => {
      active = false;
    };
  }, []);

  // Ghép các thông báo thành một dòng, phân tách bằng biểu tượng ngôi sao.
  const text = items.map((it) => it.content.trim()).filter(Boolean).join("      ✦      ");

  useEffect(() => {
    if (!text) return;

    const track = trackRef.current;
    const copy = copyRef.current;
    if (!track || !copy) return;

    // Đo chiều rộng một bản sao (đã tính cả khoảng cách) để biết điểm lặp lại.
    const measure = () => {
      copyWidthRef.current = copy.offsetWidth;
    };
    measure();

    // Khi cỡ chữ / nội dung thay đổi, đo lại cho khớp.
    const ro = new ResizeObserver(measure);
    ro.observe(copy);

    posRef.current = 0;
    lastTimeRef.current = null;
    track.style.transform = "translate3d(0,0,0)";

    let raf = 0;
    const step = (t: number) => {
      if (lastTimeRef.current == null) lastTimeRef.current = t;
      const dt = Math.min((t - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = t;

      if (!pausedRef.current) {
        let pos = posRef.current - SPEED * dt;
        const w = copyWidthRef.current;
        if (w > 0 && pos <= -w) pos += w;
        posRef.current = pos;
        track.style.transform = `translate3d(${pos}px,0,0)`;
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [text]);

  if (items.length === 0) return null;

  return (
    <div className="bg-white border-b border-military-cream-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-3 sm:gap-4 py-2.5">
          <span className="inline-flex items-center gap-2 shrink-0 bg-military-red text-white text-xs sm:text-sm font-extrabold uppercase tracking-wide px-3 sm:px-4 py-1.5 rounded-md">
            <Megaphone className="w-4 h-4" />
            Thông báo
          </span>

          <div
            className="relative flex-1 overflow-hidden"
            onMouseEnter={() => {
              pausedRef.current = true;
            }}
            onMouseLeave={() => {
              pausedRef.current = false;
            }}
          >
            <div
              ref={trackRef}
              className="flex w-max whitespace-nowrap will-change-transform"
              style={{ transform: "translate3d(0,0,0)" }}
            >
              <span
                ref={copyRef}
                className="pr-16 text-sm sm:text-base font-semibold text-military-red-dark"
              >
                {text}
              </span>
              <span
                className="pr-16 text-sm sm:text-base font-semibold text-military-red-dark"
                aria-hidden="true"
              >
                {text}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}