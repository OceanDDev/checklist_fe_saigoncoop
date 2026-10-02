/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { nhapHangService } from "@/services/nhaphang/nhaphang.service";
import NhapHangImportModal from "./import";
import DateRangeFilter from "../dash/date";

const PAGE_SIZE = 20;
const LOAI_HINH = "Nhập";

const COLUMNS = [
  { key: "sku", label: "SKU" },
  { key: "name", label: "Tên SP" },
  { key: "so_phieu_nhap", label: "Số phiếu nhập" },
  { key: "vi_tri", label: "Vị trí" },
  { key: "loai_hinh_nhap", label: "Loại hình nhập" },
  { key: "so_po", label: "Số Po" },
  { key: "kien", label: "Kiện" },
  { key: "lpn", label: "Số LPN" },
  { key: "kho", label: "Kho" },
  { key: "tong_sl", label: "Tổng SL" },
  { key: "trang_thai", label: "Trạng thái" },
  { key: "nhan_vien_nhap", label: "NV Nhận" },
  { key: "nhan_vien_put", label: "NV Putaway" },
  { key: "ngay_nhap_kho", label: "Ngày nhập kho" },
  { key: "ngay_san_xuat", label: "Ngày Sản Xuất" },
  { key: "ngay_het_han", label: "Ngày Hết Hạn" },
  { key: "ngay_import", label: "Ngày import" },
];

// Các cột lọc theo khoảng "Từ ngày - Đến ngày" -> gửi ${key}_from / ${key}_to
const DATE_RANGE_KEYS = [
  "ngay_nhap_kho",
  "ngay_san_xuat",
  "ngay_het_han",
  "ngay_import",
];
// Ngày hết hạn có thể nằm trong tương lai -> cho chọn ngày tương lai
const FUTURE_DATE_KEYS = ["ngay_het_han"];

const formatDateOnly = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const NhapHangForm = ({ initialFilters, initialFiltersToken }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [result, setResult] = useState(null);

  const [rows, setRows] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [filters, setFilters] = useState({});
  const debounceRef = useRef(null);

  // ── Chọn & xóa ──
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectAllFilter, setSelectAllFilter] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchTable = async (targetPage = page, activeFilters = filters) => {
    setLoadingTable(true);
    setSelectedIds(new Set());
    setSelectAllFilter(false);
    try {
      const params = {
        page: targetPage,
        limit: PAGE_SIZE,
        loai_hinh: LOAI_HINH,
      };
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") params[key] = value;
      });
      const res = await nhapHangService.getDanhSach(params);
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

  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchTable(1, next);
    }, 400);
  };

  // Lọc khoảng ngày: set cả _from và _to rồi fetch ngay
  const handleDateRangeChange = (baseKey, start, end) => {
    const next = {
      ...filters,
      [`${baseKey}_from`]: start,
      [`${baseKey}_to`]: end,
    };
    setFilters(next);
    setPage(1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    fetchTable(1, next);
  };

  const handleDateRangeClear = (baseKey) => {
    handleDateRangeChange(baseKey, "", "");
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

  // ── Logic chọn dòng ──
  const hasActiveFilter = Object.values(filters).some(
    (v) => v !== undefined && v !== "",
  );
  const allPageChecked =
    rows.length > 0 && rows.every((r) => selectedIds.has(r._id));
  const selectedCount = selectAllFilter ? total : selectedIds.size;

  const toggleRow = (id) => {
    setSelectAllFilter(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPage = () => {
    setSelectAllFilter(false);
    setSelectedIds(
      allPageChecked ? new Set() : new Set(rows.map((r) => r._id)),
    );
  };

  const handleDelete = async () => {
    if (selectedCount === 0) return;
    const msg = selectAllFilter
      ? `Xóa TOÀN BỘ ${total} bản ghi khớp bộ lọc hiện tại?\nKhông thể hoàn tác!`
      : `Xóa ${selectedIds.size} bản ghi đã chọn?\nKhông thể hoàn tác!`;
    if (!window.confirm(msg)) return;

    setDeleting(true);
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== undefined && v !== ""),
      );
      const res = selectAllFilter
        ? await nhapHangService.xoaTheoBoLoc(cleanFilters, LOAI_HINH)
        : await nhapHangService.xoaNhieu({ ids: [...selectedIds] });
      setResult({ success: true, message: res?.message || "Đã xóa" });
      setPage(1);
      fetchTable(1, filters);
    } catch (err) {
      console.error("Lỗi xóa:", err);
      setResult({
        success: false,
        message: err?.response?.data?.message || "Xóa thất bại",
      });
    } finally {
      setDeleting(false);
    }
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

          {selectedCount > 0 && (
            <button
              type="button"
              disabled={deleting}
              onClick={handleDelete}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Trash2 size={16} />
              )}
              Xóa {selectedCount} dòng
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

      {allPageChecked && total > rows.length && hasActiveFilter && (
        <div className="mb-2 rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-800">
          {selectAllFilter ? (
            <>
              Đã chọn tất cả <b>{total}</b> bản ghi khớp bộ lọc.{" "}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => setSelectAllFilter(false)}
              >
                Chỉ chọn trang này
              </button>
            </>
          ) : (
            <>
              Đã chọn {rows.length} dòng của trang này.{" "}
              <button
                type="button"
                className="font-medium underline"
                onClick={() => setSelectAllFilter(true)}
              >
                Chọn tất cả {total} bản ghi khớp bộ lọc
              </button>
            </>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200">
        <div className="max-h-[500px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="w-8 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={allPageChecked}
                    onChange={toggleAllPage}
                    disabled={rows.length === 0}
                  />
                </th>
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-3 py-2 font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-slate-200 bg-white">
                <th className="w-8 px-2 py-1.5" />
                {COLUMNS.map((col) =>
                  DATE_RANGE_KEYS.includes(col.key) ? (
                    <th key={col.key} className="px-2 py-1.5 font-normal">
                      <DateRangeFilter
                        accent="blue"
                        allowFuture={FUTURE_DATE_KEYS.includes(col.key)}
                        startValue={filters[`${col.key}_from`]}
                        endValue={filters[`${col.key}_to`]}
                        onChange={(start, end) =>
                          handleDateRangeChange(col.key, start, end)
                        }
                        onClear={() => handleDateRangeClear(col.key)}
                      />
                    </th>
                  ) : (
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
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length + 1}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    <Loader2 size={16} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={COLUMNS.length + 1}
                    className="px-3 py-6 text-center text-slate-400"
                  >
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r._id}
                    className={[
                      "border-b border-slate-100 last:border-0",
                      selectedIds.has(r._id) || selectAllFilter
                        ? "bg-blue-50/60"
                        : "",
                    ].join(" ")}
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={selectAllFilter || selectedIds.has(r._id)}
                        onChange={() => toggleRow(r._id)}
                      />
                    </td>
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.so_phieu_nhap}</td>
                    <td className="px-3 py-2">{r.vi_tri}</td>
                    <td className="px-3 py-2">{r.loai_hinh_nhap}</td>
                    <td className="px-3 py-2">{r.so_po}</td>
                    <td className="px-3 py-2">{r.kien}</td>
                    <td className="px-3 py-2">{r.lpn}</td>
                    <td className="px-3 py-2">{r.kho}</td>
                    <td className="px-3 py-2">{r.tong_sl}</td>
                    <td className="px-3 py-2">{r.trang_thai}</td>
                    <td className="px-3 py-2">{r.nhan_vien_nhap}</td>
                    <td className="px-3 py-2">{r.nhan_vien_put}</td>
                    <td className="px-3 py-2">
                      {formatDateOnly(r.ngay_nhap_kho)}
                    </td>
                    <td className="px-3 py-2">
                      {formatDateOnly(r.ngay_san_xuat)}
                    </td>
                    <td className="px-3 py-2">
                      {formatDateOnly(r.ngay_het_han)}
                    </td>
                    <td className="px-3 py-2">
                      {r.ngay_import
                        ? new Date(r.ngay_import).toLocaleString("vi-VN")
                        : "-"}
                    </td>
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
        <NhapHangImportModal
          onClose={() => setModalOpen(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
};

export default NhapHangForm;