/* eslint-disable react/prop-types */
import { Button, message } from "antd";
import { CameraOutlined } from "@ant-design/icons";
import html2canvas from "html2canvas";

const CaptureTable = ({ tableRef, fileName = "bang-phu-xe" }) => {
  const handleCapture = async () => {
    if (!tableRef || !tableRef.current) {
      message.error("Không tìm thấy bảng để chụp!");
      return;
    }

    try {
      message.loading({ content: "Đang chụp ảnh...", key: "capture" });

      // Đợi một chút để UI render xong
      await new Promise(resolve => setTimeout(resolve, 100));

      // Tìm element table wrapper
      const tableWrapper = tableRef.current;
      
      // Tìm table thực sự bên trong (Ant Design Table)
      const antTable = tableWrapper.querySelector('.ant-table');
      const tableBody = tableWrapper.querySelector('.ant-table-body');
      
      if (!antTable) {
        message.error({ content: "Không tìm thấy table!", key: "capture" });
        return;
      }

      // Lưu lại overflow style ban đầu
      const originalOverflow = tableBody ? tableBody.style.overflow : null;
      const originalMaxHeight = tableBody ? tableBody.style.maxHeight : null;
      
      // Tạm thời bỏ scroll để capture full content
      if (tableBody) {
        tableBody.style.overflow = 'visible';
        tableBody.style.maxHeight = 'none';
      }

      // Tính toán kích thước thực tế của table
      const tableContent = tableWrapper.querySelector('.ant-table-content');
      const actualWidth = tableContent ? tableContent.scrollWidth : antTable.scrollWidth;
      const actualHeight = tableContent ? tableContent.scrollHeight : antTable.scrollHeight;

      // Cấu hình html2canvas để capture full table
      const canvas = await html2canvas(antTable, {
        scale: 2, // Chất lượng cao
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        // Capture toàn bộ nội dung
        width: actualWidth,
        height: actualHeight,
        scrollX: 0,
        scrollY: -window.scrollY, // Bù offset scroll của window
        windowWidth: actualWidth,
        windowHeight: actualHeight,
        onclone: (clonedDoc) => {
          // Xử lý trên bản clone để không ảnh hưởng UI gốc
          const clonedTable = clonedDoc.querySelector('.ant-table-body');
          if (clonedTable) {
            clonedTable.style.overflow = 'visible';
            clonedTable.style.maxHeight = 'none';
          }
          
          // Đảm bảo tất cả các cột hiển thị
          const clonedContent = clonedDoc.querySelector('.ant-table-content');
          if (clonedContent) {
            clonedContent.style.overflow = 'visible';
          }

          // ẨN CỘT CHỨC NĂNG (cột cuối cùng)
          // Ẩn header của cột cuối
          const headerCells = clonedDoc.querySelectorAll('.ant-table-thead th:last-child');
          headerCells.forEach(cell => cell.style.display = 'none');
          
          // Ẩn tất cả các cell của cột cuối trong body
          const bodyCells = clonedDoc.querySelectorAll('.ant-table-tbody td:last-child');
          bodyCells.forEach(cell => cell.style.display = 'none');

          // ẨN ICON TRONG BUTTON TÊN PHỤ XE
          const phuXeIcons = clonedDoc.querySelectorAll('.phu-xe-icon');
          phuXeIcons.forEach(icon => icon.style.display = 'none');

          // CHỈNH CENTER CHO BUTTON TÊN PHỤ XE
          const phuXeButtons = clonedDoc.querySelectorAll('.phu-xe-name-button');
          phuXeButtons.forEach(button => {
            button.style.justifyContent = 'center';
            button.style.textAlign = 'center';
          });
        }
      });

      // Khôi phục lại style ban đầu
      if (tableBody) {
        if (originalOverflow !== null) tableBody.style.overflow = originalOverflow;
        if (originalMaxHeight !== null) tableBody.style.maxHeight = originalMaxHeight;
      }

      // Convert canvas thành blob
      canvas.toBlob((blob) => {
        if (!blob) {
          message.error({ content: "Không thể tạo ảnh!", key: "capture" });
          return;
        }

        // Tạo link download
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        const timestamp = new Date().toISOString().slice(0, 10);
        link.download = `${fileName}_${timestamp}.png`;
        link.href = url;
        link.click();

        // Cleanup
        URL.revokeObjectURL(url);
        
        message.success({ content: "Đã chụp ảnh thành công!", key: "capture" });
      }, "image/png");

    } catch (error) {
      console.error("Lỗi khi chụp ảnh:", error);
      message.error({ content: "Không thể chụp ảnh bảng!", key: "capture" });
    }
  };

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