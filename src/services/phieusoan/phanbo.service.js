// services/phieusoan/phanbo.service.js
import { URL, ApiServer } from "@/configs/api-request";

const buildQueryString = (params = {}) => {
  const {
    page = 1,
    limit = 10,
    sku = "",
    name = "",
    pack = "",
    mach = "",
    tench = "",
    ten_phan_bo = "",
    sd_tf = "",
    search = "",
    trang_thai = "",
    startDate = "",
    endDate = "",
      startNgayXuLi = "",   // ← thêm
    endNgayXuLi = "",     
  } = params;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  if (sku) qs.set("sku", sku);
  if (name) qs.set("name", name);
  if (pack) qs.set("pack", pack);
  if (mach) qs.set("mach", mach);
  if (tench) qs.set("tench", tench);
  if (ten_phan_bo) qs.set("ten_phan_bo", ten_phan_bo);
  if (sd_tf) qs.set("sd_tf", sd_tf);
  if (search) qs.set("search", search);
  if (trang_thai) qs.set("trang_thai", trang_thai);
  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);
    if (startNgayXuLi) qs.set("startNgayXuLi", startNgayXuLi);
  if (endNgayXuLi)   qs.set("endNgayXuLi",   endNgayXuLi);

  return qs.toString();
};

const getAllPhanBo = async (params = {}) => {
  try {
    const query = buildQueryString(params);
    const path = query
      ? `${URL.phieusoan.phanbo}?${query}`
      : URL.phieusoan.phanbo;
    const response = await ApiServer.get(path);
    return response.data;
  } catch (error) {
    console.error("Lỗi getAllPhanBo:", error);
    throw error;
  }
};

const getPhanBoById = async (id) => {
  try {
    const response = await ApiServer.get(`${URL.phieusoan.phanbo}/${id}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi getPhanBoById:", error);
    throw error;
  }
};

const createPhanBo = async (payload) => {
  try {
    const response = await ApiServer.post(URL.phieusoan.phanbo, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi createPhanBo:", error);
    throw error;
  }
};

const updatePhanBo = async (id, payload) => {
  try {
    const response = await ApiServer.put(
      `${URL.phieusoan.phanbo}/${id}`,
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi updatePhanBo:", error);
    throw error;
  }
};

const deletePhanBo = async (id) => {
  try {
    const response = await ApiServer.delete(`${URL.phieusoan.phanbo}/${id}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi deletePhanBo:", error);
    throw error;
  }
};

const importManyPhanBo = async (data) => {
  try {
    const response = await ApiServer.post(
      `${URL.phieusoan.phanbo}/import`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi importManyPhanBo:", error);
    throw error;
  }
};

/** PATCH: cập nhật trạng thái hàng loạt theo mach + ten_phan_bo */
const updateTrangThaiPhanBo = async ({ mach, ten_phan_bo, trang_thai }) => {
  try {
    const response = await ApiServer.patch(
      `${URL.phieusoan.phanbo}/trang-thai`,
      { mach, ten_phan_bo, trang_thai },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi updateTrangThaiPhanBo:", error);
    throw error;
  }
};

const updateManyPhanBo = async (ids, update) => {
  try {
    const response = await ApiServer.put(
      `${URL.phieusoan.phanbo}/bulk-update`,
      { ids, update },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi updateManyPhanBo:", error);
    throw error;
  }
};

const deleteManyPhanBo = async (ids) => {
  try {
    const response = await ApiServer.delete(
      `${URL.phieusoan.phanbo}/bulk-delete`,
      { data: { ids } },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi deleteManyPhanBo:", error);
    throw error;
  }
};

const deleteAllPhanBo = async () => {
  try {
    const response = await ApiServer.delete(
      `${URL.phieusoan.phanbo}/delete-all`,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi deleteAllPhanBo:", error);
    throw error;
  }
};
const importSdTf = async ({ rows }) => {
  try {
    const response = await ApiServer.post(
      `${URL.phieusoan.phanbo}/import-sdtf`,
      { rows },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi importSdTf:", error);
    throw error;
  }
};

export const phanBoService = {
  getAllPhanBo, // GET    /phanbo?page=1&limit=10&search=...&trang_thai=...
  getPhanBoById, // GET    /phanbo/:id
  createPhanBo, // POST   /phanbo
  updatePhanBo, // PUT    /phanbo/:id
  deletePhanBo, // DELETE /phanbo/:id
  importManyPhanBo, // POST   /phanbo/import
  updateTrangThaiPhanBo, // PATCH  /phanbo/trang-thai
  updateManyPhanBo, // PUT    /phanbo/bulk-update
  deleteManyPhanBo, // DELETE /phanbo/bulk-delete
  deleteAllPhanBo, // DELETE /phanbo/delete-all
  importSdTf
};
