/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/ScanGiaoPhieu.jsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  ScanLine,
  X,
  Trash2,
  ArrowLeft,
  Loader2,
  UserCheck,
  CheckCircle2,
} from "lucide-react";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";
import { nhanVienService } from "@/services/nhanvien.service";

const TRANG_THAI_STYLE = {
  "Chưa soạn": "text-slate-600 bg-slate-50 border border-slate-200",
  "Đang soạn": "text-yellow-700 bg-yellow-50 border border-yellow-200",
  "Hoàn thành": "text-green-700 bg-green-50 border border-green-200",
};

const ScanGiaoPhieu = ({ onSuccess }) => {
  const inputRef = useRef(null);
  const nvInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: scan list, 2: confirm nhân viên

  // --- Bước 1: quét phiếu ---
  const [scanValue, setScanValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scannedList, setScannedList] = useState([]); // [{ _id, soDonHang, maNXD, noiXuatDen, trangThai }]

  // --- Bước 2: xác nhận nhân viên giao ---
  const [maNhanVien, setMaNhanVien] = useState("");
  const [lookingUpNV, setLookingUpNV] = useState(false);
  const [nhanVienInfo, setNhanVienInfo] = useState(null);
  const [nvError, setNvError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Luôn đưa con trỏ vào ô scan mỗi khi modal mở, quay lại bước 1,
  // hoặc vừa quét xong 1 phiếu (scanning: true -> false).
  // Dùng requestAnimationFrame thay vì chỉ dựa vào autoFocus vì lúc setScanning(false)
  // vừa chạy, DOM (thuộc tính disabled) chưa kịp cập nhật ngay trong cùng tick,
  // nên gọi focus() trực tiếp trong finally sẽ không có tác dụng.
  useEffect(() => {
    if (open && step === 1 && !scanning) {
      const raf = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [open, step, scanning]);

  // Tự động focus lại ô mã NV ở bước 2, mỗi khi mở modal, quay lại bước 2,
  // hoặc vừa tra cứu/xác nhận xong (giống cơ chế của bước 1).
  // Nhờ vậy thao tác "Enter tra cứu -> Enter xác nhận" chạy được liên tục
  // bằng bàn phím/máy quét mà không cần bấm chuột vào ô input.
  useEffect(() => {
    if (open && step === 2 && !lookingUpNV && !submitting) {
      const raf = requestAnimationFrame(() => {
        nvInputRef.current?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [open, step, lookingUpNV, submitting]);

  // Khoá scroll nền khi modal mở + cho phép đóng bằng phím Esc
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e) => {
      if (e.key === "Escape") handleClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetAll = () => {
    setStep(1);
    setScanValue("");
    setScanError("");
    setScannedList([]);
    setMaNhanVien("");
    setNhanVienInfo(null);
    setNvError("");
  };

  const handleOpen = () => {
    resetAll();
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    resetAll();
  };

  /** Nhập/quét số đơn hàng rồi Enter → tìm phiếu tương ứng và thêm vào danh sách */
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

      setScannedList((prev) => [matched, ...prev]);
      setScanValue("");
    } catch (err) {
      console.error("Lỗi tìm phiếu:", err);
      setScanError("Có lỗi khi tìm phiếu, thử lại.");
    } finally {
      // Dừng khoảng 0.5s trước khi cho phép quét tiếp, tránh máy scan/người
      // dùng bắn liên tiếp quá nhanh. Trong lúc này input vẫn đang disabled.
      await new Promise((resolve) => setTimeout(resolve, 500));
      setScanning(false);
      // Việc focus lại ô input đã được xử lý bằng useEffect ở trên
      // (chạy sau khi React render xong, đảm bảo input không còn bị disabled).
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

  /** Tra cứu nhân viên theo mã, dùng nhanVienService có sẵn */
  const handleLookupNhanVien = async () => {
    const ma = maNhanVien.trim();
    if (!ma) return;

    setLookingUpNV(true);
    setNvError("");
    setNhanVienInfo(null);
    try {
      const res = await nhanVienService.traCuu(ma);
      const nv = res?.data || res;
      if (!nv || (Array.isArray(nv) && nv.length === 0)) {
        setNvError(`Không tìm thấy nhân viên mã "${ma}".`);
        return;
      }
      setNhanVienInfo(Array.isArray(nv) ? nv[0] : nv);
    } catch (err) {
      console.error("Lỗi tra cứu nhân viên:", err);
      const backendMsg = err?.response?.data?.message;
      setNvError(backendMsg || `Không tìm thấy nhân viên mã "${ma}".`);
    } finally {
      setLookingUpNV(false);
      // Việc focus lại ô input mã NV đã được xử lý bằng useEffect ở trên.
    }
  };

  /** Enter trong ô mã NV: nếu chưa tra cứu (hoặc vừa đổi mã) → tra cứu.
   *  Nếu đã có kết quả tra cứu hợp lệ rồi → Enter tiếp theo xác nhận giao luôn,
   *  giúp thao tác nhanh kiểu "Enter Enter" khi vận hành bằng máy quét/bàn phím. */
  const handleMaNhanVienKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (lookingUpNV || submitting) return;

    if (nhanVienInfo) {
      handleConfirmGiao();
    } else {
      handleLookupNhanVien();
    }
  };

  /** Lấy danh sách mã NV soạn hiện có của 1 phiếu (từ nvSoan hoặc nvSoanChiTiet đã populate) */
  const getExistingNvSoanCodes = (item) => {
    if (Array.isArray(item.nvSoan) && item.nvSoan.length > 0) {
      return item.nvSoan;
    }
    if (Array.isArray(item.nvSoanChiTiet)) {
      return item.nvSoanChiTiet.map((nv) => nv.ma_nhan_vien || nv);
    }
    return [];
  };

  /** Xác nhận giao: cập nhật trạng thái → "Đang soạn" và gộp mã NV vào nvSoan cho từng phiếu */
  const handleConfirmGiao = async () => {
    if (!nhanVienInfo) return;

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const maNV = nhanVienInfo.ma_nhan_vien;

      await Promise.all(
        scannedList.map((item) => {
          const existingCodes = getExistingNvSoanCodes(item);
          const mergedNvSoan = Array.from(new Set([...existingCodes, maNV]));

          return nhanSuSoanService.updateNhanSuSoan(item._id, {
            trangThai: "Đang soạn",
            tgNhanPhieu: now,
            nvSoan: mergedNvSoan,
          });
        }),
      );

      alert(
        `Đã giao ${scannedList.length} phiếu cho ${nhanVienInfo.ten_nhan_vien || maNhanVien}.`,
      );
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error("Lỗi giao phiếu:", err);
      alert("Giao phiếu thất bại. Vui lòng thử lại.");
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
            {step === 1 ? "Scan Giao Phiếu" : "Xác nhận nhân viên giao"}
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
              {scanError && <p className="text-xs text-red-600">{scanError}</p>}

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
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Giao Phiếu
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Body — bước xác nhận nhân viên */}
            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Chuẩn bị giao{" "}
                <b className="text-slate-800">{scannedList.length}</b> phiếu.
                Nhập mã nhân viên nhận giao để xác nhận.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">
                  Mã nhân viên giao
                </label>
                <div className="flex gap-2">
                  <input
                    ref={nvInputRef}
                    type="text"
                    value={maNhanVien}
                    onChange={(e) => {
                      setMaNhanVien(e.target.value);
                      setNhanVienInfo(null);
                      setNvError("");
                    }}
                    onKeyDown={handleMaNhanVienKeyDown}
                    disabled={lookingUpNV || submitting}
                    placeholder="VD: NV0123 — Enter để tra cứu, Enter lần nữa để xác nhận"
                    className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                  <button
                    onClick={handleLookupNhanVien}
                    disabled={!maNhanVien.trim() || lookingUpNV}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {lookingUpNV ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <UserCheck size={16} />
                    )}
                    Tra cứu
                  </button>
                </div>
                {nvError && <p className="text-xs text-red-600">{nvError}</p>}
                {nhanVienInfo && !nvError && (
                  <p className="text-[11px] text-emerald-600">
                    Đã tìm thấy nhân viên — nhấn Enter lần nữa để hoàn tất.
                  </p>
                )}
              </div>

              {nhanVienInfo && (
                <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
                  <CheckCircle2
                    size={20}
                    className="flex-shrink-0 text-emerald-600"
                  />
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-emerald-800">
                      {nhanVienInfo.ten_nhan_vien || nhanVienInfo.ma_nhan_vien}
                    </div>
                    <div className="truncate text-xs text-emerald-700">
                      Mã: {nhanVienInfo.ma_nhan_vien}
                      {nhanVienInfo.bo_phan ? ` — ${nhanVienInfo.bo_phan}` : ""}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer — bước xác nhận nhân viên */}
            <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                <ArrowLeft size={16} />
                Quay lại
              </button>
              <button
                onClick={handleConfirmGiao}
                disabled={!nhanVienInfo || submitting}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Đang xác nhận..." : "Xác nhận giao"}
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
        className="flex items-center gap-2 rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 hover:shadow-md active:scale-[0.98]"
      >
        <ScanLine size={16} className="text-orange-50" />
        Scan Giao Phiếu
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(modal, document.body)}
    </>
  );
};

export default ScanGiaoPhieu;
