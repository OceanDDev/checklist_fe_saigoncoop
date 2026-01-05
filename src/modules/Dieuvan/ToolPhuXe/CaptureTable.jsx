/* eslint-disable react/prop-types */
import { Button, message } from "antd";
import { CameraOutlined } from "@ant-design/icons";
import html2canvas from "html2canvas";

const CaptureTable = ({ tableRef, fileName = "bang-phu-xe", isRole24 }) => {
  const handleCapture = async () => {
    if (!tableRef || !tableRef.current) {
      message.error("Không tìm thấy bảng để chụp!");
      return;
    }

    try {
      message.loading({ content: "Đang chụp ảnh...", key: "capture" });

      await new Promise((resolve) => setTimeout(resolve, 300));

      const tableWrapper = tableRef.current;
      const antTable = tableWrapper.querySelector(".ant-table");

      if (!antTable) {
        message.error({ content: "Không tìm thấy table!", key: "capture" });
        return;
      }

      const canvas = await html2canvas(antTable, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: null,
        height: null,
        onclone: (clonedDoc) => {
          const tableInClone = clonedDoc.querySelector(".ant-table");
          const tableBody = clonedDoc.querySelector(".ant-table-body");
          const tableContent = clonedDoc.querySelector(".ant-table-content");

          if (tableBody) {
            tableBody.style.overflow = "visible";
            tableBody.style.maxHeight = "none";
            tableBody.style.height = "auto";
          }
          if (tableContent) {
            tableContent.style.overflow = "visible";
          }

          // 2. ẨN CÁC CỘT SAU "TÊN PHỤ XE" (Thay đổi index >= 6 thành index >= 7)
          const allRows = clonedDoc.querySelectorAll("tr");
          allRows.forEach((row) => {
            const cells = Array.from(row.children);
            cells.forEach((cell, index) => {
              // Cột: STT(0), KhungGiờ(1), TênCH(2), DịchVụ(3), TàiXế(4), BiểnSố(5), TênPhụXe(6)
              // Ta ẩn từ index 7 trở đi (Xác nhận, Hình ảnh, In, Xóa...)
              if (index >= 7) { 
                cell.style.display = "none";
                cell.style.width = "0px";
                cell.style.minWidth = "0px";
              }
            });
          });

          // 3. Cập nhật colgroup (Thay đổi index >= 6 thành index >= 7)
          const colGroups = clonedDoc.querySelectorAll("colgroup");
          colGroups.forEach((group) => {
            const cols = Array.from(group.children);
            cols.forEach((col, index) => {
              if (index >= 7) {
                col.style.display = "none";
                col.setAttribute("width", "0");
              }
            });
          });

          const stickyCells = clonedDoc.querySelectorAll(
            ".ant-table-cell-fix-left, .ant-table-cell-fix-right"
          );
          stickyCells.forEach((el) => {
            el.style.position = "static";
            el.style.left = "auto";
            el.style.right = "auto";
            el.style.backgroundColor = "transparent";
          });

          if (tableInClone) {
            tableInClone.style.width = "max-content";
            tableInClone.style.display = "block";
          }
        },
      });

      canvas.toBlob((blob) => {
        if (!blob) {
          message.error({ content: "Không thể tạo ảnh!", key: "capture" });
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const timestamp = new Date()
          .toLocaleDateString("vi-VN")
          .replace(/\//g, "-");
        link.download = `${fileName}_${timestamp}.png`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);

        message.success({ content: "Đã chụp ảnh thành công!", key: "capture" });
      }, "image/png");
    } catch (error) {
      console.error("Lỗi khi chụp ảnh:", error);
      message.error({ content: "Lỗi kỹ thuật khi chụp!", key: "capture" });
    }
  };

  if (isRole24) return null;

  return (
    <Button
      type="primary"
      icon={<CameraOutlined />}
      onClick={handleCapture}
      className="bg-green-600 hover:bg-green-700 border-green-600"
    >
      <span className="hidden sm:inline">Chụp Ảnh</span>
      <span className="sm:hidden">Chụp</span>
    </Button>
  );
};

export default CaptureTable;