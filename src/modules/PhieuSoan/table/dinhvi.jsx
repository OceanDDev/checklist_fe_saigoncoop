/* eslint-disable react/prop-types */
import {
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { dinhViService } from "@/services/phieusoan/dinhvi.service";

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

const DinhViTable = forwardRef((props, ref) => {
  // --- Filters & pagination ---
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [slot, setSlot] = useState("");
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [pack, setPack] = useState("");
  const [maNCC, setMaNCC] = useState("");
  const [maNH, setMaNH] = useState("");
  const [Dept, setDept] = useState("");
  const [SubDept, setSubDept] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);

  // Debounce search 350ms
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Build params for API
  const params = useMemo(
    () => ({
      page,
      limit,
      slot,
      sku,
      name,
      pack,
      maNCC,
      maNH,
      Dept,
      SubDept,
      search: debouncedSearch,
    }),
    [
      page,
      limit,
      slot,
      sku,
      name,
      pack,
      maNCC,
      maNH,
      Dept,
      SubDept,
      debouncedSearch,
    ]
  );

  const fetchDinhVi = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await dinhViService.getAllDinhVi(params);
      const data = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
        ? res.data
        : [];
      setRows(data);
      setTotal(Number(res?.pagination?.total ?? res?.total ?? data.length));
    } catch (e) {
      console.error(e);
      setError("Không tải được dữ liệu Định Vị.");
    } finally {
      setLoading(false);
    }
  };

  // Expose fetchDinhVi method to parent via ref
  useImperativeHandle(ref, () => ({
    fetchDinhVi,
  }));

  useEffect(() => {
    fetchDinhVi();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const resetFilters = () => {
    setPage(1);
    setLimit(20);
    setSlot("");
    setSku("");
    setName("");
    setPack("");
    setMaNCC("");
    setMaNH("");
    setDept("");
    setSubDept("");
    setSearch("");
  };

  // Định nghĩa các cột cố định
  const columns = [
    { key: "maNCC", label: "Mã NCC" },
    { key: "maNH", label: "Mã NH" },
    { key: "Dept", label: "Dept" },
    { key: "SubDept", label: "Sub Dept" },
    { key: "slot", label: "Slot" },
    { key: "sku", label: "SKU" },
    { key: "name", label: "Tên hàng" },
    { key: "pack", label: "Quy cách" },
    { key: "loaiHinh", label: "Loại hình" },
    { key: "ngay_import", label: "Ngày Import" },
  ];

  const maxPage = Math.max(1, Math.ceil(total / limit));

  // Format ngày tháng (chỉ hiển thị ngày)
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

  return (
    <div className="space-y-4">
      {/* Filter card */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-4 md:p-5 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="relative">
            <input
              value={maNCC}
              onChange={(e) => {
                setPage(1);
                setMaNCC(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 focus:ring-2 focus:ring-slate-200 outline-none shadow-sm placeholder:text-slate-400"
              placeholder="Mã NCC"
            />
          </div>
          <div className="relative">
            <input
              value={maNH}
              onChange={(e) => {
                setPage(1);
                setMaNH(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 focus:ring-2 focus:ring-slate-200 outline-none shadow-sm placeholder:text-slate-400"
              placeholder="Mã NH"
            />
          </div>
          <div className="relative">
            <input
              value={Dept}
              onChange={(e) => {
                setPage(1);
                setDept(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 focus:ring-2 focus:ring-slate-200 outline-none shadow-sm placeholder:text-slate-400"
              placeholder="Dept"
            />
          </div>
          <div className="relative">
            <input
              value={SubDept}
              onChange={(e) => {
                setPage(1);
                setSubDept(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 focus:ring-2 focus:ring-slate-200 outline-none shadow-sm placeholder:text-slate-400"
              placeholder="Sub Dept"
            />
          </div>
          <div className="relative">
            <input
              value={slot}
              onChange={(e) => {
                setPage(1);
                setSlot(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 focus:ring-2 focus:ring-slate-200 outline-none shadow-sm placeholder:text-slate-400"
              placeholder="Slot"
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
          <div className="relative">
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
          <div className="relative">
            <input
              value={pack}
              onChange={(e) => {
                setPage(1);
                setPack(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-slate-300 px-3 focus:ring-2 focus:ring-slate-200 outline-none shadow-sm placeholder:text-slate-400"
              placeholder="Quy cách (Pack)"
            />
          </div>

          <div className="md:col-span-2 relative">
            <input
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
              className="h-10 w-full rounded-xl border border-slate-300 pl-3 pr-10 focus:ring-2 focus:ring-slate-200 outline-none"
              placeholder="Tìm kiếm nhanh (debounce 350ms)"
            />
          </div>
        </div>

        {/* Quick chips */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Phím nhanh:</span>
          {[
            { label: "Slot trống", on: () => setSlot("-") },
            { label: "SKU rỗng", on: () => setSku("") },
            { label: "Pack thùng", on: () => setPack("THUNG") },
          ].map((c) => (
            <button
              key={c.label}
              onClick={() => {
                setPage(1);
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
                  colSpan={columns.length + 1}
                  className="px-3 py-8 text-center text-rose-600"
                >
                  {error}
                </td>
              </tr>
            )}

            {!loading && !error && rows?.length === 0 && (
              <tr>
                <td colSpan={columns.length + 1} className="px-3 py-6">
                  <EmptyState />
                </td>
              </tr>
            )}

            {!loading &&
              !error &&
              rows?.length > 0 &&
              rows.map((row, idx) => (
                <tr
                  key={row.id || row._id || idx}
                  className="border-b border-slate-100 even:bg-slate-50/60 hover:bg-blue-200"
                >
                  <td className="px-3 py-2">{(page - 1) * limit + idx + 1}</td>
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className="px-3 py-2 whitespace-nowrap text-slate-700"
                    >
                      {col.key === "ngay_import" ? (
                        formatDate(row?.[col.key])
                      ) : col.key === "loaiHinh" ? (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                            row?.[col.key] === "Hàng Đặc Thù"
                              ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
                              : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                          }`}
                        >
                          {row?.[col.key] || "N/A"}
                        </span>
                      ) : (
                        String(row?.[col.key] ?? "")
                      )}
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* Footer / pagination */}
      <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
        <div className="text-sm text-slate-600">
          Đang hiển thị <b>{rows.length}</b> / <b>{total}</b> bản ghi
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => {
              setPage(1);
              setLimit(Number(e.target.value));
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
              className="h-10 px-2 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50"
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
                setPage(Math.min(Math.max(1, v), maxPage));
              }}
              className="h-10 w-16 rounded-xl border border-slate-300 px-2 text-center focus:ring-2 focus:ring-slate-200 outline-none"
            />
            <span className="px-1 text-sm text-slate-600">/ {maxPage}</span>
            <button
              onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
              disabled={page >= maxPage}
              className="h-10 px-3 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-200"
            >
              Sau
            </button>
            <button
              onClick={() => setPage(maxPage)}
              disabled={page >= maxPage}
              className="h-10 px-2 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50"
            >
              ⏭
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

DinhViTable.displayName = "DinhViTable";

export default DinhViTable;
