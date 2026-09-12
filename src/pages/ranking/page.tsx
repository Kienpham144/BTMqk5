import { useState, useEffect, useMemo } from "react";
import { Award, RefreshCw, AlertCircle, Lock, Search } from "lucide-react";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import Pagination from "@/components/base/Pagination";
import {
  getRankingVisibility,
  listRankingResults,
  listCompetitions,
  type RankingEntry,
  type Competition,
} from "@/lib/supabase";

const fmt = (n: number) => Math.round(n * 100) / 100;

const PAGE_SIZE = 50;

function formatDuration(sec: number | null) {
  if (!sec || sec <= 0) return "-";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function RankingPage() {
  const [visible, setVisible] = useState<boolean | null>(null);
  const [results, setResults] = useState<RankingEntry[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compFilter, setCompFilter] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([getRankingVisibility(), listCompetitions(), listRankingResults()])
      .then(([v, comps, res]) => {
        if (!active) return;
        setVisible(v);
        setCompetitions(comps);
        setResults(res);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setVisible(true);
        setError(err instanceof Error ? err.message : "Không thể tải bảng xếp hạng.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const compTitle = (id: number | null) => {
    if (id == null) return "Chung";
    return competitions.find((c) => c.id === id)?.title || `#${id}`;
  };

  // Lọc theo cuộc thi đã chọn, rồi xếp hạng theo điểm cao trước, bằng điểm thì
  // ai làm nhanh hơn xếp trên (khớp với cách xếp hạng ở trang quản trị).
  const ranked = useMemo(() => {
    const list = compFilter === "all" ? results : results.filter((r) => r.competition_id === compFilter);
    return [...list].sort((a, b) => {
      if (Number(b.score) !== Number(a.score)) return Number(b.score) - Number(a.score);
      return (a.duration_seconds ?? 999999) - (b.duration_seconds ?? 999999);
    });
  }, [results, compFilter]);

  // Tìm kiếm theo họ tên, đơn vị, chức vụ, cấp bậc.
  const keyword = search.trim().toLowerCase();
  const filtered = keyword
    ? ranked.filter((r) =>
        [r.full_name, r.rank, r.position, r.unit]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(keyword),
      )
    : ranked;

  // Quay về trang 1 mỗi khi đổi bộ lọc cuộc thi hoặc từ khóa tìm kiếm.
  useEffect(() => {
    setPage(1);
  }, [compFilter, keyword]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-military-cream">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pattern-traditional opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="inline-flex items-center gap-2 bg-military-red text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
            <Award className="w-4 h-4" />
            Thi Trực Tuyến
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-military-red-dark leading-tight mb-4">
            BẢNG XẾP HẠNG THI
          </h1>
          <p className="text-foreground-700 text-base md:text-lg max-w-3xl">
            Theo dõi thứ hạng của các thí sinh tham gia thi trực tuyến, xếp theo điểm số từ cao xuống thấp.
          </p>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
            </div>
          ) : error ? (
            <div className="max-w-xl mx-auto text-center py-12">
              <div className="inline-flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-4 text-sm text-left">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            </div>
          ) : visible === false ? (
            <div className="max-w-lg mx-auto text-center py-16">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-military-cream-dark/60 flex items-center justify-center text-foreground-500">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-extrabold text-military-red-dark mb-2">
                Bảng xếp hạng đang tạm khóa
              </h2>
              <p className="text-foreground-600 text-sm">
                Ban tổ chức đang tạm ẩn bảng xếp hạng. Vui lòng quay lại sau.
              </p>
            </div>
          ) : (
            <>
              {/* Bộ lọc cuộc thi + tìm kiếm */}
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-1 bg-white border border-military-cream-dark rounded-full p-1 overflow-x-auto max-w-full">
                  <button
                    onClick={() => setCompFilter("all")}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      compFilter === "all" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
                    }`}
                  >
                    Tất cả
                  </button>
                  {competitions.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setCompFilter(c.id)}
                      className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        compFilter === c.id ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
                      }`}
                    >
                      {c.title}
                    </button>
                  ))}
                </div>
                <div className="relative w-full md:w-72">
                  <Search className="w-4 h-4 text-foreground-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Tìm theo tên, đơn vị, chức vụ..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-military-cream-dark bg-white text-sm focus:border-military-red focus:outline-none"
                  />
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="text-center py-16 text-foreground-600">
                  <Award className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
                  <p className="text-sm">
                    {keyword
                      ? `Không tìm thấy thí sinh phù hợp với từ khóa "${search.trim()}".`
                      : "Chưa có kết quả thi nào được ghi nhận."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Bảng xếp hạng đầy đủ */}
                  <div className="bg-white rounded-2xl border border-military-cream-dark p-4 md:p-6">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b-2 border-military-cream-dark text-left">
                            <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Xếp hạng</th>
                            <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Họ và tên</th>
                            <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Cấp bậc</th>
                            <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Đơn vị</th>
                            {compFilter === "all" && (
                              <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Cuộc thi</th>
                            )}
                            <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Điểm</th>
                            <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Thời gian</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pageItems.map((r, i) => {
                            const rank = (currentPage - 1) * PAGE_SIZE + i + 1;
                            return (
                              <tr key={r.id} className="border-b border-military-cream-dark/60 hover:bg-military-cream/40 transition-colors">
                                <td className="py-3 pr-4">
                                  <span
                                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-extrabold ${
                                      rank === 1
                                        ? "bg-military-gold text-white"
                                        : rank === 2
                                        ? "bg-military-cream-dark text-foreground-700"
                                        : rank === 3
                                        ? "bg-military-red/30 text-military-red-dark"
                                        : "text-foreground-600"
                                    }`}
                                  >
                                    {rank}
                                  </span>
                                </td>
                                <td className="py-3 pr-4 font-semibold text-military-red-dark">{r.full_name || r.username || "-"}</td>
                                <td className="py-3 pr-4 text-foreground-700">{r.rank || "-"}</td>
                                <td className="py-3 pr-4 text-foreground-700">{r.unit || "-"}</td>
                                {compFilter === "all" && (
                                  <td className="py-3 pr-4 text-foreground-700 max-w-[180px] truncate">{compTitle(r.competition_id)}</td>
                                )}
                                <td className="py-3 pr-4">
                                  <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-military-green/10 text-military-green">
                                    {fmt(r.score)}/{fmt(r.total)}
                                  </span>
                                </td>
                                <td className="py-3 pr-4 text-foreground-700 whitespace-nowrap">
                                  {formatDuration(r.duration_seconds ?? null)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <Pagination
                    page={currentPage}
                    totalPages={totalPages}
                    onChange={setPage}
                    totalItems={filtered.length}
                    pageSize={PAGE_SIZE}
                    itemLabel="thí sinh"
                  />
                </>
              )}
            </>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}