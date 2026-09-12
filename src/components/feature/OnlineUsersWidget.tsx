import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Users, MessageSquare, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useOnlinePresence } from "@/hooks/useOnlinePresence";
import type { OnlineUser } from "@/lib/supabase";

function displayName(u: OnlineUser) {
  const name = u.full_name || u.username || "Người dùng";
  return u.rank ? `${u.rank} ${name}` : name;
}

// Trực tuyến "thực sự": có hoạt động trong vòng 1 phút gần nhất.
function isTrulyOnline(u: OnlineUser): boolean {
  if (!u.last_seen) return false;
  return Date.now() - new Date(u.last_seen).getTime() < 60 * 1000;
}

// Phân loại đơn vị: các cơ quan (Phòng, Ban, Văn phòng, Cơ quan) được ưu tiên
// lên trước, sau đó mới đến các đơn vị còn lại. Hỗ trợ cả dạng viết tắt:
// P. (Phòng), VP (Văn phòng), CQ (Cơ quan), PHC (Phòng Hậu cần/Hành chính).
const unitGroup = (unit: string): number => {
  const u = (unit || "").trim().toLowerCase();
  const isAgency =
    /^(phòng|phong|ban|văn phòng|van phong|cơ quan|co quan)/.test(u) ||
    /^(p\.|p\s|vp|cq|phc)/.test(u);
  return isAgency ? 0 : 1;
};

// Ô nhỏ nổi ở góc phải trang chủ cho biết những tài khoản đang hoạt động.
// Bấm vào tiêu đề để thu gọn hoặc mở rộng cho gọn gàng.
export default function OnlineUsersWidget() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { users, isLoading, error, refresh } = useOnlinePresence(5);
  const [open, setOpen] = useState(false);

  // Sắp xếp theo đơn vị giống phần Quản lý tài khoản: cơ quan (Phòng/Ban/
  // Văn phòng) lên trước, rồi mới đến các đơn vị khác, cùng nhóm thì theo tên.
  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const ga = unitGroup(a.unit);
      const gb = unitGroup(b.unit);
      if (ga !== gb) return ga - gb;
      return (a.unit || "").localeCompare(b.unit || "", "vi");
    });
  }, [users]);

  // Chỉ hiển thị khi đã đăng nhập (khách chưa đăng nhập không thấy danh sách).
  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 flex flex-col items-end">
      {open ? (
        <div className="w-[calc(100vw-2rem)] max-w-xs bg-white rounded-xl border border-military-cream-dark shadow-lg overflow-hidden">
          {/* Tiêu đề: bấm để thu gọn */}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 bg-military-red-dark text-white cursor-pointer"
          >
            <span className="flex items-center gap-2 min-w-0">
              <span className="relative flex items-center justify-center w-5 h-5 shrink-0">
                <span className="absolute w-3 h-3 rounded-full bg-military-green animate-ping opacity-60" />
                <span className="relative w-2.5 h-2.5 rounded-full bg-military-green border border-white" />
              </span>
              <span className="text-sm font-bold truncate">
                Đang hoạt động ({users.length})
              </span>
            </span>
            <ChevronDown className="w-4 h-4 shrink-0" />
          </button>

          {/* Danh sách người đang hoạt động */}
          <div className="max-h-72 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-5 h-5 text-military-red animate-spin" />
              </div>
            ) : error ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-military-red mb-2">{error}</p>
                <button
                  type="button"
                  onClick={refresh}
                  className="text-xs font-bold text-military-red-dark hover:text-military-red cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            ) : users.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs text-foreground-500">
                Hiện chưa có ai khác đang hoạt động.
              </p>
            ) : (
              sortedUsers.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 px-3 py-2 border-b border-military-cream-dark/60 last:border-b-0 hover:bg-military-cream/60 transition-colors"
                >
                  {u.avatar_url ? (
                    <img
                      src={u.avatar_url}
                      alt={displayName(u)}
                      className="w-9 h-9 rounded-full object-cover object-top shrink-0"
                    />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-military-gold flex items-center justify-center shrink-0 text-sm font-bold text-military-red-dark">
                      {(u.full_name || u.username || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-military-red-dark">
                      {isTrulyOnline(u) && (
                        <span
                          title="Đang trực tuyến"
                          className="w-2 h-2 rounded-full bg-military-green shrink-0"
                        />
                      )}
                      <span className="truncate">{displayName(u)}</span>
                    </p>
                    {u.unit && (
                      <p className="text-xs text-foreground-500 truncate">{u.unit}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/chat")}
                    aria-label={`Nhắn tin cho ${displayName(u)}`}
                    className="w-8 h-8 flex items-center justify-center rounded-lg bg-military-cream text-military-red-dark hover:bg-military-red hover:text-white transition-colors shrink-0 cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Chân ô: vào phòng chat */}
          <button
            type="button"
            onClick={() => navigate("/chat")}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-military-cream text-sm font-bold text-military-red-dark hover:bg-military-cream-dark transition-colors cursor-pointer"
          >
            <MessageSquare className="w-4 h-4" />
            Vào phòng chat
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-2 pl-3 pr-4 py-2.5 bg-military-red-dark text-white rounded-full shadow-lg hover:bg-military-red transition-colors cursor-pointer"
        >
          <span className="relative flex items-center justify-center w-5 h-5 shrink-0">
            <span className="absolute w-3 h-3 rounded-full bg-military-green animate-ping opacity-60" />
            <span className="relative w-2.5 h-2.5 rounded-full bg-military-green border border-white" />
          </span>
          <Users className="w-4 h-4" />
          <span className="text-sm font-bold whitespace-nowrap">
            {users.length} đang hoạt động
          </span>
          <ChevronUp className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}