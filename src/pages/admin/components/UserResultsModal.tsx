import { useState, useEffect } from "react";
import {
  X,
  Trophy,
  RefreshCw,
  Pencil,
  Save,
  Check,
  Trash2,
  AlertCircle,
  Clock,
} from "lucide-react";
import {
  listQuizResultsByUser,
  listCompetitions,
  updateQuizResultFull,
  deleteQuizResult,
  type QuizResult,
  type Competition,
  type Profile,
} from "@/lib/supabase";

interface UserResultsModalProps {
  user: Profile;
  onClose: () => void;
}

const fmt = (n: number) => Math.round(n * 100) / 100;

function formatDuration(sec: number | null) {
  if (!sec || sec <= 0) return "-";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function UserResultsModal({ user, onClose }: UserResultsModalProps) {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [editId, setEditId] = useState<number | null>(null);
  const [editScore, setEditScore] = useState(0);
  const [editCorrect, setEditCorrect] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [rData, cData] = await Promise.all([
        listQuizResultsByUser(user.id),
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
  }, [user.id]);

  const compTitle = (id: number | null) => {
    if (id == null) return "-";
    return competitions.find((c) => c.id === id)?.title || `#${id}`;
  };

  const startEdit = (r: QuizResult) => {
    setEditId(r.id);
    setEditScore(r.score);
    setEditCorrect(r.correct_count);
    setSaveMsg("");
  };

  const cancelEdit = () => {
    setEditId(null);
    setSaveMsg("");
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    setSaveMsg("");
    try {
      await updateQuizResultFull(id, {
        score: editScore,
        correct_count: editCorrect,
      });
      setEditId(null);
      setSaveMsg("Đã cập nhật điểm thi.");
      await load();
      setTimeout(() => setSaveMsg(""), 2500);
    } catch (err) {
      setSaveMsg(err instanceof Error ? err.message : "Lỗi cập nhật điểm.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    setDeleting(true);
    setError("");
    try {
      await deleteQuizResult(id);
      setDeleteId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa kết quả.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-military-cream-dark w-full max-w-3xl my-8">
        <div className="sticky top-0 bg-white rounded-t-2xl border-b border-military-cream-dark px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-military-red-dark">Lịch sử thi</h3>
              <p className="text-xs text-foreground-600">
                {user.full_name || user.username || "Người dùng"} · {user.unit || "Chưa có đơn vị"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full text-foreground-500 hover:bg-foreground-100 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 py-4">
          {saveMsg && (
            <div className={`flex items-center gap-2 rounded-lg p-3 mb-4 text-sm font-semibold ${
              saveMsg.startsWith("Đã") || saveMsg.includes("cập nhật")
                ? "bg-military-green/10 text-military-green"
                : "bg-military-red/5 text-military-red"
            }`}>
              {saveMsg.startsWith("Đã") || saveMsg.includes("cập nhật") ? (
                <Check className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{saveMsg}</span>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 mb-4 text-sm">
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
              <p className="text-sm">Người dùng này chưa có kết quả thi nào.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {results.map((r, i) => (
                <div
                  key={r.id}
                  className="rounded-xl border border-military-cream-dark bg-military-cream/30 p-4"
                >
                  {editId === r.id ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex-1 min-w-[180px]">
                        <div className="text-xs text-foreground-600 mb-1">Cuộc thi</div>
                        <div className="text-sm font-semibold text-military-red-dark">
                          {compTitle(r.competition_id)}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-foreground-600 mb-1">Điểm số</div>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={editScore}
                          onChange={(e) => setEditScore(parseFloat(e.target.value) || 0)}
                          className="w-24 px-3 py-2 rounded-lg border-2 border-military-red bg-white text-sm font-extrabold text-military-red"
                        />
                      </div>
                      <div>
                        <div className="text-xs text-foreground-600 mb-1">Số câu đúng</div>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          value={editCorrect}
                          onChange={(e) => setEditCorrect(parseInt(e.target.value, 10) || 0)}
                          className="w-24 px-3 py-2 rounded-lg border-2 border-military-cream-dark bg-white text-sm font-bold text-military-red-dark"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 pt-4">
                        <button
                          onClick={() => handleSave(r.id)}
                          disabled={saving}
                          className="w-9 h-9 inline-flex items-center justify-center rounded-full text-military-green hover:bg-military-green/10 transition-colors cursor-pointer disabled:opacity-50"
                          title="Lưu điểm"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="w-9 h-9 inline-flex items-center justify-center rounded-full text-foreground-500 hover:bg-foreground-100 transition-colors cursor-pointer"
                          title="Hủy"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
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
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => startEdit(r)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                          title="Sửa điểm"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(r.id)}
                          className="w-8 h-8 inline-flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                          title="Xóa kết quả"
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
        </div>
      </div>

      {deleteId != null && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl border border-military-cream-dark w-full max-w-md p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-military-red-dark">Xóa kết quả thi?</h3>
                <p className="text-sm text-foreground-600 mt-1">
                  Thao tác này không thể hoàn tác.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-foreground-700 font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                disabled={deleting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
              >
                {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}