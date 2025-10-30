/* eslint-disable react/prop-types */

const PhieuSoanPagination = ({
  isFiltering,
  rows,
  total,
  selectedRows,
  page,
  setPage,
  limit,
  setLimit,
}) => {
  const maxPage = Math.max(1, Math.ceil(total / limit));

  // Khi đang filter, hiển thị thông báo
  if (isFiltering) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-3">
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
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <span className="font-semibold">Đang lọc:</span> Hiển thị tất cả{" "}
            <span className="font-bold">{rows.length}</span> kết quả
            {selectedRows.length > 0 && (
              <span className="ml-2">
                • Đã chọn:{" "}
                <span className="font-bold">{selectedRows.length}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Khi không filter, hiển thị pagination đầy đủ
  return (
    <div className="flex items-center justify-between bg-white rounded-lg border p-4">
      {/* Left side - Record count info */}
      <div className="text-sm text-slate-600">
        Hiển thị <span className="font-semibold">{rows.length}</span> /{" "}
        <span className="font-semibold">{total}</span> bản ghi
        {selectedRows.length > 0 && (
          <span className="ml-2 text-blue-600">
            • Đã chọn:{" "}
            <span className="font-bold">{selectedRows.length}</span>
          </span>
        )}
      </div>

      {/* Right side - Pagination controls */}
      <div className="flex items-center gap-2">
        {/* Items per page selector */}
        <select
          value={limit}
          onChange={(e) => {
            setLimit(Number(e.target.value));
            setPage(1);
          }}
          className="px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}/trang
            </option>
          ))}
        </select>

        {/* Pagination buttons */}
        <div className="flex items-center gap-1">
          {/* First page button */}
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="p-2 border rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            title="Trang đầu"
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M15.707 15.707a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 010 1.414zm-6 0a1 1 0 01-1.414 0l-5-5a1 1 0 010-1.414l5-5a1 1 0 011.414 1.414L5.414 10l4.293 4.293a1 1 0 010 1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>

          {/* Previous page button */}
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 border rounded-md text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            Trước
          </button>

          {/* Page number input */}
          <div className="flex items-center gap-2 px-2">
            <input
              type="number"
              min={1}
              max={maxPage}
              value={page}
              onChange={(e) => {
                const v = Number(e.target.value || 1);
                setPage(Math.min(Math.max(1, v), maxPage));
              }}
              className="w-16 px-2 py-1.5 border rounded-md text-center text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600">/ {maxPage}</span>
          </div>

          {/* Next page button */}
          <button
            onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
            disabled={page >= maxPage}
            className="px-3 py-1.5 border rounded-md text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
          >
            Sau
          </button>

          {/* Last page button */}
          <button
            onClick={() => setPage(maxPage)}
            disabled={page >= maxPage}
            className="p-2 border rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            title="Trang cuối"
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
              <path
                fillRule="evenodd"
                d="M4.293 15.707a1 1 0 010-1.414L8.586 10 4.293 5.707a1 1 0 011.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhieuSoanPagination;