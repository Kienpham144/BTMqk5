import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  itemLabel?: string;
}

// Dựng dãy số trang hiển thị dạng 1 ... 4 5 6 ... 12 để không bị tràn khi có
// nhiều trang, nhưng vẫn luôn thấy trang đầu và trang cuối.
function buildPages(current: number, total: number): Array<number | "ellipsis"> {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const pages: Array<number | "ellipsis"> = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) pages.push("ellipsis");
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < total - 1) pages.push("ellipsis");
  pages.push(total);
  return pages;
}

export default function Pagination({ page, totalPages, onChange, totalItems, pageSize, itemLabel = "tài khoản" }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = buildPages(page, totalPages);
  const from = totalItems && pageSize ? (page - 1) * pageSize + 1 : null;
  const to = totalItems && pageSize ? Math.min(page * pageSize, totalItems) : null;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-5">
      {from !== null && to !== null && totalItems ? (
        <p className="text-xs text-foreground-600 text-center sm:text-left">
          Đang xem <strong className="text-military-red-dark">{from}</strong>–
          <strong className="text-military-red-dark">{to}</strong> trong{" "}
          <strong className="text-military-red-dark">{totalItems}</strong> {itemLabel}
        </p>
      ) : (
        <span />
      )}

      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page === 1}
          aria-label="Trang trước"
          className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-military-cream-dark text-military-red-dark hover:border-military-red disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span
              key={`ellipsis-${i}`}
              className="w-9 h-9 flex items-center justify-center text-foreground-400 text-sm"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onChange(p)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-bold transition-colors cursor-pointer ${
                p === page
                  ? "bg-military-red text-white"
                  : "border-2 border-military-cream-dark text-military-red-dark hover:border-military-red"
              }`}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onChange(Math.min(totalPages, page + 1))}
          disabled={page === totalPages}
          aria-label="Trang sau"
          className="w-9 h-9 flex items-center justify-center rounded-lg border-2 border-military-cream-dark text-military-red-dark hover:border-military-red disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}