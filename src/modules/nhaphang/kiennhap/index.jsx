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
import { nhapHangService } from "@/services/nhaphang/nhaphang.service";
import NhapHangImportModal from "./import";

const PAGE_SIZE = 20;

// Cột của bảng + key filter tương ứng gửi lên backend qua query string
const COLUMNS = [
  { key: "sku", label: "SKU" },
  { key: "name", label: "Tên SP" },
  { key: "vi_tri", label: "Vị trí" },
  { key: "kien", label: "Kiện" },
  { key: "lpn", label: "Số LPN" },
  { key: "kho", label: "Kho" },
  { key: "tong_sl", label: "Tổng SL" },
  { key: "trang_thai", label: "Trạng thái" },
  { key: "nhan_vien_nhap", label: "NV Nhận" },
  { key: "nhan_vien_put", label: "NV Putaway" },
  { key: "ngay_nhap_kho", label: "Ngày nhập kho" },
  { key: "ngay_import", label: "Ngày import" },
];

// Đọc lại date-only bằng UTC getters — khớp với cách ghim ở NhapHangImportModal, không phụ thuộc timezone
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
// TABLE + SEARCH + PAGINATION
//
// Props MỚI (tuỳ chọn):
// - initialFilters: object filter muốn áp ngay khi bảng mở ra (ví dụ khi
//   click từ donut Put Hàng bên Dashboard qua: { vi_tri: "RZ" }).
// - initialFiltersToken: 1 giá trị (số/tem thời gian) đổi mỗi lần cần áp
//   lại initialFilters — kể cả khi filter object giống lần trước, để đảm
//   bảo useEffect chạy lại và bảng luôn phản ánh đúng lần click mới nhất.
// ─────────────────────────────────────────────
const NhapHangForm = ({ initialFilters, initialFiltersToken }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [result, setResult] = useState(null);

  const [rows, setRows] = useState([]);
  const [loadingTable, setLoadingTable] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // filter theo từng field, key khớp với COLUMNS
  const [filters, setFilters] = useState({});
  const debounceRef = useRef(null);

  const fetchTable = async (targetPage = page, activeFilters = filters) => {
    setLoadingTable(true);
    try {
      const params = { page: targetPage, limit: PAGE_SIZE, loai_hinh: "Nhập" };
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

  // Áp filter khởi tạo từ bên ngoài (vd click donut Put Hàng ở Dashboard).
  // Chạy lại mỗi khi initialFiltersToken đổi, kể cả filter giống lần trước.
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
                {COLUMNS.map((col) => (
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
                ))}
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
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.vi_tri}</td>
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
