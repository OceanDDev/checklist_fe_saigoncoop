/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/gopphieu.jsx
import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Combine,
  X,
  Trash2,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  UserCheck,
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

/** Chỉ cho phép gộp các phiếu đang ở trạng thái "Đang soạn" */
const isDangSoan = (item) => item?.trangThai === "Đang soạn";

/** Phiếu có mã bắt đầu bằng "TO" được phép bỏ qua bước kiểm tra chéo
 *  (cùng mã NXĐ / cùng NV soạn) — nhưng vẫn cần người dùng xác nhận (confirm). */
const isPhieuTO = (soDonHang) =>
  (soDonHang || "").toString().trim().toUpperCase().startsWith("TO");

const sameNvSoan = (a, b) => {
  const listA = getNvSoanCodes(a);
  const listB = getNvSoanCodes(b);
  // Nếu 1 trong 2 phiếu chưa có NV soạn -> không tính là xung đột, vẫn cho gộp
  if (listA.length === 0 || listB.length === 0) return true;
  if (listA.length !== listB.length) return false;
  return listA.every((code, idx) => code === listB[idx]);
};

/** Lấy danh sách mã NV soạn "chuẩn" cho cả nhóm gộp: ưu tiên phiếu nào
 *  đã có sẵn NV soạn (vì sameNvSoan cho phép 1 phiếu chưa có NV soạn
 *  vẫn được gộp), để áp dụng đồng loạt cho toàn bộ phiếu trong nhóm. */
const resolveNvSoanForGroup = (list) => {
  for (const item of list) {
    const codes = getNvSoanCodes(item);
    if (codes.length > 0) return codes;
  }
  return [];
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

/** Sinh mã số phiếu gộp tự động: GOP-<maNXD>-<ddMMyy-HHmmss> */
const generateSoPhieuGop = (maNXD) => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = `${pad(now.getDate())}${pad(now.getMonth() + 1)}${String(
    now.getFullYear(),
  ).slice(-2)}`;
  const timeStr = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(
    now.getSeconds(),
  )}`;
  const nxd = (maNXD || "").toString().trim().toUpperCase();
  return `GOP-${nxd ? `${nxd}-` : ""}${dateStr}-${timeStr}`;
};

/** Dòng hiển thị 1 phiếu đã quét — tách riêng + memo để tránh re-render
 *  toàn bộ danh sách mỗi khi scanValue thay đổi (gõ từng ký tự). */
const ScannedItemRow = memo(function ScannedItemRow({ item, onRemove }) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <div className="truncate text-sm font-medium text-slate-800">
            {item.soDonHang}
          </div>
          <span
            className={`whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-medium ${
              TRANG_THAI_STYLE[item.trangThai] || TRANG_THAI_STYLE["Chưa soạn"]
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

      <button
        onClick={() => onRemove(item._id)}
        className="flex-shrink-0 rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
        title="Bỏ khỏi danh sách"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
});

/** Dòng chọn phiếu đại diện ở bước 2 — tách riêng + memo vì danh sách này
 *  re-render mỗi lần gõ Kiện/Dòng nếu để inline trong component cha. */
const DaiDienRow = memo(function DaiDienRow({
  item,
  isDaiDien,
  kienGop,
  dongGop,
  onSelect,
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 transition ${
        isDaiDien ? "border-blue-300 bg-blue-50" : "border-slate-200"
      }`}
    >
      <div className="flex min-w-0 items-center gap-2">
        <input
          type="radio"
          name="daiDien"
          checked={isDaiDien}
          onChange={() => onSelect(item._id)}
          className="flex-shrink-0"
        />
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-slate-800">
            {item.soDonHang}
          </div>
          <div className="truncate text-xs text-slate-500">
            Kiện/Dòng: {isDaiDien ? `${kienGop || 0}/${dongGop || 0}` : "0/0"}
          </div>
        </div>
      </div>
      {isDaiDien && (
        <span className="flex-shrink-0 whitespace-nowrap rounded-lg bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          Đại diện
        </span>
      )}
    </label>
  );
});

const GopPhieu = forwardRef(({ onSuccess }, ref) => {
  const inputRef = useRef(null);
  const nvInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: scan, 2: kiện/dòng + đại diện, 3: xác nhận NV KC

  // --- Bước 1: quét phiếu ---
  const [scanValue, setScanValue] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState("");
  const [scannedList, setScannedList] = useState([]);

  // --- Bước 2: kiện / dòng / đại diện ---
  const [soPhieuGop, setSoPhieuGop] = useState("");
  const [kienGop, setKienGop] = useState(""); // nhập 1 lần duy nhất
  const [dongGop, setDongGop] = useState(""); // nhập 1 lần duy nhất
  const [daiDienId, setDaiDienId] = useState(null); // phiếu đại diện nhận Kiện/Dòng

  // --- Bước 3: xác nhận nhân viên KC (giống ScanHoanThanh) ---
  const [maNhanVien, setMaNhanVien] = useState("");
  const [lookingUpNV, setLookingUpNV] = useState(false);
  const [nhanVienInfo, setNhanVienInfo] = useState(null);
  const [nvError, setNvError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open && step === 1 && !scanning) {
      const raf = requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      return () => cancelAnimationFrame(raf);
    }
  }, [open, step, scanning]);

  // Tự động focus lại ô mã NV KC ở bước 3, mỗi khi mở modal, quay lại bước 3,
  // hoặc vừa tra cứu/xác nhận xong — giúp thao tác "Enter tra cứu -> Enter xác nhận"
  // chạy liên tục bằng bàn phím/máy quét mà không cần bấm chuột.
  useEffect(() => {
    if (open && step === 3 && !lookingUpNV && !submitting) {
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

  const resetAll = useCallback(() => {
    setStep(1);
    setScanValue("");
    setScanError("");
    setScannedList([]);
    setSoPhieuGop("");
    setKienGop("");
    setDongGop("");
    setDaiDienId(null);
    setMaNhanVien("");
    setNhanVienInfo(null);
    setNvError("");
  }, []);

  const handleOpen = useCallback(
    (initialItems = []) => {
      resetAll();

      if (Array.isArray(initialItems) && initialItems.length > 0) {
        // Loại trùng theo _id (phòng khi bảng truyền dữ liệu trùng)
        const seen = new Set();
        const uniqueItems = initialItems.filter((it) => {
          if (!it?._id || seen.has(it._id)) return false;
          seen.add(it._id);
          return true;
        });

        // Chỉ cho phép gộp các phiếu đang ở trạng thái "Đang soạn"
        const notDangSoan = uniqueItems.find((it) => !isDangSoan(it));

        // Kiểm tra cùng mã NXĐ và cùng NV soạn giữa các phiếu chọn sẵn,
        // dùng đúng quy tắc như khi quét từng phiếu ở bước 1.
        const first = uniqueItems[0];
        const conflict = uniqueItems
          .slice(1)
          .find(
            (cur) =>
              (cur.maNXD || "").toUpperCase() !==
                (first.maNXD || "").toUpperCase() || !sameNvSoan(cur, first),
          );

        if (notDangSoan) {
          setScanError(
            `Phiếu "${notDangSoan.soDonHang}" đang ở trạng thái "${notDangSoan.trangThai}" — chỉ được gộp các phiếu đang ở trạng thái "Đang soạn".`,
          );
        } else if (conflict) {
          if (isPhieuTO(conflict.soDonHang)) {
            const confirmed = window.confirm(
              `Phiếu "${conflict.soDonHang}" khác mã NXĐ hoặc khác NV soạn so với các phiếu còn lại đã chọn. Vì là phiếu "TO" nên có thể bỏ qua kiểm tra chéo. Bạn có chắc chắn muốn gộp các phiếu này không?`,
            );
            if (confirmed) {
              setScannedList(uniqueItems);
            } else {
              setScanError(
                `Đã huỷ chọn do phiếu "${conflict.soDonHang}" khác NXĐ/NV soạn.`,
              );
            }
          } else {
            setScanError(
              `Phiếu "${conflict.soDonHang}" khác mã NXĐ hoặc khác NV soạn so với các phiếu còn lại đã chọn — không thể gộp chung.`,
            );
          }
        } else {
          setScannedList(uniqueItems);
        }
      }

      setOpen(true);
    },
    [resetAll],
  );
  const handleClose = useCallback(() => {
    setOpen(false);
    resetAll();
  }, [resetAll]);

  useImperativeHandle(ref, () => ({ open: handleOpen }), [handleOpen]);

  const goToKienDongStep = useCallback(() => {
    if (scannedList.length < 2) {
      setScanError("Vui lòng quét ít nhất 2 phiếu để gộp.");
      return;
    }

    // Bắt buộc: trong nhóm phải có ít nhất 1 phiếu đã có NV soạn,
    // không cho gộp nếu toàn bộ đều "chưa có NV soạn".
    if (resolveNvSoanForGroup(scannedList).length === 0) {
      setScanError(
        "Cần ít nhất 1 phiếu trong danh sách đã có nhân viên soạn thì mới được gộp.",
      );
      return;
    }

    setSoPhieuGop(generateSoPhieuGop(scannedList[0]?.maNXD));
    setDaiDienId(scannedList[0]._id); // mặc định phiếu vừa quét gần nhất làm đại diện
    setKienGop("");
    setDongGop("");
    setStep(2);
  }, [scannedList]);

  const handleScanSubmit = useCallback(
    async (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();

      const code = scanValue.trim();

      // Ô đang trống + Enter => coi như đã quét xong, tự chuyển sang bước
      // Kiện/Dòng (chỉ khi đã đủ tối thiểu 2 phiếu), để có thể thao tác
      // hoàn toàn bằng bàn phím: quét ... quét ... Enter (trống) để tiếp tục.
      if (!code) {
        if (scannedList.length >= 2) {
          goToKienDongStep();
        } else {
          setScanError("Vui lòng quét ít nhất 2 phiếu để gộp.");
        }
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
          list.find(
            (it) => it.soDonHang?.toUpperCase() === code.toUpperCase(),
          ) || list[0];

        if (!matched) {
          setScanError(`Không tìm thấy phiếu "${code}".`);
          return;
        }

        // Chỉ cho phép gộp phiếu đang ở trạng thái "Đang soạn"
        if (!isDangSoan(matched)) {
          setScanError(
            `Phiếu "${code}" đang ở trạng thái "${matched.trangThai}" — chỉ được gộp các phiếu đang ở trạng thái "Đang soạn".`,
          );
          return;
        }

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
                `Phiếu "${code}" ${lyDo} so với các phiếu đã quét. Vì là phiếu "TO" nên có thể bỏ qua kiểm tra chéo. Bạn có chắc chắn muốn gộp phiếu này không?`,
              );
              if (!confirmed) {
                setScanError(
                  `Đã huỷ thêm phiếu "${code}" do khác NXĐ/NV soạn.`,
                );
                return;
              }
              // Đã xác nhận bỏ qua kiểm tra chéo -> tiếp tục thêm phiếu bên dưới
            } else if (nxdMismatch) {
              setScanError(
                `Phiếu "${code}" khác mã NXĐ (${matched.maNXD || "—"}) so với các phiếu đã quét (${first.maNXD || "—"}) — không thể gộp.`,
              );
              return;
            } else {
              setScanError(
                `Phiếu "${code}" khác nhân viên soạn so với các phiếu đã quét — không thể gộp.`,
              );
              return;
            }
          }
        }

        setScannedList((prev) => [matched, ...prev]);
        setScanValue("");
      } catch (err) {
        console.error("Lỗi tìm phiếu:", err);
        setScanError("Có lỗi khi tìm phiếu, thử lại.");
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setScanning(false);
      }
    },
    [scanValue, scannedList, goToKienDongStep],
  );
  const handleRemoveScanned = useCallback((id) => {
    setScannedList((prev) => prev.filter((it) => it._id !== id));
    setDaiDienId((prev) => (prev === id ? null : prev));
  }, []);

  const isKienDongValid = useMemo(
    () =>
      !!soPhieuGop.trim() &&
      kienGop !== "" &&
      dongGop !== "" &&
      !!daiDienId &&
      scannedList.some((it) => it._id === daiDienId),
    [soPhieuGop, kienGop, dongGop, daiDienId, scannedList],
  );

  // Nếu TOÀN BỘ phiếu trong nhóm là phiếu "TO" thì được phép bỏ qua
  // hẳn bước xác nhận nhân viên KC (không cần nhập mã NV KC).
  const groupIsTO = useMemo(
    () =>
      scannedList.length > 0 &&
      scannedList.every((it) => isPhieuTO(it.soDonHang)),
    [scannedList],
  );

  const goToNvKcStep = useCallback(() => {
    if (!isKienDongValid) return;
    setMaNhanVien("");
    setNhanVienInfo(null);
    setNvError("");
    setStep(3);
  }, [isKienDongValid]);

  /** Enter ở bước Kiện/Dòng (số phiếu gộp, kiện, dòng) -> tiếp tục ngay
   *  sang bước 3, không cần bấm nút "Tiếp tục". */
  const handleKienDongKeyDown = useCallback(
    (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      goToNvKcStep();
    },
    [goToNvKcStep],
  );

  /** Tra cứu nhân viên theo mã, dùng nhanVienService có sẵn (giống ScanHoanThanh) */
  const handleLookupNhanVien = useCallback(async () => {
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
      // Focus lại ô input được xử lý bằng useEffect ở trên.
    }
  }, [maNhanVien]);

  /** Xác nhận gộp: phiếu đại diện nhận Kiện/Dòng vừa nhập, các phiếu còn lại = 0/0,
   *  gộp mã NV KC vào từng phiếu, đồng bộ NV soạn cho cả nhóm,
   *  dùng chung 1 mốc tgHoanThanh, và chuyển thành "Hoàn thành".
   *  skipNV = true: dùng cho nhóm phiếu "TO" bỏ qua hẳn bước xác nhận NV KC —
   *  không yêu cầu nhanVienInfo và không thêm mã NV KC nào vào phiếu. */
  const handleConfirmGop = useCallback(
    async (skipNV = false) => {
      if (!isKienDongValid) return;
      if (!skipNV && !nhanVienInfo) return;

      setSubmitting(true);
      try {
        const now = new Date().toISOString(); // mốc tgHoanThanh CHUNG cho cả nhóm
        const maNV = skipNV ? null : nhanVienInfo.ma_nhan_vien;

        // NV soạn chuẩn cho cả nhóm — nếu có phiếu nào đã có sẵn NV soạn thì
        // dùng danh sách đó áp cho toàn bộ phiếu trong nhóm gộp.
        const nvSoanGop = resolveNvSoanForGroup(scannedList);

        await Promise.all(
          scannedList.map((item) => {
            const isDaiDien = item._id === daiDienId;
            const existingCodes = getExistingNvKCCodes(item);
            const mergedNvKC = maNV
              ? Array.from(new Set([...existingCodes, maNV]))
              : existingCodes;

            const payload = {
              soPhieuGop: soPhieuGop.trim(),
              kien: isDaiDien ? Number(kienGop) : 0,
              dong: isDaiDien ? Number(dongGop) : 0,
              trangThai: "Hoàn thành",
              tgHoanThanh: now,
              nvKC: mergedNvKC,
              // Đồng bộ NV soạn cho cả nhóm nếu xác định được; nếu cả nhóm
              // đều chưa có NV soạn thì giữ nguyên giá trị hiện tại của phiếu.
              ...(nvSoanGop.length > 0 ? { nvSoan: nvSoanGop } : {}),
            };
            return nhanSuSoanService.updateNhanSuSoan(item._id, payload);
          }),
        );

        alert(
          skipNV
            ? `Đã gộp ${scannedList.length} phiếu thành số phiếu gộp "${soPhieuGop.trim()}" (phiếu "TO" — bỏ qua xác nhận NV KC).`
            : `Đã gộp ${scannedList.length} phiếu thành số phiếu gộp "${soPhieuGop.trim()}" bởi ${nhanVienInfo.ten_nhan_vien || maNhanVien}.`,
        );
        onSuccess?.();
        handleClose();
      } catch (err) {
        console.error("Lỗi gộp phiếu:", err);
        alert("Gộp phiếu thất bại. Vui lòng thử lại.");
      } finally {
        setSubmitting(false);
      }
    },
    [
      isKienDongValid,
      nhanVienInfo,
      scannedList,
      daiDienId,
      soPhieuGop,
      kienGop,
      dongGop,
      maNhanVien,
      onSuccess,
      handleClose,
    ],
  );

  /** Bỏ qua hẳn bước xác nhận NV KC cho nhóm phiếu "TO" — vẫn cần confirm
   *  trước khi gộp để tránh bấm nhầm. */
  const handleSkipNvKcAndConfirm = useCallback(() => {
    if (!isKienDongValid || submitting) return;
    const confirmed = window.confirm(
      `Nhóm ${scannedList.length} phiếu này đều là phiếu "TO" nên có thể bỏ qua bước xác nhận nhân viên KC. Bạn có chắc chắn muốn gộp mà không cần nhập mã NV KC không?`,
    );
    if (!confirmed) return;
    handleConfirmGop(true);
  }, [isKienDongValid, submitting, scannedList, handleConfirmGop]);

  /** Enter trong ô mã NV KC: nếu chưa tra cứu (hoặc vừa đổi mã) → tra cứu.
   *  Nếu đã có kết quả tra cứu hợp lệ rồi → Enter tiếp theo xác nhận gộp luôn,
   *  giúp thao tác nhanh kiểu "Enter Enter" khi vận hành bằng máy quét/bàn phím. */
  const handleMaNhanVienKeyDown = useCallback(
    (e) => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (lookingUpNV || submitting) return;

      // Ô mã NV KC đang trống + nhóm toàn phiếu "TO" -> Enter sẽ hiện cảnh
      // báo xác nhận bỏ qua NV KC (Enter lần nữa trên hộp thoại là xác nhận),
      // để thao tác hoàn toàn bằng bàn phím, không cần chuột.
      if (!maNhanVien.trim() && groupIsTO) {
        handleSkipNvKcAndConfirm();
        return;
      }

      if (nhanVienInfo) {
        handleConfirmGop();
      } else {
        handleLookupNhanVien();
      }
    },
    [
      lookingUpNV,
      submitting,
      maNhanVien,
      groupIsTO,
      nhanVienInfo,
      handleSkipNvKcAndConfirm,
      handleConfirmGop,
      handleLookupNhanVien,
    ],
  );

  const handleKienChange = useCallback(
    (e) => setKienGop(e.target.value.replace(/[^0-9]/g, "")),
    [],
  );
  const handleDongChange = useCallback(
    (e) => setDongGop(e.target.value.replace(/[^0-9]/g, "")),
    [],
  );
  const handleScanValueChange = useCallback((e) => {
    setScanValue(e.target.value);
    setScanError("");
  }, []);
  const handleMaNhanVienChange = useCallback((e) => {
    setMaNhanVien(e.target.value);
    setNhanVienInfo(null);
    setNvError("");
  }, []);

  if (!open) {
    return (
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-md transition-all hover:bg-indigo-700 hover:shadow-lg focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
      >
        <Combine size={16} className="text-indigo-100" />
        Gộp Phiếu
      </button>
    );
  }

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
            {step === 1 && "Gộp Phiếu"}
            {step === 2 && "Nhập Kiện / Dòng"}
            {step === 3 && "Xác nhận nhân viên KC"}
          </h2>
          <button
            onClick={handleClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {step === 1 && (
          <>
            {/* Body — bước quét */}
            <div className="space-y-3 overflow-y-auto px-5 py-4">
              <input
                ref={inputRef}
                type="text"
                autoFocus
                value={scanValue}
                onChange={handleScanValueChange}
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

              <div className="max-h-80 space-y-1.5 overflow-y-auto">
                {scannedList.length === 0 ? (
                  <p className="py-6 text-center text-sm text-slate-400">
                    Chưa có phiếu nào được quét. Cần ít nhất 2 phiếu cùng trạng
                    thái &quot;Đang soạn&quot;, cùng mã NXĐ và cùng NV soạn để
                    gộp.
                  </p>
                ) : (
                  scannedList.map((item) => (
                    <ScannedItemRow
                      key={item._id}
                      item={item}
                      onRemove={handleRemoveScanned}
                    />
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
                  onClick={goToKienDongStep}
                  disabled={scannedList.length < 2}
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Tiếp tục
                </button>
              </div>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            {/* Body — bước kiện/dòng + đại diện */}
            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Chuẩn bị gộp{" "}
                <b className="text-slate-800">{scannedList.length}</b> phiếu.
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">
                  Số phiếu gộp
                </label>
                <input
                  type="text"
                  autoFocus
                  value={soPhieuGop}
                  onChange={(e) => setSoPhieuGop(e.target.value)}
                  onKeyDown={handleKienDongKeyDown}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <p className="text-[11px] text-slate-400">
                  Mã được sinh tự động, bạn có thể chỉnh lại nếu cần.
                </p>
              </div>

              {/* Kiện / Dòng — nhập 1 lần duy nhất cho cả nhóm */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">
                    Kiện
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={kienGop}
                    onChange={handleKienChange}
                    onKeyDown={handleKienDongKeyDown}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-600">
                    Dòng
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={dongGop}
                    onChange={handleDongChange}
                    onKeyDown={handleKienDongKeyDown}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-slate-400">
                Chọn 1 phiếu đại diện bên dưới để nhận số Kiện/Dòng này — các
                phiếu còn lại sẽ tự động là 0/0.
              </p>

              <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                <span className="text-xs font-medium text-slate-500">
                  Trạng thái sau khi gộp:
                </span>
                <span
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${TRANG_THAI_STYLE["Hoàn thành"]}`}
                >
                  Hoàn thành
                </span>
              </div>

              <div className="max-h-56 space-y-1.5 overflow-y-auto">
                {scannedList.map((item) => (
                  <DaiDienRow
                    key={item._id}
                    item={item}
                    isDaiDien={item._id === daiDienId}
                    kienGop={kienGop}
                    dongGop={dongGop}
                    onSelect={setDaiDienId}
                  />
                ))}
              </div>
            </div>

            {/* Footer — bước kiện/dòng */}
            <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
              <button
                onClick={() => setStep(1)}
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                <ArrowLeft size={16} />
                Quay lại
              </button>
              <button
                onClick={goToNvKcStep}
                disabled={!isKienDongValid}
                className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Tiếp tục
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            {/* Body — bước xác nhận nhân viên KC (giống ScanHoanThanh) */}
            <div className="space-y-4 overflow-y-auto px-5 py-4">
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Chuẩn bị gộp và hoàn thành{" "}
                <b className="text-slate-800">{scannedList.length}</b> phiếu.
                Nhập mã nhân viên KC để xác nhận.
                {groupIsTO && (
                  <>
                    {" "}
                    Nhóm phiếu này đều là phiếu &quot;TO&quot; nên bạn cũng có
                    thể bấm <b>&quot;Bỏ qua NV KC&quot;</b> bên dưới để gộp ngay
                    mà không cần nhập mã.
                  </>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">
                  Mã nhân viên KC
                </label>
                <div className="flex gap-2">
                  <input
                    ref={nvInputRef}
                    type="text"
                    value={maNhanVien}
                    onChange={handleMaNhanVienChange}
                    onKeyDown={handleMaNhanVienKeyDown}
                    disabled={lookingUpNV || submitting}
                    placeholder={
                      groupIsTO
                        ? "VD: NV0123 — hoặc để trống, nhấn Enter để bỏ qua NV KC (cảnh báo xác nhận), Enter lần nữa để hoàn tất"
                        : "VD: NV0123 — Enter để tra cứu, Enter lần nữa để xác nhận"
                    }
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

              <p className="text-[11px] text-slate-400">
                Mã NV KC này sẽ được gộp vào <b>tất cả</b> {scannedList.length}{" "}
                phiếu, và thời gian hoàn thành sẽ giống nhau cho cả nhóm.
              </p>
            </div>

            {/* Footer — bước xác nhận nhân viên KC */}
            <div className="flex flex-shrink-0 items-center justify-between gap-2 border-t border-slate-100 px-5 py-4">
              <button
                onClick={() => setStep(2)}
                className="flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
              >
                <ArrowLeft size={16} />
                Quay lại
              </button>
              <div className="flex gap-2">
                {groupIsTO && (
                  <button
                    onClick={handleSkipNvKcAndConfirm}
                    disabled={submitting}
                    title='Nhóm phiếu "TO" có thể gộp mà không cần xác nhận NV KC'
                    className="flex items-center gap-2 rounded-lg border border-slate-300 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Bỏ qua NV KC
                  </button>
                )}
                <button
                  onClick={() => handleConfirmGop()}
                  disabled={!nhanVienInfo || submitting}
                  className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={16} />
                  )}
                  {submitting ? "Đang gộp..." : "Xác nhận gộp"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined"
    ? createPortal(modal, document.body)
    : null;
});
GopPhieu.displayName = "GopPhieu";
export default memo(GopPhieu);
