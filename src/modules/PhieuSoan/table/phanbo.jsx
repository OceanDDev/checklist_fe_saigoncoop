/* eslint-disable react/prop-types */
import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import { DateRange } from "react-date-range";
import dayjs from "dayjs";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";
import { phanBoService } from "@/services/phieusoan/phanbo.service";
import ImportPhanBo from "./component/phanbo/importphanbo";
import ExportDataloadButton from "./component/phanbo/exportdataload";
import ImportSdTf from "./component/phanbo/importsdtf";

// ── Cấu hình trạng thái ───────────────────────────────────────────────────────
const TRANG_THAI_CONFIG = {
  cho_xu_li: {
    label: "Chờ xử lý",
    bg: "bg-amber-100",
    text: "text-amber-700",
    ring: "ring-amber-200",
    dot: "bg-amber-400",
  },
dang_xu_li: {
    label: "Đang xử lý",
    bg: "bg-blue-100",
    text: "text-blue-700",
    ring: "ring-blue-200",
    dot: "bg-blue-500",
  },
  da_xu_li: {
    label: "Đã xử lý",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    dot: "bg-emerald-500",
  },
};

const FORMAT_DATE = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

// ── Sub-components ────────────────────────────────────────────────────────────
const TrangThaiBadge = ({ value }) => {
  const cfg = TRANG_THAI_CONFIG[value] ?? TRANG_THAI_CONFIG.cho_xu_li;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

const EmptyState = () => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="h-16 w-16 rounded-full bg-slate-100 ring-1 ring-slate-200 grid place-items-center">
      <div className="h-8 w-8 rounded-full bg-slate-200" />
    </div>
    <div className="mt-4 text-lg font-semibold text-slate-700">
      Không có dữ liệu
    </div>
    <p className="mt-1 text-slate-500 max-w-md text-sm">
      Nhập dữ liệu hoặc điều chỉnh bộ lọc để thấy kết quả.
    </p>
  </div>
);

const FilterInput = ({ value, onChange }) => (
  <input
    type="text"
    value={value}
    onChange={onChange}
    placeholder="Lọc..."
    className="w-full h-7 px-2 text-xs rounded border border-slate-300 focus:ring-1 focus:ring-blue-300 outline-none"
  />
);

// DateRange picker dùng lại được
const DateRangeFilter = ({ dateRange, setDateRange, setPage }) => {
  const [showCalendar, setShowCalendar] = useState(false);
  return (
    <div className="relative">
      <input
        readOnly
        onClick={() => setShowCalendar((v) => !v)}
        value={
          dateRange[0].startDate && dateRange[0].endDate
            ? `${dayjs(dateRange[0].startDate).format("DD/MM/YY")} - ${dayjs(dateRange[0].endDate).format("DD/MM/YY")}`
            : ""
        }
        placeholder="📅 Chọn ngày..."
        className="w-full h-7 px-2 text-xs rounded border border-slate-300 focus:ring-1 focus:ring-blue-300 outline-none cursor-pointer"
      />
      {showCalendar && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowCalendar(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-50 bg-white shadow-2xl rounded-lg border border-slate-200">
            <DateRange
              ranges={dateRange}
              onChange={(item) => {
                setDateRange([item.selection]);
                setPage(1);
              }}
              moveRangeOnFirstSelection={false}
              maxDate={new Date()}
            />
            <div className="flex justify-end px-3 pb-2">
              <button
                onClick={() => {
                  setDateRange([
                    { startDate: null, endDate: null, key: "selection" },
                  ]);
                  setShowCalendar(false);
                }}
                className="text-xs text-rose-500 hover:text-rose-700 px-2 py-1 rounded hover:bg-rose-50"
              >
                Xóa bộ lọc
              </button>
              <button
                onClick={() => setShowCalendar(false)}
                className="ml-2 text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
              >
                Xong
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

// ── Hooks ─────────────────────────────────────────────────────────────────────
const useDebounce = (value, delay = 350) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
};

// ─── Main Table ───────────────────────────────────────────────────────────────
const PhanBoTable = forwardRef((_, ref) => {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // ── Raw filter state ─────────────────────────────────────────────────────
  const [filterTenPhanBo, setFilterTenPhanBo] = useState("");
  const [filterSdTf, setFilterSdTf] = useState("");
  const [filterMaCH, setFilterMaCH] = useState("");
  const [filterTenCH, setFilterTenCH] = useState("");
  const [filterTrangThai, setFilterTrangThai] = useState("");
  const [filterSku, setFilterSku] = useState("");
  const [filterName, setFilterName] = useState("");
  const [filterLuongPB, setFilterLuongPB] = useState("");

  // Ngày Import
  const [dateRange, setDateRange] = useState([
    { startDate: null, endDate: null, key: "selection" },
  ]);

  // Ngày Xử Lý ← mới
  const [dateRangeXuLi, setDateRangeXuLi] = useState([
    { startDate: null, endDate: null, key: "selection" },
  ]);

  // ── Debounced values ─────────────────────────────────────────────────────
  const dTenPhanBo = useDebounce(filterTenPhanBo);
  const dSdTf = useDebounce(filterSdTf);
  const dMaCH = useDebounce(filterMaCH);
  const dTenCH = useDebounce(filterTenCH);
  const dSku = useDebounce(filterSku);
  const dName = useDebounce(filterName);
  const dLuongPB = useDebounce(filterLuongPB);

  const dStartDate = useDebounce(
    dateRange[0].startDate
      ? dayjs(dateRange[0].startDate).format("YYYY-MM-DD")
      : "",
  );
  const dEndDate = useDebounce(
    dateRange[0].endDate
      ? dayjs(dateRange[0].endDate).format("YYYY-MM-DD")
      : "",
  );

  // ← mới
  const dStartNgayXuLi = useDebounce(
    dateRangeXuLi[0].startDate
      ? dayjs(dateRangeXuLi[0].startDate).format("YYYY-MM-DD")
      : "",
  );
  const dEndNgayXuLi = useDebounce(
    dateRangeXuLi[0].endDate
      ? dayjs(dateRangeXuLi[0].endDate).format("YYYY-MM-DD")
      : "",
  );

  // ── Data state ───────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [selectedRows, setSelectedRows] = useState([]);

  const selectedIds = useMemo(
    () => new Set(selectedRows.map((r) => r._id)),
    [selectedRows],
  );

  // ── Derived ──────────────────────────────────────────────────────────────
  const hasActiveFilter = useMemo(
    () =>
      !!(
        dTenPhanBo ||
        dSdTf ||
        dMaCH ||
        dTenCH ||
        filterTrangThai ||
        dStartDate ||
        dEndDate ||
        dSku ||
        dName ||
        dLuongPB ||
        dStartNgayXuLi ||
        dEndNgayXuLi // ← mới
      ),
    [
      dTenPhanBo,
      dSdTf,
      dMaCH,
      dTenCH,
      filterTrangThai,
      dStartDate,
      dEndDate,
      dSku,
      dName,
      dLuongPB,
      dStartNgayXuLi,
      dEndNgayXuLi,
    ],
  );

  useEffect(() => {
    if (hasActiveFilter) {
      setLimit(9999);
      setPage(1);
    } else setLimit(20);
  }, [hasActiveFilter]);

  const params = useMemo(
    () => ({
      page,
      limit,
      search: [dTenPhanBo, dSdTf, dMaCH, dTenCH].filter(Boolean).join(" "),
      trang_thai: filterTrangThai,
      ten_phan_bo: dTenPhanBo,
      sd_tf: dSdTf,
      mach: dMaCH,
      tench: dTenCH,
      startDate: dStartDate,
      endDate: dEndDate,
      startNgayXuLi: dStartNgayXuLi, // ← mới
      endNgayXuLi: dEndNgayXuLi, // ← mới
      sku: dSku,
      name: dName,
      luong_phan_bo: dLuongPB,
    }),
    [
      page,
      limit,
      dTenPhanBo,
      dSdTf,
      dMaCH,
      dTenCH,
      filterTrangThai,
      dStartDate,
      dEndDate,
      dStartNgayXuLi,
      dEndNgayXuLi,
      dSku,
      dName,
      dLuongPB,
    ],
  );

  // ── Fetch ────────────────────────────────────────────────────────────────
  const fetchPhanBo = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await phanBoService.getAllPhanBo(params);
      const data = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : [];
      setRows(data);
      setTotal(Number(res?.pagination?.total ?? res?.total ?? data.length));
    } catch {
      setError("Không tải được dữ liệu Phân Bổ.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  useEffect(() => {
    fetchPhanBo();
  }, [fetchPhanBo]);

  useImperativeHandle(
    ref,
    () => ({
      fetchPhanBo,
      getSelectedRows: () => selectedRows,
      clearSelection: () => setSelectedRows([]),
    }),
    [fetchPhanBo, selectedRows],
  );

  // ── Checkbox logic ───────────────────────────────────────────────────────
  const isAllSelected =
    rows.length > 0 && rows.every((r) => selectedIds.has(r._id));
  const isSomeSelected =
    rows.some((r) => selectedIds.has(r._id)) && !isAllSelected;

  const toggleAll = useCallback(() => {
    if (isAllSelected) {
      setSelectedRows((prev) =>
        prev.filter((r) => !rows.some((row) => row._id === r._id)),
      );
    } else {
      setSelectedRows((prev) => {
        const existingIds = new Set(prev.map((r) => r._id));
        return [...prev, ...rows.filter((r) => !existingIds.has(r._id))];
      });
    }
  }, [isAllSelected, rows]);

  const toggleRow = useCallback((row) => {
    setSelectedRows((prev) =>
      prev.some((r) => r._id === row._id)
        ? prev.filter((r) => r._id !== row._id)
        : [...prev, row],
    );
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const resetFilters = useCallback(() => {
    setPage(1);
    setLimit(20);
    setFilterTenPhanBo("");
    setFilterSdTf("");
    setFilterMaCH("");
    setFilterTenCH("");
    setFilterTrangThai("");
    setFilterSku("");
    setFilterName("");
    setFilterLuongPB("");
    setDateRange([{ startDate: null, endDate: null, key: "selection" }]);
    setDateRangeXuLi([{ startDate: null, endDate: null, key: "selection" }]); // ← mới
  }, []);

  const handleDeleteAll = useCallback(async () => {
    if (
      !window.confirm(
        "⚠️ Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu phân bổ không?\nHành động này không thể hoàn tác!",
      )
    )
      return;
    try {
      const res = await phanBoService.deleteAllPhanBo();
      alert(res?.message || "Đã xóa toàn bộ dữ liệu phân bổ!");
      fetchPhanBo();
    } catch {
      alert("Không thể xóa toàn bộ dữ liệu. Vui lòng thử lại.");
    }
  }, [fetchPhanBo]);

  const formatDate = useCallback((val) => {
    if (!val) return "";
    try {
      const d = new Date(val);
      return isNaN(d.getTime()) ? val : FORMAT_DATE.format(d);
    } catch {
      return val;
    }
  }, []);

  const maxPage = Math.max(1, Math.ceil(total / limit));
  const mkChange = (setter) => (e) => {
    setPage(1);
    setter(e.target.value);
  };

  // Tổng số cột = 14 (checkbox + # + 10 cột data + ngay_import + ngay_xu_li + trang_thai)
  const COL_SPAN = 14;

  return (
    <div className="space-y-4">
      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 flex-wrap">
          <button
            onClick={resetFilters}
            className="h-10 rounded-xl bg-white px-4 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 whitespace-nowrap text-sm transition-colors"
          >
            Làm mới
          </button>
          <ImportPhanBo onImportSuccess={fetchPhanBo} />
          <ImportSdTf onImportSuccess={fetchPhanBo} />
          <ExportDataloadButton
            selectedRows={selectedRows}
            fileName="phan_bo_dataload"
            onExportSuccess={() => {
              fetchPhanBo();
              setSelectedRows([]);
            }}
          />
          <button
            onClick={handleDeleteAll}
            className="h-10 rounded-xl bg-rose-600 px-4 text-white hover:bg-rose-700 whitespace-nowrap font-medium text-sm transition-colors"
          >
            🗑️ Xóa toàn bộ
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>
              Tổng: <b>{total}</b> SKU
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-600">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span>
              Trang này: <b>{rows.length}</b>
            </span>
          </div>
          {selectedRows.length > 0 && (
            <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-1 rounded-lg ring-1 ring-blue-200">
              <span>
                ✅ Đã chọn: <b>{selectedRows.length}</b> dòng
              </span>
              <button
                onClick={() => setSelectedRows([])}
                className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 ml-1"
              >
                Bỏ chọn
              </button>
            </div>
          )}
          {hasActiveFilter && (
            <div className="flex items-center gap-2 text-blue-600">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                />
              </svg>
              <span className="font-medium">
                Đang lọc: <b>{rows.length}</b> / <b>{total}</b> kết quả
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <div className="overflow-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="min-w-full text-xs md:text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            {/* Header row */}
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2.5 w-9">
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = isSomeSelected;
                  }}
                  onChange={toggleAll}
                  className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                />
              </th>
              {[
                "#",
                "Tên Phân Bổ",
                "SD_TF",
                "Mã CH",
                "Tên Cửa Hàng",
                "SKU",
                "Tên Hàng",
                "Quy Cách",
                "Lượng PB",
                "Số Thùng",
                "Ngày Import",
                "Ngày Xử Lý",
                "Trạng Thái",
              ].map((h) => (
                <th
                  key={h}
                  className="px-3 py-2.5 text-left font-semibold text-slate-700 whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>

            {/* Filter row */}
            <tr className="border-b border-slate-200 bg-slate-100/50">
              <th className="px-3 py-1" /> {/* checkbox */}
              <th className="px-3 py-1" /> {/* # */}
              <th className="px-3 py-1">
                <FilterInput
                  value={filterTenPhanBo}
                  onChange={mkChange(setFilterTenPhanBo)}
                />
              </th>
              <th className="px-3 py-1">
                <FilterInput
                  value={filterSdTf}
                  onChange={mkChange(setFilterSdTf)}
                />
              </th>
              <th className="px-3 py-1">
                <FilterInput
                  value={filterMaCH}
                  onChange={mkChange(setFilterMaCH)}
                />
              </th>
              <th className="px-3 py-1">
                <FilterInput
                  value={filterTenCH}
                  onChange={mkChange(setFilterTenCH)}
                />
              </th>
              <th className="px-3 py-1">
                <FilterInput
                  value={filterSku}
                  onChange={mkChange(setFilterSku)}
                />
              </th>
              <th className="px-3 py-1">
                <FilterInput
                  value={filterName}
                  onChange={mkChange(setFilterName)}
                />
              </th>
              <th className="px-3 py-1" /> {/* Quy Cách — không filter */}
              <th className="px-3 py-1">
                <FilterInput
                  value={filterLuongPB}
                  onChange={mkChange(setFilterLuongPB)}
                />
              </th>
              <th className="px-3 py-1" /> {/* Số Thùng — không filter */}
              {/* Ngày Import */}
              <th className="px-3 py-1">
                <DateRangeFilter
                  dateRange={dateRange}
                  setDateRange={setDateRange}
                  setPage={setPage}
                />
              </th>
              {/* Ngày Xử Lý ← mới */}
              <th className="px-3 py-1">
                <DateRangeFilter
                  dateRange={dateRangeXuLi}
                  setDateRange={setDateRangeXuLi}
                  setPage={setPage}
                />
              </th>
              {/* Trạng Thái */}
              <th className="px-3 py-1">
                <select
                  value={filterTrangThai}
                  onChange={(e) => {
                    setPage(1);
                    setFilterTrangThai(e.target.value);
                  }}
                  className="w-full h-7 px-2 text-xs rounded border border-slate-300 focus:ring-1 focus:ring-blue-300 outline-none"
                >
                  <option value="">Tất cả</option>
                  {Object.entries(TRANG_THAI_CONFIG).map(([k, cfg]) => (
                    <option key={k} value={k}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </th>
            </tr>
          </thead>

          <tbody>
            {/* Skeleton */}
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-slate-100">
                  {Array.from({ length: COL_SPAN }).map((__, j) => (
                    <td key={j} className="px-3 py-3">
                      <div className="h-3 w-24 max-w-full animate-pulse rounded bg-slate-200" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && error && (
              <tr>
                <td
                  colSpan={COL_SPAN}
                  className="px-3 py-8 text-center text-rose-600"
                >
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={COL_SPAN} className="px-3 py-6">
                  <EmptyState />
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              rows.map((row, idx) => {
                const isChecked = selectedIds.has(row._id);
                const soThung =
                  row.pack > 0
                    ? (Number(row.luong_phan_bo) / row.pack).toLocaleString(
                        "vi-VN",
                      )
                    : "-";

                return (
                  <tr
                    key={row._id ?? idx}
                    className={`border-b border-slate-100 transition-colors ${
                      isChecked
                        ? "bg-blue-50 hover:bg-blue-100"
                        : "even:bg-slate-50/60 hover:bg-slate-50"
                    }`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleRow(row)}
                        className="w-4 h-4 rounded accent-blue-600 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2 text-slate-400 text-xs">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="px-3 py-2 font-medium text-slate-800 whitespace-nowrap">
                      {row.ten_phan_bo}
                    </td>
                    <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                      {row.sd_tf || "-"}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                      {row.mach}
                    </td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">
                      {row.tench}
                    </td>
                    <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">
                      {row.sku}
                    </td>
                    <td className="px-3 py-2 text-slate-700">{row.name}</td>
                    <td className="px-3 py-2 text-center text-slate-600">
                      {row.pack}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-emerald-700">
                      {Number(row.luong_phan_bo).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-3 py-2 text-right text-slate-500">
                      {soThung}
                    </td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                      {formatDate(row.ngay_import)}
                    </td>
                    {/* Ngày Xử Lý ← mới */}
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                      {row.ngay_xu_li ? formatDate(row.ngay_xu_li) : "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <TrangThaiBadge value={row.trang_thai} />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {!hasActiveFilter ? (
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
          <div className="text-sm text-slate-600">
            Đang hiển thị <b>{rows.length}</b> / <b>{total}</b> SKU
          </div>
          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setPage(1);
                setLimit(Number(e.target.value));
              }}
              className="h-10 rounded-xl border border-slate-300 px-3 text-sm"
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
                className="h-10 px-2 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                ⏮
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="h-10 px-3 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50 hover:bg-slate-50 text-sm transition-colors"
              >
                Trước
              </button>
              <span className="px-2 text-sm text-slate-600">Trang</span>
              <input
                type="number"
                min={1}
                max={maxPage}
                value={page}
                onChange={(e) =>
                  setPage(
                    Math.min(Math.max(1, Number(e.target.value || 1)), maxPage),
                  )
                }
                className="h-10 w-16 rounded-xl border border-slate-300 px-2 text-center text-sm focus:ring-2 focus:ring-blue-200 outline-none"
              />
              <span className="px-1 text-sm text-slate-600">/ {maxPage}</span>
              <button
                onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                disabled={page >= maxPage}
                className="h-10 px-3 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50 hover:bg-slate-50 text-sm transition-colors"
              >
                Sau
              </button>
              <button
                onClick={() => setPage(maxPage)}
                disabled={page >= maxPage}
                className="h-10 px-2 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50 hover:bg-slate-50 transition-colors"
              >
                ⏭
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3 text-sm py-4 px-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            <span className="font-medium text-slate-700">
              Đang lọc: Hiển thị <b className="text-blue-600">{rows.length}</b>{" "}
              / <b className="text-slate-800">{total}</b> kết quả
            </span>
          </div>
          {total > 1000 && (
            <span className="text-xs text-orange-600 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
              ⚠️ Quá nhiều kết quả, hãy thu hẹp bộ lọc
            </span>
          )}
        </div>
      )}
    </div>
  );
});

PhanBoTable.displayName = "PhanBoTable";
export default PhanBoTable;
