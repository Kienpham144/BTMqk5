import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, MessageCircle, Plus, Send, Users, User, MessageSquare } from "lucide-react";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import { useAuth } from "@/hooks/useAuth";
import {
  listMyChatRoomsWithPeers,
  listChatMessages,
  listChatRoomMembers,
  listChatUsers,
  sendChatMessage,
  updateChatMessage,
  deleteChatMessage,
  createChatRoom,
  getDirectChatEnabled,
  getDirectChatAdminEnabled,
  getOrCreateDirectRoom,
  markChatRoomRead,
  type ChatRoomWithPeer,
  type ChatMessage,
  type Profile,
} from "@/lib/supabase";
import MessageBubble from "./components/MessageBubble";
import CreateRoomModal from "./components/CreateRoomModal";
import DirectChatModal from "./components/DirectChatModal";

export default function ChatPage() {
  const navigate = useNavigate();
  const { user, profile, loading } = useAuth();

  const [rooms, setRooms] = useState<ChatRoomWithPeer[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [allUsers, setAllUsers] = useState<Profile[]>([]);
  const [draft, setDraft] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [showDirect, setShowDirect] = useState(false);
  const [directEnabled, setDirectEnabled] = useState(true);
  const [adminChatEnabled, setAdminChatEnabled] = useState(true);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [error, setError] = useState("");

  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  useEffect(() => {
    if (!loading && !user) navigate("/login?redirect=/chat");
  }, [loading, user, navigate]);

  const loadRooms = useCallback(async () => {
    try {
      const r = await listMyChatRoomsWithPeers();
      setRooms(r);
    } catch {
      // Bỏ qua lỗi tạm thời khi tải danh sách phòng.
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  const loadMessages = useCallback(async (roomId: number) => {
    setLoadingMsgs(true);
    setError("");
    shouldAutoScrollRef.current = true;
    try {
      const [msgs, mems] = await Promise.all([
        listChatMessages(roomId),
        listChatRoomMembers(roomId),
      ]);
      setMessages(msgs);
      setMembers(mems);
      // Đánh dấu phòng đã đọc để dấu đỏ trên ảnh đại diện tự tắt.
      markChatRoomRead(roomId).catch(() => {});
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

  useEffect(() => {
    if (activeRoomId == null) return;
    loadMessages(activeRoomId);
    // Tự làm mới tin nhắn mỗi 3 giây để bắt kịp tin nhắn mới.
    const t = setInterval(() => {
      listChatMessages(activeRoomId)
        .then((m) => {
          setMessages(m);
          markChatRoomRead(activeRoomId).catch(() => {});
        })
        .catch(() => {});
    }, 3000);
    return () => clearInterval(t);
  }, [activeRoomId, loadMessages]);

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      const el = messagesContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    shouldAutoScrollRef.current = nearBottom;
  };

  const handleSend = async () => {
    const v = draft.trim();
    if (!v || activeRoomId == null) return;
    setDraft("");
    shouldAutoScrollRef.current = true;
    try {
      await sendChatMessage(activeRoomId, v);
      const m = await listChatMessages(activeRoomId);
      setMessages(m);
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

  const handleDelete = async (id: number) => {
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

  const handleDirectStart = async (otherUserId: string) => {
    const roomId = await getOrCreateDirectRoom(otherUserId);
    setShowDirect(false);
    await loadRooms();
    setActiveRoomId(roomId);
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-military-cream flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
      </div>
    );
  }

  const isAdmin = profile?.role === "admin";
  // Khi tính năng chat riêng bị tắt, ẩn các phòng chat riêng khỏi danh sách.
  const visibleRooms = directEnabled ? rooms : rooms.filter((r) => r.type !== "direct");
  const activeRoom = visibleRooms.find((r) => r.id === activeRoomId) || null;
  const map = new Map(members.map((p) => [p.id, p]));

  const roomLabel = (r: ChatRoomWithPeer) =>
    r.type === "direct" ? (r.peer?.full_name || "Chat riêng") : (r.name || "Phòng chat");

  return (
    <div className="min-h-screen bg-military-cream flex flex-col">
      <Navbar />

      <section className="flex-1 py-8 md:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-2 bg-military-red text-white px-4 py-2 rounded-full text-sm font-bold mb-3">
                <MessageCircle className="w-4 h-4" />
                Nhắn tin
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-military-red-dark">Phòng chat</h1>
              <p className="text-sm text-gray-600 mt-1">
                Trao đổi với đồng chí trong đơn vị qua phòng chung hoặc tin nhắn riêng.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {directEnabled && (
                <button
                  onClick={() => setShowDirect(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-military-red-dark text-sm font-bold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  Nhắn tin riêng
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-military-red text-white text-sm font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Tạo phòng
                </button>
              )}
            </div>
          </div>

          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-0 bg-white rounded-2xl border border-military-cream-dark overflow-hidden"
            style={{ minHeight: "560px" }}
          >
            {/* Danh sách phòng */}
            <div className="md:col-span-1 border-b md:border-b-0 md:border-r border-military-cream-dark flex flex-col">
              <div className="px-4 py-3 border-b border-military-cream-dark bg-military-cream/50">
                <p className="text-sm font-bold text-military-red-dark">Danh sách phòng ({visibleRooms.length})</p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingRooms ? (
                  <div className="flex items-center justify-center py-10">
                    <RefreshCw className="w-6 h-6 text-military-red animate-spin" />
                  </div>
                ) : visibleRooms.length === 0 ? (
                  <p className="px-4 py-10 text-sm text-gray-500 text-center">
                    {isAdmin ? (
                      <>
                        Chưa có phòng chat nào.
                        <br />
                        Bấm "Tạo phòng" hoặc "Nhắn tin riêng" để bắt đầu.
                      </>
                    ) : directEnabled ? (
                      <>
                        Chưa có cuộc trò chuyện nào.
                        <br />
                        Bấm "Nhắn tin riêng" để bắt đầu.
                      </>
                    ) : (
                      "Chưa có phòng chat nào. Vui lòng liên hệ quản trị viên."
                    )}
                  </p>
                ) : (
                  visibleRooms.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setActiveRoomId(r.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 border-b border-military-cream-dark/60 text-left transition-colors cursor-pointer ${
                        activeRoomId === r.id
                          ? "bg-military-red/10 border-l-4 border-l-military-red"
                          : "hover:bg-military-cream"
                      }`}
                    >
                      <span className="w-10 h-10 rounded-full bg-military-gold flex items-center justify-center shrink-0">
                        {r.type === "direct" ? (
                          <User className="w-5 h-5 text-military-red-dark" />
                        ) : (
                          <Users className="w-5 h-5 text-military-red-dark" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold text-military-red-dark truncate">
                          {roomLabel(r)}
                        </span>
                        <span className="block text-xs text-gray-500">
                          {new Date(r.updated_at).toLocaleDateString("vi-VN")}{" "}
                          {new Date(r.updated_at).toLocaleTimeString("vi-VN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </span>
                    </button>
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
                    {isAdmin
                      ? "Chọn một phòng chat bên trái, hoặc tạo phòng / nhắn tin riêng để bắt đầu."
                      : directEnabled
                        ? "Chọn một phòng chat bên trái, hoặc nhắn tin riêng để bắt đầu."
                        : "Chọn một phòng chat bên trái để bắt đầu nhắn tin."}
                  </p>
                </div>
              ) : (
                <>
                  <div className="px-4 py-3 border-b border-military-cream-dark bg-military-cream/50 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-military-red-dark truncate">
                        {roomLabel(activeRoom)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {activeRoom.type === "direct" ? "Trò chuyện riêng" : `${members.length} thành viên`}
                      </p>
                    </div>
                  </div>

                  <div
                    ref={messagesContainerRef}
                    onScroll={handleScroll}
                    className="flex-1 overflow-y-auto p-4 space-y-4 bg-military-cream/30"
                    style={{ maxHeight: "440px" }}
                  >
                    {loadingMsgs ? (
                      <div className="flex items-center justify-center py-10">
                        <RefreshCw className="w-6 h-6 text-military-red animate-spin" />
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-10">
                        Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!
                      </p>
                    ) : (
                      messages.map((m) => (
                        <MessageBubble
                          key={m.id}
                          message={m}
                          sender={map.get(m.sender_id)}
                          isOwn={m.sender_id === user.id}
                          canModify={isAdmin || m.sender_id === user.id}
                          onEdit={handleEdit}
                          onDelete={handleDelete}
                        />
                      ))
                    )}
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

          {error && <p className="mt-3 text-sm text-military-red">{error}</p>}
        </div>
      </section>

      <Footer />

      {showCreate && (
        <CreateRoomModal
          users={allUsers}
          currentUserId={user.id}
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}

      {showDirect && (
        <DirectChatModal
          users={allUsers}
          currentUserId={user.id}
          isAdmin={isAdmin}
          canMessageAdmin={adminChatEnabled}
          onClose={() => setShowDirect(false)}
          onStart={handleDirectStart}
        />
      )}
    </div>
  );
}