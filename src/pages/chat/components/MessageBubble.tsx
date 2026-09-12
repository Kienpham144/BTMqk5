import { useState } from "react";
import { Pencil, Trash2, Check, X, User } from "lucide-react";
import type { ChatMessage, Profile } from "@/lib/supabase";

function formatTime(iso: string) {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mm}, ${dd}/${mo}/${d.getFullYear()}`;
}

interface Props {
  message: ChatMessage;
  sender?: Profile;
  isOwn: boolean;
  canModify: boolean;
  onEdit: (id: number, content: string) => Promise<void>;
  onDelete: (id: number) => void;
}

export default function MessageBubble({ message, sender, isOwn, canModify, onEdit, onDelete }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const [busy, setBusy] = useState(false);

  const save = async () => {
    const v = draft.trim();
    if (!v || v === message.content) {
      setDraft(message.content);
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      await onEdit(message.id, v);
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
      <span className="w-9 h-9 rounded-full overflow-hidden bg-military-gold flex items-center justify-center shrink-0">
        {sender?.avatar_url ? (
          <img
            src={sender.avatar_url}
            alt={sender.full_name || "Ảnh đại diện"}
            className="w-full h-full object-cover object-top"
          />
        ) : (
          <User className="w-4 h-4 text-military-red-dark" />
        )}
      </span>

      <div className={`max-w-[70%] flex flex-col ${isOwn ? "items-end" : "items-start"}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-military-red-dark">
            {sender?.full_name || "Người dùng"}
          </span>
          <span className="text-[11px] text-gray-400">{formatTime(message.created_at)}</span>
        </div>

        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isOwn
              ? "bg-military-red text-white rounded-tr-sm"
              : "bg-white border border-military-cream-dark text-gray-800 rounded-tl-sm"
          }`}
        >
          {editing ? (
            <div className="min-w-[220px]">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={2}
                className="w-full bg-white/10 text-inherit rounded-md px-2 py-1 text-sm outline-none resize-none"
              />
              <div className="flex justify-end gap-1 mt-1">
                <button
                  onClick={save}
                  disabled={busy}
                  className="p-1 rounded hover:bg-black/10 cursor-pointer disabled:opacity-50"
                  title="Lưu"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setDraft(message.content);
                    setEditing(false);
                  }}
                  className="p-1 rounded hover:bg-black/10 cursor-pointer"
                  title="Hủy"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <span className="whitespace-pre-wrap break-words">{message.content}</span>
          )}
        </div>

        {message.edited && !editing && (
          <span className="text-[10px] text-gray-400 mt-0.5">(đã chỉnh sửa)</span>
        )}

        {canModify && !editing && (
          <div className="flex items-center gap-1 mt-1">
            <button
              onClick={() => {
                setDraft(message.content);
                setEditing(true);
              }}
              className="p-1 rounded text-gray-400 hover:text-military-red hover:bg-military-red/10 cursor-pointer"
              title="Sửa"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(message.id)}
              className="p-1 rounded text-gray-400 hover:text-military-red hover:bg-military-red/10 cursor-pointer"
              title="Xóa"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}