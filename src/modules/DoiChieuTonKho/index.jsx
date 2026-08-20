/* eslint-disable react/prop-types */
// components/tonkho/index.jsx
import { useCallback, useEffect, useMemo, useRef, useState, memo } from "react";
import { createPortal } from "react-dom";
import {
  PackageSearch,
  Loader2,
  CalendarDays,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import dayjs from "dayjs";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import ImportTonKho from "./import";
import ExportTonKho from "./export";
import DeleteAllTonKho from "./deleteall";
import { khuyenMaiService } from "@/services/khuyenmai.service";
import StatsDonut from "./dashboard";

/* ------------------------------------------------------------------ */
/* Hằng số                                                             */
/* ------------------------------------------------------------------ */
const TRANG_THAI_OPTIONS = ["Khớp", "Không Khớp", "Không có DATA"];

const TRANG_THAI_STYLE = {
  Khớp: "text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-300 shadow-sm",
  "Không Khớp":
    "text-rose-700 bg-gradient-to-r from-rose-50 to-red-50 border border-rose-300 shadow-sm",
  "Không có DATA":
    "text-slate-500 bg-slate-100 border border-slate-200 shadow-sm",
};

const TRANG_THAI_DOT = {
  Khớp: "bg-emerald-500",
  "Không Khớp": "bg-rose-500 animate-pulse",
  "Không có DATA": "bg-slate-400",
};

const DEFAULT_FILTERS = {
  sku: "",
  name: "",
  lpn: "",
  slot: "",
  trangThai: "",
  tuNgay: "",
  denNgay: "",
};

// Các ô lọc dạng gõ chữ — debounce trước khi thật sự gọi API.
const TEXT_FILTER_KEYS = ["sku", "name", "lpn", "slot"];

// Lấy hết dữ liệu khớp bộ lọc (không phân trang) để tính tổng chính xác,
// tránh trường hợp bảng đang phân trang nên tổng bị thiếu.
const FETCH_ALL_LIMIT = 1000000;

const filterInputCls =
  "w-full h-7 px-2 text-xs rounded-md border border-slate-300 bg-white/70 focus:ring-2 focus:ring-blue-300 focus:border-blue-400 outline-none transition-shadow";

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

const formatQty = (v) => {
  const n = Number(v);
  if (Number.isNaN(n)) return v || "";
  return new Intl.NumberFormat("vi-VN").format(n);
};

/* ------------------------------------------------------------------ */
/* DateRangeFilter — dùng cho ô lọc "Thời gian import" trong header    */
/* bảng. Popup đẩy ra document.body qua portal để không bị che.       */
/* ------------------------------------------------------------------ */
const DateRangeFilter = memo(function DateRangeFilter({
  startValue,
  endValue,
  onChange,
  onClear,
}) {
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
        title="Lọc theo thời gian import"
        className={`${filterInputCls} cursor-pointer pr-5`}
      />
      <CalendarDays
        size={12}
        className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400"
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
});

/* ------------------------------------------------------------------ */
/* EmptyState                                                          */
/* ------------------------------------------------------------------ */
const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 ring-1 ring-indigo-200 grid place-items-center shadow-inner">
        <PackageSearch size={28} className="text-indigo-400" />
      </div>
      <div className="mt-4 text-lg font-semibold text-slate-700">
        Không có dữ liệu
      </div>
      <p className="mt-1 text-slate-500 max-w-md text-sm">
        Import file Excel tồn kho + file txt MMS để bắt đầu so khớp.
      </p>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* FilterSummary — tổng hợp On Hand / MMS / lượng lệch theo bộ lọc     */
/* hiện tại. Tính trên TOÀN BỘ dữ liệu khớp bộ lọc (không chỉ trang    */
/* đang xem) để không bị sai khi kết quả trải nhiều trang.             */
/* Vì MMS được denormalize lặp lại theo từng dòng slot/lpn của 1 SKU,  */
/* nên phải gộp theo SKU trước rồi mới cộng, tránh đếm trùng MMS.      */
/* ------------------------------------------------------------------ */
const FilterSummary = memo(function FilterSummary({ filters }) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await khuyenMaiService.getAllKhuyenMai({
          page: 1,
          limit: FETCH_ALL_LIMIT,
          ...filters,
        });
        const data = res?.data || res?.items || [];

        // Gộp theo SKU: cộng dồn On Hand qua các dòng, nhưng MMS chỉ lấy
        // 1 lần cho mỗi SKU (vì nó lặp lại giống nhau ở mọi dòng của SKU đó).
        const bySku = new Map();
        data.forEach((item) => {
          const key = item.sku;
          if (!bySku.has(key)) {
            bySku.set(key, {
              onHand: 0,
              mms: Number(item.luong_mms) || 0,
            });
          }
          bySku.get(key).onHand += Number(item.luong_onhand) || 0;
        });

        let totalOnHand = 0;
        let totalMms = 0;
        let totalLech = 0;
        bySku.forEach(({ onHand, mms }) => {
          totalOnHand += onHand;
          totalMms += mms;
          totalLech += mms - onHand;
        });

        if (!cancelled) {
          setSummary({
            skuCount: bySku.size,
            totalOnHand,
            totalMms,
            totalLech,
          });
        }
      } catch (err) {
        console.error("Lỗi tính tổng lượng lệch:", err);
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-white/70 p-3 text-xs text-slate-400 shadow-sm ring-1 ring-slate-200">
        <Loader2 size={14} className="animate-spin" />
        Đang tính tổng lượng lệch...
      </div>
    );
  }

  if (!summary) return null;

  const { skuCount, totalOnHand, totalMms, totalLech } = summary;

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl bg-white/70 p-3 shadow-sm ring-1 ring-slate-200">
      <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
        Tổng theo bộ lọc
      </span>
      <span className="text-xs text-slate-500">
        SKU: <b className="text-slate-800">{skuCount}</b>
      </span>
      <span className="text-xs text-slate-500">
        Tổng On Hand: <b className="text-slate-800">{formatQty(totalOnHand)}</b>
      </span>
      <span className="text-xs text-slate-500">
        Tổng MMS: <b className="text-slate-800">{formatQty(totalMms)}</b>
      </span>
      <span
        className={`rounded-md px-2.5 py-1 text-xs font-bold ring-1 ${
          totalLech === 0
            ? "bg-slate-50 text-slate-600 ring-slate-200"
            : totalLech > 0
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-rose-50 text-rose-700 ring-rose-200"
        }`}
      >
        Lượng lệch (MMS − On Hand): {formatQty(totalLech)}
      </span>
    </div>
  );
});

/* ------------------------------------------------------------------ */
/* Component chính                                                     */
/* ------------------------------------------------------------------ */
const DoiChieuTonKho = ({
  title = "SO KHỚP TỒN KHO",
  description = "So khớp số lượng On Hand giữa tồn kho thực tế và MMS",
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });

  // "" | "asc" | "desc" — sort theo cột Vị trí
  const [sortOrder, setSortOrder] = useState("");

  const toggleSortSlot = useCallback(() => {
    setSortOrder((prev) =>
      prev === "" ? "asc" : prev === "asc" ? "desc" : "",
    );
    setPage(1);
  }, []);

  // Bản nháp ô lọc gõ chữ — cập nhật UI ngay, chỉ đẩy vào `filters` (và gọi
  // API) sau khi ngừng gõ ~350ms, tránh gọi lại bảng mỗi lần gõ 1 ký tự.
  const [textFilterDrafts, setTextFilterDrafts] = useState(() => {
    const draft = {};
    TEXT_FILTER_KEYS.forEach((k) => (draft[k] = DEFAULT_FILTERS[k]));
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

  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const hasActiveFilter = useMemo(
    () => Object.values(filters).some((v) => !!v),
    [filters],
  );

  // Đếm lại tick này mỗi khi dữ liệu có thay đổi thật sự (import/xoá) ->
  // StatsDonut fetch lại thống kê. Không phụ thuộc filter đang gõ trên
  // bảng vì thống kê donut luôn phản ánh TOÀN BỘ dữ liệu.
  const [statsRefreshTick, setStatsRefreshTick] = useState(0);
  const bumpStatsRefresh = useCallback(
    () => setStatsRefreshTick((t) => t + 1),
    [],
  );

  // Bấm vào 1 lát donut / legend -> set filter trangThai của bảng; bấm lại
  // đúng lát đang chọn -> bỏ lọc (toggle).
  const handleTrangThaiToggle = useCallback((trangThai) => {
    setFilters((prev) => ({
      ...prev,
      trangThai: prev.trangThai === trangThai ? "" : trangThai,
    }));
    setPage(1);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await khuyenMaiService.getAllKhuyenMai({
        page,
        limit,
        ...filters,
        ...(sortOrder ? { sortBy: "slot", sortOrder } : {}),
      });
      const data = res?.data || res?.items || [];
      setItems(data);
      setTotal(Number(res?.total ?? data.length));
    } catch (err) {
      console.error("Lỗi tải dữ liệu tồn kho:", err);
      setError("Không tải được dữ liệu tồn kho.");
    } finally {
      setLoading(false);
    }
  }, [page, limit, filters, sortOrder]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxPage = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );

  return (
    <div className="mx-auto max-w-[1900px] space-y-4 p-4 md:p-6 bg-gradient-to-b from-slate-50 to-white min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-6 rounded-2xl bg-white/80 p-4 shadow-sm ring-1 ring-slate-200 backdrop-blur lg:flex-row lg:items-center lg:justify-between lg:gap-4">
        <div className="space-y-1 lg:flex-1 lg:min-w-0">
          <h1 className="bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 bg-clip-text text-2xl font-bold tracking-tight text-transparent">
            {title}
          </h1>
          <p className="text-sm text-slate-500">{description}</p>
        </div>

        {/* Donut co giãn theo màn hình, không bị ép cứng theo flex-1 của
            2 cột kia nên không tràn/cắt nhãn khi khối cha bị bó hẹp. */}
        <div className="flex justify-center lg:flex-shrink-0">
          <StatsDonut
            activeTrangThai={filters.trangThai}
            onSelect={handleTrangThaiToggle}
            refreshTrigger={statsRefreshTick}
          />
        </div>

        <div className="flex flex-wrap flex-shrink-0 items-center justify-center gap-2 lg:flex-1 lg:justify-end">
          <ExportTonKho filters={filters} />
          <ImportTonKho
            onImported={() => {
              fetchData();
              bumpStatsRefresh();
            }}
          />
          <DeleteAllTonKho
            onDeleted={() => {
              fetchData();
              bumpStatsRefresh();
            }}
            disabled={items.length === 0 && total === 0}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-2xl border border-slate-200 shadow-md ring-1 ring-slate-100">
        <table className="min-w-full text-xs md:text-sm border-separate border-spacing-0">
          <thead className="sticky top-0 z-10 bg-gradient-to-r from-slate-100 via-slate-50 to-slate-100 backdrop-blur">
            <tr className="border-b-2 border-slate-200">
              <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                SKU
              </th>
              <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                Tên sản phẩm
              </th>
              <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                <button
                  type="button"
                  onClick={toggleSortSlot}
                  className="flex items-center gap-1 hover:text-indigo-600 transition-colors"
                  title="Sắp xếp theo Vị trí"
                >
                  Vị trí
                  {sortOrder === "asc" && <ArrowUp size={12} />}
                  {sortOrder === "desc" && <ArrowDown size={12} />}
                  {sortOrder === "" && (
                    <ArrowUpDown size={12} className="text-slate-300" />
                  )}
                </button>
              </th>
              <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                LPN
              </th>
              <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                On Hand
              </th>
              <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                Available
              </th>
              <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                Allocate
              </th>
              <th className="px-3 py-2.5 text-right font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                On Hand MMS
              </th>
              <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                Trạng thái
              </th>
              <th className="px-3 py-2.5 text-left font-bold uppercase tracking-wide text-[11px] text-slate-500 whitespace-nowrap">
                TG import
              </th>
            </tr>

            {/* Hàng chứa ô lọc — mỗi cột 1 ô input riêng */}
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-3 py-1.5">
                <input
                  type="text"
                  value={textFilterDrafts.sku}
                  onChange={(e) =>
                    handleTextFilterChange("sku", e.target.value.toUpperCase())
                  }
                  placeholder="Lọc SKU..."
                  className={filterInputCls}
                />
              </th>
              <th className="px-3 py-1.5">
                <input
                  type="text"
                  value={textFilterDrafts.name}
                  onChange={(e) =>
                    handleTextFilterChange("name", e.target.value)
                  }
                  placeholder="Lọc tên..."
                  className={filterInputCls}
                />
              </th>
              <th className="px-3 py-1.5">
                <input
                  type="text"
                  value={textFilterDrafts.slot}
                  onChange={(e) =>
                    handleTextFilterChange("slot", e.target.value)
                  }
                  placeholder="Lọc vị trí..."
                  className={filterInputCls}
                />
              </th>
              <th className="px-3 py-1.5">
                <input
                  type="text"
                  value={textFilterDrafts.lpn}
                  onChange={(e) =>
                    handleTextFilterChange("lpn", e.target.value)
                  }
                  placeholder="Lọc LPN..."
                  className={filterInputCls}
                />
              </th>
              <th className="px-3 py-1.5" />
              <th className="px-3 py-1.5" />
              <th className="px-3 py-1.5" />
              <th className="px-3 py-1.5" />
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
                  startValue={filters.tuNgay}
                  endValue={filters.denNgay}
                  onChange={(start, end) => {
                    setFilters((prev) => ({
                      ...prev,
                      tuNgay: start,
                      denNgay: end,
                    }));
                    setPage(1);
                  }}
                  onClear={() => {
                    setFilters((prev) => ({
                      ...prev,
                      tuNgay: "",
                      denNgay: "",
                    }));
                    setPage(1);
                  }}
                />
              </th>
            </tr>
          </thead>

          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-slate-100">
                  {Array.from({ length: 10 }).map((__, j) => (
                    <td key={`sk-${i}-${j}`} className="px-3 py-3">
                      <div className="h-3 w-20 max-w-full animate-pulse rounded bg-gradient-to-r from-slate-200 to-slate-100" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && error && (
              <tr>
                <td
                  colSpan={10}
                  className="px-3 py-8 text-center text-rose-600 font-medium"
                >
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && items.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-6">
                  <EmptyState />
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              items.map((item) => {
                const isMismatch = item.trangThai === "Không Khớp";
                const isNoData = item.trangThai === "Không có DATA";
                return (
                  <tr
                    key={item._id}
                    className={`border-b border-slate-100 transition-colors hover:bg-blue-50/70 ${
                      isMismatch
                        ? "bg-rose-50/50 even:bg-rose-50/70"
                        : isNoData
                          ? "bg-slate-50/60 even:bg-slate-50/80"
                          : "even:bg-slate-50/40"
                    }`}
                  >
                    <td className="px-3 py-2 whitespace-nowrap font-semibold text-slate-800">
                      {item.sku}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{item.name}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                      {item.slot || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600">
                      {item.lpn || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-700">
                      {formatQty(item.luong_onhand)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {formatQty(item.luong_available)}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-600">
                      {formatQty(item.luong_allocate)}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-700">
                      {item.luong_mms !== "" ? (
                        formatQty(item.luong_mms)
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-semibold whitespace-nowrap ${
                          TRANG_THAI_STYLE[item.trangThai] ||
                          TRANG_THAI_STYLE["Không có DATA"]
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            TRANG_THAI_DOT[item.trangThai] ||
                            TRANG_THAI_DOT["Không có DATA"]
                          }`}
                        />
                        {item.trangThai}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-500">
                      {formatDateTime(item.thoi_gian_impport)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Tổng hợp lượng lệch theo bộ lọc — chỉ hiện khi đang lọc */}
      {hasActiveFilter && <FilterSummary filters={filters} />}

      {/* Pagination */}
      <div className="flex flex-col gap-3 rounded-xl bg-white/70 p-3 shadow-sm ring-1 ring-slate-200 md:flex-row md:items-center md:justify-between">
        <div className="text-sm text-slate-600">
          {hasActiveFilter && (
            <span className="mr-2 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-200">
              Đang lọc
            </span>
          )}
          Đang hiển thị <b className="text-blue-700">{items.length}</b> /{" "}
          <b className="text-slate-800">{total}</b> bản ghi
          {loading && (
            <Loader2
              size={14}
              className="ml-2 inline animate-spin text-blue-500"
            />
          )}
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
            {[20, 50, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n}/trang
              </option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={page === 1}
              className="h-10 px-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 ring-1 ring-indigo-200 shadow-sm transition-all hover:from-indigo-100 hover:to-purple-100 hover:shadow-md disabled:opacity-40"
            >
              ⏮
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md active:scale-95 disabled:opacity-40"
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
              className="h-10 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium shadow-sm transition-all hover:from-blue-700 hover:to-indigo-700 hover:shadow-md active:scale-95 disabled:opacity-40"
            >
              Sau
            </button>
            <button
              onClick={() => setPage(maxPage)}
              disabled={page >= maxPage}
              className="h-10 px-2 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-600 ring-1 ring-indigo-200 shadow-sm transition-all hover:from-indigo-100 hover:to-purple-100 hover:shadow-md disabled:opacity-40"
            >
              ⏭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoiChieuTonKho;
