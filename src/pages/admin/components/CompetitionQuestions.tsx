import { useState, useEffect } from "react";
import {
  HelpCircle,
  Plus,
  Trash2,
  Pencil,
  Save,
  X,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  FileUp,
  Check,
  FileText,
  ClipboardPaste,
  Eraser,
  BookOpen,
} from "lucide-react";
import {
  listQuizQuestions,
  createQuizQuestion,
  updateQuizQuestion,
  deleteQuizQuestion,
  deleteQuizQuestions,
  importQuizQuestionsViaServer,
  type QuizQuestion,
} from "@/lib/supabase";
import { parseDocxQuestions, parseCsvQuestions, parseTextQuestions, type ParsedQuestion } from "@/lib/parseQuestions";
import QuestionSetManager from "./QuestionSetManager";

interface Props {
  competitionId: number;
  title: string;
}

type GradingMode = "auto" | "manual";

interface EssayForm {
  question: string;
  grading_mode: GradingMode;
  essay_answers: string[];
  explanation: string;
  graded: boolean;
  question_set: string;
}

const EMPTY_ESSAY: EssayForm = {
  question: "",
  grading_mode: "auto",
  essay_answers: [""],
  explanation: "",
  graded: true,
  question_set: "",
};

export default function CompetitionQuestions({ competitionId, title }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<QuizQuestion>>();
  const [showAdd, setShowAdd] = useState(false);
  const [newQuestion, setNewQuestion] = useState({
    question: "",
    options: ["", "", "", ""],
    answer: 0,
    explanation: "",
    graded: true,
    question_set: "",
  });

  // ---- Câu hỏi tự luận ----
  const [showAddEssay, setShowAddEssay] = useState(false);
  const [newEssay, setNewEssay] = useState<EssayForm>(EMPTY_ESSAY);

  // ---- Bộ đề (question_set) ----
  const [setFilter, setSetFilter] = useState<string>("");
  const [showManageSets, setShowManageSets] = useState(false);

  const load = () => {
    setLoading(true);
    setError("");
    listQuizQuestions(competitionId)
      .then((data) => {
        setQuestions(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Lỗi tải câu hỏi.");
        setLoading(false);
      });
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [competitionId]);

  const handleCreate = async () => {
    setError("");
    setSuccess("");
    if (!newQuestion.question.trim()) {
      setError("Vui lòng nhập nội dung câu hỏi.");
      return;
    }
    const validOptions = newQuestion.options.filter((o) => o.trim());
    if (validOptions.length < 2) {
      setError("Cần ít nhất 2 đáp án.");
      return;
    }
    if (newQuestion.answer < 0 || newQuestion.answer >= validOptions.length) {
      setError("Đáp án đúng không hợp lệ.");
      return;
    }
    try {
      await createQuizQuestion({
        competition_id: competitionId,
        question: newQuestion.question,
        options: validOptions,
        answer: newQuestion.answer,
        explanation: newQuestion.explanation,
        order_index: questions.length + 1,
        type: "mcq",
        grading_mode: "auto",
        essay_answers: [],
        graded: newQuestion.graded,
        question_set: newQuestion.question_set.trim(),
      });
      setSuccess("Đã thêm câu hỏi!");
      setNewQuestion({ question: "", options: ["", "", "", ""], answer: 0, explanation: "", graded: true, question_set: "" });
      setShowAdd(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi thêm câu hỏi.");
    }
  };

  const handleCreateEssay = async () => {
    setError("");
    setSuccess("");
    if (!newEssay.question.trim()) {
      setError("Vui lòng nhập nội dung câu hỏi tự luận.");
      return;
    }
    const validAnswers =
      newEssay.grading_mode === "auto"
        ? newEssay.essay_answers.map((a) => a.trim()).filter((a) => a)
        : [];
    if (newEssay.grading_mode === "auto" && validAnswers.length === 0) {
      setError("Chế độ chấm tự động cần ít nhất 1 đáp án đúng.");
      return;
    }
    try {
      await createQuizQuestion({
        competition_id: competitionId,
        question: newEssay.question,
        options: [],
        answer: -1,
        explanation: newEssay.explanation,
        order_index: questions.length + 1,
        type: "essay",
        grading_mode: newEssay.grading_mode,
        essay_answers: validAnswers,
        graded: newEssay.graded,
        question_set: newEssay.question_set.trim(),
      });
      setSuccess("Đã thêm câu hỏi tự luận!");
      setNewEssay(EMPTY_ESSAY);
      setShowAddEssay(false);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi thêm câu hỏi tự luận.");
    }
  };

  const startEdit = (q: QuizQuestion) => {
    setEditingId(q.id);
    setEditForm({
      question: q.question,
      options: [...q.options],
      answer: q.answer,
      explanation: q.explanation,
      type: q.type,
      grading_mode: q.grading_mode,
      essay_answers: [...(q.essay_answers || [])],
      graded: q.graded ?? true,
      question_set: q.question_set ?? "",
    });
    setShowAdd(false);
    setShowAddEssay(false);
  };

  const handleUpdate = async (id: number) => {
    const isEssay = editForm?.type === "essay";
    if (isEssay) {
      if (!editForm?.question?.trim()) {
        setError("Vui lòng nhập nội dung câu hỏi.");
        return;
      }
      const validAnswers =
        editForm?.grading_mode === "auto"
          ? (editForm?.essay_answers || []).map((a) => a.trim()).filter((a) => a)
          : [];
      if (editForm?.grading_mode === "auto" && validAnswers.length === 0) {
        setError("Chế độ chấm tự động cần ít nhất 1 đáp án đúng.");
        return;
      }
      await updateQuizQuestion(id, {
        question: editForm?.question,
        options: [],
        answer: -1,
        explanation: editForm?.explanation,
        type: "essay",
        grading_mode: editForm?.grading_mode,
        essay_answers: validAnswers,
        graded: editForm?.graded,
        question_set: editForm?.question_set ?? "",
      });
    } else {
      await updateQuizQuestion(id, {
        question: editForm?.question,
        options: editForm?.options,
        answer: editForm?.answer,
        explanation: editForm?.explanation,
        type: "mcq",
        grading_mode: "auto",
        essay_answers: [],
        graded: editForm?.graded,
        question_set: editForm?.question_set ?? "",
      });
    }
    setEditingId(null);
    setSuccess("Đã cập nhật câu hỏi!");
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xóa câu hỏi này?")) return;
    try {
      await deleteQuizQuestion(id);
      setSuccess("Đã xóa câu hỏi!");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa câu hỏi.");
    }
  };

  const updateEditOption = (idx: number, val: string) => {
    const opts = [...(editForm?.options || [])];
    opts[idx] = val;
    setEditForm({ ...editForm, options: opts });
  };

  const updateNewOption = (idx: number, val: string) => {
    const opts = [...newQuestion.options];
    opts[idx] = val;
    setNewQuestion({ ...newQuestion, options: opts });
  };

  const updateEssayAnswer = (idx: number, val: string) => {
    const answers = [...newEssay.essay_answers];
    answers[idx] = val;
    setNewEssay({ ...newEssay, essay_answers: answers });
  };

  const addEssayAnswer = () => {
    setNewEssay({ ...newEssay, essay_answers: [...newEssay.essay_answers, ""] });
  };

  const removeEssayAnswer = (idx: number) => {
    if (newEssay.essay_answers.length <= 1) return;
    setNewEssay({
      ...newEssay,
      essay_answers: newEssay.essay_answers.filter((_, i) => i !== idx),
    });
  };

  const updateEditEssayAnswer = (idx: number, val: string) => {
    const answers = [...(editForm?.essay_answers || [])];
    answers[idx] = val;
    setEditForm({ ...editForm, essay_answers: answers });
  };

  const addEditEssayAnswer = () => {
    setEditForm({ ...editForm, essay_answers: [...(editForm?.essay_answers || []), ""] });
  };

  const removeEditEssayAnswer = (idx: number) => {
    if ((editForm?.essay_answers || []).length <= 1) return;
    setEditForm({
      ...editForm,
      essay_answers: (editForm?.essay_answers || []).filter((_, i) => i !== idx),
    });
  };

  // ---- Import from Word file ----
  const [showImport, setShowImport] = useState(false);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [importing, setImporting] = useState(false);
  const [importList, setImportList] = useState<ParsedQuestion[]>([]);
  const [importError, setImportError] = useState("");
  // Danh sách câu hỏi được nhận diện "sống" ngay khi dán (không cần bấm nút đọc).
  const [liveParsed, setLiveParsed] = useState<ParsedQuestion[]>([]);
  const [importProgress, setImportProgress] = useState<{ done: number; total: number } | null>(null);

  // ---- Tìm & xóa câu hỏi trùng lặp ----
  const [duplicates, setDuplicates] = useState<QuizQuestion[]>([]);
  const [findingDuplicates, setFindingDuplicates] = useState(false);
  const [deletingDuplicates, setDeletingDuplicates] = useState(false);

  const normalizeQuestionText = (text: string) =>
    (text || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

  const handleFindDuplicates = () => {
    setError("");
    setSuccess("");
    setFindingDuplicates(true);
    setDuplicates([]);
    const seen = new Map<string, QuizQuestion>();
    const dupList: QuizQuestion[] = [];
    // Câu hỏi được xem là trùng khi cùng loại (trắc nghiệm/tự luận) và nội dung
    // câu hỏi giống hệt nhau (bỏ dấu, thường hóa khoảng trắng). Giữ lại câu đầu
    // tiên (theo thứ tự order_index), các câu lặp lại về sau sẽ bị liệt kê để xóa.
    for (const q of questions) {
      const key = `${q.type || "mcq"}|${normalizeQuestionText(q.question)}`;
      if (seen.has(key)) {
        dupList.push(q);
      } else {
        seen.set(key, q);
      }
    }
    setDuplicates(dupList);
    setFindingDuplicates(false);
    if (dupList.length === 0) {
      setSuccess("Không tìm thấy câu hỏi trùng lặp nào. Danh sách đã sạch!");
    }
  };

  const handleDeleteDuplicates = async () => {
    if (duplicates.length === 0) return;
    setError("");
    setSuccess("");
    setDeletingDuplicates(true);
    try {
      await deleteQuizQuestions(duplicates.map((q) => q.id));
      setSuccess(`Đã xóa ${duplicates.length} câu hỏi trùng lặp!`);
      setDuplicates([]);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa câu hỏi trùng lặp.");
    } finally {
      setDeletingDuplicates(false);
    }
  };

  // Tự nhận diện câu hỏi ngay khi dán (có độ trễ nhỏ để không chạy liên tục khi gõ).
  useEffect(() => {
    const text = pasteText;
    if (!text.trim()) {
      setLiveParsed([]);
      return;
    }
    const timer = setTimeout(() => {
      try {
        setLiveParsed(parseTextQuestions(text));
      } catch {
        setLiveParsed([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [pasteText]);

  // Dán xong bấm 1 nút là lưu toàn bộ câu đã nhận diện, kèm thanh tiến trình.
  const handleQuickSave = async () => {
    if (liveParsed.length === 0) return;
    setImportError("");
    setSuccess("");
    setImporting(true);
    setImportProgress({ done: 0, total: liveParsed.length });
    const startIndex = questions.length + 1;
    try {
      const inserted = await importQuizQuestionsViaServer({
        competitionId,
        startIndex,
        questions: liveParsed.map((q) => ({
          question: q.question,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation,
        })),
        onProgress: (done, total) => setImportProgress({ done, total }),
      });
      setSuccess(`Đã lưu ${inserted} câu hỏi!`);
      setPasteText("");
      setLiveParsed([]);
      setShowPaste(false);
      load();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Lỗi lưu câu hỏi.");
    } finally {
      setImporting(false);
      setImportProgress(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError("");
    setImporting(true);
    try {
      let parsed: ParsedQuestion[] = [];
      if (file.name.toLowerCase().endsWith(".csv") || file.name.toLowerCase().endsWith(".txt")) {
        const text = await file.text();
        parsed = parseCsvQuestions(text);
      } else {
        parsed = await parseDocxQuestions(file);
      }
      if (parsed.length === 0) {
        setImportError("Không tìm thấy câu hỏi hợp lệ trong file. Kiểm tra lại định dạng.");
        setImportList([]);
      } else {
        setImportList(parsed);
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Lỗi đọc file.");
      setImportList([]);
    } finally {
      setImporting(false);
      e.target.value = "";
    }
  };

  const handleImport = async () => {
    if (importList.length === 0) return;
    setImportError("");
    setSuccess("");
    setImporting(true);
    const startIndex = questions.length + 1;
    try {
      const inserted = await importQuizQuestionsViaServer({
        competitionId,
        startIndex,
        questions: importList.map((q) => ({
          question: q.question,
          options: q.options,
          answer: q.answer,
          explanation: q.explanation,
        })),
      });
      setSuccess(`Đã nhập ${inserted} câu hỏi!`);
      setImportList([]);
      setShowImport(false);
      load();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Lỗi nhập câu hỏi.");
    } finally {
      setImporting(false);
    }
  };

  const essayCount = questions.filter((q) => q.type === "essay").length;
  const mcqCount = questions.length - essayCount;

  const allSets = Array.from(
    new Set(questions.map((q) => (q.question_set ?? "").trim()).filter((s) => s)),
  ).sort();
  const shownQuestions = setFilter
    ? questions.filter((q) => (q.question_set ?? "").trim() === setFilter)
    : questions;

  return (
    <div className="bg-military-cream/40 rounded-xl border border-military-cream-dark p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2 min-w-0">
          <HelpCircle className="w-5 h-5 text-military-red shrink-0" />
          <h3 className="font-bold text-military-red-dark truncate">Câu hỏi của: {title}</h3>
          <span className="text-xs text-foreground-600 shrink-0">
            ({questions.length} câu · {mcqCount} trắc nghiệm · {essayCount} tự luận)
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <button
            onClick={() => { setShowImport(!showImport); setShowPaste(false); setShowAdd(false); setShowAddEssay(false); setEditingId(null); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-military-gold text-military-red-dark text-sm font-bold rounded-lg hover:bg-military-gold-dark transition-colors whitespace-nowrap cursor-pointer"
          >
            <FileUp className="w-4 h-4" />
            Nhập từ Word
          </button>
          <button
            onClick={() => { setShowPaste(!showPaste); setShowImport(false); setShowAdd(false); setShowAddEssay(false); setEditingId(null); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-military-green text-white text-sm font-bold rounded-lg hover:bg-military-green-dark transition-colors whitespace-nowrap cursor-pointer"
          >
            <ClipboardPaste className="w-4 h-4" />
            Dán câu hỏi
          </button>
          <button
            onClick={() => { setShowAdd(!showAdd); setShowAddEssay(false); setShowImport(false); setShowPaste(false); setEditingId(null); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-military-red text-white text-sm font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Thêm câu hỏi
          </button>
          <button
            onClick={() => { setShowAddEssay(!showAddEssay); setShowAdd(false); setShowImport(false); setShowPaste(false); setEditingId(null); }}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-military-green text-white text-sm font-bold rounded-lg hover:bg-military-green-dark transition-colors whitespace-nowrap cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            Thêm câu tự luận
          </button>
          <button
            onClick={() => { setShowManageSets(!showManageSets); setShowAdd(false); setShowAddEssay(false); setShowImport(false); setShowPaste(false); setEditingId(null); }}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              showManageSets
                ? "bg-military-gold text-military-red-dark"
                : "bg-white text-military-red-dark border border-military-gold-dark hover:bg-military-gold/20"
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Quản lý bộ đề
          </button>
          <button
            onClick={handleFindDuplicates}
            disabled={findingDuplicates}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-military-gold-dark bg-white text-military-red-dark text-sm font-bold rounded-lg hover:bg-military-gold/20 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
          >
            <Eraser className="w-4 h-4" />
            {findingDuplicates ? "Đang tìm..." : "Tìm & xóa câu trùng"}
          </button>
          <button
            onClick={load}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-military-cream-dark hover:border-military-red text-military-red-dark transition-colors cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {allSets.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-foreground-600">
            <BookOpen className="w-3.5 h-3.5" />
            Lọc theo bộ đề:
          </span>
          <button
            onClick={() => setSetFilter("")}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap cursor-pointer ${
              setFilter === ""
                ? "bg-military-red text-white border-military-red"
                : "bg-white text-foreground-600 border-military-cream-dark hover:border-military-red"
            }`}
          >
            Tất cả ({questions.length})
          </button>
          {allSets.map((s) => (
            <button
              key={s}
              onClick={() => setSetFilter(setFilter === s ? "" : s)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors whitespace-nowrap cursor-pointer ${
                setFilter === s
                  ? "bg-military-green text-white border-military-green"
                  : "bg-white text-foreground-600 border-military-cream-dark hover:border-military-green"
              }`}
            >
              {s} ({questions.filter((q) => (q.question_set ?? "").trim() === s).length})
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 mb-4 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 bg-military-green/10 border border-military-green/30 text-military-green rounded-lg p-3 mb-4 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {showManageSets && (
        <QuestionSetManager
          competitionId={competitionId}
          questions={questions}
          onChanged={load}
          onClose={() => setShowManageSets(false)}
        />
      )}

      {showAdd && (
        <div className="bg-white rounded-xl border border-military-cream-dark p-4 mb-4 space-y-3">
          <h4 className="font-bold text-military-red-dark text-sm">Thêm câu hỏi trắc nghiệm mới</h4>
          <div>
            <label className="block text-sm font-semibold text-military-red-dark mb-1">Nội dung câu hỏi</label>
            <textarea
              value={newQuestion.question}
              onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
              placeholder="Nhập câu hỏi..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm resize-none"
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {newQuestion.options.map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <span className="text-sm font-bold text-military-red-dark w-6">{String.fromCharCode(65 + idx)}.</span>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateNewOption(idx, e.target.value)}
                  placeholder={`Đáp án ${String.fromCharCode(65 + idx)}`}
                  className="flex-1 px-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-semibold text-military-red-dark mb-1">Đáp án đúng</label>
              <select
                value={newQuestion.answer}
                onChange={(e) => setNewQuestion({ ...newQuestion, answer: parseInt(e.target.value) })}
                className="px-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm"
              >
                {newQuestion.options.map((_, idx) => (
                  <option key={idx} value={idx}>{String.fromCharCode(65 + idx)}</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm font-semibold text-military-red-dark mb-1">Giải thích</label>
              <input
                type="text"
                value={newQuestion.explanation}
                onChange={(e) => setNewQuestion({ ...newQuestion, explanation: e.target.value })}
                placeholder="Giải thích đáp án đúng..."
                className="w-full px-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-military-red-dark mb-1">Bộ đề (để trống nếu chỉ có 1 bộ đề)</label>
            <div className="relative">
              <BookOpen className="w-4 h-4 text-foreground-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={newQuestion.question_set}
                onChange={(e) => setNewQuestion({ ...newQuestion, question_set: e.target.value })}
                placeholder="VD: Đề 1, Đề dễ, Đề khó..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm"
                list="set-suggestions"
              />
            </div>
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newQuestion.graded}
              onChange={(e) => setNewQuestion({ ...newQuestion, graded: e.target.checked })}
              className="w-4 h-4 accent-military-green"
            />
            <span className="text-sm font-semibold text-foreground-700">
              Tính điểm câu này (bỏ tick nếu chỉ mang tính tham khảo)
            </span>
          </label>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors text-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Lưu câu hỏi
            </button>
            <button
              onClick={() => setShowAdd(false)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-foreground-700 font-bold rounded-lg border border-military-cream-dark hover:border-military-red transition-colors text-sm cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {showAddEssay && (
        <div className="bg-white rounded-xl border border-military-green-dark p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-military-green" />
            <h4 className="font-bold text-military-red-dark text-sm">Thêm câu hỏi tự luận mới</h4>
          </div>
          <div>
            <label className="block text-sm font-semibold text-military-red-dark mb-1">Nội dung câu hỏi</label>
            <textarea
              value={newEssay.question}
              onChange={(e) => setNewEssay({ ...newEssay, question: e.target.value })}
              placeholder="Nhập câu hỏi tự luận..."
              rows={3}
              className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-military-red-dark mb-1">Cách chấm điểm</label>
            <div className="inline-flex items-center rounded-full border border-military-cream-dark p-1 bg-military-cream/40">
              <button
                onClick={() => setNewEssay({ ...newEssay, grading_mode: "auto" })}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  newEssay.grading_mode === "auto"
                    ? "bg-military-green text-white"
                    : "text-foreground-600 hover:text-military-red-dark"
                }`}
              >
                Chấm tự động
              </button>
              <button
                onClick={() => setNewEssay({ ...newEssay, grading_mode: "manual" })}
                className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                  newEssay.grading_mode === "manual"
                    ? "bg-military-gold text-military-red-dark"
                    : "text-foreground-600 hover:text-military-red-dark"
                }`}
              >
                Chấm tay
              </button>
            </div>
            <p className="text-xs text-foreground-600 mt-1.5">
              {newEssay.grading_mode === "auto"
                ? "Hệ thống sẽ so khớp câu trả lời với các đáp án đúng bên dưới để tự chấm điểm."
                : "Bạn sẽ tự chấm điểm câu này trong phần kết quả bài thi."}
            </p>
          </div>

          {newEssay.grading_mode === "auto" && (
            <div>
              <label className="block text-sm font-semibold text-military-red-dark mb-1">Đáp án đúng</label>
              <div className="space-y-2">
                {newEssay.essay_answers.map((ans, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={ans}
                      onChange={(e) => updateEssayAnswer(idx, e.target.value)}
                      placeholder={`Đáp án đúng ${idx + 1}`}
                      className="flex-1 px-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm"
                    />
                    <button
                      onClick={() => removeEssayAnswer(idx)}
                      disabled={newEssay.essay_answers.length <= 1}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors disabled:opacity-40 cursor-pointer"
                      title="Xóa đáp án"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addEssayAnswer}
                className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-military-green font-bold text-xs rounded-lg border border-military-green/30 hover:bg-military-green/10 transition-colors whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Thêm đáp án đúng
              </button>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-military-red-dark mb-1">Gợi ý / Đáp án tham khảo (tùy chọn)</label>
            <textarea
              value={newEssay.explanation}
              onChange={(e) => setNewEssay({ ...newEssay, explanation: e.target.value })}
              placeholder="Hiển thị đáp án gợi ý cho thí sinh sau khi nộp bài..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-military-red-dark mb-1">Bộ đề (để trống nếu chỉ có 1 bộ đề)</label>
            <div className="relative">
              <BookOpen className="w-4 h-4 text-foreground-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={newEssay.question_set}
                onChange={(e) => setNewEssay({ ...newEssay, question_set: e.target.value })}
                placeholder="VD: Đề 1, Đề dễ, Đề khó..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm"
                list="set-suggestions"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={newEssay.graded}
              onChange={(e) => setNewEssay({ ...newEssay, graded: e.target.checked })}
              className="w-4 h-4 accent-military-green"
            />
            <span className="text-sm font-semibold text-foreground-700">
              Tính điểm câu này (bỏ tick nếu chỉ mang tính tham khảo)
            </span>
          </label>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateEssay}
              className="inline-flex items-center gap-2 px-4 py-2 bg-military-green text-white font-bold rounded-lg hover:bg-military-green-dark transition-colors text-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              Lưu câu hỏi tự luận
            </button>
            <button
              onClick={() => setShowAddEssay(false)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-foreground-700 font-bold rounded-lg border border-military-cream-dark hover:border-military-red transition-colors text-sm cursor-pointer"
            >
              Hủy
            </button>
          </div>
        </div>
      )}

      {showImport && (
        <div className="bg-white rounded-xl border border-military-gold-dark p-4 mb-4 space-y-3">
          <div className="flex items-center gap-2">
            <FileUp className="w-5 h-5 text-military-gold-dark" />
            <h4 className="font-bold text-military-red-dark text-sm">
              Nhập câu hỏi từ file Word
            </h4>
          </div>

          <div>
            <div className="rounded-xl border-2 border-dashed border-military-cream-dark bg-military-cream/30 p-6 text-center">
              <FileUp className="w-10 h-10 mx-auto mb-2 text-military-cream-dark" />
              <p className="text-sm text-foreground-700 mb-1">
                Chọn file CSV (.csv) hoặc Word (.docx) chứa câu hỏi
              </p>
              <p className="text-xs text-foreground-500 mb-4">
                Mỗi hàng 1 câu, 7 cột: câu hỏi | đáp án A | B | C | D | đáp án đúng | giải thích
              </p>
              <label className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-gold text-military-red-dark font-bold rounded-lg hover:bg-military-gold-dark transition-colors text-sm cursor-pointer">
                <Plus className="w-4 h-4" />
                {importing ? "Đang đọc file..." : "Chọn file (CSV/Word)"}
                <input
                  type="file"
                  accept=".csv,.txt,.docx,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={handleFileChange}
                  disabled={importing}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {importError && (
            <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}

        </div>
      )}

      {showPaste && (
        <div className="bg-white rounded-xl border border-military-green-dark p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ClipboardPaste className="w-5 h-5 text-military-green" />
              <h4 className="font-bold text-military-red-dark text-sm">Dán câu hỏi nhanh</h4>
            </div>
            {!importing && liveParsed.length > 0 && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-military-green/10 border border-military-green/30 text-military-green text-sm font-bold">
                <Check className="w-4 h-4" />
                Đã nhận {liveParsed.length} câu hợp lệ
              </span>
            )}
          </div>
          <p className="text-xs text-foreground-600">
            Bôi đen toàn bộ câu hỏi trong Word (Ctrl+A) rồi copy (Ctrl+C), dán (Ctrl+V) vào ô bên dưới.
            Hệ thống <strong>tự nhận diện ngay khi dán</strong> — chỉ cần bấm <strong>“Lưu ngay”</strong> là xong, không cần thêm bước nào.
            Mỗi câu bắt đầu bằng <strong>Câu 1.</strong>, các đáp án ghi <strong>A. B. C. D.</strong>, đáp án đúng ghi <strong>Đáp án: A</strong>.
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={"Dán nội dung câu hỏi vào đây...\n\nCâu 1. Nội dung câu hỏi? A. Đáp án A B. Đáp án B C. Đáp án C D. Đáp án D Đáp án: A\nCâu 2. Nội dung câu hỏi? A. Đáp án A B. Đáp án B C. Đáp án C D. Đáp án D Đáp án: B"}
            rows={12}
            className="w-full px-3 py-2.5 rounded-lg border border-military-cream-dark bg-white text-sm resize-y font-mono"
          />

          {liveParsed.length > 0 && (
            <div className="max-h-56 overflow-y-auto rounded-lg border border-military-green/20 divide-y divide-military-cream bg-military-cream/20">
              {liveParsed.map((q, idx) => (
                <div key={idx} className="px-3 py-2">
                  <p className="text-sm text-military-red-dark font-semibold">
                    {idx + 1}. {q.question}
                  </p>
                  <p className="text-xs text-foreground-600 mt-0.5">
                    {q.options.map((o, oi) => (
                      <span key={oi} className={oi === q.answer ? "text-military-green font-bold" : ""}>
                        {String.fromCharCode(65 + oi)}. {o}{" "}
                      </span>
                    ))}
                  </p>
                </div>
              ))}
            </div>
          )}

          {importProgress && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs font-semibold text-foreground-600">
                <span>Đang lưu câu hỏi...</span>
                <span>{importProgress.done}/{importProgress.total}</span>
              </div>
              <div className="h-2 rounded-full bg-military-cream overflow-hidden">
                <div
                  className="h-full bg-military-green transition-all"
                  style={{ width: `${importProgress.total ? Math.round((importProgress.done / importProgress.total) * 100) : 0}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleQuickSave}
              disabled={liveParsed.length === 0 || importing}
              className="inline-flex items-center gap-2 px-4 py-2 bg-military-green text-white font-bold rounded-lg hover:bg-military-green-dark transition-colors text-sm disabled:opacity-60 cursor-pointer"
            >
              {importing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {importing
                ? "Đang lưu..."
                : liveParsed.length > 0
                  ? `Lưu ngay ${liveParsed.length} câu`
                  : "Lưu ngay"}
            </button>
            <button
              onClick={() => { setShowPaste(false); setPasteText(""); setLiveParsed([]); setImportError(""); }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-foreground-700 font-bold rounded-lg border border-military-cream-dark hover:border-military-red transition-colors text-sm cursor-pointer"
            >
              Hủy
            </button>
          </div>
          {importError && (
            <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{importError}</span>
            </div>
          )}
        </div>
      )}

      {importList.length > 0 && (
        <div className="bg-white rounded-xl border border-military-cream-dark p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-military-green">
              <Check className="w-4 h-4 inline mr-1" />
              Tìm thấy {importList.length} câu hỏi hợp lệ
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={handleImport}
                disabled={importing}
                className="inline-flex items-center gap-2 px-4 py-2 bg-military-green text-white font-bold rounded-lg hover:bg-military-green-dark transition-colors text-sm disabled:opacity-60 cursor-pointer"
              >
                {importing ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {importing
                  ? "Đang nhập câu hỏi..."
                  : `Nhập ${importList.length} câu`}
              </button>
              <button
                onClick={() => { setImportList([]); setImportError(""); }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-foreground-700 font-bold rounded-lg border border-military-cream-dark hover:border-military-red transition-colors text-sm cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-military-cream-dark divide-y divide-military-cream">
            {importList.map((q, idx) => (
              <div key={idx} className="px-3 py-2 bg-white">
                <p className="text-sm text-military-red-dark font-semibold">
                  {idx + 1}. {q.question}
                </p>
                <p className="text-xs text-foreground-600 mt-0.5">
                  {q.options.map((o, oi) => (
                    <span key={oi} className={oi === q.answer ? "text-military-green font-bold" : ""}>
                      {String.fromCharCode(65 + oi)}. {o}{" "}
                    </span>
                  ))}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {duplicates.length > 0 && (
        <div className="bg-white rounded-xl border border-military-gold-dark p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-military-red-dark">
              <Eraser className="w-4 h-4 inline mr-1" />
              Tìm thấy {duplicates.length} câu hỏi trùng lặp (bản lặp sẽ bị xóa, giữ lại câu gốc đầu tiên)
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleDeleteDuplicates}
                disabled={deletingDuplicates}
                className="inline-flex items-center gap-2 px-4 py-2 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors text-sm disabled:opacity-60 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                {deletingDuplicates ? "Đang xóa..." : `Xóa ${duplicates.length} câu trùng`}
              </button>
              <button
                onClick={() => setDuplicates([])}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white text-foreground-700 font-bold rounded-lg border border-military-cream-dark hover:border-military-red transition-colors text-sm cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto rounded-lg border border-military-cream-dark divide-y divide-military-cream">
            {duplicates.map((q, idx) => (
              <div key={q.id} className="px-3 py-2 bg-white">
                <p className="text-sm text-foreground-700 font-semibold">
                  {idx + 1}. {q.question}
                </p>
                <p className="text-xs text-foreground-500 mt-0.5">
                  {q.type === "essay" ? "Tự luận" : "Trắc nghiệm"} · bản lặp của câu gốc phía trên
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <RefreshCw className="w-6 h-6 text-military-red animate-spin" />
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-10 text-foreground-600">
          <HelpCircle className="w-10 h-10 mx-auto mb-2 text-military-cream-dark" />
          <p className="text-sm">Chưa có câu hỏi nào cho cuộc thi này.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shownQuestions.map((q, idx) => (
            <div key={q.id} className="bg-white rounded-xl border border-military-cream-dark p-4">
              {editingId === q.id ? (
                q.type === "essay" ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-military-green/10 text-military-green text-xs font-bold">
                        <FileText className="w-3 h-3" />
                        Tự luận
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-military-red-dark mb-1">Câu hỏi</label>
                      <textarea
                        value={editForm?.question || ""}
                        onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-military-red-dark mb-1">Cách chấm điểm</label>
                      <div className="inline-flex items-center rounded-full border border-military-cream-dark p-1 bg-military-cream/40">
                        <button
                          onClick={() => setEditForm({ ...editForm, grading_mode: "auto" })}
                          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                            editForm?.grading_mode === "auto" ? "bg-military-green text-white" : "text-foreground-600"
                          }`}
                        >
                          Chấm tự động
                        </button>
                        <button
                          onClick={() => setEditForm({ ...editForm, grading_mode: "manual" })}
                          className={`px-4 py-1.5 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                            editForm?.grading_mode === "manual" ? "bg-military-gold text-military-red-dark" : "text-foreground-600"
                          }`}
                        >
                          Chấm tay
                        </button>
                      </div>
                    </div>
                    {editForm?.grading_mode === "auto" && (
                      <div>
                        <label className="block text-sm font-semibold text-military-red-dark mb-1">Đáp án đúng</label>
                        <div className="space-y-2">
                          {(editForm?.essay_answers || []).map((ans, aIdx) => (
                            <div key={aIdx} className="flex items-center gap-2">
                              <input
                                type="text"
                                value={ans}
                                onChange={(e) => updateEditEssayAnswer(aIdx, e.target.value)}
                                className="flex-1 px-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm"
                              />
                              <button
                                onClick={() => removeEditEssayAnswer(aIdx)}
                                disabled={(editForm?.essay_answers || []).length <= 1}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors disabled:opacity-40 cursor-pointer"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={addEditEssayAnswer}
                          className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-military-green font-bold text-xs rounded-lg border border-military-green/30 hover:bg-military-green/10 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          <Plus className="w-4 h-4" />
                          Thêm đáp án đúng
                        </button>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-semibold text-military-red-dark mb-1">Gợi ý / Đáp án tham khảo</label>
                      <textarea
                        value={editForm?.explanation || ""}
                        onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-military-red-dark mb-1">Bộ đề</label>
                      <div className="relative">
                        <BookOpen className="w-4 h-4 text-foreground-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={editForm?.question_set || ""}
                          onChange={(e) => setEditForm({ ...editForm, question_set: e.target.value })}
                          placeholder="Để trống nếu chỉ có 1 bộ đề"
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm"
                          list="set-suggestions"
                        />
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editForm?.graded ?? true}
                        onChange={(e) => setEditForm({ ...editForm, graded: e.target.checked })}
                        className="w-4 h-4 accent-military-green"
                      />
                      <span className="text-sm font-semibold text-foreground-700">
                        Tính điểm câu này (bỏ tick nếu chỉ mang tính tham khảo)
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdate(q.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-military-green text-white font-bold rounded-lg hover:bg-military-green-dark transition-colors text-sm cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        Lưu
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-foreground-700 font-bold rounded-lg border border-military-cream-dark hover:border-military-red transition-colors text-sm cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-military-red-dark mb-1">Câu hỏi</label>
                      <textarea
                        value={editForm?.question || ""}
                        onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm resize-none"
                      />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-2">
                      {(editForm?.options || []).map((opt, oIdx) => (
                        <div key={oIdx} className="flex items-center gap-2">
                          <span className={`text-sm font-bold w-6 ${(editForm?.answer ?? 0) === oIdx ? "text-military-green" : "text-foreground-400"}`}>
                            {String.fromCharCode(65 + oIdx)}.
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => updateEditOption(oIdx, e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm"
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <label className="block text-sm font-semibold text-military-red-dark mb-1">Đáp án đúng</label>
                        <select
                          value={editForm?.answer ?? 0}
                          onChange={(e) => setEditForm({ ...editForm, answer: parseInt(e.target.value) })}
                          className="px-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm"
                        >
                          {(editForm?.options || []).map((_, oIdx) => (
                            <option key={oIdx} value={oIdx}>{String.fromCharCode(65 + oIdx)}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-semibold text-military-red-dark mb-1">Giải thích</label>
                        <input
                          type="text"
                          value={editForm?.explanation || ""}
                          onChange={(e) => setEditForm({ ...editForm, explanation: e.target.value })}
                          className="w-full px-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-military-red-dark mb-1">Bộ đề</label>
                      <div className="relative">
                        <BookOpen className="w-4 h-4 text-foreground-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={editForm?.question_set || ""}
                          onChange={(e) => setEditForm({ ...editForm, question_set: e.target.value })}
                          placeholder="Để trống nếu chỉ có 1 bộ đề"
                          className="w-full pl-9 pr-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm"
                          list="set-suggestions"
                        />
                      </div>
                    </div>
                    <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editForm?.graded ?? true}
                        onChange={(e) => setEditForm({ ...editForm, graded: e.target.checked })}
                        className="w-4 h-4 accent-military-green"
                      />
                      <span className="text-sm font-semibold text-foreground-700">
                        Tính điểm câu này (bỏ tick nếu chỉ mang tính tham khảo)
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleUpdate(q.id)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-military-green text-white font-bold rounded-lg hover:bg-military-green-dark transition-colors text-sm cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        Lưu
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-foreground-700 font-bold rounded-lg border border-military-cream-dark hover:border-military-red transition-colors text-sm cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                        Hủy
                      </button>
                    </div>
                  </div>
                )
              ) : q.type === "essay" ? (
                <div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-bold text-military-red-dark mt-0.5">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-military-green/10 text-military-green text-xs font-bold">
                          <FileText className="w-3 h-3" />
                          Tự luận
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${
                          q.grading_mode === "auto"
                            ? "bg-military-gold/20 text-military-red-dark"
                            : "bg-military-cream-dark text-foreground-700"
                        }`}>
                          {q.grading_mode === "auto" ? "Chấm tự động" : "Chấm tay"}
                        </span>
                        {q.graded === false && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-foreground-100 text-foreground-600">
                            Không tính điểm
                          </span>
                        )}
                        {(q.question_set ?? "").trim() && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-military-gold/20 text-military-red-dark border border-military-gold">
                            <BookOpen className="w-3 h-3" />
                            {(q.question_set ?? "").trim()}
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-military-red-dark text-sm mb-2">{q.question}</p>
                      {q.grading_mode === "auto" && (q.essay_answers?.length || 0) > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-semibold text-foreground-600 mb-1">Đáp án đúng:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {q.essay_answers.map((ans, aIdx) => (
                              <span key={aIdx} className="text-xs px-2 py-1 rounded-lg bg-military-green/10 border border-military-green/30 text-military-green">
                                {ans}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {q.explanation && (
                        <p className="text-xs text-foreground-600 bg-military-cream/50 rounded-lg px-3 py-2">
                          <strong>Gợi ý:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-2">
                    <button
                      onClick={() => startEdit(q)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                      title="Sửa"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-bold text-military-red-dark mt-0.5">{idx + 1}.</span>
                    <div className="flex-1 min-w-0">
                      {(q.question_set ?? "").trim() && (
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-military-gold/20 text-military-red-dark border border-military-gold">
                            <BookOpen className="w-3 h-3" />
                            {(q.question_set ?? "").trim()}
                          </span>
                        </div>
                      )}
                      <p className="font-semibold text-military-red-dark text-sm mb-2">{q.question}</p>
                      <div className="grid sm:grid-cols-2 gap-1.5 mb-2">
                        {q.options.map((opt, oIdx) => (
                          <div
                            key={oIdx}
                            className={`text-sm px-2.5 py-1.5 rounded-lg border ${
                              q.answer === oIdx
                                ? "bg-military-green/10 border-military-green/30 text-military-green font-bold"
                                : "bg-white border-military-cream-dark text-foreground-700"
                            }`}
                          >
                            {String.fromCharCode(65 + oIdx)}. {opt}
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="text-xs text-foreground-600 bg-military-cream/50 rounded-lg px-3 py-2">
                          <strong>Giải thích:</strong> {q.explanation}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 mt-2">
                    <button
                      onClick={() => startEdit(q)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                      title="Sửa"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(q.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                      title="Xóa"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <datalist id="set-suggestions">
        {allSets.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}