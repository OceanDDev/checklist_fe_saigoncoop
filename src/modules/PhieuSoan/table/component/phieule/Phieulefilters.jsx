/* eslint-disable react/prop-types */
import { useMemo } from "react";
import dayjs from "dayjs";
import { DateRange } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

const PhieuLeFilters = ({
  onExportExcel,
  // Search values
  search,
  setSearch,
  soDocument,
  setSoDocument,
  sku,
  setSku,
  slot,
  setSlot,
  trangThai,
  setTrangThai,
  maCH,
  setMaCH,
  chuyen,
  setChuyen,
  dateRange,
  setDateRange,
  showCalendar,
  setShowCalendar,

  // UI state
  showFilters,
  setShowFilters,

  // Actions
  onResetFilters,
  onImportClick,
  onImportHDClick, // ✅ NEW - Import HD Đã xuất
  onPrintSelected,

  // Stats
  total,
  selectedCount,

  // Callbacks
  setPage,
}) => {
  // Đếm số filter đang active
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (soDocument) count++;
    if (sku) count++;
    if (slot) count++;
    if (trangThai) count++;
    if (maCH) count++;
    if (chuyen) count++;
    if (dateRange[0].startDate || dateRange[0].endDate) count++;
    return count;
  }, [search, soDocument, sku, slot, trangThai, maCH, chuyen, dateRange]);

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
            {/* Nút In */}
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

            {/* ✅ Nút Xuất Excel */}
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
          onClick={() => setShowFilters(!showFilters)}
          className={`h-10 rounded-xl px-4 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 whitespace-nowrap flex items-center gap-2 ${
            showFilters ? "bg-slate-100" : "bg-white"
          }`}
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
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
          Bộ lọc
          {activeFilterCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs bg-blue-500 text-white rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          onClick={onResetFilters}
          className="h-10 rounded-xl bg-white px-4 text-slate-700 ring-1 ring-slate-300 hover:bg-slate-50 whitespace-nowrap"
        >
          Làm mới
        </button>

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
          Import & Xử lí
        </button>

        {/* ✅ NÚT IMPORT HD ĐÃ XUẤT */}
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

      {/* Advanced Filters Panel - Collapsible */}
      {showFilters && (
        <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {/* Số Document */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Số Document
              </label>
              <input
                type="text"
                value={soDocument}
                onChange={(e) => {
                  setPage(1);
                  setSoDocument(e.target.value);
                }}
                placeholder="Nhập số document..."
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>

            {/* SKU */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                SKU
              </label>
              <input
                type="text"
                value={sku}
                onChange={(e) => {
                  setPage(1);
                  setSku(e.target.value);
                }}
                placeholder="Nhập SKU..."
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>

            {/* Slot */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Slot
              </label>
              <input
                type="text"
                value={slot}
                onChange={(e) => {
                  setPage(1);
                  setSlot(e.target.value);
                }}
                placeholder="Nhập slot..."
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>

            {/* Mã CH */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Mã Cửa Hàng
              </label>
              <input
                type="text"
                value={maCH}
                onChange={(e) => {
                  setPage(1);
                  setMaCH(e.target.value);
                }}
                placeholder="Nhập mã CH..."
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>

            {/* Chuyến */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Chuyến
              </label>
              <input
                type="text"
                value={chuyen}
                onChange={(e) => {
                  setPage(1);
                  setChuyen(e.target.value);
                }}
                placeholder="Nhập chuyến..."
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
              />
            </div>

            {/* Trạng thái */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Trạng Thái
              </label>
              <select
                value={trangThai}
                onChange={(e) => {
                  setPage(1);
                  setTrangThai(e.target.value);
                }}
                className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none"
              >
                <option value="">-- Tất cả --</option>
                <option value="Chờ xử lý">Chờ xử lý</option>
                <option value="Đã xử lý">Đã xử lý</option>
                <option value="Đã Xuất">Đã Xuất</option>
              </select>
            </div>

            {/* Date Range Picker */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Khoảng Ngày
              </label>
              <div className="relative">
                <input
                  readOnly
                  onClick={() => setShowCalendar(!showCalendar)}
                  value={
                    dateRange[0].startDate && dateRange[0].endDate
                      ? `${dayjs(dateRange[0].startDate).format("DD/MM/YYYY")} - ${dayjs(dateRange[0].endDate).format("DD/MM/YYYY")}`
                      : ""
                  }
                  placeholder="📅 Chọn khoảng ngày"
                  className="h-9 w-full rounded-lg border border-slate-300 px-3 text-sm focus:ring-2 focus:ring-blue-200 outline-none cursor-pointer"
                />
                {showCalendar && (
                  <div className="absolute z-50 mt-2 bg-white shadow-xl rounded-lg">
                    <DateRange
                      ranges={dateRange}
                      onChange={(item) => {
                        setPage(1);
                        setDateRange([item.selection]);
                      }}
                      moveRangeOnFirstSelection={false}
                      maxDate={new Date()}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Clear individual filters */}
          {activeFilterCount > 0 && (
            <div className="flex items-center gap-2 text-xs flex-wrap">
              <span className="text-slate-500">Đang lọc:</span>
              {search && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                  Search: {search.substring(0, 20)}
                  {search.length > 20 && "..."}
                  <button
                    onClick={() => setSearch("")}
                    className="hover:text-blue-900"
                  >
                    ✕
                  </button>
                </span>
              )}
              {soDocument && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                  Doc: {soDocument}
                  <button
                    onClick={() => setSoDocument("")}
                    className="hover:text-blue-900"
                  >
                    ✕
                  </button>
                </span>
              )}
              {sku && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                  SKU: {sku}
                  <button
                    onClick={() => setSku("")}
                    className="hover:text-blue-900"
                  >
                    ✕
                  </button>
                </span>
              )}
              {slot && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                  Slot: {slot}
                  <button
                    onClick={() => setSlot("")}
                    className="hover:text-blue-900"
                  >
                    ✕
                  </button>
                </span>
              )}
              {maCH && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                  Mã CH: {maCH}
                  <button
                    onClick={() => setMaCH("")}
                    className="hover:text-blue-900"
                  >
                    ✕
                  </button>
                </span>
              )}
              {chuyen && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                  Chuyến: {chuyen}
                  <button
                    onClick={() => setChuyen("")}
                    className="hover:text-blue-900"
                  >
                    ✕
                  </button>
                </span>
              )}
              {trangThai && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                  TT: {trangThai}
                  <button
                    onClick={() => setTrangThai("")}
                    className="hover:text-blue-900"
                  >
                    ✕
                  </button>
                </span>
              )}
              {dateRange[0].startDate && dateRange[0].endDate && (
                <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded flex items-center gap-1">
                  Ngày: {dayjs(dateRange[0].startDate).format("DD/MM/YYYY")} →{" "}
                  {dayjs(dateRange[0].endDate).format("DD/MM/YYYY")}
                  <button
                    onClick={() => {
                      setDateRange([
                        {
                          startDate: new Date(),
                          endDate: new Date(),
                          key: "selection",
                        },
                      ]);
                    }}
                    className="hover:text-blue-900"
                  >
                    ✕
                  </button>
                </span>
              )}
            </div>
          )}
        </div>
      )}

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
