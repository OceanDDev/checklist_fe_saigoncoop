import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// Lưu ý: cần thêm URL.baotai.baotai vào file configs/api-request
// vd: baotai: ENDPOINT_PREFIX + "/baotai"

// ==========================
// ==========================
const getAllBaoTai = async (params = {}) => {
  try {
    const results = await requestService.get(
      URL.baotai.baotai,
      params,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllBaoTai:", error);
  }
};

// ==========================
// 📥 GET BY ID
// ==========================
const getBaoTaiById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.baotai.baotai}/${id}`,
      {},
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getBaoTaiById:", error);
  }
};

// ==========================
// ➕ CREATE
// ==========================
const createBaoTai = async (payload) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const results = await requestService.post(
      URL.baotai.baotai,
      payload,
      {
        "x-user-name": user?.name || "Unknown",
      },
      ApiServer,
    );

    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createBaoTai:", error);
    throw error;
  }
};

// ==========================
// ➕ CREATE SLL — nút "Thêm SLL", chuyen luôn mặc định = "SLL"
// ==========================
const createBaoTaiSLL = async (payload) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const results = await requestService.post(
      `${URL.baotai.baotai}/sll`,
      payload,
      {
        "x-user-name": user?.name || "Unknown",
      },
      ApiServer,
    );

    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createBaoTaiSLL:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE
// ==========================
const updateBaoTai = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.baotai.baotai}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateBaoTai:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE nv_tk / cong_xuat (PATCH /:id/nv-tk-cong-xuat)
// payload: { nv_tk, cong_xuat } — gửi null để xóa field đó
// ==========================
const updateNvTkCongXuatBaoTai = async (id, payload) => {
  try {
    const results = await requestService.patch(
      `${URL.baotai.baotai}/${id}/nv-tk-cong-xuat`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateNvTkCongXuatBaoTai:", error);
    throw error;
  }
};

// ==========================
// ❌ DELETE 1
// ==========================
const deleteBaoTaiById = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.baotai.baotai}/${id}`,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteBaoTaiById:", error);
    throw error;
  }
};

// ==========================
// ❌ DELETE MANY (theo mảng ids)
// ==========================
const deleteManyBaoTai = async (ids) => {
  try {
    const results = await requestService.del(
      URL.baotai.baotai,
      { ids },
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteManyBaoTai:", error);
    throw error;
  }
};

// ==========================
// ➕ IMPORT MANY
// ==========================
const importManyBaoTai = async (data) => {
  try {
    const results = await requestService.post(
      `${URL.baotai.baotai}/import-many`,
      { items: data }, // 👈 đổi "data" thành "items" cho khớp backend
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi importManyBaoTai:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE MANY (theo mảng ids + data chung)
// ==========================
const updateManyBaoTai = async (ids, data) => {
  try {
    const results = await requestService.put(
      `${URL.baotai.baotai}/update-many`,
      { ids, data },
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateManyBaoTai:", error);
    throw error;
  }
};

// ==========================
export const baoTaiService = {
  getAllBaoTai,
  getBaoTaiById,
  createBaoTai,
  createBaoTaiSLL,
  updateBaoTai,
  updateNvTkCongXuatBaoTai,
  deleteBaoTaiById,
  deleteManyBaoTai,
  importManyBaoTai,
  updateManyBaoTai,
};
