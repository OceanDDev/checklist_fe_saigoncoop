/* eslint-disable react/prop-types */
// components/tonkho/delete-all.jsx
import { useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Trash2, AlertTriangle, Loader2, X } from "lucide-react";
import { khuyenMaiService } from "@/services/khuyenmai.service";

const CONFIRM_TEXT = "XOA HET";

/**
 * Nút xoá toàn bộ dữ liệu tồn kho. Có modal xác nhận, bắt gõ đúng
 * chuỗi "XOA HET" mới cho phép bấm xoá — tránh bấm nhầm.
 */
const DeleteAllTonKho = ({ onDeleted, disabled }) => {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleClose = useCallback(() => {
    if (deleting) return;
    setOpen(false);
    setConfirmText("");
    setError("");
  }, [deleting]);

  const canDelete = confirmText.trim().toUpperCase() === CONFIRM_TEXT && !deleting;

  const handleDelete = useCallback(async () => {
    if (!canDelete) return;
    setDeleting(true);
    setError("");
    try {
      await khuyenMaiService.deleteAllKhuyenMai();
      setOpen(false);
      setConfirmText("");
      onDeleted?.();
    } catch (err) {
      console.error("Lỗi khi xoá toàn bộ tồn kho:", err);
      setError("Xoá thất bại. Vui lòng thử lại.");
    } finally {
      setDeleting(false);
    }
  }, [canDelete, onDeleted]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        title="Xoá toàn bộ dữ liệu tồn kho"
        className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-rose-600 ring-1 ring-rose-300 shadow-sm transition-all hover:bg-rose-50 hover:shadow-md active:scale-95 disabled:opacity-50"
      >
        <Trash2 size={15} />
        Xoá tất cả
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
          >
            <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-rose-50 text-rose-600">
                    <AlertTriangle size={16} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    Xoá toàn bộ dữ liệu?
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={deleting}
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                  title="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 px-5 py-4">
                <p className="text-sm text-slate-600">
                  Hành động này sẽ <b>xoá vĩnh viễn toàn bộ</b> dữ liệu tồn
                  kho hiện có trong bảng, không thể hoàn tác.
                </p>
                <p className="text-sm text-slate-600">
                  Gõ <b className="text-rose-600">{CONFIRM_TEXT}</b> vào ô bên
                  dưới để xác nhận:
                </p>
                <input
                  type="text"
                  autoFocus
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRM_TEXT}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-rose-300 focus:border-rose-400"
                />
                {error && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    {error}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={deleting}
                  className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"
                >
                  Huỷ
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={!canDelete}
                  className="flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-rose-700 disabled:opacity-50"
                >
                  {deleting ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Trash2 size={15} />
                  )}
                  {deleting ? "Đang xoá..." : "Xoá vĩnh viễn"}
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default DeleteAllTonKho;