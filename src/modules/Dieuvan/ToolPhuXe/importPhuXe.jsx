/* eslint-disable react/prop-types */
import { useState } from "react";
import { Button, Upload, message, Modal, Space, Table } from "antd";
import {
  UploadOutlined,
  FileExcelOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { phuXeService } from "@/services/dieuvan/phuxe.service";

const ImportPhuXe = ({ onImported, isRole24 }) => {
  const [visible, setVisible] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [invalidStoresModal, setInvalidStoresModal] = useState({
    visible: false,
    data: [],
  });

  const handleOpen = () => setVisible(true);
  const handleClose = () => {
    setVisible(false);
    setFileList([]);
  };

  // 📤 Convert cell thành string thuần túy (cho mã cửa hàng, text fields)
  const cellToPlainString = (cell) => {
    if (!cell) return "";

    if (cell.value === null || cell.value === undefined) return "";

    let value = cell.value;

    // Xử lý rich text
    if (value && typeof value === "object") {
      if (value.richText && Array.isArray(value.richText)) {
        return value.richText.map((rt) => rt.text || "").join("");
      }

      // Unwrap formula results
      if (value.result !== undefined && value.result !== null) {
        value = value.result;
      }

      if (value.text !== undefined) {
        value = value.text;
      }

      // Nếu vẫn là object sau khi unwrap
      if (typeof value === "object" && value !== null) {
        console.warn("Unhandled cell object:", value);
        return "";
      }
    }

    if (value === null || value === undefined) return "";

    // ✅ Convert trực tiếp thành string - KHÔNG xử lý Date hay time format
    // Điều này đảm bảo:
    // - Số 0, 1234, 5678 -> "0", "1234", "5678"
    // - Text "CH010", "ABC" -> "CH010", "ABC"
    // - Ngay cả "00:00" cũng giữ nguyên là "00:00"
    return String(value).trim();
  };

  // 📤 Convert time cell thành string "HH:MM" (chỉ dùng cho cột Khung giờ)
  const timeToString = (cell) => {
    if (!cell || cell.value === null || cell.value === undefined) return "";

    let value = cell.value;

    // Xử lý Date object
    if (value instanceof Date) {
      const hours = value.getUTCHours();
      const minutes = value.getUTCMinutes();
      return `${hours}:${minutes.toString().padStart(2, "0")}`;
    }

    // Ưu tiên lấy text hiển thị nếu có dạng time
    if (cell.text && typeof cell.text === "string" && cell.text.includes(":")) {
      return cell.text.trim();
    }

    // Unwrap object
    if (value && typeof value === "object") {
      if (value.result !== undefined) value = value.result;
      if (value.text !== undefined) value = value.text;

      if (value instanceof Date) {
        const hours = value.getUTCHours();
        const minutes = value.getUTCMinutes();
        return `${hours}:${minutes.toString().padStart(2, "0")}`;
      }
    }

    // Số thập phân 0-1 (Excel time format)
    if (typeof value === "number" && value >= 0 && value < 1) {
      const totalMinutes = Math.round(value * 24 * 60);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}:${minutes.toString().padStart(2, "0")}`;
    }

    // String có dấu ":"
    if (typeof value === "string" && value.includes(":")) {
      return value.trim();
    }

    console.warn("Unexpected time value:", value);
    return "";
  };

  // 🆕 Hàm tách chuỗi có dấu "+" thành nhiều giá trị
  const splitByPlus = (value) => {
    if (!value || typeof value !== "string") return [value];

    return value
      .split("+")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  };

  // 📤 Import Excel
  const handleUpload = async () => {
    if (fileList.length === 0) {
      message.warning("Vui lòng chọn file Excel trước khi import!");
      return;
    }

    try {
      message.loading({ content: "Đang xử lý file Excel...", key: "import" });

      // ✅ Lấy danh sách mã cửa hàng hợp lệ từ CHBX
      const validStores = await phuXeService.getAllChbx();
      if (!validStores || !Array.isArray(validStores)) {
        message.error({
          content: "Không thể tải danh sách cửa hàng!",
          key: "import",
        });
        return;
      }

      const validStoreCodesSet = new Set(
        validStores.map((store) => store.ma_cua_hang)
      );

      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await fileList[0].arrayBuffer());
      const worksheet = workbook.worksheets[0];

      const dataToImport = [];
      const skippedRows = [];
      const invalidStores = [];
      let orderIndex = 0;

      // ✅ Đọc từng row
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Bỏ header

        const khung_gio_cell = row.getCell(1);
        const ma_cua_hang_cell = row.getCell(2);
        const dich_vu_cell = row.getCell(3);
        const ten_tai_xe_cell = row.getCell(4);
        const bien_so_xe_cell = row.getCell(5);

        const khung_gio = timeToString(khung_gio_cell);
        const ma_cua_hang_raw = cellToPlainString(ma_cua_hang_cell);
        const dich_vu = cellToPlainString(dich_vu_cell);
        const ten_tai_xe = cellToPlainString(ten_tai_xe_cell);
        const bien_so_xe = cellToPlainString(bien_so_xe_cell);

        if (!khung_gio && !ma_cua_hang_raw) return;

        if (!dich_vu || dich_vu.trim() === "") {
          skippedRows.push({
            rowNumber: rowNumber,
            khung_gio: khung_gio,
            ma_cua_hang: ma_cua_hang_raw,
          });
          return;
        }

        // 🆕 Tách mã cửa hàng theo dấu "+"
        const ma_cua_hang_list = splitByPlus(ma_cua_hang_raw);

        ma_cua_hang_list.forEach((ma_cua_hang) => {
          // ✅ Kiểm tra mã cửa hàng có trong danh sách hợp lệ không
          if (!validStoreCodesSet.has(ma_cua_hang)) {
            invalidStores.push({
              rowNumber: rowNumber,
              khung_gio: khung_gio,
              ma_cua_hang: ma_cua_hang,
              dich_vu: dich_vu,
            });
            return; // Bỏ qua dòng này
          }

          // ✅ Tìm tên cửa hàng từ danh sách đã tải
          const storeInfo = validStores.find(
            (s) => s.ma_cua_hang === ma_cua_hang
          );
          const ten_cua_hang = storeInfo?.ten_cua_hang || ma_cua_hang;

          dataToImport.push({
            khung_gio: khung_gio,
            ten_cua_hang: ten_cua_hang,
            ma_cua_hang: ma_cua_hang,
            dich_vu: dich_vu,
            ten_tai_xe: ten_tai_xe,
            bien_so_xe: bien_so_xe,
            import_order: orderIndex++,
          });
        });
      });

      // 🚨 Hiển thị modal các mã cửa hàng không hợp lệ
      if (invalidStores.length > 0) {
        setInvalidStoresModal({
          visible: true,
          data: invalidStores,
        });
      }

      // Hiển thị cảnh báo các dòng bị bỏ qua (không có dịch vụ)
      if (skippedRows.length > 0) {
        const skippedInfo = skippedRows
          .map(
            (row) =>
              `Dòng ${row.rowNumber}: ${row.khung_gio} - ${row.ma_cua_hang}`
          )
          .join("\n");

        Modal.warning({
          title: `Đã bỏ qua ${skippedRows.length} dòng không có dịch vụ`,
          content: (
            <div style={{ maxHeight: "300px", overflowY: "auto" }}>
              <p>Các dòng sau không có dịch vụ và đã bị bỏ qua:</p>
              <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap" }}>
                {skippedInfo}
              </pre>
            </div>
          ),
          width: 500,
        });
      }

      if (dataToImport.length === 0) {
        message.error({
          content: "Không có dòng hợp lệ để import!",
          key: "import",
          duration: 3,
        });
        return;
      }

      // Đảo ngược mảng
      const reversedData = dataToImport.reverse();

      console.log("Data to import:", reversedData);

      await phuXeService.addManyPhuXe(reversedData);
      message.success({
        content: `Import thành công ${reversedData.length} dòng!${
          invalidStores.length > 0
            ? ` (Bỏ qua ${invalidStores.length} dòng không hợp lệ)`
            : ""
        }`,
        key: "import",
        duration: 3,
      });

      handleClose();
      if (onImported) onImported();
    } catch (error) {
      console.error("Lỗi khi import:", error);
      message.error({
        content: "Lỗi khi import danh sách phụ xe!",
        key: "import",
        duration: 3,
      });
    }
  };

  // 📄 Xuất file template
  const handleExportTemplate = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Template Phụ Xe");

      const headers = [
        { header: "Khung giờ", key: "khung_gio", width: 15 },
        { header: "Mã cửa hàng", key: "ma_cua_hang", width: 20 },
        { header: "Dịch vụ", key: "dich_vu", width: 15 },
        { header: "Tên tài xế", key: "ten_tai_xe", width: 20 },
        { header: "Biển số xe", key: "bien_so_xe", width: 15 },
      ];
      worksheet.columns = headers;

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

      worksheet.getColumn(1).numFmt = "h:mm";
      worksheet.getColumn(1).alignment = { horizontal: "center" };

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

  // 📋 Columns cho bảng hiển thị mã không hợp lệ
  const invalidStoresColumns = [
    {
      title: "Dòng",
      dataIndex: "rowNumber",
      key: "rowNumber",
      width: 80,
      align: "center",
    },
    {
      title: "Khung giờ",
      dataIndex: "khung_gio",
      key: "khung_gio",
      width: 100,
      align: "center",
    },
    {
      title: "Mã cửa hàng",
      dataIndex: "ma_cua_hang",
      key: "ma_cua_hang",
      width: 150,
      render: (text) => (
        <span className="font-semibold text-red-600">{text}</span>
      ),
    },
    {
      title: "Dịch vụ",
      dataIndex: "dich_vu",
      key: "dich_vu",
      width: 120,
    },
  ];

  return (
    <>
      {!isRole24 && (
        <Button type="primary" icon={<UploadOutlined />} onClick={handleOpen}>
          Import
        </Button>
      )}

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

      {/* ⬅️ Modal hiển thị các mã cửa hàng không hợp lệ */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <WarningOutlined className="text-red-500" />
            <span>Cảnh báo: Mã cửa hàng không hợp lệ</span>
          </div>
        }
        open={invalidStoresModal.visible}
        onOk={() => setInvalidStoresModal({ visible: false, data: [] })}
        onCancel={() => setInvalidStoresModal({ visible: false, data: [] })}
        width={700}
        footer={[
          <Button
            key="ok"
            type="primary"
            onClick={() => setInvalidStoresModal({ visible: false, data: [] })}
          >
            Đã hiểu
          </Button>,
        ]}
      >
        <div className="space-y-3">
          <p className="text-red-600 font-medium">
            Phát hiện {invalidStoresModal.data.length} dòng có mã cửa hàng không
            tồn tại trong hệ thống. Các dòng này đã bị bỏ qua và không được
            import.
          </p>
          <Table
            columns={invalidStoresColumns}
            dataSource={invalidStoresModal.data}
            rowKey={(record) => `${record.rowNumber}-${record.ma_cua_hang}`}
            pagination={{
              pageSize: 10,
              showSizeChanger: false,
              showTotal: (total) => `Tổng ${total} dòng không hợp lệ`,
            }}
            size="small"
            bordered
            scroll={{ y: 400 }}
          />
          <p className="text-gray-600 text-sm">
            💡 Vui lòng kiểm tra và thêm các mã cửa hàng này vào hệ thống CH
            PX-BX trước khi import lại.
          </p>
        </div>
      </Modal>
    </>
  );
};

export default ImportPhuXe;
