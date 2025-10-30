/* eslint-disable no-control-regex */
/* eslint-disable no-empty */
import ExcelJS from "exceljs";

/** ===================== Regex dùng cho File 2 ===================== */
const RX_COMMON = {
  sku7: /\b(\d{7})\b/,
  soda8: /\b(\d{8})\b/,
  ch: /\bCH\d{5}\b/i,
  addressTail: /(CH\d{5}-[^\t,]+.*)$/i,
};

/** ===================== IO helpers (shared) ===================== */
export const readFileAsTextPreferred = async (blob) => {
  if (typeof blob?.text === "function") return blob.text();
  throw new Error("blob.text() not available");
};

export const readFileAsTextFallback = (blob, encoding = "utf-16") =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error || new Error("FileReader error"));
    fr.onload = () => resolve(fr.result || "");
    fr.readAsText(blob, encoding);
  });

export const readFileAsArrayBuffer = (blob) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(fr.error || new Error("FileReader error"));
    fr.onload = () => resolve(fr.result);
    fr.readAsArrayBuffer(blob);
  });

export const safeReadFileAsText = async (blob) => {
  if (!blob || typeof blob.size !== "number" || blob.size === 0) {
    throw new Error(
      "File rỗng hoặc là placeholder (OneDrive/iCloud/Drive). Hãy tải file về máy rồi chọn lại."
    );
  }
  try {
    const t = await readFileAsTextPreferred(blob);
    if (t && typeof t === "string") return t;
  } catch {}
  try {
    const t16 = await readFileAsTextFallback(blob, "utf-16");
    if (t16 && t16.length > 0) return t16;
  } catch {}
  try {
    const t8 = await readFileAsTextFallback(blob, "utf-8");
    if (t8 && t8.length > 0) return t8;
  } catch {}
  try {
    const ab = await readFileAsArrayBuffer(blob);
    try {
      const dec16 = new TextDecoder("utf-16le", { fatal: false });
      const t16 = dec16.decode(ab);
      if (t16 && t16.length > 0) return t16;
    } catch {}
    const dec8 = new TextDecoder("utf-8", { fatal: false });
    const t8 = dec8.decode(ab);
    if (t8 && t8.length > 0) return t8;
  } catch (e) {
    throw new Error(
      `Không đọc được file (NotReadableError). Đảm bảo file không mở/khoá. Chi tiết: ${e?.message || e}`
    );
  }
  throw new Error("Không thể giải mã nội dung file (UTF-16/UTF-8).");
};

/** ===================== Utils (shared) ===================== */
export const trimMulti = (s) =>
  String(s || "").replace(/\u0000/g, "").replace(/\s{2,}/g, " ").trim();

export const yyyymmdd = (d = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
};

export const autoFitColumns = (ws, sample = 300) => {
  const rowMax = Math.min(ws.rowCount, sample);
  ws.columns.forEach((_, idx) => {
    const colIndex = idx + 1;
    let max = String(ws.getCell(1, colIndex).value || "").length + 2; // header
    for (let r = 2; r <= rowMax; r++) {
      const cell = ws.getCell(r, colIndex);
      const v =
        cell.value == null
          ? ""
          : String(
              cell.value?.richText
                ? cell.value.richText.map((t) => t.text).join("")
                : cell.value
            );
      if (v.length + 2 > max) max = v.length + 2;
    }
    ws.getColumn(colIndex).width = Math.min(Math.max(10, max), 60);
  });
};

export const styleHeader = (ws) => {
  const header = ws.getRow(1);
  header.height = 24;
  header.font = { bold: true };
  header.eachCell((c) => {
    c.border = {
      top: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
      bottom: { style: "thin" },
    };
    c.alignment = { vertical: "middle" };
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFEFF6FF" },
    };
  });
};

export const downloadXlsxBuffer = (buffer, name) => {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

/** ===================== FILE 2: Parser dùng chung ===================== */
export const parseStoresPerRow = (lines) => {
  const rows = [];
  for (const raw of lines) {
    const line = trimMulti(raw);
    if (!RX_COMMON.sku7.test(line)) continue;

    const soda = (line.match(RX_COMMON.soda8)?.[1] || "").trim();
    const loc = (line.match(RX_COMMON.ch)?.[0] || "").toUpperCase();
    if (!soda && !loc) continue;

    let address = "";
    const mAddr = line.match(RX_COMMON.addressTail);
    if (mAddr) address = trimMulti(mAddr[1]);
    else if (loc) address = loc;

    rows.push({ soda_id: soda, location_id: loc, address });
  }
  return rows;
};

/** ===================== FILE 2: Xuất Excel dùng chung ===================== */
export const buildAndDownloadExcelStores = async (rows, fileBase = "StoresPerRow") => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Stores");
  ws.columns = [
    { header: "SODA ID", key: "soda_id" },
    { header: "Location ID", key: "location_id" },
    { header: "Address", key: "address" },
  ];
  for (const r of rows) ws.addRow(r);

  styleHeader(ws);
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: ws.columnCount },
  };
  autoFitColumns(ws);

  const buf = await wb.xlsx.writeBuffer();
  downloadXlsxBuffer(buf, `${fileBase}_stores.xlsx`);
};
