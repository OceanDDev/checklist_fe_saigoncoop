/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  Warehouse,
  FileCheck2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { nhapHangService } from "@/services/nhaphang/nhaphang.service";

// 3 kho cố định
const KHO_LIST = [
  { kho: 810, label: "Kho 810" },
  { kho: 8101, label: "Kho 8101" },
  { kho: 8104, label: "Kho 8104" },
];

const PAGE_SIZE = 20;

// Trạng thái thực tế trong file Excel Let (không phải free-text)
const TRANG_THAI_OPTIONS = [
  "Chờ lệnh châm hàng",
  "Sẵn sàng châm hàng",
  "Hoàn thành",
];

// 4 cột ngày giờ dùng filter khoảng "Từ ngày - Đến ngày" (chỉ quan tâm
// ngày, bỏ qua giờ). Mỗi key ở đây sẽ tương ứng 2 field filter thực tế:
// `${key}_from` và `${key}_to`, gửi lên BE để match theo khoảng ngày.
const DATE_RANGE_KEYS = [
  "ngay_nhan_let",
  "ngay_gio_tao_let",
  "ngay_gio_hoan_thanh",
  "ngay_import",
];

// Cột hiển thị của bảng "Let" — không có Tổng SL, không có Ngày nhập kho (khác bảng Nhập)
const COLUMNS = [
  { key: "sku", label: "SKU" },
  { key: "name", label: "Tên SP" },
  { key: "lpn", label: "LPN" },
  { key: "vi_tri", label: "Vị trí" },
  { key: "kien", label: "Kiện" },
  { key: "kho", label: "Kho" },
  { key: "trang_thai", label: "Trạng thái" },
  { key: "nhan_vien_let", label: "NV Châm hàng" },
  { key: "ngay_nhan_let", label: "Ngày giờ nhận phiếu châm" },
  { key: "ngay_gio_tao_let", label: "Ngày giờ tạo" },
  { key: "ngay_gio_hoan_thanh", label: "Ngày giờ hoàn thành" },
  { key: "ngay_import", label: "Ngày import" },
];
const mapRow = (row, kho) => ({
  sku: String(row["Mã Sản Phẩm"] ?? "").trim(),
  name: String(row["Tên Sản Phẩm"] ?? "").trim(),
  vi_tri: String(row["Vị trí châm"] ?? "").trim(),
  kien: Number(row["Số Kiện"] ?? 0),
  kho: Number(kho),
  lpn: String(row["LPN"] ?? "").trim(),
  trang_thai: String(row["Trạng thái"] ?? "").trim(),
  loai_hinh: "Let",
  nhan_vien_let: String(row["Nhân viên châm hàng"] ?? "").trim(),
  ngay_nhan_let: excelSerialToUTCDate(row["Ngày giờ nhận phiếu châm"]),
  ngay_gio_tao_let: excelSerialToUTCDate(row["Ngày Giờ Tạo"]),
  ngay_gio_hoan_thanh: excelSerialToUTCDate(row["Ngày giờ hoàn thành"]),
});

// parse thủ công theo format "dd/MM/yyyy HH:mm[:ss]" hoặc "dd/MM/yyyy",
// tự dựng bằng Date.UTC -> không lệ thuộc múi giờ trình duyệt.
const parseDateTime = (value) => {
  if (!value) return undefined;
  const str = String(value).trim();
  const m = str.match(
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/,
  );
  if (m) {
    const [, d, mo, y, h = "0", mi = "0", s = "0"] = m;
    const date = new Date(
      Date.UTC(Number(y), Number(mo) - 1, Number(d), Number(h), Number(mi), Number(s)),
    );
    return isNaN(date.getTime()) ? undefined : date;
  }
  // Không khớp format quen thuộc -> thử parse thường (có thể sai lệch
  // timezone nếu trình duyệt không phải UTC, nhưng đây là fallback cuối).
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? undefined : fallback;
};
// Hiển thị đúng số liệu gốc từ Excel — dữ liệu được lưu bằng các trường
// UTC (do xlsx parse "22:07:01 1/9/2026" -> Date có getUTCHours()=22,
// getUTCDate()=1, KHÔNG phải giờ VN thật) và bộ lọc BE cũng so khớp theo
// UTC. Nếu format bằng toLocaleString mặc định, trình duyệt sẽ cộng thêm
// lệch múi giờ local (+7) khiến hiển thị nhảy sang ngày/giờ khác so với
// Excel gốc và khác với ngày đang lọc -> PHẢI ép timeZone: "UTC" để hiển
// thị khớp chính xác với dữ liệu Excel và với bộ lọc.
// CHỈ áp dụng cho 3 cột lấy từ Excel (ngay_nhan_let, ngay_gio_tao_let,
// ngay_gio_hoan_thanh) — KHÔNG áp dụng cho ngay_import (do BE tự set
// `new Date()` là timestamp UTC thật, cần convert đúng giờ VN local).
const formatDateTimeUTC = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
};

// Dùng cho ngay_import — timestamp UTC thật (server tự set `new Date()`),
// convert đúng theo giờ Việt Nam (ép cứng Asia/Ho_Chi_Minh, không phụ
// thuộc múi giờ máy người dùng đang mở trình duyệt).
const formatDateTimeVN = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
};

const filterInputCls =
  "w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal text-slate-700 outline-none focus:border-amber-400";

/** Nút lọc theo khoảng ngày (Từ ngày - Đến ngày), chỉ quan tâm ngày, bỏ
 *  qua giờ. Popup được đẩy ra document.body qua createPortal + position:
 *  fixed để không bị bảng (overflow-auto/sticky header) che/cắt mất. */
const DateRangeFilter = ({ startValue, endValue, onChange, onClear }) => {
  const [range, setRange] = useState([
    {
      startDate: startValue ? new Date(startValue) : null,
      endDate: endValue ? new Date(endValue) : null,
      key: "selection",
    },
  ]);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const wrapRef = useRef(null);
  const popupRef = useRef(null);

  useEffect(() => {
    setRange([
      {
        startDate: startValue ? new Date(startValue) : null,
        endDate: endValue ? new Date(endValue) : null,
        key: "selection",
      },
    ]);
  }, [startValue, endValue]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      const clickedInput = wrapRef.current?.contains(e.target);
      const clickedPopup = popupRef.current?.contains(e.target);
      if (!clickedInput && !clickedPopup) setShow(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!show) return;
    const close = () => setShow(false);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [show]);

  const openPopup = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (rect) {
      const popupWidth = 300;
      let left = rect.right - popupWidth;
      if (left < 8) left = 8;
      const maxLeft = window.innerWidth - popupWidth - 8;
      if (left > maxLeft) left = maxLeft;
      setPos({ top: rect.bottom + 6, left });
    }
    setShow((v) => !v);
  };

  const handleRangeChange = (item) => {
    const { startDate, endDate } = item.selection;
    setRange([item.selection]);
    onChange(
      startDate ? dayjs(startDate).format("YYYY-MM-DD") : "",
      endDate ? dayjs(endDate).format("YYYY-MM-DD") : "",
    );
  };

  const handleClear = () => {
    setRange([{ startDate: null, endDate: null, key: "selection" }]);
    onClear();
    setShow(false);
  };

  const hasValue = range[0].startDate && range[0].endDate;

  const popup = show && (
    <div
      ref={popupRef}
      style={{ position: "fixed", top: pos.top, left: pos.left, zIndex: 9999 }}
      className="overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-200"
    >
      <DateRange
        ranges={range}
        onChange={handleRangeChange}
        showDateDisplay={false}
        moveRangeOnFirstSelection={false}
        maxDate={new Date()}
      />
    </div>
  );

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        readOnly
        onClick={openPopup}
        value={
          hasValue
            ? `${dayjs(range[0].startDate).format("DD/MM/YY")} - ${dayjs(range[0].endDate).format("DD/MM/YY")}`
            : ""
        }
        placeholder="Lọc ngày..."
        title="Lọc ngày..."
        className={`${filterInputCls} cursor-pointer pr-5`}
      />
      {hasValue && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleClear();
          }}
          title="Xoá lọc ngày"
          className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500"
        >
          <X size={12} />
        </button>
      )}
      {show &&
        typeof document !== "undefined" &&
        createPortal(popup, document.body)}
    </div>
  );
};
const parseExcelFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        // Bỏ cellDates:true — xem giải thích ở excelSerialToUTCDate phía
        // trên. raw:true để nhận serial number thô (số) cho các ô date,
        // không để xlsx tự convert sang Date (phụ thuộc timezone máy).
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Không đọc được file"));
    reader.readAsArrayBuffer(file);
  });
const excelSerialToUTCDate = (serial) => {
  if (serial === undefined || serial === null || serial === "")
    return undefined;
  if (typeof serial !== "number") {
    // Fallback: nếu ô không phải serial number (ví dụ cell bị định dạng
    // text), thử parse như chuỗi thông thường.
    return parseDateTime(serial);
  }
  const comp = XLSX.SSF.parse_date_code(serial);
  if (!comp) return undefined;
  const date = new Date(
    Date.UTC(
      comp.y,
      comp.m - 1,
      comp.d,
      comp.H || 0,
      comp.M || 0,
      Math.round(comp.S || 0),
    ),
  );
  return isNaN(date.getTime()) ? undefined : date;
};
// ─────────────────────────────────────────────
// MODAL IMPORT — chọn 1, 2 hoặc cả 3 kho cùng lúc, mỗi kho 1 file riêng
// ─────────────────────────────────────────────
const ImportModal = ({ onClose, onImported }) => {
  const fileInputRefs = useRef({});
  const [slots, setSlots] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const setSlot = (kho, patch) =>
    setSlots((prev) => ({ ...prev, [kho]: { ...prev[kho], ...patch } }));

  const handlePickFile = (kho) => {
    fileInputRefs.current[kho]?.click();
  };

  const handleFileChange = async (kho, e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setSubmitError(null);
    setSlot(kho, { loading: true, error: null, fileName: file.name });

    try {
      const rows = await parseExcelFile(file);
      if (!rows.length) {
        setSlot(kho, {
          loading: false,
          error: "File không có dữ liệu",
          items: null,
        });
        return;
      }
      const items = rows
        .map((row) => mapRow(row, kho))
        .filter((item) => item.sku);
      setSlot(kho, { loading: false, items, fileName: file.name });
    } catch (err) {
      console.error("Lỗi đọc file Excel:", err);
      setSlot(kho, {
        loading: false,
        error: "Lỗi đọc file: " + err.message,
        items: null,
      });
    }
  };

  const handleRemoveSlot = (kho) => {
    setSlots((prev) => {
      const next = { ...prev };
      delete next[kho];
      return next;
    });
  };

  const selectedKhoList = KHO_LIST.filter(
    ({ kho }) => slots[kho]?.items?.length,
  );
  const totalItems = selectedKhoList.reduce(
    (sum, { kho }) => sum + slots[kho].items.length,
    0,
  );
  const anyLoading = Object.values(slots).some((s) => s?.loading);

  const handleConfirmImport = async () => {
    if (selectedKhoList.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const allItems = selectedKhoList.flatMap(({ kho }) => slots[kho].items);
      const res = await nhapHangService.importNhieu(allItems);
      const khoLabel = selectedKhoList.map(({ label }) => label).join(", ");
      onImported({
        success: true,
        message:
          res?.message ||
          `Import thành công ${allItems.length} dòng (${khoLabel})`,
      });
    } catch (err) {
      console.error("Lỗi import:", err);
      setSubmitError(err?.response?.data?.message || "Import thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            Import : Trạng thái châm hàng (5008)
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-auto p-5">
          <p className="text-sm text-slate-400">
            Chọn file Excel cho 1, 2 hoặc cả 3 kho — có thể import cùng lúc.
          </p>

          {KHO_LIST.map(({ kho, label }) => {
            const slot = slots[kho];
            return (
              <div
                key={kho}
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"
              >
                <input
                  ref={(el) => (fileInputRefs.current[kho] = el)}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFileChange(kho, e)}
                />

                <div className="flex w-28 shrink-0 items-center gap-2 text-sm font-medium text-slate-700">
                  <Warehouse size={16} className="text-amber-600" />
                  {label}
                </div>

                <div className="min-w-0 flex-1">
                  {slot?.loading ? (
                    <span className="flex items-center gap-1.5 text-sm text-slate-400">
                      <Loader2 size={14} className="animate-spin" /> Đang đọc
                      file...
                    </span>
                  ) : slot?.error ? (
                    <span className="flex items-center gap-1.5 text-sm text-red-600">
                      <XCircle size={14} /> {slot.error}
                    </span>
                  ) : slot?.items ? (
                    <span className="flex items-center gap-1.5 truncate text-sm text-emerald-700">
                      <FileCheck2 size={14} className="shrink-0" />
                      <span className="truncate">{slot.fileName}</span>
                      <span className="shrink-0 text-slate-400">
                        ({slot.items.length} dòng)
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">
                      Chưa chọn file
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handlePickFile(kho)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {slot?.items ? "Đổi file" : "Chọn file"}
                  </button>
                  {slot?.items && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRemoveSlot(kho)}
                      className="rounded-md border border-red-200 p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {submitError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <XCircle size={16} />
              {submitError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <span className="text-sm text-slate-500">
            {selectedKhoList.length > 0
              ? `${selectedKhoList.length}/3 kho — tổng ${totalItems} dòng`
              : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={
                selectedKhoList.length === 0 || submitting || anyLoading
              }
              onClick={handleConfirmImport}
              className="flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Xác nhận Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// TABLE + SEARCH + PAGINATION (loai_hinh cố định = "Let")
//
// Props:
// - initialFilters: object filter được "bơm" sẵn từ bên ngoài (vd: click
//   donut Let Hàng ở Dashboard -> { trang_thai, kho }). Optional.
// - initialFiltersToken: số tăng dần mỗi lần initialFilters thay đổi, dùng
//   để trigger áp lại filter dù giá trị object giống lần trước (áp dụng
//   đúng pattern đang dùng ở NhapHangForm).
// ─────────────────────────────────────────────
const LetForm = ({ initialFilters, initialFiltersToken }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [result, setResult] = useState(null);

  const [rows, setRows] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({});
  const debounceRef = useRef(null);

  const fetchTable = async (targetPage = page, activeFilters = filters) => {
    setLoadingTable(true);
    try {
      const params = { page: targetPage, limit: PAGE_SIZE, loai_hinh: "Let" };
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") params[key] = value;
      });
      const res = await nhapHangService.getDanhSach(params);
      setRows(res?.data || []);
      setTotalPages(res?.totalPages || 1);
      setTotal(res?.total || 0);
    } catch (err) {
      console.error("Lỗi getDanhSach:", err);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchTable(1, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Áp filter được bơm từ bên ngoài (Dashboard -> click donut Let Hàng).
  // Chạy lại mỗi khi token đổi (kể cả khi filter giống lần trước).
  useEffect(() => {
    if (!initialFiltersToken) return; // token mặc định undefined/0 -> bỏ qua lần mount đầu
    const next = { ...(initialFilters || {}) };
    setFilters(next);
    setPage(1);
    fetchTable(1, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiltersToken]);

  const handleFilterChange = (key, value, immediate = false) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (immediate) {
      fetchTable(1, next);
    } else {
      debounceRef.current = setTimeout(() => {
        fetchTable(1, next);
      }, 400);
    }
  };

  // Filter khoảng ngày (Từ ngày/Đến ngày) -> set cả 2 field cùng lúc rồi
  // fetch ngay lập tức (không debounce, vì chọn ngày xong là muốn xem luôn).
  const handleDateRangeChange = (baseKey, start, end) => {
    const next = {
      ...filters,
      [`${baseKey}_from`]: start,
      [`${baseKey}_to`]: end,
    };
    setFilters(next);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fetchTable(1, next);
  };

  const handleDateRangeClear = (baseKey) => {
    handleDateRangeChange(baseKey, "", "");
  };

  const goToPage = (p) => {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
    fetchTable(p, filters);
  };

  const handleImported = (res) => {
    setResult(res);
    setModalOpen(false);
    setPage(1);
    fetchTable(1, filters);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            setResult(null);
            setModalOpen(true);
          }}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
        >
          <UploadCloud size={16} />
          Import Excel
        </button>

        <span className="text-sm text-slate-500">
          {total > 0 && `${total} bản ghi`}
        </span>
      </div>

      {result && (
        <div
          className={[
            "mb-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm",
            result.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700",
          ].join(" ")}
        >
          {result.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {result.message}
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="max-h-[500px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="border-b border-slate-200 text-slate-500">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-3 py-2 font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-slate-200 bg-white">
                {COLUMNS.map((col) =>
                  col.key === "trang_thai" ? (
                    <th key={col.key} className="px-2 py-1.5 font-normal">
                      <select
                        value={filters[col.key] || ""}
                        onChange={(e) =>
                          handleFilterChange(col.key, e.target.value, true)
                        }
                        className={`${filterInputCls} bg-white`}
                      >
                        <option value="">Tất cả</option>
                        {TRANG_THAI_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </th>
                  ) : DATE_RANGE_KEYS.includes(col.key) ? (
                    <th key={col.key} className="px-2 py-1.5 font-normal">
                      <DateRangeFilter
                        startValue={filters[`${col.key}_from`]}
                        endValue={filters[`${col.key}_to`]}
                        onChange={(start, end) =>
                          handleDateRangeChange(col.key, start, end)
                        }
                        onClear={() => handleDateRangeClear(col.key)}
                      />
                    </th>
                  ) : (
                    <th key={col.key} className="px-2 py-1.5 font-normal">
                      <input
                        type="text"
                        value={filters[col.key] || ""}
                        onChange={(e) =>
                          handleFilterChange(col.key, e.target.value)
                        }
                        placeholder="Tìm..."
                        className={filterInputCls}
                      />
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    <Loader2 size={16} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r._id}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.lpn || "-"}</td>
                    <td className="px-3 py-2">{r.vi_tri}</td>
                    <td className="px-3 py-2">{r.kien}</td>
                    <td className="px-3 py-2">{r.kho}</td>
                    <td className="px-3 py-2">{r.trang_thai}</td>
                    <td className="px-3 py-2">{r.nhan_vien_let || "-"}</td>
                    <td className="px-3 py-2">
                      {formatDateTimeUTC(r.ngay_nhan_let)}
                    </td>
                    <td className="px-3 py-2">
                      {formatDateTimeUTC(r.ngay_gio_tao_let)}
                    </td>
                    <td className="px-3 py-2">
                      {formatDateTimeUTC(r.ngay_gio_hoan_thanh)}
                    </td>
                    <td className="px-3 py-2">
                      {formatDateTimeVN(r.ngay_import)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
          <span className="text-xs text-slate-500">
            {total > 0
              ? `Hiển thị ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                  page * PAGE_SIZE,
                  total,
                )} / ${total} bản ghi — Trang ${page}/${totalPages}`
              : `Trang ${page}/${totalPages}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <ImportModal
          onClose={() => setModalOpen(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
};

export default LetForm;
