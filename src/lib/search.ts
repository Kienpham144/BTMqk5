import { supabase } from "@/lib/supabase";

// Loại kết quả tìm kiếm: trang/menu, tin bài, cuộc thi, văn bản - tài liệu, video.
export type SearchResultType = "page" | "news" | "competition" | "document" | "video";

export interface SearchResult {
  key: string;
  type: SearchResultType;
  title: string;
  description: string;
  meta?: string;
  path: string;
}

// Chuẩn hóa chuỗi để so khớp: bỏ dấu tiếng Việt, thường hóa, gọn khoảng trắng.
// Nhờ vậy người dùng gõ "pho bien phap luat" vẫn tìm ra "Phổ biến pháp luật".
export function normalizeText(input: string): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

// Bỏ thẻ HTML và gộp khoảng trắng để trích đoạn mô tả ngắn gọn từ nội dung bài viết.
function stripHtml(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Danh mục tin bài -> đường dẫn trang danh sách tương ứng trong menu.
export const NEWS_CATEGORY_PATH: Record<string, string> = {
  "Công tác xây dựng Đảng": "/party-building",
  "Công tác quần chúng, dân vận, chính sách": "/mass-work",
  "Học tập và làm theo Bác": "/results",
  "Phổ biến pháp luật tuyên truyền": "/pho-bien-phap-luat",
  "Lời Bác dạy": "/loi-bac-day",
  "Mỗi tuần một điều luật": "/moi-tuan-mot-dieu-luat",
  "Bảo vệ nền tảng tư tưởng của Đảng": "/bao-ve-nen-tang-tu-tuong",
  "Văn hóa, câu lạc bộ": "/about",
  "Thi đua khen thưởng": "/thi-dua-khen-thuong",
};

// Các mục menu/trang cố định để tìm kiếm nhanh.
const PAGE_LINKS: Array<{ title: string; path: string }> = [
  { title: "Trang chủ", path: "/" },
  { title: "Công tác xây dựng Đảng", path: "/party-building" },
  { title: "Công tác quần chúng, dân vận, chính sách", path: "/mass-work" },
  { title: "Bảo vệ nền tảng tư tưởng của Đảng", path: "/bao-ve-nen-tang-tu-tuong" },
  { title: "Học tập và làm theo Bác", path: "/results" },
  { title: "Thi đua khen thưởng", path: "/thi-dua-khen-thuong" },
  { title: "Văn hóa, câu lạc bộ", path: "/about" },
  { title: "Phổ biến pháp luật tuyên truyền", path: "/pho-bien-phap-luat" },
  { title: "Lời Bác dạy", path: "/loi-bac-day" },
  { title: "Mỗi tuần một điều luật", path: "/moi-tuan-mot-dieu-luat" },
  { title: "Bản tin thời sự", path: "/news" },
  { title: "Cuộc thi trực tuyến", path: "/competitions" },
  { title: "Bảng xếp hạng", path: "/bang-xep-hang" },
  { title: "Thư viện tài liệu", path: "/materials" },
  { title: "Thư viện video", path: "/videos" },
  { title: "Đóng góp ý kiến", path: "/feedback" },
];

export function getPageResults(): SearchResult[] {
  return PAGE_LINKS.map((p, i) => ({
    key: `page-${i}`,
    type: "page" as const,
    title: p.title,
    description: "Trang / chuyên mục trong menu",
    path: p.path,
  }));
}

// Nạp toàn bộ dữ liệu có thể tìm kiếm từ Backend: tin bài, cuộc thi,
// văn bản - tài liệu và video. Gọi một lần khi mở ô tìm kiếm.
export async function loadSearchData(): Promise<SearchResult[]> {
  const [newsRes, docRes, videoRes, compRes] = await Promise.all([
    supabase.from("news_posts").select("id, title, category, content").eq("status", "published"),
    supabase.from("documents").select("id, title, description, category"),
    supabase.from("videos").select("id, title, description, category"),
    supabase.from("competitions").select("id, title, description, status"),
  ]);

  const results: SearchResult[] = [];

  (newsRes.data ?? []).forEach((n) => {
    const row = n as { id: number; title: string; category: string | null; content: string | null };
    results.push({
      key: `news-${row.id}`,
      type: "news",
      title: row.title,
      description: stripHtml(row.content).slice(0, 150),
      meta: row.category ?? undefined,
      path: `/news/${row.id}`,
    });
  });

  (compRes.data ?? []).forEach((c) => {
    const row = c as { id: number; title: string; description: string | null; status: string | null };
    const statusLabel =
      row.status === "open" ? "Đang mở" : row.status === "coming" ? "Sắp diễn ra" : "Đã kết thúc";
    results.push({
      key: `comp-${row.id}`,
      type: "competition",
      title: row.title,
      description: stripHtml(row.description).slice(0, 150),
      meta: statusLabel,
      path: `/competition/${row.id}`,
    });
  });

  (docRes.data ?? []).forEach((d) => {
    const row = d as { id: number; title: string; description: string | null; category: string | null };
    results.push({
      key: `doc-${row.id}`,
      type: "document",
      title: row.title,
      description: row.description ?? "",
      meta: row.category ?? "Thư viện tài liệu",
      path: "/materials",
    });
  });

  (videoRes.data ?? []).forEach((v) => {
    const row = v as { id: number; title: string; description: string | null; category: string | null };
    results.push({
      key: `video-${row.id}`,
      type: "video",
      title: row.title,
      description: row.description ?? "",
      meta: row.category ?? "Thư viện video",
      path: "/videos",
    });
  });

  return results;
}