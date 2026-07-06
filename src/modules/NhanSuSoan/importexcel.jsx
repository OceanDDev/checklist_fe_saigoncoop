/* eslint-disable react/prop-types */
// components/phieusoan/NhanSuSoan/ImportNhanSuSoan.jsx
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ExcelJS from "exceljs";
import {
  UploadCloud,
  FileDown,
  Loader2,
  X,
  FileSpreadsheet,
  AlertTriangle,
} from "lucide-react";
import { nhanSuSoanService } from "@/services/phieusoan/nhansusoan.service";

/**
 * Cột theo đúng file mẫu:
 * Số Đơn Hàng | Document No | Mã NXĐ | Nơi Xuất Đến | CHUYEN | LICH DI HANG
 */
const COLUMNS = [
  { key: "soDonHang", header: "Số Đơn Hàng", width: 18 },
  { key: "documentNo", header: "Document No", width: 18 },
  { key: "maNXD", header: "Mã NXĐ", width: 12 },
  { key: "noiXuatDen", header: "Nơi Xuất Đến", width: 26 },
  { key: "chuyen", header: "CHUYEN", width: 14 },
  { key: "lichDiHang", header: "LICH DI HANG", width: 16 },
];

const SHEET_NAME = "NhanSuSoan";

const normalizeHeader = (str = "") =>
  str
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const HEADER_KEY_MAP = COLUMNS.reduce((acc, col) => {
  acc[normalizeHeader(col.header)] = col.key;
  return acc;
}, {});

/**
 * Bóc giá trị "thô" từ cell ExcelJS về dạng primitive (string/number/Date).
 * ExcelJS có thể trả về nhiều dạng object tuỳ cách cell được tạo/format:
 * - Formula cell:   { formula: "...", result: ... }
 * - Rich text cell: { richText: [{ font: {...}, text: "..." }, ...] }
 *   (thường gặp khi cell được format là Text, hoặc nội dung được dán từ
 *   nơi khác có lẫn định dạng ký tự khác nhau trong cùng 1 ô)
 * - Hyperlink cell: { text: "...", hyperlink: "..." }
 *
 * Nếu không unwrap hết các dạng object này, giá trị còn sót lại vẫn là
 * object -> khi lưu DB, Mongoose không cast được Date/String từ object
 * -> field bị bỏ trống/lỗi âm thầm dù trong Excel nhìn thấy rõ có text.
 */
const unwrapCellValue = (rawValue) => {
  if (rawValue === null || rawValue === undefined) return rawValue;

  let value = rawValue;

  // Formula cell
  if (typeof value === "object" && value !== null && "result" in value) {
    value = value.result;
  }

  // Rich text cell: { richText: [{ text }, ...] }
  if (
    typeof value === "object" &&
    value !== null &&
    Array.isArray(value.richText)
  ) {
    value = value.richText.map((t) => t.text ?? "").join("");
  }

  // Hyperlink cell: { text, hyperlink }
  if (typeof value === "object" && value !== null && "text" in value) {
    value = value.text;
  }

  return value;
};

/** Tìm các soDonHang bị lặp lại trong 1 mảng rows (không phân biệt hoa/thường) */
const findDuplicatesInRows = (rows) => {
  const seen = new Map();
  const dups = new Set();
  rows.forEach((row) => {
    const code = (row.soDonHang || "").toString().trim();
    if (!code) return;
    const key = code.toUpperCase();
    if (seen.has(key)) dups.add(code);
    else seen.set(key, code);
  });
  return Array.from(dups);
};

const ImportNhanSuSoan = ({ onImported }) => {
  const fileInputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [importError, setImportError] = useState(null); // { message, duplicates? }

  // Khoá scroll nền khi modal mở + cho phép đóng bằng phím Esc
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (e) => {
      if (e.key === "Escape") resetAndClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const resetAndClose = () => {
    setSelectedFile(null);
    setImportError(null);
    setOpen(false);
  };

  /** Xuất file template Excel bằng exceljs */
  const handleDownloadTemplate = async () => {
    setExporting(true);
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Phieu Soan";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet(SHEET_NAME);
      sheet.columns = COLUMNS.map((col) => ({
        header: col.header,
        key: col.key,
        width: col.width,
      }));

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E293B" },
      };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.height = 22;

      sheet.addRow({
        soDonHang: "TO17493199",
        documentNo: "TO17493199",
        maNXD: "2034",
        noiXuatDen: "02034-CF HAU LAN",
        chuyen: "SÁNG",
        lichDiHang: "T7",
      });

      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        });
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Template_PhieuSoan.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Lỗi tạo template:", error);
      alert("Không tạo được file template.");
    } finally {
      setExporting(false);
    }
  };

  const handlePickFile = () => fileInputRef.current?.click();

  const handleFileSelected = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportError(null);
    }
  };

  /** Đọc file Excel bằng exceljs → map theo header → gọi API import */
  const handleConfirmImport = async () => {
    if (!selectedFile) return;

    setImportError(null);
    setImporting(true);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const sheet = workbook.worksheets[0];
      if (!sheet) {
        setImportError({ message: "File Excel không có sheet nào." });
        return;
      }

      const headerRow = sheet.getRow(1);
      const colIndexToKey = {};
      headerRow.eachCell((cell, colNumber) => {
        const key =
          HEADER_KEY_MAP[normalizeHeader(unwrapCellValue(cell.value))];
        if (key) colIndexToKey[colNumber] = key;
      });

      if (Object.keys(colIndexToKey).length === 0) {
        setImportError({
          message:
            "Không nhận diện được cột nào khớp với template. Vui lòng dùng đúng file mẫu.",
        });
        return;
      }

      const rows = [];
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const obj = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const key = colIndexToKey[colNumber];
          if (!key) return;

          const value = unwrapCellValue(cell.value);
          obj[key] = value ?? "";
        });
        if (
          Object.values(obj).some(
            (v) => v !== "" && v !== null && v !== undefined,
          )
        ) {
          rows.push(obj);
        }
      });

      if (!rows.length) {
        setImportError({ message: "File Excel không có dữ liệu." });
        return;
      }

      // Kiểm tra trùng số đơn hàng NGAY TRONG FILE trước khi gửi lên server
      const dupInFile = findDuplicatesInRows(rows);
      if (dupInFile.length > 0) {
        setImportError({
          message: `Phát hiện ${dupInFile.length} số đơn hàng bị trùng ngay trong file. Vui lòng sửa lại rồi import lại.`,
          duplicates: dupInFile,
        });
        return;
      }

      // Gắn thời điểm import cho từng dòng, khớp field tgImport (Date) trong schema
      const now = new Date().toISOString();
      const rowsWithImportTime = rows.map((row) => ({
        ...row,
        tgImport: now,
      }));

      await nhanSuSoanService.importManyNhanSuSoan(rowsWithImportTime);
      alert(`Import thành công ${rows.length} dòng.`);
      onImported?.();
      resetAndClose();
    } catch (error) {
      console.error("Lỗi import Excel:", error);

      // Bắt lỗi trùng số đơn hàng trả về từ backend (400/409 kèm 'duplicates')
      const resData = error?.response?.data;
      if (resData?.duplicates?.length > 0) {
        setImportError({
          message: resData.message || "Có số đơn hàng bị trùng.",
          duplicates: resData.duplicates,
        });
      } else if (resData?.message) {
        setImportError({ message: resData.message });
      } else {
        setImportError({
          message: "Import thất bại. Vui lòng kiểm tra lại file.",
        });
      }
    } finally {
      setImporting(false);
    }
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={resetAndClose}
    >
      <div
        className="my-8 flex max-h-[calc(100vh-4rem)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5 sm:my-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            Import dữ liệu Nhân Sự Soạn
          </h2>
          <button
            onClick={resetAndClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <button
            onClick={handleDownloadTemplate}
            disabled={exporting}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {exporting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <FileDown size={16} />
            )}
            Tải file template mẫu
          </button>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={handlePickFile}
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 px-4 py-8 text-center transition hover:border-slate-300 hover:bg-slate-50"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelected}
              className="hidden"
            />
            {selectedFile ? (
              <>
                <FileSpreadsheet size={28} className="text-emerald-600" />
                <span className="text-sm font-medium text-slate-700">
                  {selectedFile.name}
                </span>
                <span className="text-xs text-slate-400">
                  Bấm để chọn file khác
                </span>
              </>
            ) : (
              <>
                <UploadCloud size={28} className="text-slate-400" />
                <span className="text-sm text-slate-600">
                  Kéo thả file vào đây hoặc bấm để chọn
                </span>
                <span className="text-xs text-slate-400">
                  Hỗ trợ .xlsx, .xls
                </span>
              </>
            )}
          </div>

          {/* Lỗi trùng số đơn hàng / lỗi import khác */}
          {importError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <p className="flex items-start gap-1.5 text-xs font-medium text-red-700">
                <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                {importError.message}
              </p>
              {importError.duplicates?.length > 0 && (
                <div className="mt-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto">
                  {importError.duplicates.map((code) => (
                    <span
                      key={code}
                      className="rounded-md border border-red-300 bg-white px-1.5 py-0.5 text-xs font-semibold text-red-600"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button
            onClick={resetAndClose}
            className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100"
          >
            Huỷ
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={!selectedFile || importing}
            className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importing && <Loader2 size={16} className="animate-spin" />}
            {importing ? "Đang import..." : "Import"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg bg-slate-900 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
      >
        <UploadCloud size={16} />
        Import Excel
      </button>

      {open &&
        typeof document !== "undefined" &&
        createPortal(modal, document.body)}
    </>
  );
};  

export default ImportNhanSuSoan;
