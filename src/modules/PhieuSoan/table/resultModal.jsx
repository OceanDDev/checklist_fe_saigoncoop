/* eslint-disable react/prop-types */
import { useEffect, useRef } from "react";

const ResultModal = ({
  open,
  title = "Thông báo",
  children,
  onClose,
  actions, // optional: array of { label, onClick, variant? }
  widthClass = "max-w-3xl", // cho phép truyền "max-w-5xl" khi cần rộng hơn
}) => {
  const overlayRef = useRef(null);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Click outside to close
  const onOverlayClick = (e) => {
    if (e.target === overlayRef.current) onClose?.();
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={onOverlayClick}
      className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div className={`w-full ${widthClass} rounded-2xl bg-white shadow-xl`}>
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100 text-slate-500"
            aria-label="Close modal"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" />
            </svg>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-auto px-5 py-4 text-sm text-slate-700">
          {children}
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-4 border-t">
          <div className="text-xs text-slate-400">
            Nhấn <kbd className="px-1.5 py-0.5 rounded border bg-slate-50">Esc</kbd> để đóng
          </div>
          <div className="flex items-center gap-2">
            {actions?.map((a, idx) => (
              <button
                key={idx}
                onClick={a.onClick}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition
                ${a.variant === "primary"
                    ? "bg-blue-600 text-white hover:bg-blue-700"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
              >
                {a.label}
              </button>
            ))}
            <button
              onClick={onClose}
              className="px-3 py-2 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultModal;
