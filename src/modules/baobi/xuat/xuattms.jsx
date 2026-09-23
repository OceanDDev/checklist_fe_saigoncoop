/* eslint-disable react/prop-types */
// components/baobi/ExportExcelTmsButton.jsx
import { useState } from "react";
import ExcelJS from "exceljs";
import dayjs from "dayjs";
import { Loader2, FileSpreadsheet } from "lucide-react";
import { baoBiService } from "@/services/baobi.service";

const KHO_MAC_DINH = "810";

// Tách "5 Kiện - V15" hoặc "5 Kiện" -> "5" (chỉ lấy phần số kiện)
const parseSoKien = (ghiChu) => {
  if (!ghiChu) return "";
  const match = ghiChu.match(/^(\d+)\s*Kiện/);
  return match ? match[1] : "";
};

const ExportExcelTmsButton = ({
  buildQueryParams,
  fileNamePrefix = "tms-xuat-bao-bi",
}) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Lấy toàn bộ dữ liệu khớp filter hiện tại, gom hết các trang
      let allRows = [];
      let currentPage = 1;
      let totalPages = 1;

      do {
        const res = await baoBiService.getAllBaoBi(
          buildQueryParams({ page: currentPage, limit: 500 }),
        );
        allRows = allRows.concat(res?.data || []);
        totalPages = res?.pagination?.totalPages || 1;
        currentPage += 1;
      } while (currentPage <= totalPages);

      if (allRows.length === 0) {
        alert("Không có dữ liệu để xuất trong khoảng ngày đã chọn");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "SC Logistics";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("TMS");

      sheet.columns = [
        { header: "Số hd/bk", key: "so_hd_bk", width: 26 },
        { header: "Số tham khảo", key: "so_tham_khao", width: 16 },
        { header: "Ngày hd/bk", key: "ngay_hd_bk", width: 14 },
        { header: "Số kiện", key: "so_kien", width: 10 },
        { header: "Số Kg", key: "so_kg", width: 10 },
        { header: "Số khối", key: "so_khoi", width: 10 },
        { header: "Siêu thị", key: "sieu_thi", width: 14 },
        { header: "Kho", key: "kho", width: 10 },
      ];

      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true };
      headerRow.alignment = { vertical: "middle", horizontal: "center" };
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE2E8F0" },
        };
        cell.border = {
          top: { style: "thin" },
          bottom: { style: "thin" },
          left: { style: "thin" },
          right: { style: "thin" },
        };
      });

      allRows.forEach((row) => {
        const dataRow = sheet.addRow({
          so_hd_bk: row.so_phieu || "",
          so_tham_khao: "",
          ngay_hd_bk: row.tg_xuat
            ? dayjs(row.tg_xuat).format("DD/MM/YYYY")
            : "",
          so_kien: parseSoKien(row.ghi_chu),
          so_kg: "",
          so_khoi: "",
          sieu_thi: row.ma_ch || "",
          kho: KHO_MAC_DINH,
        });
        dataRow.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFE2E8F0" } },
            bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
            left: { style: "thin", color: { argb: "FFE2E8F0" } },
            right: { style: "thin", color: { argb: "FFE2E8F0" } },
          };
        });
      });

      sheet.autoFilter = { from: "A1", to: "H1" };
      sheet.views = [{ state: "frozen", ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${fileNamePrefix}_${dayjs().format("YYYYMMDD_HHmmss")}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Lỗi khi xuất Excel TMS:", err);
      alert("Xuất Excel TMS thất bại, vui lòng thử lại");
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting}
      title="Xuất Excel TMS theo khoảng ngày đang lọc"
      className="flex items-center gap-1.5 rounded-md border border-indigo-600 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {exporting ? (
        <Loader2 size={16} className="animate-spin" />
      ) : (
        <FileSpreadsheet size={16} />
      )}
      {exporting ? "Đang xuất..." : "Xuất Excel TMS"}
    </button>
  );
};

export default ExportExcelTmsButton;