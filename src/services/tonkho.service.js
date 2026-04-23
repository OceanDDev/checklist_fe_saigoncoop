import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// ==========================
// 📥 GET ALL
// ==========================
const getAllTonKho = async () => {
  try {
    const results = await requestService.get(
      URL.inventory.inventory,
      {},
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
      `${URL.inventory.inventory}/${id}`,
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
      URL.inventory.inventory, 
      { sku: sku }, // Truyền params để BE lọc .find({sku})
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
      URL.inventory.inventory,
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
// ➕ ADD MANY
// ==========================
const createManyTonKho = async (payload) => {
  try {
    const results = await requestService.post(
      `${URL.inventory.inventory}/many`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createManyTonKho:", error);
    throw error;
  }
};

// ==========================
// 🔥 UPSERT MANY
// ==========================
const upsertManyTonKho = async (payload) => {
  try {
    const results = await requestService.post(
      `${URL.inventory.inventory}/upsert`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi upsertManyTonKho:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE
// ==========================
const updateTonKho = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.inventory.inventory}/${id}`,
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
      `${URL.inventory.inventory}/${id}`,
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
      `${URL.inventory.inventory}/many`,
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
export const tonKhoService = {
  getAllTonKho,
  getTonKhoById,
  createTonKho,
  createManyTonKho,
  upsertManyTonKho,
  updateTonKho,
  deleteTonKhoById,
  deleteManyTonKho,
  getTonKhoBySku
};
