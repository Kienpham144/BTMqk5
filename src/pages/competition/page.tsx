import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { RefreshCw, AlertCircle, Lock } from "lucide-react";
import Navbar from "@/components/feature/Navbar";
import Footer from "@/components/feature/Footer";
import ExamIntro from "./components/ExamIntro";
import ExamRoom from "./components/ExamRoom";
import ExamResult from "./components/ExamResult";
import { useAuth } from "@/hooks/useAuth";
import { useExamAntiCheat } from "@/hooks/useExamAntiCheat";
import {
  saveQuizResult,
  listQuizQuestions,
  getCompetition,
  isEssayAnswerCorrect,
  hasCompletedAttempt,
  getAntiCheatEnabled,
  listQuizQuestionSets,
  getQuizProgress,
  saveQuizProgress,
  clearQuizProgress,
  type QuizQuestion,
  type Competition,
  type GuestInfo,
} from "@/lib/supabase";

type Screen = "intro" | "exam" | "result";

interface FinalResult {
  score: number;
  maxScore: number;
  correctCount: number;
  gradedTotal: number;
  manualCount: number;
  scorePerQ: number;
  durationSec: number;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Tạo thứ tự hiển thị câu hỏi: câu tự luận giữ nguyên vị trí gốc,
// câu trắc nghiệm được xáo trộn để mỗi người thi có thứ tự khác nhau.
function buildDisplayOrder(questions: QuizQuestion[]): number[] {
  const mcqIndices = questions
    .map((q, i) => ({ q, i }))
    .filter((x) => x.q.type !== "essay")
    .map((x) => x.i);
  const shuffledMcq = shuffle(mcqIndices);
  const order: number[] = new Array(questions.length);
  let p = 0;
  questions.forEach((q, i) => {
    if (q.type === "essay") {
      order[i] = i;
    } else {
      order[i] = shuffledMcq[p++];
    }
  });
  return order;
}

// Chọn bộ câu hỏi cho mỗi lần thi từ ngân hàng câu hỏi của cuộc thi:
// - numQuestions = số câu TRẮC NGHIỆM cần bốc ngẫu nhiên.
// - Câu tự luận LUÔN được giữ nguyên toàn bộ và xếp ở CUỐI bài thi.
// - Nếu numQuestions <= 0 hoặc >= tổng số trắc nghiệm: lấy toàn bộ trắc nghiệm.
function selectExamQuestions(questions: QuizQuestion[], numQuestions: number): QuizQuestion[] {
  const essay = questions.filter((q) => q.type === "essay");
  const mcq = questions.filter((q) => q.type !== "essay");
  const needMcq = numQuestions > 0 ? Math.min(numQuestions, mcq.length) : mcq.length;
  const picked = shuffle(mcq).slice(0, needMcq);
  const sortedMcq = [...picked].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  const sortedEssay = [...essay].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  return [...sortedMcq, ...sortedEssay];
}

// Khóa lưu tạm tiến trình làm bài (mốc hết giờ + đáp án) để khi thí sinh
// thoát ra vào lại thì đồng hồ vẫn chạy tiếp theo giờ thực, không reset.
interface SavedExam {
  deadline: number;
  startedAt: number;
  answers: (number | string)[];
  displayOrder: number[];
}

const examTimerKey = (id: number) => `exam_timer_${id}`;

function readSavedExam(id: number): SavedExam | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(examTimerKey(id));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SavedExam;
    if (!parsed || typeof parsed.deadline !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSavedExam(id: number, data: SavedExam) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(examTimerKey(id), JSON.stringify(data));
  } catch {
    // Bỏ qua nếu trình duyệt chặn localStorage.
  }
}

function clearSavedExam(id: number) {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(examTimerKey(id));
  } catch {
    // Bỏ qua.
  }
}

export default function Competition() {
  const { id } = useParams<{ id: string }>();
  const competitionId = id ? parseInt(id, 10) : NaN;
  const { user, profile, isAdmin, loading: authLoading } = useAuth();

  const [comp, setComp] = useState<Competition | null>(null);
  const [allQuestions, setAllQuestions] = useState<QuizQuestion[]>([]);
  const [questionSets, setQuestionSets] = useState<string[]>([]);
  const [selectedSet, setSelectedSet] = useState("");
  const [displayOrder, setDisplayOrder] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [screen, setScreen] = useState<Screen>("intro");
  const [guest, setGuest] = useState<GuestInfo | null>(null);
  const [answers, setAnswers] = useState<(number | string)[]>([]);
  const [timeLeft, setTimeLeft] = useState(0);
  const [result, setResult] = useState<FinalResult | null>(null);
  const [submitError, setSubmitError] = useState("");
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [attemptBlocked, setAttemptBlocked] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const deadlineRef = useRef<number>(Number.POSITIVE_INFINITY);
  const submittedRef = useRef(false);
  const answersRef = useRef<(number | string)[]>([]);
  const examPopHandlerRef = useRef<(() => void) | null>(null);
  const [violations, setViolations] = useState(0);
  const violationsRef = useRef(0);
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(true);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Đẩy tiến trình hiện tại lên máy chủ (chỉ khi thí sinh đã đăng nhập).
  // Nhờ vậy khi mất kết nối hoặc đổi thiết bị vẫn khôi phục được đúng thời gian
  // đang chạy và các đáp án đã chọn.
  const syncProgressToServer = async () => {
    if (!user || !comp) return;
    const dl = deadlineRef.current;
    const finite = Number.isFinite(dl);
    try {
      await saveQuizProgress({
        competitionId: comp.id,
        userId: user.id,
        currentIndex: 0,
        answers: {
          deadline: finite ? dl : null,
          startedAt: startedAtRef.current,
          answers: answersRef.current,
          displayOrder,
        },
        deadline: finite ? new Date(dl).toISOString() : new Date().toISOString(),
      });
    } catch {
      // Lỗi mạng tạm thời: bản lưu trên máy vẫn đảm bảo không mất đáp án.
    }
  };

  // Câu hỏi của bộ đề đang chọn (nếu cuộc thi có nhiều bộ đề). Nếu không có bộ
  // đề nào thì dùng toàn bộ ngân hàng câu hỏi như trước.
  const questions = useMemo(() => {
    if (allQuestions.length === 0) return [];
    const filtered = selectedSet
      ? allQuestions.filter((q) => (q.question_set ?? "").trim() === selectedSet)
      : allQuestions;
    return selectExamQuestions(filtered, comp?.num_questions ?? 0);
  }, [allQuestions, selectedSet, comp?.num_questions]);

  const displayQuestions = displayOrder.map((i) => questions[i]);

  useEffect(() => {
    const load = async () => {
      if (Number.isNaN(competitionId)) {
        setLoadError("Cuộc thi không hợp lệ.");
        setLoading(false);
        return;
      }
      try {
        const [cData, qData, antiCheat, sets] = await Promise.all([
          getCompetition(competitionId),
          listQuizQuestions(competitionId),
          getAntiCheatEnabled(),
          listQuizQuestionSets(competitionId),
        ]);
        if (!cData) {
          setLoadError("Không tìm thấy cuộc thi này.");
          setLoading(false);
          return;
        }
        setComp(cData);
        setAntiCheatEnabled(antiCheat);
        setAllQuestions(qData);
        setQuestionSets(sets);
        setSelectedSet(sets[0] ?? "");
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Không thể tải dữ liệu bài thi.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [competitionId]);

  useEffect(() => {
    if (screen !== "exam") return;
    if (timerRef.current) clearInterval(timerRef.current);

    // Đồng hồ dựa trên mốc hạn tuyệt đối (giờ thực), không đếm trừ dần.
    // Nhờ vậy dù chuyển tab, thoát toàn màn hình hay máy ngủ, thời gian vẫn đúng.
    const tick = () => {
      if (!Number.isFinite(deadlineRef.current)) return; // cuộc thi không giới hạn thời gian
      const remain = Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000));
      setTimeLeft(remain);
      if (remain <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!submittedRef.current) doSubmit(true);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 500);

    // Quay lại tab / cửa sổ là tính lại ngay lập tức.
    const onWake = () => tick();
    window.addEventListener("focus", onWake);
    window.addEventListener("pageshow", onWake);
    document.addEventListener("visibilitychange", onWake);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("pageshow", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // Lưu tạm tiến trình làm bài để thoát ra vào lại không mất đáp án và đồng hồ vẫn chạy tiếp.
  useEffect(() => {
    if (screen !== "exam" || !comp) return;
    writeSavedExam(comp.id, {
      deadline: deadlineRef.current,
      startedAt: startedAtRef.current,
      answers: answersRef.current,
      displayOrder,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, screen, comp, displayOrder]);

  // Chặn nút Back của trình duyệt khi đang trong phòng thi:
  // hiện hộp thoại "nộp bài hay tiếp tục làm" thay vì thoát ngay.
  useEffect(() => {
    if (screen !== "exam") return;

    const block = () => {
      window.history.pushState({ examGuard: true }, "");
      setShowExitConfirm(true);
    };
    examPopHandlerRef.current = block;
    window.history.pushState({ examGuard: true }, "");
    window.addEventListener("popstate", block);

    return () => {
      window.removeEventListener("popstate", block);
      if (examPopHandlerRef.current === block) examPopHandlerRef.current = null;
    };
  }, [screen]);

  const total = questions.length;
  const scorePerQ = comp?.score_per_question ?? 1;
  const gradedTotal = questions.filter((q) => q.graded !== false).length;
  const manualCount = questions.filter((q) => q.type === "essay" && q.grading_mode === "manual" && q.graded !== false).length;
  const maxScore = gradedTotal * scorePerQ;

  const computeResult = (originalAns: (number | string)[]) => {
    let correctCount = 0;
    questions.forEach((q, i) => {
      if (q.graded === false) return;
      const a = originalAns[i];
      if (q.type === "essay") {
        if (q.grading_mode === "manual") return;
        if (typeof a === "string" && isEssayAnswerCorrect(a, q.essay_answers || [])) correctCount += 1;
        return;
      }
      if (a === q.answer) correctCount += 1;
    });
    return { correctCount, score: correctCount * scorePerQ };
  };

  const doSubmit = async (auto = false) => {
    if (submittedRef.current || !comp) return;
    submittedRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);

    // Chuyển đáp án từ thứ tự hiển thị (đã xáo) về thứ tự gốc để chấm & lưu đúng.
    const displayAnswers = answersRef.current;
    const originalAnswers = Array.from({ length: total }, () => -1);
    displayOrder.forEach((origIdx, displayIdx) => {
      const val = displayAnswers[displayIdx];
      originalAnswers[origIdx] = val === undefined || val === null || val === -1 ? -1 : val;
    });

    const { correctCount, score } = computeResult(originalAnswers);
    // Thời gian làm bài tính theo giờ thực nhưng không bao giờ vượt quá giới hạn đề ra.
    const limitSec = (comp.time_limit_minutes ?? 0) * 60;
    let durationSec = Math.max(0, Math.round((Date.now() - startedAtRef.current) / 1000));
    if (limitSec > 0) durationSec = Math.min(durationSec, limitSec);
    // Đặc quyền quản trị viên: nộp bài là tự động đạt điểm tối đa (điểm 10).
    const finalScore = isAdmin ? maxScore : score;
    const finalCorrectCount = isAdmin ? gradedTotal : correctCount;

    // Lưu kèm danh sách id các câu hỏi của lượt thi này (đúng thứ tự với mảng
    // đáp án) để màn xem chi tiết của quản trị viên chỉ hiện đúng những câu
    // thí sinh đã làm, không kéo toàn bộ ngân hàng câu hỏi gây lệch đáp án.
    const questionIds = questions.map((q) => q.id);
    const res = await saveQuizResult(finalScore, maxScore, finalCorrectCount, originalAnswers, comp.id, durationSec, guest, violationsRef.current, questionIds);
    if (!res.ok && !auto) {
      setSubmitError(res.error || "Không thể lưu kết quả. Vui lòng thử lại.");
      submittedRef.current = false;
      return;
    }

    // Nộp xong thì xóa tiến trình tạm (cả trên máy lẫn máy chủ) cho lần sau.
    clearSavedExam(comp.id);
    if (user && comp) {
      clearQuizProgress(comp.id, user.id).catch(() => {});
    }

    // Ghi dấu thiết bị đã hoàn thành bài thi (hỗ trợ chế độ "chỉ thi 1 lần").
    if (comp.allow_retake === false && typeof window !== "undefined") {
      try {
        localStorage.setItem(`quiz_done_${comp.id}`, "1");
      } catch {
        // Bỏ qua nếu trình duyệt chặn localStorage.
      }
    }

    // Gỡ chặn nút Back và dọn mục lịch sử guard.
    if (examPopHandlerRef.current) {
      window.removeEventListener("popstate", examPopHandlerRef.current);
      examPopHandlerRef.current = null;
      // Chỉ nộp thủ công mới cần lùi lịch sử để trở lại đúng màn hình.
      if (!auto) window.history.back();
    }

    // Nộp tự động (hết giờ hoặc vi phạm quá số lần): lưu bài xong thì hiển thị
    // thẳng màn kết quả như nộp thủ công, không quay về trang chủ.
    if (auto) {
      setResult({
        score: finalScore,
        maxScore,
        correctCount: finalCorrectCount,
        gradedTotal,
        manualCount,
        scorePerQ,
        durationSec,
      });
      setScreen("result");
      return;
    }

    setResult({
      score: finalScore,
      maxScore,
      correctCount: finalCorrectCount,
      gradedTotal,
      manualCount,
      scorePerQ,
      durationSec,
    });
    setScreen("result");
  };

  // Đồng bộ tiến trình lên máy chủ theo nhịp chậm (debounce) mỗi khi đáp án đổi.
  useEffect(() => {
    if (screen !== "exam" || !comp || !user) return undefined;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      void syncProgressToServer();
    }, 2500);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, screen, comp, user, displayOrder]);

  // Khi thí sinh chuyển tab / ẩn cửa sổ thì đẩy ngay lên máy chủ để phòng khi
  // mất kết nối đột ngột (đóng máy, tụt mạng...).
  useEffect(() => {
    if (screen !== "exam" || !user) return undefined;
    const push = () => {
      if (document.visibilityState === "hidden") void syncProgressToServer();
    };
    document.addEventListener("visibilitychange", push);
    return () => document.removeEventListener("visibilitychange", push);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, user, comp, displayOrder]);

  const handleAnswer = (qIndex: number, value: number | string) => {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIndex] = value;
      answersRef.current = next;
      return next;
    });
  };

  const handleStart = async (info: GuestInfo | null) => {
    // Nếu cuộc thi đặt chế độ "chỉ thi 1 lần", kiểm tra người này đã có kết quả chưa.
    if (comp?.allow_retake === false) {
      const phone = info?.phone ?? null;
      // Lớp chặn theo thiết bị: máy này đã từng hoàn thành bài thi thì chặn ngay,
      // kể cả khi thí sinh nhập SĐT khác để cố tình thi lại.
      const deviceKey = `quiz_done_${comp.id}`;
      if (typeof window !== "undefined") {
        try {
          if (localStorage.getItem(deviceKey) === "1") {
            setAttemptBlocked(
              "Thiết bị này đã hoàn thành bài thi rồi. Mỗi thí sinh chỉ được thi duy nhất 1 lần để lấy kết quả.",
            );
            return;
          }
        } catch {
          // Bỏ qua nếu trình duyệt chặn localStorage (chế độ riêng tư...).
        }
      }
      const alreadyTaken = await hasCompletedAttempt(comp.id, {
        userId: user?.id ?? null,
        phone,
      });
      if (alreadyTaken) {
        setAttemptBlocked(
          "Bạn đã hoàn thành bài thi này rồi. Mỗi thí sinh chỉ được thi duy nhất 1 lần để lấy kết quả.",
        );
        return;
      }
    }

    const effectiveGuest: GuestInfo =
      info ??
      (profile
        ? {
            fullName: profile.full_name ?? "",
            unit: profile.unit ?? "",
            phone: "",
            rank: profile.rank ?? "",
            position: profile.position ?? "",
          }
        : { fullName: "", unit: "", phone: "", rank: "", position: "" });
    setGuest(effectiveGuest);

    const limitSec = (comp?.time_limit_minutes ?? 0) * 60;

    // 1) Bản lưu tạm trên chính máy này.
    const local = comp ? readSavedExam(comp.id) : null;
    const localMatches = !!local && local.displayOrder?.length === questions.length;

    // 2) Bản lưu trên máy chủ (nếu thí sinh đã đăng nhập) — giúp khôi phục khi đổi thiết bị.
    let remote: SavedExam | null = null;
    if (user && comp) {
      try {
        const row = await getQuizProgress(comp.id, user.id);
        const pkg = row?.answers as
          | { deadline?: number | null; startedAt?: number; answers?: (number | string)[]; displayOrder?: number[] }
          | null;
        if (pkg && Array.isArray(pkg.answers) && Array.isArray(pkg.displayOrder)) {
          remote = {
            deadline: pkg.deadline == null ? Number.POSITIVE_INFINITY : Number(pkg.deadline),
            startedAt: typeof pkg.startedAt === "number" ? pkg.startedAt : 0,
            answers: pkg.answers,
            displayOrder: pkg.displayOrder,
          };
        }
      } catch {
        // Máy chủ không phản hồi: vẫn dùng bản lưu trên máy.
      }
    }
    const remoteMatches = !!remote && remote.displayOrder?.length === questions.length;

    const nowMs = Date.now();
    const isExpired = (s: SavedExam | null) => !!s && Number.isFinite(s.deadline) && s.deadline <= nowMs;
    const isActive = (s: SavedExam | null) => !!s && !isExpired(s);

    // Bản lưu còn hạn để hồi phục (đang làm dở, chưa hết thời gian).
    const saved =
      [localMatches && isActive(local) ? local : null, remoteMatches && isActive(remote) ? remote : null]
        .filter((s): s is SavedExam => !!s)
        .sort((a, b) => b.startedAt - a.startedAt)[0] ?? null;

    // Bản lưu đã QUÁ HẠN: thí sinh bắt đầu làm nhưng rời đi, giờ mới quay lại khi
    // đã hết thời gian. Không cho làm lại từ đầu mà nộp luôn bài đã lưu.
    const expired =
      [localMatches && isExpired(local) ? local : null, remoteMatches && isExpired(remote) ? remote : null]
        .filter((s): s is SavedExam => !!s)
        .sort((a, b) => b.startedAt - a.startedAt)[0] ?? null;

    const restoreInto = (s: SavedExam) => {
      startedAtRef.current = s.startedAt;
      deadlineRef.current = s.deadline;
      setDisplayOrder(s.displayOrder);
      const restored = Array.from({ length: questions.length }, (_, i) => {
        const v = s.answers?.[i];
        return v === undefined || v === null ? -1 : v;
      });
      answersRef.current = restored;
      setAnswers(restored);
    };

    if (saved) {
      // Đang làm dở và còn thời gian: khôi phục đúng chỗ đã dừng.
      restoreInto(saved);
    } else if (expired) {
      // Hết giờ trong lúc thí sinh không có mặt: tự động nộp bài đã lưu.
      restoreInto(expired);
      setTimeLeft(0);
      violationsRef.current = 0;
      setViolations(0);
      submittedRef.current = false;
      setScreen("exam"); // phòng thi thấy đồng hồ 0 sẽ tự nộp ngay.
      return;
    } else {
      const order =
        comp?.shuffle_questions !== false
          ? buildDisplayOrder(questions)
          : questions.map((_, i) => i);
      setDisplayOrder(order);
      startedAtRef.current = Date.now();
      deadlineRef.current = limitSec > 0 ? Date.now() + limitSec * 1000 : Number.POSITIVE_INFINITY;
      const initial = Array.from({ length: questions.length }, () => -1);
      answersRef.current = initial;
      setAnswers(initial);
      if (comp) {
        writeSavedExam(comp.id, {
          deadline: deadlineRef.current,
          startedAt: startedAtRef.current,
          answers: initial,
          displayOrder: order,
        });
      }
    }

    setTimeLeft(
      Number.isFinite(deadlineRef.current)
        ? Math.max(0, Math.round((deadlineRef.current - Date.now()) / 1000))
        : 0,
    );
    violationsRef.current = 0;
    setViolations(0);
    setScreen("exam");
    submittedRef.current = false;
  };

  const handleRestart = () => {
    setScreen("intro");
    setGuest(null);
    setDisplayOrder([]);
    answersRef.current = [];
    setAnswers([]);
    setResult(null);
    setSubmitError("");
    setShowExitConfirm(false);
    setAttemptBlocked("");
    submittedRef.current = false;
    violationsRef.current = 0;
    setViolations(0);
    if (timerRef.current) clearInterval(timerRef.current);
    deadlineRef.current = Number.POSITIVE_INFINITY;
    if (comp) {
      clearSavedExam(comp.id);
      if (user) clearQuizProgress(comp.id, user.id).catch(() => {});
      setTimeLeft(comp.time_limit_minutes * 60);
    }
  };

  const handleExitClick = () => {
    setShowExitConfirm(true);
  };

  const handleExitStop = () => {
    setShowExitConfirm(false);
    if (submittedRef.current) {
      handleRestart();
      return;
    }
    doSubmit(false);
  };

  const handleExitContinue = () => {
    setShowExitConfirm(false);
  };

  // Bộ chống gian lận: bật khi đang ở trong phòng thi, tự nộp bài khi vi phạm quá mức.
  useExamAntiCheat({
    enabled: screen === "exam" && antiCheatEnabled,
    maxViolations: 3,
    onViolation: (count) => {
      setViolations(count);
      violationsRef.current = count;
    },
    onMaxViolations: () => {
      if (!submittedRef.current) doSubmit(true);
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-military-cream">
        <Navbar />
        <section className="py-16 md:py-24 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
        </section>
        <Footer />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="min-h-screen bg-military-cream">
        <Navbar />
        <section className="py-16 md:py-24">
          <div className="max-w-3xl mx-auto px-4 text-center">
            <div className="inline-flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-4 text-sm text-left">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{loadError}</span>
            </div>
            <Link
              to="/competitions"
              className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap"
            >
              Về danh sách cuộc thi
            </Link>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (!comp) return null;

  const needLogin = comp.require_login || comp.restricted;

  // Bảo vệ cuộc thi yêu cầu đăng nhập / giới hạn người được thi.
  if (needLogin) {
    if (authLoading) {
      return (
        <div className="min-h-screen bg-military-cream">
          <Navbar />
          <section className="py-16 md:py-24 flex items-center justify-center">
            <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
          </section>
          <Footer />
        </div>
      );
    }
    if (!user) {
      return (
        <div className="min-h-screen bg-military-cream flex flex-col">
          <Navbar />
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-military-cream-dark max-w-md w-full p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-military-red/10">
                <Lock className="w-7 h-7 text-military-red" />
              </div>
              <h2 className="text-xl font-extrabold text-military-red-dark mb-2">Cần đăng nhập để tham gia</h2>
              <p className="text-sm text-foreground-600 mb-6">
                Cuộc thi &quot;{comp.title}&quot; chỉ dành cho cán bộ có tài khoản. Vui lòng đăng nhập để tiếp tục.
              </p>
              <Link
                to={`/login?redirect=/competition/${comp.id}`}
                className="inline-flex items-center gap-2 px-6 py-3 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap"
              >
                <Lock className="w-4 h-4" />
                Đăng nhập để vào thi
              </Link>
            </div>
          </div>
          <Footer />
        </div>
      );
    }

    if (comp.restricted && !isAdmin && !(comp.allowed_user_ids ?? []).includes(user.id)) {
      return (
        <div className="min-h-screen bg-military-cream flex flex-col">
          <Navbar />
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-military-cream-dark max-w-md w-full p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-military-red/10">
                <Lock className="w-7 h-7 text-military-red" />
              </div>
              <h2 className="text-xl font-extrabold text-military-red-dark mb-2">Không đủ điều kiện tham gia</h2>
              <p className="text-sm text-foreground-600 mb-6">
                Tài khoản của bạn không nằm trong danh sách được phép tham gia cuộc thi &quot;{comp.title}&quot;.
              </p>
              <Link
                to="/competitions"
                className="inline-flex items-center gap-2 px-6 py-3 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap"
              >
                Về danh sách cuộc thi
              </Link>
            </div>
          </div>
          <Footer />
        </div>
      );
    }
  }

  if (submitError) {
    return (
      <div className="min-h-screen bg-[#f4f4f4] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-military-red/30 max-w-md w-full p-8 text-center">
          <AlertCircle className="w-10 h-10 text-military-red mx-auto mb-3" />
          <p className="text-foreground-800 font-bold mb-2">Không thể nộp bài</p>
          <p className="text-sm text-foreground-600 mb-6">{submitError}</p>
          <button
            onClick={handleRestart}
            className="inline-flex items-center gap-2 px-6 py-3 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (screen === "exam") {
    return (
      <>
        <ExamRoom
          comp={comp}
          questions={displayQuestions}
          answers={answers}
          timeLeft={timeLeft}
          guest={guest}
          violations={violations}
          onAnswer={handleAnswer}
          onSubmit={() => doSubmit(false)}
          onExit={handleExitClick}
        />
        {showExitConfirm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" role="dialog" aria-modal="true">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 md:p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-4 flex items-center justify-center rounded-full bg-military-red/10">
                <AlertCircle className="w-7 h-7 text-military-red" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Bạn vẫn chưa hoàn thành bài thi!</h3>
              <p className="text-sm text-gray-600 mb-2">
                Bạn đang trong phòng thi và chưa nộp bài. Nếu thoát ra, bài làm sẽ được <strong>chấm điểm ngay</strong> và lưu lại để quản trị viên xem xét.
              </p>
              <p className="text-sm text-gray-500 mb-6">Bạn muốn tiếp tục làm bài hay dừng lại ngay?</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleExitContinue}
                  className="flex-1 px-6 py-3 rounded-lg font-bold text-white bg-military-red hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
                >
                  Tiếp tục làm bài
                </button>
                <button
                  onClick={handleExitStop}
                  className="flex-1 px-6 py-3 rounded-lg font-bold text-gray-800 bg-gray-200 hover:bg-gray-300 transition-colors whitespace-nowrap cursor-pointer"
                >
                  Dừng lại &amp; nộp bài
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  if (screen === "result" && result) {
    return (
      <ExamResult
        score={result.score}
        maxScore={result.maxScore}
        scorePerQ={result.scorePerQ}
        durationSec={result.durationSec}
        displayName={guest?.fullName || profile?.full_name || "Thí sinh"}
        displayUnit={guest?.unit || profile?.unit || "—"}
        displayPhone={guest?.phone || "—"}
        compTitle={comp.title}
        questions={displayQuestions}
        answers={answers}
        canRestart={comp.allow_retake !== false}
        onRestart={handleRestart}
      />
    );
  }

  return (
    <div className="min-h-screen bg-military-cream flex flex-col">
      <Navbar />
      <div className="flex-1">
        <ExamIntro
          comp={comp}
          total={total}
          maxScore={maxScore}
          requireLogin={needLogin}
          profile={profile}
          blockedMessage={attemptBlocked}
          questionSets={questionSets}
          selectedSet={selectedSet}
          onSelectSet={setSelectedSet}
          onStart={handleStart}
        />
      </div>
      <Footer />
    </div>
  );
}