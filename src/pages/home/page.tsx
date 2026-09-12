import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  Play,
  BookOpen,
  ArrowRight,
  Calendar,
  Flame,
  Newspaper,
  RefreshCw,
  Image as ImageIcon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import Navbar from "@/components/feature/Navbar";
import AnnouncementBar from "@/components/feature/AnnouncementBar";
import Footer from "@/components/feature/Footer";
import CompetitionCard from "@/components/feature/CompetitionCard";
import NewsModal from "@/components/feature/NewsModal";
import NewsCarousel from "@/components/feature/NewsCarousel";
import HomeSidebar from "@/pages/home/components/HomeSidebar";
import OnlineUsersWidget from "@/components/feature/OnlineUsersWidget";
import { listFeaturedNews, listFeaturedCompetitions, getSiteStats, incrementSiteVisits, listHomeHeroes, getNewsById, type NewsPost, type SiteStats, type Competition, type HomeHero } from "@/lib/supabase";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
}

export default function Home() {
  const { t } = useTranslation();
  const [news, setNews] = useState<NewsPost[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState("");
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);
  const [featuredComps, setFeaturedComps] = useState<Competition[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [stats, setStats] = useState<SiteStats>({
    questions: 0,
    competitions: 0,
    participants: 0,
    units: 0,
    visits: 0,
    news: 0,
  });

  const heroComp = featuredComps.find((c) => c.status === "open") ?? featuredComps[0];

  const [heroes, setHeroes] = useState<HomeHero[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [heroNews, setHeroNews] = useState<NewsPost | null>(null);

  useEffect(() => {
    let active = true;
    listHomeHeroes()
      .then((data) => {
        if (!active) return;
        setHeroes(data);
      })
      .catch(() => {
        /* giữ giá trị fallback nếu không tải được */
      });
    return () => {
      active = false;
    };
  }, []);

  const goToSlide = useCallback((index: number) => {
    setCurrentSlide(index);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (heroes.length ? (prev + 1) % heroes.length : 0));
  }, [heroes.length]);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (heroes.length ? (prev - 1 + heroes.length) % heroes.length : 0));
  }, [heroes.length]);

  useEffect(() => {
    if (heroes.length <= 1) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [heroes.length, nextSlide]);

  useEffect(() => {
    setCurrentSlide(0);
  }, [heroes.length]);

  const hero = heroes[currentSlide] ?? null;

  // Banner loại "Tin / Bản tin": nạp sẵn bản tin gắn kèm để nút bấm mở đúng tin đó.
  useEffect(() => {
    const current = heroes[currentSlide];
    if (!current || current.type !== "news" || current.news_id == null) {
      setHeroNews(null);
      return;
    }
    let active = true;
    getNewsById(current.news_id)
      .then((post) => {
        if (active) setHeroNews(post);
      })
      .catch(() => {
        if (active) setHeroNews(null);
      });
    return () => {
      active = false;
    };
  }, [heroes, currentSlide]);

  // Mỗi lần mở trang chủ: đếm lượt truy cập trước, sau đó nạp thống kê để số hiển thị đồng bộ.
  useEffect(() => {
    let active = true;
    incrementSiteVisits()
      .then(() => getSiteStats())
      .then((data) => {
        if (!active) return;
        setStats(data);
      })
      .catch(() => {
        /* giữ giá trị mặc định nếu không đếm/nạp được */
        if (!active) return;
        getSiteStats()
          .then((data) => {
            if (active) setStats(data);
          })
          .catch(() => {});
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    listFeaturedCompetitions(4)
      .then((data) => {
        if (!active) return;
        setFeaturedComps(data);
        setFeaturedLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setFeaturedLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    listFeaturedNews()
      .then((data) => {
        if (!active) return;
        setNews(data);
        setNewsLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setNewsError(err instanceof Error ? err.message : "Không thể tải bản tin.");
        setNewsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const heroTitle = hero?.title || "THI TÌM HIỂU 80 NĂM THÀNH LẬP BỘ THAM MƯU QUÂN KHU 5";
  const heroDescription =
    hero?.description ||
    "Cuộc thi trực tuyến nhằm ôn tập, kiểm tra kiến thức về điều lệnh quản lý bộ đội, tác phong quân nhân và các quy định của ngành cho cán bộ, chiến sĩ toàn quân khu.";
  const heroBadge = hero?.badge || t("hero_badge");
  const heroImage =
    hero?.image_url ||
    "https://static.readdy.ai/image/5da2d42334edd15ac9976d03a9e6ac0e/759f146f6a1530989a4b6a96dd2d4fdf.png";
  const heroLinkId = hero?.competition_id ?? heroComp?.id ?? null;

  return (
    <div className="min-h-screen bg-military-cream">
      <Navbar />
      <AnnouncementBar />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">
          <div className="grid lg:grid-cols-12 gap-8 items-start">
            {/* Nội dung + banner (bên trái) */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-2xl border border-military-cream-dark p-6 md:p-8 shadow-sm">
                <div className="inline-flex items-center gap-2 bg-military-red text-white px-4 py-2 rounded-full text-sm font-bold mb-5">
                  <Flame className="w-4 h-4" />
                  {heroBadge}
                </div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-military-red-dark leading-tight mb-5">
                  {heroTitle}
                </h1>
                <p className="text-foreground-700 text-lg mb-6 leading-relaxed max-w-3xl">
                  {heroDescription}
                </p>
                <div className="flex flex-wrap gap-4 mb-8">
                  {hero?.type === "news" ? (
                    heroNews ? (
                      <button
                        onClick={() => setSelectedPost(heroNews)}
                        className="inline-flex items-center gap-2 px-7 py-3.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-all shadow-lg shadow-military-red/20 whitespace-nowrap cursor-pointer"
                      >
                        <Newspaper className="w-5 h-5" />
                        Xem bản tin
                      </button>
                    ) : (
                      <Link
                        to="/news"
                        className="inline-flex items-center gap-2 px-7 py-3.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-all shadow-lg shadow-military-red/20 whitespace-nowrap"
                      >
                        <Newspaper className="w-5 h-5" />
                        Xem bản tin
                      </Link>
                    )
                  ) : (
                    <Link
                      to={heroLinkId ? `/competition/${heroLinkId}` : "/competitions"}
                      className="inline-flex items-center gap-2 px-7 py-3.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-all shadow-lg shadow-military-red/20 whitespace-nowrap"
                    >
                      <Play className="w-5 h-5" />
                      {t("hero_join")}
                    </Link>
                  )}
                  <Link
                    to="/materials"
                    className="inline-flex items-center gap-2 px-7 py-3.5 bg-white text-military-red-dark font-bold rounded-lg border-2 border-military-red hover:bg-military-red/5 transition-all"
                  >
                    <BookOpen className="w-5 h-5" />
                    {t("hero_learn")}
                  </Link>
                </div>

                <div className="relative mt-2">
                  <div className="absolute -inset-3 bg-military-red/10 rounded-3xl blur-2xl" />
                  <div className="relative rounded-2xl overflow-hidden border border-military-cream-dark">
                    <img
                      src={heroImage}
                      alt="Banner Quân khu 5"
                      className="w-full h-56 md:h-72 object-cover object-top"
                    />
                  </div>
                </div>

                {/* Điều khiển slideshow */}
                {heroes.length > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-6">
                    <button
                      onClick={prevSlide}
                      aria-label="Banner trước"
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-military-red-dark border-2 border-military-cream-dark hover:border-military-red transition-colors cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                      {heroes.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => goToSlide(idx)}
                          aria-label={`Chuyển đến banner ${idx + 1}`}
                          className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                            idx === currentSlide
                              ? "bg-military-red w-6"
                              : "bg-military-cream-dark hover:bg-military-gold"
                          }`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={nextSlide}
                      aria-label="Banner tiếp theo"
                      className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-military-red-dark border-2 border-military-cream-dark hover:border-military-red transition-colors cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Khung đăng nhập + nút nhanh (bên phải) */}
            <div className="lg:col-span-4">
              <HomeSidebar />
            </div>
          </div>
        </div>
      </section>

      {/* Dải tin tự động lướt ngang ngay dưới banner hero */}
      <section className="py-12 md:py-16 bg-military-cream border-t border-military-cream-dark">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-military-red flex items-center justify-center text-white shrink-0">
                <Newspaper className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-military-red-dark">
                  Tin Tức Nổi Bật
                </h2>
                <p className="text-foreground-600 text-sm">
                  Tự động lướt qua các tin từ mọi chuyên mục — bấm vào để xem chi tiết
                </p>
              </div>
            </div>
          </div>
          <NewsCarousel />
        </div>
      </section>

      {/* Bản tin thời sự đầu trang */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-military-red flex items-center justify-center text-white shrink-0">
                <Newspaper className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl md:text-3xl font-extrabold text-military-red-dark">
                  Bản Tin Thời Sự
                </h2>
                <p className="text-foreground-600 text-sm">
                  Các hoạt động, sự kiện nổi bật của Bộ Tham mưu Quân khu 5
                </p>
              </div>
            </div>
            <Link
              to="/news"
              className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-military-red hover:text-military-red-dark transition-colors whitespace-nowrap"
            >
              Xem tất cả
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedPost(item)}
                className="group bg-white rounded-xl overflow-hidden border border-military-cream-dark hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-left h-full cursor-pointer"
              >
                <div className="relative h-48 overflow-hidden bg-military-cream">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.title}
                      className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-military-gold-dark">
                      <ImageIcon className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <div className="absolute top-3 left-3">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-military-gold text-military-red-dark">
                      {item.category}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center gap-1 text-xs text-foreground-500 mb-2">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  <h3 className="font-bold text-military-red-dark mb-3 group-hover:text-military-red transition-colors line-clamp-2">
                    {item.title}
                  </h3>
                  {item.content && (
                    <p className="text-sm text-foreground-700 mb-3 line-clamp-2">
                      {item.content}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-military-red hover:text-military-red-dark transition-colors">
                    {t("news_read_more")}
                    <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Cuộc thi nổi bật */}
      <section className="bg-white py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold text-military-red-dark mb-3">
              Cuộc Thi Nổi Bật
            </h2>
            <p className="text-foreground-700 max-w-2xl mx-auto">
              Các cuộc thi trực tuyến đang diễn ra và sắp được tổ chức trong thời gian tới
            </p>
          </div>
          {featuredLoading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
            </div>
          ) : featuredComps.length === 0 ? (
            <div className="text-center text-foreground-600 py-12">
              <Flame className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
              <p className="text-sm">Chưa có cuộc thi nổi bật nào.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {featuredComps.map((comp) => (
                <CompetitionCard key={comp.id} comp={comp} />
              ))}
            </div>
          )}
          <div className="text-center mt-10">
            <Link
              to="/competitions"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-military-red text-military-red font-bold rounded-lg hover:bg-military-red hover:text-white transition-all whitespace-nowrap"
            >
              Xem tất cả cuộc thi
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Thống kê số liệu thật */}
      <section className="bg-military-cream py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-military-red-dark rounded-2xl px-6 py-10 md:px-10 md:py-12 grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-extrabold text-white mb-1">
                {stats.visits.toLocaleString("vi-VN")}
              </div>
              <div className="text-white/70 text-sm">Lượt truy cập</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-extrabold text-white mb-1">
                {stats.news.toLocaleString("vi-VN")}
              </div>
              <div className="text-white/70 text-sm">Số tin bài</div>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-extrabold text-white mb-1">
                {stats.participants.toLocaleString("vi-VN")}
              </div>
              <div className="text-white/70 text-sm">Lượt tham gia thi</div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <OnlineUsersWidget />

      <NewsModal post={selectedPost} onClose={() => setSelectedPost(null)} />
    </div>
  );
}