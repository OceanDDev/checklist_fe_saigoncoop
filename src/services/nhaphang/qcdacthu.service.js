// services/qcdacthu.service.js
import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "../request.service";

// ➕ Tạo 1 bản ghi QC đặc thù
const themQcDacThu = async (payload) => {
  try {
    return await requestService.post(
      URL.qcdacthu.qcdacthu,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi themQcDacThu:", error);
    throw error;
  }
};

// 📋 Lấy danh sách (có phân trang + filter)
const getDanhSach = async (params = {}) => {
  try {
    return await requestService.get(
      URL.qcdacthu.qcdacthu,
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
      `${URL.qcdacthu.qcdacthu}/${id}`,
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
    return await requestService.patch(
      `${URL.qcdacthu.qcdacthu}/${id}`,
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
      `${URL.qcdacthu.qcdacthu}/${id}`,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xoa:", error);
    throw error;
  }
};

// 📥 Import nhiều bản ghi
const importNhieu = async (items) => {
  try {
    return await requestService.post(
      `${URL.qcdacthu.qcdacthu}/import-many`,
      { items },
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi importNhieu:", error);
    throw error;
  }
};

// ✏️ Cập nhật nhiều bản ghi
const capNhatNhieu = async ({ ids, sku_list, filter, update }) => {
  try {
    return await requestService.patch(
      `${URL.qcdacthu.qcdacthu}/update-many`,
      { ids, sku_list, filter, update },
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi capNhatNhieu:", error);
    throw error;
  }
};

// ❌ Xóa nhiều bản ghi
const xoaNhieu = async ({ ids, sku_list, filter }) => {
  try {
    return await requestService.del(
      `${URL.qcdacthu.qcdacthu}/delete-many`,
      { data: { ids, sku_list, filter } },
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xoaNhieu:", error);
    throw error;
  }
};

export const qcDacThuService = {
  themQcDacThu,
  getDanhSach,
  getChiTiet,
  capNhat,
  xoa,
  importNhieu,
  capNhatNhieu,
  xoaNhieu,
};