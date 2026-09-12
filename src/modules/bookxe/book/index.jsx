/* eslint-disable react/prop-types */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { Trash2, RefreshCw, X, Truck, Pencil, UserRound } from "lucide-react";
import { bookXeService } from "@/services/bookxe.service";
import EditBookXeModal from "./editbookxemodal";
import ExportExcelButton from "./export";
import BookChuyenModal from "./bookchuyenmodal";

const PAGE_SIZE = 20;
const EXPORT_LIMIT = 100000;

const STATUS_OPTIONS = ["Chờ xe", "Hoàn thành"];

const STATUS_STYLE = {
  "Chờ xe": "bg-amber-50 text-amber-600",
  "Hoàn thành": "bg-emerald-50 text-emerald-600",
};

const NCV_NAME_MAP = {
  "04-TP": "Minh Phú",
  "70-TP": "Geloven",
  "19-TP": "Phan Thành",
  "26-TI": "Thành Đạt",
  "61-TI": "Uy Long",
  "04.2021-TP": "Thuỳ An Hưng",
};

const getTenNVCRutGon = (item) => {
  const maNcv = (item.ma_ncv || "").trim();
  return NCV_NAME_MAP[maNcv] || item.ten_nvc || "—";
};

const formatNgayDiHang = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const SLOT_PRESETS = [
  { xuat: "07:30", toi: "09:00", label: "9:00 - 16:00", color: "#3B82F6" },
  { xuat: "08:30", toi: "09:00", label: "9:00 - 16:00", color: "#06B6D4" },
  { xuat: "10:00", toi: "11:00", label: "11:00 - 16:00", color: "#10B981" },
  { xuat: "12:30", toi: "13:30", label: "13:30 - 16:00", color: "#84CC16" },
  { xuat: "13:30", toi: "14:00", label: "14:00 - 21:00", color: "#F59E0B" },
  { xuat: "14:30", toi: "15:00", label: "15:00 - 21:00", color: "#F97316" },
  { xuat: "15:30", toi: "17:00", label: "17:00 - 21:00", color: "#EF4444" },
  { xuat: "17:30", toi: "20:30", label: "20:30 - 22:00", color: "#A855F7" },
];

const getVNTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const getSlotInfo = (item) => {
  const gioXuat = getVNTime(item.thoi_gian_xuat);
  const gioToi = getVNTime(item.thoi_gian_dk_toi_ch);
  if (!gioXuat) return null;
  const preset = SLOT_PRESETS.find(
    (s) => s.xuat === gioXuat && s.toi === gioToi,
  );
  if (preset) return { color: preset.color, label: preset.label, gioXuat };
  return { color: null, label: "", gioXuat };
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatNgayOnly = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTimeOnly = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  });
};

const formatNgayVN = (ngayStr) => {
  if (!ngayStr) return "";
  const parts = ngayStr.split("-");
  if (parts.length !== 3) return ngayStr;
  const [y, m, d] = parts;
  return `${d}/${m}/${y}`;
};

const cleanTenCH = (tenCh, maCh) => {
  if (!tenCh) return tenCh || "";
  let result = tenCh.trim();
  if (maCh) {
    const escaped = maCh.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^(?:${escaped}-\\s*)+`, "i");
    result = result.replace(re, "");
  }
  result = result.replace(/^[A-Za-z]{1,4}\d{3,6}-\s*/, "");
  return result.trim();
};
// Gộp các mã CH trùng nhau (giữ lần xuất hiện đầu tiên), đồng thời gộp tên CH tương ứng
const dedupeCHPair = (maCh, tenCh) => {
  const maChArr = String(maCh || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const tenChArr = String(tenCh || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const seen = new Set();
  const resultMa = [];
  const resultTen = [];

  maChArr.forEach((ma, idx) => {
    if (seen.has(ma)) return; // đã có mã này rồi, bỏ qua
    seen.add(ma);
    resultMa.push(ma);
    resultTen.push(tenChArr[idx] || "");
  });

  return { maChArr: resultMa, tenChArr: resultTen };
};
const getMinutesOfDayVN = (value) => {
  if (!value) return Infinity;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return Infinity;
  const hhmm = d.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  });
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

const sortByGioXuatAsc = (rows) =>
  [...rows].sort(
    (a, b) =>
      getMinutesOfDayVN(a.thoi_gian_xuat) - getMinutesOfDayVN(b.thoi_gian_xuat),
  );

// ─── Filter row input styles + DateRangeFilter (giống style ô "Lọc...") ─────

const filterInputCls =
  "w-full h-7 px-2 text-xs rounded-md border border-slate-300 bg-white/70 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-shadow";

const DateRangeFilter = ({
  label,
  startValue,
  endValue,
  onChange,
  onClear,
}) => {
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
      const popupWidth = 320;
      let left = rect.left;
      const maxLeft = window.innerWidth - popupWidth - 8;
      if (left > maxLeft) left = maxLeft;
      if (left < 8) left = 8;
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
      {show &&
        typeof document !== "undefined" &&
        createPortal(popup, document.body)}
    </div>
  );
};

// ─── Filter mặc định + các field text cần debounce trước khi gọi API ────────

const DEFAULT_FILTERS = {
  quan: "",
  maCh: "",
  tenCh: "",
  maNcv: "",
  tenNvc: "",
  lichDiHang: "",
  ghiChu: "",
  trangThai: "",
};

const TEXT_FILTER_KEYS = [
  "quan",
  "maCh",
  "tenCh",
  "maNcv",
  "tenNvc",
  "lichDiHang",
  "ghiChu",
];

const getTodayVN = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

// ─── Sub components ─────────────────────────────────────────────────────────

const StatusBadge = ({ value, onClick, updating }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={updating}
    title="Nhấp để chuyển trạng thái"
    className={[
      "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium transition-opacity",
      STATUS_STYLE[value] || "bg-slate-100 text-slate-500",
      updating ? "cursor-wait opacity-50" : "cursor-pointer hover:opacity-80",
    ].join(" ")}
  >
    {value || "—"}
  </button>
);

const TagList = ({ items = [], tone = "slate" }) => {
  if (!items.length) return <span className="text-slate-400">—</span>;

  const toneClass =
    tone === "blue"
      ? "bg-blue-50 text-blue-700"
      : "bg-slate-100 text-slate-600";

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((it, idx) => (
        <span
          key={`${it}-${idx}`}
          className={[
            "inline-block rounded-md px-1.5 py-0.5 text-xs font-medium leading-tight",
            toneClass,
          ].join(" ")}
        >
          {it}
        </span>
      ))}
    </div>
  );
};

const TenCHList = ({ maChArr = [], tenChArr = [] }) => {
  if (tenChArr.length === 0) return <span className="text-slate-400">—</span>;

  return (
    <div className="flex flex-col gap-1">
      {tenChArr.map((raw, idx) => (
        <span
          key={`${raw}-${idx}`}
          className="text-[13px] font-medium leading-snug text-slate-700"
        >
          {cleanTenCH(raw, maChArr[idx])}
        </span>
      ))}
    </div>
  );
};

const BookXeTable = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  // Ngày Đi Hàng
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");
  // Ngày Tạo — mặc định hôm nay
  const [tuNgayTao, setTuNgayTao] = useState(getTodayVN());
  const [denNgayTao, setDenNgayTao] = useState(getTodayVN());
  // Ngày HT
  const [tuNgayHT, setTuNgayHT] = useState("");
  const [denNgayHT, setDenNgayHT] = useState("");

  // Bản nháp filter text — cập nhật UI ngay, chỉ gọi API sau khi ngừng gõ
  const [textFilterDrafts, setTextFilterDrafts] = useState(() => {
    const draft = {};
    TEXT_FILTER_KEYS.forEach((k) => (draft[k] = ""));
    return draft;
  });
  const appliedTextFiltersRef = useRef(textFilterDrafts);

  useEffect(() => {
    const timer = setTimeout(() => {
      const changed = TEXT_FILTER_KEYS.some(
        (k) => appliedTextFiltersRef.current[k] !== textFilterDrafts[k],
      );
      if (changed) {
        appliedTextFiltersRef.current = textFilterDrafts;
        setFilters((prev) => ({ ...prev, ...textFilterDrafts }));
        setPage(1);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [textFilterDrafts]);

  const handleTextFilterChange = useCallback((key, value) => {
    setTextFilterDrafts((prev) => ({ ...prev, [key]: value }));
  }, []);

  const [selectedIds, setSelectedIds] = useState([]);
  const [bookChuyenOpen, setBookChuyenOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [updatingIds, setUpdatingIds] = useState(() => new Set());
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const buildQueryParams = useCallback(
    () => ({
      quan: filters.quan || undefined,
      ma_ch: filters.maCh || undefined,
      ten_ch: filters.tenCh || undefined,
      ma_ncv: filters.maNcv || undefined,
      ten_nvc: filters.tenNvc || undefined,
      lich_di_hang: filters.lichDiHang || undefined,
      ghi_chu: filters.ghiChu || undefined,
      trangThai: filters.trangThai || undefined,
      tu_ngay: tuNgay || undefined,
      den_ngay: denNgay || undefined,
      tu_ngay_tao: tuNgayTao || undefined,
      den_ngay_tao: denNgayTao || undefined,
      tu_ngay_ht: tuNgayHT || undefined,
      den_ngay_ht: denNgayHT || undefined,
    }),
    [filters, tuNgay, denNgay, tuNgayTao, denNgayTao, tuNgayHT, denNgayHT],
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bookXeService.getAllBookXe({
        page,
        limit: PAGE_SIZE,
        ...buildQueryParams(),
      });

      const { data: list = [], pagination } = res || {};

      setData(list);
      setTotal(pagination?.total ?? 0);

      if (list.length === 0 && page > 1) {
        setPage((p) => p - 1);
      }
    } catch (error) {
      console.error("fetchData bookxe error:", error);
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, buildQueryParams]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedData = useMemo(() => sortByGioXuatAsc(data), [data]);

  const soLuongGiaoKhach = useMemo(
    () => data.filter((item) => item.co_giao_khach).length,
    [data],
  );

  const fetchExportRows = useCallback(async () => {
    const res = await bookXeService.getAllBookXe({
      page: 1,
      limit: EXPORT_LIMIT,
      ...buildQueryParams(),
    });
    return res?.data ?? [];
  }, [buildQueryParams]);

  const handleClearFilters = () => {
    setTextFilterDrafts(() => {
      const draft = {};
      TEXT_FILTER_KEYS.forEach((k) => (draft[k] = ""));
      return draft;
    });
    appliedTextFiltersRef.current = TEXT_FILTER_KEYS.reduce((acc, k) => {
      acc[k] = "";
      return acc;
    }, {});
    setFilters(DEFAULT_FILTERS);
    setTuNgay("");
    setDenNgay("");
    setTuNgayTao("");
    setDenNgayTao("");
    setTuNgayHT("");
    setDenNgayHT("");
    setPage(1);
  };

  const hasActiveFilters =
    TEXT_FILTER_KEYS.some((k) => filters[k]) ||
    filters.trangThai ||
    tuNgay ||
    denNgay ||
    tuNgayTao ||
    denNgayTao ||
    tuNgayHT ||
    denNgayHT;

  const toggleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((item) => item._id));
    }
  };
  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Xóa ${selectedIds.length} chuyến đã chọn?`)) return;
    try {
      await bookXeService.deleteManyBookXe(selectedIds);
      setSelectedIds([]);
      fetchData();
    } catch (error) {
      console.error("deleteManyBookXe error:", error);
    }
  };

  const handleDeleteOne = async (id) => {
    if (!window.confirm("Xóa chuyến này?")) return;
    try {
      await bookXeService.deleteBookXeById(id);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      fetchData();
    } catch (error) {
      console.error("deleteBookXeById error:", error);
    }
  };

  const handleBooked = () => {
    setPage(1);
    fetchData();
  };

  const handleToggleTrangThai = async (item) => {
    if (updatingIds.has(item._id)) return;

    const isHoanThanh = item.trangThai === "Hoàn thành";
    const nextTrangThai = isHoanThanh ? "Chờ xe" : "Hoàn thành";
    const nextThoiGianHT = isHoanThanh ? null : new Date().toISOString();

    setUpdatingIds((prev) => new Set(prev).add(item._id));
    setData((prev) =>
      prev.map((d) =>
        d._id === item._id
          ? {
              ...d,
              trangThai: nextTrangThai,
              thoi_gian_hoan_thanh: nextThoiGianHT,
            }
          : d,
      ),
    );

    try {
      await bookXeService.updateBookXe(item._id, {
        trangThai: nextTrangThai,
        thoi_gian_hoan_thanh: nextThoiGianHT,
      });
    } catch (error) {
      console.error("Cập nhật trạng thái thất bại:", error);
      setData((prev) => prev.map((d) => (d._id === item._id ? item : d)));
    } finally {
      setUpdatingIds((prev) => {
        const next = new Set(prev);
        next.delete(item._id);
        return next;
      });
    }
  };

  const COLUMN_COUNT = 16;

  return (
    <div className="p-3 md:p-4">
      {soLuongGiaoKhach > 0 && (
        <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700">
          <UserRound size={16} className="shrink-0" />
          Có {soLuongGiaoKhach} chuyến đang giao khách — cần ưu tiên xử lý.
        </div>
      )}

      {/* Toolbar — chỉ còn nút thao tác, không còn ô lọc */}
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="mr-auto flex items-center gap-1 rounded-lg px-2 py-2 text-sm text-slate-500 transition-colors hover:bg-slate-100"
          >
            <X size={14} />
            Xóa lọc
          </button>
        )}
        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-100"
          >
            <Trash2 size={14} />
            Xóa ({selectedIds.length})
          </button>
        )}
        <ExportExcelButton
          fetchExportRows={fetchExportRows}
          fileName="danh-sach-book-xe"
          disabled={loading && total === 0}
        />
        <button
          type="button"
          onClick={fetchData}
          className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Tải lại
        </button>
        <button
          type="button"
          onClick={() => setBookChuyenOpen(true)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          <Truck size={14} />
          Thêm Chuyến
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="divide-x divide-slate-200">
                <th className="w-9 px-2 py-2.5 align-middle">
                  <input
                    type="checkbox"
                    checked={
                      data.length > 0 && selectedIds.length === data.length
                    }
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                </th>
                <th className="w-[7%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Ngày Đi Hàng
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Giờ Xuất
                </th>
                <th className="w-[7%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Dự Kiến Tới CH
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Quận
                </th>
                <th className="w-[7%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Mã CH
                </th>
                <th className="w-[16%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Tên CH
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Mã NCV
                </th>
                <th className="w-[8%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Tên NVC
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Lịch Đi Hàng
                </th>
                <th className="w-[4%] px-2.5 py-2.5 text-right align-middle text-xs font-semibold text-slate-600">
                  Kiện
                </th>
                <th className="w-[7%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Ghi Chú
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Trạng Thái
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Ngày Tạo
                </th>
                <th className="w-[6%] px-2.5 py-2.5 text-left align-middle text-xs font-semibold text-slate-600">
                  Ngày HT
                </th>
                <th className="w-[5%] px-2.5 py-2.5 text-right align-middle text-xs font-semibold text-slate-600">
                  Thao Tác
                </th>
              </tr>

              {/* Hàng lọc — mỗi cột 1 ô "Lọc..." riêng, khớp style ảnh mẫu */}
              <tr className="divide-x divide-slate-200 border-t border-slate-200 bg-slate-50">
                <th className="px-2 py-1.5" />
                <th className="px-2 py-1.5">
                  <DateRangeFilter
                    label="Lọc ngày..."
                    startValue={tuNgay}
                    endValue={denNgay}
                    onChange={(s, e) => {
                      setTuNgay(s);
                      setDenNgay(e);
                      setPage(1);
                    }}
                    onClear={() => {
                      setTuNgay("");
                      setDenNgay("");
                      setPage(1);
                    }}
                  />
                </th>
                <th className="px-2 py-1.5" />
                <th className="px-2 py-1.5" />
                <th className="px-2 py-1.5">
                  <input
                    type="text"
                    value={textFilterDrafts.quan}
                    onChange={(e) =>
                      handleTextFilterChange("quan", e.target.value)
                    }
                    placeholder="Lọc..."
                    className={filterInputCls}
                  />
                </th>
                <th className="px-2 py-1.5">
                  <input
                    type="text"
                    value={textFilterDrafts.maCh}
                    onChange={(e) =>
                      handleTextFilterChange("maCh", e.target.value)
                    }
                    placeholder="Lọc..."
                    className={filterInputCls}
                  />
                </th>
                <th className="px-2 py-1.5">
                  <input
                    type="text"
                    value={textFilterDrafts.tenCh}
                    onChange={(e) =>
                      handleTextFilterChange("tenCh", e.target.value)
                    }
                    placeholder="Lọc..."
                    className={filterInputCls}
                  />
                </th>
                <th className="px-2 py-1.5">
                  <input
                    type="text"
                    value={textFilterDrafts.maNcv}
                    onChange={(e) =>
                      handleTextFilterChange("maNcv", e.target.value)
                    }
                    placeholder="Lọc..."
                    className={filterInputCls}
                  />
                </th>
                <th className="px-2 py-1.5">
                  <input
                    type="text"
                    value={textFilterDrafts.tenNvc}
                    onChange={(e) =>
                      handleTextFilterChange("tenNvc", e.target.value)
                    }
                    placeholder="Lọc..."
                    className={filterInputCls}
                  />
                </th>
                <th className="px-2 py-1.5">
                  <input
                    type="text"
                    value={textFilterDrafts.lichDiHang}
                    onChange={(e) =>
                      handleTextFilterChange("lichDiHang", e.target.value)
                    }
                    placeholder="Lọc..."
                    className={filterInputCls}
                  />
                </th>
                <th className="px-2 py-1.5" />
                <th className="px-2 py-1.5">
                  <input
                    type="text"
                    value={textFilterDrafts.ghiChu}
                    onChange={(e) =>
                      handleTextFilterChange("ghiChu", e.target.value)
                    }
                    placeholder="Lọc..."
                    className={filterInputCls}
                  />
                </th>
                <th className="px-2 py-1.5">
                  <select
                    value={filters.trangThai}
                    onChange={(e) => {
                      setFilters((prev) => ({
                        ...prev,
                        trangThai: e.target.value,
                      }));
                      setPage(1);
                    }}
                    className={filterInputCls}
                  >
                    <option value="">Tất cả</option>
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </th>
                <th className="px-2 py-1.5">
                  <DateRangeFilter
                    label="Lọc ngày..."
                    startValue={tuNgayTao}
                    endValue={denNgayTao}
                    onChange={(s, e) => {
                      setTuNgayTao(s);
                      setDenNgayTao(e);
                      setPage(1);
                    }}
                    onClear={() => {
                      setTuNgayTao("");
                      setDenNgayTao("");
                      setPage(1);
                    }}
                  />
                </th>
                <th className="px-2 py-1.5">
                  <DateRangeFilter
                    label="Lọc ngày..."
                    startValue={tuNgayHT}
                    endValue={denNgayHT}
                    onChange={(s, e) => {
                      setTuNgayHT(s);
                      setDenNgayHT(e);
                      setPage(1);
                    }}
                    onClear={() => {
                      setTuNgayHT("");
                      setDenNgayHT("");
                      setPage(1);
                    }}
                  />
                </th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : sortedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMN_COUNT}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    Không có chuyến book xe nào
                  </td>
                </tr>
              ) : (
                sortedData.map((item) => {
                  const isGiaoKhach = !!item.co_giao_khach;
                  const slot = getSlotInfo(item);
                  const slotColor = slot?.color;
                  const { maChArr, tenChArr } = dedupeCHPair(
                    item.ma_ch,
                    item.ten_ch,
                  );

                  return (
                    <tr
                      key={item._id}
                      className="divide-x divide-slate-100 align-top transition-colors hover:brightness-[0.97]"
                      style={{
                        backgroundColor: slotColor
                          ? `${slotColor}14`
                          : undefined,
                        borderLeft: slotColor
                          ? `4px solid ${slotColor}`
                          : "4px solid transparent",
                      }}
                    >
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item._id)}
                          onChange={() => toggleSelectOne(item._id)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-600">
                        {formatNgayDiHang(item.ngay_di_hang)}
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[13px] font-medium text-slate-800">
                            {formatTimeOnly(item.thoi_gian_xuat)}
                          </span>
                          {isGiaoKhach && (
                            <span
                              title={`Giao khách - ngày ${formatNgayVN(item.ngay_giao_khach)}`}
                              className="inline-flex shrink-0 items-center rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-600"
                            >
                              GK
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-600">
                        {slot?.label ? (
                          <span className="font-medium text-slate-700">
                            {slot.label}
                          </span>
                        ) : (
                          formatDateTime(item.thoi_gian_dk_toi_ch)
                        )}
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-600">
                        {item.quan || "—"}
                      </td>
                      <td className="px-2.5 py-2">
                        <TagList items={maChArr} tone="blue" />
                      </td>
                      <td className="px-2.5 py-2">
                        <TenCHList maChArr={maChArr} tenChArr={tenChArr} />
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-600">
                        {item.ma_ncv || "—"}
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-600">
                        {getTenNVCRutGon(item)}
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-600">
                        {item.lich_di_hang || "—"}
                      </td>
                      <td className="px-2.5 py-2 text-right text-[13px] font-medium text-slate-700">
                        {item.kien ?? 0}
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-600">
                        {item.ghi_chu || "—"}
                      </td>
                      <td className="px-2.5 py-2">
                        <StatusBadge
                          value={item.trangThai}
                          onClick={() => handleToggleTrangThai(item)}
                          updating={updatingIds.has(item._id)}
                        />
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-500">
                        {formatNgayOnly(item.thoi_gian_tao)}
                      </td>
                      <td className="px-2.5 py-2 text-[13px] text-slate-500">
                        {formatNgayOnly(item.thoi_gian_hoan_thanh)}
                      </td>
                      <td className="px-2.5 py-2 text-right">
                        <div className="flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                            title="Sửa"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteOne(item._id)}
                            className="rounded-md p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                            title="Xóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
        <span>
          Tổng <span className="font-medium text-slate-700">{total}</span>{" "}
          chuyến
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="rounded-lg border border-slate-300 px-2.5 py-1 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Trước
          </button>
          <span className="px-2">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            className="rounded-lg border border-slate-300 px-2.5 py-1 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
          >
            Sau
          </button>
        </div>
      </div>
      <EditBookXeModal
        open={!!editingItem}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onUpdated={fetchData}
      />
      <BookChuyenModal
        open={bookChuyenOpen}
        onClose={() => setBookChuyenOpen(false)}
        onBooked={handleBooked}
      />
    </div>
  );
};

export default BookXeTable;
