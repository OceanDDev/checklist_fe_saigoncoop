/* eslint-disable react-refresh/only-export-components */
/* eslint-disable react/prop-types */
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Clock,
  CircleAlert,
  CheckCircle2,
  CalendarDays,
  X,
  FileSearch,
    PackageX, // 👈 thêm icon riêng cho "thiếu dữ liệu WMS"

} from "lucide-react";
import dayjs from "dayjs";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { quanlyhdService } from "@/services/quanlyhd.service";
import ImportQuanLyHD from "./import";
import ExportExcelButton from "./export";

const TRANG_THAI_OPTIONS = [
  "Chưa có hóa đơn",
  "Không khớp lượng",
  "Hoàn thành",
  "Đã xử lý",
  "No Data WMS"
];

// Trạng thái riêng: khi lọc đúng trạng thái này -> hiển thị TẤT CẢ, không phân trang
const TRANG_THAI_HIEN_THI_HET = "Không khớp lượng";

// Limit dùng khi hiển thị hết (thay cho phân trang). Backend cần cho phép limit này
// (xem controller getDanhSach, hiện đang clamp tối đa 500 -> cần nới lên).
const SHOW_ALL_LIMIT = 5000;

const TRANG_THAI_STYLE = {
  "Chưa có hóa đơn":
    "text-slate-600 bg-slate-100 border border-slate-200 shadow-sm",
  "Không khớp lượng":
    "text-red-700 bg-gradient-to-r from-red-50 to-rose-50 border border-red-300 shadow-sm",
  "Hoàn thành":
    "text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-300 shadow-sm",
  // 👈 thêm — dùng màu xanh dương để phân biệt với "Hoàn thành" (xanh lá)
  "Đã xử lý":
    "text-blue-700 bg-gradient-to-r from-blue-50 to-sky-50 border border-blue-300 shadow-sm",
     "No Data WMS": // 👈 thêm
    "text-purple-700 bg-gradient-to-r from-purple-50 to-fuchsia-50 border border-purple-300 shadow-sm",
};

const TRANG_THAI_ICON = {
  "Chưa có hóa đơn": { icon: Clock, color: "text-slate-400" },
  "Không khớp lượng": { icon: CircleAlert, color: "text-red-500" },
  "Hoàn thành": { icon: CheckCircle2, color: "text-emerald-500" },
  "Đã xử lý": { icon: CheckCircle2, color: "text-blue-500" }, // 👈 thêm
    "No Data WMS": { icon: PackageX, color: "text-purple-500" }, // 👈 thêm

};

// value: trạng thái hiện tại. onClick: chỉ được truyền khi trạng thái là
// "Không khớp lượng" -> badge trở thành nút bấm để mở modal xác nhận hoàn thành.
const TrangThaiBadge = ({ value, onClick }) => {
  const style = TRANG_THAI_STYLE[value] || TRANG_THAI_STYLE["Chưa có hóa đơn"];
  const iconInfo = TRANG_THAI_ICON[value] || TRANG_THAI_ICON["Chưa có hóa đơn"];
  const Icon = iconInfo.icon;
  const clickable = value === "Không khớp lượng" && !!onClick;

  return (
    <span
      onClick={clickable ? onClick : undefined}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      title={clickable ? "Nhấp để xác nhận hoàn thành" : undefined}
      className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold whitespace-nowrap ${style} ${
        clickable
          ? "cursor-pointer transition-transform hover:scale-[1.03] hover:shadow-md active:scale-95"
          : ""
      }`}
    >
      <Icon size={13} className={iconInfo.color} strokeWidth={2.5} />
      {value}
    </span>
  );
};

// So sánh lượng WMS vs HD -> tô màu số liệu để nhận ra lệch nhanh hơn
const SoLuongCell = ({ wms, hd }) => {
  const isMismatch =
    hd !== undefined && hd !== null && Number(wms) !== Number(hd);
  return (
    <span
      className={`font-semibold ${isMismatch ? "text-red-600" : "text-slate-700"}`}
    >
      {wms ?? 0}
    </span>
  );
};

// Ép về string + trim trước khi so sánh, tránh báo lệch giả khi 1 bên lưu Number 1 bên lưu String
const normalizeSoPhieu = (v) =>
  v === undefined || v === null ? "" : String(v).trim();

// So sánh số phiếu WMS vs HD -> tô đỏ khi lệch để đối chiếu thủ công
// Chỉ coi là lệch khi CẢ HAI đã có giá trị (tránh báo lệch khi mới import 1 bên)
const SoPhieuCell = ({ value, isMismatch }) => (
  <span
    className={`font-medium ${isMismatch ? "text-red-600" : "text-slate-600"}`}
  >
    {value || <span className="text-slate-300">—</span>}
  </span>
);

const EmptyState = ({
  title = "Không có dữ liệu",
  subtitle = "Import file WMS / Hóa đơn hoặc điều chỉnh bộ lọc để thấy kết quả.",
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 ring-1 ring-indigo-200 grid place-items-center shadow-inner">
      <FileSearch size={28} className="text-indigo-400" />
    </div>
    <div className="mt-4 text-lg font-semibold text-slate-700">{title}</div>
    <p className="mt-1 text-slate-500 max-w-md text-sm">{subtitle}</p>
  </div>
);

// Modal xác nhận hoàn thành cho 1 dòng đang "Không khớp lượng".
// Nút xác nhận màu xanh dương (blue) theo yêu cầu.
const ConfirmHoanThanhModal = ({ item, loading, onCancel, onConfirm }) => {
  if (!item) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-blue-50 grid place-items-center ring-1 ring-blue-200">
              <CheckCircle2 size={18} className="text-blue-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800">
              Xác nhận hoàn thành
            </h3>
          </div>
          <button
            onClick={onCancel}
            disabled={loading}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-3 text-sm text-slate-600">
          Bạn có chắc chắn muốn xác nhận đã xử lý xong dòng dữ liệu lệch lượng
          này không?
        </p>

        <div className="mt-3 space-y-1 rounded-xl bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
          <div>
            <span className="font-semibold text-slate-500">Mã CH:</span>{" "}
            {item.ma_ch}
          </div>
          <div>
            <span className="font-semibold text-slate-500">SKU:</span>{" "}
            {item.sku}
          </div>
          {item.name && (
            <div>
              <span className="font-semibold text-slate-500">Tên hàng:</span>{" "}
              {item.name}
            </div>
          )}
          <div className="flex gap-4">
            <span>
              <span className="font-semibold text-slate-500">Lượng WMS:</span>{" "}
              {item.luong_wms ?? 0}
            </span>
            <span>
              <span className="font-semibold text-slate-500">Lượng HĐ:</span>{" "}
              {item.luong_hd ?? 0}
            </span>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          Thời gian xử lý sẽ được ghi nhận là thời điểm hiện tại.
        </p>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="h-9 rounded-xl px-4 text-sm font-medium text-slate-600 ring-1 ring-slate-300 transition-colors hover:bg-slate-50 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="h-9 rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:scale-95 disabled:opacity-60"
          >
            {loading ? "Đang xử lý..." : "Xác nhận hoàn thành"}
          </button>
        </div>
      </div>
    </div>
  );
};

const filterInputCls =
  "w-full h-7 px-2 text-xs rounded-md border border-slate-300 bg-white/70 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-shadow";

const formatDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

const formatDateTime = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

// Mặc định: lọc Ngày import theo 3 ngày gần nhất (kể cả hôm nay).
// Là 1 hàm (không phải object tĩnh) để mỗi lần mount component đều lấy "hôm nay" mới nhất.
const getDefaultFilters = () => ({
  ma_ch: "",
  sku: "",
  name: "",
  so_hoa_don: "",
  so_phieu_wms: "",
  so_phieu_hd: "",
  trangThai: "",
  tu_ngay_hoa_don: "",
  den_ngay_hoa_don: "",
  tu_ngay_import: dayjs().subtract(2, "day").format("YYYY-MM-DD"),
  den_ngay_import: dayjs().format("YYYY-MM-DD"),
});

/** Bộ lọc khoảng ngày dùng chung (giống pattern NhanSuSoanTable) */
const DateRangeFilter = ({
  label,
  startValue,
  endValue,
  onChange,
  onClear,
  compact = false,
}) => {
  const [range, setRange] = useState([
    {
      startDate: startValue ? new Date(startValue) : null,
      endDate: endValue ? new Date(endValue) : null,
      key: "selection",
    },
  ]);
  const [show, setShow] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setShow(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  if (compact) {
    return (
      <div className="relative" ref={wrapRef}>
        <input
          type="text"
          readOnly
          onClick={() => setShow((v) => !v)}
          value={
            hasValue
              ? `${dayjs(range[0].startDate).format("DD/MM/YY")} - ${dayjs(range[0].endDate).format("DD/MM/YY")}`
              : ""
          }
          placeholder={label}
          title={label}
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

        {show && (
          <div className="absolute z-50 mt-1 overflow-hidden rounded-xl shadow-xl ring-1 ring-slate-200">
            <DateRange
              ranges={range}
              onChange={handleRangeChange}
              moveRangeOnFirstSelection={false}
              maxDate={new Date()}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={wrapRef}>
      <input
        type="text"
        readOnly
        onClick={() => setShow((v) => !v)}
        value={
          hasValue
            ? `${dayjs(range[0].startDate).format("DD/MM/YYYY")} - ${dayjs(range[0].endDate).format("DD/MM/YYYY")}`
            : ""
        }
        placeholder={label}
        className="w-64 cursor-pointer rounded-xl border border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-2 pl-9 text-sm text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-400 hover:from-blue-100 hover:to-indigo-100 hover:shadow-md"
      />
      <CalendarDays
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-blue-500"
      />

      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          title="Xoá lọc ngày"
          className="absolute -right-2 -top-2 rounded-full bg-slate-700 p-0.5 text-white shadow transition-colors hover:bg-rose-600"
        >
          <X size={12} />
        </button>
      )}

      {show && (
        <div className="absolute z-50 mt-2 overflow-hidden rounded-xl shadow-xl ring-1 ring-slate-200">
          <DateRange
            ranges={range}
            onChange={handleRangeChange}
            moveRangeOnFirstSelection={false}
            maxDate={new Date()}
          />
        </div>
      )}
    </div>
  );
};

const QuanLyHDTable = forwardRef(
  (
    {
      title = "ĐỐI CHIẾU HÓA ĐƠN - WMS",
      description = "Đối chiếu lượng hàng giữa hệ thống WMS và hóa đơn",
      // Cho phép cha truyền vào các component Import/Export riêng
      // VD: <QuanLyHDTable toolbarActions={<ImportQuanLyHD onImported={...} />} />
      toolbarActions = null,
    },
    ref,
  ) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState(() => getDefaultFilters());

    // Dòng đang được chọn để hỏi xác nhận hoàn thành + trạng thái loading khi gọi API
    const [confirmItem, setConfirmItem] = useState(null);
    const [confirming, setConfirming] = useState(false);

    // Riêng trạng thái "Không khớp lượng": hiển thị TẤT CẢ, không phân trang
    const isShowAll = filters.trangThai === TRANG_THAI_HIEN_THI_HET;

    const fetchQuanLyHD = useCallback(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await quanlyhdService.getDanhSach({
          page: isShowAll ? 1 : page,
          limit: isShowAll ? SHOW_ALL_LIMIT : limit,
          ...filters,
        });
        const data = res.data || [];
        setItems(data);
        setTotal(Number(res.pagination?.total ?? data.length));
      } catch (err) {
        console.error("Lỗi fetchQuanLyHD:", err);
        setError("Không tải được dữ liệu đối chiếu hóa đơn.");
      } finally {
        setLoading(false);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, limit, filters, isShowAll]);

    useEffect(() => {
      fetchQuanLyHD();
    }, [fetchQuanLyHD]);

    useImperativeHandle(ref, () => ({ fetchQuanLyHD }));

    const handleFilterChange = (key, value) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
      setPage(1);
    };

    const maxPage = useMemo(
      () => Math.max(1, Math.ceil(total / limit)),
      [total, limit],
    );

    // Mở modal xác nhận hoàn thành cho 1 dòng "Không khớp lượng"
    const handleOpenConfirm = (item) => setConfirmItem(item);

    const handleCloseConfirm = () => {
      if (confirming) return;
      setConfirmItem(null);
    };

    // Gọi API xác nhận hoàn thành -> cập nhật trạng thái + ghi nhận thời gian xử lý.
    // Vì đang ở màn "Không khớp lượng" (isShowAll), dòng vừa xác nhận hết khớp điều kiện lọc
    // trạng thái -> loại luôn khỏi danh sách đang xem (không cần đưa lên đầu ở đây nữa,
    // vì view "Hoàn thành" sẽ tự sort theo ngay_xu_ly/ngay_import khi người dùng lọc qua đó).
    const handleConfirmHoanThanh = async () => {
      if (!confirmItem) return;
      setConfirming(true);
      try {
        await quanlyhdService.xacNhanHoanThanh(confirmItem._id);
        setItems((prev) => prev.filter((it) => it._id !== confirmItem._id));
        setTotal((prev) => Math.max(0, prev - 1));
        setConfirmItem(null);
      } catch (err) {
        console.error("Lỗi xác nhận hoàn thành:", err);
        alert("Xác nhận hoàn thành thất bại, vui lòng thử lại.");
      } finally {
        setConfirming(false);
      }
    };

    return (
      <div className="mx-auto max-w-[1900px] space-y-4 p-4 md:p-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
        {/* Header */}
        <div className="flex flex-col gap-3 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200 backdrop-blur md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
              {title}
            </h1>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ImportQuanLyHD
              onImport={async ({ fileHd, fileWms }) => {
                const res = await quanlyhdService.importQuanLyHD(
                  fileWms,
                  fileHd,
                );
                fetchQuanLyHD(); // load lại danh sách sau khi import
                return res; // BẮT BUỘC return để modal hiển thị được kết quả
              }}
            />
            <ExportExcelButton filters={filters} /> {/* 👈 thêm */}
            {toolbarActions}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-auto rounded-2xl border border-slate-200 shadow-md ring-1 ring-slate-100">
          <table className="min-w-full text-xs md:text-sm">
            <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 backdrop-blur">
              {/* Header row */}
              <tr className="border-b-2 border-slate-200">
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                  Mã CH
                </th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                  SKU
                </th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                  Tên hàng
                </th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                  Số hóa đơn
                </th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                  Tên CH (WMS)
                </th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                  Tên CH (HĐ)
                </th>
                <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                  Lượng WMS
                </th>
                <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                  Lượng HĐ
                </th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                  Số phiếu WMS
                </th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                  Số phiếu HĐ
                </th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                  Trạng thái
                </th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                  Ngày hóa đơn
                </th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                  Ngày import
                </th>
                <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                  Thời gian xử lý
                </th>
              </tr>

              {/* Search row */}
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-3 py-1.5">
                  <input
                    type="text"
                    value={filters.ma_ch}
                    onChange={(e) =>
                      handleFilterChange("ma_ch", e.target.value)
                    }
                    placeholder="Lọc..."
                    className={filterInputCls}
                  />
                </th>
                <th className="px-3 py-1.5">
                  <input
                    type="text"
                    value={filters.sku}
                    onChange={(e) => handleFilterChange("sku", e.target.value)}
                    placeholder="Lọc..."
                    className={filterInputCls}
                  />
                </th>
                <th className="px-3 py-1.5">
                  <input
                    type="text"
                    value={filters.name}
                    onChange={(e) => handleFilterChange("name", e.target.value)}
                    placeholder="Lọc..."
                    className={filterInputCls}
                  />
                </th>
                <th className="px-3 py-1.5">
                  <input
                    type="text"
                    value={filters.so_hoa_don}
                    onChange={(e) =>
                      handleFilterChange("so_hoa_don", e.target.value)
                    }
                    placeholder="Lọc..."
                    className={filterInputCls}
                  />
                </th>
                <th className="px-3 py-1.5" />
                <th className="px-3 py-1.5" />
                <th className="px-3 py-1.5" />
                <th className="px-3 py-1.5" />
                <th className="px-3 py-1.5">
                  <input
                    type="text"
                    value={filters.so_phieu_wms}
                    onChange={(e) =>
                      handleFilterChange("so_phieu_wms", e.target.value)
                    }
                    placeholder="Lọc..."
                    className={filterInputCls}
                  />
                </th>
                <th className="px-3 py-1.5">
                  <input
                    type="text"
                    value={filters.so_phieu_hd}
                    onChange={(e) =>
                      handleFilterChange("so_phieu_hd", e.target.value)
                    }
                    placeholder="Lọc..."
                    className={filterInputCls}
                  />
                </th>
                <th className="px-3 py-1.5">
                  <select
                    value={filters.trangThai}
                    onChange={(e) =>
                      handleFilterChange("trangThai", e.target.value)
                    }
                    className={filterInputCls}
                  >
                    <option value="">Tất cả</option>
                    {TRANG_THAI_OPTIONS.map((tt) => (
                      <option key={tt} value={tt}>
                        {tt}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-3 py-1.5">
                  <DateRangeFilter
                    compact
                    label="Lọc ngày..."
                    startValue={filters.tu_ngay_hoa_don}
                    endValue={filters.den_ngay_hoa_don}
                    onChange={(start, end) => {
                      setFilters((prev) => ({
                        ...prev,
                        tu_ngay_hoa_don: start,
                        den_ngay_hoa_don: end,
                      }));
                      setPage(1);
                    }}
                    onClear={() => {
                      setFilters((prev) => ({
                        ...prev,
                        tu_ngay_hoa_don: "",
                        den_ngay_hoa_don: "",
                      }));
                      setPage(1);
                    }}
                  />
                </th>
                <th className="px-3 py-1.5">
                  <DateRangeFilter
                    compact
                    label="Lọc ngày..."
                    startValue={filters.tu_ngay_import}
                    endValue={filters.den_ngay_import}
                    onChange={(start, end) => {
                      setFilters((prev) => ({
                        ...prev,
                        tu_ngay_import: start,
                        den_ngay_import: end,
                      }));
                      setPage(1);
                    }}
                    onClear={() => {
                      setFilters((prev) => ({
                        ...prev,
                        tu_ngay_import: "",
                        den_ngay_import: "",
                      }));
                      setPage(1);
                    }}
                  />
                </th>
                <th className="px-3 py-1.5" />
              </tr>
            </thead>

            <tbody>
              {loading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <tr
                    key={`skeleton-${i}`}
                    className="border-b border-slate-100"
                  >
                    {Array.from({ length: 14 }).map((__, j) => (
                      <td key={`sk-${i}-${j}`} className="px-3 py-3">
                        <div className="h-3 w-24 max-w-full animate-pulse rounded bg-gradient-to-r from-slate-200 to-slate-100" />
                      </td>
                    ))}
                  </tr>
                ))}

              {!loading && error && (
                <tr>
                  <td
                    colSpan={14}
                    className="px-3 py-8 text-center text-rose-600 font-medium"
                  >
                    {error}
                  </td>
                </tr>
              )}

              {!loading && !error && items.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-3 py-6">
                    <EmptyState />
                  </td>
                </tr>
              )}

              {!loading &&
                !error &&
                items.length > 0 &&
                items.map((item) => {
                  const soPhieuWms = normalizeSoPhieu(item.so_phieu_wms);
                  const soPhieuHd = normalizeSoPhieu(item.so_phieu_hd);
                  const soPhieuMismatch =
                    !!soPhieuWms && !!soPhieuHd && soPhieuWms !== soPhieuHd;

                  return (
                    <tr
                      key={item._id}
                      className="border-b border-slate-100 even:bg-slate-50/70 transition-colors duration-150 hover:bg-blue-50/70 hover:shadow-[inset_3px_0_0_0_theme(colors.blue.400)]"
                    >
                      <td className="px-3 py-2 whitespace-nowrap font-semibold text-slate-800">
                        {item.ma_ch}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                        {item.sku}
                      </td>
                      <td
                        className="px-3 py-2 text-slate-700 max-w-[240px] truncate"
                        title={item.name}
                      >
                        {item.name}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                        {item.so_hoa_don || (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                        {item.ten_ch_wms || (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                        {item.ten_ch_hd || (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <SoLuongCell wms={item.luong_wms} hd={item.luong_hd} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-right">
                        <SoLuongCell wms={item.luong_hd} hd={item.luong_wms} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <SoPhieuCell
                          value={item.tf_sd_wms}
                          isMismatch={soPhieuMismatch}
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <SoPhieuCell
                          value={item.tf_sd_hd}
                          isMismatch={soPhieuMismatch}
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        <TrangThaiBadge
                          value={item.trangThai}
                          onClick={
                            item.trangThai === "Không khớp lượng"
                              ? () => handleOpenConfirm(item)
                              : undefined
                          }
                        />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                        {formatDate(item.ngay_hoa_don)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                        {formatDateTime(item.ngay_import)}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                        {item.ngay_xu_ly ? (
                          formatDateTime(item.ngay_xu_ly)
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Footer: "Không khớp lượng" -> hiển thị hết, không phân trang.
            Các trạng thái còn lại (Hoàn thành / Chưa có hóa đơn / Tất cả) -> phân trang. */}
        {isShowAll ? (
          <div className="flex items-center justify-center gap-3 text-sm py-4 px-6 bg-gradient-to-r from-red-50 via-rose-50 to-red-50 rounded-xl border border-red-200 shadow-sm">
            <span className="font-medium text-slate-700">
              Hiển thị tất cả <b className="text-red-600">{items.length}</b> /{" "}
              <b className="text-slate-800">{total}</b> kết quả{" "}
              <span className="text-red-600 font-semibold">
                Không khớp lượng
              </span>
            </span>
          </div>
        ) : (
          <div className="flex flex-col gap-3 rounded-xl bg-white/70 p-3 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-600">
              Đang hiển thị <b className="text-blue-700">{items.length}</b> /{" "}
              <b className="text-slate-800">{total}</b> bản ghi
            </div>
            <div className="flex items-center gap-2">
              <select
                value={limit}
                onChange={(e) => {
                  setPage(1);
                  setLimit(Number(e.target.value));
                }}
                className="h-10 rounded-xl border border-teal-300 bg-teal-50 px-3 font-medium text-teal-700 shadow-sm transition-shadow hover:bg-teal-100 hover:shadow-md"
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}/trang
                  </option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="h-10 px-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 ring-1 ring-indigo-200 shadow-sm transition-all hover:from-indigo-100 hover:to-purple-100 hover:shadow-md disabled:opacity-40 disabled:hover:from-indigo-50 disabled:hover:to-purple-50"
                >
                  ⏮
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:hover:from-blue-600 disabled:hover:to-indigo-600"
                >
                  Trước
                </button>
                <span className="px-2 text-sm text-slate-600">Trang</span>
                <input
                  type="number"
                  min={1}
                  max={maxPage}
                  value={page}
                  onChange={(e) => {
                    const v = Number(e.target.value || 1);
                    setPage(Math.min(Math.max(1, v), maxPage));
                  }}
                  className="h-10 w-16 rounded-xl border border-blue-300 bg-blue-50/50 px-2 text-center font-bold text-blue-700 shadow-sm focus:ring-2 focus:ring-blue-300 outline-none"
                />
                <span className="px-1 text-sm text-slate-600">/ {maxPage}</span>
                <button
                  onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                  disabled={page >= maxPage}
                  className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md active:scale-95 disabled:opacity-40 disabled:hover:from-blue-600 disabled:hover:to-indigo-600"
                >
                  Sau
                </button>
                <button
                  onClick={() => setPage(maxPage)}
                  disabled={page >= maxPage}
                  className="h-10 px-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 ring-1 ring-indigo-200 shadow-sm transition-all hover:from-indigo-100 hover:to-purple-100 hover:shadow-md disabled:opacity-40 disabled:hover:from-indigo-50 disabled:hover:to-purple-50"
                >
                  ⏭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal xác nhận hoàn thành */}
        <ConfirmHoanThanhModal
          item={confirmItem}
          loading={confirming}
          onCancel={handleCloseConfirm}
          onConfirm={handleConfirmHoanThanh}
        />
      </div>
    );
  },
);

QuanLyHDTable.displayName = "QuanLyHDTable";

export default QuanLyHDTable;
