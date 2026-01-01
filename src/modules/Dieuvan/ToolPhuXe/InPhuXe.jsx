/* eslint-disable react/prop-types */
import { useRef } from "react";
import { Button, Space } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import { useReactToPrint } from "react-to-print";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

const VN_TIMEZONE = "Asia/Ho_Chi_Minh";

const InPhuXe = ({ record, onClose }) => {
  const contentRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef,
    documentTitle: `Giay_Xac_Nhan_Phu_Xe_${
      record.ten_cua_hang || "Unknown"
    }_${dayjs().tz(VN_TIMEZONE).format("DDMMYYYY_HHmmss")}`,
    onAfterPrint: () => {
      console.log("In thành công!");
    },
  });

  const formatVietnameseDate = (date) => {
    if (!date) return "";
    return dayjs(date).tz(VN_TIMEZONE).format("DD/MM/YYYY");
  };

  return (
    <div>
      {/* Print Button */}
      <div className="flex justify-end mb-4 no-print">
        <Space>
          <Button onClick={onClose}>Đóng</Button>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            onClick={handlePrint}
            size="large"
          >
            In Phiếu
          </Button>
        </Space>
      </div>

      {/* Print Content */}
      <div
        ref={contentRef}
        style={{
          padding: "20px 30px",
          backgroundColor: "#fff",
          fontFamily: "Arial, sans-serif",
          maxWidth: "210mm",
          margin: "0 auto",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "20px" }}>
          <div
            style={{
              fontSize: "11px",
              lineHeight: "1.4",
              marginBottom: "15px",
            }}
          >
            <div style={{ fontWeight: "bold" }}>LIÊN HIỆP HTX THƯƠNG MẠI</div>
            <div style={{ fontWeight: "bold", marginLeft: "20px" }}>
              THÀNH PHỐ HỒ CHÍ MINH
            </div>
            <div style={{ fontWeight: "bold" }}>
              ĐƠN VỊ: CÔNG TY TNHH MTV KHO VẬN SAIGONCO-OP
            </div>
          </div>

          <div
            style={{
              textAlign: "center",
              fontSize: "18px",
              fontWeight: "bold",
              marginBottom: "20px",
            }}
          >
            GIẤY XÁC NHẬN SỬ DỤNG DỊCH VỤ PHỤ XE BỐC XẾP
          </div>
        </div>

        {/* Form Fields */}
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            marginBottom: "30px",
            fontSize: "13px",
          }}
        >
          <tbody>
            <tr>
              <td
                style={{
                  border: "1px solid #000",
                  padding: "8px 12px",
                  fontWeight: "bold",
                  width: "30%",
                }}
              >
                TÊN CỬA HÀNG:
              </td>
              <td style={{ border: "1px solid #000", padding: "8px 12px" }}>
                {record.ten_cua_hang || ""}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  border: "1px solid #000",
                  padding: "8px 12px",
                  fontWeight: "bold",
                }}
              >
                DỊCH VỤ:
              </td>
              <td style={{ border: "1px solid #000", padding: "8px 12px" }}>
                {record.dich_vu || ""}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  border: "1px solid #000",
                  padding: "8px 12px",
                  fontWeight: "bold",
                }}
              >
                TÊN PHỤ XE:
              </td>
              <td style={{ border: "1px solid #000", padding: "8px 12px" }}>
                {record.dieu_van_xac_nhan || ""}
              </td>
            </tr>
            <tr>
              <td
                style={{
                  border: "1px solid #000",
                  padding: "8px 12px",
                  fontWeight: "bold",
                }}
              >
                NGÀY:
              </td>
              <td style={{ border: "1px solid #000", padding: "8px 12px" }}>
                {formatVietnameseDate(record.thoi_gian_xong_chuyen)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Note Section */}
        <div
          style={{
            marginBottom: "15px",
            fontSize: "11px",
            textAlign: "center",
          }}
        >
          <div style={{ marginBottom: "5px" }}>
            Cửa hàng ký và đóng mộc xác nhận sau khi sử dụng dịch vụ
          </div>
          <div>(phụ xe - bốc xếp) của Kho</div>
        </div>

        {/* Signature Box - Single box */}
        <div style={{ marginBottom: "20px" }}>
          {/* Hàng tiêu đề */}
          <div
            style={{
              border: "1px solid #000",
              borderBottom: "none", // Bỏ viền dưới để nối liền với khung dưới
              padding: "5px",
              textAlign: "center",
              fontWeight: "bold",
              fontSize: "13px",
              textTransform: "uppercase",
            }}
          >
            ĐÓNG MỘC VÀ KÍ TÊN
          </div>

          {/* Khung chữ ký chia đôi */}
          <div
            style={{
              border: "1px solid #000",
              minHeight: "120px",
              display: "flex",
            }}
          >
            {/* Cột trái */}
            <div
              style={{
                flex: "1",
                borderRight: "1px solid #000",
              }}
            ></div>

            {/* Cột phải */}
            <div
              style={{
                flex: "2",
              }}
            ></div>
          </div>
        </div>

        {/* Important Notes */}
        <div style={{ fontSize: "10px", marginBottom: "10px" }}>
          <div
            style={{
              textAlign: "center",
              fontWeight: "bold",
              marginBottom: "8px",
              textDecoration: "underline",
            }}
          >
            CÁC VẤN ĐỀ LƯU Ý KHI PHỤ XE BỐC XẾP
          </div>

          <div style={{ lineHeight: "1.5", textAlign: "justify" }}>
            <div style={{ marginBottom: "4px" }}>
              1. Phụ xe có trách nhiệm báo SMT vào cho Cửa hàng và xác nhận hàng
              cho Cửa hàng (đối với xe SMT).
            </div>
            <div style={{ marginBottom: "4px" }}>
              2. Phụ xe đi theo xe có trách nhiệm xuống hàng theo địa điểm Cửa
              hàng chỉ định.
            </div>
            <div style={{ marginBottom: "4px" }}>
              3. Bốc xếp đi theo xe có trách nhiệm chuyển hàng vào kho hoặc theo
              điểm chỉ định của Cửa hàng.
            </div>
            <div style={{ marginBottom: "4px" }}>
              4. Phụ xe – Bốc xếp có trách nhiệm hỗ trợ xe SMT và chuyển hàng
              vào Kho hoặc theo điểm chỉ định của Cửa hàng.
            </div>
            <div style={{ marginBottom: "4px" }}>
              5. Trong quá trình làm việc tại cửa hàng luôn thể hiện thái độ
              chuyên nghiệp, nhiệt tình, vui vẻ. Không để phát sinh các vấn đề
              tiêu cực gây mất uy tín và hình ảnh của Công ty.
            </div>
            <div style={{ marginBottom: "4px" }}>
              6. Thực hiện công tác Phụ xe – Bốc xếp theo danh sách các cửa hàng
              có dịch vụ hoặc các cửa hàng có thông tin xác nhận từ Ban điều
              hành.
            </div>
            <div style={{ marginBottom: "4px" }}>
              7. Sau khi hoàn thành công việc, phải đề nghị Cửa hàng ký tên và
              đóng dấu xác nhận để ghi nhận công tác phí. Các trường hợp không
              có chữ ký và mộc của Cửa hàng sẽ không được thanh toán.
            </div>
            <div style={{ marginBottom: "4px" }}>
              8. Khi Cửa hàng có thông tin trả trang thiết bị về kho, phải hỗ
              trợ chuyển trang thiết bị lên xe; không được từ chối hoặc tìm lý
              do trốn tránh trách nhiệm.
            </div>
            <div style={{ marginBottom: "4px" }}>
              9. Khi kết thúc chuyến, nếu tài xế không quay về kho, nhân viên
              Phụ xe – bốc xếp phải liên hệ Ban điều hành để được sắp xếp xe về
              kho.
            </div>
            <div style={{ marginBottom: "4px" }}>
              10. Khi ngồi trên xe, tuyệt đối tuân thủ quy định về An toàn giao
              thông, thắt dây an toàn khi tham gia lưu thông.
            </div>
            <div style={{ marginBottom: "4px" }}>
              11. Tuyệt đối tuân thủ theo sự điều động của Kho. Nếu có vấn đề
              phát sinh, phải liên hệ trực tiếp về Ban điều hành để có hướng xử
              lý, không tiếp nhận thông tin từ các nguồn khác.
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div style={{ fontSize: "10px", lineHeight: "1.4" }}>
          <div style={{ fontWeight: "bold", marginBottom: "3px" }}>
            Số điện thoại liên hệ Ban điều hành xuất hàng:
          </div>
          <div>- A. Nam : 0911.856.405 – 0933.713.363</div>
          <div>- A. Tuấn: 0933.259.559</div>
          <div>- C. Nhi : 0911.641.339 – 0934.585.353</div>
        </div>
      </div>

      {/* Print Styles */}
      <style>
        {`
          @media print {
            .no-print {
              display: none !important;
            }
            @page {
              size: A4;
              margin: 15mm;
            }
            body {
              print-color-adjust: exact;
              -webkit-print-color-adjust: exact;
            }
          }
        `}
      </style>
    </div>
  );
};

export default InPhuXe;
