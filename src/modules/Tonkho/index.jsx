import { useState } from "react";
import ExcelJS from "exceljs";
import {
  Download,
  Loader,
  Plus,
  X,
  Database,
  ArrowRight,
  Merge,
  CheckCircle,
} from "lucide-react";
import { tonKhoService } from "@/services/tonkho.service";

// ============================================================
// HELPERS
// ============================================================
const formatJdaNumber = (str) => {
  if (!str || str.trim() === "" || str.trim() === ".00") return 0;
  let cleaned = str.replace(/,/g, "").trim();
  if (cleaned.endsWith("-")) cleaned = "-" + cleaned.slice(0, -1);
  return parseFloat(cleaned) || 0;
};

const getMergedFileName = () => {
  const now = new Date();
  const dd = String(now.getDate()).padStart(2, "0");
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `TONKHO 810 ${dd}${mm}.xlsx`;
};

// ============================================================
// MAP TO INVENTORY MODEL
// zone, slot, sku, name, onHand, pack, ngay_ton
// ============================================================
const mapRowToInventoryModel = (row) => ({
  zone: String(row[0] ?? "").trim(),
  slot: String(row[1] ?? "").trim(),
  sku: String(row[2] ?? "").trim(),
  name: String(row[3] ?? "").trim(),
  onHand: Number(row[7]) || 0,
  pack: Number(row[9]) || 1, // default 1 tránh vi phạm min:1
  ngay_ton: row[13] instanceof Date ? row[13] : new Date(),
});

// ============================================================
// EXCEL FORMATTING
// ============================================================
const NUM_FORMAT_ACCOUNTING = '_(* #,##0_);_(* \\(#,##0\\);_(* "-"??_);_(@_)';
const NUM_FORMAT_DATE = "dd/mm/yyyy";
const HEADER_THEME_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFBDD7EE" },
};

const buildFormattedSheet = (wb, sheetName, headers, rows, colWidths) => {
  const ws = wb.addWorksheet(sheetName);
  ws.columns = headers.map((h, i) => ({
    header: h,
    key: `col${i}`,
    width: colWidths[i] || 15,
  }));
  const headerRow = ws.getRow(1);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: "Calibri", size: 11, bold: true };
    cell.fill = HEADER_THEME_FILL;
    cell.alignment = { vertical: "middle", horizontal: "center" };
  });
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: headers.length },
  };
  ws.views = [{ state: "frozen", xSplit: 4, ySplit: 1, topLeftCell: "E2" }];
  rows.forEach((rowData) => {
    const row = ws.addRow(rowData);
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: "Calibri", size: 11 };
      if (colNumber === 9 || colNumber === 13)
        cell.numFmt = NUM_FORMAT_ACCOUNTING;
      if (colNumber === 11 || colNumber === 14) cell.numFmt = NUM_FORMAT_DATE;
    });
  });
  return ws;
};

// ============================================================
// PARSE KHO 8101
// ============================================================
export const parseKho8101 = (line) => {
  const skuMatch = line.match(/^\s*(\d{7})\s+(.*)/);
  if (!skuMatch) return null;
  const sku = +skuMatch[1];
  const rest = skuMatch[2];
  const parts = rest.split(/\s{2,}/);
  if (parts.length < 5) return null;
  const onHand = formatJdaNumber(parts[1]);
  if (onHand === 0) return null;
  return [
    sku,
    parts[0].trim(),
    onHand,
    formatJdaNumber(parts[2]),
    formatJdaNumber(parts[3]),
    0,
    formatJdaNumber(parts[4]),
    0,
    formatJdaNumber(parts[5]),
    formatJdaNumber(parts[6]),
  ];
};

export const HEADERS_8101 = [
  "Sku",
  "Description",
  "On Hand",
  "Retail",
  "Retail",
  "In-Transit",
  "Cost",
  "In-Transit",
  "Cost",
  "G.M.%",
];
const COL_WIDTHS_8101 = [12, 35, 12, 12, 12, 12, 14, 12, 14, 10];

// ============================================================
// PARSE KHO 810
// ============================================================
export const parseKho810 = (text) => {
  const dataRows = [];
  const lines = text.split("\n");
  let reportDate = null;
  const dateMatch = text.match(/Date:(\d{2}\/\d{2}\/\d{2})/);
  if (dateMatch) {
    const parts = dateMatch[1].split("/");
    reportDate = new Date(`20${parts[2]}-${parts[1]}-${parts[0]}`);
  } else {
    reportDate = new Date();
  }
  const ALLOWED_ZONES = [
    "DL",
    "DP",
    "GC",
    "HB",
    "HG",
    "HP",
    "HR",
    "HZ",
    "KM",
    "RC",
    "RD",
    "RS",
    "RZ",
    "SZ",
    "TP",
  ];
  lines.forEach((line) => {
    if (line.length < 80) return;
    const zon = line.slice(1, 3).trim();
    const eSlot = line.slice(4, 14).trim();
    const skuStr = line.slice(15, 22).trim();
    if (!/^\d{7}$/.test(skuStr)) return;
    const sku = +skuStr;
    const name = line.slice(23, 53).trim();
    const vendor = line.slice(54, 69).trim();
    const buyer = line.slice(70, 74).trim();
    const rest = line.slice(74).trim();
    if (!ALLOWED_ZONES.includes(zon)) return;
    if (!/^\d{7}$/.test(sku)) return;
    const nums = rest.split(/\s+/).filter(Boolean);
    if (nums.length < 6) return;
    const unitCost = formatJdaNumber(nums[0]);
    const onHand = formatJdaNumber(nums[1]);
    const cases = parseInt(nums[2]) || 0;
    const pack = parseInt(nums[3]) || 0;
    const rcvDate = nums[4] ?? nums[4];
    const cube = formatJdaNumber(nums[5]);
    dataRows.push([
      zon,
      eSlot,
      sku,
      name,
      vendor,
      buyer,
      unitCost,
      onHand,
      cases,
      pack,
      rcvDate,
      cube,
      unitCost * onHand,
      reportDate,
    ]);
  });
  return dataRows;
};

export const HEADERS_810 = [
  "Zon",
  "eSlot",
  "Sku",
  "Name",
  "Vendor Part No.",
  "Buyer",
  "Unit Cost",
  "On Hand",
  "Cases",
  "Pack",
  "Rcv Date",
  "Cube",
  "Total",
  "Date",
];
const COL_WIDTHS_810 = [
  6, 10, 10, 35.7, 18, 8, 12, 10, 10.5, 8.5, 10.7, 12, 14.3, 10.7,
];

// ============================================================
// MERGE
// ============================================================
export const HEADERS_MERGED = [
  "Zone",
  "Slot",
  "Sku",
  "Name",
  "Vendor Part No.",
  "Buyer",
  "Unit Cost",
  "On Hand",
  "Cases",
  "Pack",
  "Rcv Date",
  "Cube",
  "Total",
  "Date",
];
const COL_WIDTHS_MERGED = [
  5.14, 9, 8, 35.7, 15.3, 7.86, 12, 10.14, 10.57, 8.57, 10.71, 12, 14.3, 10.71,
];

const buildPackMap = (rows810) => {
  const map = {};
  for (const row of rows810) {
    const sku = row[2];
    const pack = row[9];
    if (sku && pack && !map[sku]) map[sku] = pack;
  }
  return map;
};

const convert8101ToMerged = (row, reportDate, packMap) => {
  const sku = row[0];
  const onHand = row[2];
  const cost = row[6];
  const pack = packMap[sku] || "";
  const cases = pack ? +(onHand / pack).toFixed(4) : "";
  return [
    8101,
    "A8101",
    parseInt(sku),
    row[1],
    null,
    null,
    cost,
    onHand,
    cases,
    pack || null,
    null,
    null,
    cost * onHand,
    reportDate,
  ];
};

const workbookToBlob = async (wb) => {
  const buffer = await wb.xlsx.writeBuffer();
  return new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
};

// ============================================================
// MAIN COMPONENT
// ============================================================
const HandleTonKho = () => {
  const [files8101, setFiles8101] = useState([]);
  const [files810, setFiles810] = useState([]);
  const [status, setStatus] = useState("idle");
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const [downloadUrl8101, setDownloadUrl8101] = useState(null);
  const [downloadUrl810, setDownloadUrl810] = useState(null);
  const [downloadUrlMerged, setDownloadUrlMerged] = useState(null);
  const [mergedFileName, setMergedFileName] = useState("");
  const [totalRecords, setTotalRecords] = useState({
    8101: 0,
    810: 0,
    merged: 0,
  });

  const [inventoryPayload, setInventoryPayload] = useState([]);

  // ── CONVERT & AUTO-SAVE ──────────────────────────────────
  const handleConvert = async () => {
    if (files8101.length === 0 && files810.length === 0) return;
    setStatus("processing");
    setSaveStatus("idle");

    let allRows8101 = [];
    let allRows810 = [];

    try {
      for (const file of files8101) {
        const text = await file.text();
        const rows = text.split("\n").map(parseKho8101).filter(Boolean);
        allRows8101 = [...allRows8101, ...rows];
      }
      for (const file of files810) {
        const text = await file.text();
        const rows = parseKho810(text);
        allRows810 = [...allRows810, ...rows];
      }

      const packMap = buildPackMap(allRows810);
      const reportDate = allRows810.length > 0 ? allRows810[0][13] : new Date();

      // Build merged rows (raw, for Excel)
      const merged = [
        ...allRows810,
        ...allRows8101.map((r) => convert8101ToMerged(r, reportDate, packMap)),
      ];

      // Map merged rows → inventory model objects
      const modelPayload = merged
        .map(mapRowToInventoryModel)
        .filter((item) => item.sku && item.name);
      setInventoryPayload(modelPayload);

      // 🚀 TỰ ĐỘNG LƯU DATABASE TẠI ĐÂY
      if (modelPayload.length > 0) {
        setSaveStatus("saving");
        try {
          await tonKhoService.upsertManyTonKho(modelPayload);
          setSaveStatus("saved");
        } catch (error) {
          setSaveStatus("error");
          console.error("Lỗi khi tự động lưu DB:", error);
        }
      }

      // ── Export Excel ──
      if (allRows8101.length > 0) {
        const wb = new ExcelJS.Workbook();
        buildFormattedSheet(
          wb,
          "KHO_8101",
          HEADERS_8101,
          allRows8101,
          COL_WIDTHS_8101,
        );
        setDownloadUrl8101(URL.createObjectURL(await workbookToBlob(wb)));
      }
      if (allRows810.length > 0) {
        const wb = new ExcelJS.Workbook();
        buildFormattedSheet(
          wb,
          "KHO_810",
          HEADERS_810,
          allRows810,
          COL_WIDTHS_810,
        );
        setDownloadUrl810(URL.createObjectURL(await workbookToBlob(wb)));
      }
      if (merged.length > 0) {
        const wb = new ExcelJS.Workbook();
        buildFormattedSheet(
          wb,
          "TONKHO",
          HEADERS_MERGED,
          merged,
          COL_WIDTHS_MERGED,
        );
        setDownloadUrlMerged(URL.createObjectURL(await workbookToBlob(wb)));
        setMergedFileName(getMergedFileName());
      }

      setTotalRecords({
        8101: allRows8101.length,
        810: allRows810.length,
        merged: merged.length,
      });
      setStatus("success");
    } catch (error) {
      setStatus("error");
      console.error("Lỗi xử lý file:", error);
    }
  };

  // ── RESET ─────────────────────────────────────────────────
  const reset = () => {
    setFiles8101([]);
    setFiles810([]);
    setStatus("idle");
    setSaveStatus("idle");
    setDownloadUrl8101(null);
    setDownloadUrl810(null);
    setDownloadUrlMerged(null);
    setMergedFileName("");
    setInventoryPayload([]);
  };

  // ── RENDER ────────────────────────────────────────────────
  return (
    <div className="p-6 max-w-7xl mx-auto bg-slate-50 min-h-screen">
      <div className="bg-white shadow-2xl rounded-3xl p-8 border border-slate-200">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-slate-800 flex items-center justify-center gap-3 mb-2">
            <Database className="text-blue-600 w-10 h-10" /> JDA PROCESSOR
          </h1>
        </div>

        {/* Upload zones */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* KHO 8101 */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-700">
              KHO 8101 (INV111)
            </h3>
            <div className="group relative border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center hover:bg-blue-50 transition-all">
              <input
                type="file"
                accept=".txt"
                multiple
                onChange={(e) => {
                  setFiles8101((prev) => [
                    ...prev,
                    ...Array.from(e.target.files),
                  ]);
                  setStatus("idle");
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Plus className="mx-auto text-blue-600 mb-2" />
              <p className="text-sm font-bold">Thêm file 8101</p>
            </div>
            {files8101.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-blue-50 rounded-lg text-xs font-bold"
              >
                <span className="truncate w-40">{f.name}</span>
                <X
                  size={14}
                  className="cursor-pointer text-red-400 flex-shrink-0"
                  onClick={() =>
                    setFiles8101(files8101.filter((_, idx) => idx !== i))
                  }
                />
              </div>
            ))}
          </div>

          {/* KHO 810 */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-700">
              KHO 810 (WHS007)
            </h3>
            <div className="group relative border-2 border-dashed border-purple-300 rounded-2xl p-8 text-center hover:bg-purple-50 transition-all">
              <input
                type="file"
                accept=".txt"
                multiple
                onChange={(e) => {
                  setFiles810((prev) => [
                    ...prev,
                    ...Array.from(e.target.files),
                  ]);
                  setStatus("idle");
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Plus className="mx-auto text-purple-600 mb-2" />
              <p className="text-sm font-bold">Thêm file 810</p>
            </div>
            {files810.map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 bg-purple-50 rounded-lg text-xs font-bold"
              >
                <span className="truncate w-40">{f.name}</span>
                <X
                  size={14}
                  className="cursor-pointer text-red-400 flex-shrink-0"
                  onClick={() =>
                    setFiles810(files810.filter((_, idx) => idx !== i))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        {/* Process button */}
        {status !== "success" &&
          (files8101.length > 0 || files810.length > 0) && (
            <button
              onClick={handleConvert}
              disabled={status === "processing"}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-colors"
            >
              {status === "processing" ? (
                <Loader className="animate-spin" />
              ) : (
                <ArrowRight />
              )}
              BẮT ĐẦU XỬ LÝ
            </button>
          )}

        {/* Error */}
        {status === "error" && (
          <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 text-center mt-4">
            <p className="text-red-700 font-black">
              Lỗi xử lý! Vui lòng kiểm tra lại file.
            </p>
            <button
              onClick={reset}
              className="mt-3 text-sm text-red-400 font-bold hover:underline"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Success & Status */}
        {status === "success" && (
          <div className="space-y-4">
            <div className="bg-green-50 border-2 border-green-200 rounded-2xl p-6">
              <p className="text-green-800 font-black mb-4">✓ XỬ LÝ XONG!</p>

              {/* Download buttons */}
              <div className="grid gap-3 mb-4">
                {downloadUrl8101 && (
                  <a
                    href={downloadUrl8101}
                    download="KHO_8101.xlsx"
                    className="flex items-center justify-between p-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors"
                  >
                    <span>Tải Kho 8101 ({totalRecords[8101]} dòng)</span>
                    <Download size={20} />
                  </a>
                )}
                {downloadUrl810 && (
                  <a
                    href={downloadUrl810}
                    download="KHO_810.xlsx"
                    className="flex items-center justify-between p-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors"
                  >
                    <span>Tải Kho 810 ({totalRecords[810]} dòng)</span>
                    <Download size={20} />
                  </a>
                )}
                {downloadUrlMerged && (
                  <a
                    href={downloadUrlMerged}
                    download={mergedFileName}
                    className="flex items-center justify-between p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Merge size={18} />
                      <span>
                        Tải Tổng Hợp 810 + 8101 ({totalRecords.merged} dòng)
                      </span>
                    </div>
                    <Download size={20} />
                  </a>
                )}
              </div>

              {/* ── Trạng thái tự động lưu DB ── */}
              {saveStatus === "saving" && (
                <div className="flex items-center justify-center gap-2 py-3 bg-orange-50 border border-orange-200 rounded-xl text-orange-600 font-bold animate-pulse">
                  <Loader size={18} className="animate-spin" /> Đang tự động lưu{" "}
                  {inventoryPayload.length} dòng vào Database...
                </div>
              )}

              {saveStatus === "error" && (
                <div className="flex items-center justify-center gap-2 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 font-black">
                  <X size={18} /> Lỗi tự động lưu vào Database! Vui lòng kiểm
                  tra lại.
                </div>
              )}

              {saveStatus === "saved" && (
                <div className="flex items-center justify-center gap-2 py-3 bg-teal-50 border border-teal-200 rounded-xl text-teal-700 font-black">
                  <CheckCircle size={18} /> Đã tự động lưu{" "}
                  {inventoryPayload.length} dòng vào Database!
                </div>
              )}
            </div>

            <button
              onClick={reset}
              className="w-full py-3 text-slate-400 font-bold hover:text-slate-600 transition-colors"
            >
              Làm mới hệ thống
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HandleTonKho;
