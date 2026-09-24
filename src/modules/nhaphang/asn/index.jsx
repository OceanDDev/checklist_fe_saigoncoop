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
import { asnService } from "@/services/nhaphang/asn.service";
import ASNImportModal from "./import";
import DateRangeFilter from "../dash/date";

const PAGE_SIZE = 20;

// Cột của bảng + key filter tương ứng gửi lên backend qua query string.
// "ngay_asn" và "ngay_import" không có key filter text riêng — 2 cột này
// lọc bằng khoảng ngày (vd ngay_asn_from / ngay_asn_to), xử lý riêng bên
// dưới, không đi qua input text chung như các cột khác.
const COLUMNS = [
  { key: "po", label: "PO" },
  { key: "ngay_asn", label: "Ngày ASN", isDateRange: true },
  { key: "so_booking", label: "Số Booking" },
  { key: "ma_ncc", label: "Mã NCC" },
  { key: "ten_ncc", label: "Tên NCC" },
  { key: "so_luong_sku", label: "SL SKUs" },
  { key: "so_kien", label: "Số Kiện" },
  { key: "loai_hinh", label: "Ghi chú" },
  { key: "ten_nganh_hang", label: "Ngành hàng" },
  { key: "kho", label: "Kho" },
  { key: "ngay_import", label: "Ngày import", isDateRange: true },
];

// Đọc lại date-only bằng UTC getters — khớp cách ghim ở NhapHangImportModal, không phụ thuộc timezone
const formatDateOnly = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "-";
  const dd = String(d.getUTCDate()).padStart(2, "0");
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

// ─────────────────────────────────────────────
// TABLE + SEARCH + PAGINATION — ASN
//
// Props MỚI (tuỳ chọn), cùng pattern với NhapHangForm:
// - initialFilters: object filter muốn áp ngay khi bảng mở ra
// - initialFiltersToken: đổi mỗi lần cần áp lại initialFilters
// ─────────────────────────────────────────────
const ASNForm = ({ initialFilters, initialFiltersToken }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [result, setResult] = useState(null);

  const [rows, setRows] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // filter theo từng field, key khớp với COLUMNS — riêng "ngay_asn" và
  // "ngay_import" dùng 2 key "<field>_from" / "<field>_to" thay vì 1 key
  // text như các cột khác
  const [filters, setFilters] = useState({});
  const debounceRef = useRef(null);

  const fetchTable = async (targetPage = page, activeFilters = filters) => {
    setLoadingTable(true);
    try {
      const params = { page: targetPage, limit: PAGE_SIZE };
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== "") params[key] = value;
      });
      const res = await asnService.getDanhSach(params);
      setRows(res?.data || []);
      setTotalPages(res?.totalPages || 1);
      setTotal(res?.total || 0);
    } catch (err) {
      console.error("Lỗi getDanhSach ASN:", err);
    } finally {
      setLoadingTable(false);
    }
  };

  useEffect(() => {
    fetchTable(1, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Áp filter khởi tạo từ bên ngoài (vd click donut Dashboard).
  useEffect(() => {
    if (!initialFilters || initialFiltersToken === undefined) return;
    setFilters(initialFilters);
    setPage(1);
    fetchTable(1, initialFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiltersToken]);

  // debounce khi gõ filter — reset về trang 1
  const handleFilterChange = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchTable(1, next);
    }, 400);
  };

  // DateRangeFilter báo về 1 cặp (from, to) mỗi lần chọn xong khoảng ngày
  // -> áp ngay, không cần debounce. Dùng chung cho mọi cột isDateRange
  // (ngay_asn, ngay_import...) — field là tiền tố key, vd "ngay_asn" thì
  // gửi lên "ngay_asn_from" / "ngay_asn_to".
  const handleDateRangeChange = (field, from, to) => {
    const next = {
      ...filters,
      [`${field}_from`]: from,
      [`${field}_to`]: to,
    };
    setFilters(next);
    setPage(1);
    fetchTable(1, next);
  };

  const handleDateRangeClear = (field) => {
    const next = { ...filters, [`${field}_from`]: "", [`${field}_to`]: "" };
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
        <div className="max-h-[500px] overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              <tr className="border-b border-slate-200 text-slate-500">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-3 py-2 font-medium">
                    {col.label}
                  </th>
                ))}
              </tr>
              <tr className="border-b border-slate-200 bg-white">
                {COLUMNS.map((col) =>
                  col.isDateRange ? (
                    <th key={col.key} className="px-2 py-1.5 font-normal">
                      <DateRangeFilter
                        label={`Lọc ${col.label.toLowerCase()}`}
                        startValue={filters[`${col.key}_from`]}
                        endValue={filters[`${col.key}_to`]}
                        onChange={(from, to) =>
                          handleDateRangeChange(col.key, from, to)
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
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-3 py-2">{r.po}</td>
                    <td className="px-3 py-2">{formatDateOnly(r.ngay_asn)}</td>
                    <td className="px-3 py-2">{r.so_booking}</td>
                    <td className="px-3 py-2">{r.ma_ncc}</td>
                    <td className="px-3 py-2">{r.ten_ncc}</td>
                    <td className="px-3 py-2">{r.so_luong_sku}</td>
                    <td className="px-3 py-2">{r.so_kien}</td>
                    <td className="px-3 py-2">{r.loai_hinh}</td>
                    <td className="px-3 py-2">{r.ten_nganh_hang}</td>
                    <td className="px-3 py-2">{r.kho}</td>
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
        <ASNImportModal
          onClose={() => setModalOpen(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
};

export default ASNForm;
