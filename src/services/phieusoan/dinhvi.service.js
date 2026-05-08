// services/dinhvi.service.js
import { URL } from "@/configs/api-request";
import { requestService } from "../request.service";

/** Helper: build query string cho pagination và filter */
const buildQueryString = (params = {}) => {
  const {
    page = 1,
    limit = 10,
    slot = "",
    sku = "",
    name = "",
    pack = "",
    maNCC = "",
    maNH = "",
    Dept = "",
    SubDept = "",
    search = "",
  } = params;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  if (slot) qs.set("slot", slot);
  if (sku) qs.set("sku", sku);
  if (name) qs.set("name", name);
  if (pack) qs.set("pack", pack);
  if (maNCC) qs.set("maNCC", maNCC);
  if (maNH) qs.set("maNH", maNH);
  if (Dept) qs.set("Dept", Dept);
  if (SubDept) qs.set("SubDept", SubDept);
  if (search) qs.set("search", search);

  return qs.toString();
};

/** GET: lấy toàn bộ định vị (có phân trang + filter) */
const getAllDinhVi = async (params = {}) => {
  try {
    const query = buildQueryString(params);
    const path = `${URL.phieusoan.dinhvi}?${query}`;
    const results = await requestService.get(path);
    return results;
  } catch (error) {
    console.error("Lỗi getAllDinhVi:", error);
    throw error;
  }
};

/** GET: lấy định vị theo ID */
const getDinhViById = async (id) => {
  try {
    const path = `${URL.phieusoan.dinhvi}/${id}`;
    const result = await requestService.get(path);
    return result;
  } catch (error) {
    console.error("Lỗi getDinhViById:", error);
    throw error;
  }
};

/** POST: tạo định vị mới */
const createDinhVi = async (payload) => {
  try {
    const path = URL.phieusoan.dinhvi;
    const results = await requestService.post(path, payload);
    return results;
  } catch (error) {
    console.error("Lỗi createDinhVi:", error);
    throw error;
  }
};

/** PUT: cập nhật định vị theo ID */
const updateDinhVi = async (id, payload) => {
  try {
    const path = `${URL.phieusoan.dinhvi}/${id}`;
    const results = await requestService.put(path, payload);
    return results;
  } catch (error) {
    console.error("Lỗi updateDinhVi:", error);
    throw error;
  }
};

/** DELETE: xóa định vị theo ID */
const deleteDinhVi = async (id) => {
  try {
    const path = `${URL.phieusoan.dinhvi}/${id}`;
    const results = await requestService.del(path);
    return results;
  } catch (error) {
    console.error("Lỗi deleteDinhVi:", error);
    throw error;
  }
};

/** POST: xóa toàn bộ định vị (yêu cầu xác nhận "chắc xóa") */
const clearAllDinhVi = async () => {
  try {
    const path = `${URL.phieusoan.dinhvi}/clear-all`;
    const payload = { confirmation: "DELETE_ALL" };
    const results = await requestService.post(path, payload);
    return results;
  } catch (error) {
    console.error("Lỗi clearAllDinhVi:", error);
    throw error;
  }
};

/** POST: import nhiều định vị từ Excel */
const importManyDinhVi = async (data) => {
  try {
    const path = `${URL.phieusoan.dinhvi}/import`;
    const results = await requestService.post(path, data);
    return results;
  } catch (error) {
    console.error("Lỗi importManyDinhVi:", error);
    throw error;
  }
};

/** PATCH: cập nhật pack theo SKU */
const updatePackBySKU = async (sku, newPack) => {
  try {
    const path = `${URL.phieusoan.dinhvi}/update-pack`;
    const results = await requestService.patch(path, { sku, pack: newPack });
    return results;
  } catch (error) {
    console.error("Lỗi updatePackBySKU:", error);
    throw error;
  }
};

/** POST: lấy khối lượng theo nhiều SKU (bulk) */
const getKhoiLuongByMultipleSKU = async (skus) => {
  try {
    const path = `${URL.phieusoan.dinhvi}/khoi-luong/bulk`;
    const results = await requestService.post(path, { skus });
    return results;
  } catch (error) {
    console.error("Lỗi getKhoiLuongByMultipleSKU:", error);
    throw error;
  }
};

/** GET: lấy khối lượng theo 1 SKU */
const getKhoiLuongBySKU = async (sku) => {
  try {
    const path = `${URL.phieusoan.dinhvi}/khoi-luong/${sku}`;
    const results = await requestService.get(path);
    return results;
  } catch (error) {
    console.error("Lỗi getKhoiLuongBySKU:", error);
    throw error;
  }
};

// ✅ THÊM MỚI: Lấy pack theo nhiều SKU (bulk)
const getPackByMultipleSKU = async (skus) => {
  try {
    const path = `${URL.phieusoan.dinhvi}/pack/bulk`;
    const results = await requestService.post(path, { skus });
    return results;
  } catch (error) {
    console.error("Lỗi getPackByMultipleSKU:", error);
    throw error;
  }
};

// ✅ THÊM MỚI: Lấy pack theo 1 SKU
const getPackBySKU = async (sku) => {
  try {
    const path = `${URL.phieusoan.dinhvi}/pack/${sku}`;
    const results = await requestService.get(path);
    return results;
  } catch (error) {
    console.error("Lỗi getPackBySKU:", error);
    throw error;
  } 
};

export const dinhViService = {
  getAllDinhVi,           // GET /dinhvi?page=1&limit=10&slot=...&search=...
  getDinhViById,          // GET /dinhvi/:id
  createDinhVi,           // POST /dinhvi
  updateDinhVi,           // PUT /dinhvi/:id
  deleteDinhVi,           // DELETE /dinhvi/:id
  clearAllDinhVi,         // POST /dinhvi/clear-all (với confirmation)
  importManyDinhVi,       // POST /dinhvi/import
  updatePackBySKU,        // PATCH /dinhvi/update-pack
  getKhoiLuongByMultipleSKU,  // POST /dinhvi/khoi-luong/bulk
  getKhoiLuongBySKU,      // GET /dinhvi/khoi-luong/:sku
  getPackByMultipleSKU,   // ✅ POST /dinhvi/pack/bulk
  getPackBySKU,           // ✅ GET /dinhvi/pack/:sku
};