/* eslint-disable react/prop-types */
import { memo, useCallback, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { buildCells, getNgay, groupByStore } from "@/utils/dataload";
import { phanBoService } from "@/services/phieusoan/phanbo.service";

// ── Fonts ──────────────────────────────────────────────────────────────────
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

// ── Helper ─────────────────────────────────────────────────────────────────
const applyCell = (cell, { value, color }) => {
  const cleaned =
    typeof value === "string"
      ? value.replace(/\{\s*(.*?)\s*\}/g, "{$1}")
      : value;
  cell.value = cleaned;
  cell.fill = { type: "pattern", pattern: "solid", fgColor: color };
  cell.font = CELL_FONT;
  cell.alignment = CELL_ALIGNMENT;
};

// ── Component ──────────────────────────────────────────────────────────────
const ExportDataloadButton = memo(
  ({ selectedRows = [], fileName = "dataload_phan_bo", onExportSuccess }) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = useCallback(async () => {
      if (isExporting || selectedRows.length === 0) return;

      try {
        setIsExporting(true);
        const ngay = getNgay();

        const wb = new ExcelJS.Workbook();
        wb.creator = "SaigonCoop";

        // ─── SHEET 1: DATALOAD ───────────────────────────────────────────
        const ws1 = wb.addWorksheet("Dataload");
        const groups = groupByStore(selectedRows);
        const maxCols = groups.reduce(
          (max, g) => Math.max(max, 11 + g.items.length * 6 + 1),
          0,
        );

        ws1.columns = Array.from({ length: maxCols }, (_, i) => ({
          key: `col${i + 1}`,
          width: 16,
        }));

        const allRows = groups.map((group) => buildCells(group, ngay));

        ws1.addTable({
          name: "TableDataload",
          ref: "A1",
          headerRow: true,
          totalsRow: false,
          style: { theme: "TableStyleMedium2", showRowStripes: true },
          columns: Array.from({ length: maxCols }, (_, i) => ({
            name: `Column${i + 1}`,
            filterButton: true,
          })),
          rows: allRows.map((cells) => cells.map((c) => c.value)),
        });

        // Re-apply màu nền + font Times New Roman cho data rows
        allRows.forEach((cells, rowIdx) => {
          const excelRow = ws1.getRow(rowIdx + 2);
          excelRow.height = 16;
          cells.forEach((def, colIdx) => {
            applyCell(excelRow.getCell(colIdx + 1), def);
          });
        });

        // ─── SHEET 2: SD_TF ──────────────────────────────────────────────
        const ws2 = wb.addWorksheet("SD_TF");

        ws2.columns = [
          { key: "ten_phan_bo", width: 30 },
          { key: "sd_tf", width: 15 },
          { key: "mach", width: 15 },
          { key: "sku", width: 15 },
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
            { name: "Ngày xử lý", filterButton: true },
          ],
          rows: selectedRows.map((row) => [
            row.ten_phan_bo,
            "",
            row.mach,
            row.sku,
            "",
          ]),
        });

        // Re-apply header style
        const headerRow = ws2.getRow(1);
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
          cell.style = SDTF_HEADER_STYLE;
        });

        // Re-apply font Times New Roman cho data rows sheet 2
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
        saveAs(
          new Blob([buffer], { type: "application/octet-stream" }),
          `${fileName}_${getNgay()}.xlsx`,
        );

        // Cập nhật trạng thái
        const ids = selectedRows.map((r) => r._id);
        await phanBoService.updateManyPhanBo(ids, {
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

ExportDataloadButton.displayName = "ExportDataloadButton";
export default ExportDataloadButton;
