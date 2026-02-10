/* eslint-disable react/prop-types */
import { useState } from "react";
import ExcelJS from "exceljs";

const ExportExcelButton = ({ selectedPhieus, selectedCount }) => {
  const [exporting, setExporting] = useState(false);

  // ✅ HÀM FORMAT NGÀY GIỜ
  const formatDate = (dateValue) => {
    if (!dateValue) return "";
    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) return "";
      return new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return "";
    }
  };

  const handleExportExcel = async () => {
    if (!selectedPhieus || selectedPhieus.length === 0) {
      alert("Vui lòng chọn ít nhất 1 phiếu để xuất!");
      return;
    }

    setExporting(true);

    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Danh sách phiếu lẻ");

      // ✅ Định nghĩa các cột (THÊM ngay_in_phieu)
      worksheet.columns = [
        { header: "STT", key: "stt", width: 8 },
        { header: "Số Document", key: "so_document", width: 15 },
        { header: "Số SD/TF", key: "sd_tf", width: 15 },
        { header: "Mã Cửa Hàng", key: "mach", width: 15 },
        { header: "Tên Cửa Hàng", key: "tench", width: 30 },
        { header: "Quận", key: "quan", width: 15 },
        { header: "Chuyến", key: "chuyen", width: 12 },
        { header: "Tổng Kiện", key: "tong_kien", width: 12 },
        { header: "Tổng Khối Lượng (kg)", key: "tong_khoi_luong", width: 18 },
        { header: "Số Lần In", key: "so_lan_in_phieu", width: 12 }, // ✅ THÊM
        { header: "Ngày In Phiếu", key: "ngay_in_phieu", width: 20 }, // ✅ THÊM
        { header: "Ghi Chú Phiếu", key: "ghi_chu_phieu", width: 40 },
      ];

      // ✅ Style cho header
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });

      // ✅ Thêm dữ liệu
      selectedPhieus.forEach((phieu, index) => {
        const row = worksheet.addRow({
          stt: index + 1,
          so_document: phieu.so_document || "",
          sd_tf: phieu.sd_tf || "",
          mach: phieu.mach || "",
          tench: phieu.tench || "",
          quan: phieu.quan || "",
          chuyen: phieu.chuyen || "",
          tong_kien: phieu.tong_kien || 0,
          tong_khoi_luong: phieu.tong_khoi_luong || 0,
          so_lan_in_phieu: phieu.so_lan_in_phieu || 0, // ✅ THÊM
          ngay_in_phieu: formatDate(phieu.ngay_in_phieu), // ✅ THÊM (format ngày)
          ghi_chu_phieu: phieu.ghi_chu_phieu || "",
        });

        // ✅ Style cho data rows
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFD0D0D0" } },
            left: { style: "thin", color: { argb: "FFD0D0D0" } },
            bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
            right: { style: "thin", color: { argb: "FFD0D0D0" } },
          };
          cell.alignment = { vertical: "middle" };

          // ✅ Center align cho STT, số lượng, số lần in (CẬP NHẬT)
          if ([1, 8, 9, 10].includes(colNumber)) {
            cell.alignment = { ...cell.alignment, horizontal: "center" };
          }
        });

        // ✅ Highlight số kiện và khối lượng
        row.getCell("tong_kien").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0F8FF" }, // Light blue
        };
        row.getCell("tong_khoi_luong").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF0F8FF" }, // Light blue
        };

        // ✅ Highlight số lần in (màu vàng nhạt)
        row.getCell("so_lan_in_phieu").fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFF4E6" }, // Light orange
        };
      });

      // ✅ Thêm tổng cộng ở cuối
      const summaryRow = worksheet.addRow({
        stt: "",
        so_document: "",
        sd_tf: "",
        mach: "",
        tench: "",
        quan: "",
        chuyen: "TỔNG CỘNG:",
        tong_kien: selectedPhieus.reduce(
          (sum, p) => sum + (p.tong_kien || 0),
          0,
        ),
        tong_khoi_luong: selectedPhieus.reduce(
          (sum, p) => sum + (p.tong_khoi_luong || 0),
          0,
        ),
        so_lan_in_phieu: "", // ✅ THÊM (để trống)
        ngay_in_phieu: "", // ✅ THÊM (để trống)
        ghi_chu_phieu: "",
      });

      summaryRow.eachCell((cell) => {
        cell.font = { bold: true, size: 11 };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFFFEB3B" }, // Yellow
        };
        cell.border = {
          top: { style: "medium" },
          left: { style: "thin" },
          bottom: { style: "medium" },
          right: { style: "thin" },
        };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      });

      // ✅ Freeze header row
      worksheet.views = [{ state: "frozen", ySplit: 1 }];

      // ✅ Tạo file và download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Danh_Sach_Phieu_Le_${new Date().getTime()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log(`✅ Xuất thành công ${selectedPhieus.length} phiếu!`);
    } catch (error) {
      console.error("❌ Lỗi khi xuất Excel:", error);
      alert("Có lỗi xảy ra khi xuất Excel!");
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExportExcel}
      disabled={exporting || selectedCount === 0}
      className="h-10 rounded-xl bg-gradient-to-r from-green-600 to-teal-600 px-4 text-white hover:from-green-700 hover:to-teal-700 whitespace-nowrap font-medium flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      title="Xuất Excel"
    >
      <svg
        className="w-5 h-5"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      {exporting ? "Đang xuất..." : `Xuất Excel (${selectedCount})`}
    </button>
  );
};

export default ExportExcelButton;
