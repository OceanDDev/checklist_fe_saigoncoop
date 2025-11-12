/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { donHangService } from "@/services/phieusoan/donhang.service";

/* ===================== Helpers chuẩn hoá ===================== */
const normalizeKey = (k = "") =>
  String(k)
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();

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
    cell.font = {
      name: "Calibri",
      size: 11,
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1F2937" },
    };
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
    ws.addRow({
      STORE: "",
      TYPE: "",
      SODA_TRANSFER: "",
      SKU: "",
      NAME: "",
      LUONG: "",
      NGAY_IMPORT: "",
    });
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
    totalInput: 0,
    errors: [],
    duplicates: [],
    invalidData: [],
    invalidStores: [],
    insertErrors: [],
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

  // ✅ FIXED: Thêm bước check duplicate trước khi import
  const handleImport = async () => {
    if (!parsedRows.length) return;

    setImporting(true);
    try {
      console.log("📤 BƯỚC 1: Check duplicate cho", parsedRows.length, "dòng");

      // ✅ BƯỚC 1: Gọi checkDuplicate API
      const checkResponse = await donHangService.checkDuplicateDonHang(parsedRows);
      
      const {
        validRows = [],
        duplicates = [],
        invalidRows = [],
      } = checkResponse;

      // Nếu KHÔNG có dòng nào hợp lệ
      if (!validRows || validRows.length === 0) {
        setImportResult({
          success: 0,
          totalInput: parsedRows.length,
          errors: ["❌ Không có dòng nào hợp lệ để import"],
          duplicates: duplicates,
          invalidData: invalidRows,
          invalidStores: [],
          insertErrors: [],
        });
        setShowResultModal(true);
        setShowModal(false);
        resetState();
        setImporting(false);
        return;
      }

      // ✅ BƯỚC 3: Import CHỈ validRows
      const importResponse = await donHangService.createManyDonHang(validRows);

      // ✅ BƯỚC 4: Tổng hợp kết quả CUỐI CÙNG
      const finalResult = {
        success: importResponse.summary?.created || importResponse.count || 0,
        totalInput: parsedRows.length, // Tổng input ban đầu
        duplicates: duplicates, // Từ check duplicate
        invalidData: [
          ...(invalidRows || []), // Từ check duplicate
          ...(importResponse.errors?.invalidData || []) // Từ import (nếu có thêm)
        ],
        invalidStores: importResponse.errors?.invalidStores || [],
        insertErrors: importResponse.errors?.insertErrors || [],
        errors: [],
      };

      // Thêm message tổng hợp
      if (!importResponse.success && importResponse.message) {
        finalResult.errors.push(importResponse.message);
      }
      if (importResponse.warning) {
        finalResult.errors.push(importResponse.warning);
      }

      // Thêm thông báo về duplicate
      if (duplicates.length > 0) {
        finalResult.errors.push(`⚠️ Đã bỏ qua ${duplicates.length} dòng trùng lặp với dữ liệu hiện có`);
      }

      setImportResult(finalResult);
      setShowResultModal(true);
      setShowModal(false);
      resetState();

      // Callback nếu có ít nhất 1 record thành công
      if (finalResult.success > 0) {
        onImportSuccess?.();
      }
    } catch (err) {
      console.error("❌ Import error:", err);
      setImportResult({
        success: 0,
        totalInput: parsedRows.length,
        errors: [err?.response?.data?.message || err?.message || "Lỗi không xác định"],
        duplicates: [],
        invalidData: [],
        invalidStores: [],
        insertErrors: [],
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

  // Tính tổng số lỗi
  const totalErrors =
    importResult.invalidData.length +
    importResult.invalidStores.length +
    importResult.insertErrors.length +
    importResult.duplicates.length;

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
              <h3 className="text-lg font-semibold text-white">
                📥 Import Đơn Hàng
              </h3>
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
                Hỗ trợ:{" "}
                <span className="font-medium">.csv, .xlsx, .xls, .json</span>
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
                      Sẵn sàng kiểm tra{" "}
                      <span className="font-semibold text-slate-900">
                        {rowCount}
                      </span>{" "}
                      dòng
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
                {importing ? "⏳ Đang xử lý..." : `🔍 Kiểm tra & Import`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✅ Modal kết quả - ĐÃ CẬP NHẬT hiển thị duplicates */}
      {showResultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 overflow-hidden max-h-[90vh] flex flex-col">
            <div
              className={`px-6 py-4 flex items-center justify-between ${
                totalErrors > 0
                  ? "bg-gradient-to-r from-amber-600 to-amber-500"
                  : importResult.errors.length > 0
                  ? "bg-gradient-to-r from-red-600 to-red-500"
                  : "bg-gradient-to-r from-green-600 to-green-500"
              }`}
            >
              <h3 className="text-lg font-semibold text-white">
                {totalErrors > 0
                  ? "⚠️ Import một phần"
                  : importResult.errors.length > 0
                  ? "❌ Import thất bại"
                  : "✅ Import thành công"}
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
                  <span className="text-slate-600">Tổng số dòng input:</span>
                  <span className="font-semibold text-slate-900">
                    {importResult.totalInput}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-600">✅ Import thành công:</span>
                  <span className="font-semibold text-green-600">
                    {importResult.success}
                  </span>
                </div>
                {importResult.duplicates.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-yellow-600">⚠️ Trùng lặp (bỏ qua):</span>
                    <span className="font-semibold text-yellow-600">
                      {importResult.duplicates.length}
                    </span>
                  </div>
                )}
                {(importResult.invalidData.length + importResult.invalidStores.length + importResult.insertErrors.length) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-red-600">❌ Lỗi khác:</span>
                    <span className="font-semibold text-red-600">
                      {importResult.invalidData.length + importResult.invalidStores.length + importResult.insertErrors.length}
                    </span>
                  </div>
                )}
              </div>

              {/* Lỗi tổng quát */}
              {importResult.errors.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-900 flex items-center gap-2">
                    📢 Thông báo
                  </h4>
                  <div className="border border-blue-200 rounded-xl bg-blue-50 p-4 space-y-2">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx} className="text-sm text-blue-900">
                        • {err}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ✅ THÊM: Danh sách trùng lặp */}
              {importResult.duplicates.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-yellow-900">
                      ⚠️ Dòng trùng lặp (đã bỏ qua)
                    </h4>
                    <span className="text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full font-medium">
                      {importResult.duplicates.length} dòng
                    </span>
                  </div>
                  <div className="border border-yellow-200 rounded-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-yellow-50 sticky top-0">
                          <tr className="border-b border-yellow-200">
                            <th className="px-3 py-2 text-left font-semibold text-yellow-900">Dòng</th>
                            <th className="px-3 py-2 text-left font-semibold text-yellow-900">STORE</th>
                            <th className="px-3 py-2 text-left font-semibold text-yellow-900">TYPE</th>
                            <th className="px-3 py-2 text-left font-semibold text-yellow-900">SODA_TF</th>
                            <th className="px-3 py-2 text-left font-semibold text-yellow-900">SKU</th>
                            <th className="px-3 py-2 text-left font-semibold text-yellow-900">NAME</th>
                            <th className="px-3 py-2 text-left font-semibold text-yellow-900">Ngày</th>
                            <th className="px-3 py-2 text-left font-semibold text-yellow-900">ID trùng</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {importResult.duplicates.map((item, idx) => (
                            <tr key={idx} className="border-b border-yellow-100 hover:bg-yellow-50/50">
                              <td className="px-3 py-2 font-medium text-yellow-900">{item.rowIndex}</td>
                              <td className="px-3 py-2 text-slate-700">{item.inputData?.store}</td>
                              <td className="px-3 py-2 text-slate-700">{item.inputData?.type}</td>
                              <td className="px-3 py-2 text-slate-700">{item.inputData?.soda_transfer}</td>
                              <td className="px-3 py-2 text-slate-700">{item.inputData?.sku}</td>
                              <td className="px-3 py-2 text-slate-700 max-w-xs truncate">{item.inputData?.name}</td>
                              <td className="px-3 py-2 text-slate-700">{item.inputData?.ngay_import}</td>
                              <td className="px-3 py-2 text-blue-600 text-xs font-mono">
                                {String(item.existingData?.id).slice(-8)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Dữ liệu không hợp lệ */}
              {importResult.invalidData.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-red-900">
                      ❌ Dữ liệu không hợp lệ
                    </h4>
                    <span className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded-full font-medium">
                      {importResult.invalidData.length} dòng
                    </span>
                  </div>
                  <div className="border border-red-200 rounded-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-red-50 sticky top-0">
                          <tr className="border-b border-red-200">
                            <th className="px-3 py-2 text-left font-semibold text-red-900">Dòng</th>
                            <th className="px-3 py-2 text-left font-semibold text-red-900">Lỗi</th>
                            <th className="px-3 py-2 text-left font-semibold text-red-900">STORE</th>
                            <th className="px-3 py-2 text-left font-semibold text-red-900">TYPE</th>
                            <th className="px-3 py-2 text-left font-semibold text-red-900">SODA_TF</th>
                            <th className="px-3 py-2 text-left font-semibold text-red-900">SKU</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {importResult.invalidData.map((item, idx) => (
                            <tr key={idx} className="border-b border-red-100 hover:bg-red-50/50">
                              <td className="px-3 py-2 font-medium text-red-900">{item.rowIndex}</td>
                              <td className="px-3 py-2 text-red-700">{item.errors?.join(", ")}</td>
                              <td className="px-3 py-2 text-slate-700">{item.data?.store || "-"}</td>
                              <td className="px-3 py-2 text-slate-700">{item.data?.type || "-"}</td>
                              <td className="px-3 py-2 text-slate-700">{item.data?.soda_transfer || "-"}</td>
                              <td className="px-3 py-2 text-slate-700">{item.data?.sku || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Mã cửa hàng không tồn tại */}
              {importResult.invalidStores.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-orange-900">
                      🏪 Mã cửa hàng không tồn tại
                    </h4>
                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full font-medium">
                      {importResult.invalidStores.length} dòng
                    </span>
                  </div>
                  <div className="border border-orange-200 rounded-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-orange-50 sticky top-0">
                          <tr className="border-b border-orange-200">
                            <th className="px-3 py-2 text-left font-semibold text-orange-900">Dòng</th>
                            <th className="px-3 py-2 text-left font-semibold text-orange-900">Mã CH</th>
                            <th className="px-3 py-2 text-left font-semibold text-orange-900">SKU</th>
                            <th className="px-3 py-2 text-left font-semibold text-orange-900">Tên hàng</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {importResult.invalidStores.map((item, idx) => (
                            <tr key={idx} className="border-b border-orange-100 hover:bg-orange-50/50">
                              <td className="px-3 py-2 font-medium text-orange-900">{item.index}</td>
                              <td className="px-3 py-2 text-orange-700 font-medium">{item.store}</td>
                              <td className="px-3 py-2 text-slate-700">{item.sku}</td>
                              <td className="px-3 py-2 text-slate-700 max-w-xs truncate">{item.name}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Lỗi khi insert vào database */}
              {importResult.insertErrors.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-purple-900">
                      💾 Lỗi khi insert vào database
                    </h4>
                    <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full font-medium">
                      {importResult.insertErrors.length} dòng
                    </span>
                  </div>
                  <div className="border border-purple-200 rounded-xl overflow-hidden">
                    <div className="max-h-64 overflow-y-auto">
                      <table className="min-w-full text-xs">
                        <thead className="bg-purple-50 sticky top-0">
                          <tr className="border-b border-purple-200">
                            <th className="px-3 py-2 text-left font-semibold text-purple-900">Index</th>
                            <th className="px-3 py-2 text-left font-semibold text-purple-900">Lỗi</th>
                            <th className="px-3 py-2 text-left font-semibold text-purple-900">STORE</th>
                            <th className="px-3 py-2 text-left font-semibold text-purple-900">SKU</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white">
                          {importResult.insertErrors.map((item, idx) => (
                            <tr key={idx} className="border-b border-purple-100 hover:bg-purple-50/50">
                              <td className="px-3 py-2 font-medium text-purple-900">{item.index}</td>
                              <td className="px-3 py-2 text-purple-700 text-xs">{item.message}</td>
                              <td className="px-3 py-2 text-slate-700">{item.data?.store}</td>
                              <td className="px-3 py-2 text-slate-700">{item.data?.sku}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Thông báo thành công 100% */}
              {importResult.success > 0 && totalErrors === 0 && importResult.errors.length === 0 && (
                <div className="text-center py-4">
                  <div className="text-6xl mb-3">🎉</div>
                  <p className="text-lg font-semibold text-green-900">
                    Import thành công {importResult.success}/{importResult.totalInput} đơn hàng!
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