import { useRef, useState } from "react";
import { Camera, Loader2, User } from "lucide-react";
import { uploadAvatar } from "@/lib/supabase";

interface AvatarUploaderProps {
  url: string | null;
  name: string;
  editable?: boolean;
  onUploaded: (url: string) => void;
}

export default function AvatarUploader({ url, name, editable = true, onUploaded }: AvatarUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const initial = (name || "?").trim().charAt(0).toUpperCase();

  const handlePick = () => {
    if (uploading) return;
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Vui lòng chọn tệp hình ảnh.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ảnh không được vượt quá 5MB.");
      return;
    }

    setUploading(true);
    try {
      const newUrl = await uploadAvatar(file);
      onUploaded(newUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tải ảnh thất bại.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-lg bg-military-cream flex items-center justify-center">
          {url ? (
            <img src={url} alt={name || "Ảnh đại diện"} className="w-full h-full object-cover object-top" />
          ) : (
            <span className="text-military-red font-extrabold text-4xl">
              {initial === "?" ? <User className="w-12 h-12" /> : initial}
            </span>
          )}
        </div>

        {editable && (
          <button
            type="button"
            onClick={handlePick}
            disabled={uploading}
            title="Tải ảnh đại diện lên"
            className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full bg-military-red text-white flex items-center justify-center border-2 border-white hover:bg-military-red-dark transition-colors disabled:opacity-60 cursor-pointer"
          >
            {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Camera className="w-5 h-5" />}
          </button>
        )}
      </div>

      {editable && (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleChange}
          />
          <button
            type="button"
            onClick={handlePick}
            disabled={uploading}
            className="mt-3 text-sm font-semibold text-military-red hover:text-military-red-dark transition-colors disabled:opacity-60 cursor-pointer"
          >
            {uploading ? "Đang tải lên..." : "Đổi ảnh đại diện"}
          </button>
          {error && <p className="mt-2 text-xs text-military-red text-center">{error}</p>}
        </>
      )}
    </div>
  );
}