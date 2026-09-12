import { useState, useEffect, useMemo } from "react";
import {
  Pencil,
  Trash2,
  RefreshCw,
  Users,
  AlertCircle,
  CheckCircle2,
  X,
  Save,
  KeyRound,
  User,
  UserCog,
  Square,
  CheckSquare,
  Search,
  Download,
  Trophy,
} from "lucide-react";
import { downloadXlsx } from "@/lib/downloadXlsx";
import {
  listProfiles,
  updateProfile,
  deleteProfile,
  deleteProfiles,
  resetUserPassword,
  type Profile,
} from "@/lib/supabase";
import UserProfileModal from "./UserProfileModal";
import UserResultsModal from "./UserResultsModal";
import Pagination from "@/components/base/Pagination";
import AccountSelectionBar from "@/components/feature/AccountSelectionBar";

const PAGE_SIZE = 50;

export default function UserManagement() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Profile>>();
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [resetId, setResetId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetting, setResetting] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [resultsUserId, setResultsUserId] = useState<string | null>(null);

  // Phân trang + chọn nhiều để xóa.
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [noticeMsg, setNoticeMsg] = useState("");
  const [search, setSearch] = useState("");
  const [sortMode, setSortMode] = useState<"default" | "name" | "unit" | "position">("default");

  const profileUser = users.find((u) => u.id === profileUserId) || null;
  const resultsUser = users.find((u) => u.id === resultsUserId) || null;

  // Phân loại đơn vị: các cơ quan (Phòng, Ban, Văn phòng, Cơ quan) được ưu tiên
  // lên trước, sau đó mới đến các đơn vị còn lại. Hỗ trợ cả dạng viết tắt:
  // P. (Phòng), VP (Văn phòng), CQ (Cơ quan), PHC (Phòng Hậu cần/Hành chính).
  // Chuẩn hoá chuỗi: bỏ dấu tiếng Việt, đưa về chữ thường để so khớp chức vụ / cấp bậc.
  const norm = (s: string): string =>
    (s || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/\s+/g, " ")
      .trim();

  // Phân loại đơn vị: các cơ quan (Phòng, Ban, Văn phòng, Cơ quan) được ưu tiên
  // lên trước, sau đó mới đến các đơn vị còn lại. Hỗ trợ cả dạng viết tắt:
  // P. (Phòng), VP (Văn phòng), CQ (Cơ quan), PHC (Phòng Hậu cần/Hành chính).
  const unitGroup = (unit: string): number => {
    const u = (unit || "").trim().toLowerCase();
    const isAgency =
      /^(phòng|phong|ban|văn phòng|van phong|cơ quan|co quan)/.test(u) ||
      /^(p\.|p\s|vp|cq|phc)/.test(u);
    return isAgency ? 0 : 1;
  };

  // Thứ bậc chức vụ (số càng nhỏ = cấp càng cao). Dùng để xếp chỉ huy lên đầu,
  // rồi đến trợ lý, sau cùng là nhân viên và các vị trí chuyên môn khác.
  const positionRank = (position: string): number => {
    const p = norm(position);
    if (!p) return 100;

    // Cơ quan (Phòng/Ban)
    if (p.includes("truong phong")) return 0; // Trưởng phòng
    if (p.includes("pho phong")) return 1; // Phó phòng
    if (p.includes("truong ban")) return 2; // Trưởng ban
    if (p.includes("pho ban")) return 3; // Phó ban
    if (p.includes("chu nhiem")) return 4; // Chủ nhiệm cơ quan

    // Tiểu đoàn
    if (p.includes("tieu doan truong")) return 5; // Tiểu đoàn trưởng
    if (p.includes("chinh tri vien") && !p.includes("dai doi")) return 6; // Chính trị viên
    if (p.includes("pho tieu doan")) return 7; // Phó tiểu đoàn trưởng

    // Đại đội
    if (p.includes("dai doi truong") || p === "ct") return 8; // Đại đội trưởng (ct)
    if (p.startsWith("ctv") || p.includes("chinh tri vien dai doi")) return 9; // Chính trị viên đại đội (CTV)
    if (p.includes("pho dai doi") || p === "pct") return 10; // Phó đại đội trưởng (pct)

    // Trung đội / Tiểu đội
    if (p.includes("trung doi truong")) return 11; // Trung đội trưởng
    if (p.includes("tieu doi truong")) return 12; // Tiểu đội trưởng

    // Trưởng các bộ phận nhỏ
    if (
      p.includes("dai truong") || // Đài trưởng
      p.includes("doi truong") || // Đội trưởng
      p.includes("tram truong") || // Trạm trưởng
      p.includes("thu kho") || // Thủ kho
      p.includes("quan giao") // Quản giáo
    )
      return 13;

    // Trợ lý
    if (p.includes("tro ly") || p.includes("to ly") || p.startsWith("tl")) return 14;

    // Nhân viên
    if (p.includes("nhan vien") || p.startsWith("nv")) return 15;

    // Các vị trí chuyên môn khác (lái xe, nhạc công, trắc thủ, thợ...)
    return 16;
  };

  // Thứ bậc quân hàm (số càng nhỏ = cấp càng cao), dùng làm tiêu chí phụ.
  const rankOrder = (rank: string): number => {
    const r = norm(rank);
    if (!r) return 50;
    if (r.includes("thuong ta")) return 0; // Thượng tá
    if (r.includes("trung ta")) return 1; // Trung tá
    if (r.includes("thieu ta")) return 2; // Thiếu tá
    if (r.includes("dai uy")) return 3; // Đại úy
    if (r.includes("thuong uy")) return 4; // Thượng úy
    if (r.includes("trung uy")) return 5; // Trung úy
    if (r.includes("thieu uy")) return 6; // Thiếu úy
    if (r.startsWith("1")) return 10; // Bậc 1
    if (r.startsWith("2")) return 11; // Bậc 2
    if (r.startsWith("3")) return 12; // Bậc 3
    if (r.startsWith("4")) return 13; // Bậc 4
    return 50;
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listProfiles();
      setUsers(data);
      setSelected((prev) => new Set([...prev].filter((id) => data.some((u) => u.id === id))));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải danh sách.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.username || "").toLowerCase().includes(q) ||
        (u.unit || "").toLowerCase().includes(q),
    );
  }, [users, search]);

  const sortedUsers = useMemo(() => {
    const arr = [...filteredUsers];
    const byName = (a: Profile, b: Profile) =>
      (a.full_name || "").localeCompare(b.full_name || "", "vi");

    if (sortMode === "name") {
      arr.sort(byName);
    } else if (sortMode === "unit") {
      // Đơn vị trước, trong cùng đơn vị thì xếp theo thứ bậc chức vụ.
      arr.sort((a, b) => {
        const ga = unitGroup(a.unit);
        const gb = unitGroup(b.unit);
        if (ga !== gb) return ga - gb;
        const uc = (a.unit || "").localeCompare(b.unit || "", "vi");
        if (uc !== 0) return uc;
        const pa = positionRank(a.position);
        const pb = positionRank(b.position);
        if (pa !== pb) return pa - pb;
        const ra = rankOrder(a.rank);
        const rb = rankOrder(b.rank);
        if (ra !== rb) return ra - rb;
        return byName(a, b);
      });
    } else if (sortMode === "position") {
      // Chức vụ trước (chỉ huy lên đầu), trong cùng chức vụ thì xếp theo đơn vị.
      arr.sort((a, b) => {
        const pa = positionRank(a.position);
        const pb = positionRank(b.position);
        if (pa !== pb) return pa - pb;
        const ga = unitGroup(a.unit);
        const gb = unitGroup(b.unit);
        if (ga !== gb) return ga - gb;
        const uc = (a.unit || "").localeCompare(b.unit || "", "vi");
        if (uc !== 0) return uc;
        const ra = rankOrder(a.rank);
        const rb = rankOrder(b.rank);
        if (ra !== rb) return ra - rb;
        return byName(a, b);
      });
    }
    return arr;
  }, [filteredUsers, sortMode]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const pagedUsers = useMemo(
    () => sortedUsers.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [sortedUsers, currentPage],
  );

  const allSelected = sortedUsers.length > 0 && selected.size === sortedUsers.length;
  const pageAllSelected = pagedUsers.length > 0 && pagedUsers.every((u) => selected.has(u.id));

  const toggleOne = (id: string) => {
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
      if (pagedUsers.every((u) => next.has(u.id))) {
        pagedUsers.forEach((u) => next.delete(u.id));
      } else {
        pagedUsers.forEach((u) => next.add(u.id));
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelected((prev) => (prev.size === sortedUsers.length ? new Set() : new Set(sortedUsers.map((u) => u.id))));
  };

  const startEdit = (u: Profile) => {
    setEditId(u.id);
    // Không cho sửa "username" vì nó gắn chặt với email đăng nhập
    // (username@qk5.local). Đổi tên trong bảng mà không đổi email sẽ làm người
    // dùng không đăng nhập được bằng tên mới. Muốn đổi tên thì xóa rồi tạo lại.
    setEditForm({
      full_name: u.full_name || "",
      rank: u.rank || "",
      position: u.position || "",
      unit: u.unit || "",
    });
    setDeleteConfirm(null);
  };

  const cancelEdit = () => {
    setEditId(null);
    setEditForm({});
  };

  const handleSave = async (id: string) => {
    try {
      await updateProfile(id, editForm);
      setEditId(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi cập nhật.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProfile(id);
      setDeleteConfirm(null);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lỗi xóa tài khoản.");
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selected);
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
      await resetUserPassword(resetId!, resetPassword);
      setResetMsg("Đã đặt lại mật khẩu thành công!");
      setResetId(null);
      setResetPassword("");
    } catch (err) {
      setResetMsg(err instanceof Error ? err.message : "Lỗi đặt lại mật khẩu.");
    } finally {
      setResetting(false);
    }
  };

  // Xuất danh sách tài khoản (đang lọc) ra file Excel .xlsx.
  const handleExportExcel = () => {
    if (sortedUsers.length === 0) return;
    const data = sortedUsers.map((u, i) => ({
      "STT": i + 1,
      "Họ và tên": u.full_name || "",
      "Tên đăng nhập": u.username || "",
      "Cấp bậc": u.rank || "",
      "Chức vụ": u.position || "",
      "Đơn vị": u.unit || "",
      "Đợt": u.batch ? `Đợt ${u.batch}` : "",
      "Quê quán": u.hometown || "",
      "Nơi cư trú": u.residence || "",
      "Vai trò": u.role || "",
      "Ngày tạo": u.created_at
        ? new Date(u.created_at).toLocaleString("vi-VN")
        : "",
    }));
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate(),
    ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
    const fileName = `danh-sach-tai-khoan_${stamp}.xlsx`;
    downloadXlsx(
      [
        {
          name: "TaiKhoan",
          rows: data,
          cols: [
            { wch: 6 },
            { wch: 26 },
            { wch: 20 },
            { wch: 16 },
            { wch: 20 },
            { wch: 24 },
            { wch: 10 },
            { wch: 22 },
            { wch: 22 },
            { wch: 14 },
            { wch: 20 },
          ],
        },
      ],
      fileName,
    );
    setNoticeMsg(`Đã xuất file Excel: ${fileName}`);
    setTimeout(() => setNoticeMsg(""), 4000);
  };

  return (
    <div className="bg-white rounded-2xl border border-military-cream-dark p-6">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-military-red-dark">Quản lý tài khoản</h2>
            <p className="text-xs text-foreground-600">
              {search.trim() ? `${filteredUsers.length} / ${users.length} tài khoản.` : `${users.length} tài khoản người dùng.`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportExcel}
            disabled={sortedUsers.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-military-green text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Xuất Excel
          </button>
          <button
            onClick={load}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white text-military-red-dark font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Làm mới
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-foreground-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo họ tên, tên đăng nhập hoặc đơn vị..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-military-cream-dark bg-military-cream/30 text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
          />
        </div>
        <select
          value={sortMode}
          onChange={(e) => {
            setSortMode(e.target.value as "default" | "name" | "unit" | "position");
            setPage(1);
          }}
          className="px-3 py-2.5 rounded-lg border border-military-cream-dark bg-military-cream/30 text-sm font-semibold text-military-red-dark focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 cursor-pointer whitespace-nowrap"
        >
          <option value="default">Sắp xếp: Mặc định</option>
          <option value="name">Sắp xếp: Theo họ tên</option>
          <option value="unit">Sắp xếp: Đơn vị + Chức vụ (chỉ huy lên trước)</option>
          <option value="position">Sắp xếp: Theo chức vụ / cấp bậc</option>
        </select>
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

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 text-military-red animate-spin" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 text-foreground-600">
          <Users className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
          <p className="text-sm">Chưa có tài khoản người dùng nào.</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-16 text-foreground-600">
          <Search className="w-12 h-12 mx-auto mb-3 text-military-cream-dark" />
          <p className="text-sm">Không tìm thấy tài khoản nào khớp với "{search}".</p>
        </div>
      ) : (
        <>
          <AccountSelectionBar
            selectedCount={selected.size}
            totalCount={sortedUsers.length}
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
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Cấp bậc</th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Chức vụ</th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Đơn vị</th>
                  <th className="py-3 pr-4 font-bold text-military-red-dark whitespace-nowrap">Đợt</th>
                  <th className="py-3 font-bold text-military-red-dark whitespace-nowrap text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {pagedUsers.map((u) => (
                  <tr
                    key={u.id}
                    className={`border-b border-military-cream-dark/60 ${selected.has(u.id) ? "bg-military-red/5" : ""}`}
                  >
                    {editId === u.id ? (
                      <>
                        <td className="py-2 pr-3" />
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={editForm.full_name || ""}
                            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                            className="w-full px-2 py-1.5 rounded border border-military-cream-dark text-sm"
                          />
                        </td>
                        <td className="py-2 pr-3 text-foreground-700">
                          <span className="font-medium" title="Tên đăng nhập gắn với email đăng nhập, không thể sửa trực tiếp">
                            {u.username || "-"}
                          </span>
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={editForm.rank || ""}
                            onChange={(e) => setEditForm({ ...editForm, rank: e.target.value })}
                            className="w-full px-2 py-1.5 rounded border border-military-cream-dark text-sm"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={editForm.position || ""}
                            onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                            className="w-full px-2 py-1.5 rounded border border-military-cream-dark text-sm"
                          />
                        </td>
                        <td className="py-2 pr-3">
                          <input
                            type="text"
                            value={editForm.unit || ""}
                            onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                            className="w-full px-2 py-1.5 rounded border border-military-cream-dark text-sm"
                          />
                        </td>
                        <td className="py-2 pr-3 text-foreground-700 whitespace-nowrap">
                          {u.batch ? `Đợt ${u.batch}` : "-"}
                        </td>
                        <td className="py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleSave(u.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-full text-military-green hover:bg-military-green/10 transition-colors cursor-pointer"
                              title="Lưu"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={cancelEdit}
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
                          <button
                            type="button"
                            onClick={() => toggleOne(u.id)}
                            title="Chọn tài khoản"
                            className="w-5 h-5 flex items-center justify-center text-military-red cursor-pointer"
                          >
                            {selected.has(u.id) ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5 text-foreground-400" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            <span className="w-9 h-9 rounded-full overflow-hidden bg-military-cream flex items-center justify-center shrink-0 border border-military-cream-dark">
                              {u.avatar_url ? (
                                <img
                                  src={u.avatar_url}
                                  alt={u.full_name || "Ảnh đại diện"}
                                  className="w-full h-full object-cover object-top"
                                />
                              ) : (
                                <User className="w-4 h-4 text-military-red" />
                              )}
                            </span>
                            <span className="font-semibold text-military-red-dark whitespace-nowrap">{u.full_name || "-"}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-foreground-700">{u.username || "-"}</td>
                        <td className="py-3 pr-4 text-foreground-700">{u.rank || "-"}</td>
                        <td className="py-3 pr-4 text-foreground-700">{u.position || "-"}</td>
                        <td className="py-3 pr-4 text-foreground-700">{u.unit || "-"}</td>
                        <td className="py-3 pr-4 text-foreground-700 whitespace-nowrap">
                          {u.batch ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-military-red/10 text-military-red text-xs font-bold">
                              Đợt {u.batch}
                            </span>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setResultsUserId(u.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                              title="Xem lịch sử thi"
                            >
                              <Trophy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setProfileUserId(u.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                              title="Hồ sơ người dùng"
                            >
                              <UserCog className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => startEdit(u)}
                              className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                              title="Sửa nhanh"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openReset(u.id)}
                              className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer"
                              title="Đặt lại mật khẩu"
                            >
                              <KeyRound className="w-4 h-4" />
                            </button>
                            {deleteConfirm === u.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(u.id)}
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
                                onClick={() => setDeleteConfirm(u.id)}
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
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            page={currentPage}
            totalPages={totalPages}
            onChange={setPage}
            totalItems={filteredUsers.length}
            pageSize={PAGE_SIZE}
          />
        </>
      )}

      {profileUser && (
        <UserProfileModal
          user={profileUser}
          onClose={() => setProfileUserId(null)}
          onSaved={load}
        />
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
                  {users.find((u) => u.id === resetId)?.full_name || "Người dùng"}
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