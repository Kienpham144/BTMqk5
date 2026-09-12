import { useState } from "react";
import { Pencil, Save, X, CheckCircle2, Loader2, MapPin, Home, Award, Briefcase, Building2, User } from "lucide-react";
import { updateMyProfile, type Profile } from "@/lib/supabase";

interface ProfileFormProps {
  profile: Profile;
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

const EMPTY: FormState = {
  full_name: "",
  rank: "",
  position: "",
  unit: "",
  hometown: "",
  residence: "",
};

export default function ProfileForm({ profile, onSaved }: ProfileFormProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>({
    full_name: profile.full_name || "",
    rank: profile.rank || "",
    position: profile.position || "",
    unit: profile.unit || "",
    hometown: profile.hometown || "",
    residence: profile.residence || "",
  });

  const startEdit = () => {
    setForm({
      full_name: profile.full_name || "",
      rank: profile.rank || "",
      position: profile.position || "",
      unit: profile.unit || "",
      hometown: profile.hometown || "",
      residence: profile.residence || "",
    });
    setMessage("");
    setError("");
    setEditing(true);
  };

  const cancel = () => {
    setEditing(false);
    setError("");
  };

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.full_name.trim()) {
      setError("Vui lòng nhập họ và tên.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateMyProfile(form);
      setMessage("Đã cập nhật hồ sơ thành công!");
      setEditing(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cập nhật hồ sơ thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    { key: "full_name", label: "Họ và tên", icon: User, value: profile.full_name },
    { key: "rank", label: "Cấp bậc", icon: Award, value: profile.rank },
    { key: "position", label: "Chức vụ", icon: Briefcase, value: profile.position },
    { key: "unit", label: "Đơn vị", icon: Building2, value: profile.unit },
    { key: "hometown", label: "Quê quán", icon: MapPin, value: profile.hometown },
    { key: "residence", label: "Trú quán", icon: Home, value: profile.residence },
  ] as const;

  return (
    <div className="bg-white rounded-2xl border border-military-cream-dark p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-military-red-dark">Hồ sơ người dùng</h2>
            <p className="text-xs text-foreground-600">Thông tin cá nhân của bạn</p>
          </div>
        </div>

        {!editing ? (
          <button
            onClick={startEdit}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-military-red text-white text-sm font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
          >
            <Pencil className="w-4 h-4" />
            Chỉnh sửa
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={cancel}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-foreground-700 text-sm font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
            >
              <X className="w-4 h-4" />
              Hủy
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-red text-white text-sm font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-60 whitespace-nowrap cursor-pointer"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? "Đang lưu..." : "Lưu"}
            </button>
          </div>
        )}
      </div>

      {message && (
        <div className="flex items-center gap-2 bg-military-green/10 text-military-green rounded-lg p-3 mb-4 text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{message}</span>
        </div>
      )}
      {error && (
        <div className="bg-military-red/5 text-military-red rounded-lg p-3 mb-4 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rows.map((row) => {
          const Icon = row.icon;
          return (
            <div key={row.key}>
              <label className="flex items-center gap-1.5 text-xs font-bold text-military-red-dark uppercase tracking-wide mb-1.5">
                <Icon className="w-3.5 h-3.5 text-military-gold-dark" />
                {row.label}
              </label>
              {editing ? (
                <input
                  type="text"
                  value={form[row.key]}
                  onChange={(e) => setField(row.key, e.target.value)}
                  placeholder={`Nhập ${row.label.toLowerCase()}`}
                  className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-military-cream/40 text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
                />
              ) : (
                <p className="px-4 py-3 rounded-lg bg-military-cream/40 text-sm font-semibold text-foreground-800 min-h-[46px] flex items-center">
                  {row.value || <span className="text-foreground-400 font-normal">Chưa cập nhật</span>}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {!editing && (
        <p className="mt-5 text-xs text-foreground-500">
          Mẹo: nhấn <strong>Chỉnh sửa</strong> để tự cập nhật quê quán, trú quán và các thông tin khác của bạn.
        </p>
      )}
    </div>
  );
}