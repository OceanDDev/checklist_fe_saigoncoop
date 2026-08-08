/* eslint-disable react/prop-types */
// components/tonkho/export.jsx
import { useState, useCallback } from "react";
import { FileDown, Loader2 } from "lucide-react";
import ExcelJS from "exceljs";
import dayjs from "dayjs";
import { khuyenMaiService } from "@/services/khuyenmai.service";

const STATUS_COLOR = {
  "Khớp": "FF16A34A",       // green
  "Không Khớp": "FFDC2626", // red
  "Không có DATA": "FF64748B", // slate
};

const formatDateTime = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return dayjs(date).format("DD/MM/YYYY HH:mm");
};

/**
 * Nút xuất Excel toàn bộ dữ liệu tồn kho.
 * - Nếu `filters` đang có giá trị (đang lọc) -> chỉ xuất dữ liệu khớp filter.
 * - Nếu không lọc gì -> xuất toàn bộ dữ liệu.
 * Component tự gọi API lấy hết dữ liệu (không phân trang) trước khi build file.
 */
const ExportTonKho = ({ filters = {} }) => {
  const [exporting, setExporting] = useState(false);

  const hasActiveFilter = Object.values(filters).some((v) => !!v);

  const handleExport = useCallback(async () => {
    setExporting(true);
    try {
      // Lấy hết dữ liệu khớp filter hiện tại (không phân trang thật sự,
      // set limit lớn để BE trả về toàn bộ).
      const res = await khuyenMaiService.getAllKhuyenMai({
        ...filters,
        page: 1,
        limit: 1000000,
      });
      const data = res?.data || res?.items || [];

      if (data.length === 0) {
        alert("Không có dữ liệu để xuất.");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Hệ thống tồn kho";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Tồn kho", {
        views: [{ state: "frozen", ySplit: 1 }], // freeze header row
      });

      sheet.columns = [
        { header: "SKU", key: "sku", width: 16 },
        { header: "Tên sản phẩm", key: "name", width: 40 },
        { header: "Vị trí", key: "slot", width: 14 },
        { header: "LPN", key: "lpn", width: 16 },
        { header: "On Hand", key: "onHand", width: 12, style: { numFmt: "#,##0" } },
        { header: "Available", key: "available", width: 12, style: { numFmt: "#,##0" } },
        { header: "Allocate", key: "allocate", width: 12, style: { numFmt: "#,##0" } },
        { header: "On Hand MMS", key: "mms", width: 14, style: { numFmt: "#,##0" } },
        { header: "Trạng thái", key: "trangThai", width: 16 },
        { header: "TG import", key: "importedAt", width: 18 },
      ];

      // Style header
      const headerRow = sheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4338CA" }, // indigo-700
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });

      data.forEach((item) => {
        const row = sheet.addRow({
          sku: item.sku,
          name: item.name,
          slot: item.slot || "",
          lpn: item.lpn || "",
          onHand: Number(item.luong_onhand) || 0,
          available: Number(item.luong_available) || 0,
          allocate: Number(item.luong_allocate) || 0,
          mms: item.luong_mms !== "" ? Number(item.luong_mms) || 0 : "",
          trangThai: item.trangThai,
          importedAt: formatDateTime(item.thoi_gian_impport),
        });

        const trangThaiCell = row.getCell("trangThai");
        trangThaiCell.font = {
          bold: true,
          color: { argb: STATUS_COLOR[item.trangThai] || "FF64748B" },
        };

        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        });
      });

      sheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: sheet.columns.length },
      };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const fileName = `TonKho_${hasActiveFilter ? "loc_" : ""}${dayjs().format(
        "YYYYMMDD_HHmm",
      )}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Lỗi khi xuất Excel tồn kho:", err);
      alert("Xuất Excel thất bại. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  }, [filters, hasActiveFilter]);

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting}
      title={
        hasActiveFilter
          ? "Xuất Excel dữ liệu đang lọc"
          : "Xuất Excel toàn bộ dữ liệu"
      }
      className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:from-emerald-700 hover:to-teal-700 hover:shadow-md active:scale-95 disabled:opacity-50"
    >
      {exporting ? (
        <Loader2 size={15} className="animate-spin" />
      ) : (
        <FileDown size={15} />
      )}
      {exporting ? "Đang xuất..." : hasActiveFilter ? "Xuất Excel (đang lọc)" : "Xuất Excel"}
    </button>
  );
};

export default ExportTonKho;