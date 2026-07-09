import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// 📋 Lấy danh sách quản lý hóa đơn (có phân trang / filter)
const getDanhSach = async (params = {}) => {
  try {
    return await requestService.get(
      URL.quanlyhd.quanlyhd,
      params,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi getDanhSach:", error);
    throw error;
  }
};

// 🔍 Lấy chi tiết 1 bản ghi
const traCuu = async (id) => {
  try {
    return await requestService.get(
      `${URL.quanlyhd.quanlyhd}/${id}`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi traCuu:", error);
    throw error;
  }
};

// 📥 Import & đối chiếu 2 file (WMS + Hóa đơn)
// Khác với importNhanVien: gửi multipart/form-data thay vì JSON vì có file đính kèm
const importQuanLyHD = async (fileWms, fileHd) => {
  try {
    const formData = new FormData();
    formData.append("file_wms", fileWms);
    formData.append("file_hd", fileHd);

    return await requestService.post(
      `${URL.quanlyhd.quanlyhd}/import`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi importQuanLyHD:", error);
    throw error;
  }
};

// 📊 Thống kê tổng hợp theo trangThai (Hoàn thành / Không khớp lượng / Chưa có hóa đơn)
const thongKe = async (params = {}) => {
  try {
    return await requestService.get(
      `${URL.quanlyhd.quanlyhd}/summary`,
      params,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi thongKe:", error);
    throw error;
  }
};

// ✏️ Cập nhật tay 1 bản ghi (VD sửa lại luong_hd khi đối chiếu sai)
const capNhat = async (id, payload) => {
  try {
    return await requestService.patch(
      `${URL.quanlyhd.quanlyhd}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi capNhat:", error);
    throw error;
  }
};

// ✅ Xác nhận hoàn thành 1 bản ghi đang "Không khớp lượng"
// -> BE sẽ set trangThai = "Hoàn thành" và ghi nhận ngay_xu_ly (thời gian xử lý)
const xacNhanHoanThanh = async (id) => {
  try {
    return await requestService.patch(
      `${URL.quanlyhd.quanlyhd}/${id}/xac-nhan-hoan-thanh`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xacNhanHoanThanh:", error);
    throw error;
  }
};

// ❌ Xóa 1 bản ghi
const xoa = async (id) => {
  try {
    return await requestService.del(
      `${URL.quanlyhd.quanlyhd}/${id}`,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xoa:", error);
    throw error;
  }
};

export const quanlyhdService = {
  getDanhSach,
  traCuu,
  importQuanLyHD,
  thongKe,
  capNhat,
  xacNhanHoanThanh,
  xoa,
};
