/* eslint-disable react/prop-types */
import { Button, message } from "antd";
import { FileExcelOutlined } from "@ant-design/icons";
import ExcelJS from "exceljs";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

const ExportExcelPhuXe = ({
  filteredData,
  fileName = "phuxe_export",
  isRole24,
}) => {
  const handleExportExcel = async () => {
    try {
      if (!filteredData || filteredData.length === 0) {
        message.warning("Không có dữ liệu để xuất!");
        return;
      }

      const dataToExport = filteredData
        .filter((item) => item.thoi_gian_di)
        .map((item, index) => {
          // ✅ Thêm ngày vào thời gian đi
          const thoiGianDi = dayjs(item.thoi_gian_di)
            .tz(VN_TIMEZONE)
            .format("DD/MM/YYYY HH:mm:ss");

          // ✅ Thêm ngày vào thời gian xong chuyến
          const thoiGianXongChuyen = item.thoi_gian_xong_chuyen
            ? dayjs(item.thoi_gian_xong_chuyen)
                .tz(VN_TIMEZONE)
                .format("DD/MM/YYYY HH:mm:ss")
            : "";

          // ✅ Ngày import từ createdAt
          const ngayImport = item.createdAt
            ? dayjs(item.createdAt)
                .tz(VN_TIMEZONE)
                .format("DD/MM/YYYY HH:mm:ss")
            : "";

          return {
            stt: index + 1,
            hoTen: item.dieu_van_xac_nhan || "",
            dichVu: item.dich_vu || "",
            bienSoXe: item.bien_so_xe || "",
            thoiGianDi: thoiGianDi,
            maCuaHang: item.ma_cua_hang || "",
            diaDiemDen: item.ten_cua_hang || "",
            thoiGianXongChuyen: thoiGianXongChuyen,
            ghiChu: item.ghi_chu || "",
            ngayImport: ngayImport,
          };
        });

      if (dataToExport.length === 0) {
        message.warning(
          "Không có dữ liệu hợp lệ (thiếu thời gian đi) để xuất!",
        );
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Danh Sách Phụ Xe");

      worksheet.columns = [
        { header: "STT", key: "stt", width: 8 },
        { header: "Họ Tên", key: "hoTen", width: 25 },
        { header: "Dịch Vụ", key: "dichVu", width: 15 },
        { header: "Biển Số Xe", key: "bienSoXe", width: 18 },
        { header: "Thời Gian Đi", key: "thoiGianDi", width: 25 },
        { header: "Mã Cửa Hàng", key: "maCuaHang", width: 15 },
        { header: "Địa Điểm Đến", key: "diaDiemDen", width: 35 },
        {
          header: "Thời Gian Xong Chuyến",
          key: "thoiGianXongChuyen",
          width: 30,
        },
        { header: "Ghi Chú", key: "ghiChu", width: 30 },
        { header: "Ngày Import", key: "ngayImport", width: 25 },
      ];

      // Style cho header
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

      // Thêm dữ liệu
      dataToExport.forEach((data) => {
        const row = worksheet.addRow(data);
        row.eachCell((cell, colNumber) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };

          // Căn giữa: STT (1), Biển Số Xe (4), Thời Gian Đi (5), Thời Gian Xong Chuyến (8)
          if ([1, 4, 5, 8].includes(colNumber)) {
            cell.alignment = { vertical: "middle", horizontal: "center" };
          } else {
            cell.alignment = { vertical: "middle", horizontal: "left" };
          }
        });
      });

      worksheet.views = [{ state: "frozen", xSplit: 0, ySplit: 1 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}_${dayjs()
        .tz(VN_TIMEZONE)
        .format("YYYYMMDD_HHmmss")}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);

      message.success(`Đã xuất ${dataToExport.length} bản ghi thành công!`);
    } catch (error) {
      console.error("Lỗi khi xuất Excel:", error);
      message.error("Không thể xuất file Excel!");
    }
  };

  if (isRole24) return null;

  return (
    <Button
      type="primary"
      icon={<FileExcelOutlined />}
      onClick={handleExportExcel}
      style={{ backgroundColor: "#52c41a", borderColor: "#52c41a" }}
    >
      Xuất Excel
    </Button>
  );
};

export default ExportExcelPhuXe;