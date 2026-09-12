import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Newspaper, RefreshCw, AlertCircle } from "lucide-react";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import NewsCard from "@/components/feature/NewsCard";
import NewsModal from "@/components/feature/NewsModal";
import {
  listNewsByCategory,
  listPublishedNews,
  type NewsPost,
} from "@/lib/supabase";

interface NewsListPageProps {
  title: string;
  subtitle?: string;
  category?: string;
  thumbnail?: string;
}

export default function NewsListPage({ title, subtitle, category, thumbnail }: NewsListPageProps) {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [selectedPost, setSelectedPost] = useState<NewsPost | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const loader = category ? listNewsByCategory(category, 50) : listPublishedNews(50);
    loader
      .then((data) => {
        if (!active) return;
        setPosts(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Không thể tải danh sách bài viết.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [category, reload]);

  return (
    <div className="min-h-screen bg-military-cream">
      <Navbar />

      <div className="py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <nav className="flex flex-wrap items-center gap-1 text-sm text-foreground-600 mb-6">
            <Link to="/" className="hover:text-military-red transition-colors">
              Trang chủ
            </Link>
            <span className="text-foreground-400">/</span>
            <span className="text-military-red font-semibold">{title}</span>
          </nav>

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={title}
                className="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover object-top shrink-0 border-2 border-military-gold/50"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-military-red flex items-center justify-center text-white shrink-0">
                <Newspaper className="w-6 h-6" />
              </div>
            )}
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-military-red-dark uppercase">
                {title}
              </h1>
              {subtitle && <p className="text-foreground-600 text-sm">{subtitle}</p>}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-military-cream-dark p-10 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-military-red" />
              <p className="text-foreground-700 mb-4">{error}</p>
              <button
                onClick={() => setReload((r) => r + 1)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors cursor-pointer whitespace-nowrap"
              >
                <RefreshCw className="w-4 h-4" />
                Thử lại
              </button>
            </div>
          ) : posts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-military-cream-dark p-10 text-center text-foreground-600">
              <Newspaper className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
              <p className="text-sm">Chưa có bài viết nào trong chuyên mục này.</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((item) => (
                <NewsCard key={item.id} item={item} onOpen={setSelectedPost} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />

      <NewsModal post={selectedPost} onClose={() => setSelectedPost(null)} />
    </div>
  );
}