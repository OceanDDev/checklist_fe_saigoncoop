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
  const [khoiluong, setKhoiluong] = useState("");
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

  // ✅ State cho chỉnh sửa
  const [editingRowId, setEditingRowId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [editedPacks, setEditedPacks] = useState({});

  // ✅ Khôi phục editedPacks từ localStorage khi component mount
  useEffect(() => {
    const saved = localStorage.getItem("editedPacks");
    if (saved) {
      try {
        setEditedPacks(JSON.parse(saved));
      } catch (e) {
        console.error("Không thể khôi phục editedPacks:", e);
      }
    }
  }, []);

  // ✅ Lưu editedPacks vào localStorage mỗi khi thay đổi
  useEffect(() => {
    if (Object.keys(editedPacks).length > 0) {
      localStorage.setItem("editedPacks", JSON.stringify(editedPacks));
    } else {
      localStorage.removeItem("editedPacks");
    }
  }, [editedPacks]);

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
      khoiluong,
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
      khoiluong,
      maNCC,
      maNH,
      Dept,
      SubDept,
      debouncedSearch,
    ],
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
    getEditedPacks: () => editedPacks,
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
    setKhoiluong("");
    setMaNCC("");
    setMaNH("");
    setDept("");
    setSubDept("");
    setSearch("");
  };

  // ✅ Kiểm tra xem có được phép edit không (pack = "1")
  const isPackEditable = (row) => {
    return String(row.pack).trim() === "1";
  };
  // ✅ Kiểm tra xem ô này đã được chỉnh sửa chưa
  const isPackEdited = (row) => {
    const rowId = row.id || row._id;
    return editedPacks[rowId] !== undefined;
  };

  // ✅ Lấy giá trị pack hiển thị (ưu tiên giá trị đã edit)
  const getPackValue = (row) => {
    const rowId = row.id || row._id;
    return editedPacks[rowId] !== undefined ? editedPacks[rowId] : row.pack;
  };

  // ✅ Bắt đầu chỉnh sửa
  const handleStartEdit = (row) => {
    const rowId = row.id || row._id;
    setEditingRowId(rowId);
    setEditingValue(getPackValue(row));
  };

  // ✅ Hủy chỉnh sửa
  const handleCancelEdit = () => {
    setEditingRowId(null);
    setEditingValue("");
  };

  // ✅ Lưu chỉnh sửa
  const handleSaveEdit = async (row) => {
    const rowId = row.id || row._id;

    setIsSaving(true);
    try {
      await dinhViService.updatePackBySKU(row.sku, editingValue);

      // ✅ CHỈ cập nhật state local, KHÔNG fetch lại
      setEditedPacks((prev) => ({
        ...prev,
        [rowId]: editingValue,
      }));

      // ❌ XÓA DÒNG NÀY
      // await fetchDinhVi();

      setEditingRowId(null);
      setEditingValue("");

      alert("✅ Đã lưu thay đổi!");
    } catch (err) {
      console.error("Lỗi khi lưu:", err);
      alert("❌ Không thể lưu thay đổi. Vui lòng thử lại.");
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ Cột hiển thị
  const columns = [
    { key: "maNCC", label: "Mã NCC" },
    { key: "maNH", label: "Mã NH" },
    { key: "Dept", label: "Dept" },
    { key: "SubDept", label: "Sub Dept" },
    { key: "slot", label: "Slot" },
    { key: "sku", label: "SKU" },
    { key: "name", label: "Tên hàng" },
    { key: "pack", label: "Quy cách" },
    { key: "khoiluong", label: "Khối lượng" },
    { key: "loaiHinh", label: "Loại hình" },
    { key: "ngay_import", label: "Ngày Import" },
  ];

  const maxPage = Math.max(1, Math.ceil(total / limit));

  // Format ngày tháng
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
          <input
            value={maNCC}
            onChange={(e) => {
              setPage(1);
              setMaNCC(e.target.value);
            }}
            className="h-10 w-full rounded-xl border border-slate-300 px-3"
            placeholder="Mã NCC"
          />
          <input
            value={maNH}
            onChange={(e) => {
              setPage(1);
              setMaNH(e.target.value);
            }}
            className="h-10 w-full rounded-xl border border-slate-300 px-3"
            placeholder="Mã NH"
          />
          <input
            value={Dept}
            onChange={(e) => {
              setPage(1);
              setDept(e.target.value);
            }}
            className="h-10 w-full rounded-xl border border-slate-300 px-3"
            placeholder="Dept"
          />
          <input
            value={SubDept}
            onChange={(e) => {
              setPage(1);
              setSubDept(e.target.value);
            }}
            className="h-10 w-full rounded-xl border border-slate-300 px-3"
            placeholder="Sub Dept"
          />
          <input
            value={slot}
            onChange={(e) => {
              setPage(1);
              setSlot(e.target.value);
            }}
            className="h-10 w-full rounded-xl border border-slate-300 px-3"
            placeholder="Slot"
          />
          <input
            value={sku}
            onChange={(e) => {
              setPage(1);
              setSku(e.target.value);
            }}
            className="h-10 w-full rounded-xl border border-slate-300 px-3"
            placeholder="SKU"
          />
          <input
            value={name}
            onChange={(e) => {
              setPage(1);
              setName(e.target.value);
            }}
            className="h-10 w-full rounded-xl border border-slate-300 px-3"
            placeholder="Tên hàng"
          />
          <input
            value={pack}
            onChange={(e) => {
              setPage(1);
              setPack(e.target.value);
            }}
            className="h-10 w-full rounded-xl border border-slate-300 px-3"
            placeholder="Quy cách (Pack)"
          />
          <input
            value={khoiluong}
            onChange={(e) => {
              setPage(1);
              setKhoiluong(e.target.value);
            }}
            className="h-10 w-full rounded-xl border border-slate-300 px-3"
            placeholder="Khối lượng"
          />

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

        {/* Nút nhanh */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500">Phím nhanh:</span>
          <button
            onClick={resetFilters}
            className="ml-auto rounded-xl bg-white px-3 py-1.5 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50"
          >
            Làm mới
          </button>
          {/* ✅ Hiển thị số lượng đã chỉnh sửa */}
          {Object.keys(editedPacks).length > 0 && (
            <span className="px-3 py-1.5 rounded-xl bg-amber-100 text-amber-800 ring-1 ring-amber-200 font-medium">
              Đã sửa: {Object.keys(editedPacks).length}
            </span>
          )}
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
              rows.map((row, idx) => {
                const rowId = row.id || row._id;
                const isEditing = editingRowId === rowId;

                return (
                  <tr
                    key={rowId || idx}
                    className="border-b border-slate-100 even:bg-slate-50/60 hover:bg-blue-100/60"
                  >
                    <td className="px-3 py-2">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2 whitespace-nowrap text-slate-700 ${
                          col.key === "pack" && isPackEdited(row)
                            ? "bg-amber-50 ring-2 ring-inset ring-amber-300"
                            : ""
                        }`}
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
                        ) : col.key === "pack" && isPackEditable(row) ? (
                          // ✅ Chế độ chỉnh sửa cho pack = "1"
                          <div className="flex items-center gap-1">
                            {isEditing ? (
                              <>
                                <input
                                  type="text"
                                  value={editingValue}
                                  onChange={(e) =>
                                    setEditingValue(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      handleSaveEdit(row);
                                    } else if (e.key === "Escape") {
                                      handleCancelEdit();
                                    }
                                  }}
                                  disabled={isSaving}
                                  className="flex-1 min-w-0 px-2 py-1 text-xs border border-blue-300 rounded focus:ring-2 focus:ring-blue-200 outline-none disabled:opacity-50"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleSaveEdit(row)}
                                  disabled={isSaving}
                                  className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Lưu (Enter)"
                                >
                                  {isSaving ? "⏳" : "✓"}
                                </button>
                                <button
                                  onClick={handleCancelEdit}
                                  disabled={isSaving}
                                  className="px-2 py-1 text-xs bg-slate-400 text-white rounded hover:bg-slate-500 disabled:opacity-50"
                                  title="Hủy (Esc)"
                                >
                                  ✕
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 min-w-0">
                                  {getPackValue(row)}
                                </span>
                                <button
                                  onClick={() => handleStartEdit(row)}
                                  className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                                  title="Chỉnh sửa"
                                >
                                  ✏️
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          String(row?.[col.key] ?? "")
                        )}
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
              className="h-10 px-3 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50 hover:bg-slate-50"
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
              className="h-10 px-3 rounded-xl bg-white ring-1 ring-slate-300 disabled:opacity-50 hover:bg-slate-50"
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
