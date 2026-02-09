// services/dataCH.service.js
import { URL } from "@/configs/api-request";
import { requestService } from "../request.service";

/** Helper: build query string cho pagination và filter */
const buildQueryString = (params = {}) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    startDate = "",
    endDate = "",
  } = params;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  if (search) qs.set("search", search);
  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);

  return qs.toString();
};

/** GET: lấy toàn bộ dữ liệu cửa hàng (có phân trang + filter) */
const getAllDataCH = async (params = {}) => {
  try {
    const query = buildQueryString(params);
    const path = query 
      ? `${URL.phieule.dataCH}?${query}`
      : URL.phieule.dataCH;
    const results = await requestService.get(path);
    return results;
  } catch (error) {
    console.error("Lỗi getAllDataCH:", error);
    throw error;
  }
};

/** GET: lấy dữ liệu cửa hàng theo ID */
const getDataCHById = async (id) => {
  try {
    const path = `${URL.phieule.dataCH}/${id}`;
    const result = await requestService.get(path);
    return result;
  } catch (error) {
    console.error("Lỗi getDataCHById:", error);
    throw error;
  }
};

/** POST: tạo dữ liệu cửa hàng mới */
const createDataCH = async (payload) => {
  try {
    const path = URL.phieule.dataCH;
    const results = await requestService.post(path, payload);
    return results;
  } catch (error) {
    console.error("Lỗi createDataCH:", error);
    throw error;
  }
};

/** PUT: cập nhật dữ liệu cửa hàng theo ID */
const updateDataCH = async (id, payload) => {
  try {
    const path = `${URL.phieule.dataCH}/${id}`;
    const results = await requestService.put(path, payload);
    return results;
  } catch (error) {
    console.error("Lỗi updateDataCH:", error);
    throw error;
  }
};

/** DELETE: xóa dữ liệu cửa hàng theo ID */
const deleteDataCH = async (id) => {
  try {
    const path = `${URL.phieule.dataCH}/${id}`;
    const results = await requestService.del(path);
    return results;
  } catch (error) {
    console.error("Lỗi deleteDataCH:", error);
    throw error;
  }
};

/** POST: import nhiều dữ liệu cửa hàng từ Excel */
const importManyDataCH = async (data) => {
  try {
    const path = `${URL.phieule.dataCH}/addmany`;
    const payload = { data }; // Wrap data trong object
    const results = await requestService.post(path, payload);
    return results;
  } catch (error) {
    console.error("Lỗi importManyDataCH:", error);
    throw error;
  }
};

/** POST: xóa toàn bộ dữ liệu cửa hàng (nếu có endpoint này) */
const clearAllDataCH = async () => {
  try {
    const path = `${URL.phieule.dataCH}/clear-all`;
    const payload = { confirmation: "DELETE_ALL" };
    const results = await requestService.post(path, payload);
    return results;
  } catch (error) {
    console.error("Lỗi clearAllDataCH:", error);
    throw error;
  }
};

/** DELETE: xóa toàn bộ dữ liệu cửa hàng */
const deleteAllDataCH = async () => {
  try {
    const path = `${URL.phieule.dataCH}/delete-all`;
    const results = await requestService.del(path);
    return results;
  } catch (error) {
    console.error("Lỗi deleteAllDataCH:", error);
    throw error;
  }
};

export const dataCHService = {
  getAllDataCH,      // GET /dataCH?page=1&limit=10&search=...
  getDataCHById,     // GET /dataCH/:id
  createDataCH,      // POST /dataCH
  updateDataCH,      // PUT /dataCH/:id
  deleteDataCH,      // DELETE /dataCH/:id
  importManyDataCH,  // POST /dataCH/import
  clearAllDataCH,    // POST /dataCH/clear-all (optional)
  deleteAllDataCH
};