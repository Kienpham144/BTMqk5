import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Award,
  Clock,
  User,
  Phone,
  Building2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  RefreshCw,
  Home,
} from "lucide-react";
import { isEssayAnswerCorrect, type QuizQuestion } from "@/lib/supabase";

interface ExamResultProps {
  score: number;
  maxScore: number;
  scorePerQ: number;
  durationSec: number;
  displayName: string;
  displayUnit: string;
  displayPhone: string;
  compTitle: string;
  questions: QuizQuestion[];
  answers: (number | string)[];
  canRestart?: boolean;
  onRestart: () => void;
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function fmt(n: number) {
  return Math.round(n * 100) / 100;
}

type GType = "correct" | "wrong" | "skip" | "manual" | "none";

export default function ExamResult({
  score,
  maxScore,
  scorePerQ,
  durationSec,
  displayName,
  displayUnit,
  displayPhone,
  compTitle,
  questions,
  answers,
  canRestart,
  onRestart,
}: ExamResultProps) {
  const classify = (q: QuizQuestion, a: number | string | undefined): GType => {
    const answered = q.type === "essay" ? typeof a === "string" && a.trim() : typeof a === "number" && a >= 0;
    if (!answered) return "skip";
    if (q.grading_mode === "manual") return "manual";
    if (q.type === "essay") return isEssayAnswerCorrect(a as string, q.essay_answers || []) ? "correct" : "wrong";
    return a === q.answer ? "correct" : "wrong";
  };

  const stats = useMemo(() => {
    let correct = 0;
    let wrong = 0;
    let skip = 0;
    questions.forEach((q, i) => {
      const c = classify(q, answers[i]);
      if (c === "correct") correct += 1;
      else if (c === "wrong") wrong += 1;
      else if (c === "skip") skip += 1;
    });
    return { correct, wrong, skip };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, answers]);

  const gradeBadge = (g: GType) => {
    if (g === "correct")
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-military-green/10 text-military-green text-xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Điểm: {fmt(scorePerQ)}
        </span>
      );
    if (g === "manual")
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-military-gold/20 text-military-red-dark text-xs font-bold">
          <Award className="w-3.5 h-3.5" />
          Chờ ban tổ chức chấm
        </span>
      );
    if (g === "skip")
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-foreground-100 text-foreground-600 text-xs font-bold">
          <MinusCircle className="w-3.5 h-3.5" />
          Điểm: 0 · Bỏ qua
        </span>
      );
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-military-red/10 text-military-red text-xs font-bold">
        <XCircle className="w-3.5 h-3.5" />
        Điểm: 0
      </span>
    );
  };

  const renderMcqDetail = (q: QuizQuestion, idx: number) => {
    const userAnswer = answers[idx];
    const g = classify(q, userAnswer);
    return (
      <div className="rounded-xl border border-[#e5e5e5] bg-white overflow-hidden mb-3">
        {/* Left red spine */}
        <div className="flex">
          <div className="w-1.5 bg-military-red shrink-0" />
          <div className="flex-1 p-4 md:p-5">
            <div className="flex items-start gap-3 mb-4">
              <span className="w-7 h-7 rounded-full bg-military-red text-white flex items-center justify-center text-sm font-bold shrink-0">
                {idx + 1}
              </span>
              <p className="text-[15px] font-semibold text-foreground-900 leading-relaxed">{q.question}</p>
            </div>

            <div className="space-y-2 ml-10">
              {q.options.map((opt, oIdx) => {
                const isCorrectOpt = oIdx === q.answer;
                const isChosen = userAnswer === oIdx;
                let rowCls = "border-[#e5e5e5] bg-white text-foreground-700";
                let dotCls = "border-foreground-300";
                let mark = null;
                if (isCorrectOpt) {
                  rowCls = "border-military-green/50 bg-military-green/5 text-military-green";
                  dotCls = "border-military-green";
                  mark = <CheckCircle2 className="w-4 h-4 text-military-green" />;
                } else if (isChosen && g !== "correct") {
                  rowCls = "border-military-red/50 bg-military-red/5 text-military-red";
                  dotCls = "border-military-red";
                  mark = <XCircle className="w-4 h-4 text-military-red" />;
                }
                return (
                  <div key={oIdx} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border ${rowCls}`}>
                    <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${dotCls}`}>
                      {isCorrectOpt && <span className="w-1.5 h-1.5 rounded-full bg-military-green" />}
                    </span>
                    <span className={`text-sm flex-1 ${isCorrectOpt || (isChosen && g !== "correct") ? "font-bold" : ""}`}>
                      {opt}
                    </span>
                    {mark}
                  </div>
                );
              })}
            </div>

            <div className="ml-10 mt-3 flex flex-wrap items-center gap-2">{gradeBadge(g)}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderEssayDetail = (q: QuizQuestion, idx: number) => {
    const raw = answers[idx];
    const answerText = typeof raw === "string" ? raw : "";
    const g = classify(q, raw);
    const borderCls =
      g === "correct" ? "border-military-green/40" : g === "skip" ? "border-[#e5e5e5]" : "border-military-red/40";
    return (
      <div className={`rounded-xl border ${borderCls} bg-white overflow-hidden mb-3`}>
        <div className="flex">
          <div className="w-1.5 bg-military-red shrink-0" />
          <div className="flex-1 p-4 md:p-5">
            <div className="flex items-start gap-3 mb-3">
              <span className="w-7 h-7 rounded-full bg-military-red text-white flex items-center justify-center text-sm font-bold shrink-0">
                {idx + 1}
              </span>
              <p className="text-[15px] font-semibold text-foreground-900 leading-relaxed">{q.question}</p>
            </div>

            <div className="ml-10">
              <div className="text-xs font-semibold text-foreground-500 mb-1.5">Câu trả lời của bạn:</div>
              <div className="text-sm px-3 py-2.5 rounded-lg bg-[#fafafa] border border-[#e5e5e5] whitespace-pre-wrap">
                {answerText || <span className="text-foreground-400 italic">Không trả lời</span>}
              </div>

              {q.essay_answers?.length > 0 && (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-foreground-500 mb-1.5">Đáp án đúng:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {q.essay_answers.map((ans, aIdx) => (
                      <span
                        key={aIdx}
                        className="text-xs px-2 py-1 rounded-lg bg-military-green/10 border border-military-green/30 text-military-green"
                      >
                        {ans}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-3">{gradeBadge(g)}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      <main className="py-8 md:py-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Kết quả card */}
          <div className="bg-white rounded-2xl border border-[#e5e5e5] overflow-hidden shadow-none">
            {/* Banner */}
            <div className="bg-gradient-to-b from-[#d21f3c] via-military-red to-[#a50d24] text-white px-6 py-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full mb-4 bg-white/20">
                <Award className="w-9 h-9 text-white" />
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-wide mb-1">
                HOÀN THÀNH
              </h1>
              <p className="text-white/90 font-semibold text-sm md:text-base mt-1.5 max-w-md mx-auto leading-relaxed">
                {compTitle}
              </p>
            </div>

            {/* Tổng điểm & thời gian */}
            <div className="p-5 md:p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-[#e5e5e5] p-4 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-military-red/10 flex items-center justify-center mb-2">
                    <Award className="w-5 h-5 text-military-red" />
                  </div>
                  <div className="text-3xl font-extrabold text-military-red">{fmt(score)}</div>
                  <div className="text-[11px] font-semibold text-foreground-500 tracking-wider uppercase mt-0.5">
                    Tổng điểm
                  </div>
                </div>
                <div className="rounded-xl border border-[#e5e5e5] p-4 flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-military-gold/20 flex items-center justify-center mb-2">
                    <Clock className="w-5 h-5 text-military-gold-dark" />
                  </div>
                  <div className="text-3xl font-extrabold text-foreground-900">{formatDuration(durationSec)}</div>
                  <div className="text-[11px] font-semibold text-foreground-500 tracking-wider uppercase mt-0.5">
                    Thời gian
                  </div>
                </div>
              </div>

              {/* Chips thống kê */}
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-military-green/10 text-military-green text-sm font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  {stats.correct} đúng
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-military-red/10 text-military-red text-sm font-bold">
                  <XCircle className="w-4 h-4" />
                  {stats.wrong} sai
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-foreground-100 text-foreground-600 text-sm font-bold">
                  <MinusCircle className="w-4 h-4" />
                  {stats.skip} bỏ qua
                </span>
              </div>
            </div>
          </div>

          {/* Cảm ơn + thông tin thí sinh */}
          <div className="bg-white rounded-2xl border border-[#e5e5e5] p-5 md:p-6 mt-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-military-red to-[#7a0416] text-white flex items-center justify-center shrink-0">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-military-red-dark text-lg leading-snug">
                  Cảm ơn bạn đã hoàn thành bài thi
                </h2>
                <p className="text-sm text-foreground-600 mt-0.5">
                  Kết quả đã được ghi nhận. Chúc bạn luôn học tập và công tác tốt!
                </p>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-[#f0f0f0] grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                  <User className="w-4.5 h-4.5 w-[18px] h-[18px]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-foreground-500">Thí sinh</div>
                  <div className="text-sm font-bold text-foreground-900 truncate">{displayName}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                  <Building2 className="w-[18px] h-[18px]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-foreground-500">Đơn vị</div>
                  <div className="text-sm font-bold text-foreground-900 truncate">{displayUnit}</div>
                </div>
              </div>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                  <Phone className="w-[18px] h-[18px]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] text-foreground-500">SĐT</div>
                  <div className="text-sm font-bold text-foreground-900 truncate">{displayPhone}</div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row items-center justify-center gap-3">
              {canRestart !== false && (
                <button
                  onClick={onRestart}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  Làm lại bài thi
                </button>
              )}
              <Link
                to="/competitions"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-military-red-dark font-bold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap"
              >
                <Home className="w-4 h-4" />
                Về danh sách cuộc thi
              </Link>
            </div>
          </div>

          {/* Chi tiết đáp án */}
          <div className="mt-6">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-1.5 h-6 bg-military-red rounded-full" />
              <h3 className="text-lg font-extrabold text-military-red-dark">Chi tiết đáp án</h3>
            </div>

            {questions.length === 0 ? (
              <div className="bg-white rounded-xl border border-[#e5e5e5] p-8 text-center text-foreground-600 text-sm">
                Chưa có dữ liệu câu hỏi để hiển thị chi tiết.
              </div>
            ) : (
              questions.map((q, i) => (q.type === "essay" ? renderEssayDetail(q, i) : renderMcqDetail(q, i)))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}