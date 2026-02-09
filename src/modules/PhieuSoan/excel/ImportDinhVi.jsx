/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useRef, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { dinhViService } from "@/services/phieusoan/dinhvi.service";

/* ===================== Helpers chuẩn hoá ===================== */
const normalizeKey = (k = "") =>
  String(k)
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();

const HEADER_MAP = {
  MANCC: "MANCC",
  MA_NCC: "MANCC",
  "MA NCC": "MANCC",
  MANH: "MANH",
  MA_NH: "MANH",
  "MA NH": "MANH",
  DEPT: "DEPT",
  SUBDEPT: "SUBDEPT",
  SUB_DEPT: "SUBDEPT",
  "SUB DEPT": "SUBDEPT",
  SLOT: "SLOT",
  SKU: "SKU",
  NAME: "NAME",
  PACK: "PACK",
  KHOILUONG: "KHOILUONG",
  "KHOI LUONG": "KHOILUONG",
  "KHỐI LƯỢNG": "KHOILUONG",
  LOAIHINH: "LOAIHINH",
  NGAY_IMPORT: "NGAY_IMPORT",
  LOAI_HINH: "LOAIHINH",
  "LOAI HINH": "LOAIHINH",
  NGAY_NHAP: "NGAY_IMPORT",
  NGAY_TAO: "NGAY_IMPORT",
  "NGAY TAO": "NGAY_IMPORT",
  "NGAY NHAP": "NGAY_IMPORT",
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
  const ws = wb.addWorksheet("DinhVi", {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { defaultRowHeight: 18 },
  });

  ws.columns = [
    { header: "MANCC", key: "MANCC", width: 14 },
    { header: "MANH", key: "MANH", width: 14 },
    { header: "DEPT", key: "DEPT", width: 16 },
    { header: "SUBDEPT", key: "SUBDEPT", width: 16 },
    { header: "SLOT", key: "SLOT", width: 12 },
    { header: "SKU", key: "SKU", width: 16 },
    { header: "NAME", key: "NAME", width: 36 },
    { header: "PACK", key: "PACK", width: 10 },
    { header: "KHOILUONG", key: "KHOILUONG", width: 12 },
    { header: "LOAIHINH", key: "LOAIHINH", width: 20 },
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
      MANCC: "",
      MANH: "",
      DEPT: "",
      SUBDEPT: "",
      SLOT: "",
      SKU: "",
      NAME: "",
      PACK: "",
      KHOILUONG: "",
      LOAIHINH: "",
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

const DinhViImport = ({ onImportSuccess }) => {
  const fileInputRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rowCount, setRowCount] = useState(0);
  const [parsedRows, setParsedRows] = useState([]);
  const [importing, setImporting] = useState(false);

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

  const handleImport = async () => {
    if (!parsedRows.length) return;

    setImporting(true);
    try {
      // ✅ Kiểm tra từng SKU xem đã tồn tại chưa và có LOAIHINH đặc biệt không
      const processedRows = await Promise.all(
        parsedRows.map(async (row) => {
          try {
            // Gọi API để lấy thông tin SKU hiện tại (giả sử có API này)
            const existing = await dinhViService.getDinhViBySKU(row.SKU);

            if (
              existing &&
              (existing.LOAIHINH === "1" ||
                existing.LOAIHINH === "Hàng đặc thù")
            ) {
              // ⚠️ Chỉ cho phép cập nhật SLOT, giữ nguyên các trường khác
              return {
                SKU: row.SKU,
                SLOT: row.SLOT, // Chỉ lấy SLOT mới từ file import
                // Giữ nguyên các trường cũ
                MANCC: existing.MANCC,
                MANH: existing.MANH,
                DEPT: existing.DEPT,
                SUBDEPT: existing.SUBDEPT,
                PACK: existing.PACK,
                NAME: existing.NAME,
                KHOILUONG: existing.KHOILUONG,
                LOAIHINH: existing.LOAIHINH,
                NGAY_IMPORT: existing.NGAY_IMPORT,
              };
            }

            // ✅ SKU mới hoặc chưa có LOAIHINH đặc biệt → Cho phép cập nhật toàn bộ
            return row;
          } catch (err) {
            // Nếu không tìm thấy SKU (SKU mới) → Cho phép import toàn bộ
            return row;
          }
        }),
      );

      const response = await dinhViService.importManyDinhVi(processedRows);

      const stats = response?.stats || {};
      const inserted = stats.inserted || 0;
      const modified = stats.modified || 0;
      const unchanged = (stats.matched || 0) - modified;

      let message = `✅ Import hoàn tất từ "${fileName}":\n`;
      message += `• Thêm mới: ${inserted} SKU\n`;
      message += `• Cập nhật: ${modified} SKU\n`;
      if (unchanged > 0) {
        message += `• Không thay đổi: ${unchanged} SKU`;
      }

      alert(message);
      setShowModal(false);
      resetState();
      onImportSuccess?.();
    } catch (err) {
      console.error("Import error:", err);
      alert("❌ Lỗi import: " + (err?.message || "Không xác định"));
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    const wb = buildStyledWorkbook([]);
    const buf = await wb.xlsx.writeBuffer();
    saveAs(new Blob([buf]), "template_dinhvi.xlsx");
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
        📥 Import ĐV
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                📥 Import Định Vị
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
              {/* ✅ Thông tin về logic import */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="text-blue-600 text-xl mt-0.5">ℹ️</div>
                  <div className="text-sm text-blue-900">
                    <div className="font-semibold mb-1">Cách thức import:</div>
                    <ul className="space-y-1 text-blue-800">
                      <li>
                        • Nếu <strong>SKU chưa tồn tại</strong> → Thêm mới
                      </li>
                      <li>
                        • Nếu <strong>SKU đã tồn tại</strong> và chưa có
                        cách/đặc thù → Cập nhật toàn bộ
                      </li>
                      <li>
                        • Nếu{" "}
                        <strong>
                          SKU đã có cách = 1 hoặc Hàng đặc thù
                        </strong>{" "}
                        → Chỉ cập nhật <strong>SLOT</strong>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

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
                      Sẵn sàng import{" "}
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
                {importing ? "Đang import..." : `Import ${rowCount} dòng`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DinhViImport;
