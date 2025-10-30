/* eslint-disable react/prop-types */
import { useState, useMemo } from "react";

const EmptyState = ({
  title = "Không có dữ liệu",
  subtitle = "Chưa có phiếu soạn nào được tạo.",
}) => (
  <div className="flex flex-col items-center justify-center py-16">
    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
      <svg
        className="w-8 h-8 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
        />
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
    <p className="text-sm text-slate-500 mt-1 max-w-md text-center">
      {subtitle}
    </p>
  </div>
);

const SortIcon = ({ direction }) => {
  if (direction === "asc") {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h5a1 1 0 000-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM13 16a1 1 0 102 0v-5.586l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 101.414 1.414L13 10.414V16z" />
      </svg>
    );
  }
  if (direction === "desc") {
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path d="M3 3a1 1 0 000 2h11a1 1 0 100-2H3zM3 7a1 1 0 000 2h7a1 1 0 100-2H3zM3 11a1 1 0 100 2h4a1 1 0 100-2H3zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
      </svg>
    );
  }
  return (
    <svg
      className="w-4 h-4 text-slate-400"
      fill="currentColor"
      viewBox="0 0 20 20"
    >
      <path d="M5 12a1 1 0 102 0V6.414l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L5 6.414V12zM15 8a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L15 13.586V8z" />
    </svg>
  );
};

const PhieuSoanRow = ({
  loading,
  error,
  rows,
  columns,
  selectAll,
  selectedRows,
  editingRow,
  adjustmentValues,
  onSelectAll,
  onSelectRow,
  onAdjustmentChange,
  onSaveAdjustment,
  onCancelAdjustment,
  onStartEdit,
  formatNumber,
  formatDate,
  getStatusBadge,
  getChanLeBadge,
  onSortChange,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });

  // Các cột có thể sort
  const sortableColumns = ["slot", "pack", "luong", "kien_hang"];

  const handleSort = (columnKey) => {
    if (!sortableColumns.includes(columnKey)) return;

    let direction = "asc";
    if (sortConfig.key === columnKey) {
      if (sortConfig.direction === "asc") {
        direction = "desc";
      } else if (sortConfig.direction === "desc") {
        direction = null;
      }
    }

    const newSortConfig = { key: columnKey, direction };
    setSortConfig(newSortConfig);

    if (onSortChange) {
      onSortChange(newSortConfig);
    }
  };

  // Memo sorted rows để tránh re-sort không cần thiết
  const sortedRows = useMemo(() => {
    if (!sortConfig.direction || !sortConfig.key) {
      return rows;
    }

    return [...rows].sort((a, b) => {
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];

      // Sort slot theo string
      if (sortConfig.key === "slot") {
        const aStr = String(aVal || "").toLowerCase();
        const bStr = String(bVal || "").toLowerCase();
        return sortConfig.direction === "asc"
          ? aStr.localeCompare(bStr)
          : bStr.localeCompare(aStr);
      }

      // Sort số
      const aNum = Number(aVal) || 0;
      const bNum = Number(bVal) || 0;
      return sortConfig.direction === "asc" ? aNum - bNum : bNum - aNum;
    });
  }, [rows, sortConfig]);

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b sticky top-0 z-10">
            <tr>
              {/* Checkbox column */}
              <th className="px-3 py-2 w-10 bg-slate-50">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={(e) => onSelectAll(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                />
              </th>

              {/* STT column */}
              <th className="px-3 py-2 text-left font-semibold text-slate-700 bg-slate-50 w-12">
                #
              </th>

              {/* Dynamic columns */}
              {columns.map((col) => {
                const isSortable = sortableColumns.includes(col.key);
                const isActive = sortConfig.key === col.key;

                return (
                  <th
                    key={col.key}
                    className={`px-3 py-2 text-left font-semibold text-slate-700 whitespace-nowrap bg-slate-50 ${
                      isSortable
                        ? "cursor-pointer select-none hover:bg-slate-100 transition-colors"
                        : ""
                    } ${isActive ? "bg-blue-100" : ""}`}
                    onClick={() => isSortable && handleSort(col.key)}
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.label}</span>
                      {isSortable && (
                        <SortIcon
                          direction={isActive ? sortConfig.direction : null}
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y">
            {/* Loading state */}
            {loading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  <td className="px-3 py-3" colSpan={columns.length + 2}>
                    <div className="h-4 bg-slate-200 rounded animate-pulse" />
                  </td>
                </tr>
              ))}

            {/* Error state */}
            {!loading && error && (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="px-3 py-12 text-center"
                >
                  <div className="flex flex-col items-center gap-3">
                    <svg
                      className="w-12 h-12 text-red-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-red-600 font-medium">{error}</p>
                    <button
                      onClick={() => window.location.reload()}
                      className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                    >
                      Tải lại trang
                    </button>
                  </div>
                </td>
              </tr>
            )}

            {/* Empty state */}
            {!loading && !error && rows?.length === 0 && (
              <tr>
                <td colSpan={columns.length + 2}>
                  <EmptyState />
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!loading &&
              !error &&
              sortedRows?.length > 0 &&
              sortedRows.map((row, idx) => {
                const isSelected = selectedRows.includes(row._id);
                const isEditing = editingRow === row._id;
                const adjustmentValue =
                  adjustmentValues[row._id] ?? row.luong_dieu_chinh ?? null;
                const hasAdjustment =
                  row.luong_dieu_chinh !== null &&
                  row.luong_dieu_chinh !== undefined;

                return (
                  <tr
                    key={row._id}
                    className={`transition-colors ${
                      isSelected
                        ? "bg-blue-50 hover:bg-blue-100"
                        : "hover:bg-slate-50"
                    } ${isEditing ? "bg-amber-50 ring-2 ring-amber-300" : ""}`}
                  >
                    {/* Checkbox */}
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => onSelectRow(row._id, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 cursor-pointer"
                      />
                    </td>

                    {/* STT */}
                    <td className="px-3 py-2 text-slate-600 font-medium">
                      {idx + 1}
                    </td>

                    {/* Store */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-800">
                        {row.store || "-"}
                      </span>
                    </td>

                    {/* Mã NCC */}
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-slate-700">
                      {row.maNCC || "-"}
                    </td>

                    {/* Mã NH */}
                    <td className="px-3 py-2 whitespace-nowrap font-mono text-xs text-slate-700">
                      {row.maNH || "-"}
                    </td>

                    {/* Dept */}
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                      {row.Dept || "-"}
                    </td>

                    {/* SubDept */}
                    <td className="px-3 py-2 whitespace-nowrap text-slate-700">
                      {row.SubDept || "-"}
                    </td>

                    {/* SD/TF */}
                    <td className="px-3 py-2 whitespace-nowrap">
                      {row.soda_transfer ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-700">
                          {row.soda_transfer}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    {/* Tên sản phẩm */}
                    <td className="px-3 py-2 max-w-xs" title={row.name}>
                      <div className="truncate text-slate-700 font-medium">
                        {row.name || "-"}
                      </div>
                    </td>

                    {/* SKU */}
                    <td className="px-3 py-2 font-mono text-xs text-slate-600">
                      {row.sku || "-"}
                    </td>

                    {/* Vị trí (Slot) */}
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-bold bg-blue-100 text-blue-700">
                        {row.slot || "-"}
                      </span>
                    </td>

                    {/* Pack */}
                    <td className="px-3 py-2 text-right text-slate-700 font-medium">
                      {formatNumber(row.pack)}
                    </td>

                    {/* Số lượng */}
                    <td className="px-3 py-2 text-right font-bold text-slate-900">
                      {formatNumber(row.luong)}
                    </td>

                    {/* Lượng điều chỉnh */}
                    <td className="px-3 py-2">
                      {isEditing ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            value={adjustmentValue ?? ""}
                            onChange={(e) =>
                              onAdjustmentChange(row._id, e.target.value)
                            }
                            className="w-20 px-2 py-1 border-2 border-amber-400 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-amber-500"
                            autoFocus
                            placeholder="0"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                onSaveAdjustment(row);
                              } else if (e.key === "Escape") {
                                onCancelAdjustment(row._id);
                              }
                            }}
                          />
                          <button
                            onClick={() => onSaveAdjustment(row)}
                            className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                            title="Lưu (Enter)"
                          >
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
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </button>
                          <button
                            onClick={() => onCancelAdjustment(row._id)}
                            className="p-1 bg-slate-400 text-white rounded hover:bg-slate-500 transition-colors"
                            title="Hủy (Esc)"
                          >
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${
                              hasAdjustment
                                ? "text-amber-600"
                                : "text-slate-400"
                            }`}
                          >
                            {hasAdjustment
                              ? formatNumber(row.luong_dieu_chinh)
                              : "-"}
                          </span>
                          <button
                            onClick={() =>
                              onStartEdit(row._id, row.luong_dieu_chinh ?? null)
                            }
                            className="p-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                            title="Điều chỉnh"
                          >
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
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Kiện hàng */}
                    <td className="px-3 py-2 text-right font-bold text-emerald-600">
                      {formatNumber(row.kien_hang)}
                    </td>

                    {/* Chẵn/Lẻ */}
                    <td className="px-3 py-2 text-center">
                      {getChanLeBadge(row.chan_le)}
                    </td>

                    {/* Trạng thái */}
                    <td className="px-3 py-2 text-center">
                      {getStatusBadge(row.trang_thai)}
                    </td>

                    {/* Ngày tạo */}
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-slate-600">
                      {formatDate(row.ngay_ra_phieu)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      {!loading && !error && sortedRows?.length > 0 && (
        <div className="px-4 py-3 bg-slate-50 border-t text-xs text-slate-600">
          <div className="flex items-center justify-between">
            <span>
              Hiển thị <strong>{sortedRows.length}</strong> phiếu soạn
            </span>
            {sortConfig.direction && (
              <span className="text-blue-600">
                ⬆️ Đang sắp xếp theo:{" "}
                <strong>
                  {columns.find((c) => c.key === sortConfig.key)?.label}
                </strong>{" "}
                ({sortConfig.direction === "asc" ? "Tăng dần" : "Giảm dần"})
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhieuSoanRow;
