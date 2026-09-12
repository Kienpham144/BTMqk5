import { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Menu, X, Search, User, LogOut, ShieldCheck, CalendarDays, ChevronLeft, ChevronRight, ChevronDown, Newspaper, Trophy, MessageCircle, Award, Quote, Scale } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { signOut, getUnreadChatCount, getRankingVisibility } from "@/lib/supabase";
import SearchModal from "@/components/feature/SearchModal";

const WEEKDAYS_VI = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

function formatVietnameseDate(d: Date) {
  const weekday = WEEKDAYS_VI[d.getDay()];
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${weekday}, ${dd}/${mm}/${d.getFullYear()}`;
}

export default function Navbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, profile, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [rankingVisible, setRankingVisible] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [today, setToday] = useState(() => new Date());
  const menuRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [eduOpen, setEduOpen] = useState(false);
  const [eduPos, setEduPos] = useState({ top: 0, left: 0 });
  const eduBtnRef = useRef<HTMLButtonElement>(null);
  const eduPanelRef = useRef<HTMLDivElement>(null);
  const eduSubRef = useRef<HTMLDivElement>(null);

  const updateScrollState = useCallback(() => {
    const el = menuRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = menuRef.current;
    if (!el) return;
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [updateScrollState]);

  const scrollMenu = (direction: "left" | "right") => {
    const el = menuRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -260 : 260, behavior: "smooth" });
  };

  useEffect(() => {
    setToday(new Date());
    const timer = setInterval(() => setToday(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  // Theo dõi tin nhắn chưa đọc để hiện dấu đỏ nhỏ trên ảnh đại diện.
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    let active = true;
    const poll = () => {
      getUnreadChatCount()
        .then((n) => {
          if (active) setUnreadCount(n);
        })
        .catch(() => {});
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user]);

  // Đọc trạng thái bật/tắt bảng xếp hạng để ẩn/hiện link tương ứng.
  useEffect(() => {
    let active = true;
    getRankingVisibility()
      .then((v) => {
        if (active) setRankingVisible(v);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await signOut();
    setMobileMenuOpen(false);
    navigate("/login");
  };

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (userMenuRef.current?.contains(e.target as Node)) return;
      setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userMenuOpen]);

  const eduSubLinks = [
    {
      label: "Cuộc Thi",
      desc: "Thi trực tuyến tìm hiểu pháp luật",
      path: "/competitions",
      icon: Trophy,
    },
    {
      label: "Bảng Xếp Hạng",
      desc: "Thứ hạng các thí sinh tham gia thi",
      path: "/bang-xep-hang",
      icon: Award,
    },
    {
      label: "Tin Phổ Biến Pháp Luật",
      desc: "Bản tin tuyên truyền, phổ biến pháp luật",
      path: "/pho-bien-phap-luat",
      icon: Newspaper,
    },
    {
      label: "Lời Bác Dạy",
      desc: "Những lời dạy của Chủ tịch Hồ Chí Minh",
      path: "/loi-bac-day",
      icon: Quote,
    },
    {
      label: "Mỗi Tuần Một Điều Luật",
      desc: "Tìm hiểu một điều luật mỗi tuần",
      path: "/moi-tuan-mot-dieu-luat",
      icon: Scale,
    },
  ];

  // Ẩn link bảng xếp hạng khi admin tắt chế độ xem công khai.
  const visibleEduSubLinks = rankingVisible
    ? eduSubLinks
    : eduSubLinks.filter((l) => l.path !== "/bang-xep-hang");

  const openEdu = () => {
    const el = eduBtnRef.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setEduPos({ top: r.bottom + 8, left: r.left });
    }
    setEduOpen(true);
  };

  const toggleEdu = () => {
    if (eduOpen) {
      setEduOpen(false);
    } else {
      openEdu();
    }
  };

  useEffect(() => {
    if (!eduOpen) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        eduPanelRef.current?.contains(t) ||
        eduBtnRef.current?.contains(t) ||
        eduSubRef.current?.contains(t)
      ) {
        return;
      }
      setEduOpen(false);
    };
    const onScroll = () => setEduOpen(false);
    document.addEventListener("mousedown", onDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [eduOpen]);

  useEffect(() => {
    if (!eduOpen || !eduBtnRef.current) return;
    const onResize = () => {
      const el = eduBtnRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setEduPos({ top: r.bottom + 8, left: r.left });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [eduOpen]);

  const navLinks = [
  { label: t("nav_partbuilding"), path: "/party-building" },
  { label: t("nav_edu"), path: "/competitions", dropdown: true },
  { label: t("nav_ideology"), path: "/bao-ve-nen-tang-tu-tuong" },
  { label: t("nav_hochiminh"), path: "/results" },
  { label: t("nav_emulation"), path: "/thi-dua-khen-thuong" },
  { label: t("nav_culture"), path: "/about" },
  { label: t("nav_masswork"), path: "/mass-work" },
];

  return (
    <>
      <header className="sticky top-0 z-50">
        {/* Top cream bar with logo + title + date */}
        <div className="pattern-traditional border-b border-military-gold/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4 py-3">
              <Link to="/" className="flex items-center gap-3 sm:gap-4 shrink-0">
                <img
                  src="https://static.readdy.ai/image/5da2d42334edd15ac9976d03a9e6ac0e/c5f13968d32ad47aae2a7bb23e002a71.png"
                  alt="Logo Thông Tin - Tuyên Truyền Bộ Tham Mưu Quân Khu 5"
                  className="h-12 w-12 sm:h-16 sm:w-16 shrink-0 object-contain rounded-full"
                />
                <div className="min-w-0">
                  <h1 className="text-military-red font-extrabold text-base sm:text-2xl leading-snug tracking-tight whitespace-nowrap">
                    THÔNG TIN - TUYÊN TRUYỀN
                  </h1>
                  <p className="text-military-red-dark font-bold text-xs sm:text-base leading-snug whitespace-nowrap">
                    BỘ THAM MƯU QUÂN KHU 5
                  </p>
                  <p className="text-military-gold-dark font-semibold text-[11px] sm:text-sm tracking-wider whitespace-nowrap">
                    19-12-1946
                  </p>
                </div>
              </Link>

              <div className="hidden md:flex items-center gap-2 text-military-red-dark">
                <CalendarDays className="w-5 h-5 text-military-gold-dark" />
                <span className="text-sm font-semibold">{formatVietnameseDate(today)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Red navigation bar */}
        <div className="bg-military-red">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between gap-4 min-h-12">
              <div className="flex items-center gap-1 min-w-0 flex-1">
                <button
                  aria-label="Cuộn menu sang trái"
                  onClick={() => scrollMenu("left")}
                  disabled={!canScrollLeft}
                  className="hidden lg:flex w-10 h-10 shrink-0 items-center justify-center rounded-full border-2 border-military-gold/80 bg-gradient-to-br from-military-gold to-military-gold-dark text-military-red-dark shadow-lg hover:scale-110 hover:border-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 arrow-glow cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                <nav
                  ref={menuRef}
                  onScroll={updateScrollState}
                  className="hidden lg:flex flex-1 items-center gap-5 xl:gap-6 overflow-x-auto scrollbar-hide py-2.5"
                >
                  <Link
                    to="/"
                    className="text-white text-sm font-bold uppercase tracking-wide hover:text-military-gold transition-colors whitespace-nowrap"
                  >
                    {t("nav_home")}
                  </Link>
                  {navLinks.map((link) =>
                    link.dropdown ? (
                      <button
                        key={link.path}
                        ref={eduBtnRef}
                        onClick={toggleEdu}
                        className="inline-flex items-center gap-1 text-white text-sm font-bold uppercase tracking-wide hover:text-military-gold transition-colors whitespace-nowrap cursor-pointer"
                      >
                        <span ref={eduSubRef}>{link.label}</span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            eduOpen ? "rotate-180 text-military-gold" : ""
                          }`}
                        />
                      </button>
                    ) : (
                      <Link
                        key={link.path}
                        to={link.path}
                        className="text-white text-sm font-bold uppercase tracking-wide hover:text-military-gold transition-colors whitespace-nowrap"
                      >
                        {link.label}
                      </Link>
                    ),
                  )}
                </nav>

                <button
                  aria-label="Cuộn menu sang phải"
                  onClick={() => scrollMenu("right")}
                  disabled={!canScrollRight}
                  className="hidden lg:flex w-10 h-10 shrink-0 items-center justify-center rounded-full border-2 border-military-gold/80 bg-gradient-to-br from-military-gold to-military-gold-dark text-military-red-dark shadow-lg hover:scale-110 hover:border-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100 arrow-glow cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>

              <div className="flex items-center gap-2 sm:gap-3 ml-auto lg:ml-0">
                <button
                  aria-label="Tìm kiếm"
                  onClick={() => setSearchOpen(true)}
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <Search className="w-5 h-5" />
                </button>

                {user ? (
                  <div className="relative" ref={userMenuRef}>
                    <button
                      onClick={() => setUserMenuOpen((v) => !v)}
                      className="inline-flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 bg-white/10 border border-white/30 rounded-full text-white hover:bg-white/20 transition-colors cursor-pointer"
                    >
                      <span className="relative shrink-0">
                        <span className="w-8 h-8 rounded-full overflow-hidden bg-military-gold flex items-center justify-center">
                          {profile?.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={profile?.full_name || "Ảnh đại diện"}
                              className="w-full h-full object-cover object-top"
                            />
                          ) : (
                            <User className="w-4 h-4 text-military-red-dark" />
                          )}
                        </span>
                        {unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-600 text-white text-[10px] font-bold leading-none flex items-center justify-center border-2 border-white">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </span>
                      <span className="hidden sm:inline text-xs font-bold whitespace-nowrap max-w-[120px] truncate">
                        {profile?.full_name || "Tài khoản"}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-200 ${userMenuOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {userMenuOpen && (
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl border-2 border-military-gold/40 shadow-2xl shadow-military-red/10 overflow-hidden z-[60]">
                        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-military-red to-military-red-dark">
                          <span className="w-10 h-10 rounded-full overflow-hidden bg-military-gold flex items-center justify-center shrink-0">
                            {profile?.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt={profile?.full_name || "Ảnh đại diện"}
                                className="w-full h-full object-cover object-top"
                              />
                            ) : (
                              <User className="w-5 h-5 text-military-red-dark" />
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {profile?.full_name || "Tài khoản"}
                            </p>
                            <p className="text-xs text-white/70 truncate">@{profile?.username || "user"}</p>
                          </div>
                        </div>

                        <div className="p-2">
                          <Link
                            to="/profile"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground-800 hover:bg-military-cream transition-colors"
                          >
                            <User className="w-4 h-4 text-military-red" />
                            Hồ sơ người dùng
                          </Link>
                          <Link
                            to="/chat"
                            onClick={() => setUserMenuOpen(false)}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground-800 hover:bg-military-cream transition-colors"
                          >
                            <MessageCircle className="w-4 h-4 text-military-red" />
                            Phòng chat
                          </Link>
                          {rankingVisible && (
                            <Link
                              to="/bang-xep-hang"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground-800 hover:bg-military-cream transition-colors"
                            >
                              <Award className="w-4 h-4 text-military-red" />
                              Bảng xếp hạng
                            </Link>
                          )}
                          {isAdmin && (
                            <Link
                              to="/admin"
                              onClick={() => setUserMenuOpen(false)}
                              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground-800 hover:bg-military-cream transition-colors"
                            >
                              <ShieldCheck className="w-4 h-4 text-military-red" />
                              Trang quản trị
                            </Link>
                          )}
                          <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-military-red hover:bg-military-red/10 transition-colors cursor-pointer"
                          >
                            <LogOut className="w-4 h-4" />
                            Đăng xuất
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => { navigate("/login"); }}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-white text-military-red text-xs font-bold rounded-lg hover:bg-military-gold transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{t("nav_login")}</span>
                    <span className="sm:hidden">{t("nav_login")}</span>
                  </button>
                )}

                <button
                  className="lg:hidden w-10 h-10 flex items-center justify-center text-white"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
              </div>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="lg:hidden bg-military-red-dark border-t border-white/10">
              <div className="px-4 py-4 space-y-1">
                <Link
                  to="/"
                  className="block px-4 py-3 text-sm font-bold uppercase text-white hover:bg-white/10 rounded-md transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {t("nav_home")}
                </Link>
                {navLinks.map((link) =>
                  link.dropdown ? (
                    <div key={link.path}>
                      <div className="px-4 py-3 text-sm font-bold uppercase text-military-gold">
                        {link.label}
                      </div>
                      {visibleEduSubLinks.map((sub) => {
                        const Icon = sub.icon;
                        return (
                          <Link
                            key={sub.path}
                            to={sub.path}
                            className="flex items-center gap-2 pl-10 pr-4 py-2.5 text-sm text-white hover:bg-white/10 rounded-md transition-colors"
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <Icon className="w-4 h-4 text-military-gold/70" />
                            {sub.label}
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <Link
                      key={link.path}
                      to={link.path}
                      className="block px-4 py-3 text-sm font-bold uppercase text-white hover:bg-white/10 rounded-md transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {link.label}
                    </Link>
                  ),
                )}
                {user && (
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-4 h-4 text-military-gold" />
                    Hồ sơ người dùng
                  </Link>
                )}
                {user && (
                  <Link
                    to="/chat"
                    className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <MessageCircle className="w-4 h-4 text-military-gold" />
                    Phòng chat
                  </Link>
                )}
                {user && rankingVisible && (
                  <Link
                    to="/bang-xep-hang"
                    className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-white hover:bg-white/10 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Award className="w-4 h-4 text-military-gold" />
                    Bảng xếp hạng
                  </Link>
                )}
                {user && isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-military-gold hover:bg-white/10 rounded-md transition-colors"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Trang quản trị
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    if (user) {
                      handleLogout();
                    } else {
                      navigate("/login");
                    }
                  }}
                  className="flex items-center gap-2 w-full text-left px-4 py-3 text-sm font-bold text-military-gold hover:bg-white/10 rounded-md transition-colors cursor-pointer"
                >
                  {user ? <LogOut className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  {user ? "Đăng xuất" : t("nav_login")}
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      <SearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />

      {eduOpen && (
        <div
          ref={eduPanelRef}
          className="fixed z-[60] w-80 bg-white rounded-xl border-2 border-military-gold/50 shadow-2xl shadow-military-red/10 overflow-hidden"
          style={{ top: eduPos.top, left: eduPos.left }}
        >
          <div className="bg-gradient-to-r from-military-red to-military-red-dark px-4 py-3">
            <p className="text-white text-xs font-bold uppercase tracking-wide">
              {t("nav_edu")}
            </p>
          </div>
          <div className="p-2">
            {visibleEduSubLinks.map((sub) => {
              const Icon = sub.icon;
              return (
                <Link
                  key={sub.path}
                  to={sub.path}
                  onClick={() => setEduOpen(false)}
                  className="flex items-center gap-3 rounded-lg p-3 hover:bg-military-cream transition-colors group"
                >
                  <span className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red group-hover:bg-military-red group-hover:text-white transition-colors shrink-0">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-bold text-military-red-dark group-hover:text-military-red transition-colors">
                      {sub.label}
                    </span>
                    <span className="block text-xs text-foreground-600">
                      {sub.desc}
                    </span>
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
