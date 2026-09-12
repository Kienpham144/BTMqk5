import { useMemo, useState } from "react";
import {
  BookOpen,
  X,
  Trash2,
  Pencil,
  Check,
  Save,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  FileText,
} from "lucide-react";
import {
  updateQuizQuestionSet,
  renameQuizQuestionSet,
  clearQuizQuestionSet,
  type QuizQuestion,
} from "@/lib/supabase";

interface Props {
  competitionId: number;
  questions: QuizQuestion[];
  onChanged: () => void;
  onClose: () => void;
}

export default function QuestionSetManager({
  competitionId,
  questions,
  onChanged,
  onClose,
}: Props) {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  // Danh sách bộ đề hiện có (tên -> số câu), sắp xếp theo tên.
  const sets = useMemo(() => {
    const map = new Map<string, number>();
    questions.forEach((q) => {
      const s = (q.question_set ?? "").trim();
      if (s) map.set(s, (map.get(s) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], "vi"));
  }, [questions]);

  // ---- Gán câu hỏi vào bộ đề ----
  const [assignSet, setAssignSet] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [filterUnassigned, setFilterUnassigned] = useState(false);

  // ---- Đổi tên bộ đề ----
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const visibleQuestions = useMemo(() => {
    if (!filterUnassigned) return questions;
    return questions.filter((q) => !(q.question_set ?? "").trim());
  }, [questions, filterUnassigned]);

  const toggleQuestion = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allVisibleSelected =
    visibleQuestions.length > 0 && visibleQuestions.every((q) => selectedIds.has(q.id));

  const toggleAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      const ids = visibleQuestions.map((q) => q.id);
      if (allVisibleSelected) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const handleAssign = async () => {
    setError("");
    setSuccess("");
    const target = assignSet.trim();
    if (!target) {
      setError("Vui lòng nhập tên bộ đề cần gán.");
      return;
    }
    if (selectedIds.size === 0) {
      setError("Vui lòng chọn ít nhất 1 câu hỏi.");
      return;
    }
    setBusy(true);
    try {
      await updateQuizQuestionSet(Array.from(selectedIds), target);
      setSuccess(`Đã gán ${selectedIds.size} câu hỏi vào bộ đề "${target}".`);
      setSelectedIds(new Set());
      setAssignSet("");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi gán bộ đề.");
    } finally {
      setBusy(false);
    }
  };

  const startRename = (name: string) => {
    setRenaming(name);
    setRenameValue(name);
    setError("");
    setSuccess("");
  };

  const handleRename = async () => {
    setError("");
    setSuccess("");
    const newName = renameValue.trim();
    if (!renaming || !newName || newName === renaming) {
      setRenaming(null);
      return;
    }
    setBusy(true);
    try {
      await renameQuizQuestionSet(competitionId, renaming, newName);
      setSuccess(`Đã đổi tên bộ đề "${renaming}" thành "${newName}".`);
      setRenaming(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi đổi tên bộ đề.");
    } finally {
      setBusy(false);
    }
  };

  const handleDeleteSet = async (name: string) => {
    const count = sets.find(([n]) => n === name)?.[1] ?? 0;
    if (
      !confirm(
        `Gỡ bộ đề "${name}" khỏi ${count} câu hỏi? Các câu hỏi vẫn được giữ nguyên, chỉ bỏ nhãn bộ đề.`,
      )
    ) {
      return;
    }
    setError("");
    setSuccess("");
    setBusy(true);
    try {
      await clearQuizQuestionSet(competitionId, name);
      setSuccess(`Đã gỡ bộ đề "${name}" khỏi các câu hỏi.`);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi gỡ bộ đề.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-military-gold-dark p-4 mb-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-military-gold-dark" />
          <h4 className="font-bold text-military-red-dark text-sm">Quản lý bộ đề</h4>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2 bg-military-green/10 border border-military-green/30 text-military-green rounded-lg p-3 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{success}</span>
        </div>
      )}

      {/* Gán câu hỏi vào bộ đề */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-military-red-dark">
          Gán nhiều câu hỏi vào một bộ đề
        </p>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <BookOpen className="w-4 h-4 text-foreground-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={assignSet}
              onChange={(e) => setAssignSet(e.target.value)}
              placeholder="Tên bộ đề (chọn có sẵn hoặc gõ tên mới)..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-military-cream-dark bg-white text-sm"
              list="set-manager-suggestions"
            />
          </div>
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={filterUnassigned}
              onChange={(e) => setFilterUnassigned(e.target.checked)}
              className="w-4 h-4 accent-military-green"
            />
            <span className="text-sm text-foreground-700 whitespace-nowrap">Chỉ hiện câu chưa có bộ đề</span>
          </label>
        </div>

        <div className="rounded-lg border border-military-cream-dark overflow-hidden">
          <div className="flex items-center justify-between gap-2 px-3 py-2 bg-military-cream/40 border-b border-military-cream-dark">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={toggleAll}
                className="w-4 h-4 accent-military-green"
              />
              <span className="text-xs font-bold text-foreground-700">
                Chọn tất cả ({visibleQuestions.length} câu)
              </span>
            </label>
            <span className="text-xs text-foreground-600">
              Đã chọn {selectedIds.size} câu
            </span>
          </div>
          <div className="max-h-64 overflow-y-auto divide-y divide-military-cream">
            {visibleQuestions.length === 0 ? (
              <p className="px-3 py-4 text-sm text-foreground-500 text-center">
                Không có câu hỏi nào.
              </p>
            ) : (
              visibleQuestions.map((q) => (
                <label
                  key={q.id}
                  className="flex items-start gap-2 px-3 py-2 hover:bg-military-cream/30 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(q.id)}
                    onChange={() => toggleQuestion(q.id)}
                    className="w-4 h-4 accent-military-green mt-0.5 shrink-0"
                  />
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-foreground-800 truncate">
                      {q.question}
                    </span>
                    <span className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span
                        className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                          q.type === "essay"
                            ? "bg-military-green/10 text-military-green"
                            : "bg-military-cream-dark text-foreground-600"
                        }`}
                      >
                        {q.type === "essay" ? "Tự luận" : "Trắc nghiệm"}
                      </span>
                      {(q.question_set ?? "").trim() ? (
                        <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-military-gold/20 text-military-red-dark border border-military-gold font-bold">
                          {(q.question_set ?? "").trim()}
                        </span>
                      ) : (
                        <span className="text-[11px] text-foreground-400">Chưa có bộ đề</span>
                      )}
                    </span>
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleAssign}
            disabled={busy}
            className="inline-flex items-center gap-2 px-4 py-2 bg-military-green text-white font-bold rounded-lg hover:bg-military-green-dark transition-colors text-sm disabled:opacity-60 cursor-pointer"
          >
            {busy ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Gán vào bộ đề
          </button>
          <button
            onClick={() => {
              setSelectedIds(new Set());
              setAssignSet("");
            }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-foreground-700 font-bold rounded-lg border border-military-cream-dark hover:border-military-red transition-colors text-sm cursor-pointer"
          >
            Bỏ chọn hết
          </button>
        </div>
      </div>

      <datalist id="set-manager-suggestions">
        {sets.map(([name]) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {/* Danh sách bộ đề hiện có */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-military-red-dark">
          Danh sách bộ đề ({sets.length})
        </p>
        {sets.length === 0 ? (
          <p className="text-sm text-foreground-500">
            Chưa có bộ đề nào. Gán câu hỏi ở phần trên để tạo bộ đề đầu tiên.
          </p>
        ) : (
          <div className="space-y-2">
            {sets.map(([name, count]) => (
              <div
                key={name}
                className="flex items-center gap-2 rounded-lg border border-military-cream-dark bg-military-cream/20 px-3 py-2"
              >
                {renaming === name ? (
                  <>
                    <input
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      className="flex-1 px-3 py-1.5 rounded-lg border border-military-cream-dark bg-white text-sm"
                      autoFocus
                    />
                    <button
                      onClick={handleRename}
                      disabled={busy}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-military-green font-bold text-xs rounded-lg border border-military-green/30 hover:bg-military-green/10 transition-colors whitespace-nowrap cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      Lưu
                    </button>
                    <button
                      onClick={() => setRenaming(null)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-foreground-600 font-bold text-xs rounded-lg border border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
                    >
                      Hủy
                    </button>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 flex-1 min-w-0">
                      <BookOpen className="w-4 h-4 text-military-gold-dark shrink-0" />
                      <span className="text-sm font-bold text-military-red-dark truncate">{name}</span>
                    </span>
                    <span className="text-xs text-foreground-600 whitespace-nowrap shrink-0">
                      {count} câu
                    </span>
                    <button
                      onClick={() => startRename(name)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                      title="Đổi tên bộ đề"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteSet(name)}
                      disabled={busy}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors disabled:opacity-40 cursor-pointer"
                      title="Gỡ bộ đề"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}