/* eslint-disable react/prop-types */
import { memo, useCallback, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { phanBoCSService } from "@/services/phieusoan/phanbocs.service";

const PHAP_DANH = "5022151129";

const CELL_FONT = { size: 10, name: "Times New Roman" };
const CELL_ALIGNMENT = {
  vertical: "middle",
  horizontal: "left",
  wrapText: false,
};

const SDTF_HEADER_STYLE = {
  font: {
    bold: true,
    color: { argb: "FFFFFF" },
    size: 11,
    name: "Times New Roman",
  },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "20538D" } },
  alignment: { vertical: "middle", horizontal: "center" },
  border: {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  },
};

const SDTF_DATA_FONT = { name: "Times New Roman", size: 10 };
const COLOR_EVEN = "FFD9E1F2";
const COLOR_ODD = "FFFFFFFF";

const applyCell = (cell, value, colorArgb) => {
  const cleaned =
    typeof value === "string"
      ? value.replace(/\{\s*(.*?)\s*\}/g, "{$1}")
      : value;
  cell.value = cleaned ?? "";
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: colorArgb },
  };
  cell.font = CELL_FONT;
  cell.alignment = CELL_ALIGNMENT;
};

// ── Build tất cả rows + header ────────────────────────────────────────────────
const buildAllRows = (selectedRows) => {
  // 1. SKU unique theo thứ tự import
  const skuOrder = [];
  const skuSeen = new Set();
  // Map sku → gia (lấy từ row đầu tiên gặp)
  const skuGiaMap = new Map();

  for (const row of selectedRows) {
    if (!skuSeen.has(row.sku)) {
      skuSeen.add(row.sku);
      skuOrder.push(row.sku);
      skuGiaMap.set(row.sku, row.gia ?? 0);
    }
  }

  const totalSku = skuOrder.length;

  // 2. Group theo mach (giữ thứ tự xuất hiện)
  const storeOrder = [];
  const storeMap = new Map(); // mach → Map<sku, luong_phan_bo>
  const storeSdTf = new Map(); // mach → sd_tf (lấy cái đầu tiên)

  for (const row of selectedRows) {
    if (!storeMap.has(row.mach)) {
      storeMap.set(row.mach, new Map());
      storeOrder.push(row.mach);
      storeSdTf.set(row.mach, row.sd_tf ?? "");
    }
    storeMap.get(row.mach).set(row.sku, row.luong_phan_bo);
  }

  // 3. Build header row
  // Col A = (trống/label), B = "TẠO SODA", rồi mỗi SKU chiếm 6 ô (index 1..N),
  // rồi navigate cols, rồi "BẮT ĐẦU CHỈNH GIÁ", rồi giá ngược (N..1)
  // Theo file mẫu: col A = sd_tf (số), col B = TAB, col C = phap_danh...
  // Header: col A trống, col B = "TẠO SODA", rồi SKU groups, rồi giá ngược

  // Tính offset cột:
  // Mỗi data row: [sd_tf] [TAB] [{phap_danh}] [F2] | per-sku: [{sku}][TAB][{luong}][END][TAB][ENT] hoặc 6 trống
  // = 4 cố định đầu + totalSku*6 + navigate (2 hoặc 5 ô) + ENT + giá (5 ô/sku hoặc 5 trống) + 5 kết thúc
  // Header chỉ cần đủ cols

  // Navigate cols: <=10 → 2 ô, >10 → 5 ô
  const navCols = totalSku <= 10 ? 2 : 5;
  // Per gia: {gia}{TAB 3}{CP}F7 = 4 ô, nhưng sku đầu tiên (ngược) có ENT trước = 5 ô
  // Tổng cols data = 4 + totalSku*6 + navCols + 1(ENT) + totalSku*4 + 1(extra ENT đầu) + 5 kết thúc

  // Build header
  const headerRow = [];
  // Col A = trống (placeholder sd_tf)
  headerRow.push("");
  // Col B = "TẠO SODA"
  headerRow.push("TẠO SODA");
  // Col C,D = trống (TAB + phap_danh + F2 = 3 ô nữa nhưng header chỉ label)
  headerRow.push("");
  headerRow.push("");

  // SKU headers: mỗi SKU chiếm 6 ô, label ở ô đầu = số thứ tự
  for (let i = 0; i < totalSku; i++) {
    headerRow.push(String(i + 1)); // số thứ tự SKU
    headerRow.push("");
    headerRow.push("");
    headerRow.push("");
    headerRow.push("");
    headerRow.push("");
  }

  // Navigate placeholder
  for (let i = 0; i < navCols + 1; i++) headerRow.push(""); // +1 cho ENT

  // "BẮT ĐẦU CHỈNH GIÁ"
  headerRow.push("BẮT ĐẦU CHỈNH GIÁ");

  // Giá headers ngược: N..1, mỗi giá 4 ô (nhưng ô đầu tiên là ENT → đã tính)
  // Header giá: số thứ tự ngược
  for (let i = totalSku; i >= 1; i--) {
    headerRow.push(String(i));
    headerRow.push("");
    headerRow.push("");
    headerRow.push("");
  }

  // Kết thúc 5 ô
  for (let i = 0; i < 5; i++) headerRow.push("");

  // 4. Build data rows
  const allCells = [];

  for (const mach of storeOrder) {
    const rowMap = storeMap.get(mach);
    const sd_tf = storeSdTf.get(mach);

    // SKU có hàng ở cửa hàng này
    const hasItems = skuOrder.filter((sku) => rowMap.has(sku));
    if (hasItems.length === 0) continue;

    const cells = [];

    // Col A = sd_tf
    cells.push(sd_tf ?? "");
    // Col B = TAB
    cells.push("TAB");
    // Col C = {phap_danh}
    cells.push(`{${PHAP_DANH}}`);
    // Col D = F2
    cells.push("F2");

    // SKU + lượng (6 ô/SKU, trống nếu không có)
    for (const sku of skuOrder) {
      if (rowMap.has(sku)) {
        const luong = rowMap.get(sku);
        cells.push(`{${sku}}`);
        cells.push("TAB");
        cells.push(`{${luong}}`);
        cells.push("END");
        cells.push("TAB");
        cells.push("ENT");
      } else {
        cells.push("", "", "", "", "", "");
      }
    }

    // Navigate 7s
    const n = hasItems.length;
    if (n <= 10) {
      cells.push("{TAB 2}");
      cells.push(`{${"7".repeat(n)}}`);
    } else {
      const page2 = n - 10;
      cells.push("{TAB 2}");
      cells.push(`{${"7".repeat(10)}}`);
      cells.push("{PGDN 1}");
      cells.push("{TAB 5}");
      cells.push(`{${"7".repeat(page2)}}`);
    }

    // ENT bắt đầu nhập giá
    cells.push("ENT");

    // Giá theo thứ tự NGƯỢC (skuOrder ngược lại)
    const skuReversed = [...skuOrder].reverse();
    let firstGia = true;
    for (const sku of skuReversed) {
      if (rowMap.has(sku)) {
        const gia = skuGiaMap.get(sku) ?? 0;
        if (firstGia) {
          // ENT đã push ở trên, giá đầu tiên không cần ENT thêm
          cells.push(`{${gia}}`);
          firstGia = false;
        } else {
          cells.push(`{${gia}}`);
        }
        cells.push("{TAB 3}");
        cells.push("{CP}");
        cells.push("F7");
      } else {
        // SKU không có → 4 ô trống
        cells.push("", "", "", "");
      }
    }

    // Kết thúc
    cells.push("F7");
    cells.push("F6");
    cells.push("F7");
    cells.push("F7");
    cells.push("F7");

    allCells.push(cells);
  }

  return { headerRow, allCells };
};

// ── Component ─────────────────────────────────────────────────────────────────
const ExportDataloadButtonCS = memo(
  ({
    selectedRows = [],
    fileName = "dataload_phan_bo_cs",
    onExportSuccess,
  }) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = useCallback(async () => {
      if (isExporting || selectedRows.length === 0) return;

      try {
        setIsExporting(true);

        const { headerRow, allCells } = buildAllRows(selectedRows);
        const maxCols = Math.max(
          headerRow.length,
          ...allCells.map((c) => c.length),
        );

        const wb = new ExcelJS.Workbook();
        wb.creator = "SaigonCoop";

        // ─── SHEET 1: DATALOAD ───────────────────────────────────────────
        const ws1 = wb.addWorksheet("Dataload");

        ws1.columns = Array.from({ length: maxCols }, (_, i) => ({
          key: `col${i + 1}`,
          width: 16,
        }));

        // Dùng headerRow làm tên cột của table luôn, không spliceRows nữa
        const paddedHeader = [...headerRow];
        while (paddedHeader.length < maxCols) paddedHeader.push("");

        ws1.addTable({
          name: "TableDataload",
          ref: "A1",
          headerRow: true,
          totalsRow: false,
          style: { theme: "TableStyleMedium2", showRowStripes: true },
          columns: paddedHeader.map((label, i) => ({
            name: label !== "" ? label : `Col${i + 1}`, // tên cột = label header thực
            filterButton: true,
          })),
          rows: allCells.map((cells) => {
            const padded = [...cells];
            while (padded.length < maxCols) padded.push("");
            return padded;
          }),
        });

        // Style header row (row 1)
        const tableHeaderRow = ws1.getRow(1);
        tableHeaderRow.height = 20;
        tableHeaderRow.eachCell((cell) => {
          cell.font = {
            bold: true,
            name: "Times New Roman",
            size: 10,
            color: { argb: "FFFFFF" },
          };
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "20538D" },
          };
          cell.alignment = { vertical: "middle", horizontal: "center" };
        });

        // Style data rows
        allCells.forEach((cells, rowIdx) => {
          const excelRow = ws1.getRow(rowIdx + 2); // row 2 trở đi
          excelRow.height = 18;
          const color = rowIdx % 2 === 0 ? COLOR_EVEN : COLOR_ODD;
          const padded = [...cells];
          while (padded.length < maxCols) padded.push("");
          padded.forEach((val, colIdx) => {
            applyCell(excelRow.getCell(colIdx + 1), val, color);
          });
        });

        // ─── SHEET 2: SD_TF ──────────────────────────────────────────────
        const ws2 = wb.addWorksheet("SD_TF");

        ws2.columns = [
          { key: "ten_phan_bo", width: 30 },
          { key: "sd_tf", width: 15 },
          { key: "mach", width: 15 },
          { key: "sku", width: 15 },
          { key: "gia", width: 18 },
          { key: "ngay_xu_li", width: 20 },
        ];

        ws2.addTable({
          name: "TableSDTF",
          ref: "A1",
          headerRow: true,
          totalsRow: false,
          style: { theme: "TableStyleMedium2", showRowStripes: true },
          columns: [
            { name: "Tên Phân Bổ", filterButton: true },
            { name: "SD_TF", filterButton: true },
            { name: "Mã CH", filterButton: true },
            { name: "SKU", filterButton: true },
            { name: "Giá", filterButton: true },
            { name: "Ngày xử lý", filterButton: true },
          ],
          rows: selectedRows.map((row) => [
            row.ten_phan_bo,
            "",
            row.mach,
            row.sku,
            row.gia ?? "",
            "",
          ]),
        });

        const sdtfHeader = ws2.getRow(1);
        sdtfHeader.height = 25;
        sdtfHeader.eachCell((cell) => {
          cell.style = SDTF_HEADER_STYLE;
        });

        selectedRows.forEach((_, idx) => {
          const dataRow = ws2.getRow(idx + 2);
          dataRow.height = 20;
          dataRow.eachCell({ includeEmpty: true }, (cell) => {
            cell.font = SDTF_DATA_FONT;
            cell.alignment = { vertical: "middle", horizontal: "left" };
          });
        });

        // ─── Xuất file ───────────────────────────────────────────────────
        const buffer = await wb.xlsx.writeBuffer();
        const now = new Date();
        const dateStr = `${now.getDate().toString().padStart(2, "0")}${(now.getMonth() + 1).toString().padStart(2, "0")}${now.getFullYear()}`;
        saveAs(
          new Blob([buffer], { type: "application/octet-stream" }),
          `${fileName}_${dateStr}.xlsx`,
        );

        const ids = selectedRows.map((r) => r._id);
        await phanBoCSService.updateManyPhanBoCS(ids, {
          trang_thai: "dang_xu_li",
          ngay_xu_li: new Date(),
        });

        if (onExportSuccess) onExportSuccess();
      } catch (error) {
        console.error(error);
        alert("Lỗi khi tạo file Excel!");
      } finally {
        setIsExporting(false);
      }
    }, [selectedRows, fileName, onExportSuccess, isExporting]);

    if (selectedRows.length === 0) return null;

    return (
      <button
        onClick={handleExport}
        disabled={isExporting}
        className="h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 px-4 text-white font-medium text-sm transition-all whitespace-nowrap flex items-center gap-2 shadow-sm disabled:bg-slate-400"
      >
        {isExporting ? (
          <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="16" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        )}
        {isExporting
          ? "Đang xử lý..."
          : `Xuất Dataload (${selectedRows.length})`}
      </button>
    );
  },
);

ExportDataloadButtonCS.displayName = "ExportDataloadButtonCS";
export default ExportDataloadButtonCS;
