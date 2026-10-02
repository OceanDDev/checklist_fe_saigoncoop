// services/kehoachxe/kehoachxe.service.js
import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "../request.service";

// ➕ Tạo mới 1 bản ghi
const themKeHoachXe = async (payload) => {
  try {
    return await requestService.post(
      URL.xuathang.kehoachxe,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi themKeHoachXe:", error);
    throw error;
  }
};

// 📋 Lấy danh sách (có phân trang + filter theo cột + khoảng ngày)
const getDanhSach = async (params = {}) => {
  try {
    return await requestService.get(
      URL.xuathang.kehoachxe,
      params,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi getDanhSach:", error);
    throw error;
  }
};

// 🔍 Lấy chi tiết theo id
const getChiTiet = async (id) => {
  try {
    return await requestService.get(
      `${URL.xuathang.kehoachxe}/${id}`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi getChiTiet:", error);
    throw error;
  }
};

// ✏️ Cập nhật 1 bản ghi
const capNhat = async (id, payload) => {
  try {
    return await requestService.put(
      `${URL.xuathang.kehoachxe}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi capNhat:", error);
    throw error;
  }
};

// ❌ Xóa 1 bản ghi
const xoa = async (id) => {
  try {
    return await requestService.del(
      `${URL.xuathang.kehoachxe}/${id}`,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xoa:", error);
    throw error;
  }
};

// 📥 Import nhiều bản ghi (upsert theo ten_ke_hoach + ghi_chu_ke_hoach)
const importNhieu = async (data) => {
  try {
    return await requestService.post(
      `${URL.xuathang.kehoachxe}/import-many`,
      { data },
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi importNhieu:", error);
    throw error;
  }
};

// 🗑️ Xóa nhiều: truyền mảng ids, hoặc { ngay_import_from, ngay_import_to }
// Dùng POST vì requestService.del không nhận body.
const xoaNhieu = async (payload) => {
  try {
    const body = Array.isArray(payload) ? { ids: payload } : payload;
    return await requestService.post(
      `${URL.xuathang.kehoachxe}/delete-many`,
      body,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xoaNhieu:", error);
    throw error;
  }
};

export const keHoachXeService = {
  themKeHoachXe,
  getDanhSach,
  getChiTiet,
  capNhat,
  xoa,
  importNhieu,
  xoaNhieu,
};