import { useState, useEffect, useRef, useCallback } from "react";
import { RefreshCw, MessageCircle, Plus, Send, Users, Trash2, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import {
  listMyChatRooms,
  listChatMessages,
  listChatRoomMembers,
  listChatUsers,
  sendChatMessage,
  updateChatMessage,
  deleteChatMessage,
  deleteChatRoom,
  createChatRoom,
  getDirectChatEnabled,
  setDirectChatEnabled,
  getDirectChatAdminEnabled,
  setDirectChatAdminEnabled,
  listAdminChatRooms,
  type AdminChatRoom,
  type ChatMessage,
  type Profile,
} from "@/lib/supabase";
import MessageBubble from "@/pages/chat/components/MessageBubble";
import CreateRoomModal from "@/pages/chat/components/CreateRoomModal";

export default function ChatManagement() {
  const { user } = useAuth();

  const [rooms, setRooms] = useState<AdminChatRoom[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [draft, setDraft] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [roomQuery, setRoomQuery] = useState("");
  const [deletingRoom, setDeletingRoom] = useState<AdminChatRoom | null>(null);
  const [error, setError] = useState("");
  const [directEnabled, setDirectEnabled] = useState(true);
  const [togglingDirect, setTogglingDirect] = useState(false);
  const [adminChatEnabled, setAdminChatEnabled] = useState(true);
  const [togglingAdminChat, setTogglingAdminChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadRooms = useCallback(async () => {
    try {
      const r = await listAdminChatRooms();
      setRooms(r);
    } catch {
      // Bỏ qua lỗi tạm thời.
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const loadMessages = useCallback(async (roomId: number) => {
    setLoadingMsgs(true);
    setError("");
    try {
      const [msgs, mems] = await Promise.all([
        listChatMessages(roomId),
        listChatRoomMembers(roomId),
      ]);
      setMessages(msgs);
      setMembers(mems);
    } catch {
      setError("Không thể nạp tin nhắn, vui lòng thử lại.");
    } finally {
      setLoadingMsgs(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  useEffect(() => {
    listChatUsers()
      .then(setAllUsers)
      .catch(() => {});
  }, []);

  useEffect(() => {
    getDirectChatEnabled()
      .then(setDirectEnabled)
      .catch(() => setDirectEnabled(true));
    getDirectChatAdminEnabled()
      .then(setAdminChatEnabled)
      .catch(() => setAdminChatEnabled(true));
  }, []);

  const handleToggleDirect = async () => {
    if (togglingDirect) return;
    setTogglingDirect(true);
    try {
      const next = !directEnabled;
      await setDirectChatEnabled(next);
      setDirectEnabled(next);
    } catch {
      setError("Không thể cập nhật cài đặt chat riêng.");
    } finally {
      setTogglingDirect(false);
    }
  };

  const handleToggleAdminChat = async () => {
    if (togglingAdminChat) return;
    setTogglingAdminChat(true);
    try {
      const next = !adminChatEnabled;
      await setDirectChatAdminEnabled(next);
      setAdminChatEnabled(next);
    } catch {
      setError("Không thể cập nhật cài đặt nhắn với quản trị viên.");
    } finally {
      setTogglingAdminChat(false);
    }
  };

  useEffect(() => {
    if (activeRoomId == null) return;
    loadMessages(activeRoomId);
    const t = setInterval(() => {
      listChatMessages(activeRoomId)
        .then(setMessages)
        .catch(() => {});
    }, 3000);
    return () => clearInterval(t);
  }, [activeRoomId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const v = draft.trim();
    if (!v || activeRoomId == null) return;
    setDraft("");
    try {
      await sendChatMessage(activeRoomId, v);
      setMessages(await listChatMessages(activeRoomId));
      loadRooms();
    } catch {
      setDraft(v);
      setError("Gửi tin nhắn thất bại, vui lòng thử lại.");
    }
  };

  const handleEdit = async (id: number, content: string) => {
    await updateChatMessage(id, content);
    if (activeRoomId != null) {
      setMessages(await listChatMessages(activeRoomId));
    }
  };

  const handleDeleteMessage = async (id: number) => {
    await deleteChatMessage(id);
    if (activeRoomId != null) {
      setMessages(await listChatMessages(activeRoomId));
    }
  };

  const handleCreate = async (name: string, memberIds: string[]) => {
    const room = await createChatRoom(name, memberIds);
    setShowCreate(false);
    await loadRooms();
    setActiveRoomId(room.id);
  };

  const confirmDeleteRoom = async () => {
    if (!deletingRoom) return;
    const id = deletingRoom.id;
    setDeletingRoom(null);
    await deleteChatRoom(id);
    if (activeRoomId === id) setActiveRoomId(null);
    await loadRooms();
  };

  const filteredRooms = rooms.filter(
    (r) =>
      !roomQuery.trim() ||
      (r.name || "").toLowerCase().includes(roomQuery.trim().toLowerCase()),
  );

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || null;
  const map = new Map(members.map((p) => [p.id, p]));
  const roomName = (r: AdminChatRoom) =>
    r.type === "direct"
      ? (r.memberNames && r.memberNames.length > 0 ? r.memberNames.join(" & ") : "Chat riêng")
      : (r.name || "Phòng chat");

  return (
    <div className="bg-white rounded-2xl border border-military-cream-dark overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-military-cream-dark">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-military-red" />
          <h2 className="text-lg font-extrabold text-military-red-dark">Quản lý phòng chat</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold text-gray-600">Chat riêng</span>
            <button
              onClick={handleToggleDirect}
              disabled={togglingDirect}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer disabled:opacity-60 ${
                directEnabled ? "bg-military-red" : "bg-gray-300"
              }`}
              title={directEnabled ? "Tắt chat riêng" : "Bật chat riêng"}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  directEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-sm font-semibold text-gray-600">Nhắn với quản trị viên</span>
            <button
              onClick={handleToggleAdminChat}
              disabled={togglingAdminChat}
              className={`relative w-11 h-6 rounded-full transition-colors cursor-pointer disabled:opacity-60 ${
                adminChatEnabled ? "bg-military-red" : "bg-gray-300"
              }`}
              title={adminChatEnabled ? "Chặn nhắn với quản trị viên" : "Cho phép nhắn với quản trị viên"}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  adminChatEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={roomQuery}
              onChange={(e) => setRoomQuery(e.target.value)}
              placeholder="Tìm phòng..."
              className="w-48 pl-9 pr-3 py-2 rounded-lg border border-military-cream-dark text-sm outline-none focus:border-military-red"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-military-red text-white text-sm font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Tạo phòng
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3" style={{ minHeight: "520px" }}>
        {/* Danh sách phòng */}
        <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-military-cream-dark flex flex-col">
          <div className="flex-1 overflow-y-auto">
            {loadingRooms ? (
              <div className="flex items-center justify-center py-10">
                <RefreshCw className="w-6 h-6 text-military-red animate-spin" />
              </div>
            ) : filteredRooms.length === 0 ? (
              <p className="px-4 py-10 text-sm text-gray-500 text-center">
                {rooms.length === 0 ? "Chưa có phòng chat nào." : "Không tìm thấy phòng nào khớp."}
              </p>
            ) : (
              filteredRooms.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-center gap-3 px-4 py-3 border-b border-military-cream-dark/60 cursor-pointer transition-colors ${
                    activeRoomId === r.id ? "bg-military-red/10 border-l-4 border-l-military-red" : "hover:bg-military-cream"
                  }`}
                  onClick={() => setActiveRoomId(r.id)}
                >
                  <span className="w-10 h-10 rounded-full bg-military-gold flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-military-red-dark" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-bold text-military-red-dark truncate">
                      {roomName(r)}
                    </span>
                    <span className="block text-xs text-gray-500">
                      {new Date(r.updated_at).toLocaleDateString("vi-VN")}{" "}
                      {new Date(r.updated_at).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingRoom(r);
                    }}
                    className="p-1.5 rounded text-gray-400 hover:text-military-red hover:bg-military-red/10 cursor-pointer shrink-0"
                    title="Xóa phòng"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Cửa sổ chat */}
        <div className="md:col-span-2 flex flex-col">
          {activeRoom == null ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <MessageCircle className="w-12 h-12 text-military-cream-dark mb-3" />
              <p className="text-sm text-gray-500">
                Chọn một phòng bên trái để xem và quản lý tin nhắn.
                <br />
                Bạn có toàn quyền sửa hoặc xóa mọi tin nhắn trong phòng.
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-military-cream-dark bg-military-cream/50 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-extrabold text-military-red-dark truncate">
                    {roomName(activeRoom)}
                  </p>
                  <p className="text-xs text-gray-500">{members.length} thành viên</p>
                </div>
                <button
                  onClick={() => setDeletingRoom(activeRoom)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-military-red border border-military-red/30 hover:bg-military-red hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa phòng
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-military-cream/30" style={{ maxHeight: "420px" }}>
                {loadingMsgs ? (
                  <div className="flex items-center justify-center py-10">
                    <RefreshCw className="w-6 h-6 text-military-red animate-spin" />
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-10">Chưa có tin nhắn nào trong phòng.</p>
                ) : (
                  messages.map((m) => (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      sender={map.get(m.sender_id)}
                      isOwn={m.sender_id === user?.id}
                      canModify={true}
                      onEdit={handleEdit}
                      onDelete={handleDeleteMessage}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-3 border-t border-military-cream-dark flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Nhập tin nhắn..."
                  rows={1}
                  className="flex-1 resize-none px-3 py-2.5 rounded-lg border border-military-cream-dark text-sm outline-none focus:border-military-red"
                />
                <button
                  onClick={handleSend}
                  disabled={!draft.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-military-red text-white text-sm font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  Gửi
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {error && <p className="px-5 py-3 text-sm text-military-red border-t border-military-cream-dark">{error}</p>}

      {showCreate && user && (
        <CreateRoomModal
          users={allUsers}
          currentUserId={user.id}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      {deletingRoom && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeletingRoom(null)} />
          <div className="relative bg-white rounded-2xl border border-military-cream-dark w-full max-w-sm p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-military-red/10 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6 text-military-red" />
            </div>
            <h3 className="text-lg font-extrabold text-military-red-dark mb-2">Xóa phòng chat?</h3>
            <p className="text-sm text-gray-600 mb-5">
              Phòng <span className="font-bold">"{roomName(deletingRoom)}"</span> và toàn bộ tin nhắn sẽ bị xóa vĩnh viễn.
              Hành động này không thể hoàn tác.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeletingRoom(null)}
                className="px-4 py-2.5 rounded-lg text-sm font-bold text-gray-600 hover:bg-military-cream cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={confirmDeleteRoom}
                className="px-5 py-2.5 rounded-lg text-sm font-bold bg-military-red text-white hover:bg-military-red-dark cursor-pointer whitespace-nowrap"
              >
                Xóa phòng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}