/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import XuatHangImportModal from "./import";
import { xuatHangService } from "@/services/xuathang/xuathang.service";

const PAGE_SIZE = 20;

// Đơn vị so sánh trong dropdown filter "Thời gian lưu kho" là PHÚT.
const STORAGE_TIME_OPTIONS = [
  { value: "", label: "Tất cả" },
  { value: "gt90", label: "Trên 90 phút" },
  { value: "lt90", label: "Dưới 90 phút" },
  { value: "lt60", label: "Dưới 60 phút" },
  { value: "lt30", label: "Dưới 30 phút" },
  { value: "lt15", label: "Dưới 15 phút" },
];

// filterType:
//  - "text"   (mặc định): ô nhập, backend lọc gần đúng (regex) hoặc theo số
//  - "select": dropdown chọn sẵn — dùng cho cột tính toán "thời gian lưu kho"
//  - "none":   không lọc được — dùng cho các cột Date hiển thị dd/MM/yyyy HH:mm,
//    vì backend không so khớp text trên kiểu Date (để trống tránh gây hiểu
//    lầm filter bị lỗi khi gõ vào không có tác dụng)
const COLUMNS = [
  { key: "ma_kho", label: "Mã kho", width: 70 },
  { key: "so_bb", label: "Số BB", width: 110 },
  { key: "ma_booking", label: "Mã Booking", width: 170 },
  { key: "ma_ldd", label: "Mã LDD", width: 110 },
  {
    key: "ngay_xe_vao_ttpp",
    label: "Ngày giờ xe vào TTPP",
    width: 150,
    filterType: "none",
  },
  {
    key: "ngay_bat_dau_len_hang",
    label: "Bắt đầu lên hàng",
    width: 150,
    filterType: "none",
  },
  {
    key: "ngay_ket_thuc_len_hang",
    label: "Kết thúc lên hàng",
    width: 150,
    filterType: "none",
  },
  {
    key: "thoi_gian_roi_kho_cuoi",
    label: "TG rời kho cuối",
    width: 150,
    filterType: "none",
  },
  {
    key: "thoi_gian_luu_kho",
    label: "Thời gian lưu kho",
    width: 160,
    filterType: "select",
    computed: true,
  },
  { key: "ma_nvc", label: "Mã NVC", width: 90 },
  { key: "ten_nvc", label: "NVC", width: 200 },
  { key: "so_kien", label: "Số kiện", width: 80, align: "right" },
  { key: "ma_ch", label: "Mã siêu thị", width: 100 },
  { key: "ten_ch", label: "SIÊU THỊ", width: 220 },
  { key: "nhan_vien_xuat_hang", label: "NV xuất hàng", width: 130 },
  { key: "nhan_vien_xuat_phu", label: "NV xuất phụ", width: 130 },
  { key: "loai_hinh_van_chuyen", label: "Loại hình vận chuyển", width: 150 },
  {
    key: "ngay_ttpp_yeu_cau_vao",
    label: "Ngày TTPP yêu cầu vào",
    width: 150,
    filterType: "none",
  },
  { key: "concept", label: "Concept", width: 110 },
];

// Ngày + giờ — dd/MM/yyyy HH:mm, tự format thủ công (KHÔNG dùng
// toLocaleString) để giữ đúng thứ tự ngày trước giờ sau, và đọc bằng UTC
// getters cho khớp với cách ghim giá trị lúc import.
const formatDateTime = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mi = String(d.getUTCMinutes()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
};

// "Thời gian lưu kho" = thoi_gian_roi_kho_cuoi - ngay_xe_vao_ttpp
// Hiển thị dạng "X ngày Y giờ Z phút" (đơn vị gốc để so sánh là phút).
const formatStorageDuration = (row) => {
  const start = row.ngay_xe_vao_ttpp ? new Date(row.ngay_xe_vao_ttpp) : null;
  const end = row.thoi_gian_roi_kho_cuoi
    ? new Date(row.thoi_gian_roi_kho_cuoi)
    : null;

  if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
    return "-";
  }

  const diffMs = end.getTime() - start.getTime();
  if (diffMs < 0) return "-";

  const totalMinutes = Math.floor(diffMs / (60 * 1000));
  const days = Math.floor(totalMinutes / (24 * 60));
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60);
  const minutes = totalMinutes % 60;

  const parts = [];
  if (days > 0) parts.push(`${days} ngày`);
  if (hours > 0) parts.push(`${hours} giờ`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} phút`);

  return parts.join(" ");
};

// ─────────────────────────────────────────────
// TABLE + SEARCH + PAGINATION
// ─────────────────────────────────────────────
const XuatHangForm = ({ initialFilters, initialFiltersToken }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [result, setResult] = useState(null);

  const [rows, setRows] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({});
  const debounceRef = useRef(null);

  const fetchTable = async (targetPage = page, activeFilters = filters) => {
    setLoadingTable(true);
    try {
      const params = { page: targetPage, limit: PAGE_SIZE };
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") params[key] = value;
      });
      const res = await xuatHangService.getDanhSach(params);
      setRows(res?.data || []);
      setTotalPages(res?.totalPages || 1);
      setTotal(res?.total || 0);
    } catch (err) {
      console.error("Lỗi getDanhSach:", err);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchTable(1, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialFilters || initialFiltersToken === undefined) return;
    setFilters(initialFilters);
    setPage(1);
    fetchTable(1, initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiltersToken]);

  // Filter dạng text -> debounce trước khi gọi API, tránh gọi liên tục khi gõ
  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchTable(1, next);
    }, 400);
  };

  // Filter dạng select (dropdown) -> gọi API ngay, không cần debounce
  const handleSelectFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);
    fetchTable(1, next);
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

  // Render giá trị 1 ô theo đúng key — tách riêng để tái dùng chung 1 style
  // (truncate 1 dòng, có title tooltip xem full khi hover)
  const renderCellValue = (row, key) => {
    switch (key) {
      case "ngay_xe_vao_ttpp":
      case "ngay_bat_dau_len_hang":
      case "ngay_ket_thuc_len_hang":
      case "ngay_ttpp_yeu_cau_vao":
      case "thoi_gian_roi_kho_cuoi":
        return formatDateTime(row[key]);
      case "thoi_gian_luu_kho":
        return formatStorageDuration(row);
      default:
        return row[key] ?? "-";
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
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
                  const filterType = col.filterType || "text";

                  if (filterType === "none") {
                    return <th key={col.key} className="px-2 py-1.5" />;
                  }

                  if (filterType === "select") {
                    return (
                      <th key={col.key} className="px-2 py-1.5 font-normal">
                        <select
                          value={filters[col.key] || ""}
                          onChange={(e) =>
                            handleSelectFilterChange(col.key, e.target.value)
                          }
                          className="w-full rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs font-normal text-slate-700 outline-none focus:border-blue-400"
                        >
                          {STORAGE_TIME_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      </th>
                    );
                  }

                  return (
                    <th key={col.key} className="px-2 py-1.5 font-normal">
                      <input
                        type="text"
                        value={filters[col.key] || ""}
                        onChange={(e) =>
                          handleFilterChange(col.key, e.target.value)
                        }
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
                          title={typeof value === "string" ? value : undefined}
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
        <XuatHangImportModal
          onClose={() => setModalOpen(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
};

export default XuatHangForm;
