import { useEffect, useRef, useState } from "react";

interface AntiCheatOptions {
  enabled: boolean;
  maxViolations?: number;
  onViolation?: (count: number, reason: string) => void;
  onMaxViolations?: () => void;
}

// Bộ chống gian lận cho phòng thi. Khi bật, nó chặn các hành vi phổ biến:
//  - Rời khỏi tab / chuyển sang cửa sổ khác (visibilitychange, blur)
//  - Thoát chế độ toàn màn hình
//  - Bấm chuột phải (menu ngữ cảnh)
//  - Sao chép / cắt / dán nội dung
//  - Bôi đen văn bản câu hỏi
//  - Kéo thả nội dung ra ngoài
//  - Các phím tắt mở công cụ dev / in / lưu trang / chụp màn hình
//
// Mỗi hành vi được tính là 1 lần vi phạm. Khi đủ `maxViolations` lần,
// tự gọi `onMaxViolations` (thường là nộp bài ngay).
export function useExamAntiCheat({
  enabled,
  maxViolations = 3,
  onViolation,
  onMaxViolations,
}: AntiCheatOptions) {
  const [violations, setViolations] = useState(0);
  const countRef = useRef(0);
  const lastAtRef = useRef(0);
  const callbacksRef = useRef({ onViolation, onMaxViolations, maxViolations });
  callbacksRef.current = { onViolation, onMaxViolations, maxViolations };

  useEffect(() => {
    if (!enabled) {
      countRef.current = 0;
      setViolations(0);
      return;
    }

    const register = (reason: string) => {
      // Gộp các sự kiện nổ cùng lúc (ví dụ vừa blur vừa visibilitychange
      // khi chuyển tab) thành một lần vi phạm duy nhất.
      const now = Date.now();
      if (now - lastAtRef.current < 600) return;
      lastAtRef.current = now;

      countRef.current += 1;
      const next = countRef.current;
      setViolations(next);
      callbacksRef.current.onViolation?.(next, reason);
      if (next >= callbacksRef.current.maxViolations) {
        callbacksRef.current.onMaxViolations?.();
      }
    };

    const onVisibility = () => {
      if (document.hidden) register("Rời khỏi tab làm bài thi");
    };

    const onBlur = () => {
      // Chỉ tính khi cửa sổ mất tiêu điểm sang ứng dụng/cửa sổ khác
      // (đã tránh trùng lặp với visibilitychange nhờ bộ gộp ở trên).
      register("Chuyển sang cửa sổ khác");
    };

    const onContextMenu = (e: Event) => {
      e.preventDefault();
      register("Bấm chuột phải");
    };

    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      register("Sao chép nội dung");
    };

    const onCut = (e: ClipboardEvent) => {
      e.preventDefault();
      register("Cắt nội dung");
    };

    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      register("Dán nội dung");
    };

    const onSelectStart = (e: Event) => {
      const target = e.target as HTMLElement | null;
      // Vẫn cho phép bôi đen trong ô nhập (tự luận) để thí sinh sửa câu trả lời.
      if (target && (target.tagName === "TEXTAREA" || target.tagName === "INPUT")) return;
      e.preventDefault();
    };

    const onDragStart = (e: DragEvent) => {
      e.preventDefault();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const blocked =
        k === "f12" ||
        (ctrl && shift && (k === "i" || k === "j" || k === "c")) ||
        (ctrl && k === "u") ||
        (ctrl && k === "s") ||
        (ctrl && k === "p") ||
        (ctrl && (k === "c" || k === "x" || k === "v")) ||
        k === "printscreen";
      if (blocked) {
        e.preventDefault();
        register("Dùng phím tắt bị cấm");
      }
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        register("Thoát chế độ toàn màn hình");
      }
    };

    // Cố gắng vào chế độ toàn màn hình để hạn chế thao tác ngoài phòng thi.
    // Một số trình duyệt/môi trường có thể từ chối — khi đó chỉ bỏ qua.
    const el = document.documentElement;
    if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("blur", onBlur);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("copy", onCopy);
    document.addEventListener("cut", onCut);
    document.addEventListener("paste", onPaste);
    document.addEventListener("selectstart", onSelectStart);
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("cut", onCut);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("selectstart", onSelectStart);
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [enabled]);

  return { violations };
}