import { useMemo, useState } from "react";
import { X, Search, Check } from "lucide-react";
import type { Profile } from "@/lib/supabase";

interface Props {
  users: Profile[];
  currentUserId: string;
  onClose: () => void;
  onCreate: (name: string, memberIds: string[]) => Promise<void>;
}

export default function CreateRoomModal({ users, currentUserId, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(
      (u) =>
        u.id !== currentUserId &&
        (!q ||
          (u.full_name || "").toLowerCase().includes(q) ||
          (u.username || "").toLowerCase().includes(q)),
    );
  }, [users, currentUserId, query]);

  const toggle = (id: string) => {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  };

  const submit = async () => {
    if (!name.trim()) {
      setError("Vui lòng nhập tên phòng chat.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await onCreate(name.trim(), selected);
    } catch (e) {
      setError((e as Error)?.message || "Không thể tạo phòng, vui lòng thử lại.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl border border-military-cream-dark w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-military-cream-dark">
          <h3 className="text-lg font-extrabold text-military-red-dark">Tạo phòng chat</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-military-cream text-gray-500 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          <div>
            <label className="block text-sm font-bold text-military-red-dark mb-1.5">Tên phòng</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Phòng Ban Chỉ huy, Tổ Tuyên truyền..."
              className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark text-sm outline-none focus:border-military-red"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-military-red-dark mb-1.5">Chọn thành viên</label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo họ tên hoặc tên đăng nhập..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-military-cream-dark text-sm outline-none focus:border-military-red"
              />
            </div>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selected.map((id) => {
                const u = users.find((x) => x.id === id);
                return (
                  <span
                    key={id}
                    className="inline-flex items-center gap-1 bg-military-red/10 text-military-red text-xs font-bold px-2 py-1 rounded-full"
                  >
                    {u?.full_name || "Người dùng"}
                    <button onClick={() => toggle(id)} className="cursor-pointer">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}

          <div className="border border-military-cream-dark rounded-lg overflow-hidden max-h-64 overflow-y-auto">
            {candidates.length === 0 ? (
              <p className="px-3 py-4 text-sm text-gray-500 text-center">Không tìm thấy thành viên nào khớp.</p>
            ) : (
              candidates.map((u) => {
                const isSel = selected.includes(u.id);
                return (
                  <button
                    key={u.id}
                    onClick={() => toggle(u.id)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-military-cream transition-colors cursor-pointer text-left"
                  >
                    <span
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                        isSel ? "bg-military-red border-military-red" : "border-military-cream-dark"
                      }`}
                    >
                      {isSel && <Check className="w-3.5 h-3.5 text-white" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-military-red-dark truncate">
                        {u.full_name || "Người dùng"}
                      </span>
                      <span className="block text-xs text-gray-500 truncate">
                        {u.position || u.unit || `@${u.username || "user"}`}
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {error && <p className="px-5 pb-2 text-sm text-military-red">{error}</p>}

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-military-cream-dark">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg text-sm font-bold text-gray-600 hover:bg-military-cream cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={submit}
            disabled={busy}
            className="px-5 py-2.5 rounded-lg text-sm font-bold bg-military-red text-white hover:bg-military-red-dark cursor-pointer disabled:opacity-50 whitespace-nowrap"
          >
            {busy ? "Đang tạo..." : "Tạo phòng"}
          </button>
        </div>
      </div>
    </div>
  );
}