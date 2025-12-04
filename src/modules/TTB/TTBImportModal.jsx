/* eslint-disable react/prop-types */
import { useState } from "react";
import { Modal, Button, Upload, message, Space, Table } from "antd";
import { UploadOutlined, DownloadOutlined } from "@ant-design/icons";
import ExcelJS from "exceljs";
import { ttbService } from "@/services/ttb.service";

const TTBImportModal = ({ visible, onClose, onImportSuccess }) => {
  const [fileList, setFileList] = useState([]);
  const [previewData, setPreviewData] = useState([]);
  const [uploading, setUploading] = useState(false);

  // Tạo template Excel với ExcelJS
  const downloadTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Template");

      // Định nghĩa các cột
      worksheet.columns = [
        { header: "NGÀY ĐI", key: "ngay_di", width: 15 },
        { header: "NGÀY VỀ", key: "ngay_ve", width: 15 },
        { header: "SỐ BB", key: "so_bb", width: 15 },
        { header: "MÃ CỬA HÀNG", key: "ma_cua_hang", width: 15 },
        { header: "TÀI XẾ", key: "tai_xe", width: 25 },
        { header: "BIỂN SỐ XE", key: "bien_so_xe", width: 15 },
      ];

      // Thêm dữ liệu mẫu
      worksheet.addRow({
        ngay_di: "01/01/2024",
        ngay_ve: "02/01/2024",
        so_bb: "BB001",
        ma_cua_hang: "CH001",
        tai_xe: "Nguyễn Văn A",
        bien_so_xe: "59A-12345",
      });

      // Style cho header
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD3D3D3" },
      };
      worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

      // Border cho tất cả cells
      worksheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" },
          };
        });
      });

      // Xuất file
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "TTB_Import_Template.xlsx";
      link.click();
      window.URL.revokeObjectURL(url);

      message.success("Đã tải xuống template thành công");
    } catch (error) {
      message.error("Lỗi khi tạo template");
      console.error(error);
    }
  };

  // Xử lý file upload
  const handleFileChange = (info) => {
    let newFileList = [...info.fileList];
    newFileList = newFileList.slice(-1); // Chỉ giữ file mới nhất
    setFileList(newFileList);

    // Đọc file ngay khi user chọn
    if (newFileList.length > 0) {
      const file = newFileList[0].originFileObj || newFileList[0];
      readExcelFile(file);
    } else {
      setPreviewData([]);
    }
  };

  // Đọc file Excel với ExcelJS
  const readExcelFile = async (file) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(arrayBuffer);

      const worksheet = workbook.worksheets[0];
      const jsonData = [];

      // Bỏ qua dòng header (row 1)
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) {
          const rowData = {
            ngay_di: row.getCell(1).value,
            ngay_ve: row.getCell(2).value,
            so_bb: row.getCell(3).value,
            ma_cua_hang: row.getCell(4).value,
            tai_xe: row.getCell(5).value,
            bien_so_xe: row.getCell(6).value,
          };

          // Chỉ thêm row nếu có ít nhất 1 giá trị
          if (Object.values(rowData).some(val => val !== null && val !== undefined && val !== "")) {
            jsonData.push(rowData);
          }
        }
      });

      if (jsonData.length === 0) {
        message.error("File không có dữ liệu");
        return;
      }

      // Format dữ liệu để hiển thị
      const parsedData = jsonData.map((row, index) => ({
        stt: index + 1,
        ngay_di: formatDate(row.ngay_di),
        ngay_ve: formatDate(row.ngay_ve),
        so_bb: row.so_bb?.toString() || "",
        ma_cua_hang: row.ma_cua_hang?.toString() || "",
        tai_xe: row.tai_xe?.toString() || "",
        bien_so_xe: row.bien_so_xe?.toString() || "",
      }));

      setPreviewData(parsedData);
      message.success(`Đọc thành công ${parsedData.length} bản ghi`);
    } catch (error) {
      message.error("Lỗi khi đọc file Excel");
      console.error(error);
    }
  };

  // Helper function để format date
  const formatDate = (dateValue) => {
    if (!dateValue) return "";
    
    // Nếu là Excel date serial number
    if (typeof dateValue === "number") {
      const date = new Date((dateValue - 25569) * 86400 * 1000);
      return date.toISOString().split("T")[0];
    }
    
    // Nếu là Date object
    if (dateValue instanceof Date) {
      return dateValue.toISOString().split("T")[0];
    }
    
    // Nếu là string format DD/MM/YYYY
    if (typeof dateValue === "string" && dateValue.includes("/")) {
      const parts = dateValue.split("/");
      if (parts.length === 3) {
        return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
      }
    }
    
    return dateValue.toString();
  };

  // Xử lý import
  const handleImport = async () => {
    if (previewData.length === 0) {
      message.warning("Vui lòng chọn file để import");
      return;
    }

    setUploading(true);
    try {
      // Chuyển đổi dữ liệu preview sang format đúng cho API
      const ttbList = previewData.map((item) => ({
        so_bb: item.so_bb,
        ma_cua_hang: item.ma_cua_hang,
        tai_xe: item.tai_xe,
        bien_so_xe: item.bien_so_xe,
        day: {
          ngay_di: item.ngay_di,
          ngay_ve: item.ngay_ve,
        },
        ttb: [],
        ghi_chu: "",
      }));

      // Gọi API addManyTtb
      const response = await ttbService.addManyTtb(ttbList);

      if (response?.success) {
        message.success(`Import thành công ${ttbList.length} bản ghi`);
        onImportSuccess();
        handleClose();
      } else {
        message.error(response?.message || "Import thất bại");
      }
    } catch (error) {
      message.error("Import thất bại");
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  // Đóng modal và reset
  const handleClose = () => {
    setFileList([]);
    setPreviewData([]);
    onClose();
  };

  const previewColumns = [
    { title: "STT", dataIndex: "stt", width: 60 },
    { title: "Ngày đi", dataIndex: "ngay_di", width: 120 },
    { title: "Ngày về", dataIndex: "ngay_ve", width: 120 },
    { title: "Số BB", dataIndex: "so_bb", width: 120 },
    { title: "Mã CH", dataIndex: "ma_cua_hang", width: 120 },
    { title: "Tài xế", dataIndex: "tai_xe", width: 150 },
    { title: "Biển số xe", dataIndex: "bien_so_xe", width: 120 },
  ];

  return (
    <Modal
      title="Import dữ liệu TTB"
      open={visible}
      onCancel={handleClose}
      width={1000}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Hủy
        </Button>,
        <Button
          key="import"
          type="primary"
          loading={uploading}
          onClick={handleImport}
          disabled={previewData.length === 0}
        >
          Import
        </Button>,
      ]}
    >
      <Space direction="vertical" style={{ width: "100%" }} size="large">
        {/* Download Template */}
        <div>
          <Button
            icon={<DownloadOutlined />}
            onClick={downloadTemplate}
            type="dashed"
            block
          >
            Tải xuống Template Excel
          </Button>
          <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
            Tải xuống file mẫu, điền thông tin và upload lại để import hàng loạt
          </div>
        </div>

        {/* Upload File */}
        <div>
          <Upload
            fileList={fileList}
            onChange={handleFileChange}
            beforeUpload={() => false}
            accept=".xlsx,.xls"
            maxCount={1}
          >
            <Button icon={<UploadOutlined />} block>
              Chọn file Excel để import
            </Button>
          </Upload>
          <div style={{ marginTop: 8, color: "#666", fontSize: 12 }}>
            Chỉ hỗ trợ file .xlsx hoặc .xls
          </div>
        </div>

        {/* Preview Data */}
        {previewData.length > 0 && (
          <div>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>
              Xem trước dữ liệu ({previewData.length} bản ghi)
            </div>
            <Table
              columns={previewColumns}
              dataSource={previewData}
              rowKey="stt"
              pagination={{ pageSize: 5 }}
              scroll={{ x: 900 }}
              size="small"
            />
          </div>
        )}
      </Space>
    </Modal>
  );
};

export default TTBImportModal;