/* eslint-disable no-control-regex */
/* eslint-disable no-empty */
import { useState } from "react";
import ExcelJS from "exceljs";
import {
  safeReadFileAsText,
  parseStoresPerRow,
  buildAndDownloadExcelStores,
  autoFitColumns,
  styleHeader,
  yyyymmdd,
  downloadXlsxBuffer,
} from "../component/txtfile2";

/** ===================== Regex riêng cho CS (File 1) ===================== */
const RX = {
  orderHeader: /^\s*(\d{7,8})\s+Allocated\b/,
  itemLine: /^\s*(\d+)\s+Allocated\s+\d+\s+(\d{5,})\s+(.*)$/,
  money3: /(\d{1,3}(?:,\d{3})*\.\d{2}|\d+\.\d{2})/g,
  soda8: /\b(\d{8})\b/,
  sku7: /\b(\d{7})\b/,
  numFlex: /\d{1,3}(?:,\d{3})*\.\d{2,4}|\d+\.\d{2,4}/g,
  convLine: /Convenience store tran\. line/i,
};

export const useTxtProcessor = () => {
  const [fileA, setFileA] = useState(null);
  const [fileB, setFileB] = useState(null);
  const [processing, setProcessing] = useState(false);

  /** ===================== Parsers (File 1 - CS) ===================== */
  const parseItemsAllocated = (lines) => {
    const rows = [];
    let currentOrder = null;
    let pending = null;

    for (let i = 0; i < lines.length; i++) {
      const raw = lines[i];
      const line = String(raw || "").replace(/\u0000/g, "");

      // Header order
      const mOrder = line.match(RX.orderHeader);
      if (mOrder) {
        currentOrder = mOrder[1];
        pending = null;
        continue;
      }
      if (!currentOrder) continue;

      // Dòng item có SKU (Allocated ...)
      const mItem = line.match(RX.itemLine);
      if (mItem) {
        const line_no = Number(mItem[1]);
        const sku = mItem[2];
        const tail = mItem[3];

        // Lấy mô tả (desc): phần trước cụm số đầu tiên
        const numsInTail = [...tail.matchAll(RX.numFlex)];
        const firstNum = numsInTail[0];
        const desc = (
          firstNum ? tail.slice(0, firstNum.index).trim() : tail.trim()
        ).replace(/\s{2,}/g, " ");

        pending = {
          order_number: currentOrder,
          soda_id: currentOrder,
          line_no,
          sku,
          description: desc,
        };
        continue;
      }

      // Dòng "Convenience store tran. line" -> lấy số lượng từ cột Ord/Alloc
      if (pending && RX.convLine.test(line)) {
        let quantity = 0;
        
        // Phương pháp 1: Tách theo nhiều khoảng trắng (cấu trúc cột)
        // Dòng có dạng: "                   Convenience store tran. line     12     44,307.65"
        const trimmed = line.trim();
        const parts = trimmed.split(/\s+/);
        
        // Tìm index của "line"
        const lineIdx = parts.findIndex(p => /^line$/i.test(p));
        
        if (lineIdx >= 0 && lineIdx + 1 < parts.length) {
          const nextPart = parts[lineIdx + 1];
          // Kiểm tra nếu là số (có thể có dấu thập phân hoặc phẩy)
          if (/^\d+(\.\d+)?$/.test(nextPart)) {
            quantity = parseFloat(nextPart);
          }
        }
        
        // Phương pháp 2 (fallback): Quét toàn bộ để tìm số đầu tiên
        if (quantity === 0) {
          for (const part of parts) {
            // Bỏ qua các từ khóa
            if (/convenience|store|tran|line/i.test(part)) continue;
            // Lấy số đầu tiên (có thể có dấu thập phân, bỏ qua số có dấu phẩy)
            if (/^\d+(\.\d+)?$/.test(part)) {
              const num = parseFloat(part);
              if (num > 0) {
                quantity = num;
                break;
              }
            }
          }
        }

        // Chỉ thêm vào rows nếu có quantity > 0
        if (quantity > 0) {
          rows.push({
            ...pending,
            quantity,
            unit_price: 0,
            extended_price: 0,
          });
        } else {
        }

        pending = null;
        continue;
      }
    }


    // Sort
    rows.sort((a, b) =>
      a.order_number === b.order_number
        ? a.line_no - b.line_no
        : String(a.order_number).localeCompare(String(b.order_number))
    );

    return rows;
  };

  const parseItemsGeneric = (lines) => {
    const rows = [];
    const lineNoByOrder = new Map();

    for (const raw of lines) {
      const line = String(raw || "").replace(/\u0000/g, "");
      const mSku = line.match(RX.sku7);
      const mSoda = line.match(RX.soda8);
      if (!mSku || !mSoda) continue;

      const order_number = mSoda[1];
      const skuIdx = line.indexOf(mSku[0]);
      if (skuIdx < 0) continue;

      const tail = line.slice(skuIdx + mSku[0].length).trim();
      const numsInTail = [...tail.matchAll(RX.numFlex)];
      if (numsInTail.length < 2) continue;

      const firstNum = numsInTail[0];
      const desc = tail
        .slice(0, firstNum.index)
        .trim()
        .replace(/\s{2,}/g, " ");

      const qtyStr = numsInTail[0][0];
      const unitStr = (numsInTail[1] && numsInTail[1][0]) || "0.00";

      const quantity = Number(qtyStr.replace(/,/g, ""));
      const unit_price = Number(unitStr.replace(/,/g, ""));
      const extended_price = Number.isFinite(quantity * unit_price)
        ? quantity * unit_price
        : 0;

      const nextNo = (lineNoByOrder.get(order_number) || 0) + 1;
      lineNoByOrder.set(order_number, nextNo);

      rows.push({
        order_number,
        soda_id: order_number,
        line_no: nextNo,
        sku: mSku[1],
        description: desc,
        quantity,
        unit_price,
        extended_price,
      });
    }

    rows.sort((a, b) =>
      a.order_number === b.order_number
        ? a.line_no - b.line_no
        : String(a.order_number).localeCompare(String(b.order_number))
    );
    return rows;
  };

  const parseTxtBlobForOrders = async (blob) => {
    const raw = await safeReadFileAsText(blob);
    let lines = raw.split(/\r?\n/);

    let rows = parseItemsAllocated(lines);
    if (rows.length < 2) {
      const raw2 = raw.replace(/^\uFEFF/, "");
      lines = raw2.split(/\r?\n/);
      rows = parseItemsAllocated(lines);
    }
    if (rows.length < 2) rows = parseItemsGeneric(lines);
    return rows;
  };

  /** ===================== Excel (File 1 - CS) ===================== */
  const buildAndDownloadExcelOrders = async (rows, firstOrder = "SOD233") => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Parsed");
    ws.columns = [
      { header: "Order", key: "order_number" },
      { header: "SKU", key: "sku" },
      { header: "Description", key: "description" },
      { header: "Qty", key: "quantity" },
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
    downloadXlsxBuffer(buf, `SOD233_parsed_${firstOrder}.xlsx`);
  };

  const buildAndDownloadExcel_DONHANG = async (orderRows, storeRows) => {
    const storeBySoda = new Map();
    for (const r of storeRows) {
      const soda = String(r.soda_id || "").trim();
      const store = String(r.location_id || "").trim();
      if (soda && store && !storeBySoda.has(soda)) storeBySoda.set(soda, store);
    }

    const merged = new Array(orderRows.length);
    for (let i = 0; i < orderRows.length; i++) {
      const r = orderRows[i];
      merged[i] = {
        STORE: storeBySoda.get(String(r.order_number)) || "",
        TYPE: "Soda",
        SODA_TRANSFER: String(r.order_number || ""),
        SKU: String(r.sku || ""),
        NAME: String(r.description || ""),
        LUONG: Number(r.quantity || 0),
        NGAY_IMPORT: "",
      };
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("DONHANG");
    ws.columns = [
      { header: "STORE", key: "STORE" },
      { header: "TYPE", key: "TYPE" },
      { header: "SODA_TRANSFER", key: "SODA_TRANSFER" },
      { header: "SKU", key: "SKU" },
      { header: "NAME", key: "NAME" },
      { header: "LUONG", key: "LUONG" },
      { header: "NGAY_IMPORT", key: "NGAY_IMPORT" },
    ];
    for (const row of merged) ws.addRow(row);

    styleHeader(ws);
    for (let r = 2; r <= ws.rowCount; r++) {
      ws.getCell(r, 6).numFmt = "#,##0.00";
      ws.getCell(r, 6).alignment = { horizontal: "right" };
    }
    ws.views = [{ state: "frozen", ySplit: 1 }];
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: ws.columnCount },
    };
    autoFitColumns(ws);

    const buf = await wb.xlsx.writeBuffer();
    downloadXlsxBuffer(buf, `DONHANG_${yyyymmdd()}.xlsx`);
  };

  /** ===================== Main Processing (CS) ===================== */
  const processFiles = async (onProcessTxt) => {
    const hasA = !!fileA;
    const hasB = !!fileB;

    if (!hasA && !hasB) {
      throw new Error("Vui lòng chọn ít nhất 1 file TXT!");
    }

    setProcessing(true);
    try {
      let rowsA = null;
      let rowsB = null;

      if (hasA) {
        rowsA = await parseTxtBlobForOrders(fileA);
        if (!rowsA.length)
          throw new Error("Không đọc được dữ liệu hợp lệ trong file 1 (CS).");

        const firstOrder = rowsA[0]?.order_number ?? "SOD233";
        await buildAndDownloadExcelOrders(rowsA, firstOrder);

        onProcessTxt?.(
          rowsA,
          {
            fileName: fileA.name,
            fileSizeKB: Math.round(fileA.size / 1024),
            totalRows: rowsA.length,
          },
          "CS:A"
        );
      }

      if (hasB) {
        const raw = await safeReadFileAsText(fileB);
        const lines = raw.split(/\r?\n/);
        rowsB = parseStoresPerRow(lines);
        if (!rowsB.length)
          throw new Error(
            "Không trích xuất được dữ liệu SODA/CH/Address từ file 2."
          );

        const base = `${rowsB[0]?.soda_id || "SODA"}_${
          rowsB[0]?.location_id || "CHxxxxx"
        }`;
        await buildAndDownloadExcelStores(rowsB, base);

        onProcessTxt?.(
          rowsB,
          {
            fileName: fileB.name,
            fileSizeKB: Math.round(fileB.size / 1024),
            totalRows: rowsB.length,
          },
          "CS:B"
        );
      }

      if (rowsA && rowsB) {
        await buildAndDownloadExcel_DONHANG(rowsA, rowsB);
      }

      return { success: true };
    } finally {
      setProcessing(false);
    }
  };

  const reset = () => {
    setFileA(null);
    setFileB(null);
    setProcessing(false);
  };

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
};