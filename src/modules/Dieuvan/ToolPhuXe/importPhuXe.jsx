/* eslint-disable react/prop-types */
import { useState } from "react";
import { Button, Upload, message, Modal, Space } from "antd";
import { UploadOutlined, FileExcelOutlined } from "@ant-design/icons";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { phuXeService } from "@/services/dieuvan/phuxe.service";

const ImportPhuXe = ({ onImported }) => {
  const [visible, setVisible] = useState(false);
  const [fileList, setFileList] = useState([]);

  const handleOpen = () => setVisible(true);
  const handleClose = () => {
    setVisible(false);
    setFileList([]);
  };

  // 📤 Convert time cell thành string "HH:MM"
  const timeToString = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return "";

    let value = cell.value;

    // Date object - XỬ LÝ TRƯỚC TIÊN vì cell.text cũng có thể là Date
    if (value instanceof Date) {
      // Lấy giờ và phút từ Date object
      const hours = value.getUTCHours();
      const minutes = value.getUTCMinutes();
      const result = `${hours}:${minutes.toString().padStart(2, "0")}`;
      return result;
    }

    // Nếu có text sẵn và là STRING (không phải Date), dùng luôn
    if (cell.text && typeof cell.text === 'string' && cell.text.includes(":")) {
      return cell.text.trim();
    }

    // Xử lý object (nhưng không phải Date)
    if (value && typeof value === 'object') {
      if (value.result !== undefined) value = value.result;
      if (value.text !== undefined) value = value.text;
      
      // Sau khi extract, check lại Date
      if (value instanceof Date) {
        const hours = value.getUTCHours();
        const minutes = value.getUTCMinutes();
        return `${hours}:${minutes.toString().padStart(2, "0")}`;
      }
    }

    // Number < 1 (Excel time format - fraction of day)
    if (typeof value === "number" && value >= 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}:${minutes.toString().padStart(2, "0")}`;
    }

    // Nếu là string có dấu ":", return luôn
    if (typeof value === "string" && value.includes(":")) {
      return value.trim();
    }

    // Fallback
    console.warn("Unexpected time value:", value);
    return "";
  };

  // 📤 Convert cell sang string, xử lý đúng Time format từ Excel
  const cellToString = (cell) => {
    // Kiểm tra cell rỗng hoặc null
    if (!cell || cell.value === null || cell.value === undefined) return "";

    // Lấy giá trị thực từ cell
    let value = cell.value;

    // Nếu value vẫn là object, thử lấy các property phổ biến
    if (value && typeof value === 'object') {
      // Xử lý richText
      if (value.richText && Array.isArray(value.richText)) {
        return value.richText.map((rt) => rt.text || "").join("");
      }

      // Xử lý formula result
      if (value.result !== undefined && value.result !== null) {
        value = value.result;
      }

      // Xử lý hyperlink
      if (value.text !== undefined) {
        value = value.text;
      }

      // Xử lý Date object
      if (value instanceof Date) {
        const hours = value.getHours().toString().padStart(2, "0");
        const minutes = value.getMinutes().toString().padStart(2, "0");
        return `${hours}:${minutes}`;
      }

      // Nếu vẫn là object và không xử lý được, trả về chuỗi rỗng
      if (typeof value === 'object' && value !== null) {
        console.warn("Unhandled cell object:", value);
        return "";
      }
    }

    // Kiểm tra value null/undefined sau khi xử lý
    if (value === null || value === undefined) return "";

    // Nếu là Date object (trường hợp đã được extract từ object)
    if (value instanceof Date) {
      const hours = value.getHours().toString().padStart(2, "0");
      const minutes = value.getMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }

    // Nếu là Number < 1 => Excel time format (fraction of day)
    if (typeof value === "number" && value > 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60);
      const hours = Math.floor(totalMinutes / 60).toString().padStart(2, "0");
      const minutes = (totalMinutes % 60).toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }

    // Nếu là Number >= 1 => Excel serial date
    if (typeof value === "number" && value >= 1) {
      const date = new Date(Math.round((value - 25569) * 86400 * 1000));
      const hours = date.getUTCHours().toString().padStart(2, "0");
      const minutes = date.getUTCMinutes().toString().padStart(2, "0");
      return `${hours}:${minutes}`;
    }

    // Convert sang string an toàn
    return String(value).trim();
  };

  // 📤 Import Excel
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning("Vui lòng chọn file Excel trước khi import!");
      return;
    }

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await fileList[0].arrayBuffer());
      const worksheet = workbook.worksheets[0];

      const dataToImport = [];
      const skippedRows = []; // Lưu các dòng bị bỏ qua
      let orderIndex = 0; // Bắt đầu từ 0

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // bỏ header

        // Lấy cell objects thay vì values
        const khung_gio_cell = row.getCell(1);
        const ten_cua_hang_cell = row.getCell(2);
        const dich_vu_cell = row.getCell(3);
        const ten_tai_xe_cell = row.getCell(4);
        const bien_so_xe_cell = row.getCell(5);

        // Xử lý khung giờ với hàm riêng
        const khung_gio = timeToString(khung_gio_cell);
        const ten_cua_hang = cellToString(ten_cua_hang_cell);
        const dich_vu = cellToString(dich_vu_cell);
        
        if (!khung_gio && !ten_cua_hang) return; // Skip dòng trống

        // Kiểm tra cột dịch vụ
        if (!dich_vu || dich_vu.trim() === "") {
          skippedRows.push({
            rowNumber: rowNumber,
            khung_gio: khung_gio,
            ten_cua_hang: ten_cua_hang,
          });
          return; // Bỏ qua dòng này, không thêm vào dataToImport
        }

        dataToImport.push({
          khung_gio: khung_gio,
          ten_cua_hang: ten_cua_hang,
          dich_vu: dich_vu,
          ten_tai_xe: cellToString(ten_tai_xe_cell),
          bien_so_xe: cellToString(bien_so_xe_cell),
          import_order: orderIndex++, // Thêm thứ tự import
        });
      });

      // Hiển thị modal thông báo các dòng bị bỏ qua
      if (skippedRows.length > 0) {
        const skippedInfo = skippedRows.map(row => 
          `Dòng ${row.rowNumber}: ${row.khung_gio} - ${row.ten_cua_hang}`
        ).join('\n');
        
        Modal.warning({
          title: `Đã bỏ qua ${skippedRows.length} dòng không có dịch vụ`,
          content: (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <p>Các dòng sau không có dịch vụ và đã bị bỏ qua:</p>
              <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
                {skippedInfo}
              </pre>
            </div>
          ),
          width: 500,
        });
      }

      if (dataToImport.length === 0) {
        message.warning("File Excel không có dòng hợp lệ nào để import!");
        return;
      }

      // Đảo ngược mảng: dòng cuối Excel sẽ lên đầu
      const reversedData = dataToImport.reverse();

      console.log("Data to import (reversed):", reversedData); // Debug

      await phuXeService.addManyPhuXe(reversedData);
      message.success(`Import thành công ${reversedData.length} dòng dữ liệu!`);
      handleClose();
      if (onImported) onImported();
    } catch (error) {
      console.error("Lỗi khi import:", error);
      message.error("Lỗi khi import danh sách phụ xe!");
    }
  };

  // 📄 Xuất file template bằng ExcelJS
  const handleExportTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Template Phụ Xe");

      // 🌈 Tạo tiêu đề cột
      const headers = [
        { header: "Khung giờ", key: "khung_gio", width: 15 },
        { header: "Tên cửa hàng", key: "ten_cua_hang", width: 30 },
        { header: "Dịch vụ", key: "dich_vu", width: 15 },
        { header: "Tên tài xế", key: "ten_tai_xe", width: 20 },
        { header: "Biển số xe", key: "bien_so_xe", width: 15 },
      ];
      worksheet.columns = headers;

      // 🎨 Style cho header
      worksheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle" };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4F81BD" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFCCCCCC" } },
          left: { style: "thin", color: { argb: "FFCCCCCC" } },
          bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
          right: { style: "thin", color: { argb: "FFCCCCCC" } },
        };
      });

      // Thêm các dòng mẫu
      const sampleData = [

      ];

      sampleData.forEach(item => {
        const row = worksheet.addRow({
          khung_gio: item.time / 24, 
          ten_cua_hang: item.store,
          dich_vu: item.service,
          ten_tai_xe: item.driver,
          bien_so_xe: item.plate,
        });
        
        // Format cell khung giờ
        row.getCell(1).numFmt = "h:mm";
      });

      // Format toàn bộ cột Khung giờ
      worksheet.getColumn(1).numFmt = "h:mm";
      worksheet.getColumn(1).alignment = { horizontal: "center" };

      // 📦 Xuất file
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), "Template_PhuXe.xlsx");
      message.success("Đã xuất file Template thành công!");
    } catch (error) {
      console.error("Lỗi khi xuất file:", error);
      message.error("Không thể tạo file template!");
    }
  };

  const uploadProps = {
    beforeUpload: (file) => {
      const isExcel =
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel";
      if (!isExcel) {
        message.error("Chỉ chấp nhận file Excel (.xlsx hoặc .xls)");
        return Upload.LIST_IGNORE;
      }
      setFileList([file]);
      return false;
    },
    onRemove: () => setFileList([]),
    fileList,
  };

  return (
    <>
      <Button type="primary" icon={<UploadOutlined />} onClick={handleOpen}>
        Import
      </Button>

      <Modal
        title="Import danh sách phụ xe"
        open={visible}
        onOk={handleUpload}
        onCancel={handleClose}
        okText="Import"
        cancelText="Hủy"
      >
        <Space direction="vertical" style={{ width: "100%" }}>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />}>Chọn file Excel</Button>
          </Upload>

          <Button
            icon={<FileExcelOutlined />}
            type="default"
            onClick={handleExportTemplate}
          >
            Xuất file Template
          </Button>
        </Space>
      </Modal>
    </>
  );
};

export default ImportPhuXe;