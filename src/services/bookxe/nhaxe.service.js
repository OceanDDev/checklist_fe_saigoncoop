import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "../request.service";

// ============================================================
// NhaXe
// Lưu ý: cần thêm URL.bookxe.nhaxe vào file configs/api-request
// vd: nhaxe: ENDPOINT_PREFIX + "/nhaxe"
// ============================================================

// ==========================
// 📥 GET ALL (hỗ trợ filter: ma_ch, quan, nvc, thoi_gian_xuat, tu_ngay, den_ngay, search, page, limit)
// ==========================
const getAllNhaXe = async (params = {}) => {
  try {
    const results = await requestService.get(
      URL.bookxe.nhaxe,
      params,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllNhaXe:", error);
  }
};

// ==========================
// 📥 GET BY ID
// ==========================
const getNhaXeById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.bookxe.nhaxe}/${id}`,
      {},
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getNhaXeById:", error);
  }
};

// ==========================
// ➕ CREATE
// ==========================
const createNhaXe = async (payload) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const results = await requestService.post(
      URL.bookxe.nhaxe,
      payload,
      {
        "x-user-name": user?.name || "Unknown",
      },
      ApiServer,
    );

    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createNhaXe:", error);
    throw error;
  }
};

// ==========================
// ➕ IMPORT MANY
// data: [{ ma_ch, ten_ch, quan, thoi_gian_xuat, lich_di_hang, nvc, ghi_chu }, ...]
// ==========================
const importManyNhaXe = async (data) => {
  try {
    const results = await requestService.post(
      `${URL.bookxe.nhaxe}/import-many`,
      { data },
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi importManyNhaXe:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE
// ==========================
const updateNhaXe = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.bookxe.nhaxe}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateNhaXe:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE MANY (mỗi bản ghi có giá trị riêng)
// data: [{ _id, nvc, ghi_chu, ... }, { _id, quan, ... }]
// ==========================
const updateManyNhaXe = async (data) => {
  try {
    const results = await requestService.put(
      `${URL.bookxe.nhaxe}/update-many`,
      { data },
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateManyNhaXe:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE MANY BY IDS (nhiều bản ghi cùng một giá trị)
// ids: ["...", "..."], update: { nvc: "Nhà xe B" }
// ==========================
const updateManyNhaXeByIds = async (ids, update) => {
  try {
    const results = await requestService.put(
      `${URL.bookxe.nhaxe}/update-many-by-ids`,
      { ids, update },
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateManyNhaXeByIds:", error);
    throw error;
  }
};

// ==========================
// ❌ DELETE 1
// ==========================
const deleteNhaXeById = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.bookxe.nhaxe}/${id}`,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteNhaXeById:", error);
    throw error;
  }
};

// ==========================
// ❌ DELETE MANY (theo mảng ids)
// ==========================
const deleteManyNhaXe = async (ids) => {
  try {
    const results = await requestService.del(
      URL.bookxe.nhaxe,
      { ids },
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteManyNhaXe:", error);
    throw error;
  }
};

// ==========================
export const nhaXeService = {
  getAllNhaXe,
  getNhaXeById,
  createNhaXe,
  importManyNhaXe,
  updateNhaXe,
  updateManyNhaXe,
  updateManyNhaXeByIds,
  deleteNhaXeById,
  deleteManyNhaXe,
};