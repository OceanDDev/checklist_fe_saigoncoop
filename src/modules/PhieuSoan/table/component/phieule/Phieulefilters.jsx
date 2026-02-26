/* eslint-disable react/prop-types */
import { useMemo } from "react";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

const PhieuLeFilters = ({
  onExportExcel,
  // Search values
  search,
  setSearch,
  dateRange,
  printDateRange,
  onImportSodaClick,
  // Actions
  onResetFilters,
  onImportClick,
  onImportHDClick,
  onPrintSelected,
  // Stats
  total,
  selectedCount,
  // Callbacks
  setPage,
}) => {
  // ✅ Lấy role từ localStorage
  const isLimitedRole = useMemo(() => {
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      return user.role === 26;
    } catch {
      return false;
    }
  }, []);

  // Đếm số filter đang active
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (dateRange[0].startDate || dateRange[0].endDate) count++;
    if (
      printDateRange &&
      (printDateRange[0].startDate || printDateRange[0].endDate)
    )
      count++;
    return count;
  }, [search, dateRange, printDateRange]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-4 md:p-5 shadow-sm">
      {/* Top row - Search tổng hợp + Actions */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <input
            value={search}
            onChange={(e) => {
              setPage(1);
              setSearch(e.target.value);
            }}
            className="h-10 w-full rounded-xl border border-slate-300 pl-3 pr-10 focus:ring-2 focus:ring-slate-200 outline-none"
            placeholder="🔍 Tìm kiếm tổng hợp (Số document, SKU, Mã CH, Chuyền, Tên hàng...)"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Nút In & Xuất Excel - hiện khi có phiếu được chọn */}
        {selectedCount > 0 && (
          <div className="flex items-center gap-2">
            {/* ✅ Ẩn nút In với role 26 */}
            {!isLimitedRole && (
              <button
                onClick={onPrintSelected}
                className="h-10 rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 px-4 text-white hover:from-green-700 hover:to-emerald-700 whitespace-nowrap font-medium flex items-center gap-2 shadow-sm"
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
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                In {selectedCount} phiếu
              </button>
            )}

            {/* ✅ Luôn hiện Xuất Excel */}
            <button
              onClick={onExportExcel}
              className="h-10 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 text-white hover:from-blue-700 hover:to-cyan-700 whitespace-nowrap font-medium flex items-center gap-2 shadow-sm"
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
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              Xuất Excel
            </button>
          </div>
        )}

        <button
          onClick={onResetFilters}
          className="h-10 rounded-xl bg-white px-4 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 whitespace-nowrap"
        >
          Làm mới
        </button>

        {/* ✅ Ẩn Transfer với role 26 */}
        {!isLimitedRole && (
          <button
            onClick={onImportClick}
            className="h-10 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 px-4 text-white hover:from-blue-700 hover:to-purple-700 whitespace-nowrap font-medium flex items-center gap-2 shadow-sm"
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Transfer
          </button>
        )}

        {/* ✅ Ẩn Soda với role 26 */}
        {!isLimitedRole && (
          <button
            onClick={onImportSodaClick}
            className="h-10 rounded-xl bg-gradient-to-r from-orange-500 to-pink-500 px-4 text-white hover:from-orange-600 hover:to-pink-600 whitespace-nowrap font-medium flex items-center gap-2 shadow-sm"
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
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            Soda
          </button>
        )}

        {/* ✅ Luôn hiện Import HD Đã Xuất */}
        <button
          onClick={onImportHDClick}
          className="h-10 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-4 text-white hover:from-emerald-700 hover:to-teal-700 whitespace-nowrap font-medium flex items-center gap-2 shadow-sm"
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
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Import HD Đã Xuất
        </button>
      </div>

      {/* Quick stats */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <div className="h-2 w-2 rounded-full bg-blue-500"></div>
          <span>
            Tổng: <b>{total}</b> phiếu lẻ
          </span>
        </div>
        {selectedCount > 0 && (
          <div className="flex items-center gap-2 text-green-600">
            <div className="h-2 w-2 rounded-full bg-green-500"></div>
            <span>
              Đã chọn: <b>{selectedCount}</b> phiếu
            </span>
          </div>
        )}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 text-slate-600">
            <div className="h-2 w-2 rounded-full bg-orange-500"></div>
            <span>
              Đang áp dụng <b>{activeFilterCount}</b> bộ lọc
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhieuLeFilters;
