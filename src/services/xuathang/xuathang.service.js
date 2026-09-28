// services/xuatHang.service.js
import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "../request.service";

// ➕ Tạo mới 1 bản ghi
const themXuatHang = async (payload) => {
  try {
    return await requestService.post(
      URL.xuathang.xuathang,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi themXuatHang:", error);
    throw error;
  }
};

// 📋 Lấy danh sách (có phân trang + filter)
const getDanhSach = async (params = {}) => {
  try {
    return await requestService.get(
      URL.xuathang.xuathang,
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
      `${URL.xuathang.xuathang}/${id}`,
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
      `${URL.xuathang.xuathang}/${id}`,
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
      `${URL.xuathang.xuathang}/${id}`,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xoa:", error);
    throw error;
  }
};

// 📥 Import nhiều bản ghi (upsert theo so_bb)
const importNhieu = async (data) => {
  try {
    return await requestService.post(
      `${URL.xuathang.xuathang}/import-many`,
      { data },
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi importNhieu:", error);
    throw error;
  }
};

export const xuatHangService = {
  themXuatHang,
  getDanhSach,
  getChiTiet,
  capNhat,
  xoa,
  importNhieu,
};