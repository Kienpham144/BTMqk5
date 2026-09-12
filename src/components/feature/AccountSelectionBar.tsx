import { CheckSquare, Square, Trash2 } from "lucide-react";

interface AccountSelectionBarProps {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onClear: () => void;
  onDelete: () => void;
  deleting?: boolean;
}

// Thanh thao tác dùng chung cho các bảng tài khoản: chọn tất cả, bỏ chọn và
// xóa hàng loạt những tài khoản đã tick.
export default function AccountSelectionBar({
  selectedCount,
  totalCount,
  allSelected,
  onToggleAll,
  onClear,
  onDelete,
  deleting,
}: AccountSelectionBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-4">
      <button
        type="button"
        onClick={onToggleAll}
        className="inline-flex items-center gap-2 px-4 py-2 bg-white text-military-red-dark font-semibold rounded-lg border-2 border-military-cream-dark hover:border-military-red transition-colors whitespace-nowrap cursor-pointer"
      >
        {allSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
        {allSelected ? "Bỏ chọn tất cả" : `Chọn tất cả ${totalCount} tài khoản`}
      </button>

      <span className="text-sm text-foreground-600">
        Đã chọn <strong className="text-military-red-dark">{selectedCount}</strong> tài khoản
      </span>

      {selectedCount > 0 && (
        <>
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-2 text-xs font-bold text-foreground-600 bg-foreground-100 rounded-lg hover:bg-foreground-200 transition-colors cursor-pointer"
          >
            Bỏ chọn
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-military-red text-white font-bold rounded-lg hover:bg-military-red-dark transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {deleting ? "Đang xóa..." : `Xóa ${selectedCount} tài khoản đã chọn`}
          </button>
        </>
      )}
    </div>
  );
}