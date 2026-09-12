import { useState, useEffect, useMemo, useRef } from "react";
import { Clock, CheckCircle2, ShieldCheck, User, Phone, Building2, Award, Briefcase, ChevronLeft, FileText, AlertTriangle } from "lucide-react";
import type { Competition, QuizQuestion, GuestInfo } from "@/lib/supabase";

interface ExamRoomProps {
  comp: Competition;
  questions: QuizQuestion[];
  answers: (number | string)[];
  timeLeft: number;
  guest: GuestInfo | null;
  violations?: number;
  profileName?: string | null;
  onAnswer: (qIndex: number, value: number | string) => void;
  onSubmit: () => void;
  onExit: () => void;
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function ExamRoom({
  comp,
  questions,
  answers,
  timeLeft,
  guest,
  violations = 0,
  profileName,
  onAnswer,
  onSubmit,
  onExit,
}: ExamRoomProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const qRefs = useRef<(HTMLDivElement | null)[]>([]);

  const total = questions.length;
  const answeredCount = useMemo(
    () => questions.reduce((acc, q, i) => {
      const a = answers[i];
      if (q.type === "essay") return typeof a === "string" && a.trim() ? acc + 1 : acc;
      return typeof a === "number" && a >= 0 ? acc + 1 : acc;
    }, 0),
    [questions, answers],
  );
  const unanswered = total - answeredCount;

  const displayName = guest?.fullName || profileName || "Thí sinh";
  const displayUnit = guest?.unit || "—";
  const displayPhone = guest?.phone || "—";

  // Chỉ những cuộc thi có giới hạn thời gian mới bật cảnh báo đếm ngược.
  const hasLimit = (comp.time_limit_minutes ?? 0) > 0;

  // Mức độ khẩn cấp của thời gian còn lại:
  // - critical: còn từ 1 phút trở xuống
  // - warn: còn từ 5 phút trở xuống
  // - normal: còn nhiều thời gian (hoặc không giới hạn)
  const urgency: "normal" | "warn" | "critical" = !hasLimit
    ? "normal"
    : timeLeft <= 60
    ? "critical"
    : timeLeft <= 300
    ? "warn"
    : "normal";

  // Bảng thông báo nổi, chỉ nhấp nháy ĐÚNG lúc vượt qua các mốc 5 phút và 1 phút.
  const [flash, setFlash] = useState<null | "5" | "1">(null);
  const milestoneRef = useRef({ five: false, one: false });

  useEffect(() => {
    if (!hasLimit) return undefined;
    if (timeLeft > 300) {
      milestoneRef.current = { five: false, one: false };
      setFlash(null);
      return undefined;
    }
    let next: "5" | "1" | null = null;
    if (timeLeft <= 60 && !milestoneRef.current.one) {
      milestoneRef.current = { five: true, one: true };
      next = "1";
    } else if (timeLeft <= 300 && !milestoneRef.current.five) {
      milestoneRef.current.five = true;
      next = "5";
    }
    if (next) {
      setFlash(next);
      const timer = setTimeout(() => setFlash(null), 8000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [timeLeft, hasLimit]);

  const scrollTo = (index: number) => {
    qRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleConfirmSubmit = () => {
    setConfirmOpen(false);
    onSubmit();
  };

  return (
    <div className="min-h-screen bg-[#f4f4f4]">
      {/* Thông báo nổi khi vượt mốc 5 phút / 1 phút */}
      {flash && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[80] px-4 w-full flex justify-center pointer-events-none">
          <div
            className={`flex items-center gap-3 rounded-xl px-5 py-3 font-extrabold shadow-lg ${
              flash === "1"
                ? "bg-military-red text-white animate-pulse"
                : "bg-military-gold text-military-red-dark"
            }`}
            role="alert"
          >
            <AlertTriangle className={`w-6 h-6 shrink-0 ${flash === "1" ? "text-white" : "text-military-red"}`} />
            <span className="text-sm md:text-base">
              {flash === "1"
                ? "CÒN 1 PHÚT! Hãy nhanh chóng kiểm tra lại và nộp bài."
                : "CÒN 5 PHÚT! Sắp hết thời gian làm bài, chú ý hoàn tất các câu còn lại."}
            </span>
          </div>
        </div>
      )}

      {/* Top red bar */}
      <header className="bg-military-red sticky top-0 z-40">
        <div className="flex items-center justify-between gap-4 px-4 md:px-6 py-2.5">
          <button
            onClick={onExit}
            className="inline-flex items-center gap-1.5 text-white/90 text-sm font-bold hover:text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            <ChevronLeft className="w-4 h-4" />
            Thoát phòng thi
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <img
              src="https://static.readdy.ai/image/5da2d42334edd15ac9976d03a9e6ac0e/c5f13968d32ad47aae2a7bb23e002a71.png"
              alt="Logo"
              className="w-8 h-8 shrink-0 object-contain rounded-full"
            />
            <div className="text-white leading-tight min-w-0">
              <div className="text-sm md:text-base font-extrabold truncate">BỘ THAM MƯU QUÂN KHU 5</div>
              <div className="text-[11px] text-white/75 font-semibold">Phòng thi</div>
            </div>
          </div>
          <div className="hidden sm:block text-white text-xs font-semibold">{comp.title}</div>
        </div>
      </header>

      {violations > 0 && (
        <div className="bg-military-gold/25 border-b border-military-gold px-4 md:px-6 py-2.5">
          <div className="max-w-[1400px] mx-auto flex items-center gap-2 text-sm font-bold text-military-red-dark">
            <AlertTriangle className="w-4 h-4 shrink-0 text-military-red" />
            <span>
              Cảnh báo: hệ thống đã phát hiện <span className="text-military-red">{violations}</span> hành vi
              rời khỏi phòng thi / thao tác bị cấm. Sau 3 lần vi phạm bài thi sẽ tự động nộp.
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-6 p-4 md:p-6 max-w-[1400px] mx-auto items-start">
        {/* Sidebar */}
        <aside className="w-full lg:w-[320px] shrink-0 space-y-4 lg:sticky lg:top-[64px]">
          {/* Timer */}
          <div
            className={`rounded-xl overflow-hidden transition-colors ${
              urgency === "critical"
                ? "bg-[#1c2536] ring-4 ring-military-red/60"
                : urgency === "warn"
                ? "bg-[#1c2536] ring-4 ring-military-gold/60"
                : "bg-[#1c2536]"
            }`}
          >
            <div
              className={`flex items-center justify-center gap-2 py-3 border-b transition-colors ${
                urgency === "critical"
                  ? "bg-military-red border-military-red-dark animate-pulse"
                  : urgency === "warn"
                  ? "bg-military-gold border-military-gold-dark"
                  : "border-white/10"
              }`}
            >
              <Clock className={`w-5 h-5 ${urgency === "warn" ? "text-military-red-dark" : "text-white"}`} />
              <span
                className={`text-2xl font-extrabold tracking-wide tabular-nums ${
                  urgency === "warn" ? "text-military-red-dark" : "text-white"
                }`}
              >
                {formatTime(timeLeft)}
              </span>
            </div>
            {urgency !== "normal" && (
              <div
                className={`px-4 py-2 text-center text-xs font-extrabold uppercase tracking-wide ${
                  urgency === "critical" ? "bg-military-red text-white" : "bg-military-gold text-military-red-dark"
                }`}
              >
                {urgency === "critical" ? "Sắp hết giờ — còn dưới 1 phút!" : "Sắp hết giờ — còn dưới 5 phút"}
              </div>
            )}
            <div className="p-4">
              <div className="text-white font-extrabold leading-snug mb-3">{comp.title}</div>
              <div className="space-y-1.5 text-[13px]">
                <div className="flex items-center gap-2 text-[#7cb9e8]">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate font-semibold">{displayName}</span>
                </div>
                {guest?.rank && (
                  <div className="flex items-center gap-2 text-[#7cb9e8]">
                    <Award className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Cấp bậc: {guest.rank}</span>
                  </div>
                )}
                {guest?.position && (
                  <div className="flex items-center gap-2 text-[#7cb9e8]">
                    <Briefcase className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Chức vụ: {guest.position}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-[#7cb9e8]">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Đơn vị: {displayUnit}</span>
                </div>
                <div className="flex items-center gap-2 text-[#7cb9e8]">
                  <Phone className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{displayPhone}</span>
                </div>
              </div>
              <div className="mt-3 inline-flex items-center gap-1.5 bg-[#1e5aa8] text-white text-xs font-bold px-2.5 py-1 rounded-md">
                <ShieldCheck className="w-3.5 h-3.5" />
                Đã làm {answeredCount}/{total}
              </div>
            </div>
          </div>

          {/* Question grid */}
          <div className="bg-white rounded-xl border border-military-cream-dark p-4">
            <div className="grid grid-cols-6 gap-2">
              {questions.map((q, i) => {
                const a = answers[i];
                const isAnswered = q.type === "essay" ? typeof a === "string" && a.trim() : typeof a === "number" && a >= 0;
                return (
                  <button
                    key={q.id}
                    onClick={() => scrollTo(i)}
                    title={`Câu ${i + 1}`}
                    className={`h-9 flex items-center justify-center rounded-md text-sm font-bold border transition-colors cursor-pointer ${
                      isAnswered
                        ? "bg-military-red text-white border-military-red"
                        : "bg-white text-foreground-700 border-military-cream-dark hover:border-military-red hover:text-military-red"
                    }`}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-military-red text-white font-extrabold rounded-xl hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            Nộp bài
          </button>
        </aside>

        {/* Questions */}
        <main className="flex-1 w-full min-w-0 space-y-5">
          {questions.map((q, i) => {
            const isEssay = q.type === "essay";
            const a = answers[i];
            const essayValue = typeof a === "string" ? (a as string) : "";
            return (
              <div
                key={q.id}
                ref={(el) => {
                  qRefs.current[i] = el;
                }}
                className="scroll-mt-20 bg-white rounded-xl border border-[#e3e3e3] p-5 md:p-6"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-military-red font-extrabold">Câu {i + 1}</span>
                  {isEssay && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-military-green/10 text-military-green text-[11px] font-bold">
                      <FileText className="w-3 h-3" />
                      Tự luận
                    </span>
                  )}
                </div>
                <div className="text-[15px] font-semibold text-foreground-900 leading-relaxed mb-4">
                  {q.question}
                </div>

                {isEssay ? (
                  <textarea
                    value={essayValue}
                    onChange={(e) => onAnswer(i, e.target.value)}
                    rows={5}
                    placeholder="Nhập câu trả lời của bạn..."
                    className="w-full px-4 py-3 rounded-lg border-2 border-[#e3e3e3] bg-white text-sm resize-none focus:border-military-red focus:outline-none"
                  />
                ) : (
                  <div className="space-y-2.5">
                    {q.options.map((opt, optIndex) => {
                      const selected = a === optIndex;
                      return (
                        <button
                          key={optIndex}
                          onClick={() => onAnswer(i, optIndex)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-all cursor-pointer ${
                            selected
                              ? "border-military-red bg-military-red/5"
                              : "border-[#e3e3e3] hover:border-military-red/50 hover:bg-military-red/[0.02]"
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                              selected ? "border-military-red" : "border-foreground-300"
                            }`}
                          >
                            {selected && <span className="w-2 h-2 rounded-full bg-military-red" />}
                          </span>
                          <span className={`text-sm ${selected ? "font-bold text-military-red-dark" : "text-foreground-800"}`}>
                            {opt}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Nộp bài cuối danh sách câu hỏi */}
          <button
            onClick={() => setConfirmOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-military-red text-white font-extrabold rounded-xl hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5" />
            Nộp bài
          </button>
        </main>
      </div>

      {/* Confirm submit modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-extrabold text-military-red-dark mb-2">Xác nhận nộp bài?</h3>
            <p className="text-sm text-foreground-600 leading-relaxed mb-4">
              Bạn đã làm <span className="font-bold text-military-red">{answeredCount}</span>/{total} câu.
              {unanswered > 0 && (
                <>
                  {" "}Còn <span className="font-bold text-military-red">{unanswered}</span> câu chưa trả lời.
                </>
              )}{" "}
              Sau khi nộp, bạn sẽ <span className="font-bold">không thể thay đổi</span> đáp án.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConfirmSubmit}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Nộp bài
              </button>
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-foreground-700 font-bold rounded-lg border-2 border-[#e3e3e3] hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
              >
                Tiếp tục làm bài
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}