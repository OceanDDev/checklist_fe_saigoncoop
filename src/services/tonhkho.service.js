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
// 🔍 MATCH IMPORT — upload 4 file cho 2 kho (810 và 8101), mỗi kho gồm
// 1 file excel tồn kho + 1 file txt MMS. Backend tự parse + validate
// header "Store <số>: ..." của từng file txt khớp đúng kho, so khớp
// luong_onhand vs luong_mms, ghi đè toàn bộ dữ liệu (cả 2 kho).
// Tham số: object { excel810, txt810, excel8101, txt8101 } — đều là
// đối tượng File lấy từ <input type="file">.
// ==========================
const matchImportTonKho = async ({ excel810, txt810, excel8101, txt8101 }) => {
  try {
    const formData = new FormData();
    formData.append("excel810", excel810);
    formData.append("txt810", txt810);
    formData.append("excel8101", excel8101);
    formData.append("txt8101", txt8101);

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
