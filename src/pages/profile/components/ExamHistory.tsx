import { useState, useEffect } from "react";
import { Trophy, RefreshCw, Clock, AlertCircle } from "lucide-react";
import {
  listQuizResultsByUser,
  listCompetitions,
  type QuizResult,
  type Competition,
} from "@/lib/supabase";

const fmt = (n: number) => Math.round(n * 100) / 100;

function formatDuration(sec: number | null) {
  if (!sec || sec <= 0) return "-";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function ExamHistory({ userId }: { userId: string }) {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [rData, cData] = await Promise.all([
        listQuizResultsByUser(userId),
        listCompetitions(),
      ]);
      setResults(rData);
      setCompetitions(cData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải lịch sử thi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const compTitle = (id: number | null) => {
    if (id == null) return "Bài thi chung";
    return competitions.find((c) => c.id === id)?.title || `Bài thi #${id}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-military-cream-dark p-6 mt-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
          <Trophy className="w-5 h-5" />
        </div>
        <div>
          <h2 className="font-bold text-military-red-dark">Lịch sử thi</h2>
          <p className="text-xs text-foreground-600">Điểm các bài thi bạn đã hoàn thành.</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <RefreshCw className="w-7 h-7 text-military-red animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <span>{error}</span>
            <button
              onClick={load}
              className="block mt-1 text-military-red underline font-semibold cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-10 text-foreground-600">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
          <p className="text-sm">Bạn chưa có kết quả thi nào.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {results.map((r, i) => (
            <div
              key={r.id}
              className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-military-cream-dark bg-military-cream/30 p-4"
            >
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-military-red/10 text-military-red text-xs font-extrabold shrink-0">
                {i + 1}
              </span>
              <div className="flex-1 min-w-[200px]">
                <div className="text-sm font-semibold text-military-red-dark">
                  {compTitle(r.competition_id)}
                </div>
                <div className="text-xs text-foreground-600 flex items-center gap-1.5 mt-0.5">
                  <Clock className="w-3 h-3" />
                  {new Date(r.created_at).toLocaleString("vi-VN")}
                </div>
              </div>
              <div className="text-sm">
                <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${
                  r.score >= 7 ? "bg-military-green/10 text-military-green" : "bg-military-red/10 text-military-red"
                }`}>
                  {fmt(r.score)}/{fmt(r.total)} điểm
                </span>
              </div>
              <div className="text-xs text-foreground-600 whitespace-nowrap">
                {r.correct_count} câu đúng · {formatDuration(r.duration_seconds ?? null)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}