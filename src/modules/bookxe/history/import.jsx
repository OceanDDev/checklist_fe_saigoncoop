/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { bookXeService } from "@/services/bookxe.service";

// Cột trong file Excel -> field trong schema HistoryBookXe
// (Chỉ lấy đúng 6 cột này, các cột còn lại bỏ qua)
const HEADER_MAP = {
  Concept: "concept",
  "Mã LDD": "lenh_dieu_dong",
  "Mã siêu thị": "ma_ch",
  "SIÊU THỊ": "ten_ch",
  "Mã NVC": "ma_ncv",
  NVC: "ten_nvc",
};

// Cột bắt buộc phải có mặt trong file mới coi là đúng header
const ANCHOR_HEADER = "Mã LDD";

const normalizeHeader = (value) =>
  (value ?? "")
    .toString()
    .replace(/\r?\n/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeCell = (value) => {
  if (value === null || value === undefined) return "";
  return value.toString().trim();
};

/**
 * Tìm dòng header thật trong sheet (bỏ qua các dòng tiêu đề/gộp ô phía trên)
 * bằng cách quét từng dòng tìm dòng có chứa cột ANCHOR_HEADER.
 */
const findHeaderRowIndex = (rows) => {
  for (let i = 0; i < Math.min(rows.length, 20); i += 1) {
    const normalized = rows[i].map(normalizeHeader);
    if (normalized.includes(ANCHOR_HEADER)) return i;
  }
  return -1;
};

const parseWorkbook = (arrayBuffer) => {
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  const headerRowIndex = findHeaderRowIndex(rows);
  if (headerRowIndex === -1) {
    throw new Error(
      `Không tìm thấy dòng tiêu đề (thiếu cột "${ANCHOR_HEADER}") trong file.`,
    );
  }

  const headerRow = rows[headerRowIndex].map(normalizeHeader);

  // map: field trong schema -> index cột trong file
  const colIndexByField = {};
  Object.entries(HEADER_MAP).forEach(([excelHeader, field]) => {
    const idx = headerRow.indexOf(excelHeader);
    colIndexByField[field] = idx; // -1 nếu không có cột đó trong file
  });

  const missingColumns = Object.entries(HEADER_MAP)
    .filter(([excelHeader]) => headerRow.indexOf(excelHeader) === -1)
    .map(([excelHeader]) => excelHeader);

  const dataRows = rows.slice(headerRowIndex + 1);

  const parsed = [];
  const skipped = [];

  dataRows.forEach((row, i) => {
    const isEmptyRow = row.every((cell) => normalizeCell(cell) === "");
    if (isEmptyRow) return;

    const item = {
      concept: colIndexByField.concept >= 0 ? normalizeCell(row[colIndexByField.concept]) : "",
      lenh_dieu_dong:
        colIndexByField.lenh_dieu_dong >= 0
          ? normalizeCell(row[colIndexByField.lenh_dieu_dong])
          : "",
      ma_ch: colIndexByField.ma_ch >= 0 ? normalizeCell(row[colIndexByField.ma_ch]) : "",
      ten_ch: colIndexByField.ten_ch >= 0 ? normalizeCell(row[colIndexByField.ten_ch]) : "",
      ma_ncv: colIndexByField.ma_ncv >= 0 ? normalizeCell(row[colIndexByField.ma_ncv]) : "",
      ten_nvc: colIndexByField.ten_nvc >= 0 ? normalizeCell(row[colIndexByField.ten_nvc]) : "",
    };

    if (!item.lenh_dieu_dong) {
      skipped.push({ rowNumber: headerRowIndex + 2 + i, reason: "Thiếu Mã LDD" });
      return;
    }

    if (item.lenh_dieu_dong.toUpperCase().startsWith("SLL")) {
      skipped.push({ rowNumber: headerRowIndex + 2 + i, reason: "Mã LDD bắt đầu bằng SLL" });
      return;
    }

    parsed.push(item);
  });

  return { parsed, skipped, missingColumns };
};

const ImportHistoryBookXeModal = ({ open, onClose, onImported }) => {
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState([]);
  const [skippedRows, setSkippedRows] = useState([]);
  const [missingColumns, setMissingColumns] = useState([]);
  const [parseError, setParseError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  if (!open) return null;

  const resetState = () => {
    setFileName("");
    setParsedRows([]);
    setSkippedRows([]);
    setMissingColumns([]);
    setParseError("");
    setImportResult(null);
  };

  const handleClose = () => {
    if (importing) return;
    resetState();
    onClose?.();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    resetState();
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const { parsed, skipped, missingColumns: missing } = parseWorkbook(arrayBuffer);
      setParsedRows(parsed);
      setSkippedRows(skipped);
      setMissingColumns(missing);
    } catch (error) {
      console.error("Lỗi khi đọc file Excel:", error);
      setParseError(error.message || "Không thể đọc file Excel");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setImportResult(null);
    try {
      const res = await bookXeService.importManyHistoryBookXe(parsedRows);
      setImportResult({
        success: true,
        count: res?.insertedCount ?? parsedRows.length,
      });
      onImported?.();
    } catch (error) {
      console.error("Lỗi khi import lịch sử book xe:", error);
      setImportResult({
        success: false,
        message: error?.response?.data?.message || "Import thất bại",
      });
    } finally {
      setImporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} className="text-emerald-600" />
            <h2 className="text-base font-semibold text-slate-800">
              Import Lịch Sử Book Xe từ Excel
            </h2>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* File picker */}
          <label
            htmlFor="history-bookxe-file"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center hover:border-emerald-400 hover:bg-emerald-50/50"
          >
            <UploadCloud size={26} className="text-slate-400" />
            <span className="text-sm text-slate-600">
              {fileName || "Chọn file Excel (.xlsx, .xls)"}
            </span>
            <span className="text-xs text-slate-400">
              Chỉ lấy các cột: Concept, Mã LDD, Mã siêu thị, SIÊU THỊ, Mã NVC, NVC
            </span>
            <input
              id="history-bookxe-file"
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {/* Parse error */}
          {parseError && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-600">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Missing columns warning */}
          {missingColumns.length > 0 && (
            <div className="mt-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                Không tìm thấy cột: {missingColumns.join(", ")} — các dòng import sẽ để trống
                trường tương ứng.
              </span>
            </div>
          )}

          {/* Summary + preview */}
          {(parsedRows.length > 0 || skippedRows.length > 0) && !parseError && (
            <div className="mt-4">
              <div className="mb-2 flex flex-wrap gap-3 text-sm">
                <span className="rounded-md bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
                  {parsedRows.length} dòng hợp lệ
                </span>
                {skippedRows.length > 0 && (
                  <span className="rounded-md bg-slate-100 px-2.5 py-1 font-medium text-slate-500">
                    {skippedRows.length} dòng bị bỏ qua (thiếu Mã LDD hoặc Mã LDD bắt đầu bằng SLL)
                  </span>
                )}
              </div>

              {parsedRows.length > 0 && (
                <div className="overflow-hidden rounded-md border border-slate-200">
                  <table className="min-w-full divide-y divide-slate-200 text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-2.5 py-2 text-left font-medium text-slate-600">
                          Mã LDD
                        </th>
                        <th className="px-2.5 py-2 text-left font-medium text-slate-600">
                          Concept
                        </th>
                        <th className="px-2.5 py-2 text-left font-medium text-slate-600">
                          Mã CH
                        </th>
                        <th className="px-2.5 py-2 text-left font-medium text-slate-600">
                          Tên CH
                        </th>
                        <th className="px-2.5 py-2 text-left font-medium text-slate-600">
                          Mã NCV
                        </th>
                        <th className="px-2.5 py-2 text-left font-medium text-slate-600">
                          NVC
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedRows.slice(0, 8).map((row, i) => (
                        <tr key={i}>
                          <td className="px-2.5 py-1.5 text-slate-700">{row.lenh_dieu_dong}</td>
                          <td className="px-2.5 py-1.5 text-slate-600">{row.concept || "—"}</td>
                          <td className="px-2.5 py-1.5 text-slate-600">{row.ma_ch || "—"}</td>
                          <td className="px-2.5 py-1.5 text-slate-600">{row.ten_ch || "—"}</td>
                          <td className="px-2.5 py-1.5 text-slate-600">{row.ma_ncv || "—"}</td>
                          <td className="px-2.5 py-1.5 text-slate-600">{row.ten_nvc || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedRows.length > 8 && (
                    <div className="border-t border-slate-100 px-2.5 py-1.5 text-center text-xs text-slate-400">
                      ... và {parsedRows.length - 8} dòng khác
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Import result */}
          {importResult && (
            <div
              className={[
                "mt-4 flex items-start gap-2 rounded-md border px-3 py-2.5 text-sm",
                importResult.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-red-200 bg-red-50 text-red-600",
              ].join(" ")}
            >
              {importResult.success ? (
                <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              )}
              <span>
                {importResult.success
                  ? `Import thành công ${importResult.count} bản ghi.`
                  : importResult.message}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={importing}
            className="rounded-md px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-100 disabled:opacity-50"
          >
            {importResult?.success ? "Đóng" : "Hủy"}
          </button>
          {!importResult?.success && (
            <button
              type="button"
              onClick={handleImport}
              disabled={parsedRows.length === 0 || importing}
              className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importing && <Loader2 size={14} className="animate-spin" />}
              {importing ? "Đang import..." : `Import (${parsedRows.length})`}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default ImportHistoryBookXeModal;