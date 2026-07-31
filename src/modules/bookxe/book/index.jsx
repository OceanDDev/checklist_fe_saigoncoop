/* eslint-disable react/prop-types */
import { useState } from "react";
import { Search, Trash2, RefreshCw, X, Plus, Pencil } from "lucide-react";

const PAGE_SIZE = 20;

const STATUS_OPTIONS = ["Chưa Book", "Chờ xe", "Hoàn thành"];

const STATUS_STYLE = {
  "Chưa Book": "bg-slate-100 text-slate-600",
  "Chờ xe": "bg-amber-50 text-amber-600",
  "Hoàn thành": "bg-emerald-50 text-emerald-600",
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const StatusBadge = ({ value }) => (
  <span
    className={[
      "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
      STATUS_STYLE[value] || "bg-slate-100 text-slate-500",
    ].join(" ")}
  >
    {value || "—"}
  </span>
);

const BookXeTable = () => {
  // TODO: thay bằng state/fetch thật (gọi bookXeService.getAllBookXe...)
  const [data] = useState([]);
  const [loading] = useState(false);
  const [total] = useState(0);
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState("");
  const [trangThai, setTrangThai] = useState("");
  const [tuNgay, setTuNgay] = useState("");
  const [denNgay, setDenNgay] = useState("");

  const [selectedIds, setSelectedIds] = useState([]);

  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  const handleClearFilters = () => {
    setSearchInput("");
    setTrangThai("");
    setTuNgay("");
    setDenNgay("");
    setPage(1);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === data.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.map((item) => item._id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  return (
    <div className="p-5">
      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <div className="relative min-w-[240px] flex-1 max-w-sm">
            <Search
              size={15}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Tìm mã CH, tên CH, tên NVC..."
              className="w-full rounded-md border border-slate-300 py-2 pl-8 pr-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <select
            value={trangThai}
            onChange={(e) => setTrangThai(e.target.value)}
            className="rounded-md border border-slate-300 px-2.5 py-2 text-sm text-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Tất cả trạng thái</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <span className="hidden shrink-0 sm:inline">Ngày xuất:</span>
            <input
              type="date"
              value={tuNgay}
              onChange={(e) => setTuNgay(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
            <span className="text-slate-400">→</span>
            <input
              type="date"
              value={denNgay}
              onChange={(e) => setDenNgay(e.target.value)}
              className="rounded-md border border-slate-300 px-2 py-2 text-sm text-slate-600 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={handleClearFilters}
            className="flex items-center gap-1 rounded-md px-2 py-2 text-sm text-slate-500 hover:bg-slate-100"
          >
            <X size={14} />
            Xóa lọc
          </button>
        </div>

        <div className="flex items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-medium text-red-600 hover:bg-red-100"
            >
              <Trash2 size={14} />
              Xóa ({selectedIds.length})
            </button>
          )}
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3.5 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Tải lại
          </button>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={14} />
            Thêm Phiếu
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-md border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-slate-300"
                />
              </th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">#</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Thời Gian Xuất</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Quận</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Mã CH</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Tên CH</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">SL CH</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Mã NCV</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Tên NVC</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Lịch Đi Hàng</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Kiện</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Kiện Rớt</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Trạng Thái</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Ngày Tạo</th>
              <th className="px-4 py-3 text-left font-medium text-slate-600">Ngày Hoàn Thành</th>
              <th className="px-4 py-3 text-right font-medium text-slate-600">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={16} className="px-4 py-8 text-center text-slate-400">
                  Đang tải dữ liệu...
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={16} className="px-4 py-8 text-center text-slate-400">
                  Không có phiếu book xe nào
                </td>
              </tr>
            ) : (
              data.map((item, index) => (
                <tr key={item._id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item._id)}
                      onChange={() => toggleSelectOne(item._id)}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {(page - 1) * PAGE_SIZE + index + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{item.thoi_gian_xuat}</td>
                  <td className="px-4 py-3 text-slate-600">{item.quan || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.ma_ch || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.ten_ch || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.so_luong_ch || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.ma_ncv || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.ten_nvc || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{item.lich_di_hang || "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{item.kien ?? 0}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{item.kien_rot ?? 0}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={item.trangThai} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDateTime(item.thoi_gian_tao)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDateTime(item.thoi_gian_hoan_thanh)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600"
                        title="Sửa"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        type="button"
                        className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        title="Xóa"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
        <span>
          Tổng <span className="font-medium text-slate-700">{total}</span> phiếu
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
            className="rounded-md border border-slate-300 px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Trước
          </button>
          <span className="px-2">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            className="rounded-md border border-slate-300 px-2.5 py-1 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Sau
          </button>
        </div>
      </div>
    </div>
  );
};

export default BookXeTable;