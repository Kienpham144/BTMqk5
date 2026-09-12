import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  User,
  Lock,
  LogIn,
  LogOut,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  Play,
  BookOpen,
  Video,
  MessageSquare,
  ChevronRight,
  Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { signIn, signOut, getProfile, checkAdminRole } from "@/lib/supabase";

const QUICK_LINKS = [
  {
    label: "THI TRỰC TUYẾN",
    desc: "Vào phòng thi ngay",
    path: "/competitions",
    icon: Play,
    className: "bg-military-red hover:bg-military-red-dark border-military-red-dark",
  },
  {
    label: "THƯ VIỆN TÀI LIỆU",
    desc: "Văn bản, tài liệu số",
    path: "/materials",
    icon: BookOpen,
    className: "bg-military-green hover:bg-military-green-dark border-military-green-dark",
  },
  {
    label: "THƯ VIỆN VIDEO",
    desc: "Video, phóng sự, tư liệu",
    path: "/videos",
    icon: Video,
    className: "bg-military-gold hover:bg-military-gold-dark border-military-gold-dark",
  },
  {
    label: "ĐÓNG GÓP Ý KIẾN",
    desc: "Gửi góp ý, phản ánh",
    path: "/feedback",
    icon: MessageSquare,
    className: "bg-military-red-dark hover:bg-military-red border-military-red-dark",
  },
];

export default function HomeSidebar() {
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim() || !password) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }
    setLoginLoading(true);
    try {
      const u = await signIn(identifier, password);
      const p = await getProfile(u.id);
      let admin = p?.role === "admin";
      if (!admin) admin = await checkAdminRole();
      if (admin) {
        navigate("/admin");
      } else {
        navigate("/");
      }
      // Reset form sau khi đăng nhập thành công
      setIdentifier("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại, vui lòng thử lại.");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <aside className="space-y-5">
      {/* Khung đăng nhập */}
      <div className="bg-white rounded-xl border border-military-cream-dark overflow-hidden shadow-sm">
        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-military-red to-military-red-dark">
          <Shield className="w-5 h-5 text-military-gold shrink-0" />
          <h3 className="text-white font-extrabold text-sm uppercase tracking-wide whitespace-nowrap">
            Đăng Nhập Hệ Thống
          </h3>
        </div>

        {loading ? (
          <div className="px-4 py-8 text-center text-sm text-foreground-600">Đang tải...</div>
        ) : user ? (
          <div className="px-4 py-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-military-red-dark truncate">
                  {profile?.full_name || "Tài khoản"}
                </p>
                <p className="text-xs text-foreground-600 truncate">
                  {profile?.unit || (isAdmin ? "Quản trị viên" : "Thí sinh")}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {isAdmin && (
                <Link
                  to="/admin"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-military-red text-white text-xs font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap"
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Quản trị
                </Link>
              )}
              <Link
                to="/competitions"
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-military-red text-white text-xs font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5" />
                Tham gia thi
              </Link>
              <button
                onClick={handleLogout}
                className="col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2.5 bg-military-cream text-military-red-dark text-xs font-bold rounded-lg border border-military-cream-dark hover:bg-military-cream-dark transition-colors whitespace-nowrap cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                Đăng xuất
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="px-4 py-4 space-y-3">
            {error && (
              <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-2.5 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="relative">
              <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-military-cream-dark" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Tên đăng nhập"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-military-cream-dark bg-military-cream/40 text-sm text-foreground-900 focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
              />
            </div>

            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-military-cream-dark" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mật khẩu"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-military-cream-dark bg-military-cream/40 text-sm text-foreground-900 focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-military-red text-white text-sm font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
            >
              {loginLoading ? "Đang đăng nhập..." : "Đăng nhập"}
              {!loginLoading && <LogIn className="w-4 h-4" />}
            </button>

            <p className="text-center text-[11px] text-foreground-500 leading-relaxed">
              Chưa có tài khoản?{" "}
              <Link
                to="/login"
                className="text-military-red font-semibold hover:text-military-red-dark transition-colors"
              >
                Đăng ký / hướng dẫn
              </Link>
            </p>
          </form>
        )}
      </div>

      {/* Các nút nhanh */}
      <div className="space-y-3">
        {QUICK_LINKS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-white transition-transform hover:-translate-y-0.5 shadow-sm overflow-hidden ${item.className}`}
            >
              <span className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
                <Icon className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-extrabold uppercase tracking-wide whitespace-nowrap">
                  {item.label}
                </span>
                <span className="block text-xs text-white/85 whitespace-nowrap">
                  {item.desc}
                </span>
              </span>
              <span className="w-7 h-7 rounded-full bg-white flex items-center justify-center text-military-red-dark shrink-0">
                <ChevronRight className="w-4 h-4" />
              </span>
            </Link>
          );
        })}
      </div>
    </aside>
  );
}