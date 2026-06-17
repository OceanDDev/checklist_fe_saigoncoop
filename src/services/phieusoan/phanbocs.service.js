// services/phieusoan/phanboCS.service.js
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
    chuyen = "",
    startDate = "",
    endDate = "",
    startNgayXuLi = "",
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
  if (chuyen) qs.set("chuyen", chuyen);
  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);
  if (startNgayXuLi) qs.set("startNgayXuLi", startNgayXuLi);
  if (endNgayXuLi) qs.set("endNgayXuLi", endNgayXuLi);

  return qs.toString();
};

const getAllPhanBoCS = async (params = {}) => {
  try {
    const query = buildQueryString(params);
    const path = query ? `${URL.phieusoan.phanbocs}?${query}` : URL.phieusoan.phanbocs;
    const response = await ApiServer.get(path);
    return response.data;
  } catch (error) {
    console.error("Lỗi getAllPhanBoCS:", error);
    throw error;
  }
};

const getPhanBoCSById = async (id) => {
  try {
    const response = await ApiServer.get(`${URL.phieusoan.phanbocs}/${id}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi getPhanBoCSById:", error);
    throw error;
  }
};

const createPhanBoCS = async (payload) => {
  try {
    const response = await ApiServer.post(URL.phieusoan.phanbocs, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi createPhanBoCS:", error);
    throw error;
  }
};

const updatePhanBoCS = async (id, payload) => {
  try {
    const response = await ApiServer.put(`${URL.phieusoan.phanbocs}/${id}`, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi updatePhanBoCS:", error);
    throw error;
  }
};

const deletePhanBoCS = async (id) => {
  try {
    const response = await ApiServer.delete(`${URL.phieusoan.phanbocs}/${id}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi deletePhanBoCS:", error);
    throw error;
  }
};

const importManyPhanBoCS = async (data) => {
  try {
    const response = await ApiServer.post(`${URL.phieusoan.phanbocs}/import`, data);
    return response.data;
  } catch (error) {
    console.error("Lỗi importManyPhanBoCS:", error);
    throw error;
  }
};

const updateTrangThaiPhanBoCS = async ({ mach, ten_phan_bo, trang_thai }) => {
  try {
    const response = await ApiServer.patch(
      `${URL.phieusoan.phanbocs}/trang-thai`,
      { mach, ten_phan_bo, trang_thai },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi updateTrangThaiPhanBoCS:", error);
    throw error;
  }
};

const updateManyPhanBoCS = async (ids, update) => {
  try {
    const response = await ApiServer.put(
      `${URL.phieusoan.phanbocs}/bulk-update`,
      { ids, update },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi updateManyPhanBoCS:", error);
    throw error;
  }
};

const deleteManyPhanBoCS = async (ids) => {
  try {
    const response = await ApiServer.delete(
      `${URL.phieusoan.phanbocs}/bulk-delete`,
      { data: { ids } },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi deleteManyPhanBoCS:", error);
    throw error;
  }
};

const deleteAllPhanBoCS = async () => {
  try {
    const response = await ApiServer.delete(`${URL.phieusoan.phanbocs}/delete-all`);
    return response.data;
  } catch (error) {
    console.error("Lỗi deleteAllPhanBoCS:", error);
    throw error;
  }
};

const importSdTfCS = async ({ rows }) => {
  try {
    const response = await ApiServer.post(
      `${URL.phieusoan.phanbocs}/import-sdtf`,
      { rows },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi importSdTfCS:", error);
    throw error;
  }
};

export const phanBoCSService = {
  getAllPhanBoCS,       // GET    /phanbo-cs?page=1&limit=10&...
  getPhanBoCSById,     // GET    /phanbo-cs/:id
  createPhanBoCS,      // POST   /phanbo-cs
  updatePhanBoCS,      // PUT    /phanbo-cs/:id
  deletePhanBoCS,      // DELETE /phanbo-cs/:id
  importManyPhanBoCS,  // POST   /phanbo-cs/import
  updateTrangThaiPhanBoCS, // PATCH  /phanbo-cs/trang-thai
  updateManyPhanBoCS,  // PUT    /phanbo-cs/bulk-update
  deleteManyPhanBoCS,  // DELETE /phanbo-cs/bulk-delete
  deleteAllPhanBoCS,   // DELETE /phanbo-cs/delete-all
  importSdTfCS,        // POST   /phanbo-cs/import-sdtf
};