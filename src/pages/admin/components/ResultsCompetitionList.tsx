import { Trophy, Users, ChevronRight, Clock, Award, Target, Timer } from "lucide-react";
import type { Competition, QuizResult } from "@/lib/supabase";

interface Props {
  competitions: Competition[];
  results: QuizResult[];
  onSelect: (competitionId: number) => void;
}

interface CompGroup {
  id: number;
  title: string;
  status: Competition["status"] | null;
  results: QuizResult[];
}

const STATUS_LABEL: Record<string, string> = {
  open: "Đang mở",
  coming: "Sắp diễn ra",
  closed: "Đã kết thúc",
};

const STATUS_CLASS: Record<string, string> = {
  open: "bg-military-green/10 text-military-green border-military-green/30",
  coming: "bg-military-gold/20 text-military-red-dark border-military-gold/40",
  closed: "bg-foreground-100 text-foreground-600 border-military-cream-dark",
};

const fmt = (n: number) => Math.round(Number(n) * 100) / 100;

const formatDuration = (sec: number | null) => {
  if (!sec || sec <= 0) return "-";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
};

export default function ResultsCompetitionList({ competitions, results, onSelect }: Props) {
  const groups: CompGroup[] = competitions.map((c) => ({
    id: c.id,
    title: c.title,
    status: c.status,
    results: results.filter((r) => (r.competition_id ?? 0) === c.id),
  }));

  // Nhóm các bài thi chưa gắn cuộc thi nào (nếu có).
  const uncategorized = results.filter((r) => r.competition_id == null);
  if (uncategorized.length > 0) {
    groups.push({
      id: 0,
      title: "Chưa gắn cuộc thi",
      status: null,
      results: uncategorized,
    });
  }

  // Cuộc thi có bài làm xếp trước, sau đó theo số lượng giảm dần.
  groups.sort((a, b) => b.results.length - a.results.length);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {groups.map((g) => {
        const count = g.results.length;
        const ranked = [...g.results].sort((a, b) => {
          if (Number(b.score) !== Number(a.score)) return Number(b.score) - Number(a.score);
          return (a.duration_seconds ?? 999999) - (b.duration_seconds ?? 999999);
        });
        const top = ranked[0] ?? null;
        const bestScore = top ? Number(top.score) : 0;
        const totalPoint = top ? Number(top.total) : 0;
        const avgScore = count > 0 ? g.results.reduce((sum, r) => sum + Number(r.score), 0) / count : 0;
        const empty = count === 0;

        return (
          <button
            key={g.id}
            onClick={() => onSelect(g.id)}
            className="text-left bg-white rounded-xl border-2 border-military-cream-dark hover:border-military-red transition-colors p-4 flex flex-col gap-3 cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                  <Trophy className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-military-red-dark text-sm leading-snug line-clamp-2">
                  {g.title}
                </h3>
              </div>
              {g.status && (
                <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${STATUS_CLASS[g.status]}`}>
                  {STATUS_LABEL[g.status]}
                </span>
              )}
            </div>

            {empty ? (
              <div className="flex items-center gap-2 text-xs text-foreground-500 py-3">
                <Users className="w-4 h-4" />
                Chưa có lượt làm bài nào
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-foreground-700">
                  <Users className="w-3.5 h-3.5 text-military-red shrink-0" />
                  <span className="font-bold text-military-red-dark">{count}</span>
                  <span>lượt làm bài</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-foreground-700">
                  <Award className="w-3.5 h-3.5 text-military-gold-dark shrink-0" />
                  <span className="truncate">
                    Dẫn đầu: <span className="font-semibold text-military-red-dark">{top?.full_name || top?.username || "-"}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-600">
                  <span className="inline-flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-military-green shrink-0" />
                    Cao nhất: <span className="font-bold text-military-green">{fmt(bestScore)}/{fmt(totalPoint)}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Timer className="w-3.5 h-3.5 text-foreground-500 shrink-0" />
                    TB: <span className="font-bold text-military-red-dark">{fmt(avgScore)}</span>
                  </span>
                  {top && (
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-foreground-500 shrink-0" />
                      Nhanh nhất: <span className="font-bold text-military-red-dark">{formatDuration(top.duration_seconds ?? null)}</span>
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-auto pt-3 border-t border-military-cream-dark/70 flex items-center justify-between">
              <span className="text-xs font-bold text-military-red group-hover:text-military-red-dark transition-colors">
                Xem bảng xếp hạng
              </span>
              <ChevronRight className="w-4 h-4 text-military-red transition-transform group-hover:translate-x-0.5" />
            </div>
          </button>
        );
      })}
    </div>
  );
}