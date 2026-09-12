import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { listOnlineUsers, type OnlineUser } from "@/lib/supabase";

// Cứ mỗi 20 giây làm mới danh sách người đang hoạt động để ô hiển thị luôn
// cập nhật. Việc ghi nhịp hoạt động do bộ PresenceTracker toàn cục đảm nhiệm.
const POLL_MS = 20000;

export function useOnlinePresence(onlineMinutes = 5) {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const data = await listOnlineUsers(onlineMinutes);
      setUsers(data);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được danh sách hoạt động.");
    } finally {
      setIsLoading(false);
    }
  }, [onlineMinutes]);

  useEffect(() => {
    if (loading) return;

    // Khách chưa đăng nhập: không cần theo dõi, ẩn ô hoạt động.
    if (!user) {
      setUsers([]);
      setIsLoading(false);
      return;
    }

    refresh();
    const poll = setInterval(() => {
      refresh();
    }, POLL_MS);

    return () => clearInterval(poll);
  }, [user, loading, refresh]);

  return { users, isLoading, error, refresh };
}

export default useOnlinePresence;