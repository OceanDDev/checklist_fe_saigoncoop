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

      // ✅ Sửa lại điều kiện: Chỉ cần có thoi_gian_di là cho phép xuất
      const dataToExport = filteredData
        .filter((item) => item.thoi_gian_di)
        .map((item, index) => {
          // Format thời gian đi
          const thoiGianDi = dayjs(item.thoi_gian_di)
            .tz(VN_TIMEZONE)
            .format("HH:mm:ss");

          // Format thời gian xong (nếu có)
          const thoiGianXongChuyen = item.thoi_gian_xong_chuyen
            ? dayjs(item.thoi_gian_xong_chuyen)
                .tz(VN_TIMEZONE)
                .format("HH:mm:ss")
            : "";

          // Ưu tiên lấy ngày từ thoi_gian_xong_chuyen, nếu không có thì lấy từ thoi_gian_di
          const ngayHienTai = item.thoi_gian_xong_chuyen || item.thoi_gian_di;
          const ngay = dayjs(ngayHienTai).tz(VN_TIMEZONE).format("DD/MM/YYYY");

          return {
            stt: index + 1,
            hoTen: item.dieu_van_xac_nhan || "",
            dichVu: item.dich_vu || "",
            thoiGianDi: thoiGianDi,
            maCuaHang: item.ma_cua_hang || "",
            diaDiemDen: item.ten_cua_hang || "",
            thoiGianXongChuyen: thoiGianXongChuyen,
            ghiChu: item.ghi_chu || "",
            ngay: ngay,
          };
        });

      if (dataToExport.length === 0) {
        message.warning(
          "Không có dữ liệu hợp lệ (thiếu thời gian đi) để xuất!"
        );
        return;
      }

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Danh Sách Phụ Xe");

      worksheet.columns = [
        { header: "STT", key: "stt", width: 8 },
        { header: "Họ Tên", key: "hoTen", width: 25 },
        { header: "Dịch Vụ", key: "dichVu", width: 15 }, // ✅ THÊM DÒNG NÀY

        { header: "Thời Gian Đi", key: "thoiGianDi", width: 18 },
        { header: "Mã Cửa Hàng", key: "maCuaHang", width: 15 },
        { header: "Địa Điểm Đến", key: "diaDiemDen", width: 35 },
        {
          header: "Thời Gian Xong Chuyến",
          key: "thoiGianXongChuyen",
          width: 25,
        },
        { header: "Ghi Chú", key: "ghiChu", width: 30 }, // ✅ THÊM DÒNG NÀY
        { header: "Ngày", key: "ngay", width: 15 },
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

          if ([1, 4, 7].includes(colNumber)) {
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
