import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Lock, User, ArrowRight, ShieldCheck, AlertCircle, ChevronLeft } from "lucide-react";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import { signIn, getProfile, checkAdminRole } from "@/lib/supabase";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!identifier.trim() || !password) {
      setError("Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.");
      return;
    }
    setLoading(true);
    try {
      const user = await signIn(identifier, password);
      const profile = await getProfile(user.id);
      let isAdmin = profile?.role === "admin";
      if (!isAdmin) {
        isAdmin = await checkAdminRole();
      }
      if (isAdmin) {
        navigate("/admin");
      } else if (redirectTo && redirectTo !== "/") {
        navigate(redirectTo);
      } else {
        navigate("/");
      }
      return;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đăng nhập thất bại, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-military-cream">
      <Navbar />

      <section className="py-16 md:py-24">
        <div className="max-w-md mx-auto px-4 sm:px-6">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-military-red text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
              <ShieldCheck className="w-4 h-4" />
              Đăng Nhập Hệ Thống
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-military-red-dark">
              Đăng Nhập Tài Khoản
            </h1>
            <p className="text-foreground-700 text-sm mt-2">
              Sử dụng tài khoản được cấp để tham gia cuộc thi và tra cứu kết quả.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-military-cream-dark p-6 md:p-8">
            {error && (
              <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 mb-5 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                  Tên đăng nhập hoặc Email
                </label>
                <div className="relative">
                  <User className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Nhập tên đăng nhập"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-military-cream-dark bg-military-cream/50 text-sm text-foreground-900 focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-foreground-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Nhập mật khẩu"
                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-military-cream-dark bg-military-cream/50 text-sm text-foreground-900 focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
              >
                {loading ? "Đang đăng nhập..." : "Đăng nhập"}
                {!loading && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>

          </div>

          <div className="text-center mt-6">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground-600 hover:text-military-red transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Quay về trang chủ
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}