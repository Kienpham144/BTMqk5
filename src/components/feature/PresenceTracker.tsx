import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { touchLastSeen } from "@/lib/supabase";

// Bộ ghi nhịp hoạt động chạy toàn cục: cứ mỗi 30 giây cập nhật mốc hoạt động
// mới nhất của người đang đăng nhập, kể cả khi họ đang ở trang khác (không chỉ
// trang chủ). Nhờ vậy danh sách "đang hoạt động" phản ánh đúng người đang dùng.
const HEARTBEAT_MS = 30000;

export default function PresenceTracker() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading || !user) return;

    const beat = () => {
      // Chỉ ghi nhận khi tab đang mở, tránh đánh dấu "hoạt động" cho tab ẩn.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      touchLastSeen().catch(() => {
        /* Bỏ qua lỗi tạm thời khi ghi nhịp hoạt động. */
      });
    };

    beat();
    const timer = setInterval(beat, HEARTBEAT_MS);
    document.addEventListener("visibilitychange", beat);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", beat);
    };
  }, [user, loading]);

  return null;
}