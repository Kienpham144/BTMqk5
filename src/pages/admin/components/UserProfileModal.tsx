import { useState } from "react";
import { X, Save, Loader2, UserCog, CheckCircle2 } from "lucide-react";
import { updateProfile, type Profile } from "@/lib/supabase";
import AvatarUploader from "@/pages/profile/components/AvatarUploader";

interface UserProfileModalProps {
  user: Profile;
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  full_name: string;
  rank: string;
  position: string;
  unit: string;
  hometown: string;
  residence: string;
}

export default function UserProfileModal({ user, onClose, onSaved }: UserProfileModalProps) {
  const [form, setForm] = useState<FormState>({
    full_name: user.full_name || "",
    rank: user.rank || "",
    position: user.position || "",
    unit: user.unit || "",
    hometown: user.hometown || "",
    residence: user.residence || "",
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user.avatar_url);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleAvatarUploaded = async (url: string) => {
    setAvatarUrl(url);
    try {
      await updateProfile(user.id, { avatar_url: url });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được ảnh đại diện.");
    }
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateProfile(user.id, form);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const fields: Array<{ key: keyof FormState; label: string; placeholder: string }> = [
    { key: "full_name", label: "Họ và tên", placeholder: "Nguyễn Văn A" },
    { key: "rank", label: "Cấp bậc", placeholder: "Thượng tá" },
    { key: "position", label: "Chức vụ", placeholder: "Trợ lý" },
    { key: "unit", label: "Đơn vị", placeholder: "Phòng Chính trị" },
    { key: "hometown", label: "Quê quán", placeholder: "Xã..., Huyện..., Tỉnh..." },
    { key: "residence", label: "Trú quán", placeholder: "Số nhà..., Phường..., Quận..." },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl border border-military-cream-dark w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-military-cream-dark sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
              <UserCog className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-military-red-dark">Hồ sơ người dùng</h3>
              <p className="text-xs text-foreground-600">@{user.username || "user"}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-cream transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex flex-col items-center mb-6">
            <AvatarUploader
              url={avatarUrl}
              name={form.full_name || user.username || ""}
              onUploaded={handleAvatarUploaded}
            />
          </div>

          {saved && (
            <div className="flex items-center gap-2 bg-military-green/10 text-military-green rounded-lg p-3 mb-4 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              Đã cập nhật ảnh đại diện.
            </div>
          )}
          {error && (
            <div className="bg-military-red/5 text-military-red rounded-lg p-3 mb-4 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="block text-xs font-bold text-military-red-dark uppercase tracking-wide mb-1.5">
                  {f.label}
                </label>
                <input
                  type="text"
                  value={form[f.key]}
                  onChange={(e) => setField(f.key, e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-military-cream/40 text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-military-cream-dark sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-foreground-700 font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Đang lưu..." : "Lưu hồ sơ"}
          </button>
        </div>
      </div>
    </div>
  );
}