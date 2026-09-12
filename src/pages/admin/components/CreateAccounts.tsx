import { useState, useEffect, useMemo } from "react";
import {
  UserPlus,
  Trash2,
  Plus,
  Users,
  AlertCircle,
  CheckCircle2,
  ClipboardPaste,
  Wand2,
  Info,
  Download,
  Minus,
} from "lucide-react";
import { downloadXlsx } from "@/lib/downloadXlsx";
import {
  createUsers,
  countAccounts,
  listProfiles,
  type NewAccount,
} from "@/lib/supabase";

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function cleanCell(v: string) {
  return (v || "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Tách 1 dòng thành các cột. Ưu tiên Tab (khi copy bảng từ Word), sau đó các
// dấu phân cách thường gặp: " | ", " - ", khoảng trắng kép, dấu phẩy/chấm phẩy.
function splitColumns(line: string): string[] {
  const t = line.trim();
  if (!t) return [];
  if (t.includes("\t")) return t.split("\t").map(cleanCell);
  if (t.includes("|")) return t.split("|").map(cleanCell);
  if (/\s{2,}/.test(t)) return t.split(/\s{2,}/).map(cleanCell);
  if (/\s[-–—]\s/.test(t)) return t.split(/\s[-–—]\s/).map(cleanCell);
  if (/[;]/.test(t)) return t.split(/;/).map(cleanCell);
  if (/[,]/.test(t)) return t.split(/,/).map(cleanCell);
  return [cleanCell(t)];
}

const HEADER_KEYWORDS = [
  "stt",
  "tt",
  "họ và tên",
  "ho va ten",
  "họ tên",
  "ho ten",
  "cấp bậc",
  "cap bac",
  "chức vụ",
  "chuc vu",
  "đơn vị",
  "don vi",
  "tên đơn vị",
  "ten don vi",
];

interface ParsedRow {
  full_name: string;
  rank: string;
  position: string;
  unit: string;
}

// Một dòng dùng để xuất ra Excel (kèm mật khẩu để gửi cho người dùng).
interface ExportRow {
  full_name: string;
  username: string;
  password: string;
  rank: string;
  position: string;
  unit: string;
  batch: number | null;
  ok: boolean;
  error: string;
}

// Phân tích văn bản dán vào thành danh sách người dùng.
function parseBulkAccounts(raw: string): { rows: ParsedRow[]; skipped: number } {
  const lines = raw.split(/\r?\n/);
  const rows: ParsedRow[] = [];
  let skipped = 0;

  for (const line of lines) {
    if (!line.trim()) continue;
    let cells = splitColumns(line);

    // Bỏ cột STT đứng đầu nếu có.
    if (cells.length > 1 && /^(stt|tt|số|so|no|\d+)[.)]?$/i.test(cells[0])) {
      cells = cells.slice(1);
    }

    const firstKey = (cells[0] || "").toLowerCase().replace(/[.)\s]+$/g, "");
    // Bỏ dòng tiêu đề bảng.
    if (HEADER_KEYWORDS.includes(firstKey)) {
      skipped += 1;
      continue;
    }

    let fullName = cleanCell(cells[0] || "").replace(/^\d+[.)]\s*/, "");
    if (!fullName) {
      skipped += 1;
      continue;
    }

    // Bỏ dòng kiểu "Danh sách..." không có dữ liệu.
    if (cells.length === 1 && /^danh sách|^danh sach/i.test(fullName)) {
      skipped += 1;
      continue;
    }

    // Bảng thường có 4 cột: Họ và tên · Cấp bậc · Chức vụ · Đơn vị.
    // Nếu chỉ dán 3 cột (không kèm cấp bậc) thì vẫn nhận đúng chức vụ và đơn vị.
    let rank = "";
    let position = "";
    let unit = "";
    if (cells.length >= 4) {
      rank = cleanCell(cells[1] || "");
      position = cleanCell(cells[2] || "");
      unit = cleanCell(cells[3] || "");
    } else {
      position = cleanCell(cells[1] || "");
      unit = cleanCell(cells[2] || "");
    }

    rows.push({
      full_name: fullName,
      rank,
      position,
      unit,
    });
  }

  return { rows, skipped };
}

export default function CreateAccounts() {
  const [mode, setMode] = useState<"bulk" | "single">("bulk");

  const [defaultPassword, setDefaultPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [rank, setRank] = useState("");
  const [position, setPosition] = useState("");
  const [unit, setUnit] = useState("");

  const [bulkText, setBulkText] = useState("");
  const [bulkNote, setBulkNote] = useState("");

  const [queue, setQueue] = useState<NewAccount[]>([]);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [result, setResult] = useState<Array<{ username: string; ok?: boolean; error?: string }> | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [exportRows, setExportRows] = useState<ExportRow[]>([]);
  const [totalAccounts, setTotalAccounts] = useState<number | null>(null);
  const [existingUsers, setExistingUsers] = useState<Set<string>>(new Set());
  const [useBatch, setUseBatch] = useState(false);
  const [batchNumber, setBatchNumber] = useState(1);

  useEffect(() => {
    countAccounts().then(setTotalAccounts).catch(() => setTotalAccounts(null));
    listProfiles()
      .then((list) => {
        const names = list
          .map((p) => (p.username || "").toLowerCase().trim())
          .filter(Boolean);
        setExistingUsers(new Set(names));
      })
      .catch(() => setExistingUsers(new Set()));
  }, []);

  const bulkPreviewCount = useMemo(() => parseBulkAccounts(bulkText).rows.length, [bulkText]);

  const handleFullNameChange = (v: string) => {
    setFullName(v);
    if (!usernameTouched) {
      setUsername(slugify(v));
    }
  };

  const handleUsernameChange = (v: string) => {
    setUsernameTouched(true);
    setUsername(v);
  };

  // Sinh tên đăng nhập duy nhất dựa trên họ tên, tránh trùng với tài khoản đã có
  // và tránh trùng ngay trong danh sách đang chờ.
  const makeUsername = (fullNameValue: string, used: Set<string>) => {
    const base = slugify(fullNameValue) || "user";
    let candidate = base;
    let i = 1;
    while (used.has(candidate)) {
      i += 1;
      candidate = `${base}${i}`;
    }
    used.add(candidate);
    return candidate;
  };

  const handleBulkAdd = () => {
    setFormError("");
    setBulkNote("");
    setResult(null);

    const pwd = defaultPassword.trim();
    if (!pwd || pwd.length < 6) {
      setFormError("Vui lòng nhập mật khẩu mặc định (ít nhất 6 ký tự) trước khi nhập hàng loạt.");
      return;
    }

    const { rows, skipped } = parseBulkAccounts(bulkText);
    if (rows.length === 0) {
      setFormError("Không đọc được người dùng nào. Kiểm tra lại nội dung dán vào nhé.");
      return;
    }

    const used = new Set<string>([
      ...existingUsers,
      ...queue.map((q) => q.username.toLowerCase()),
    ]);

    const additions: NewAccount[] = rows.map((r) => ({
      username: makeUsername(r.full_name, used),
      password: pwd,
      full_name: r.full_name,
      rank: r.rank,
      position: r.position,
      unit: r.unit,
      batch: useBatch ? batchNumber : null,
    }));

    setQueue((prev) => [...prev, ...additions]);
    setBulkText("");
    setBulkNote(
      `Đã thêm ${additions.length} người vào danh sách chờ${
        skipped > 0 ? `, bỏ qua ${skipped} dòng (tiêu đề/trống)` : ""
      }.`,
    );
  };

  const handleAdd = () => {
    setFormError("");
    setResult(null);
    if (!fullName.trim()) {
      setFormError("Vui lòng nhập họ và tên.");
      return;
    }
    if (!username.trim()) {
      setFormError("Vui lòng nhập tên đăng nhập.");
      return;
    }
    const pwd = password || defaultPassword;
    if (!pwd || pwd.length < 6) {
      setFormError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setQueue((prev) => [
      ...prev,
      {
        username: username.trim().toLowerCase(),
        password: pwd,
        full_name: fullName.trim(),
        rank: rank.trim(),
        position: position.trim(),
        unit: unit.trim(),
        batch: useBatch ? batchNumber : null,
      },
    ]);

    setFullName("");
    setUsername("");
    setUsernameTouched(false);
    setPassword("");
    setRank("");
    setPosition("");
    setUnit("");
  };

  const handleCreate = async () => {
    setCreating(true);
    setResult(null);
    setExportRows([]);
    setProgress({ done: 0, total: queue.length });
    // Giữ lại bản chụp danh sách trước khi xóa, để còn dựng file Excel.
    const snapshot = [...queue];
    try {
      const data = await createUsers(snapshot, (done, total) => setProgress({ done, total }));
      const res = data?.results || [];
      setResult(res);
      // Dựng dữ liệu xuất Excel: mỗi người kèm tên đăng nhập, mật khẩu và
      // trạng thái tạo tài khoản.
      setExportRows(
        snapshot.map((u, i) => ({
          full_name: u.full_name,
          username: u.username,
          password: u.password,
          rank: u.rank,
          position: u.position,
          unit: u.unit,
          batch: u.batch ?? null,
          ok: !!res[i]?.ok,
          error: res[i]?.error || "",
        })),
      );
      // Bổ sung các tên đăng nhập vừa tạo vào danh sách đã có để lần nhập sau
      // không sinh trùng.
      setExistingUsers((prev) => {
        const next = new Set(prev);
        snapshot.forEach((q) => next.add(q.username.toLowerCase()));
        return next;
      });
      setQueue([]);
      countAccounts().then(setTotalAccounts).catch(() => setTotalAccounts(null));
    } catch (err) {
      setResult([{ username: "", error: err instanceof Error ? err.message : "Lỗi không xác định" }]);
    } finally {
      setCreating(false);
      setProgress(null);
    }
  };

  // Xuất danh sách tài khoản (kèm mật khẩu) ra file Excel .xlsx.
  const handleExportExcel = () => {
    if (exportRows.length === 0) return;
    const data = exportRows.map((r, i) => ({
      "STT": i + 1,
      "Họ và tên": r.full_name,
      "Tên đăng nhập": r.username,
      "Mật khẩu": r.password,
      "Cấp bậc": r.rank,
      "Chức vụ": r.position,
      "Đơn vị": r.unit,
      "Đợt": r.batch ? `Đợt ${r.batch}` : "",
      "Trạng thái": r.ok ? "Đã tạo" : `Lỗi: ${r.error}`,
    }));
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
      now.getDate(),
    ).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;
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
            { wch: 18 },
            { wch: 20 },
            { wch: 24 },
            { wch: 10 },
            { wch: 28 },
          ],
        },
      ],
      `danh-sach-tai-khoan_${stamp}.xlsx`,
    );
  };

  const okCount = result?.filter((r) => r.ok).length ?? 0;
  const failCount = result?.filter((r) => !r.ok).length ?? 0;

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-6">
        <div className="bg-white rounded-2xl border border-military-cream-dark p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-lg bg-military-red/10 flex items-center justify-center text-military-red">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-military-red-dark">Tạo tài khoản người dùng</h2>
              <p className="text-xs text-foreground-600">
                {totalAccounts !== null
                  ? `Đã có ${totalAccounts} tài khoản người dùng trong hệ thống.`
                  : "Đang tải số lượng..."}
              </p>
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-military-red-dark mb-1.5">
              Mật khẩu mặc định (áp dụng cho tất cả tài khoản mới) *
            </label>
            <input
              type="text"
              value={defaultPassword}
              onChange={(e) => setDefaultPassword(e.target.value)}
              placeholder="VD: 123456"
              className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-military-cream/50 text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
            />
          </div>

          <div className="mb-5 p-4 rounded-lg border border-military-cream-dark bg-military-cream/40">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="text-sm font-semibold text-military-red-dark">Chia theo đợt</div>
                <p className="text-xs text-foreground-600 mt-0.5">
                  Gắn số đợt cho từng tài khoản để phân loại theo đợt tạo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setUseBatch(!useBatch)}
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
                  useBatch ? "bg-military-red" : "bg-foreground-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
                    useBatch ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>

            {useBatch && (
              <div className="mt-4 flex items-center gap-3 border-t border-military-cream-dark pt-4 flex-wrap">
                <label className="text-sm font-semibold text-military-red-dark whitespace-nowrap">
                  Tạo đợt số
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setBatchNumber((n) => Math.max(1, n - 1))}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-military-cream-dark bg-white text-foreground-600 hover:border-military-red hover:text-military-red transition-colors cursor-pointer"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    min={1}
                    value={batchNumber}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      setBatchNumber(Number.isFinite(v) && v >= 1 ? v : 1);
                    }}
                    className="w-16 h-9 text-center rounded-lg border border-military-cream-dark bg-white text-sm font-bold text-military-red-dark focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20"
                  />
                  <button
                    type="button"
                    onClick={() => setBatchNumber((n) => n + 1)}
                    className="w-9 h-9 flex items-center justify-center rounded-lg border border-military-cream-dark bg-white text-foreground-600 hover:border-military-red hover:text-military-red transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <span className="text-xs text-foreground-600">
                  Tài khoản thêm vào danh sách sẽ thuộc "Đợt {batchNumber}".
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 bg-military-cream border border-military-cream-dark rounded-full p-1 mb-5 w-fit">
            <button
              type="button"
              onClick={() => setMode("bulk")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                mode === "bulk" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
              Nhập hàng loạt
            </button>
            <button
              type="button"
              onClick={() => setMode("single")}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors whitespace-nowrap cursor-pointer ${
                mode === "single" ? "bg-military-red text-white" : "text-foreground-600 hover:text-military-red"
              }`}
            >
              <UserPlus className="w-4 h-4" />
              Nhập từng người
            </button>
          </div>

          {formError && (
            <div className="flex items-start gap-2 bg-military-red/5 border border-military-red/30 text-military-red rounded-lg p-3 mb-5 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {mode === "bulk" ? (
            <div>
              <div className="flex items-start gap-2 bg-military-cream border border-military-cream-dark rounded-lg p-3 mb-3 text-xs text-foreground-700">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-military-red" />
                <span>
                  Mở file Word, bôi đen cả bảng (hoặc danh sách) rồi copy, dán vào ô dưới.
                  Mỗi dòng 1 người, theo thứ tự cột:
                  <strong className="text-military-red-dark"> Họ và tên · Cấp bậc · Chức vụ · Tên đơn vị</strong>.
                  Hệ thống tự tách cột và tự sinh tên đăng nhập.
                </span>
              </div>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={10}
                placeholder={"Nguyễn Văn An\tTrung tá QNCN\tVăn thư\tPhòng Thi hành án\nTrần Văn Bình\tThượng úy\tChỉ huy\tĐại đội 1"}
                className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-military-cream/50 text-sm font-mono focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all resize-y"
              />
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={handleBulkAdd}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Wand2 className="w-5 h-5" />
                  Đọc & thêm vào danh sách
                </button>
                <span className="text-xs text-foreground-600">
                  {bulkPreviewCount > 0
                    ? `Đang nhận diện được ${bulkPreviewCount} người`
                    : "Chưa có nội dung"}
                </span>
              </div>
              {bulkNote && (
                <div className="flex items-start gap-2 bg-military-green/10 border border-military-green/30 text-military-green rounded-lg p-3 mt-4 text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{bulkNote}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Họ và tên *</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => handleFullNameChange(e.target.value)}
                  placeholder="VD: Nguyễn Văn An"
                  className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-military-cream/50 text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Tên đăng nhập *</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => handleUsernameChange(e.target.value)}
                  placeholder="Tự gợi ý từ họ tên"
                  className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-military-cream/50 text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Mật khẩu</label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={defaultPassword || "Tối thiểu 6 ký tự"}
                  className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-military-cream/50 text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Cấp bậc</label>
                <input
                  type="text"
                  value={rank}
                  onChange={(e) => setRank(e.target.value)}
                  placeholder="VD: Thượng úy"
                  className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-military-cream/50 text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Chức vụ</label>
                <input
                  type="text"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="VD: Trợ lý tác chiến"
                  className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-military-cream/50 text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-military-red-dark mb-1.5">Tên đơn vị</label>
                <input
                  type="text"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  placeholder="VD: Phòng Tác chiến"
                  className="w-full px-4 py-3 rounded-lg border border-military-cream-dark bg-military-cream/50 text-sm focus:outline-none focus:border-military-red focus:ring-2 focus:ring-military-red/20 transition-all"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  onClick={handleAdd}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-military-red-dark text-white font-bold rounded-lg hover:bg-military-red transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Plus className="w-5 h-5" />
                  Thêm vào danh sách
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="lg:col-span-2">
        <div className="bg-white rounded-2xl border border-military-cream-dark p-6">
          <h2 className="font-bold text-military-red-dark mb-4">
            Danh sách chờ tạo ({queue.length})
          </h2>

          {queue.length === 0 ? (
            <p className="text-sm text-foreground-600 py-8 text-center">
              Chưa có tài khoản nào trong danh sách.
            </p>
          ) : (
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {queue.map((acc, i) => (
                <div key={i} className="flex items-center justify-between gap-3 bg-military-cream/60 rounded-lg p-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-military-red-dark text-sm truncate">
                      {acc.full_name}
                    </div>
                    <div className="text-xs text-foreground-600 truncate flex items-center gap-1.5">
                      {acc.batch ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-military-red/10 text-military-red text-[10px] font-bold shrink-0">
                          Đợt {acc.batch}
                        </span>
                      ) : null}
                      <span className="truncate">
                        {acc.username}
                        {acc.rank ? ` · ${acc.rank}` : ""}
                        {acc.unit ? ` · ${acc.unit}` : ""}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setQueue((prev) => prev.filter((_, idx) => idx !== i))}
                    className="w-8 h-8 flex items-center justify-center rounded-full text-foreground-500 hover:bg-military-red/10 hover:text-military-red transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={handleCreate}
            disabled={queue.length === 0 || creating}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
          >
            {creating
              ? progress
                ? `Đang tạo... ${progress.done}/${progress.total}`
                : "Đang tạo..."
              : `Tạo ${queue.length} tài khoản`}
          </button>

          {creating && progress && progress.total > 0 && (
            <div className="mt-3">
              <div className="h-1.5 w-full rounded-full bg-military-cream-dark overflow-hidden">
                <div
                  className="h-full bg-military-red transition-all duration-300"
                  style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-foreground-600 mt-1.5">
                Đang tạo tài khoản, vui lòng không đóng trang...
              </p>
            </div>
          )}

          {result && (
            <div className="mt-5">
              <div className="flex items-center gap-2 text-sm font-bold mb-2">
                <CheckCircle2 className="w-4 h-4 text-military-green" />
                <span className="text-military-green">Thành công: {okCount}</span>
                {failCount > 0 && (
                  <>
                    <span className="text-foreground-300">·</span>
                    <AlertCircle className="w-4 h-4 text-military-red" />
                    <span className="text-military-red">Lỗi: {failCount}</span>
                  </>
                )}
              </div>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {result.map((r, i) => (
                  <div
                    key={i}
                    className={`text-xs rounded-lg p-2.5 ${
                      r.ok ? "bg-military-green/10 text-military-green" : "bg-military-red/5 text-military-red"
                    }`}
                  >
                    <span className="font-semibold">{r.username}</span>
                    {r.error ? ` — ${r.error}` : " — đã tạo"}
                  </div>
                ))}
              </div>

              {exportRows.length > 0 && (
                <button
                  onClick={handleExportExcel}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-military-green text-white font-bold rounded-lg hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer"
                >
                  <Download className="w-5 h-5" />
                  Xuất Excel ({exportRows.length} tài khoản)
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}