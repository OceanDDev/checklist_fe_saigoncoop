/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { donHangService } from "@/services/phieusoan/donhang.service";

/* ===================== Helpers chuẩn hoá ===================== */
const normalizeKey = (k = "") =>
  String(k).replace(/^\uFEFF/, "").trim().replace(/\s+/g, "_").toUpperCase();

const HEADER_MAP = {
  STORE: "STORE",
  TYPE: "TYPE",
  SODA_TRANSFER: "SODA_TRANSFER",
  SKU: "SKU",
  NAME: "NAME",
  LUONG: "LUONG",
  NGAY_IMPORT: "NGAY_IMPORT",
  MA_CUA_HANG: "STORE",
  LOAI: "TYPE",
  SO_SD_TF: "SODA_TRANSFER",
  SO_SODA_TRANSFER: "SODA_TRANSFER",
  TEN_HANG: "NAME",
  SO_LUONG: "LUONG",
  NGAY_TAO: "NGAY_IMPORT",
  NGAY_NHAP: "NGAY_IMPORT",
};

const normalizeRowKeys = (rowObj) => {
  const out = {};
  for (const [k, v] of Object.entries(rowObj || {})) {
    const nk = normalizeKey(k);
    const mapped = HEADER_MAP[nk] || nk;
    out[mapped] = typeof v === "string" ? v.trim() : v;
  }
  return out;
};

const hasAnyValue = (obj) =>
  Object.values(obj || {}).some((v) => String(v ?? "").trim() !== "");

/* ===================== CSV parser ===================== */
const parseCSV = async (file) => {
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter((l) => l !== "");
  if (!lines.length) return [];

  const rawHeaders = lines[0].split(",").map((h) => normalizeKey(h));
  const headers = rawHeaders.map((h) => HEADER_MAP[h] || h);

  const out = [];
  for (let li = 1; li < lines.length; li++) {
    const line = lines[li];
    const cells = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === "," && !inQ) {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);

    const obj = {};
    headers.forEach((h, idx) => {
      obj[h] = (cells[idx] ?? "").trim();
    });

    if (hasAnyValue(obj)) out.push(obj);
  }
  return out.map(normalizeRowKeys);
};

/* ===================== Excel parser ===================== */
const parseExcel = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);

  const ws = workbook.worksheets[0];
  if (!ws) return [];

  const headerRow = ws.getRow(1);
  let headers = [];
  for (let c = 1; c <= headerRow.cellCount; c++) {
    const raw = headerRow.getCell(c).text || headerRow.getCell(c).value || "";
    const nk = normalizeKey(String(raw));
    headers.push(HEADER_MAP[nk] || nk);
  }
  headers = headers.filter((h) => h && h.trim() !== "");

  const out = [];
  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    if (!row || row.cellCount === 0) continue;

    const obj = {};
    headers.forEach((h, idx) => {
      const cell = row.getCell(idx + 1);
      let val = cell?.text ?? cell?.value ?? "";
      if (typeof val !== "string") val = String(val ?? "");
      obj[h] = val.trim();
    });

    if (hasAnyValue(obj)) out.push(normalizeRowKeys(obj));
  }

  return out;
};

/* ===================== Xuất Excel template ===================== */
const buildStyledWorkbook = (rows = []) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("DonHang", {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { defaultRowHeight: 18 },
  });

  ws.columns = [
    { header: "STORE", key: "STORE", width: 14 },
    { header: "TYPE", key: "TYPE", width: 12 },
    { header: "SODA_TRANSFER", key: "SODA_TRANSFER", width: 16 },
    { header: "SKU", key: "SKU", width: 16 },
    { header: "NAME", key: "NAME", width: 36 },
    { header: "LUONG", key: "LUONG", width: 10 },
    { header: "NGAY_IMPORT", key: "NGAY_IMPORT", width: 14 },
  ];

  const headerRow = ws.getRow(1);
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1F2937" } };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  if (rows.length) {
    rows.forEach((r) => ws.addRow(r));
  } else {
    ws.addRow({ STORE: "", TYPE: "", SODA_TRANSFER: "", SKU: "", NAME: "", LUONG: "", NGAY_IMPORT: "" });
  }

  ws.getColumn("NGAY_IMPORT").numFmt = "dd/mm/yyyy";

  const lastRow = ws.rowCount;
  for (let r = 2; r <= lastRow; r++) {
    const row = ws.getRow(r);
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE5E7EB" } },
        left: { style: "thin", color: { argb: "FFE5E7EB" } },
        bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
        right: { style: "thin", color: { argb: "FFE5E7EB" } },
      };
      cell.alignment = { vertical: "middle" };
      if (!cell.font?.bold) cell.font = { name: "Calibri", size: 11 };
    });
  }

  return wb;
};

const DonHangImport = ({ onImportSuccess }) => {
  const fileInputRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [parsedRows, setParsedRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [importResult, setImportResult] = useState({
    success: 0,
    errors: [],
    duplicates: []
  });

  const resetState = () => {
    setFileName("");
    setRowCount(0);
    setParsedRows([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const ext = file.name.split(".").pop().toLowerCase();
      let rows = [];

      if (ext === "csv") {
        rows = await parseCSV(file);
      } else if (ext === "xlsx" || ext === "xls") {
        rows = await parseExcel(file);
      } else if (ext === "json") {
        const text = await file.text();
        const json = JSON.parse(text);
        const arr = Array.isArray(json) ? json : json?.data || [];
        rows = arr.map(normalizeRowKeys);
      } else {
        alert("Vui lòng chọn file .csv, .xlsx, .xls hoặc .json");
        resetState();
        return;
      }

      if (!rows.length) {
        alert("Không tìm thấy dòng dữ liệu hợp lệ trong file.");
        resetState();
        return;
      }

      setFileName(file.name);
      setRowCount(rows.length);
      setParsedRows(rows);
    } catch (err) {
      console.error("Parse error:", err);
      alert("❌ Lỗi đọc file: " + (err?.message || "Không xác định"));
      resetState();
    }
  };

  // Hàm validate kiểm tra trùng lặp - SỬ DỤNG API
  const validateDonHang = async (rows) => {
    try {
      // ✨ Gọi API check duplicate
      const response = await donHangService.checkDuplicateDonHang(rows);
      
      if (response.success) {
        return {    
          validRows: response.validRows || [],
          duplicates: response.duplicates.map(dup => ({
            row: dup.rowIndex,
            store: dup.inputData.store,
            type: dup.inputData.type,
            sodaTransfer: dup.inputData.soda_transfer,
            sku: dup.inputData.sku,
            name: dup.inputData.name,
            date: dup.inputData.ngay_import
          }))
        };
      }
      
      // Nếu API trả về không success, throw error
      throw new Error(response.message || "API validation failed");
    } catch (err) {
      console.error("Validation error:", err);
      // Throw lại error để handleImport bắt được
      throw new Error(`Lỗi kiểm tra trùng lặp: ${err?.message || "Không thể kết nối đến server"}`);
    }
  };
  const handleImport = async () => {
    if (!parsedRows.length) return;

    setImporting(true);
    try {
      // Validate dữ liệu trước khi import
      const validationResult = await validateDonHang(parsedRows);
      
      if (validationResult.duplicates.length > 0) {
        // Có dữ liệu trùng - hiển thị modal
        setImportResult({
          success: validationResult.validRows.length,
          errors: [],
          duplicates: validationResult.duplicates
        });
        setShowResultModal(true);
        
        // Import chỉ những dòng hợp lệ
        if (validationResult.validRows.length > 0) {
          await donHangService.createManyDonHang(validationResult.validRows);
          onImportSuccess?.();
        }
      } else {
        // Không có trùng - import tất cả
        await donHangService.createManyDonHang(parsedRows);
        setImportResult({
          success: parsedRows.length,
          errors: [],
          duplicates: []
        });
        setShowResultModal(true);
        onImportSuccess?.();
      }
      
      setShowModal(false);
      resetState();
    } catch (err) {
      console.error("Import error:", err);
      setImportResult({
        success: 0,
        errors: [err?.message || "Lỗi không xác định khi import"],
        duplicates: []
      });
      setShowResultModal(true);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    const wb = buildStyledWorkbook([]);
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), "template_donhang.xlsx");
  };

  return (
    <>
      <button
        onClick={() => {
          setShowModal(true);
          resetState();
        }}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-white hover:bg-black transition shadow-sm font-medium"
      >
        📥 Import ĐH
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">📥 Import Đơn Hàng</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetState();
                }}
                disabled={importing}
                className="text-white/80 hover:text-white transition disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="text-sm text-slate-600">
                Hỗ trợ: <span className="font-medium">.csv, .xlsx, .xls, .json</span>
              </div>

              <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-slate-400 transition">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.json"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={importing}
                />
                
                {!fileName ? (
                  <div className="space-y-3">
                    <div className="text-4xl">📄</div>
                    <div className="text-slate-600">Chọn file để import</div>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition"
                    >
                      Chọn file
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-4xl">✅</div>
                    <div className="text-slate-900 font-medium">{fileName}</div>
                    <div className="text-sm text-slate-600">
                      Sẵn sàng import <span className="font-semibold text-slate-900">{rowCount}</span> dòng
                    </div>
                    <button
                      onClick={() => {
                        resetState();
                        fileInputRef.current?.click();
                      }}
                      disabled={importing}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition disabled:opacity-50"
                    >
                      Chọn file khác
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center">
                <button
                  onClick={downloadTemplate}
                  disabled={importing}
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline disabled:opacity-50"
                >
                  📥 Tải file mẫu (.xlsx)
                </button>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  resetState();
                }}
                disabled={importing}
                className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 transition font-medium disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleImport}
                disabled={importing || !parsedRows.length}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white hover:bg-black transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {importing ? "Đang import..." : `Import ${rowCount} dòng`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal kết quả import */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            <div className={`px-6 py-4 flex items-center justify-between ${
              importResult.duplicates.length > 0 
                ? 'bg-gradient-to-r from-amber-600 to-amber-500' 
                : importResult.errors.length > 0
                ? 'bg-gradient-to-r from-red-600 to-red-500'
                : 'bg-gradient-to-r from-green-600 to-green-500'
            }`}>
              <h3 className="text-lg font-semibold text-white">
                {importResult.duplicates.length > 0 ? '⚠️ Kết quả Import (Có trùng lặp)' : 
                 importResult.errors.length > 0 ? '❌ Import thất bại' : 
                 '✅ Import thành công'}
              </h3>
              <button
                onClick={() => setShowResultModal(false)}
                className="text-white/80 hover:text-white transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto">
              {/* Tổng kết */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600">Tổng số dòng:</span>
                  <span className="font-semibold text-slate-900">{rowCount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-600">Import thành công:</span>
                  <span className="font-semibold text-green-600">{importResult.success}</span>
                </div>
                {importResult.duplicates.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-amber-600">Dòng trùng lặp:</span>
                    <span className="font-semibold text-amber-600">{importResult.duplicates.length}</span>
                  </div>
                )}
                {importResult.errors.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-red-600">Lỗi:</span>
                    <span className="font-semibold text-red-600">{importResult.errors.length}</span>
                  </div>
                )}
              </div>

              {/* Danh sách trùng lặp */}
              {importResult.duplicates.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-amber-900">Danh sách dòng trùng lặp:</h4>
                    <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                      {importResult.duplicates.length} dòng
                    </span>
                  </div>
                  <div className="border border-amber-200 rounded-xl overflow-hidden">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-amber-50 sticky top-0">
                          <tr className="border-b border-amber-200">
                            <th className="px-3 py-2 text-left font-semibold text-amber-900">Dòng</th>
                            <th className="px-3 py-2 text-left font-semibold text-amber-900">Mã CH</th>
                            <th className="px-3 py-2 text-left font-semibold text-amber-900">Loại</th>
                            <th className="px-3 py-2 text-left font-semibold text-amber-900">Số SD/TF</th>
                            <th className="px-3 py-2 text-left font-semibold text-amber-900">SKU</th>
                            <th className="px-3 py-2 text-left font-semibold text-amber-900">Tên hàng</th>
                            <th className="px-3 py-2 text-left font-semibold text-amber-900">Ngày</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {importResult.duplicates.map((dup, idx) => (
                            <tr key={idx} className="border-b border-amber-100 hover:bg-amber-50/50">
                              <td className="px-3 py-2 font-medium text-amber-900">{dup.row}</td>
                              <td className="px-3 py-2 text-slate-700">{dup.store}</td>
                              <td className="px-3 py-2 text-slate-700">{dup.type}</td>
                              <td className="px-3 py-2 text-slate-700">{dup.sodaTransfer}</td>
                              <td className="px-3 py-2 text-slate-700">{dup.sku}</td>
                              <td className="px-3 py-2 text-slate-700 max-w-xs truncate" title={dup.name}>
                                {dup.name}
                              </td>
                              <td className="px-3 py-2 text-slate-700">{dup.date}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-lg">
                    ⚠️ Các dòng trên đã tồn tại trong hệ thống với cùng Mã cửa hàng, Loại, Số SD/TF, SKU và Ngày. 
                    Chỉ những dòng không trùng mới được import.
                  </p>
                </div>
              )}

              {/* Danh sách lỗi */}
              {importResult.errors.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-red-900">Lỗi:</h4>
                  <div className="border border-red-200 rounded-xl bg-red-50 p-4 space-y-2">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx} className="text-sm text-red-700">
                        • {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Thông báo thành công */}
              {importResult.success > 0 && importResult.errors.length === 0 && importResult.duplicates.length === 0 && (
                <div className="text-center py-4">
                  <div className="text-6xl mb-3">🎉</div>
                  <p className="text-lg font-semibold text-green-900">
                    Import thành công {importResult.success} đơn hàng!
                  </p>
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end">
              <button
                onClick={() => setShowResultModal(false)}
                className="px-6 py-2 rounded-xl bg-slate-900 text-white hover:bg-black transition font-medium"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DonHangImport;