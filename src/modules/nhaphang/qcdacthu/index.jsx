/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from "react";
import ExcelJS from "exceljs";
import {
  UploadCloud,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  X,
  FileCheck2,
  Trash2,
  Pencil,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { qcDacThuService } from "@/services/nhaphang/qcdacthu.service";

const PAGE_SIZE = 20;

const COLUMNS = [
  { key: "sku", label: "SKU" },
  { key: "name", label: "Tên SP" },
  { key: "quy_cach", label: "Quy cách" },
];

// Đọc file Excel bằng exceljs -> trả về mảng { sku, name, quy_cach }
const parseExcelFile = async (file) => {
  const buffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows = [];
  const headerRow = sheet.getRow(1);
  const headerMap = {}; // colIndex -> tên cột chuẩn hoá

  headerRow.eachCell((cell, colNumber) => {
    const raw = String(cell.value ?? "").trim().toLowerCase();
    if (["sku", "mã sản phẩm", "ma sku"].includes(raw)) headerMap[colNumber] = "sku";
    else if (["name", "tên sản phẩm", "ten san pham"].includes(raw)) headerMap[colNumber] = "name";
    else if (["quy_cach", "quy cách", "quy cach"].includes(raw)) headerMap[colNumber] = "quy_cach";
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // bỏ header
    const item = { sku: "", name: "", quy_cach: "" };
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const field = headerMap[colNumber];
      if (field) item[field] = String(cell.value ?? "").trim();
    });
    if (item.sku) rows.push(item);
  });

  return rows;
};

// Tạo & tải file template Excel bằng exceljs
const downloadTemplate = async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("QC Đặc Thù");

  sheet.columns = [
    { header: "sku", key: "sku", width: 20 },
    { header: "name", key: "name", width: 35 },
    { header: "quy_cach", key: "quy_cach", width: 25 },
  ];

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE2E8F0" },
    };
  });

  // 1 dòng mẫu minh hoạ
  sheet.addRow({ sku: "SKU001", name: "Tên sản phẩm mẫu", quy_cach: "Thùng 12 chai" });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/octet-stream",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "template_qcdacthu.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

// ─────────────────────────────────────────────
// MODAL IMPORT EXCEL
// ─────────────────────────────────────────────
const ImportModal = ({ onClose, onImported }) => {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [items, setItems] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setFileError(null);
    setSubmitError(null);
    setLoadingFile(true);
    setFileName(file.name);

    try {
      const rows = await parseExcelFile(file);
      if (!rows.length) {
        setFileError("File không có dữ liệu hợp lệ");
        setItems(null);
      } else {
        setItems(rows);
      }
    } catch (err) {
      console.error("Lỗi đọc file Excel:", err);
      setFileError("Lỗi đọc file: " + err.message);
      setItems(null);
    } finally {
      setLoadingFile(false);
    }
  };

  const handleRemoveFile = () => {
    setFileName("");
    setItems(null);
    setFileError(null);
  };

  const handleConfirmImport = async () => {
    if (!items?.length) return;
    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await qcDacThuService.importNhieu(items);
      onImported({
        success: true,
        message: res?.message || `Import thành công ${items.length} dòng`,
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
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            Import QC Đặc Thù Từ Excel
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-auto p-5">
          <button
            type="button"
            onClick={downloadTemplate}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600"
          >
            <Download size={16} />
            Tải template mẫu (sku, name, quy_cach)
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />

          <div className="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3">
            <div className="min-w-0 flex-1">
              {loadingFile ? (
                <span className="flex items-center gap-1.5 text-sm text-slate-400">
                  <Loader2 size={14} className="animate-spin" /> Đang đọc file...
                </span>
              ) : fileError ? (
                <span className="flex items-center gap-1.5 text-sm text-red-600">
                  <XCircle size={14} /> {fileError}
                </span>
              ) : items ? (
                <span className="flex items-center gap-1.5 truncate text-sm text-emerald-700">
                  <FileCheck2 size={14} className="shrink-0" />
                  <span className="truncate">{fileName}</span>
                  <span className="shrink-0 text-slate-400">({items.length} dòng)</span>
                </span>
              ) : (
                <span className="text-sm text-slate-400">Chưa chọn file</span>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={handlePickFile}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
              >
                {items ? "Đổi file" : "Chọn file"}
              </button>
              {items && (
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleRemoveFile}
                  className="rounded-md border border-red-200 p-1.5 text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>

          {submitError && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-700">
              <XCircle size={16} />
              {submitError}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={!items?.length || submitting || loadingFile}
            onClick={handleConfirmImport}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Xác nhận Import
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MODAL THÊM / SỬA 1 BẢN GHI
// ─────────────────────────────────────────────
const RecordModal = ({ record, onClose, onSaved }) => {
  const isEdit = Boolean(record?._id);
  const [form, setForm] = useState({
    sku: record?.sku || "",
    name: record?.name || "",
    quy_cach: record?.quy_cach || "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async () => {
    if (!form.sku.trim()) {
      setError("SKU không được để trống");
      return;
    }
    setSubmitting(true);
    setError(null);

    try {
      if (isEdit) {
        await qcDacThuService.capNhat(record._id, form);
      } else {
        await qcDacThuService.themQcDacThu(form);
      }
      onSaved({
        success: true,
        message: isEdit ? "Cập nhật thành công" : "Thêm mới thành công",
      });
    } catch (err) {
      console.error("Lỗi lưu bản ghi:", err);
      setError(err?.response?.data?.message || "Lưu thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            {isEdit ? "Sửa QC Đặc Thù" : "Thêm QC Đặc Thù"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">SKU</label>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => handleChange("sku", e.target.value)}
              disabled={isEdit}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400 disabled:bg-slate-50 disabled:text-slate-400"
              placeholder="Nhập SKU"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Tên SP</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="Nhập tên sản phẩm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Quy cách</label>
            <input
              type="text"
              value={form.quy_cach}
              onChange={(e) => handleChange("quy_cach", e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-400"
              placeholder="Nhập quy cách"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <XCircle size={15} />
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Lưu
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MODAL XÁC NHẬN XÓA
// ─────────────────────────────────────────────
const DeleteConfirmModal = ({ record, onClose, onDeleted }) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleDelete = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await qcDacThuService.xoa(record._id);
      onDeleted({ success: true, message: `Đã xóa SKU ${record.sku}` });
    } catch (err) {
      console.error("Lỗi xóa:", err);
      setError(err?.response?.data?.message || "Xóa thất bại");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-xl">
        <div className="p-5">
          <h2 className="text-base font-semibold text-slate-800">Xác nhận xóa</h2>
          <p className="mt-2 text-sm text-slate-500">
            Bạn có chắc muốn xóa bản ghi SKU <span className="font-medium text-slate-700">{record.sku}</span>? Hành động này không thể hoàn tác.
          </p>
          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <XCircle size={15} />
              {error}
            </div>
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={handleDelete}
            className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// TABLE + SEARCH + PAGINATION
// ─────────────────────────────────────────────
const QcDacThuForm = () => {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [recordModal, setRecordModal] = useState(null); // null | { } (thêm) | record (sửa)
  const [deleteTarget, setDeleteTarget] = useState(null);
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
      const res = await qcDacThuService.getDanhSach(params);
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
    setImportModalOpen(false);
    setPage(1);
    fetchTable(1, filters);
  };

  const handleSaved = (res) => {
    setResult(res);
    setRecordModal(null);
    fetchTable(page, filters);
  };

  const handleDeleted = (res) => {
    setResult(res);
    setDeleteTarget(null);
    fetchTable(page, filters);
  };

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setImportModalOpen(true);
            }}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <UploadCloud size={16} />
            Import Excel
          </button>
          <button
            type="button"
            onClick={() => {
              setResult(null);
              setRecordModal({});
            }}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            <Plus size={16} />
            Thêm
          </button>
        </div>

        <span className="text-sm text-slate-500">{total > 0 && `${total} bản ghi`}</span>
      </div>

      {result && (
        <div
          className={[
            "mb-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm",
            result.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
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
                <th className="px-3 py-2 font-medium">Thao tác</th>
              </tr>
              <tr className="border-b border-slate-200 bg-white">
                {COLUMNS.map((col) => (
                  <th key={col.key} className="px-2 py-1.5 font-normal">
                    <input
                      type="text"
                      value={filters[col.key] || ""}
                      onChange={(e) => handleFilterChange(col.key, e.target.value)}
                      placeholder="Tìm..."
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-normal text-slate-700 outline-none focus:border-blue-400"
                    />
                  </th>
                ))}
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-3 py-6 text-center text-slate-400">
                    <Loader2 size={16} className="mx-auto animate-spin" />
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length + 1} className="px-3 py-6 text-center text-slate-400">
                    Không có dữ liệu
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r._id} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2">{r.sku}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{r.quy_cach}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setResult(null);
                            setRecordModal(r);
                          }}
                          className="rounded-md border border-slate-200 p-1.5 text-slate-500 hover:bg-slate-100 hover:text-blue-600"
                          title="Sửa"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setResult(null);
                            setDeleteTarget(r);
                          }}
                          className="rounded-md border border-red-200 p-1.5 text-red-500 hover:bg-red-50"
                          title="Xóa"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
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

      {importModalOpen && (
        <ImportModal onClose={() => setImportModalOpen(false)} onImported={handleImported} />
      )}

      {recordModal && (
        <RecordModal
          record={recordModal._id ? recordModal : null}
          onClose={() => setRecordModal(null)}
          onSaved={handleSaved}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          record={deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onDeleted={handleDeleted}
        />
      )}
    </div>
  );
};

export default QcDacThuForm;