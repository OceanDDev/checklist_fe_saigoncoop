/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/importupdate.jsx
import { useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  RefreshCw,
  Upload,
  X,
  Loader2,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
} from "lucide-react";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";

// Thứ tự cột đúng như template xuất ra cho người dùng điền.
// TODO: đổi key "soPhieuGop" nếu "Số document" thực chất là field khác trong schema.
const TEMPLATE_COLUMNS = [
  { key: "soDonHang", label: "Số đơn hàng", required: true },
  { key: "soPhieuGop", label: "Số document", required: false },
  { key: "maNXD", label: "Mã NXĐ", required: true },
  { key: "nvSoan", label: "NV soạn", required: true },
  { key: "nvKC", label: "NV KC", required: false },
  { key: "kien", label: "Kiện", required: true },
  { key: "dong", label: "Dòng", required: true },
];

// Khớp header không phân biệt hoa/thường, dấu, khoảng trắng thừa —
// cùng cách tiếp cận với normalizeHeader đã dùng ở ImportNhanSuSoan.
const normalizeHeader = (s) =>
  (s || "")
    .toString()
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");

const HEADER_MATCH = TEMPLATE_COLUMNS.reduce((acc, col) => {
  acc[normalizeHeader(col.label)] = col.key;
  return acc;
}, {});

const downloadTemplate = async () => {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SC Logistics";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Import Update");
  sheet.columns = TEMPLATE_COLUMNS.map((c) => ({
    header: c.label,
    key: c.key,
    width: c.key === "nvSoan" || c.key === "nvKC" ? 24 : 16,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FF1E293B" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0F2FE" }, // cyan nhạt
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  // 1 dòng ví dụ để người dùng biết cách điền
  sheet.addRow({
    soDonHang: "SO0000001",
    soPhieuGop: "",
    maNXD: "NXD001",
    nvSoan: "NV001",
    nvKC: "",
    kien: 1,
    dong: 1,
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "Template_Import_Update.xlsx";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const parseWorkbookFile = async (file) => {
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) throw new Error("Không tìm thấy sheet dữ liệu trong file.");

  const headerRow = sheet.getRow(1);
  const colIndexToKey = {};
  headerRow.eachCell((cell, colNumber) => {
    const key = HEADER_MATCH[normalizeHeader(cell.value)];
    if (key) colIndexToKey[colNumber] = key;
  });

  const missingCols = TEMPLATE_COLUMNS.filter(
    (c) => c.required && !Object.values(colIndexToKey).includes(c.key),
  );
  if (missingCols.length > 0) {
    throw new Error(
      `Thiếu cột bắt buộc trong file: ${missingCols.map((c) => c.label).join(", ")}`,
    );
  }

  const rows = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // bỏ header
    const rawValues = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = colIndexToKey[colNumber];
      if (key) rawValues[key] = cell.value;
    });

    const isEmptyRow = Object.values(rawValues).every(
      (v) => v === null || v === undefined || v === "",
    );
    if (isEmptyRow) return;

    const toText = (v) =>
      v === null || v === undefined ? "" : String(v).trim();
    const toNumber = (v) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    // NV soạn/NV KC trong schema là mảng mã nhân viên — cho phép người dùng
    // điền nhiều mã cách nhau bằng dấu phẩy hoặc khoảng trắng trong 1 ô.
    const toMaList = (v) =>
      toText(v)
        .split(/[,\s]+/)
        .map((s) => s.trim())
        .filter(Boolean);

    const item = {
      _rowNumber: rowNumber,
      soDonHang: toText(rawValues.soDonHang),
      soPhieuGop: toText(rawValues.soPhieuGop),
      maNXD: toText(rawValues.maNXD),
      nvSoan: toMaList(rawValues.nvSoan),
      nvKC: toMaList(rawValues.nvKC),
      kien: toNumber(rawValues.kien),
      dong: toNumber(rawValues.dong),
    };

    const errors = [];
    if (!item.soDonHang) errors.push("Thiếu Số đơn hàng");
    if (!item.maNXD) errors.push("Thiếu Mã NXĐ");
    if (item.nvSoan.length === 0) errors.push("Thiếu NV soạn");
    if (item.kien === null) errors.push("Kiện không hợp lệ");
    if (item.dong === null) errors.push("Dòng không hợp lệ");

    rows.push({ ...item, _errors: errors });
  });

  if (rows.length === 0) throw new Error("File không có dữ liệu.");
  return rows;
};

const ImportUpdate = ({ onImported }) => {
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState([]);
  const [result, setResult] = useState(null); // { success, skipped, error }
  const fileInputRef = useRef(null);

  const resetState = useCallback(() => {
    setParsing(false);
    setImporting(false);
    setParseError("");
    setRows([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClose = useCallback(() => {
    if (importing) return; // không cho đóng khi đang lưu dở
    setOpen(false);
    resetState();
  }, [importing, resetState]);

  const handleFileChange = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setParsing(true);
    setParseError("");
    setRows([]);
    setResult(null);
    try {
      const parsed = await parseWorkbookFile(file);
      setRows(parsed);
    } catch (err) {
      console.error("Lỗi đọc file Import Update:", err);
      setParseError(
        err.message || "Không đọc được file. Vui lòng kiểm tra lại định dạng.",
      );
    } finally {
      setParsing(false);
    }
  }, []);

  const validRows = rows.filter((r) => r._errors.length === 0);
  const invalidRows = rows.filter((r) => r._errors.length > 0);

  const handleImport = useCallback(async () => {
    if (validRows.length === 0) return;
    setImporting(true);
    try {
      // Backend (importUpdateNhanSuSoan) chỉ update tgHoanThanh (và tgNhanPhieu
      // nếu chưa có) cho các đơn ĐÃ TỒN TẠI theo soDonHang. Đơn không tồn tại
      // sẽ bị bỏ qua (không insert mới). Các field khác trong file KHÔNG được
      // dùng để ghi đè dữ liệu gốc, chỉ cần soDonHang để match.
      // eslint-disable-next-line no-unused-vars
      const payload = validRows.map(({ _rowNumber, _errors, ...item }) => item);

      const res = await nhanSuSoanService.importUpdateNhanSuSoan(payload);
      setResult({
        success: res?.modifiedCount ?? 0,
        skipped: res?.skipped ?? [],
      });
      onImported?.();
    } catch (err) {
      console.error("Lỗi Import Update:", err);
      setResult({ success: 0, skipped: [], error: true });
    } finally {
      setImporting(false);
    }
  }, [validRows, onImported]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Import cập nhật thời gian hoàn thành cho các đơn đã tồn tại"
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-cyan-700 hover:to-teal-700 hover:shadow-md active:scale-95"
      >
        <RefreshCw size={15} />
        Import Update
      </button>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/50 p-4"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
          >
            <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div className="flex items-center gap-2">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-cyan-50 text-cyan-600">
                    <RefreshCw size={16} />
                  </div>
                  <h3 className="text-base font-bold text-slate-800">
                    Import Update
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={importing}
                  className="rounded-full p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                  title="Đóng"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                <button
                  type="button"
                  onClick={downloadTemplate}
                  className="flex items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 px-3.5 py-2 text-sm font-semibold text-cyan-700 shadow-sm transition-all hover:bg-cyan-100"
                >
                  <Download size={15} />
                  Tải template mẫu
                </button>

                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center transition-colors hover:border-cyan-400 hover:bg-cyan-50/40">
                  <Upload size={22} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-600">
                    Chọn file Excel đã điền (.xlsx)
                  </span>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>

                {parsing && (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                    <Loader2 size={16} className="animate-spin" />
                    Đang đọc file...
                  </div>
                )}

                {parseError && (
                  <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    {parseError}
                  </div>
                )}

                {rows.length > 0 && !result && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-md bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200">
                        {validRows.length} dòng hợp lệ
                      </span>
                      {invalidRows.length > 0 && (
                        <span className="rounded-md bg-rose-50 px-2 py-1 font-semibold text-rose-700 ring-1 ring-rose-200">
                          {invalidRows.length} dòng lỗi (sẽ bị bỏ qua)
                        </span>
                      )}
                    </div>

                    <div className="max-h-56 overflow-auto rounded-xl border border-slate-200">
                      <table className="min-w-full text-xs">
                        <thead className="sticky top-0 bg-slate-100">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-semibold text-slate-500">
                              Dòng
                            </th>
                            <th className="px-2 py-1.5 text-left font-semibold text-slate-500">
                              Số đơn hàng
                            </th>
                            <th className="px-2 py-1.5 text-left font-semibold text-slate-500">
                              Mã NXĐ
                            </th>
                            <th className="px-2 py-1.5 text-left font-semibold text-slate-500">
                              NV soạn
                            </th>
                            <th className="px-2 py-1.5 text-left font-semibold text-slate-500">
                              NV KC
                            </th>
                            <th className="px-2 py-1.5 text-left font-semibold text-slate-500">
                              Kiện
                            </th>
                            <th className="px-2 py-1.5 text-left font-semibold text-slate-500">
                              Dòng SL
                            </th>
                            <th className="px-2 py-1.5 text-left font-semibold text-slate-500">
                              Lỗi
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map((r) => (
                            <tr
                              key={r._rowNumber}
                              className={
                                r._errors.length > 0
                                  ? "bg-rose-50/60"
                                  : "even:bg-slate-50"
                              }
                            >
                              <td className="px-2 py-1 text-slate-400">
                                {r._rowNumber}
                              </td>
                              <td className="px-2 py-1 font-medium text-slate-700">
                                {r.soDonHang}
                              </td>
                              <td className="px-2 py-1">{r.maNXD}</td>
                              <td className="px-2 py-1">
                                {r.nvSoan.join(", ") || "—"}
                              </td>
                              <td className="px-2 py-1">
                                {r.nvKC.join(", ") || "—"}
                              </td>
                              <td className="px-2 py-1">{r.kien ?? "—"}</td>
                              <td className="px-2 py-1">{r.dong ?? "—"}</td>
                              <td className="px-2 py-1 text-rose-600">
                                {r._errors.join("; ")}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result && (
                  <div
                    className={`flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ring-1 ${
                      result.error
                        ? "bg-rose-50 text-rose-700 ring-rose-200"
                        : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    }`}
                  >
                    {result.error ? (
                      <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                    ) : (
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                    )}
                    <div className="space-y-1">
                      {result.error ? (
                        "Cập nhật thất bại. Vui lòng thử lại."
                      ) : (
                        <>
                          <div>
                            Đã cập nhật <b>{result.success}</b> phiếu.
                            {result.skipped.length > 0 &&
                              ` ${result.skipped.length} phiếu bị bỏ qua.`}
                          </div>
                          {result.skipped.length > 0 && (
                            <ul className="ml-4 list-disc text-xs text-rose-600">
                              {result.skipped.slice(0, 10).map((s, i) => (
                                <li key={i}>
                                  {s.soDonHang}: {s.reason}
                                </li>
                              ))}
                              {result.skipped.length > 10 && (
                                <li>
                                  ... và {result.skipped.length - 10} dòng khác
                                </li>
                              )}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={importing}
                  className="rounded-xl px-3.5 py-2 text-sm font-semibold text-slate-500 transition-colors hover:bg-slate-100 disabled:opacity-40"
                >
                  {result && !result.error ? "Đóng" : "Huỷ"}
                </button>
                {(!result || result.error) && (
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={importing || validRows.length === 0}
                    className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-cyan-700 hover:to-teal-700 disabled:opacity-50"
                  >
                    {importing ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <FileSpreadsheet size={15} />
                    )}
                    {importing
                      ? "Đang cập nhật..."
                      : `Cập nhật ${validRows.length || ""} phiếu`}
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
};

export default ImportUpdate;
