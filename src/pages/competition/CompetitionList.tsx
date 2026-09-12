import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import CompetitionCard from "@/components/feature/CompetitionCard";
import { listCompetitions, type Competition } from "@/lib/supabase";

export default function CompetitionList() {
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    listCompetitions()
      .then((data) => {
        if (!active) return;
        setCompetitions(data);
        setLoading(false);
      })
      .catch((err) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "Không thể tải danh sách cuộc thi.");
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openCount = competitions.filter((c) => c.status === "open").length;

  return (
    <div className="min-h-screen bg-military-cream">
      <Navbar />

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pattern-traditional opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="inline-flex items-center gap-2 bg-military-red text-white px-4 py-2 rounded-full text-sm font-bold mb-4">
            <FlaskConical className="w-4 h-4" />
            Tuyên Truyền Giáo Dục - Phổ Biến Pháp Luật
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-military-red-dark leading-tight mb-4">
            HỆ THỐNG CUỘC THI TRỰC TUYẾN
          </h1>
          <p className="text-foreground-700 text-base md:text-lg max-w-3xl mb-6">
            Tham gia các cuộc thi trực tuyến để ôn tập, kiểm tra kiến thức về điều lệnh quản lý bộ đội,
            tác phong quân nhân, pháp luật quân đội và truyền thống lịch sử Quân khu 5.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-1.5 bg-military-green text-white px-3 py-1.5 rounded-full font-bold">
              {openCount} cuộc thi đang mở
            </span>
            <span className="inline-flex items-center gap-1.5 bg-military-gold text-military-red-dark px-3 py-1.5 rounded-full font-bold">
              {competitions.length} cuộc thi tổng cộng
            </span>
          </div>
        </div>
      </section>

      <section className="py-10 md:py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
          ) : competitions.length === 0 ? (
            <div className="text-center py-20 text-foreground-600">
              <FlaskConical className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
              <p className="text-sm">Hiện chưa có cuộc thi nào được đăng tải.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {competitions.map((comp) => (
                <CompetitionCard key={comp.id} comp={comp} />
              ))}
            </div>
          )}

          <div className="mt-12 bg-white rounded-2xl border border-military-cream-dark p-8 text-center">
            <h2 className="text-xl md:text-2xl font-extrabold text-military-red-dark mb-3">
              Chưa tìm thấy cuộc thi phù hợp?
            </h2>
            <p className="text-foreground-700 mb-6 max-w-xl mx-auto">
              Tham khảo kho tài liệu ôn tập hoặc liên hệ ban tổ chức để biết thêm thông tin về các cuộc thi sắp diễn ra.
            </p>
            <Link
              to="/materials"
              className="inline-flex items-center gap-2 px-6 py-3 border-2 border-military-red text-military-red font-bold rounded-lg hover:bg-military-red hover:text-white transition-all whitespace-nowrap"
            >
              Ôn tập tài liệu
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}