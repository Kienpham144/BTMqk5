import { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  UserPlus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  KeyRound,
  Crown,
  Square,
  CheckSquare,
  Search,
  Trophy,
} from "lucide-react";
import {
  listAdmins,
  createAdmin,
  deleteProfile,
  deleteProfiles,
  updateAdminProfile,
  type Profile,
} from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import Pagination from "@/components/base/Pagination";
import AccountSelectionBar from "@/components/feature/AccountSelectionBar";
import UserResultsModal from "./UserResultsModal";

const PAGE_SIZE = 50;

export default function AdminManagement() {
  const { user } = useAuth();
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Form thêm quản trị viên mới
  const [showForm, setShowForm] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState("");

  // Sửa thông tin
  const [editId, setEditId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState("");

  // Xóa
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // Đặt lại mật khẩu
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetting, setResetting] = useState(false);

  // Xem / xóa lịch sử thi
  const [resultsUserId, setResultsUserId] = useState<string | null>(null);

  // Phân trang + chọn nhiều để xóa.
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState("");
  const [search, setSearch] = useState("");

  const selfId = user?.id;

  const resultsUser = admins.find((a) => a.id === resultsUserId) || null;

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listAdmins();
      setAdmins(data);
      setSelected((prev) => new Set([...prev].filter((id) => data.some((a) => a.id === id))));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách quản trị viên.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredAdmins = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return admins;
    return admins.filter(
      (a) =>
        (a.full_name || "").toLowerCase().includes(q) ||
        (a.username || "").toLowerCase().includes(q),
    );
  }, [admins, search]);

  const totalPages = Math.max(1, Math.ceil(filteredAdmins.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const pagedAdmins = useMemo(
    () => filteredAdmins.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredAdmins, currentPage],
  );

  // Tài khoản đang đăng nhập không được chọn/xóa.
  const selectableIds = useMemo(
    () => filteredAdmins.filter((a) => a.id !== selfId).map((a) => a.id),
    [filteredAdmins, selfId],
  );
  const selectableOnPage = pagedAdmins.filter((a) => a.id !== selfId);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));
  const pageAllSelected =
    selectableOnPage.length > 0 && selectableOnPage.every((a) => selected.has(a.id));

  const toggleOne = (id: string) => {
    if (id === selfId) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (selectableOnPage.every((a) => next.has(a.id))) {
        selectableOnPage.forEach((a) => next.delete(a.id));
      } else {
        selectableOnPage.forEach((a) => next.add(a.id));
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) =>
      selectableIds.length > 0 && selectableIds.every((id) => prev.has(id)) ? new Set() : new Set(selectableIds),
    );
  };

  const handleCreate = async () => {
    setCreateMsg("");
    if (!newFullName.trim()) {
      setCreateMsg("Vui lòng nhập họ tên.");
      return;
    }
    if (!newUsername.trim()) {
      setCreateMsg("Vui lòng nhập tên đăng nhập.");
      return;
    }
    if (newPassword.length < 6) {
      setCreateMsg("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }
    setCreating(true);
    try {
      await createAdmin({
        username: newUsername.trim().toLowerCase(),
        password: newPassword,
        full_name: newFullName.trim(),
      });
      setNewFullName("");
      setNewUsername("");
      setNewPassword("");
      setShowForm(false);
      setCreateMsg("");
      await load();
    } catch (err) {
      setCreateMsg(err instanceof Error ? err.message : "Lỗi tạo quản trị viên.");
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (a: Profile) => {
    setEditId(a.id);
    setEditFullName(a.full_name || "");
    setDeleteConfirm(null);
  };

  const handleSaveEdit = async (id: string) => {
    try {
      await updateAdminProfile(id, { full_name: editFullName.trim() });
      setEditId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi cập nhật.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProfile(id);
      setDeleteConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa quản trị viên.");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected).filter((id) => id !== selfId);
    if (ids.length === 0) return;
    setBulkDeleting(true);
    setError("");
    setNoticeMsg("");
    try {
      const res = await deleteProfiles(ids);
      setSelected(new Set());
      setBulkConfirm(false);
      if (res.failed.length > 0) {
        setError(`Đã xóa ${res.deleted} tài khoản. ${res.failed.length} tài khoản không xóa được.`);
      } else {
        setNoticeMsg(`Đã xóa ${res.deleted} tài khoản.`);
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa tài khoản.");
    } finally {
      setBulkDeleting(false);
    }
  };

  const openReset = (id: string) => {
    setResetId(id);
    setResetPassword("");
    setResetMsg("");
    setEditId(null);
    setDeleteConfirm(null);
  };

  const handleResetPassword = async () => {
    if (!resetPassword || resetPassword.length < 6) {
      setResetMsg("Mật khẩu mới phải có ít nhất 6 ký tự.");
      return;
    }
    setResetting(true);
    setResetMsg("");
    try {
      await updateAdminProfile(resetId!, { password: resetPassword });
      setResetMsg("Đã đặt lại mật khẩu thành công!");
      setResetId(null);
      setResetPassword("");
    } catch (err) {
      setResetMsg(err instanceof Error ? err.message : "Lỗi đặt lại mật khẩu.");
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-military-cream-dark p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-military-gold/30 flex items-center justify-center text-military-red-dark">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-military-red-dark">Quản trị viên</h2>
            <p className="text-xs text-foreground-600">
              {search.trim() ? `${filteredAdmins.length} / ${admins.length} tài khoản.` : `${admins.length} tài khoản quản trị.`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-military-red-dark font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            Cấp tài khoản quản trị
          </button>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="w-4 h-4 text-foreground-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm theo họ tên hoặc tên đăng nhập..."
          className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-military-cream-dark bg-military-cream/30 text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 mb-5 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {noticeMsg && (
        <div className="flex items-start gap-2 bg-military-green/10 border border-military-green/30 text-military-green rounded-lg p-3 mb-5 text-sm">
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{noticeMsg}</span>
        </div>
      )}

      {showForm && (
        <div className="bg-military-cream/50 border border-military-cream-dark rounded-xl p-5 mb-6">
          <h3 className="font-bold text-military-red-dark mb-4">Thêm quản trị viên mới</h3>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Họ tên *</label>
              <input
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="VD: Nguyễn Văn Quản"
                className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-white text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Tên đăng nhập *</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="VD: admin2"
                className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-white text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Mật khẩu *</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-white text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
              />
            </div>
          </div>

          {createMsg && (
            <div className={`flex items-start gap-2 text-sm rounded-lg p-3 mt-4 ${createMsg.includes("thành công") ? "bg-military-green/10 text-military-green" : "bg-military-red/5 text-military-red"}`}>
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{createMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              onClick={() => { setShowForm(false); setCreateMsg(""); }}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-foreground-700 font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
            >
              {creating ? "Đang tạo..." : "Tạo quản trị viên"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
        </div>
      ) : admins.length === 0 ? (
        <div className="text-center py-16 text-foreground-600">
          <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
          <p className="text-sm">Chưa có tài khoản quản trị nào.</p>
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="text-center py-16 text-foreground-600">
          <Search className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
          <p className="text-sm">Không tìm thấy quản trị viên nào khớp với "{search}".</p>
        </div>
      ) : (
        <>
          <AccountSelectionBar
            selectedCount={selected.size}
            totalCount={selectableIds.length}
            allSelected={allSelected}
            onToggleAll={toggleAll}
            onClear={() => setSelected(new Set())}
            onDelete={() => setBulkConfirm(true)}
            deleting={bulkDeleting}
          />

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-military-cream-dark text-left">
                  <th className="py-3 pr-3 w-10">
                    <button
                      type="button"
                      onClick={togglePage}
                      title="Chọn tất cả trong trang này"
                      className="w-5 h-5 flex items-center justify-center text-military-red cursor-pointer"
                    >
                      {pageAllSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 text-foreground-400" />}
                    </button>
                  </th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Họ tên</th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Tên đăng nhập</th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Vai trò</th>
                  <th className="py-3 font-bold text-military-red-dark whitespace-nowrap text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedAdmins.map((a) => {
                  const isSelf = a.id === selfId;
                  return (
                    <tr
                      key={a.id}
                      className={`border-b border-military-cream-dark/60 ${selected.has(a.id) ? "bg-military-red/5" : ""}`}
                    >
                      {editId === a.id ? (
                        <>
                          <td className="py-2 pr-3" />
                          <td className="py-2 pr-3">
                            <input
                              type="text"
                              value={editFullName}
                              onChange={(e) => setEditFullName(e.target.value)}
                              className="w-full px-2 py-1.5 rounded border border-military-cream-dark text-sm"
                            />
                          </td>
                          <td className="py-2 pr-3 text-foreground-700">{a.username || "-"}</td>
                          <td className="py-2 pr-3">
                            <span className="inline-flex items-center gap-1 bg-military-gold/40 text-military-red-dark px-2 py-0.5 rounded-full text-xs font-bold">
                              <Crown className="w-3 h-3" />
                              Quản trị
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleSaveEdit(a.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-military-green hover:bg-military-green/10 transition-colors cursor-pointer"
                                title="Lưu"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setEditId(null)}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-foreground-100 transition-colors cursor-pointer"
                                title="Hủy"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-3 pr-3">
                            {isSelf ? (
                              <span className="w-5 h-5 flex items-center justify-center text-foreground-300" title="Không thể xóa chính mình">
                                <Square className="w-5 h-5" />
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => toggleOne(a.id)}
                                title="Chọn tài khoản"
                                className="w-5 h-5 flex items-center justify-center text-military-red cursor-pointer"
                              >
                                {selected.has(a.id) ? (
                                  <CheckSquare className="w-5 h-5" />
                                ) : (
                                  <Square className="w-5 h-5 text-foreground-400" />
                                )}
                              </button>
                            )}
                          </td>
                          <td className="py-3 pr-4 font-semibold text-military-red-dark">
                            {a.full_name || "-"}
                            {isSelf && (
                              <span className="ml-2 text-xs font-normal text-foreground-500">(bạn)</span>
                            )}
                          </td>
                          <td className="py-3 pr-4 text-foreground-700">{a.username || "-"}</td>
                          <td className="py-3 pr-4">
                            <span className="inline-flex items-center gap-1 bg-military-gold/40 text-military-red-dark px-2 py-0.5 rounded-full text-xs font-bold">
                              <Crown className="w-3 h-3" />
                              Quản trị
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setResultsUserId(a.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                                title="Xem lịch sử thi"
                              >
                                <Trophy className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => startEdit(a)}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                                title="Sửa"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => openReset(a.id)}
                                className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                                title="Đặt lại mật khẩu"
                              >
                                <KeyRound className="w-4 h-4" />
                              </button>
                              {isSelf ? (
                                <span
                                  className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-300 cursor-not-allowed"
                                  title="Không thể xóa chính mình"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </span>
                              ) : deleteConfirm === a.id ? (
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => handleDelete(a.id)}
                                    className="px-2 py-1 text-xs bg-military-red text-white rounded font-bold cursor-pointer"
                                  >
                                    Xác nhận
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    className="px-2 py-1 text-xs bg-foreground-100 rounded font-bold cursor-pointer"
                                  >
                                    Hủy
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(a.id)}
                                  className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                                  title="Xóa"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
            totalItems={filteredAdmins.length}
            pageSize={PAGE_SIZE}
          />
        </>
      )}

      {resultsUser && (
        <UserResultsModal
          user={resultsUser}
          onClose={() => setResultsUserId(null)}
        />
      )}

      {bulkConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl border border-military-cream-dark w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-military-red-dark">Xóa tài khoản đã chọn</h3>
                <p className="text-xs text-foreground-600">
                  {selected.size} tài khoản sẽ bị xóa vĩnh viễn.
                </p>
              </div>
            </div>
            <p className="text-sm text-foreground-700 mb-4">
              Thao tác này không thể hoàn tác. Bạn có chắc chắn muốn xóa?
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setBulkConfirm(false)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-foreground-700 font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
              >
                {bulkDeleting ? "Đang xóa..." : `Xóa ${selected.size} tài khoản`}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl border border-military-cream-dark w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-military-red-dark">Đặt lại mật khẩu</h3>
                <p className="text-xs text-foreground-600">
                  {admins.find((a) => a.id === resetId)?.full_name || "Quản trị viên"}
                </p>
              </div>
            </div>

            <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
              Mật khẩu mới
            </label>
            <input
              type="text"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-military-cream/50 text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all mb-3"
            />

            {resetMsg && (
              <div className={`text-sm rounded-lg p-3 mb-3 ${resetMsg.includes("thành công") ? "bg-military-green/10 text-military-green" : "bg-military-red/5 text-military-red"}`}>
                {resetMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => { setResetId(null); setResetMsg(""); }}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-foreground-700 font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={handleResetPassword}
                disabled={resetting}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
              >
                {resetting ? "Đang xử lý..." : "Đặt lại mật khẩu"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}