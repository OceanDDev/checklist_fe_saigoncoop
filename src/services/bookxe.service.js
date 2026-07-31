import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// ==========================
// 📥 GET ALL (hỗ trợ filter: quan, ma_ch, ma_ncv, trangThai, tu_ngay, den_ngay, search, page, limit)
// ==========================
const getAllBookXe = async (params = {}) => {
  try {
    const results = await requestService.get(
      URL.bookxe.bookxe,
      params,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllBookXe:", error);
  }
};

// ==========================
// 📥 GET BY ID
// ==========================
const getBookXeById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.bookxe.bookxe}/${id}`,
      {},
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getBookXeById:", error);
  }
};

// ==========================
// ➕ CREATE
// ==========================
const createBookXe = async (payload) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const results = await requestService.post(
      URL.bookxe.bookxe,
      payload,
      {
        "x-user-name": user?.name || "Unknown",
      },
      ApiServer,
    );

    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createBookXe:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE
// ==========================
const updateBookXe = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.bookxe.bookxe}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateBookXe:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE TRẠNG THÁI (PATCH /:id/trang-thai)
// ==========================
const updateTrangThaiBookXe = async (id, trangThai) => {
  try {
    const results = await requestService.patch(
      `${URL.bookxe.bookxe}/${id}/trang-thai`,
      { trangThai },
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateTrangThaiBookXe:", error);
    throw error;
  }
};

// ==========================
// ❌ DELETE 1
// ==========================
const deleteBookXeById = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.bookxe.bookxe}/${id}`,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteBookXeById:", error);
    throw error;
  }
};

// ==========================
// ❌ DELETE MANY (theo mảng ids)
// ==========================
const deleteManyBookXe = async (ids) => {
  try {
    const results = await requestService.del(
      URL.bookxe.bookxe,
      { ids },
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteManyBookXe:", error);
    throw error;
  }
};

// ============================================================
// HistoryBookXe
// Lưu ý: cần thêm URL.bookxe.historybookxe vào file configs/api-request
// vd: historybookxe: ENDPOINT_PREFIX + "/historybookxe"
// ============================================================

// ==========================
// 📥 GET ALL (hỗ trợ filter: ma_ch, ma_ncv, lenh_dieu_dong, tu_ngay, den_ngay, search, page, limit)
// ==========================
const getAllHistoryBookXe = async (params = {}) => {
  try {
    const results = await requestService.get(
      URL.bookxe.historybookxe,
      params,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllHistoryBookXe:", error);
  }
};

// ==========================
// 📥 GET BY ID
// ==========================
const getHistoryBookXeById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.bookxe.historybookxe}/${id}`,
      {},
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getHistoryBookXeById:", error);
  }
};

// ==========================
// ➕ CREATE
// ==========================
const createHistoryBookXe = async (payload) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const results = await requestService.post(
      URL.bookxe.historybookxe,
      payload,
      {
        "x-user-name": user?.name || "Unknown",
      },
      ApiServer,
    );

    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createHistoryBookXe:", error);
    throw error;
  }
};

// ==========================
// ➕ IMPORT MANY
// ==========================
const importManyHistoryBookXe = async (data) => {
  try {
    const results = await requestService.post(
      `${URL.bookxe.historybookxe}/import-many`,
      { data },
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi importManyHistoryBookXe:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE
// ==========================
const updateHistoryBookXe = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.bookxe.historybookxe}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateHistoryBookXe:", error);
    throw error;
  }
};

// ==========================
// ❌ DELETE 1
// ==========================
const deleteHistoryBookXeById = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.bookxe.historybookxe}/${id}`,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteHistoryBookXeById:", error);
    throw error;
  }
};

// ==========================
// ❌ DELETE MANY (theo mảng ids)
// ==========================
const deleteManyHistoryBookXe = async (ids) => {
  try {
    const results = await requestService.del(
      URL.bookxe.historybookxe,
      { ids },
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteManyHistoryBookXe:", error);
    throw error;
  }
};

// ==========================
export const bookXeService = {
  // BookXe
  getAllBookXe,
  getBookXeById,
  createBookXe,
  updateBookXe,
  updateTrangThaiBookXe,
  deleteBookXeById,
  deleteManyBookXe,

  // HistoryBookXe
  getAllHistoryBookXe,
  getHistoryBookXeById,
  createHistoryBookXe,
  importManyHistoryBookXe,
  updateHistoryBookXe,
  deleteHistoryBookXeById,
  deleteManyHistoryBookXe,
};
