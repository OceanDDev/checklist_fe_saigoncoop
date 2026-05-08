/* eslint-disable react/prop-types */
import { memo, useCallback, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { buildCells, getNgay, groupByStore } from "@/utils/dataload";
import { phanBoService } from "@/services/phieusoan/phanbo.service";

// Style cho Dataload (Sheet 1)
const CELL_FONT = { size: 10, name: "Courier New" };
const CELL_ALIGNMENT = {
  vertical: "middle",
  horizontal: "left",
  wrapText: false,
};

// Style cho Header SD_TF (Sheet 2) - Màu xanh đậm chữ trắng như hình bạn gửi
const SDTF_HEADER_STYLE = {
  font: { bold: true, color: { argb: "FFFFFF" }, size: 11, name: "Arial" },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "20538D" } }, // Màu xanh lính thủy
  alignment: { vertical: "middle", horizontal: "center" },
  border: {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  },
};

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

        // ─── SHEET 1: DATALOAD (Format ngang hệ thống) ───
        const ws1 = wb.addWorksheet("Dataload");
        const groups = groupByStore(selectedRows);
        const maxCols = groups.reduce(
          (max, g) => Math.max(max, 11 + g.items.length * 6 + 1),
          0,
        );
        ws1.columns = Array.from({ length: maxCols }, () => ({ width: 16 }));

        for (const group of groups) {
          const cells = buildCells(group, ngay);
          const excelRow = ws1.addRow(cells.map((c) => c.value));
          excelRow.height = 16;
          cells.forEach((def, i) => applyCell(excelRow.getCell(i + 1), def));
        }

        // ─── SHEET 2: SD_TF (Danh sách nhập liệu) ───
        const ws2 = wb.addWorksheet("SD_TF");

        // Định nghĩa cột
        ws2.columns = [
          { header: "Tên Phân Bổ", key: "ten_phan_bo", width: 30 },
          { header: "SD_TF", key: "sd_tf", width: 15 },
          { header: "Mã CH", key: "mach", width: 15 },
          { header: "SKU", key: "sku", width: 15 },
          { header: "Ngày xử lý", key: "ngay_xu_li", width: 20 },
        ];

        // Apply style cho Header Sheet 2
        const headerRow = ws2.getRow(1);
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
          cell.style = SDTF_HEADER_STYLE;
        });

        // Thêm dữ liệu (Bỏ trống SD_TF và Ngày xử lý theo yêu cầu)
        selectedRows.forEach((row) => {
          const newRow = ws2.addRow({
            ten_phan_bo: row.ten_phan_bo,
            sd_tf: "", // Để trống cho user nhập
            mach: row.mach,
            sku: row.sku,
            ngay_xu_li: "", // Để trống cho user nhập
          });

          // Style nhẹ cho data row
          newRow.eachCell((cell) => {
            cell.font = { name: "Arial", size: 10 };
            cell.border = {
              top: { style: "thin", color: { argb: "E2E8F0" } },
              left: { style: "thin", color: { argb: "E2E8F0" } },
              bottom: { style: "thin", color: { argb: "E2E8F0" } },
              right: { style: "thin", color: { argb: "E2E8F0" } },
            };
          });
        });

        // Xuất file
        const buffer = await wb.xlsx.writeBuffer();
        saveAs(
          new Blob([buffer], { type: "application/octet-stream" }),
          `${fileName}_${getNgay()}.xlsx`,
        );

        // Cập nhật Trạng thái sang "Đang xử lý"
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
