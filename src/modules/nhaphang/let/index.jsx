/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  UploadCloud,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  Warehouse,
  FileCheck2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { nhapHangService } from "@/services/nhaphang/nhaphang.service";

// 3 kho cố định
const KHO_LIST = [
  { kho: 810, label: "Kho 810" },
  { kho: 8101, label: "Kho 8101" },
  { kho: 8104, label: "Kho 8104" },
];

const PAGE_SIZE = 20;

// Trạng thái thực tế trong file Excel Let (không phải free-text)
const TRANG_THAI_OPTIONS = [
  "Chờ lệnh châm hàng",
  "Sẵn sàng châm hàng",
  "Hoàn thành",
];

// Cột hiển thị của bảng "Let" — không có Tổng SL, không có Ngày nhập kho (khác bảng Nhập)
const COLUMNS = [
  { key: "sku", label: "SKU" },
  { key: "name", label: "Tên SP" },
  { key: "vi_tri", label: "Vị trí" },
  { key: "kien", label: "Kiện" },
  { key: "kho", label: "Kho" },
  { key: "trang_thai", label: "Trạng thái" },
  { key: "ngay_let", label: "Ngày giờ tạo" },
  { key: "ngay_import", label: "Ngày import" },
];

// Map cột trong file Excel (Clog_repleshniment) -> field trong DB
// Tổng SL: bỏ qua (schema tự default 0)
const mapRow = (row, kho) => ({
  sku: String(row["Mã Sản Phẩm"] ?? "").trim(),
  name: String(row["Tên Sản Phẩm"] ?? "").trim(),
  vi_tri: String(row["Vị trí châm"] ?? "").trim(),
  kien: Number(row["Số Kiện"] ?? 0),
  kho: Number(kho),
  trang_thai: String(row["Trạng thái"] ?? "").trim(),
  loai_hinh: "Let",
  ngay_let:
    row["Ngày Giờ Tạo"] instanceof Date
      ? row["Ngày Giờ Tạo"]
      : parseDateTime(row["Ngày Giờ Tạo"]),
});

// "Ngày Giờ Tạo" là datetime đầy đủ (có giờ) -> không cần ghim UTC noon như date-only,
// giữ nguyên giờ thật vì có ý nghĩa (giờ tạo phiếu châm hàng)
const parseDateTime = (value) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? undefined : parsed;
};

const parseExcelFile = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("Không đọc được file"));
    reader.readAsArrayBuffer(file);
  });

// ─────────────────────────────────────────────
// MODAL IMPORT — chọn 1, 2 hoặc cả 3 kho cùng lúc, mỗi kho 1 file riêng
// ─────────────────────────────────────────────
const ImportModal = ({ onClose, onImported }) => {
  const fileInputRefs = useRef({});
  const [slots, setSlots] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const setSlot = (kho, patch) =>
    setSlots((prev) => ({ ...prev, [kho]: { ...prev[kho], ...patch } }));

  const handlePickFile = (kho) => {
    fileInputRefs.current[kho]?.click();
  };

  const handleFileChange = async (kho, e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setSubmitError(null);
    setSlot(kho, { loading: true, error: null, fileName: file.name });

    try {
      const rows = await parseExcelFile(file);
      if (!rows.length) {
        setSlot(kho, {
          loading: false,
          error: "File không có dữ liệu",
          items: null,
        });
        return;
      }
      const items = rows
        .map((row) => mapRow(row, kho))
        .filter((item) => item.sku);
      setSlot(kho, { loading: false, items, fileName: file.name });
    } catch (err) {
      console.error("Lỗi đọc file Excel:", err);
      setSlot(kho, {
        loading: false,
        error: "Lỗi đọc file: " + err.message,
        items: null,
      });
    }
  };

  const handleRemoveSlot = (kho) => {
    setSlots((prev) => {
      const next = { ...prev };
      delete next[kho];
      return next;
    });
  };

  const selectedKhoList = KHO_LIST.filter(
    ({ kho }) => slots[kho]?.items?.length,
  );
  const totalItems = selectedKhoList.reduce(
    (sum, { kho }) => sum + slots[kho].items.length,
    0,
  );
  const anyLoading = Object.values(slots).some((s) => s?.loading);

  const handleConfirmImport = async () => {
    if (selectedKhoList.length === 0) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const allItems = selectedKhoList.flatMap(({ kho }) => slots[kho].items);
      const res = await nhapHangService.importNhieu(allItems);
      const khoLabel = selectedKhoList.map(({ label }) => label).join(", ");
      onImported({
        success: true,
        message:
          res?.message ||
          `Import thành công ${allItems.length} dòng (${khoLabel})`,
      });
    } catch (err) {
      console.error("Lỗi import:", err);
      setSubmitError(err?.response?.data?.message || "Import thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            Import Châm Hàng (Let) Từ Excel
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-auto p-5">
          <p className="text-sm text-slate-400">
            Chọn file Excel cho 1, 2 hoặc cả 3 kho — có thể import cùng lúc.
          </p>

          {KHO_LIST.map(({ kho, label }) => {
            const slot = slots[kho];
            return (
              <div
                key={kho}
                className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3"
              >
                <input
                  ref={(el) => (fileInputRefs.current[kho] = el)}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => handleFileChange(kho, e)}
                />

                <div className="flex w-28 shrink-0 items-center gap-2 text-sm font-medium text-slate-700">
                  <Warehouse size={16} className="text-amber-600" />
                  {label}
                </div>

                <div className="min-w-0 flex-1">
                  {slot?.loading ? (
                    <span className="flex items-center gap-1.5 text-sm text-slate-400">
                      <Loader2 size={14} className="animate-spin" /> Đang đọc
                      file...
                    </span>
                  ) : slot?.error ? (
                    <span className="flex items-center gap-1.5 text-sm text-red-600">
                      <XCircle size={14} /> {slot.error}
                    </span>
                  ) : slot?.items ? (
                    <span className="flex items-center gap-1.5 truncate text-sm text-emerald-700">
                      <FileCheck2 size={14} className="shrink-0" />
                      <span className="truncate">{slot.fileName}</span>
                      <span className="shrink-0 text-slate-400">
                        ({slot.items.length} dòng)
                      </span>
                    </span>
                  ) : (
                    <span className="text-sm text-slate-400">
                      Chưa chọn file
                    </span>
                  )}
                </div>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handlePickFile(kho)}
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                  >
                    {slot?.items ? "Đổi file" : "Chọn file"}
                  </button>
                  {slot?.items && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => handleRemoveSlot(kho)}
                      className="rounded-md border border-red-200 p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {submitError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <XCircle size={16} />
              {submitError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <span className="text-sm text-slate-500">
            {selectedKhoList.length > 0
              ? `${selectedKhoList.length}/3 kho — tổng ${totalItems} dòng`
              : ""}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
            >
              Đóng
            </button>
            <button
              type="button"
              disabled={
                selectedKhoList.length === 0 || submitting || anyLoading
              }
              onClick={handleConfirmImport}
              className="flex items-center gap-1.5 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Xác nhận Import
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// TABLE + SEARCH + PAGINATION (loai_hinh cố định = "Let")
//
// Props:
// - initialFilters: object filter được "bơm" sẵn từ bên ngoài (vd: click
//   donut Let Hàng ở Dashboard -> { trang_thai, kho }). Optional.
// - initialFiltersToken: số tăng dần mỗi lần initialFilters thay đổi, dùng
//   để trigger áp lại filter dù giá trị object giống lần trước (áp dụng
//   đúng pattern đang dùng ở NhapHangForm).
// ─────────────────────────────────────────────
const LetForm = ({ initialFilters, initialFiltersToken }) => {
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
      const params = { page: targetPage, limit: PAGE_SIZE, loai_hinh: "Let" };
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

  // Áp filter được bơm từ bên ngoài (Dashboard -> click donut Let Hàng).
  // Chạy lại mỗi khi token đổi (kể cả khi filter giống lần trước).
  useEffect(() => {
    if (!initialFiltersToken) return; // token mặc định undefined/0 -> bỏ qua lần mount đầu
    const next = { ...(initialFilters || {}) };
    setFilters(next);
    setPage(1);
    fetchTable(1, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFiltersToken]);

  const handleFilterChange = (key, value, immediate = false) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    setPage(1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (immediate) {
      fetchTable(1, next);
    } else {
      debounceRef.current = setTimeout(() => {
        fetchTable(1, next);
      }, 400);
    }
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
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700"
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
                  col.key === "trang_thai" ? (
                    <th key={col.key} className="px-2 py-1.5 font-normal">
                      <select
                        value={filters[col.key] || ""}
                        onChange={(e) =>
                          handleFilterChange(col.key, e.target.value, true)
                        }
                        className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-normal text-slate-700 outline-none focus:border-amber-400"
                      >
                        <option value="">Tất cả</option>
                        {TRANG_THAI_OPTIONS.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
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
                        className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal text-slate-700 outline-none focus:border-amber-400"
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
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.vi_tri}</td>
                    <td className="px-3 py-2">{r.kien}</td>
                    <td className="px-3 py-2">{r.kho}</td>
                    <td className="px-3 py-2">{r.trang_thai}</td>
                    <td className="px-3 py-2">
                      {r.ngay_let
                        ? new Date(r.ngay_let).toLocaleString("vi-VN")
                        : "-"}
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
        <ImportModal
          onClose={() => setModalOpen(false)}
          onImported={handleImported}
        />
      )}
    </div>
  );
};

export default LetForm;
