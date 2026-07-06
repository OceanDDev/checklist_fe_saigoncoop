/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/HuyGiaoPhieu.jsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Undo2,
  X,
  Trash2,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";

const TRANG_THAI_STYLE = {
  "Chưa soạn": "text-slate-600 bg-slate-50 border border-slate-200",
  "Đang soạn": "text-yellow-700 bg-yellow-50 border border-yellow-200",
  "Hoàn thành": "text-green-700 bg-green-50 border border-green-200",
};

const HuyGiaoPhieu = ({ onSuccess }) => {
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: scan list, 2: xác nhận huỷ giao

  // --- Bước 1: quét phiếu ---
  const [scanValue, setScanValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scannedList, setScannedList] = useState([]); // [{ _id, soDonHang, maNXD, noiXuatDen, trangThai, nvSoan... }]

  // --- Bước 2: xác nhận huỷ ---
  const [submitting, setSubmitting] = useState(false);

  // Luôn đưa con trỏ vào ô scan mỗi khi modal mở, quay lại bước 1,
  // hoặc vừa quét xong 1 phiếu (scanning: true -> false).
  useEffect(() => {
    if (open && step === 1 && !scanning) {
      const raf = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [open, step, scanning]);

  // Khoá scroll nền khi modal mở + xử lý phím tắt:
  // - Esc: đóng modal (mọi lúc)
  // - Enter ở bước 2: xác nhận huỷ giao luôn, không cần bấm chuột vào nút
  //   (bước 2 không có input nào để bắt Enter cục bộ nên lắng nghe ở document).
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        handleClose();
        return;
      }
      if (e.key === "Enter" && step === 2 && !submitting) {
        e.preventDefault();
        handleConfirmHuyGiao();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, submitting]);

  const resetAll = () => {
    setStep(1);
    setScanValue("");
    setScanError("");
    setScannedList([]);
  };

  const handleOpen = () => {
    resetAll();
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    resetAll();
  };

  /** Nhập/quét số đơn hàng rồi Enter → tìm phiếu, CHỈ CHO PHÉP phiếu đang
   *  ở trạng thái "Đang soạn" (đã giao cho NV nhưng chưa hoàn thành). */
  const handleScanSubmit = async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const code = scanValue.trim();
    if (!code) return;

    if (
      scannedList.some(
        (it) => it.soDonHang.toUpperCase() === code.toUpperCase(),
      )
    ) {
      setScanError(`"${code}" đã có trong danh sách.`);
      setScanValue("");
      return;
    }

    setScanning(true);
    setScanError("");
    try {
      const res = await nhanSuSoanService.getAllNhanSuSoan({
        soDonHang: code,
        limit: 5,
      });
      const list = res.data || res.items || [];
      const matched =
        list.find((it) => it.soDonHang?.toUpperCase() === code.toUpperCase()) ||
        list[0];

      if (!matched) {
        setScanError(`Không tìm thấy phiếu "${code}".`);
        return;
      }

      // Chỉ cho huỷ giao các phiếu đang ở trạng thái "Đang soạn"
      if (matched.trangThai !== "Đang soạn") {
        setScanError(
          `Phiếu "${code}" đang ở trạng thái "${matched.trangThai}" — chỉ có thể huỷ giao phiếu đang ở trạng thái "Đang soạn".`,
        );
        return;
      }

      setScannedList((prev) => [matched, ...prev]);
      setScanValue("");
    } catch (err) {
      console.error("Lỗi tìm phiếu:", err);
      setScanError("Có lỗi khi tìm phiếu, thử lại.");
    } finally {
      // Dừng khoảng 0.5s trước khi cho phép quét tiếp, tránh máy scan/người
      // dùng bắn liên tiếp quá nhanh.
      await new Promise((resolve) => setTimeout(resolve, 500));
      setScanning(false);
    }
  };

  const handleRemoveScanned = (id) => {
    setScannedList((prev) => prev.filter((it) => it._id !== id));
  };

  const goToConfirmStep = () => {
    if (scannedList.length === 0) {
      setScanError("Vui lòng quét ít nhất 1 phiếu.");
      return;
    }
    setStep(2);
  };

  /** Xác nhận huỷ giao: đưa phiếu về "Chưa soạn", xoá sạch NV soạn đã gán
   *  và xoá thời gian nhận phiếu. */
  const handleConfirmHuyGiao = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      await Promise.all(
        scannedList.map((item) =>
          nhanSuSoanService.updateNhanSuSoan(item._id, {
            trangThai: "Chưa soạn",
            nvSoan: [],
            tgNhanPhieu: null,
          }),
        ),
      );

      alert(`Đã huỷ giao ${scannedList.length} phiếu.`);
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error("Lỗi huỷ giao phiếu:", err);
      alert("Huỷ giao phiếu thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={handleClose}
    >
      <div
        className="my-8 flex max-h-[calc(100vh-4rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:my-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            {step === 1 ? "Huỷ Giao Phiếu" : "Xác nhận huỷ giao"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {step === 1 ? (
          <>
            {/* Body — bước quét */}
            <div className="space-y-3 overflow-y-auto px-5 py-4">
              <input
                ref={inputRef}
                type="text"
                autoFocus
                value={scanValue}
                onChange={(e) => {
                  setScanValue(e.target.value);
                  setScanError("");
                }}
                onKeyDown={handleScanSubmit}
                disabled={scanning}
                placeholder="Quét hoặc nhập số đơn hàng rồi nhấn Enter..."
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              />
              {scanning && (
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Loader2 size={14} className="animate-spin" />
                  Đang tìm phiếu...
                </div>
              )}
              {scanError && (
                <p className="flex items-start gap-1.5 text-xs text-red-600">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  {scanError}
                </p>
              )}

              <p className="text-[11px] text-slate-400">
                Chỉ quét được các phiếu đang ở trạng thái{" "}
                <b className="text-slate-600">Đang soạn</b>.
              </p>

              <div className="max-h-72 space-y-1.5 overflow-y-auto">
                {scannedList.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Chưa có phiếu nào được quét.
                  </p>
                ) : (
                  scannedList.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-slate-800">
                          {item.soDonHang}
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {item.maNXD ? `${item.maNXD} — ` : ""}
                          {item.noiXuatDen || ""}
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-2">
                        <span
                          className={`whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-medium ${
                            TRANG_THAI_STYLE[item.trangThai] ||
                            TRANG_THAI_STYLE["Chưa soạn"]
                          }`}
                        >
                          {item.trangThai}
                        </span>
                        <button
                          onClick={() => handleRemoveScanned(item._id)}
                          className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                          title="Bỏ khỏi danh sách"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Footer — bước quét */}
            <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
              <span className="text-sm text-slate-500">
                Đã quét: <b className="text-slate-700">{scannedList.length}</b>{" "}
                phiếu
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleClose}
                  className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
                >
                  Huỷ
                </button>
                <button
                  onClick={goToConfirmStep}
                  disabled={scannedList.length === 0}
                  className="flex items-center gap-2 rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Huỷ Giao Phiếu
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Body — bước xác nhận */}
            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                <AlertTriangle
                  size={16}
                  className="mt-0.5 flex-shrink-0 text-amber-500"
                />
                <div>
                  Sắp huỷ giao <b>{scannedList.length}</b> phiếu. Các phiếu này
                  sẽ chuyển về trạng thái <b>Chưa soạn</b> và{" "}
                  <b>xoá hết nhân viên soạn</b> đã được gán trước đó.
                  <br />
                  <span className="text-amber-700">
                    Nhấn <b>Enter</b> để xác nhận huỷ giao.
                  </span>
                </div>
              </div>

              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {scannedList.map((item) => (
                  <div
                    key={item._id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-800">
                        {item.soDonHang}
                      </div>
                      <div className="truncate text-xs text-slate-500">
                        {item.maNXD ? `${item.maNXD} — ` : ""}
                        {item.noiXuatDen || ""}
                      </div>
                    </div>
                    <span
                      className={`flex-shrink-0 whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-medium ${TRANG_THAI_STYLE["Đang soạn"]}`}
                    >
                      Đang soạn
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer — bước xác nhận */}
            <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                <ArrowLeft size={16} />
                Quay lại
              </button>
              <button
                onClick={handleConfirmHuyGiao}
                disabled={submitting}
                autoFocus
                className="flex items-center gap-2 rounded-lg bg-rose-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={16} />
                )}
                {submitting ? "Đang huỷ..." : "Xác nhận huỷ giao"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-lg border border-rose-200 bg-white px-3.5 py-2 text-sm font-medium text-rose-600 shadow-sm transition hover:bg-rose-50"
      >
        <Undo2 size={16} />
        Huỷ Giao Phiếu
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(modal, document.body)}
    </>
  );
};

export default HuyGiaoPhieu;