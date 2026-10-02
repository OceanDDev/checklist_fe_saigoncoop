// pages/kehoachxe/table.jsx
/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  FilterX,
} from "lucide-react";
import { keHoachXeService } from "@/services/xuathang/kehoachxe.service";
import DateRangeFilter from "@/modules/nhaphang/dash/date";
import KeHoachXeImportModal from "./import";

const PAGE_SIZE = 20;

// filterType:
//  - "text" (mặc định): ô nhập, backend lọc gần đúng (regex) hoặc theo số
//  - "date": DateRangeFilter, gửi 2 param [dateKeys.from] / [dateKeys.to] dạng YYYY-MM-DD
const COLUMNS = [
  { key: "ten_ke_hoach", label: "Tên kế hoạch", width: 150 },
  { key: "ghi_chu_ke_hoach", label: "Ghi chú kế hoạch", width: 110 },
  {
    key: "ngay_xe_vao_kho_dau_yeu_cau",
    label: "Ngày xe vào kho đầu",
    width: 190,
    filterType: "date",
    dateKeys: { from: "tu_ngay", to: "den_ngay" },
    allowFuture: true, // kế hoạch thường là ngày sắp tới
  },
  {
    key: "thoi_gian_xe_vao_kho_dau_yeu_cau",
    label: "Giờ xe vào kho đầu",
    width: 110,
  },
  { key: "ma_kho", label: "Kho", width: 110 },
  { key: "ma_sieu_thi", label: "Siêu thị", width: 210 },
  { key: "ti_le", label: "Tỉ lệ", width: 90 },
  { key: "ma_nvc", label: "Nhà vận chuyển", width: 120 },
  { key: "ma_loai_hang", label: "Loại hàng", width: 90 },
  { key: "trong_tai_nho_nhat", label: "Tải nhỏ nhất", width: 100, align: "right" },
  { key: "trong_tai_lon_nhat", label: "Tải lớn nhất", width: 100, align: "right" },
  { key: "tong_khoi_luong_hang", label: "Tổng KL hàng", width: 110, align: "right" },
  { key: "ma_loai_xe", label: "Loại xe", width: 90 },
  { key: "hinh_thuc_giao_nhan", label: "Hình thức giao nhận", width: 140 },
  { key: "so_luong_xe", label: "SL xe", width: 80, align: "right" },
  { key: "ghi_chu_booking", label: "Ghi chú booking", width: 160 },
  {
    key: "ngay_import",
    label: "Ngày import",
    width: 190,
    filterType: "date",
    dateKeys: { from: "tu_ngay_import", to: "den_ngay_import" },
  },
];

// Ngày xe vào kho được ghim UTC 00:00 lúc import -> đọc bằng UTC getters
const formatDateOnly = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getUTCFullYear()}`;
};

// Ngày import là thời điểm thật (new Date() ở server) -> hiển thị giờ máy người dùng
const formatImportTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
};

const renderCellValue = (row, key) => {
  switch (key) {
    case "ngay_xe_vao_kho_dau_yeu_cau":
      return formatDateOnly(row[key]);
    case "ngay_import":
      return formatImportTime(row[key]);
    default: {
      const v = row[key];
      return v === undefined || v === null || v === "" ? "-" : v;
    }
  }
};

const KeHoachXeForm = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [result, setResult] = useState(null);

  const [rows, setRows] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({});
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0); // bỏ qua response cũ về trễ (chọn ngày bắn 2 request liên tiếp)

  const fetchTable = async (targetPage = page, activeFilters = filters) => {
    const reqId = ++requestIdRef.current;
    setLoadingTable(true);
    try {
      const params = { page: targetPage, limit: PAGE_SIZE };
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") params[key] = value;
      });
      const res = await keHoachXeService.getDanhSach(params);
      if (reqId !== requestIdRef.current) return;
      setRows(res?.data || []);
      setTotalPages(res?.totalPages || 1);
      setTotal(res?.total || 0);
    } catch (err) {
      if (reqId !== requestIdRef.current) return;
      console.error("Lỗi getDanhSach:", err);
    } finally {
      if (reqId === requestIdRef.current) setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchTable(1, {});
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter text -> debounce để không gọi API mỗi phím gõ
  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchTable(1, next), 400);
  };

  // Filter ngày -> gọi ngay
  const handleDateChange = (col, from, to) => {
    const next = {
      ...filters,
      [col.dateKeys.from]: from,
      [col.dateKeys.to]: to,
    };
    setFilters(next);
    setPage(1);
    fetchTable(1, next);
  };

  const hasAnyFilter = Object.values(filters).some((v) => v !== "" && v !== undefined);

  const clearAllFilters = () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setFilters({});
    setPage(1);
    fetchTable(1, {});
  };

  const goToPage = (p) => {
    if (p < 1 || p > totalPages || p === page) return;
    setPage(p);
    fetchTable(p, filters);
  };

  const handleImported = (res) => {
    setResult(res);
    setModalOpen(false);
    setPage(1);
    fetchTable(1, filters);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <UploadCloud size={16} />
            Import Excel
          </button>

          {hasAnyFilter && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-600 hover:bg-slate-100"
            >
              <FilterX size={15} />
              Xóa bộ lọc
            </button>
          )}
        </div>

        <span className="text-sm text-slate-500">
          {total > 0 && `${total} bản ghi`}
        </span>
      </div>

      {result && (
        <div
          className={[
            "mb-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm",
            result.success
              ? "bg-emerald-50 text-emerald-700"
              : "bg-red-50 text-red-700",
          ].join(" ")}
        >
          {result.success ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
          {result.message}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="max-h-[560px] overflow-auto">
          <table
            className="border-collapse text-left text-sm"
            style={{
              tableLayout: "fixed",
              width: COLUMNS.reduce((sum, c) => sum + c.width, 0),
            }}
          >
            <colgroup>
              {COLUMNS.map((col) => (
                <col key={col.key} style={{ width: col.width }} />
              ))}
            </colgroup>
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="border-b border-slate-200 text-slate-500">
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    className="truncate px-3 py-2 font-medium"
                    title={col.label}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-slate-200 bg-white">
                {COLUMNS.map((col) => {
                  if (col.filterType === "date") {
                    return (
                      <th key={col.key} className="px-2 py-1.5 font-normal">
                        <DateRangeFilter
                          label="Lọc theo ngày"
                          startValue={filters[col.dateKeys.from] || ""}
                          endValue={filters[col.dateKeys.to] || ""}
                          onChange={(s, e) => handleDateChange(col, s, e)}
                          onClear={() => handleDateChange(col, "", "")}
                          allowFuture={col.allowFuture}
                        />
                      </th>
                    );
                  }

                  return (
                    <th key={col.key} className="px-2 py-1.5 font-normal">
                      <input
                        type="text"
                        value={filters[col.key] || ""}
                        onChange={(e) => handleFilterChange(col.key, e.target.value)}
                        placeholder="Tìm..."
                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal text-slate-700 outline-none focus:border-blue-400"
                      />
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    <Loader2 size={16} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r._id}
                    className="h-11 border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    {COLUMNS.map((col) => {
                      const value = renderCellValue(r, col.key);
                      return (
                        <td
                          key={col.key}
                          title={
                            typeof value === "string" || typeof value === "number"
                              ? String(value)
                              : undefined
                          }
                          className={[
                            "truncate whitespace-nowrap px-3 py-2",
                            col.align === "right" ? "text-right" : "",
                          ].join(" ")}
                        >
                          {value}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2.5">
          <span className="text-xs text-slate-500">
            Trang {page}/{totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={14} /> Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
              className="flex items-center gap-1 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Sau <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {modalOpen && (
        <KeHoachXeImportModal
          onClose={() => setModalOpen(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
};

export default KeHoachXeForm;