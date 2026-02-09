/* eslint-disable react/prop-types */
import {
  useEffect,
  useMemo,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import { dataCHService } from "@/services/phieusoan/dataCH.service";
import ImportDataCHModal from "./component/phieule/ImportDataCH";

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

const DataCHTable = forwardRef((props, ref) => {
  // --- Filters & pagination ---
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);

  // State cho chỉnh sửa ghi chú
  const [editingId, setEditingId] = useState(null);
  const [editingValue, setEditingValue] = useState("");
  const [savingId, setSavingId] = useState(null);

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
      search: debouncedSearch,
    }),
    [page, limit, debouncedSearch],
  );

  const fetchDataCH = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await dataCHService.getAllDataCH(params);
      const data = Array.isArray(res)
        ? res
        : Array.isArray(res?.data)
          ? res.data
          : [];
      setRows(data);
      setTotal(Number(res?.pagination?.total ?? res?.total ?? data.length));
    } catch (e) {
      console.error(e);
      setError("Không tải được dữ liệu Cửa Hàng.");
    } finally {
      setLoading(false);
    }
  };

  // Expose fetchDataCH method to parent via ref
  useImperativeHandle(ref, () => ({
    fetchDataCH,
  }));

  useEffect(() => {
    fetchDataCH();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const handleImportSuccess = () => {
    fetchDataCH(); // Refresh lại table sau khi import thành công
  };

  const resetFilters = () => {
    setPage(1);
    setLimit(20);
    setSearch("");
  };

  // Bắt đầu chỉnh sửa ghi chú
  const handleStartEdit = (row) => {
    setEditingId(row.id || row._id);
    setEditingValue(row.ghi_chu_ch || "");
  };

  // Hủy chỉnh sửa
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingValue("");
  };

  // Lưu ghi chú đã chỉnh sửa
  const handleSaveEdit = async (row) => {
    const rowId = row.id || row._id;
    if (!rowId) {
      console.error("Không tìm thấy ID của cửa hàng");
      return;
    }

    setSavingId(rowId);
    try {
      // Gọi API cập nhật
      await dataCHService.updateDataCH(rowId, {
        ghi_chu_ch: editingValue,
      });

      // Cập nhật state local
      setRows((prevRows) =>
        prevRows.map((r) =>
          (r.id || r._id) === rowId ? { ...r, ghi_chu_ch: editingValue } : r,
        ),
      );

      // Reset editing state
      setEditingId(null);
      setEditingValue("");
    } catch (e) {
      console.error("Lỗi khi cập nhật ghi chú:", e);
      alert("Không thể lưu ghi chú. Vui lòng thử lại.");
    } finally {
      setSavingId(null);
    }
  };

  // Định nghĩa các cột (tùy chỉnh theo schema DataCH của bạn)
  const columns = [
    { key: "sd_tf", label: "Số SD/TF" },
    { key: "so_document", label: "Số Document" },
    { key: "mach", label: "Mã Cửa Hàng" },
    { key: "quan", label: "Quận" },

    { key: "tench", label: "Tên Cửa Hàng" },
    { key: "chuyen", label: "Chuyến" },
    { key: "ghi_chu_ch", label: "Ghi chú cửa hàng", editable: true },
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
    <>
      <div className="space-y-4">
        {/* Filter card */}
        <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-4 md:p-5 shadow-sm">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                value={search}
                onChange={(e) => {
                  setPage(1);
                  setSearch(e.target.value);
                }}
                className="h-10 w-full rounded-xl border border-slate-300 pl-3 pr-10 focus:ring-2 focus:ring-slate-200 outline-none"
                placeholder="Tìm kiếm (Mã CH, Tên, Địa chỉ, SĐT) - debounce 350ms"
              />
            </div>

            <button
              onClick={resetFilters}
              className="h-10 rounded-xl bg-white px-4 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 whitespace-nowrap"
            >
              Làm mới
            </button>

            <button
              onClick={() => setShowImportModal(true)}
              className="h-10 rounded-xl bg-blue-600 px-4 text-white hover:bg-blue-700 whitespace-nowrap font-medium"
            >
              📥 Import Excel
            </button>
            <button
              onClick={async () => {
                if (
                  window.confirm(
                    "⚠️ Bạn có chắc chắn muốn xóa TOÀN BỘ dữ liệu cửa hàng không?\nHành động này không thể hoàn tác!",
                  )
                ) {
                  try {
                    const res = await dataCHService.deleteAllDataCH();
                    alert(res?.message || "Đã xóa toàn bộ dữ liệu cửa hàng!");
                    fetchDataCH(); // refresh lại bảng
                  } catch (err) {
                    console.error("Lỗi khi xóa toàn bộ dữ liệu:", err);
                    alert("Không thể xóa toàn bộ dữ liệu. Vui lòng thử lại.");
                  }
                }
              }}
              className="h-10 rounded-xl bg-rose-600 px-4 text-white hover:bg-rose-700 whitespace-nowrap font-medium"
            >
              🗑️ Xóa toàn bộ
            </button>
          </div>

          {/* Quick stats */}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span>
                Tổng: <b>{total}</b> cửa hàng
              </span>
            </div>
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
                  <tr
                    key={`skeleton-${i}`}
                    className="border-b border-slate-100"
                  >
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
                  const isEditing = editingId === rowId;
                  const isSaving = savingId === rowId;

                  return (
                    <tr
                      key={rowId || idx}
                      className="border-b border-slate-100 even:bg-slate-50/60 hover:bg-green-50"
                    >
                      <td className="px-3 py-2">
                        {(page - 1) * limit + idx + 1}
                      </td>
                      {columns.map((col) => (
                        <td
                          key={col.key}
                          className="px-3 py-2 whitespace-nowrap text-slate-700"
                        >
                          {col.key === "ngay_import" ? (
                            formatDate(row?.[col.key])
                          ) : col.key === "trangThai" ? (
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                                row?.[col.key] === "Hoạt động"
                                  ? "bg-green-100 text-green-800 ring-1 ring-green-200"
                                  : row?.[col.key] === "Tạm ngừng"
                                    ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
                                    : "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
                              }`}
                            >
                              {row?.[col.key] || "N/A"}
                            </span>
                          ) : col.editable && col.key === "ghi_chu_ch" ? (
                            // Editable cell cho ghi chú cửa hàng
                            <div className="flex items-center gap-2">
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
                                    {String(row?.[col.key] ?? "")}
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

      {/* Import Modal */}
      <ImportDataCHModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportSuccess={handleImportSuccess}
      />
    </>
  );
});

DataCHTable.displayName = "DataCHTable";

export default DataCHTable;
