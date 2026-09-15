import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// ==========================
// 📥 GET ALL
// ==========================
const getAllTonKho = async (params = {}) => {
  try {
    const results = await requestService.get(
      URL.tonkho.tonkho,
      params,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllTonKho:", error);
  }
};

// ==========================
// 📥 GET BY ID
// ==========================
const getTonKhoById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.tonkho.tonkho}/${id}`,
      {},
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getTonKhoById:", error);
  }
};

// ==========================
const getTonKhoBySku = async (sku) => {
  try {
    // Gọi về GET /tonkho?sku=... để lấy mảng danh sách
    const results = await requestService.get(
      URL.tonkho.tonkho,
      { sku },
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getTonKhoBySku:", error);
    return []; // Trả về mảng rỗng nếu lỗi để tránh crash code map()
  }
};

// ==========================
// ➕ ADD 1
// ==========================
const createTonKho = async (payload) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const results = await requestService.post(
      URL.tonkho.tonkho,
      payload,
      {
        "x-user-name": user?.name || "Unknown",
      },
      ApiServer,
    );

    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createTonKho:", error);
    throw error;
  }
};

// ==========================
// 🔍 MATCH IMPORT — upload 2 file (excel tồn kho + txt MMS), backend tự
// parse + so khớp luong_onhand vs luong_mms, ghi đè toàn bộ dữ liệu.
// excelFile, txtFile: đối tượng File lấy từ <input type="file">.
// ==========================
const matchImportTonKho = async (excelFile, txtFile) => {
  try {
    const formData = new FormData();
    formData.append("excelFile", excelFile);
    formData.append("txtFile", txtFile);

    const results = await requestService.post(
      `${URL.tonkho.tonkho}/match-import`,
      formData,
      { "Content-Type": "multipart/form-data" },
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi matchImportTonKho:", error);
    throw error;
  }
};

// ==========================
// 📦 IMPORT MANY (upsert theo lpn + sku)
// ==========================
const importManyTonKho = async (payload) => {
  try {
    const results = await requestService.post(
      `${URL.tonkho.tonkho}/import`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi importManyTonKho:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE
// ==========================
const updateTonKho = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.tonkho.tonkho}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateTonKho:", error);
    throw error;
  }
};

// ==========================
// ❌ DELETE 1
// ==========================
const deleteTonKhoById = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.tonkho.tonkho}/${id}`,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteTonKhoById:", error);
  }
};

// ==========================
// ❌ DELETE MANY
// ==========================
const deleteManyTonKho = async (ids) => {
  try {
    const results = await requestService.del(
      URL.tonkho.tonkho,
      { ids },
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteManyTonKho:", error);
    throw error;
  }
};
// ==========================
const deleteAllTonKho = async () => {
  try {
    const results = await requestService.del(
      `${URL.tonkho.tonkho}/all`,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteAllTonKho:", error);
    throw error;
  }
};
// ==========================
export const tonKhoService = {
  getAllTonKho,
  getTonKhoById,
  getTonKhoBySku,
  createTonKho,
  matchImportTonKho,
  importManyTonKho,
  updateTonKho,
  deleteTonKhoById,
  deleteManyTonKho,
  deleteAllTonKho,
};