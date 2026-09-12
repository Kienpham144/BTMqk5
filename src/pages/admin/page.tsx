import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  UserPlus,
  Trophy,
  Users,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Crown,
  Newspaper,
  LayoutTemplate,
  FileText,
  Video,
  MessageCircle,
  Megaphone,
} from "lucide-react";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import { useAuth } from "@/hooks/useAuth";
import { signOut, checkAdminRole } from "@/lib/supabase";
import CreateAccounts from "./components/CreateAccounts";
import UserManagement from "./components/UserManagement";
import AdminManagement from "./components/AdminManagement";
import ResultsTable from "./components/ResultsTable";
import CompetitionManagement from "./components/CompetitionManagement";
import NewsManagement from "./components/NewsManagement";
import HomeHeroManagement from "./components/HomeHeroManagement";
import DocumentManagement from "./components/DocumentManagement";
import VideoManagement from "./components/VideoManagement";
import ChatManagement from "./components/ChatManagement";
import AnnouncementManagement from "./components/AnnouncementManagement";

export default function Admin() {
  const navigate = useNavigate();
  const { user, profile, isAdmin, loading } = useAuth();

  const [tab, setTab] = useState<"create" | "users" | "admins" | "results" | "competition" | "news" | "home" | "announcement" | "documents" | "videos" | "chat">("create");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    let active = true;
    if (loading) return;
    if (!user) {
      navigate("/login?redirect=/admin");
      return;
    }
    if (isAdmin) {
      setVerified(true);
      return;
    }
    checkAdminRole()
      .then((ok) => {
        if (!active) return;
        setVerified(ok);
        if (!ok) navigate("/");
      })
      .catch(() => {
        if (!active) return;
        setVerified(false);
        navigate("/");
      });
    return () => {
      active = false;
    };
  }, [loading, user, isAdmin, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  if (loading || !user || (!isAdmin && !verified)) {
    return (
      <div className="min-h-screen bg-military-cream flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-military-cream">
      <Navbar />

      <section className="py-10 md:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
            <div>
              <div className="inline-flex items-center gap-2 bg-military-red text-white px-4 py-2 rounded-full text-sm font-bold mb-3">
                <ShieldCheck className="w-4 h-4" />
                Trang Quản Trị
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-military-red-dark">
                Xin chào, ADMIN
              </h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 bg-military-gold text-military-red-dark px-4 py-2 rounded-full text-sm font-bold border-2 border-military-gold-dark">
                <Crown className="w-4 h-4" />
                ADMIN
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-military-red-dark font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-white border border-military-cream-dark rounded-full p-1 mb-8 w-fit overflow-x-auto max-w-full">
            <button
              onClick={() => setTab("create")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                tab === "create" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Tạo tài khoản
            </button>
            <button
              onClick={() => setTab("users")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                tab === "users" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
              }`}
            >
              <Users className="w-4 h-4" />
              Quản lý tài khoản
            </button>
            <button
              onClick={() => setTab("admins")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                tab === "admins" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              Quản trị viên
            </button>
            <button
              onClick={() => setTab("competition")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                tab === "competition" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
              }`}
            >
              <Trophy className="w-4 h-4" />
              Quản lý cuộc thi
            </button>
            <button
              onClick={() => setTab("news")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                tab === "news" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
              }`}
            >
              <Newspaper className="w-4 h-4" />
              Quản lý bài viết
            </button>
            <button
              onClick={() => setTab("results")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                tab === "results" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
              }`}
            >
              <Trophy className="w-4 h-4" />
              Kết quả thi
            </button>
            <button
              onClick={() => setTab("home")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                tab === "home" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
              }`}
            >
              <LayoutTemplate className="w-4 h-4" />
              Trang chủ
            </button>
            <button
              onClick={() => setTab("announcement")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                tab === "announcement" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
              }`}
            >
              <Megaphone className="w-4 h-4" />
              Thông báo
            </button>
            <button
              onClick={() => setTab("documents")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                tab === "documents" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
              }`}
            >
              <FileText className="w-4 h-4" />
              Tài liệu
            </button>
            <button
              onClick={() => setTab("videos")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                tab === "videos" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
              }`}
            >
              <Video className="w-4 h-4" />
              Video
            </button>
            <button
              onClick={() => setTab("chat")}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                tab === "chat" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Phòng chat
            </button>
          </div>

          {tab === "create" && <CreateAccounts />}
          {tab === "users" && <UserManagement />}
          {tab === "admins" && <AdminManagement />}
          {tab === "competition" && <CompetitionManagement />}
          {tab === "news" && <NewsManagement />}
          {tab === "results" && <ResultsTable />}
          {tab === "home" && <HomeHeroManagement />}
          {tab === "announcement" && <AnnouncementManagement />}
          {tab === "documents" && <DocumentManagement />}
          {tab === "videos" && <VideoManagement />}
          {tab === "chat" && <ChatManagement />}
        </div>
      </section>

      <Footer />
    </div>
  );
}