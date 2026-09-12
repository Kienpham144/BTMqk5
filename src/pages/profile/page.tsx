import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RefreshCw, ShieldCheck, Award } from "lucide-react";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import { useAuth } from "@/hooks/useAuth";
import { updateMyProfile } from "@/lib/supabase";
import AvatarUploader from "./components/AvatarUploader";
import ProfileForm from "./components/ProfileForm";
import ExamHistory from "./components/ExamHistory";

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, loading, refreshProfile } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login?redirect=/profile");
    }
  }, [loading, user, navigate]);

  const handleAvatarUploaded = async (url: string) => {
    try {
      await updateMyProfile({ avatar_url: url });
      await refreshProfile();
    } catch {
      // Bỏ qua lỗi tạm thời; người dùng có thể thử lại.
    }
  };

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen bg-military-cream flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-military-cream flex flex-col">
      <Navbar />

      <section className="py-10 md:py-14 flex-1">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 bg-military-red text-white px-4 py-2 rounded-full text-sm font-bold mb-3">
              <ShieldCheck className="w-4 h-4" />
              Trang cá nhân
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-military-red-dark">
              Hồ sơ người dùng
            </h1>
            <p className="text-sm text-foreground-600 mt-1">
              Quản lý ảnh đại diện và thông tin cá nhân của bạn.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="bg-white rounded-2xl border border-military-cream-dark p-6 flex flex-col items-center lg:sticky lg:top-24">
              <AvatarUploader
                url={profile.avatar_url}
                name={profile.full_name || profile.username || ""}
                onUploaded={handleAvatarUploaded}
              />

              <h2 className="mt-5 text-lg font-extrabold text-military-red-dark text-center">
                {profile.full_name || "Người dùng"}
              </h2>
              <p className="text-sm text-foreground-600">@{profile.username || "user"}</p>

              {profile.rank && (
                <span className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-military-gold/20 text-military-red-dark border border-military-gold/40">
                  <Award className="w-3.5 h-3.5" />
                  {profile.rank}
                </span>
              )}

              <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-military-red/10 text-military-red">
                {profile.role === "admin" ? "Quản trị viên" : "Người dùng"}
              </span>
            </div>

            <div className="lg:col-span-2">
              <ProfileForm profile={profile} onSaved={refreshProfile} />
            </div>
          </div>

          <ExamHistory userId={user.id} />
        </div>
      </section>

      <Footer />
    </div>
  );
}