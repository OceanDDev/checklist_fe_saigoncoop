/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/ScanHoanThanh.jsx
import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
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

/** Lấy danh sách mã NV soạn hiện có của 1 phiếu, dùng để so sánh giữa các phiếu */
const getNvSoanCodes = (item) => {
  const list =
    (Array.isArray(item.nvSoan) && item.nvSoan.length > 0 && item.nvSoan) ||
    (Array.isArray(item.nvSoanChiTiet) &&
      item.nvSoanChiTiet.map((nv) => nv.ma_nhan_vien || nv)) ||
    [];
  return [...list].map(String).sort();
};

/** So sánh NV soạn giữa 2 phiếu — nếu 1 trong 2 chưa có NV soạn thì không tính
 *  là xung đột (giống quy tắc trong GopPhieu). */
const sameNvSoan = (a, b) => {
  const listA = getNvSoanCodes(a);
  const listB = getNvSoanCodes(b);
  if (listA.length === 0 || listB.length === 0) return true;
  if (listA.length !== listB.length) return false;
  return listA.every((code, idx) => code === listB[idx]);
};

/** Phiếu có mã bắt đầu bằng "TO" được phép bỏ qua bước kiểm tra chéo
 *  (cùng mã NXĐ / cùng NV soạn) — nhưng vẫn cần người dùng xác nhận (confirm),
 *  giống quy tắc trong GopPhieu. */
const isPhieuTO = (soDonHang) =>
  (soDonHang || "").toString().trim().toUpperCase().startsWith("TO");

const ScanHoanThanh = forwardRef(({ onSuccess }, ref) => {
  const inputRef = useRef(null);
  const nvInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: scan list + nhập kiện/dòng, 2: confirm nhân viên

  // --- Bước 1: quét phiếu ---
  const [scanValue, setScanValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  // [{ _id, soDonHang, maNXD, noiXuatDen, trangThai, kien, dong }]
  const [scannedList, setScannedList] = useState([]);

  // --- Bước 2: xác nhận nhân viên KC ---
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

  // Tự động focus lại ô mã NV KC ở bước 2, mỗi khi mở modal, quay lại bước 2,
  // hoặc vừa tra cứu/xác nhận xong — giúp thao tác "Enter tra cứu -> Enter xác nhận"
  // chạy liên tục bằng bàn phím/máy quét mà không cần bấm chuột.
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

  const handleOpen = (initialItems = []) => {
    resetAll();

    if (Array.isArray(initialItems) && initialItems.length > 0) {
      const seen = new Set();
      const uniqueItems = initialItems.filter((it) => {
        if (!it?._id || seen.has(it._id)) return false;
        seen.add(it._id);
        return true;
      });

      // ✅ Loại cả phiếu "Chưa soạn" (chưa giao soạn) lẫn phiếu "Hoàn thành"
      // (đã xong, không cần/không cho quét KC lại) ra khỏi danh sách hợp lệ.
      const validItems = uniqueItems.filter(
        (it) => it.trangThai !== "Chưa soạn" && it.trangThai !== "Hoàn thành",
      );
      const skippedCount = uniqueItems.length - validItems.length;

      // Kiểm tra chéo (cùng mã NXĐ, cùng NV soạn) giữa các phiếu chọn sẵn —
      // giống quy tắc trong GopPhieu. Phiếu "TO" được phép bỏ qua nếu xác nhận.
      const first = validItems[0];
      const conflict = first
        ? validItems
            .slice(1)
            .find(
              (cur) =>
                (cur.maNXD || "").toUpperCase() !==
                  (first.maNXD || "").toUpperCase() || !sameNvSoan(cur, first),
            )
        : null;

      let finalItems = validItems;
      if (conflict) {
        if (isPhieuTO(conflict.soDonHang)) {
          const confirmed = window.confirm(
            `Phiếu "${conflict.soDonHang}" khác mã NXĐ hoặc khác NV soạn so với các phiếu còn lại đã chọn. Vì là phiếu "TO" nên có thể bỏ qua kiểm tra chéo. Bạn có chắc chắn muốn tiếp tục không?`,
          );
          if (!confirmed) {
            finalItems = [];
            setScanError(
              `Đã huỷ chọn do phiếu "${conflict.soDonHang}" khác NXĐ/NV soạn.`,
            );
          }
        } else {
          finalItems = [];
          setScanError(
            `Phiếu "${conflict.soDonHang}" khác mã NXĐ hoặc khác NV soạn so với các phiếu còn lại đã chọn — không thể xử lý chung.`,
          );
        }
      }

      setScannedList(
        finalItems.map((matched) => ({
          ...matched,
          kien: matched.kien != null ? String(matched.kien) : "",
          dong: matched.dong != null ? String(matched.dong) : "",
        })),
      );
      if (skippedCount > 0 && !conflict) {
        setScanError(
          `Đã bỏ qua ${skippedCount} phiếu trong số phiếu đã chọn (đang "Chưa soạn" cần giao soạn trước, hoặc đã "Hoàn thành" rồi).`,
        );
      }
    }

    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    resetAll();
  };
  useImperativeHandle(ref, () => ({ open: handleOpen }));
  /** Nhập/quét số đơn hàng rồi Enter → tìm phiếu tương ứng và thêm vào danh sách
   *  kèm 2 ô nhập kiện/dòng (mặc định lấy theo dữ liệu phiếu nếu có).
   *  Ô trống + Enter => coi như đã quét xong, tự chuyển sang bước xác nhận NV. */
  const handleScanSubmit = async (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();

    const code = scanValue.trim();
    if (!code) {
      goToConfirmStep();
      return;
    }

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

      // Phiếu chưa được giao soạn thì chưa thể nhập KC
      if (matched.trangThai === "Chưa soạn") {
        setScanError(
          `Phiếu "${code}" đang ở trạng thái "Chưa soạn" — cần giao soạn trước khi nhập KC.`,
        );
        return;
      }

      // ✅ Phiếu đã "Hoàn thành" thì không cho quét/nhập KC lại nữa.
      if (matched.trangThai === "Hoàn thành") {
        setScanError(`Phiếu "${code}" đã ở trạng thái "Hoàn thành" rồi.`);
        return;
      }

      // Kiểm tra chéo (cùng mã NXĐ, cùng NV soạn) với các phiếu đã quét —
      // giống quy tắc trong GopPhieu. Phiếu "TO" được phép bỏ qua nếu xác nhận.
      if (scannedList.length > 0) {
        const first = scannedList[0];
        const nxdMismatch =
          (matched.maNXD || "").toUpperCase() !==
          (first.maNXD || "").toUpperCase();
        const nvMismatch = !sameNvSoan(matched, first);

        if (nxdMismatch || nvMismatch) {
          if (isPhieuTO(code)) {
            const lyDo = [
              nxdMismatch &&
                `khác mã NXĐ (${matched.maNXD || "—"} so với ${
                  first.maNXD || "—"
                })`,
              nvMismatch && "khác nhân viên soạn",
            ]
              .filter(Boolean)
              .join(" và ");
            const confirmed = window.confirm(
              `Phiếu "${code}" ${lyDo} so với các phiếu đã quét. Vì là phiếu "TO" nên có thể bỏ qua kiểm tra chéo. Bạn có chắc chắn muốn thêm phiếu này không?`,
            );
            if (!confirmed) {
              setScanError(`Đã huỷ thêm phiếu "${code}" do khác NXĐ/NV soạn.`);
              return;
            }
            // Đã xác nhận bỏ qua kiểm tra chéo -> tiếp tục thêm phiếu bên dưới
          } else if (nxdMismatch) {
            setScanError(
              `Phiếu "${code}" khác mã NXĐ (${matched.maNXD || "—"}) so với các phiếu đã quét (${first.maNXD || "—"}) — không thể xử lý chung.`,
            );
            return;
          } else {
            setScanError(
              `Phiếu "${code}" khác nhân viên soạn so với các phiếu đã quét — không thể xử lý chung.`,
            );
            return;
          }
        }
      }

      setScannedList((prev) => [
        {
          ...matched,
          kien: matched.kien != null ? String(matched.kien) : "",
          dong: matched.dong != null ? String(matched.dong) : "",
        },
        ...prev,
      ]);
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

  /** Kiểm tra 1 phiếu có đang nhập số kiện vượt quá 150% kiện dự kiến không */
  const isKienVuotNguong = (item) => {
    const duKien = Number(item.kien_du_kien) || 0;
    const nhap = Number(item.kien) || 0;
    if (duKien <= 0) return false; // không có kiện dự kiến -> không kiểm tra
    return nhap > duKien * 1.5;
  };

  /** Nếu phiếu đang vượt ngưỡng và CHƯA được xác nhận -> hỏi người dùng.
   *  Xác nhận (OK) -> đánh dấu đã xác nhận, trả về true.
   *  Huỷ (Cancel) -> trả về false, không đánh dấu (lần sau vẫn hỏi lại). */
  const confirmKienVuotNeuCan = (item) => {
    if (!isKienVuotNguong(item) || item.kienOverConfirmed) return true;

    const duKien = Number(item.kien_du_kien) || 0;
    const nhap = Number(item.kien) || 0;
    const confirmed = window.confirm(
      `Phiếu "${item.soDonHang}": bạn đang nhập ${nhap} kiện, vượt quá 150% so với kiện dự kiến (${duKien}). Bạn có chắc chắn số kiện này đúng không?`,
    );

    if (confirmed) {
      setScannedList((prev) =>
        prev.map((it) =>
          it._id === item._id ? { ...it, kienOverConfirmed: true } : it,
        ),
      );
    }
    return confirmed;
  };

  /** Cập nhật kiện/dòng nhập tay cho từng phiếu trong danh sách đã quét */
  const handleChangeScannedField = (id, field, value) => {
    // chỉ cho phép số
    const cleaned = value.replace(/[^0-9]/g, "");
    setScannedList((prev) =>
      prev.map((it) =>
        it._id === id
          ? {
              ...it,
              [field]: cleaned,
              // Sửa lại số kiện -> reset cờ đã xác nhận để kiểm tra lại từ đầu
              ...(field === "kien" ? { kienOverConfirmed: false } : {}),
            }
          : it,
      ),
    );
  };
  const isScannedListValid =
    scannedList.length > 0 &&
    scannedList.every((it) => it.kien !== "" && it.dong !== "");

  // Nếu TOÀN BỘ phiếu trong danh sách là phiếu "TO" thì được phép bỏ qua
  // hẳn bước xác nhận nhân viên KC (không cần nhập mã NV KC), giống GopPhieu.
  const groupIsTO =
    scannedList.length > 0 &&
    scannedList.every((it) => isPhieuTO(it.soDonHang));

  const goToConfirmStep = () => {
    if (scannedList.length === 0) {
      setScanError("Vui lòng quét ít nhất 1 phiếu.");
      return;
    }
    if (!isScannedListValid) {
      setScanError("Vui lòng nhập đủ số kiện và số dòng cho tất cả phiếu.");
      return;
    }

    for (const item of scannedList) {
      if (!confirmKienVuotNeuCan(item)) {
        setScanError(
          `Số kiện của phiếu "${item.soDonHang}" đang vượt quá kiện dự kiến — vui lòng kiểm tra lại hoặc xác nhận.`,
        );
        return;
      }
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

  /** Lấy danh sách mã NV KC hiện có của 1 phiếu (từ nvKC hoặc nvKCChiTiet đã populate) */
  const getExistingNvKCCodes = (item) => {
    if (Array.isArray(item.nvKC) && item.nvKC.length > 0) {
      return item.nvKC;
    }
    if (Array.isArray(item.nvKCChiTiet)) {
      return item.nvKCChiTiet.map((nv) => nv.ma_nhan_vien || nv);
    }
    return [];
  };

  /** Xác nhận: cập nhật trạng thái → "Hoàn thành", ghi nhận kiện/dòng đã nhập
   *  và gộp mã NV vào nvKC cho từng phiếu.
   *  skipNV = true: dùng cho nhóm phiếu "TO" bỏ qua hẳn bước xác nhận NV KC —
   *  không yêu cầu nhanVienInfo và không thêm mã NV KC nào vào phiếu. */
  const handleConfirmHoanThanh = async (skipNV = false) => {
    if (!skipNV && !nhanVienInfo) return;

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const maNV = skipNV ? null : nhanVienInfo.ma_nhan_vien;

      await Promise.all(
        scannedList.map((item) => {
          const existingCodes = getExistingNvKCCodes(item);
          const mergedNvKC = maNV
            ? Array.from(new Set([...existingCodes, maNV]))
            : existingCodes;

          return nhanSuSoanService.updateNhanSuSoan(item._id, {
            trangThai: "Hoàn thành",
            tgHoanThanh: now,
            kien: Number(item.kien),
            dong: Number(item.dong),
            nvKC: mergedNvKC,
          });
        }),
      );

      alert(
        skipNV
          ? `Đã hoàn thành ${scannedList.length} phiếu (phiếu "TO" — bỏ qua xác nhận NV KC).`
          : `Đã hoàn thành ${scannedList.length} phiếu bởi ${nhanVienInfo.ten_nhan_vien || maNhanVien}.`,
      );
      onSuccess?.();
      handleClose();
    } catch (err) {
      console.error("Lỗi nhập KC:", err);
      alert("Nhập KC thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  /** Bỏ qua hẳn bước xác nhận NV KC cho nhóm phiếu "TO" — vẫn cần confirm
   *  trước khi hoàn thành để tránh bấm/Enter nhầm. */
  const handleSkipNvKcAndConfirm = () => {
    if (!isScannedListValid || submitting) return;
    const confirmed = window.confirm(
      `Nhóm ${scannedList.length} phiếu này đều là phiếu "TO" nên có thể bỏ qua bước xác nhận nhân viên KC. Bạn có chắc chắn muốn hoàn thành mà không cần nhập mã NV KC không?`,
    );
    if (!confirmed) return;
    handleConfirmHoanThanh(true);
  };

  /** Enter trong ô mã NV KC: nếu chưa tra cứu (hoặc vừa đổi mã) → tra cứu.
   *  Nếu đã có kết quả tra cứu hợp lệ rồi → Enter tiếp theo xác nhận hoàn thành
   *  luôn, giúp thao tác nhanh kiểu "Enter Enter" khi vận hành bằng máy quét/bàn phím.
   *  Nếu ô đang trống và nhóm toàn phiếu "TO" → Enter sẽ hiện cảnh báo bỏ qua
   *  NV KC, Enter lần nữa trên hộp thoại là xác nhận — thao tác hoàn toàn bằng
   *  bàn phím, không cần chuột. */
  const handleMaNhanVienKeyDown = (e) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    if (lookingUpNV || submitting) return;

    if (!maNhanVien.trim() && groupIsTO) {
      handleSkipNvKcAndConfirm();
      return;
    }

    if (nhanVienInfo) {
      handleConfirmHoanThanh();
    } else {
      handleLookupNhanVien();
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={handleClose}
    >
      <div
        className="my-8 flex max-h-[calc(100vh-4rem)] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:my-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            {step === 1 ? "Scan Hoàn Thành" : "Xác nhận nhân viên KC"}
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

              <div className="max-h-80 space-y-1.5 overflow-y-auto">
                {scannedList.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Chưa có phiếu nào được quét.
                  </p>
                ) : (
                  scannedList.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="truncate text-sm font-medium text-slate-800">
                            {item.soDonHang}
                          </div>
                          <span
                            className={`whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-medium ${
                              TRANG_THAI_STYLE[item.trangThai] ||
                              TRANG_THAI_STYLE["Chưa soạn"]
                            }`}
                          >
                            {item.trangThai}
                          </span>
                        </div>
                        <div className="truncate text-xs text-slate-500">
                          {item.maNXD ? `${item.maNXD} — ` : ""}
                          {item.noiXuatDen || ""}
                        </div>
                      </div>

                      {/* Nhập số kiện / số dòng ngay tại dòng vừa quét */}
                      <div className="flex flex-shrink-0 items-center gap-1.5">
                        <div className="flex flex-col items-start">
                          <label className="text-[10px] font-medium text-slate-400">
                            Kiện
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={item.kien}
                            onChange={(e) =>
                              handleChangeScannedField(
                                item._id,
                                "kien",
                                e.target.value,
                              )
                            }
                            onBlur={() => confirmKienVuotNeuCan(item)} // 👈 mới — hỏi ngay khi rời ô Kiện
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                goToConfirmStep();
                              }
                            }}
                            placeholder="0"
                            className="h-8 w-14 rounded-md border border-slate-300 px-2 text-center text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                          />
                        </div>
                        <div className="flex flex-col items-start">
                          <label className="text-[10px] font-medium text-slate-400">
                            Dòng
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={item.dong}
                            onChange={(e) =>
                              handleChangeScannedField(
                                item._id,
                                "dong",
                                e.target.value,
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                goToConfirmStep();
                              }
                            }}
                            placeholder="0"
                            className="h-8 w-14 rounded-md border border-slate-300 px-2 text-center text-sm outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-100"
                          />
                        </div>
                        <button
                          onClick={() => handleRemoveScanned(item._id)}
                          className="ml-1 self-end rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
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
                  disabled={!isScannedListValid}
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Nhập KC
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Body — bước xác nhận nhân viên */}
            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Chuẩn bị hoàn thành{" "}
                <b className="text-slate-800">{scannedList.length}</b> phiếu.
                Nhập mã nhân viên KC để xác nhận.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">
                  Mã nhân viên KC
                </label>
                <div className="flex gap-2">
                  <input
                    ref={nvInputRef}
                    type="text"
                    autoFocus
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
                onClick={handleConfirmHoanThanh}
                disabled={!nhanVienInfo || submitting}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                {submitting ? "Đang xác nhận..." : "Xác nhận hoàn thành"}
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
        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
      >
        <ScanLine size={16} className="text-emerald-100" />
        Hoàn Thành
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(modal, document.body)}
    </>
  );
});
ScanHoanThanh.displayName = "ScanHoanThanh";
export default ScanHoanThanh;
