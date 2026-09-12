import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Calendar,
  Eye,
  RefreshCw,
  ArrowLeft,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import { getNewsById, incrementNewsViews, type NewsPost } from "@/lib/supabase";

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yy} ${hh}:${mi}`;
}

export default function NewsDetail() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<NewsPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadPost = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await getNewsById(Number(id));
      if (!data) {
        setError("Bài viết không tồn tại hoặc đã bị xóa.");
        return;
      }
      setPost(data);
      incrementNewsViews(data.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải bài viết.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPost();
    window.scrollTo({ top: 0, behavior: "auto" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const paragraphs = post?.content
    ? post.content
        .split("\n")
        .map((p) => p.trim())
        .filter(Boolean)
    : [];

  return (
    <div className="min-h-screen bg-military-cream">
      <Navbar />

      <div className="py-10 md:py-14">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-24">
              <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-military-cream-dark p-10 text-center">
              <AlertCircle className="w-12 h-12 mx-auto mb-3 text-military-red" />
              <p className="text-foreground-700 mb-4">{error}</p>
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap"
              >
                <ArrowLeft className="w-4 h-4" />
                Về trang chủ
              </Link>
            </div>
          ) : post ? (
            <article>
              {/* Breadcrumb */}
              <nav className="flex flex-wrap items-center gap-1 text-sm text-foreground-600 mb-6">
                <Link to="/" className="hover:text-military-red transition-colors">
                  Trang chủ
                </Link>
                <span className="text-foreground-400">/</span>
                <Link to="/news" className="hover:text-military-red transition-colors">
                  Bài viết
                </Link>
                <span className="text-foreground-400">/</span>
                <span className="text-military-red font-semibold">{post.category}</span>
                <span className="text-foreground-400">/</span>
                <span className="text-foreground-700 line-clamp-1">{post.title}</span>
              </nav>

              {/* Title */}
              <h1 className="text-2xl md:text-3xl font-extrabold text-military-red-dark leading-tight mb-4">
                {post.title}
              </h1>

              {/* Meta */}
              <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-600 mb-6">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-military-gold-dark" />
                  {formatDate(post.created_at)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="w-4 h-4 text-military-gold-dark" />
                  {post.views.toLocaleString("vi-VN")} lượt xem
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-military-green text-white">
                  {post.category}
                </span>
              </div>

              {/* Image */}
              <div className="mb-8">
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post.title}
                    className="w-full max-h-[420px] object-cover object-top rounded-xl"
                  />
                ) : (
                  <div className="w-full h-64 flex items-center justify-center text-military-gold-dark bg-white rounded-xl border border-military-cream-dark">
                    <ImageIcon className="w-16 h-16" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="prose prose-lg max-w-none text-foreground-950 leading-relaxed">
                {paragraphs.map((p, idx) => (
                  <p
                    key={idx}
                    className="mb-5 first:font-medium first:text-foreground-950"
                  >
                    {p}
                  </p>
                ))}
              </div>

              <div className="mt-10 pt-6 border-t border-military-cream-dark">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-red-dark text-white font-bold rounded-lg hover:bg-military-red transition-colors whitespace-nowrap"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Về trang chủ
                </Link>
              </div>
            </article>
          ) : null}
        </div>
      </div>

      <Footer />
    </div>
  );
}