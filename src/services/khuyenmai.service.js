import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// ==========================
// 📥 GET ALL
// ==========================
const getAllKhuyenMai = async (params = {}) => {
  try {
    const results = await requestService.get(
      URL.khuyenmai.khuyenmai,
      params,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllKhuyenMai:", error);
  }
};

// ==========================
// 📥 GET BY ID
// ==========================
const getKhuyenMaiById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.khuyenmai.khuyenmai}/${id}`,
      {},
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getKhuyenMaiById:", error);
  }
};

// ==========================
const getKhuyenMaiBySku = async (sku) => {
  try {
    // Gọi về GET /khuyenmai?sku=... để lấy mảng danh sách
    const results = await requestService.get(
      URL.khuyenmai.khuyenmai,
      { sku },
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getKhuyenMaiBySku:", error);
    return []; // Trả về mảng rỗng nếu lỗi để tránh crash code map()
  }
};

// ==========================
// ➕ ADD 1
// ==========================
const createKhuyenMai = async (payload) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const results = await requestService.post(
      URL.khuyenmai.khuyenmai,
      payload,
      {
        "x-user-name": user?.name || "Unknown",
      },
      ApiServer,
    );

    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createKhuyenMai:", error);
    throw error;
  }
};

// ==========================
// 🔍 MATCH IMPORT — upload 2 file (excel tồn kho + txt MMS), backend tự
// parse + so khớp luong_onhand vs luong_mms, ghi đè toàn bộ dữ liệu.
// excelFile, txtFile: đối tượng File lấy từ <input type="file">.
// ==========================
const matchImportKhuyenMai = async (excelFile, txtFile) => {
  try {
    const formData = new FormData();
    formData.append("excelFile", excelFile);
    formData.append("txtFile", txtFile);

    const results = await requestService.post(
      `${URL.khuyenmai.khuyenmai}/match-import`,
      formData,
      { "Content-Type": "multipart/form-data" },
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi matchImportKhuyenMai:", error);
    throw error;
  }
};

// ==========================
// 📦 IMPORT MANY (upsert theo lpn + sku)
// ==========================
const importManyKhuyenMai = async (payload) => {
  try {
    const results = await requestService.post(
      `${URL.khuyenmai.khuyenmai}/import`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi importManyKhuyenMai:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE
// ==========================
const updateKhuyenMai = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.khuyenmai.khuyenmai}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateKhuyenMai:", error);
    throw error;
  }
};

// ==========================
// ❌ DELETE 1
// ==========================
const deleteKhuyenMaiById = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.khuyenmai.khuyenmai}/${id}`,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteKhuyenMaiById:", error);
  }
};

// ==========================
// ❌ DELETE MANY
// ==========================
const deleteManyKhuyenMai = async (ids) => {
  try {
    const results = await requestService.del(
      URL.khuyenmai.khuyenmai,
      { ids },
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteManyKhuyenMai:", error);
    throw error;
  }
};
// ==========================
const deleteAllKhuyenMai = async () => {
  try {
    const results = await requestService.del(
      `${URL.khuyenmai.khuyenmai}/all`,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteAllKhuyenMai:", error);
    throw error;
  }
};
// ==========================
export const khuyenMaiService = {
  getAllKhuyenMai,
  getKhuyenMaiById,
  getKhuyenMaiBySku,
  createKhuyenMai,
  matchImportKhuyenMai,
  importManyKhuyenMai,
  updateKhuyenMai,
  deleteKhuyenMaiById,
  deleteManyKhuyenMai,
  deleteAllKhuyenMai
};
