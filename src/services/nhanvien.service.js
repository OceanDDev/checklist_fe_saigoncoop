// services/nhanvien.service.js
import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// 🔍 Tra cứu nhân viên theo mã
const traCuu = async (ma_nhan_vien) => {
  try {
    const ma = ma_nhan_vien.toString().trim().toUpperCase();
    return await requestService.get(
      `${URL.chamcong.nhanvien}/${ma}`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi traCuu:", error);
    throw error;
  }
};

// 📋 Lấy danh sách nhân viên
const getDanhSach = async (params = {}) => {
  try {
    return await requestService.get(
      URL.chamcong.nhanvien,
      params,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi getDanhSach:", error);
    throw error;
  }
};

// ➕ Thêm 1 nhân viên
const themNhanVien = async (payload) => {
  try {
    return await requestService.post(
      URL.chamcong.nhanvien,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi themNhanVien:", error);
    throw error;
  }
};

// 📥 Import nhiều nhân viên (addMany)
const importNhanVien = async (data) => {
  try {
    return await requestService.post(
      `${URL.chamcong.nhanvien}/import`,
      { data },
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi importNhanVien:", error);
    throw error;
  }
};

// ✏️ Cập nhật nhân viên
const capNhat = async (id, payload) => {
  try {
    return await requestService.patch(
      `${URL.chamcong.nhanvien}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi capNhat:", error);
    throw error;
  }
};

// 🔒 Khóa / mở khóa
const toggleActive = async (id) => {
  try {
    return await requestService.patch(
      `${URL.chamcong.nhanvien}/${id}/toggle-active`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi toggleActive:", error);
    throw error;
  }
};

// ❌ Xóa nhân viên
const xoa = async (id) => {
  try {
    return await requestService.del(
      `${URL.chamcong.nhanvien}/${id}`,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xoa:", error);
    throw error;
  }
};

export const nhanVienService = {
  traCuu,
  getDanhSach,
  themNhanVien,
  importNhanVien,
  capNhat,
  toggleActive,
  xoa,
};
