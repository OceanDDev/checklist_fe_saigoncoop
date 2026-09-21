// services/asn.service.js
import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "../request.service";

// ➕ Tạo 1 bản ghi ASN
const themASN = async (payload) => {
  try {
    return await requestService.post(
      URL.nhaphang.asn,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi themASN:", error);
    throw error;
  }
};

// 📋 Lấy danh sách (có phân trang + filter)
const getDanhSach = async (params = {}) => {
  try {
    return await requestService.get(
      URL.nhaphang.asn,
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
      `${URL.nhaphang.asn}/${id}`,
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
      `${URL.nhaphang.asn}/${id}`,
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
      `${URL.nhaphang.asn}/${id}`,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xoa:", error);
    throw error;
  }
};

// 📥 Import nhiều bản ghi (chỉ insert)
const importNhieu = async (items) => {
  try {
    return await requestService.post(
      `${URL.nhaphang.asn}/import-many`,
      { items },
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi importNhieu:", error);
    throw error;
  }
};

// 🔄 Import kèm cập nhật (upsert theo asn + po)
const importCapNhat = async (items) => {
  try {
    return await requestService.post(
      `${URL.nhaphang.asn}/import-update`,
      { items },
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi importCapNhat:", error);
    throw error;
  }
};

// ✏️ Cập nhật nhiều bản ghi
const capNhatNhieu = async ({ ids, filter, update }) => {
  try {
    return await requestService.patch(
      `${URL.nhaphang.asn}/update-many`,
      { ids, filter, update },
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi capNhatNhieu:", error);
    throw error;
  }
};

// ❌ Xóa nhiều bản ghi
const xoaNhieu = async ({ ids, filter }) => {
  try {
    return await requestService.del(
      `${URL.nhaphang.asn}/delete-many`,
      { data: { ids, filter } },
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xoaNhieu:", error);
    throw error;
  }
};

export const asnService = {
  themASN,
  getDanhSach,
  getChiTiet,
  capNhat,
  xoa,
  importNhieu,
  importCapNhat,
  capNhatNhieu,
  xoaNhieu,
};