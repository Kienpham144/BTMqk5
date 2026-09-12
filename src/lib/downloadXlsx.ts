import * as XLSX from "xlsx";

// Định dạng chuẩn của file Excel (.xlsx). Bắt buộc phải đúng chuỗi này thì
// trình duyệt và hệ điều hành mới nhận đúng là file Excel.
const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export interface XlsxSheet {
  // Tên sheet hiển thị trong Excel (tối đa 31 ký tự).
  name: string;
  // Dữ liệu từng dòng: khóa là tên cột, giá trị là nội dung ô.
  rows: Record<string, unknown>[];
  // Thứ tự cột mong muốn (nếu cần cố định).
  header?: string[];
  // Độ rộng cột.
  cols?: { wch: number }[];
}

// Loại bỏ ký tự không hợp lệ trong tên sheet của Excel.
function sanitizeSheetName(name: string): string {
  return (name || "Sheet")
    .replace(/[\\/?*[\]:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Tải file xuống máy với đúng tên kèm đuôi .xlsx và đúng định dạng Excel,
// để file mở ra bằng Excel / Google Sheet được ngay.
function triggerDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    if (a.parentNode) a.parentNode.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1500);
}

// Tạo và tải file Excel .xlsx từ một hoặc nhiều sheet.
export function downloadXlsx(sheets: XlsxSheet[], fileName: string): void {
  const workbook = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  sheets.forEach((sheet) => {
    const worksheet = XLSX.utils.json_to_sheet(
      sheet.rows,
      sheet.header ? { header: sheet.header } : undefined,
    );
    if (sheet.cols) worksheet["!cols"] = sheet.cols;

    const base = sanitizeSheetName(sheet.name).slice(0, 31) || "Sheet";
    let finalName = base;
    let n = 2;
    while (usedNames.has(finalName)) {
      finalName = `${base.slice(0, 28)}-${n}`;
      n += 1;
    }
    usedNames.add(finalName);
    XLSX.utils.book_append_sheet(workbook, worksheet, finalName);
  });

  const content = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([content], { type: XLSX_MIME });
  const safeName = fileName.toLowerCase().endsWith(".xlsx")
    ? fileName
    : `${fileName}.xlsx`;
  triggerDownload(blob, safeName);
}