/* eslint-disable no-control-regex */
/* eslint-disable no-empty */
import { useState, useCallback } from "react";
import ExcelJS from "exceljs";
import {
  safeReadFileAsText,
  parseStoresPerRow,
  buildAndDownloadExcelStores,
  autoFitColumns,
  styleHeader,
  yyyymmdd,
} from "../component/txtfile2";

/** ===================== Regex chuẩn hoá cho CF (File 1) ===================== */
const RX = {
  leading: /^\s*(\d{8})\s+([A-Za-z])\s+(\d{2}\/\d{2}\/\d{2})\s+(\d{7})\s+(.*)$/,
  money: /(?:(?:\d{1,3}(?:,\d{3})*|\d+)?\.\d{2})/g,
  headerLine:
    /^\s*Transfer\s+Number\s+Status|^\s*Number\s+Status|^\s*Transfer\s+Transfer/i,
};

/** ===================== Utils riêng ===================== */
const trim0 = (s) => String(s || "").replace(/\u0000/g, "");

// ".00" -> 0 ; "1,234.50" -> 1234.5
const parseMoneyToNumber = (s) => {
  const t = String(s || "").trim();
  if (t === ".00" || t === ".0" || t === ".") return 0;
  return Number(t.replace(/,/g, "")) || 0;
};

/** ===================== Parser CF TXT (File 1 - CF) ===================== */
const parseCFTextToRows = (raw) => {
  const lines = String(raw || "").replace(/^\uFEFF/, "").split(/\r?\n/);
  const rows = [];

  for (let rawLine of lines) {
    const line = trim0(rawLine);
    if (!line) continue;
    if (RX.headerLine.test(line)) continue;

    const m = line.match(RX.leading);
    if (!m) continue;

    const transfer_number = m[1];
    const status = m[2];
    const initiation_date = m[3]; // dd/MM/yy
    const sku = m[4];
    const tail = m[5];

    const nums = [...tail.matchAll(RX.money)];
    if (nums.length < 3) continue;

    const requestM = nums[nums.length - 3];
    const allocateM = nums[nums.length - 2];
    const shipM = nums[nums.length - 1];

    const firstNumIdx = requestM.index;
    const description = tail.slice(0, firstNumIdx).replace(/\s{2,}/g, " ").trim();

    rows.push({
      transfer_number,
      status,
      initiation_date,
      sku,
      description,
      request_qty: parseMoneyToNumber(requestM[0]),
      allocate_qty: parseMoneyToNumber(allocateM[0]),
      ship_qty: parseMoneyToNumber(shipM[0]),
    });
  }

  rows.sort((a, b) =>
    a.transfer_number === b.transfer_number
      ? a.sku.localeCompare(b.sku)
      : a.transfer_number.localeCompare(b.transfer_number)
  );

  return rows;
};

/** ===================== Excel CF_Parsed.xlsx ===================== */
const buildAndDownloadExcelCF = async (cfRows) => {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("CF_Parsed");

  ws.columns = [
    { header: "Transfer Number", key: "transfer_number" },
    { header: "Status", key: "status" },
    { header: "Initiation Date", key: "initiation_date" },
    { header: "SKU", key: "sku" },
    { header: "Item Description", key: "description" },
    { header: "Quantity Request", key: "request_qty" },
    { header: "Quantity Allocate", key: "allocate_qty" },
    { header: "Quantity Ship", key: "ship_qty" },
  ];

  for (const r of cfRows) {
    ws.addRow({
      transfer_number: r.transfer_number,
      status: r.status, // sau khi lọc, toàn 'P'
      initiation_date: r.initiation_date,
      sku: r.sku,
      description: r.description,
      request_qty: r.request_qty,
      allocate_qty: r.allocate_qty,
      ship_qty: r.ship_qty,
    });
  }

  // format số
  for (let r = 2; r <= ws.rowCount; r++) {
    ws.getCell(r, 6).numFmt = "#,##0.00";
    ws.getCell(r, 7).numFmt = "#,##0.00";
    ws.getCell(r, 8).numFmt = "#,##0.00";
    ws.getCell(r, 6).alignment = { horizontal: "right" };
    ws.getCell(r, 7).alignment = { horizontal: "right" };
    ws.getCell(r, 8).alignment = { horizontal: "right" };
  }

  styleHeader(ws);
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: ws.columnCount } };
  autoFitColumns(ws);

  const buf = await wb.xlsx.writeBuffer();
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `CF_${yyyymmdd()}.xlsx`;
  a.click();
  URL.revokeObjectURL(a.href);
};

/** ===================== Hook: useTxtProcessorCF ===================== */
export default function useTxtProcessorCF() {
  // API tương thích với UI
  const [fileA, setFileA] = useState(null); // CF: chỉ cần 1 file
  const [fileB, setFileB] = useState(null); // vẫn để để UI chung, dùng cho File 2 nếu muốn
  const [processing, setProcessing] = useState(false);

  const reset = useCallback(() => {
    setFileA(null);
    setFileB(null);
    setProcessing(false);
  }, []);

  /**
   * CF logic:
   * - File 1: TXT CF -> parse -> lọc status === 'P' -> xuất CF_YYYYMMDD.xlsx
   * - File 2: (nếu chọn) dùng chung parser + exporter Stores
   * - KHÔNG xuất DONHANG ở CF
   */
  const processFiles = useCallback(
    async (onProcessTxt) => {
      if (!fileA && !fileB) throw new Error("Vui lòng chọn ít nhất 1 file (CF).");
      setProcessing(true);
      try {
        // ===== File 1 (CF): bắt buộc để có output CF_Parsed
        if (fileA) {
          const raw = await safeReadFileAsText(fileA);
          const rows = parseCFTextToRows(raw);
          const pRows = rows.filter(
            (r) => String(r.status || "").trim().toUpperCase() === "P"
          );
          if (!pRows.length) {
            throw new Error("Không có dòng nào có Status = 'P' trong file TXT (CF).");
          }

          await buildAndDownloadExcelCF(pRows);

          onProcessTxt?.(
            pRows,
            {
              fileName: fileA.name,
              fileSizeKB: Math.round(fileA.size / 1024),
              totalRows: pRows.length,
            },
            "CF:A"
          );
        }

        // ===== File 2 (tùy chọn, dùng chung)
        if (fileB) {
          const rawB = await safeReadFileAsText(fileB);
          const lines = rawB.split(/\r?\n/);
          const rowsB = parseStoresPerRow(lines);
          if (!rowsB.length) {
            throw new Error("Không trích xuất được dữ liệu SODA/CH/Address từ file 2 (CF).");
          }

          const base = `${rowsB[0]?.soda_id || "SODA"}_${rowsB[0]?.location_id || "CHxxxxx"}`;
          await buildAndDownloadExcelStores(rowsB, base);

          onProcessTxt?.(
            rowsB,
            {
              fileName: fileB.name,
              fileSizeKB: Math.round(fileB.size / 1024),
              totalRows: rowsB.length,
            },
            "CF:B"
          );
        }

        // ❌ KHÔNG xuất DONHANG tại CF
        return { success: true };
      } finally {
        setProcessing(false);
      }
    },
    [fileA, fileB]
  );

  return {
    fileA,
    fileB,
    processing,
    setFileA,
    setFileB,
    processFiles,
    reset,
    yyyymmdd,
  };
}
