/* eslint-disable react/prop-types */
import {
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { donHangService } from "@/services/phieusoan/donhang.service";

const EmptyState = ({
  title = "Không có dữ liệu",
  subtitle = "Nhập dữ liệu hoặc điều chỉnh bộ lọc để thấy kết quả.",
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="h-16 w-16 rounded-full bg-slate-100 ring-1 ring-slate-200 grid place-items-center">
      <div className="h-8 w-8 rounded-full bg-slate-200" />
    </div>
    <div className="mt-4 text-lg font-semibold text-slate-700">{title}</div>
    <p className="mt-1 text-slate-500 max-w-md text-sm">{subtitle}</p>
  </div>
);

const DonHangTable = forwardRef((props, ref) => {
  const { onProcessOrder } = props;

  // --- Filters & pagination ---
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // ✅ FILTERS khớp data
  const [store, setStore] = useState("");
  const [type, setType] = useState("");
  const [sodaTransfer, setSodaTransfer] = useState("");
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minLuong, setMinLuong] = useState("");
  const [maxLuong, setMaxLuong] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // State cho checkbox selection
  const [selectedRows, setSelectedRows] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [allData, setAllData] = useState([]); // Cache toàn bộ data khi chọn hết
  const [isLoadingAll, setIsLoadingAll] = useState(false);

  // ✅ Tối ưu: Memoize selectedSet để tránh tạo lại mỗi render
  const selectedSet = useMemo(() => new Set(selectedRows), [selectedRows]);

  // ✅ Chuẩn hoá keys + alias
  const normalizeDonHangRow = (raw) => {
    if (!raw || typeof raw !== "object") return raw;

    const lower = {};
    for (const [k, v] of Object.entries(raw)) {
      lower[k?.toString().trim().toLowerCase()] = v;
    }

    const store =
      lower.store ??
      lower["mach"] ??
      lower["ma_ch"] ??
      lower["mã cửa hàng"] ??
      lower["mã cửa hàng/ store"] ??
      raw.STORE;

    const type = lower.type ?? lower.loai ?? raw.TYPE;

    const soda_transfer =
      lower.soda_transfer ??
      lower.sodatransfer ??
      lower.sodtf ??
      lower["số sd/tf"] ??
      raw.SODA_TRANSFER;

    const sku = lower.sku ?? lower["mã sku"] ?? raw.SKU;

    const name = lower.name ?? lower.tenhang ?? lower["tên hàng"] ?? raw.NAME;

    const luong =
      lower.luong ??
      lower.qty ??
      lower.soluong ??
      lower["số lượng"] ??
      raw.LUONG;

    const ngay_import =
      lower.ngay_import ??
      lower.ngaytao ??
      lower["ngày tạo"] ??
      raw.NGAY_IMPORT;

    return {
      id: raw.id || raw._id,
      store,
      type,
      soda_transfer,
      sku,
      name,
      luong,
      ngay_import,
      _raw: raw,
    };
  };

  // Debounce search 350ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Build params for API - Tách riêng filter params để dễ quản lý
  const filterParams = useMemo(
    () => ({
      store: store.trim(),
      type: type.trim(),
      soda_transfer: sodaTransfer.trim(),
      sku: sku.trim(),
      name: name.trim(),
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      minLuong: minLuong !== "" ? Number(minLuong) : undefined,
      maxLuong: maxLuong !== "" ? Number(maxLuong) : undefined,
      search: debouncedSearch,
    }),
    [
      store,
      type,
      sodaTransfer,
      sku,
      name,
      startDate,
      endDate,
      minLuong,
      maxLuong,
      debouncedSearch,
    ]
  );

  const params = useMemo(
    () => ({
      page,
      limit,
      ...filterParams,
    }),
    [page, limit, filterParams]
  );

  // Fetch đơn hàng
  const fetchDonHang = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await donHangService.getAllDonHang(params);

      console.log("🔍 API Response:", res); // Debug

      // Lấy data từ response
      const data = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : [];

      const normalized = data.map(normalizeDonHangRow);
      setRows(normalized);

      // ✅ FIX: Đọc đúng từ pagination.totalDocuments
      const totalCount =
        Number(res?.pagination?.totalDocuments) ||
        Number(res?.pagination?.total) ||
        Number(res?.total) ||
        Number(res?.count) ||
        Number(res?.totalCount) ||
        normalized.length;

      setTotal(totalCount);

      console.log("✅ Pagination Info:", {
        totalRecords: totalCount,
        currentPage: page,
        limit: limit,
        recordsOnPage: normalized.length,
        expectedRecords: Math.min(limit, totalCount - (page - 1) * limit),
      });

      // ⚠️ WARNING: Kiểm tra nếu số records trả về không đúng
      const expectedRecords = Math.min(
        limit,
        Math.max(0, totalCount - (page - 1) * limit)
      );
      if (normalized.length !== expectedRecords && totalCount > 0) {
        console.warn("⚠️ Backend trả về sai số lượng records!", {
          expected: expectedRecords,
          received: normalized.length,
          limit: limit,
          page: page,
          total: totalCount,
        });
      }
    } catch (e) {
      console.error("❌ Lỗi fetchDonHang:", e);
      setError("Không tải được dữ liệu Đơn Hàng.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch tất cả data
  const fetchAllData = async () => {
    setIsLoadingAll(true);
    try {
      // ✅ Gọi API với limit lớn để lấy hết data
      const allParams = {
        ...filterParams,
        limit: 999999,
        page: 1,
      };

      console.log("🔄 Fetching all data with params:", allParams);

      const res = await donHangService.getAllDonHang(allParams);

      const data = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : [];

      const normalized = data.map(normalizeDonHangRow);

      console.log("✅ Fetched all data:", {
        totalFetched: normalized.length,
        expectedTotal: total,
      });

      setAllData(normalized);
      return normalized;
    } catch (e) {
      console.error("❌ Lỗi fetchAllData:", e);
      return [];
    } finally {
      setIsLoadingAll(false);
    }
  };

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    fetchDonHang,
    refresh: fetchDonHang,
  }));

  useEffect(() => {
    fetchDonHang();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  // Reset selection CHỈ KHI FILTER thay đổi (không reset khi đổi trang)
  useEffect(() => {
    setSelectedRows([]);
    setSelectAll(false);
    setAllData([]);
  }, [filterParams]);

  const resetFilters = () => {
    setPage(1);
    setLimit(20);
    setStore("");
    setType("");
    setSodaTransfer("");
    setSku("");
    setName("");
    setStartDate("");
    setEndDate("");
    setMinLuong("");
    setMaxLuong("");
    setSearch("");
    setSelectedRows([]);
    setSelectAll(false);
    setAllData([]);
  };

  // Xử lý chọn tất cả - FETCH HẾT DATA
  const handleSelectAll = async (checked) => {
    if (!checked) {
      setSelectAll(false);
      setSelectedRows([]);
      setAllData([]);
      return;
    }

    setSelectAll(true);

    // Fetch tất cả data nếu chưa có
    let allRecords = allData;
    if (allRecords.length === 0) {
      allRecords = await fetchAllData();
    }

    // Chọn tất cả ID
    setSelectedRows(allRecords.map((row) => row.id || row._id));
  };

  // ✅ Tối ưu: Xử lý chọn từng dòng với callback memoized
  const handleSelectRow = useCallback((rowId, checked) => {
    if (checked) {
      setSelectedRows((prev) => [...prev, rowId]);
    } else {
      setSelectedRows((prev) => prev.filter((id) => id !== rowId));
      setSelectAll(false);
    }
  }, []);

  // ✅ Tối ưu: Dùng Set để lookup O(1) thay vì array.includes O(n)
  const handleProcessOrders = () => {
    // Nếu đã chọn tất cả và có allData, dùng allData
    // Nếu không thì lọc từ rows hiện tại
    const dataSource = selectAll && allData.length > 0 ? allData : rows;

    // ✅ OPTIMIZATION: Dùng Set cho lookup nhanh O(1)
    const selectedSet = new Set(selectedRows);

    // ✅ OPTIMIZATION: Filter với Set lookup
    const selectedData = dataSource.filter((row) =>
      selectedSet.has(row.id || row._id)
    );

    if (onProcessOrder && typeof onProcessOrder === "function") {
      onProcessOrder(selectedData);
    }
  };

  // Định nghĩa cột
  const columns = [
    { key: "store", label: "Mã Cửa Hàng" },
    { key: "type", label: "Loại" },
    { key: "soda_transfer", label: "Số SD/TF" },
    { key: "sku", label: "SKU" },
    { key: "name", label: "Tên Hàng" },
    { key: "luong", label: "Lượng" },
    { key: "ngay_import", label: "Ngày tạo" },
  ];

  const maxPage = Math.max(1, Math.ceil(total / limit));

  // Helpers
  const formatDate = (dateValue) => {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return dateValue;
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date);
    } catch {
      return dateValue;
    }
  };

  const formatNumber = (value) => {
    if (value === null || value === undefined || value === "") return "";
    const n = Number(value);
    return isNaN(n) ? String(value) : n.toLocaleString("vi-VN");
  };

  // Quick ranges
  const setLastNDays = (n) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - (n - 1));
    const toISO = (d) => d.toISOString().slice(0, 10);
    setStartDate(toISO(start));
    setEndDate(toISO(end));
    setPage(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-slate-800">
            Danh sách Đơn hàng
          </h2>
          {selectAll && (
            <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
              {isLoadingAll ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Đang tải tất cả đơn hàng...
                </>
              ) : (
                <>Đã chọn tất cả {total.toLocaleString("vi-VN")} đơn hàng</>
              )}
            </p>
          )}
        </div>
        <button
          onClick={handleProcessOrders}
          disabled={selectedRows.length === 0}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none transition-all duration-200"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            />
          </svg>
          XLĐH ({selectedRows.length.toLocaleString("vi-VN")})
        </button>
      </div>

      {/* Filter card */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-4 md:p-5 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-8 gap-3">
          <div className="relative md:col-span-2">
            <input
              value={store}
              onChange={(e) => {
                setPage(1);
                setStore(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 focus:ring-2 focus:ring-slate-200 outline-none shadow-sm placeholder:text-slate-400"
              placeholder="Mã cửa hàng (vd: 001, 2A...)"
            />
          </div>

          <div className="relative">
            <input
              value={type}
              onChange={(e) => {
                setPage(1);
                setType(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 focus:ring-2 focus:ring-slate-200 outline-none shadow-sm placeholder:text-slate-400"
              placeholder="Loại (vd: SD, TF...)"
            />
          </div>

          <div className="relative md:col-span-2">
            <input
              value={sodaTransfer}
              onChange={(e) => {
                setPage(1);
                setSodaTransfer(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 focus:ring-2 focus:ring-slate-200 outline-none shadow-sm placeholder:text-slate-400"
              placeholder="Số SD/TF"
            />
          </div>

          <div className="relative">
            <input
              value={sku}
              onChange={(e) => {
                setPage(1);
                setSku(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 focus:ring-2 focus:ring-slate-200 outline-none shadow-sm placeholder:text-slate-400"
              placeholder="SKU"
            />
          </div>

          <div className="relative md:col-span-2">
            <input
              value={name}
              onChange={(e) => {
                setPage(1);
                setName(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 focus:ring-2 focus:ring-slate-200 outline-none shadow-sm placeholder:text-slate-400"
              placeholder="Tên hàng"
            />
          </div>
        </div>

        {/* Quick chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Phím nhanh:</span>
          {[
            { label: "Hôm nay", on: () => setLastNDays(1) },
            { label: "7 ngày", on: () => setLastNDays(7) },
            { label: "30 ngày", on: () => setLastNDays(30) },
          ].map((c) => (
            <button
              key={c.label}
              onClick={() => {
                c.on();
              }}
              className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 ring-1 ring-slate-200 hover:bg-slate-200"
            >
              {c.label}
            </button>
          ))}
          <button
            onClick={resetFilters}
            className="ml-auto rounded-xl bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-2xl border border-slate-200 shadow-sm">
        <table className="min-w-full text-xs md:text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur">
            <tr className="border-b border-slate-200">
              <th className="px-3 py-2 w-12">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                  disabled={isLoadingAll}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </th>
              <th className="px-3 py-2 text-left font-semibold text-slate-700">
                #
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: 6 }).map((_, i) => (
                <tr key={`skeleton-${i}`} className="border-b border-slate-100">
                  <td className="px-3 py-3">
                    <div className="h-4 w-4 animate-pulse rounded bg-slate-200" />
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 w-8 animate-pulse rounded bg-slate-200" />
                  </td>
                  {columns.map((col, j) => (
                    <td key={`sk-${i}-${j}`} className="px-3 py-3">
                      <div className="h-3 w-28 max-w-full animate-pulse rounded bg-slate-200" />
                    </td>
                  ))}
                </tr>
              ))}

            {!loading && error && (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="px-3 py-8 text-center text-rose-600"
                >
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && rows?.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2} className="px-3 py-6">
                  <EmptyState />
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              rows?.length > 0 &&
              rows.map((row, idx) => {
                const rowId = row.id || row._id || idx;
                const isSelected = selectedSet.has(rowId);

                return (
                  <tr
                    key={rowId}
                    className={`border-b border-slate-100 hover:bg-blue-200 transition-colors ${
                      isSelected ? "bg-blue-50" : "even:bg-slate-50/60"
                    }`}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) =>
                          handleSelectRow(rowId, e.target.checked)
                        }
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className="px-3 py-2 whitespace-nowrap text-slate-700"
                      >
                        {col.key === "ngay_import"
                          ? formatDate(row?.[col.key])
                          : col.key === "luong"
                          ? formatNumber(row?.[col.key])
                          : String(row?.[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Footer / pagination */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <div className="text-sm text-slate-600">
          Trang {page}: Đang hiển thị <b>{rows.length}</b> / Tổng <b>{total}</b>{" "}
          bản ghi
          {selectedRows.length > 0 && (
            <span className="ml-2 text-blue-600">
              (Đã chọn: <b>{selectedRows.length}</b>)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => {
              const newLimit = Number(e.target.value);
              console.log("Changing limit to:", newLimit);
              setLimit(newLimit);
              setPage(1);
            }}
            className="h-10 rounded-xl border border-slate-300 px-3"
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
              className="h-10 px-2 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50 hover:bg-slate-100"
            >
              ⏮
            </button>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-10 px-3 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
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
                const newPage = Math.min(Math.max(1, v), maxPage);
                console.log("Changing page to:", newPage);
                setPage(newPage);
              }}
              className="h-10 w-16 rounded-xl border border-slate-300 px-2 text-center focus:ring-2 focus:ring-slate-200 outline-none"
            />
            <span className="px-1 text-sm text-slate-600">/ {maxPage}</span>
            <button
              onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              disabled={page >= maxPage}
              className="h-10 px-3 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-2 focus-visible:ring-slate-200"
            >
              Sau
            </button>
            <button
              onClick={() => setPage(maxPage)}
              disabled={page >= maxPage}
              className="h-10 px-2 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50 hover:bg-slate-100"
            >
              ⏭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

DonHangTable.displayName = "DonHangTable";
export default DonHangTable;
