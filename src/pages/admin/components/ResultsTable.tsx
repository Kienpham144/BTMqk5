import { useState, useEffect } from "react";
import { Trophy, RefreshCw, AlertCircle, Eye, Download, X, FileText, Save, Trash2, Search, ChevronLeft, ChevronRight, Pencil, Check, Undo2, Clock, Award, ArrowLeft, ShieldCheck } from "lucide-react";
import { downloadXlsx } from "@/lib/downloadXlsx";
import {
  listQuizResults,
  listQuizQuestions,
  listCompetitions,
  updateQuizResultGrade,
  updateQuizResultFull,
  deleteQuizResult,
  deleteQuizResults,
  isEssayAnswerCorrect,
  getRankingVisibility,
  setRankingVisibility,
  getAntiCheatEnabled,
  setAntiCheatEnabled,
  listAbandonedAttempts,
  type QuizResult,
  type QuizQuestion,
  type Competition,
  type AbandonedAttempt,
} from "@/lib/supabase";
import ResultsCompetitionList from "./ResultsCompetitionList";

export default function ResultsTable() {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [abandoned, setAbandoned] = useState<AbandonedAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);
  const [exportMsg, setExportMsg] = useState("");
  const [grades, setGrades] = useState<Record<string, number>>({});
  const [savingGrade, setSavingGrade] = useState(false);
  const [gradeMsg, setGradeMsg] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<QuizResult | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"rank" | "recent">("rank");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 50;
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkTarget, setBulkTarget] = useState<{ ids: number[]; label: string } | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editAnswers, setEditAnswers] = useState<(number | string)[]>([]);
  const [editScore, setEditScore] = useState(0);
  const [editCorrectCount, setEditCorrectCount] = useState(0);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editMsg, setEditMsg] = useState("");
  const [showRanking, setShowRanking] = useState(true);
  const [rankingSaving, setRankingSaving] = useState(false);
  const [rankingMsg, setRankingMsg] = useState("");
  const [antiCheat, setAntiCheat] = useState(true);
  const [antiCheatSaving, setAntiCheatSaving] = useState(false);
  const [antiCheatMsg, setAntiCheatMsg] = useState("");
  // Cuộc thi đang chọn để xem bảng xếp hạng riêng (null = đang ở danh sách cuộc thi).
  const [selectedCompId, setSelectedCompId] = useState<number | null>(null);

  const load = () => {
    setLoading(true);
    setError("");
    Promise.all([listQuizResults(), listQuizQuestions(), listCompetitions()])
      .then(([rData, qData, cData]) => {
        setResults(rData);
        setQuestions(qData);
        setCompetitions(cData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Không thể tải kết quả.");
        setLoading(false);
      });
    // Danh sách bỏ thi tải riêng, lỗi cũng không làm hỏng bảng kết quả chính.
    listAbandonedAttempts()
      .then(setAbandoned)
      .catch(() => setAbandoned([]));
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    getRankingVisibility()
      .then(setShowRanking)
      .catch(() => {});
    getAntiCheatEnabled()
      .then(setAntiCheat)
      .catch(() => {});
  }, []);

  const handleToggleRanking = async () => {
    if (rankingSaving) return;
    setRankingSaving(true);
    setRankingMsg("");
    const next = !showRanking;
    try {
      await setRankingVisibility(next);
      setShowRanking(next);
      setRankingMsg(next ? "Đã bật chế độ xem bảng xếp hạng." : "Đã tắt chế độ xem bảng xếp hạng.");
      setTimeout(() => setRankingMsg(""), 3000);
    } catch (err) {
      setRankingMsg(err instanceof Error ? err.message : "Lỗi cập nhật chế độ xem.");
    } finally {
      setRankingSaving(false);
    }
  };

  const handleToggleAntiCheat = async () => {
    if (antiCheatSaving) return;
    setAntiCheatSaving(true);
    setAntiCheatMsg("");
    const next = !antiCheat;
    try {
      await setAntiCheatEnabled(next);
      setAntiCheat(next);
      setAntiCheatMsg(next ? "Đã bật chế độ chống gian lận." : "Đã tắt chế độ chống gian lận.");
      setTimeout(() => setAntiCheatMsg(""), 3000);
    } catch (err) {
      setAntiCheatMsg(err instanceof Error ? err.message : "Lỗi cập nhật chế độ chống gian lận.");
    } finally {
      setAntiCheatSaving(false);
    }
  };

  const detail = detailId != null ? results.find((r) => r.id === detailId) : null;

  // Danh sách câu hỏi của một lượt thi. Ưu tiên dùng đúng danh sách id câu hỏi đã
  // lưu khi nộp bài (mỗi thí sinh bốc ngẫu nhiên một tập câu khác nhau). Nếu là
  // bản ghi cũ chưa lưu id thì tạm dùng toàn bộ câu hỏi của cuộc thi.
  const questionsFor = (r: QuizResult): QuizQuestion[] => {
    const ids = r.question_ids;
    if (Array.isArray(ids) && ids.length > 0) {
      const byId = new Map(questions.map((q) => [q.id, q]));
      return ids.map((id) => byId.get(id)).filter((q): q is QuizQuestion => !!q);
    }
    return r.competition_id != null
      ? questions.filter((q) => q.competition_id === r.competition_id)
      : questions;
  };

  const detailQuestions = detail ? questionsFor(detail) : [];

  const detailComp = detail?.competition_id != null
    ? competitions.find((c) => c.id === detail.competition_id)
    : null;

  const compTitle = (id: number | null) => {
    if (id == null) return "-";
    return competitions.find((c) => c.id === id)?.title || `#${id}`;
  };

  // Giới hạn thời gian (giây) của từng cuộc thi, dùng để đối chiếu với thời gian
  // làm bài thực tế của thí sinh. 0 = cuộc thi không giới hạn thời gian.
  const compLimitSec = (id: number | null) => {
    if (id == null) return 0;
    const mins = competitions.find((c) => c.id === id)?.time_limit_minutes ?? 0;
    return mins > 0 ? mins * 60 : 0;
  };

  const fmt = (n: number) => Math.round(n * 100) / 100;

  // Kết quả của cuộc thi đang chọn (0 = chung / chưa gắn cuộc thi).
  const compResults = selectedCompId === null
    ? results
    : results.filter((r) => (r.competition_id ?? 0) === selectedCompId);

  // Lượt bỏ thi của cuộc thi đang chọn: người đã bắt đầu làm nhưng quá hạn không
  // nộp. Loại trừ những ai đã có kết quả (tránh trùng nếu dữ liệu còn sót lại).
  const selectedAbandoned = selectedCompId === null
    ? []
    : abandoned.filter(
        (a) =>
          (a.competition_id ?? 0) === selectedCompId &&
          !results.some(
            (r) =>
              r.user_id != null &&
              r.user_id === a.user_id &&
              (r.competition_id ?? 0) === selectedCompId,
          ),
      );

  const selectedCompTitle = selectedCompId === null
    ? ""
    : selectedCompId === 0
    ? "Kết quả chung (chưa gắn cuộc thi)"
    : competitions.find((c) => c.id === selectedCompId)?.title || `Cuộc thi #${selectedCompId}`;

  // Xếp hạng: điểm cao trước; bằng điểm thì ai trả lời nhanh hơn xếp trên.
  // Hoặc sắp xếp theo mới làm gần đây (ngày giờ thi giảm dần).
  const sortedResults = [...compResults].sort((a, b) => {
    if (sortMode === "recent") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (Number(b.score) !== Number(a.score)) return Number(b.score) - Number(a.score);
    return (a.duration_seconds ?? 999999) - (b.duration_seconds ?? 999999);
  });

  // Lọc theo từ khóa tìm kiếm: họ tên, tên đăng nhập, cấp bậc, chức vụ, đơn vị, cuộc thi.
  const keyword = search.trim().toLowerCase();
  const filteredResults = keyword
    ? sortedResults.filter((r) => {
        const haystack = [
          r.full_name,
          r.username,
          r.rank,
          r.position,
          r.unit,
          compTitle(r.competition_id),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(keyword);
      })
    : sortedResults;

  // Phân trang: mỗi trang 50 dòng.
  const totalPages = Math.max(1, Math.ceil(filteredResults.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginatedResults = filteredResults.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const allPageSelected = paginatedResults.length > 0 && paginatedResults.every((r) => selectedIds.has(r.id));
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        paginatedResults.forEach((r) => next.delete(r.id));
      } else {
        paginatedResults.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };
  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Số trang hiển thị (tối đa 5 nút xung quanh trang hiện tại).
  const pageNumbers: number[] = [];
  let startPage = Math.max(1, safePage - 2);
  let endPage = Math.min(totalPages, startPage + 4);
  startPage = Math.max(1, endPage - 4);
  for (let p = startPage; p <= endPage; p++) pageNumbers.push(p);

  const formatDuration = (sec: number | null) => {
    if (!sec || sec <= 0) return "-";
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatAnswer = (a: number | string) => {
    if (typeof a === "string") return a;
    if (a === -1 || a === undefined || a === null) return "-";
    return String.fromCharCode(65 + a);
  };

  // Khởi tạo điểm chấm tay khi mở chi tiết
  useEffect(() => {
    if (detail) {
      const init: Record<string, number> = {};
      detailQuestions.forEach((q) => {
        if (q.type === "essay" && q.grading_mode === "manual") {
          init[String(q.id)] = detail.manual_grades?.[String(q.id)] ?? 0;
        }
      });
      setGrades(init);
      setGradeMsg("");
      setEditing(false);
      setEditMsg("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailId]);

  const manualQuestionCount = detailQuestions.filter(
    (q) => q.type === "essay" && q.grading_mode === "manual" && q.graded !== false,
  ).length;

  const handleSaveGrades = async () => {
    if (!detail) return;
    setSavingGrade(true);
    setGradeMsg("");
    try {
      await updateQuizResultGrade(detail.id, grades);
      setGradeMsg("Đã lưu điểm chấm tay!");
      load();
      setTimeout(() => setGradeMsg(""), 2500);
    } catch (err) {
      setGradeMsg(err instanceof Error ? err.message : "Lỗi lưu điểm.");
    } finally {
      setSavingGrade(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteMsg("");
    try {
      await deleteQuizResult(deleteTarget.id);
      setDeleteTarget(null);
      if (detailId === deleteTarget.id) setDetailId(null);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(deleteTarget.id);
        return next;
      });
      load();
      setDeleteMsg("Đã xóa kết quả thi.");
      setTimeout(() => setDeleteMsg(""), 3000);
    } catch (err) {
      setDeleteMsg(err instanceof Error ? err.message : "Lỗi xóa kết quả.");
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!bulkTarget) return;
    setBulkDeleting(true);
    setDeleteMsg("");
    try {
      await deleteQuizResults(bulkTarget.ids);
      setBulkTarget(null);
      setSelectedIds(new Set());
      load();
      setDeleteMsg(`Đã xóa ${bulkTarget.ids.length} kết quả thi.`);
      setTimeout(() => setDeleteMsg(""), 3000);
    } catch (err) {
      setDeleteMsg(err instanceof Error ? err.message : "Lỗi xóa kết quả.");
    } finally {
      setBulkDeleting(false);
    }
  };

  // Bắt đầu chế độ chỉnh sửa kết quả: sao chép dữ liệu hiện tại vào form chỉnh sửa.
  const startEdit = () => {
    if (!detail) return;
    const base: (number | string)[] = Array.from({ length: detailQuestions.length }, () => -1);
    (detail.answers || []).forEach((a, i) => {
      base[i] = a;
    });
    setEditAnswers(base);
    setEditScore(detail.score);
    setEditCorrectCount(detail.correct_count);
    setEditing(true);
    setEditMsg("");
  };

  const setEditAnswer = (idx: number, value: number | string) => {
    setEditAnswers((prev) => {
      const next = [...prev];
      next[idx] = value;
      return next;
    });
  };

  // Tự chấm lại điểm từ đáp án đã sửa (khớp logic của luồng thi thật).
  const recomputeFromAnswers = () => {
    let correct = 0;
    detailQuestions.forEach((q, i) => {
      if (q.graded === false) return;
      const a = editAnswers[i];
      if (q.type === "essay") {
        if (q.grading_mode === "manual") return;
        if (typeof a === "string" && isEssayAnswerCorrect(a, q.essay_answers || [])) correct += 1;
        return;
      }
      if (a === q.answer) correct += 1;
    });
    const perQ = detailComp?.score_per_question ?? 1;
    setEditCorrectCount(correct);
    setEditScore(Math.round(correct * perQ * 100) / 100);
  };

  const handleSaveEdit = async () => {
    if (!detail) return;
    setSavingEdit(true);
    setEditMsg("");
    try {
      await updateQuizResultFull(detail.id, {
        score: editScore,
        correct_count: editCorrectCount,
        answers: editAnswers,
        manual_grades: manualQuestionCount > 0 ? grades : null,
      });
      setEditing(false);
      setEditMsg("Đã lưu thay đổi kết quả.");
      load();
      setTimeout(() => setEditMsg(""), 2500);
    } catch (err) {
      setEditMsg(err instanceof Error ? err.message : "Lỗi lưu kết quả.");
    } finally {
      setSavingEdit(false);
    }
  };

  // Tổng hợp câu trả lời trắc nghiệm dạng A/B/C/D
  const buildMcqSummary = (r: QuizResult): string => {
    const parts: string[] = [];
    questionsFor(r).forEach((q, idx) => {
      if (q.type === "essay") return;
      const a = r.answers?.[idx];
      parts.push(`${idx + 1}:${formatAnswer(a ?? -1)}`);
    });
    return parts.length ? parts.join("; ") : "";
  };

  // Tổng hợp chi tiết câu tự luận: thí sinh trả lời gì + chấm tự động/tay
  const buildEssaySummary = (r: QuizResult): string => {
    const qs = questionsFor(r);
    const parts: string[] = [];
    qs.forEach((q, idx) => {
      if (q.type !== "essay") return;
      const raw = r.answers?.[idx];
      const ansText = typeof raw === "string" ? raw : raw === -1 || raw == null ? "(trống)" : String(raw);
      if (q.grading_mode === "manual") {
        const grade = r.manual_grades?.[String(q.id)];
        parts.push(
          `Câu ${idx + 1}: "${ansText}" | Chấm tay: ${grade != null ? `${fmt(grade)}đ` : "chưa chấm"}`,
        );
      } else {
        const ok = typeof raw === "string" && isEssayAnswerCorrect(raw, q.essay_answers || []);
        parts.push(`Câu ${idx + 1}: "${ansText}" | ${ok ? "ĐÚNG (khớp đáp án)" : "SAI (không khớp)"}`);
      }
    });
    return parts.length ? parts.join(" --- ") : "(không có câu tự luận)";
  };

  const exportExcel = () => {
    const headers = [
      "Xếp hạng",
      "Họ và tên",
      "Tên đăng nhập",
      "Cấp bậc",
      "Chức vụ",
      "Đơn vị",
      "Cuộc thi",
      "Điểm số",
      "Tổng điểm",
      "Số câu đúng",
      "Vi phạm quy chế",
      "Thời gian làm bài",
      "Giới hạn thời gian",
      "Ngày thi",
      "Đáp án trắc nghiệm",
      "Câu tự luận (trả lời & chấm)",
    ];

    const cols = [
      { wch: 8 },
      { wch: 24 },
      { wch: 16 },
      { wch: 12 },
      { wch: 16 },
      { wch: 18 },
      { wch: 24 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 16 },
      { wch: 16 },
      { wch: 20 },
      { wch: 40 },
      { wch: 70 },
    ];

    const buildRows = (list: QuizResult[]) =>
      list.map((r, i) => ({
        "Xếp hạng": i + 1,
        "Họ và tên": r.full_name || r.username || "",
        "Tên đăng nhập": r.username || "",
        "Cấp bậc": r.rank || "",
        "Chức vụ": r.position || "",
        "Đơn vị": r.unit || "",
        "Cuộc thi": compTitle(r.competition_id),
        "Điểm số": fmt(r.score),
        "Tổng điểm": fmt(r.total),
        "Số câu đúng": r.correct_count,
        "Vi phạm quy chế": r.violations ?? 0,
        "Thời gian làm bài": formatDuration(r.duration_seconds ?? null),
        "Giới hạn thời gian": compLimitSec(r.competition_id) > 0 ? formatDuration(compLimitSec(r.competition_id)) : "Không giới hạn",
        "Ngày thi": new Date(r.created_at).toLocaleString("vi-VN"),
        "Đáp án trắc nghiệm": buildMcqSummary(r),
        "Câu tự luận (trả lời & chấm)": buildEssaySummary(r),
      }));

    const sheetName = (title: string) => {
      const clean = title.replace(/[\\/?*[\]:]/g, " ").replace(/\s+/g, " ").trim();
      return (clean || "Ket qua").slice(0, 31);
    };

    // Nhóm kết quả theo cuộc thi (mỗi cuộc thi 1 sheet)
    const groups = new Map<number, QuizResult[]>();
    sortedResults.forEach((r) => {
      const key = r.competition_id ?? 0;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    });

    const sheets = [...groups.keys()]
      .sort((a, b) => a - b)
      .map((key) => {
        const list = groups.get(key)!;
        const sorted = [...list].sort((a, b) => {
          if (Number(b.score) !== Number(a.score)) return Number(b.score) - Number(a.score);
          return (a.duration_seconds ?? 999999) - (b.duration_seconds ?? 999999);
        });
        const title = key === 0 ? "Chung" : compTitle(key);
        return { name: sheetName(title), rows: buildRows(sorted), header: headers, cols };
      });

    const fileName = `ket-qua-thi-${new Date().toISOString().slice(0, 10)}.xlsx`;
    downloadXlsx(sheets, fileName);
    setExportMsg("Đã xuất file Excel thành công!");
    setTimeout(() => setExportMsg(""), 3000);
  };

  return (
    <div className="bg-white rounded-2xl border border-military-cream-dark p-6">
      {/* Bật/tắt chế độ xem bảng xếp hạng công khai */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-military-cream/40 border border-military-cream-dark rounded-xl p-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-military-gold/20 flex items-center justify-center text-military-red-dark shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-military-red-dark">Bảng xếp hạng công khai</h3>
            <p className="text-xs text-foreground-600">
              {showRanking
                ? "Người dùng đang được phép xem bảng xếp hạng thi (chỉ xem, không chỉnh sửa)."
                : "Bảng xếp hạng đang bị ẩn khỏi người dùng."}
            </p>
            {rankingMsg && (
              <p className={`text-xs font-semibold mt-1 ${rankingMsg.startsWith("Đã") ? "text-military-green" : "text-military-red"}`}>
                {rankingMsg}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleToggleRanking}
          disabled={rankingSaving}
          className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors cursor-pointer disabled:opacity-60 shrink-0 ${
            showRanking ? "bg-military-green" : "bg-foreground-300"
          }`}
          title={showRanking ? "Tắt chế độ xem bảng xếp hạng" : "Bật chế độ xem bảng xếp hạng"}
        >
          <span
            className={`inline-block w-6 h-6 bg-white rounded-full shadow transform transition-transform ${
              showRanking ? "translate-x-9" : "translate-x-1"
            }`}
          />
          <span className={`absolute text-[10px] font-bold ${showRanking ? "left-2 text-white" : "right-2 text-foreground-700"}`}>
            {showRanking ? "BẬT" : "TẮT"}
          </span>
        </button>
      </div>

      {/* Bật/tắt chế độ chống gian lận */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-military-cream/40 border border-military-cream-dark rounded-xl p-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-military-red-dark">Chế độ chống gian lận</h3>
            <p className="text-xs text-foreground-600">
              {antiCheat
                ? "Đang giám sát gắt gao: chặn đổi tab, copy, chuột phải... và tự nộp bài sau 3 lần vi phạm."
                : "Đã nới lỏng: thí sinh làm bài thoải mái, không bị giám sát hay chặn thao tác."}
            </p>
            {antiCheatMsg && (
              <p className={`text-xs font-semibold mt-1 ${antiCheatMsg.startsWith("Đã bật") ? "text-military-green" : "text-military-red"}`}>
                {antiCheatMsg}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={handleToggleAntiCheat}
          disabled={antiCheatSaving}
          className={`relative inline-flex items-center h-8 w-16 rounded-full transition-colors cursor-pointer disabled:opacity-60 shrink-0 ${
            antiCheat ? "bg-military-green" : "bg-foreground-300"
          }`}
          title={antiCheat ? "Tắt chế độ chống gian lận" : "Bật chế độ chống gian lận"}
        >
          <span
            className={`inline-block w-6 h-6 bg-white rounded-full shadow transform transition-transform ${
              antiCheat ? "translate-x-9" : "translate-x-1"
            }`}
          />
          <span className={`absolute text-[10px] font-bold ${antiCheat ? "left-2 text-white" : "right-2 text-foreground-700"}`}>
            {antiCheat ? "BẬT" : "TẮT"}
          </span>
        </button>
      </div>

      {/* ===== Cấp 1: danh sách cuộc thi, chọn một cuộc thi để xem bảng xếp hạng riêng ===== */}
      {selectedCompId === null && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-bold text-military-red-dark">Kết quả bài thi</h2>
                <p className="text-xs text-foreground-600">
                  {results.length} lượt làm bài · {competitions.length} cuộc thi · Chọn một cuộc thi để xem bảng xếp hạng riêng.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportExcel}
                disabled={results.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-military-green text-white font-bold rounded-lg hover:bg-military-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Xuất Excel
              </button>
              <button
                onClick={load}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-military-red-dark font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Làm mới
              </button>
            </div>
          </div>

          {exportMsg && (
            <div className="flex items-center gap-2 bg-military-green/10 border border-military-green/30 text-military-green rounded-lg p-3 mb-4 text-sm">
              <Trophy className="w-4 h-4 shrink-0" />
              <span>{exportMsg}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 mb-5 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-16 text-foreground-600">
              <Trophy className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
              <p className="text-sm">Chưa có kết quả bài thi nào.</p>
            </div>
          ) : (
            <ResultsCompetitionList
              competitions={competitions}
              results={results}
              onSelect={(id) => {
                setSelectedCompId(id);
                setSearch("");
                setPage(1);
                setSortMode("rank");
                setSelectedIds(new Set());
              }}
            />
          )}
        </>
      )}

      {/* ===== Cấp 2: bảng xếp hạng riêng của cuộc thi đã chọn ===== */}
      {selectedCompId !== null && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setSelectedCompId(null);
                  setSearch("");
                  setPage(1);
                  setSelectedIds(new Set());
                }}
                className="w-10 h-10 rounded-lg bg-military-cream/60 hover:bg-military-cream-dark border border-military-cream-dark flex items-center justify-center text-military-red-dark transition-colors cursor-pointer shrink-0"
                title="Quay lại danh sách cuộc thi"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-bold text-military-red-dark">{selectedCompTitle}</h2>
                <p className="text-xs text-foreground-600">
                  {compResults.length} lượt làm bài · Bảng xếp hạng riêng của cuộc thi.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={exportExcel}
                disabled={compResults.length === 0}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-military-green text-white font-bold rounded-lg hover:bg-military-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
              >
                <Download className="w-4 h-4" />
                Xuất Excel
              </button>
              <button
                onClick={load}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-military-red-dark font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Làm mới
              </button>
            </div>
          </div>

      {/* Chuyển chế độ sắp xếp */}
      <div className="flex items-center gap-1 bg-military-cream/40 border border-military-cream-dark rounded-full p-1 w-fit mb-4">
        <button
          onClick={() => { setSortMode("rank"); setPage(1); }}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
            sortMode === "rank" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
          }`}
        >
          <Trophy className="w-4 h-4" />
          Điểm &amp; thời gian
        </button>
        <button
          onClick={() => { setSortMode("recent"); setPage(1); }}
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-bold whitespace-nowrap transition-colors cursor-pointer ${
            sortMode === "recent" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
          }`}
        >
          <Clock className="w-4 h-4" />
          Mới làm gần đây
        </button>
      </div>

      {exportMsg && (
        <div className="flex items-center gap-2 bg-military-green/10 border border-military-green/30 text-military-green rounded-lg p-3 mb-4 text-sm">
          <Trophy className="w-4 h-4 shrink-0" />
          <span>{exportMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 mb-5 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
        </div>
      ) : compResults.length === 0 ? (
        <div className="text-center py-16 text-foreground-600">
          <Trophy className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
          <p className="text-sm">Cuộc thi này chưa có kết quả bài thi nào.</p>
        </div>
      ) : (
        <>
          {/* Ô tìm kiếm */}
          <div className="mb-4">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-foreground-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                  setSelectedIds(new Set());
                }}
                placeholder="Tìm theo tên, đơn vị, chức vụ, cuộc thi..."
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border-2 border-military-cream-dark bg-white text-sm focus:border-military-red focus:outline-none"
              />
            </div>
            {keyword && (
              <p className="text-xs text-foreground-600 mt-2">
                Tìm thấy {filteredResults.length} kết quả cho từ khóa &quot;{search.trim()}&quot;.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2 mt-4">
              <p className="text-xs text-foreground-600">
                {selectedIds.size > 0
                  ? `Đã chọn ${selectedIds.size} kết quả`
                  : "Tích vào ô đầu mỗi dòng để chọn nhiều kết quả."}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    if (paginatedResults.length === 0) return;
                    setDeleteMsg("");
                    setBulkTarget({
                      ids: paginatedResults.map((r) => r.id),
                      label: `tất cả ${paginatedResults.length} kết quả trên trang này`,
                    });
                  }}
                  disabled={paginatedResults.length === 0}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-white text-military-red font-bold rounded-lg border-2 border-military-red hover:bg-military-red/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa tất cả trang này
                </button>
                <button
                  onClick={() => {
                    setDeleteMsg("");
                    setBulkTarget({ ids: Array.from(selectedIds), label: `${selectedIds.size} kết quả đã chọn` });
                  }}
                  disabled={selectedIds.size === 0}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa đã chọn
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-military-cream-dark text-left">
                  <th className="py-3 pr-2 w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 accent-military-red cursor-pointer"
                      aria-label="Chọn tất cả trên trang này"
                    />
                  </th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">{sortMode === "rank" ? "Xếp hạng" : "STT"}</th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Họ và tên</th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Cấp bậc</th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Chức vụ</th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Đơn vị</th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Cuộc thi</th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Điểm</th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Vi phạm</th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Thời gian làm bài</th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Ngày giờ thi</th>
                  <th className="py-3 font-bold text-military-red-dark whitespace-nowrap text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {paginatedResults.map((r, i) => {
                  const rank = (safePage - 1) * PAGE_SIZE + i + 1;
                  return (
                  <tr key={r.id} className="border-b border-military-cream-dark/60 hover:bg-military-cream/40 transition-colors">
                    <td className="py-3 pr-2">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(r.id)}
                        onChange={() => toggleSelect(r.id)}
                        className="w-4 h-4 accent-military-red cursor-pointer"
                        aria-label={`Chọn kết quả của ${r.full_name || r.username || "-"}`}
                      />
                    </td>
                    <td className="py-3 pr-4">
                      {sortMode === "rank" ? (
                        <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-extrabold ${
                          rank === 1
                            ? "bg-military-gold text-white"
                            : rank === 2
                            ? "bg-military-cream-dark text-foreground-700"
                            : rank === 3
                            ? "bg-military-red/30 text-military-red-dark"
                            : "text-foreground-600"
                        }`}>
                          {rank}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center w-7 h-7 text-xs font-bold text-foreground-600">
                          {rank}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 font-semibold text-military-red-dark">{r.full_name || r.username || "-"}</td>
                    <td className="py-3 pr-4 text-foreground-700">{r.rank || "-"}</td>
                    <td className="py-3 pr-4 text-foreground-700">{r.position || "-"}</td>
                    <td className="py-3 pr-4 text-foreground-700">{r.unit || "-"}</td>
                    <td className="py-3 pr-4 text-foreground-700 max-w-[180px] truncate">{compTitle(r.competition_id)}</td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${
                        r.score >= 7 ? "bg-military-green/10 text-military-green" : "bg-military-red/10 text-military-red"
                      }`}>
                        {fmt(r.score)}/{fmt(r.total)}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      {r.violations > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-military-red text-white text-xs font-bold" title="Số lần vi phạm quy chế thi">
                          <AlertCircle className="w-3 h-3" />
                          {r.violations}
                        </span>
                      ) : (
                        <span className="text-foreground-400">-</span>
                      )}
                    </td>
                    <td className="py-3 pr-4 whitespace-nowrap">
                      {(() => {
                        const dur = r.duration_seconds ?? null;
                        const limit = compLimitSec(r.competition_id);
                        const over = limit > 0 && dur != null && dur > limit;
                        return (
                          <div className="flex flex-col leading-tight">
                            <span className={over ? "font-bold text-military-red" : "text-foreground-700"}>
                              {formatDuration(dur)}
                            </span>
                            {limit > 0 ? (
                              <span className={`text-[11px] ${over ? "text-military-red font-semibold" : "text-foreground-500"}`}>
                                Giới hạn {formatDuration(limit)}{over ? " · vượt giới hạn" : ""}
                              </span>
                            ) : (
                              <span className="text-[11px] text-foreground-400">Không giới hạn</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 pr-4 text-foreground-600 whitespace-nowrap">
                      {new Date(r.created_at).toLocaleString("vi-VN")}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailId(r.id)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                          title="Xem đáp án thí sinh"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                          title="Xóa kết quả"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Phân trang */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-5">
              <p className="text-xs text-foreground-600">
                Hiển thị {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filteredResults.length)} trong {filteredResults.length} kết quả · Trang {safePage}/{totalPages}
              </p>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 border-military-cream-dark text-foreground-700 hover:border-military-red hover:text-military-red transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {startPage > 1 && (
                  <>
                    <button
                      onClick={() => setPage(1)}
                      className="inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-lg border-2 border-military-cream-dark text-sm font-bold text-foreground-700 hover:border-military-red hover:text-military-red transition-colors cursor-pointer whitespace-nowrap"
                    >
                      1
                    </button>
                    {startPage > 2 && <span className="text-foreground-500 px-1">…</span>}
                  </>
                )}
                {pageNumbers.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-lg text-sm font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      p === safePage
                        ? "bg-military-red text-white border-2 border-military-red"
                        : "border-2 border-military-cream-dark text-foreground-700 hover:border-military-red hover:text-military-red"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                {endPage < totalPages && (
                  <>
                    {endPage < totalPages - 1 && <span className="text-foreground-500 px-1">…</span>}
                    <button
                      onClick={() => setPage(totalPages)}
                      className="inline-flex items-center justify-center min-w-9 h-9 px-2 rounded-lg border-2 border-military-cream-dark text-sm font-bold text-foreground-700 hover:border-military-red hover:text-military-red transition-colors cursor-pointer whitespace-nowrap"
                    >
                      {totalPages}
                    </button>
                  </>
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg border-2 border-military-cream-dark text-foreground-700 hover:border-military-red hover:text-military-red transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Danh sách bỏ thi của cuộc thi đang chọn */}
      {selectedAbandoned.length > 0 && (
        <div className="mt-6 rounded-xl border border-military-red/30 bg-military-red/5 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-military-red/10 border-b border-military-red/20">
            <AlertCircle className="w-4 h-4 text-military-red shrink-0" />
            <h3 className="font-bold text-military-red-dark text-sm">
              Danh sách bỏ thi ({selectedAbandoned.length})
            </h3>
            <span className="text-xs text-foreground-600">
              Bắt đầu làm bài nhưng quá hạn mà không nộp.
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-military-red/20">
                  <th className="py-2.5 px-4 font-bold text-military-red-dark whitespace-nowrap">Họ và tên</th>
                  <th className="py-2.5 px-4 font-bold text-military-red-dark whitespace-nowrap">Cấp bậc</th>
                  <th className="py-2.5 px-4 font-bold text-military-red-dark whitespace-nowrap">Chức vụ</th>
                  <th className="py-2.5 px-4 font-bold text-military-red-dark whitespace-nowrap">Đơn vị</th>
                  <th className="py-2.5 px-4 font-bold text-military-red-dark whitespace-nowrap">Hết giờ lúc</th>
                  <th className="py-2.5 px-4 font-bold text-military-red-dark whitespace-nowrap">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {selectedAbandoned.map((a) => (
                  <tr
                    key={`${a.user_id}-${a.competition_id}`}
                    className="border-b border-military-red/10 last:border-0"
                  >
                    <td className="py-2.5 px-4 font-semibold text-military-red-dark">
                      {a.full_name || a.username || "-"}
                    </td>
                    <td className="py-2.5 px-4 text-foreground-700">{a.rank || "-"}</td>
                    <td className="py-2.5 px-4 text-foreground-700">{a.position || "-"}</td>
                    <td className="py-2.5 px-4 text-foreground-700">{a.unit || "-"}</td>
                    <td className="py-2.5 px-4 text-foreground-600 whitespace-nowrap">
                      {a.deadline ? new Date(a.deadline).toLocaleString("vi-VN") : "-"}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-military-red text-white text-xs font-bold whitespace-nowrap">
                        <AlertCircle className="w-3 h-3" />
                        Bỏ thi
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-military-cream-dark w-full max-w-3xl my-8">
            <div className="sticky top-0 bg-white rounded-t-2xl border-b border-military-cream-dark px-6 py-4 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
                  {editing ? <Pencil className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-military-red-dark">{editing ? "Chỉnh sửa kết quả bài làm" : "Chi tiết bài làm"}</h3>
                  <p className="text-xs text-foreground-600">
                    {detail.full_name || detail.username || "-"} · {detail.rank || "-"} · {detail.unit || "-"} · {compTitle(detail.competition_id)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {!editing && (
                  <button
                    onClick={startEdit}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer text-sm"
                  >
                    <Pencil className="w-4 h-4" />
                    Chỉnh sửa
                  </button>
                )}
                <button
                  onClick={() => {
                    setDetailId(null);
                    setEditing(false);
                    setEditMsg("");
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-foreground-500 hover:bg-foreground-100 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4 flex flex-wrap items-center gap-4 bg-military-cream/40 border-b border-military-cream-dark">
              <div>
                <div className="text-xs text-foreground-600">Điểm số</div>
                {editing ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={editScore}
                      onChange={(e) => setEditScore(parseFloat(e.target.value) || 0)}
                      className="w-24 px-3 py-1.5 rounded-lg border-2 border-military-red bg-white text-sm font-extrabold text-military-red"
                    />
                    <span className="text-sm text-foreground-600">/{fmt(detail.total)}</span>
                  </div>
                ) : (
                  <div className="font-extrabold text-military-red text-lg">
                    {fmt(detail.score)}/{fmt(detail.total)}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-foreground-600">Số câu đúng</div>
                {editing ? (
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={editCorrectCount}
                    onChange={(e) => setEditCorrectCount(parseInt(e.target.value, 10) || 0)}
                    className="w-24 px-3 py-1.5 rounded-lg border-2 border-military-cream-dark bg-white text-sm font-extrabold text-military-red-dark"
                  />
                ) : (
                  <div className="font-extrabold text-military-red-dark text-lg">
                    {detail.correct_count}/{detailQuestions.filter((q) => q.graded !== false).length}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-foreground-600">Thời gian làm bài</div>
                <div className="font-extrabold text-military-red-dark text-lg">
                  {formatDuration(detail.duration_seconds ?? null)}
                </div>
                {compLimitSec(detail.competition_id) > 0 && (
                  <div className={`text-[11px] ${(detail.duration_seconds ?? 0) > compLimitSec(detail.competition_id) ? "text-military-red font-semibold" : "text-foreground-500"}`}>
                    Giới hạn {formatDuration(compLimitSec(detail.competition_id))}
                    {(detail.duration_seconds ?? 0) > compLimitSec(detail.competition_id) ? " · vượt giới hạn" : ""}
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-foreground-600">Vi phạm quy chế</div>
                <div className={`font-extrabold text-lg ${(detail.violations ?? 0) > 0 ? "text-military-red" : "text-foreground-600"}`}>
                  {detail.violations ?? 0} lần
                </div>
              </div>
              <div>
                <div className="text-xs text-foreground-600">Ngày thi</div>
                <div className="font-bold text-military-red-dark text-sm">
                  {new Date(detail.created_at).toLocaleString("vi-VN")}
                </div>
              </div>
              {editing && (
                <button
                  onClick={recomputeFromAnswers}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white text-military-red-dark font-bold rounded-lg border-2 border-military-red hover:bg-military-red/5 transition-colors whitespace-nowrap cursor-pointer text-sm"
                  title="Tự chấm lại điểm và số câu đúng từ đáp án đã sửa"
                >
                  <RefreshCw className="w-4 h-4" />
                  Tự tính lại điểm
                </button>
              )}
              {manualQuestionCount > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-military-gold/20 text-military-red-dark text-xs font-bold">
                  <FileText className="w-3.5 h-3.5" />
                  {manualQuestionCount} câu tự luận chấm tay
                </div>
              )}
            </div>

            <div className="px-6 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {detailQuestions.length === 0 ? (
                <p className="text-sm text-foreground-600 text-center py-8">
                  Chưa có dữ liệu câu hỏi để hiển thị chi tiết.
                </p>
              ) : (
                detailQuestions.map((q, idx) => {
                  const userAnswer = detail.answers?.[idx] ?? -1;

                  // Câu hỏi tự luận
                  if (q.type === "essay") {
                    const answerText = typeof userAnswer === "string" ? userAnswer : "";
                    const notGraded = q.graded === false;
                    const autoGraded = q.grading_mode === "auto";
                    const isCorrect = autoGraded
                      ? isEssayAnswerCorrect(answerText, q.essay_answers || [])
                      : false;
                    const scorePerQ = detailComp?.score_per_question ?? 1;
                    return (
                      <div
                        key={q.id}
                        className={`rounded-xl border p-4 ${
                          notGraded
                            ? "border-military-cream-dark bg-military-cream/20"
                            : autoGraded
                            ? isCorrect
                              ? "border-military-green/30 bg-military-green/5"
                              : "border-military-red/30 bg-military-red/5"
                            : "border-military-gold/40 bg-military-gold/10"
                        }`}
                      >
                        <div className="flex items-start gap-2 mb-2">
                          <span className="text-sm font-bold text-military-red-dark mt-0.5">{idx + 1}.</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-military-green/10 text-military-green text-xs font-bold">
                                <FileText className="w-3 h-3" />
                                Tự luận
                              </span>
                              {notGraded ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-foreground-100 text-foreground-600">
                                  Không tính điểm
                                </span>
                              ) : (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                                  autoGraded ? "bg-military-gold/20 text-military-red-dark" : "bg-military-cream-dark text-foreground-700"
                                }`}>
                                  {autoGraded ? "Chấm tự động" : "Chấm tay"}
                                </span>
                              )}
                            </div>
                            <p className="font-semibold text-military-red-dark text-sm">{q.question}</p>
                          </div>
                        </div>

                        <div className="ml-6">
                          <div className="text-xs font-semibold text-foreground-600 mb-1">Câu trả lời của thí sinh:</div>
                          {editing ? (
                            <textarea
                              value={typeof editAnswers[idx] === "string" ? editAnswers[idx] : ""}
                              onChange={(e) => setEditAnswer(idx, e.target.value)}
                              rows={3}
                              placeholder="Nhập câu trả lời..."
                              className="w-full text-sm px-3 py-2 rounded-lg bg-white border-2 border-military-cream-dark focus:border-military-red focus:outline-none whitespace-pre-wrap"
                            />
                          ) : (
                            <div className="text-sm px-3 py-2 rounded-lg bg-white border border-military-cream-dark whitespace-pre-wrap">
                              {answerText || <span className="text-foreground-500 italic">Không trả lời</span>}
                            </div>
                          )}

                          {notGraded ? (
                            <div className="mt-2 text-xs font-bold text-foreground-600">
                              Câu hỏi tham khảo, không tính vào điểm.
                            </div>
                          ) : autoGraded ? (
                            <>
                              {q.essay_answers?.length > 0 && (
                                <div className="mt-2">
                                  <div className="text-xs font-semibold text-foreground-600 mb-1">Đáp án đúng:</div>
                                  <div className="flex flex-wrap gap-1.5">
                                    {q.essay_answers.map((ans, aIdx) => (
                                      <span key={aIdx} className="text-xs px-2 py-1 rounded-lg bg-military-green/10 border border-military-green/30 text-military-green">
                                        {ans}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="mt-2 text-xs font-bold">
                                {isCorrect ? (
                                  <span className="text-military-green">Trả lời đúng (+{fmt(scorePerQ)}đ)</span>
                                ) : (
                                  <span className="text-military-red">Chưa khớp với đáp án</span>
                                )}
                              </div>
                            </>
                          ) : (
                            <div className="mt-3">
                              <div className="text-xs font-semibold text-foreground-600 mb-1">
                                Chấm điểm ({fmt(scorePerQ)} điểm tối đa):
                              </div>
                              <input
                                type="number"
                                min={0}
                                max={scorePerQ}
                                step={0.1}
                                value={grades[String(q.id)] ?? 0}
                                onChange={(e) =>
                                  setGrades((prev) => ({
                                    ...prev,
                                    [String(q.id)]: Math.min(scorePerQ, Math.max(0, parseFloat(e.target.value) || 0)),
                                  }))
                                }
                                className="w-28 px-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm"
                              />
                            </div>
                          )}

                          {q.explanation && (
                            <div className="mt-2 text-xs text-foreground-600 bg-military-cream/50 rounded-lg px-3 py-2">
                              <strong>Gợi ý:</strong> {q.explanation}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Câu hỏi trắc nghiệm
                  const notGraded = q.graded === false;
                  const isCorrect = userAnswer === q.answer;
                  const noAnswer = userAnswer === -1;
                  return (
                    <div
                      key={q.id}
                      className={`rounded-xl border p-4 ${
                        notGraded
                          ? "border-military-cream-dark bg-military-cream/20"
                          : noAnswer
                          ? "border-military-cream-dark bg-military-cream/20"
                          : isCorrect
                          ? "border-military-green/30 bg-military-green/5"
                          : "border-military-red/30 bg-military-red/5"
                      }`}
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span className="text-sm font-bold text-military-red-dark mt-0.5">{idx + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <p className="font-semibold text-military-red-dark text-sm">{q.question}</p>
                            {notGraded && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-foreground-100 text-foreground-600 whitespace-nowrap">
                                Không tính điểm
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-1.5 ml-6">
                        {q.options.map((opt, oIdx) => {
                          if (editing) {
                            const isCorrectOpt = oIdx === q.answer;
                            const isSelected = editAnswers[idx] === oIdx;
                            let cls = "bg-white border-military-cream-dark text-foreground-700 text-left";
                            if (isCorrectOpt) {
                              cls = "bg-military-green/10 border-military-green/40 text-military-green font-bold";
                            } else if (isSelected) {
                              cls = "bg-military-red/10 border-military-red/40 text-military-red font-bold";
                            }
                            return (
                              <button
                                key={oIdx}
                                onClick={() => setEditAnswer(idx, oIdx)}
                                className={`text-sm px-2.5 py-1.5 rounded-lg border ${cls} cursor-pointer transition-colors whitespace-nowrap`}
                              >
                                {String.fromCharCode(65 + oIdx)}. {opt}
                                {isCorrectOpt && <span className="ml-1 text-[10px] font-normal">(đúng)</span>}
                              </button>
                            );
                          }
                          let cls = "bg-white border-military-cream-dark text-foreground-700";
                          if (oIdx === q.answer) {
                            cls = "bg-military-green/10 border-military-green/40 text-military-green font-bold";
                          } else if (oIdx === userAnswer && !isCorrect && !notGraded) {
                            cls = "bg-military-red/10 border-military-red/40 text-military-red font-bold";
                          }
                          return (
                            <div key={oIdx} className={`text-sm px-2.5 py-1.5 rounded-lg border ${cls}`}>
                              {String.fromCharCode(65 + oIdx)}. {opt}
                            </div>
                          );
                        })}
                      </div>
                      {editing ? (
                        <div className="ml-6 mt-2 flex items-center justify-between gap-2">
                          <span className="text-xs text-foreground-500">Bấm để chọn đáp án của thí sinh (màu xanh là đáp án đúng).</span>
                          <button
                            onClick={() => setEditAnswer(idx, -1)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-military-cream-dark text-foreground-600 text-xs hover:border-military-red hover:text-military-red transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            Bỏ chọn
                          </button>
                        </div>
                      ) : (
                        <div className="ml-6 mt-2 text-xs">
                          {notGraded ? (
                            <span className="text-foreground-600 font-bold">Câu hỏi tham khảo, không tính vào điểm.</span>
                          ) : noAnswer ? (
                            <span className="text-foreground-500 italic">Không trả lời</span>
                          ) : isCorrect ? (
                            <span className="text-military-green font-bold">Trả lời đúng</span>
                          ) : (
                            <span className="text-military-red font-bold">
                              Đã chọn {String.fromCharCode(65 + Number(userAnswer))} — Đáp án đúng là {String.fromCharCode(65 + q.answer)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {editing ? (
              <div className="px-6 py-4 border-t border-military-cream-dark flex flex-col sm:flex-row items-center justify-between gap-3">
                <span className={`text-sm ${editMsg.startsWith("Đã lưu") ? "text-military-green" : "text-military-red"}`}>
                  {editMsg || "Chỉnh sửa đáp án, điểm số rồi lưu lại."}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => { setEditing(false); setEditMsg(""); }}
                    disabled={savingEdit}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-foreground-700 font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
                  >
                    Hủy
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={savingEdit}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-60 whitespace-nowrap cursor-pointer"
                  >
                    {savingEdit ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            ) : (
              manualQuestionCount > 0 && (
                <div className="px-6 py-4 border-t border-military-cream-dark flex items-center justify-between gap-3">
                  <span className="text-sm text-foreground-600">
                    {gradeMsg || "Chấm điểm cho các câu tự luận rồi lưu lại."}
                  </span>
                  <button
                    onClick={handleSaveGrades}
                    disabled={savingGrade}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-green text-white font-bold rounded-lg hover:bg-military-green-dark transition-colors disabled:opacity-60 whitespace-nowrap cursor-pointer"
                  >
                    {savingGrade ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Lưu điểm chấm tay
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl border border-military-cream-dark w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-military-red-dark">Xóa kết quả thi?</h3>
                <p className="text-sm text-foreground-600 mt-1">
                  Bạn sắp xóa kết quả của{" "}
                  <strong className="text-military-red-dark">
                    {deleteTarget.full_name || deleteTarget.username || "-"}
                  </strong>{" "}
                  ({compTitle(deleteTarget.competition_id)}, {fmt(deleteTarget.score)}/{fmt(deleteTarget.total)} điểm).
                  Thao tác này không thể hoàn tác.
                </p>
              </div>
            </div>

            {deleteMsg && (
              <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 mb-4 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{deleteMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteMsg("");
                }}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-foreground-700 font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Xóa kết quả
              </button>
            </div>
          </div>
        </div>
      )}

      {bulkTarget && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl border border-military-cream-dark w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-military-red-dark">Xóa nhiều kết quả thi?</h3>
                <p className="text-sm text-foreground-600 mt-1">
                  Bạn sắp xóa <strong className="text-military-red-dark">{bulkTarget.label}</strong>. Thao tác này không thể hoàn tác.
                </p>
              </div>
            </div>

            {deleteMsg && (
              <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 mb-4 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{deleteMsg}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setBulkTarget(null);
                  setDeleteMsg("");
                }}
                disabled={bulkDeleting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-foreground-700 font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                {bulkDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}