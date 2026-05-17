// services/phieusoan/phieule.service.js
import axios from "axios";
import { URL, ApiServer } from "@/configs/api-request";

// Tạo axios instance riêng cho file upload (KHÔNG có Content-Type mặc định)
const apiEndpoint = import.meta.env.VITE_API;
const FileUploadServer = axios.create({
  baseURL: apiEndpoint,
  headers: {
    Accept: "application/json",
    // KHÔNG set Content-Type để axios tự động xử lý multipart/form-data
  },
});

/** Helper: build query string cho pagination và filter */
const buildQueryString = (params = {}) => {
  const {
    page = 1,
    limit = 10,
    search = "",
    so_document = "",
    sku = "",
    slot = "",
    trang_thai = "",
    mach = "", // ✅ THÊM
    chuyen = "", // ✅ THÊM
    quan = "",
    loai_phieu = "",
    startDate = "",
    endDate = "",
    printStartDate = "", // ✅ THÊM
    printEndDate = "", // ✅ THÊM
  } = params;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  if (search) qs.set("search", search);
  if (so_document) qs.set("so_document", so_document);
  if (sku) qs.set("sku", sku);
  if (slot) qs.set("slot", slot);
  if (trang_thai) qs.set("trang_thai", trang_thai);
  if (mach) qs.set("mach", mach); // ✅ THÊM
  if (chuyen) qs.set("chuyen", chuyen); // ✅ THÊM
  if (loai_phieu) qs.set("loai_phieu", loai_phieu); // ✅ THÊM
  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);
  if (quan) qs.set("quan", quan);
  if (printStartDate) qs.set("printStartDate", printStartDate); // ✅ THÊM
  if (printEndDate) qs.set("printEndDate", printEndDate); // ✅ THÊM
  return qs.toString();
};

/** GET: lấy toàn bộ phiếu lẻ (có phân trang + filter) */
const getAllPhieuLe = async (params = {}) => {
  try {
    const query = buildQueryString(params);
    const path = query
      ? `${URL.phieule.phieule}?${query}`
      : URL.phieule.phieule;
    const response = await ApiServer.get(path);
    return response.data;
  } catch (error) {
    console.error("Lỗi getAllPhieuLe:", error);
    throw error;
  }
};
FileUploadServer.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});
/** GET: lấy phiếu lẻ theo ID */
const getPhieuLeById = async (id) => {
  try {
    const response = await ApiServer.get(`${URL.phieule.phieule}/${id}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi getPhieuLeById:", error);
    throw error;
  }
};

/** GET: lấy phiếu lẻ theo số document */
const getPhieuLeBySoDocument = async (so_document) => {
  try {
    const response = await ApiServer.get(
      `${URL.phieule.phieule}/document/${so_document}`,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi getPhieuLeBySoDocument:", error);
    throw error;
  }
};

/** GET: lấy thống kê phiếu lẻ */
const getPhieuLeStatistics = async () => {
  try {
    const response = await ApiServer.get(`${URL.phieule.phieule}/statistics`);
    return response.data;
  } catch (error) {
    console.error("Lỗi getPhieuLeStatistics:", error);
    throw error;
  }
};

/** POST: tạo phiếu lẻ mới */
const createPhieuLe = async (payload) => {
  try {
    const response = await ApiServer.post(URL.phieule.phieule, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi createPhieuLe:", error);
    throw error;
  }
};

/** PUT: cập nhật phiếu lẻ theo ID */
const updatePhieuLe = async (id, payload) => {
  try {
    const response = await ApiServer.put(
      `${URL.phieule.phieule}/${id}`,
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi updatePhieuLe:", error);
    throw error;
  }
};

/** PUT: cập nhật trạng thái phiếu lẻ */
const updatePhieuLeStatus = async (id, trang_thai) => {
  try {
    const response = await ApiServer.put(
      `${URL.phieule.phieule}/${id}/status`,
      { trang_thai },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi updatePhieuLeStatus:", error);
    throw error;
  }
};

/** DELETE: xóa phiếu lẻ theo ID */
const deletePhieuLe = async (id) => {
  try {
    const response = await ApiServer.delete(`${URL.phieule.phieule}/${id}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi deletePhieuLe:", error);
    throw error;
  }
};

/** POST: import nhiều phiếu lẻ từ Excel */
const importManyPhieuLe = async (data) => {
  try {
    const response = await ApiServer.post(`${URL.phieule.phieule}/import`, {
      data,
    });
    return response.data;
  } catch (error) {
    console.error("Lỗi importManyPhieuLe:", error);
    throw error;
  }
};

/** POST: xóa toàn bộ phiếu lẻ */
const clearAllPhieuLe = async () => {
  try {
    const response = await ApiServer.post(`${URL.phieule.phieule}/clear-all`, {
      confirmation: "DELETE_ALL",
    });
    return response.data;
  } catch (error) {
    console.error("Lỗi clearAllPhieuLe:", error);
    throw error;
  }
};

/** POST: import 1 file txt — parse + save vào PhieuLe */
const importTxtPhieuLe = async (file) => {
  try {
    console.log("📤 [importTxtPhieuLe] Bắt đầu upload");
    console.log("📤 Thông tin file:", {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const formData = new FormData();
    formData.append("file", file);

    // Debug: Log FormData contents
    console.log("📦 FormData entries:");
    for (let [key, value] of formData.entries()) {
      console.log(
        `  - ${key}:`,
        value instanceof File ? `File(${value.name})` : value,
      );
    }

    // ✅ SỬ DỤNG FileUploadServer thay vì ApiServer
    const response = await FileUploadServer.post(
      `${URL.phieule.phieule}/import-txt`,
      formData,
      // Không cần set headers - axios tự động xử lý
    );

    console.log("✅ Upload thành công:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Lỗi importTxtPhieuLe:", error);
    console.error("❌ Chi tiết lỗi từ backend:", error.response?.data);
    console.error("❌ Status:", error.response?.status);
    throw error;
  }
};

/** POST: import nhiều file txt — parse + save nhiều phiếu */
const importTxtPhieuLeMultiple = async (files) => {
  try {
    console.log("📤 [importTxtPhieuLeMultiple] Bắt đầu upload");
    console.log(`📤 Đang upload ${files.length} files`);

    const formData = new FormData();
    files.forEach((file, index) => {
      console.log(`  ${index + 1}. ${file.name} (${file.size} bytes)`);
      formData.append("files", file);
    });

    // ✅ SỬ DỤNG FileUploadServer thay vì ApiServer
    const response = await FileUploadServer.post(
      `${URL.phieule.phieule}/import-txt-multiple`,
      formData,
      // Không cần set headers - axios tự động xử lý
    );

    console.log("✅ Upload thành công:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Lỗi importTxtPhieuLeMultiple:", error);
    console.error("❌ Chi tiết lỗi từ backend:", error.response?.data);
    throw error;
  }
};
/** PUT: cập nhật nhiều phiếu lẻ theo danh sách IDs */
const updateManyPhieuLe = async (ids, updateData) => {
  try {
    const response = await ApiServer.put(`${URL.phieule.phieule}/update-many`, {
      ids,
      updateData,
    });
    return response.data;
  } catch (error) {
    console.error("Lỗi updateManyPhieuLe:", error);
    throw error;
  }
};

/** PUT: cập nhật nhiều phiếu lẻ theo điều kiện filter */
const updateManyPhieuLeByFilter = async (filter, updateData) => {
  try {
    const response = await ApiServer.put(
      `${URL.phieule.phieule}/update-many-by-filter`,
      { filter, updateData },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi updateManyPhieuLeByFilter:", error);
    throw error;
  }
};

/** PUT: cập nhật 1 field trong chi tiết phiếu lẻ */
const updateChiTietPhieuLe = async ({ id, sku, field, value }) => {
  try {
    const response = await ApiServer.put(
      `${URL.phieule.phieule}/${id}/chitiet`,
      { sku, field, value },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi updateChiTietPhieuLe:", error);
    throw error;
  }
};
export const updateTrangThaiBySDTF = async (data) => {
  try {
    const response = await ApiServer.put(
      `${URL.phieule.phieule}/update-by-sdtf`,
      data,
    );
    return response.data;
  } catch (error) {
    console.error("Error updating trang thai by SD/TF:", error);
    throw error;
  }
};

const updatePackUnit1ForPhieu = async (id) => {
  try {
    const response = await ApiServer.put(
      `${URL.phieule.phieule}/${id}/pack-unit-1`,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi updatePackUnit1ForPhieu:", error);
    throw error;
  }
};

/** GET: Lấy thông tin pack_unit_1 (không lưu vào DB) */
const getPackUnit1Info = async (id) => {
  try {
    const response = await ApiServer.get(
      `${URL.phieule.phieule}/${id}/pack-unit-1`,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi getPackUnit1Info:", error);
    throw error;
  }
};

const updateMultipleChiTiet = async (data) => {
  try {
    const response = await ApiServer.patch(
      `${URL.phieule.phieule}/${data.id}/chi-tiet/bulk-update`,
      { updates: data.updates },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi updateMultipleChiTiet:", error);
    throw error;
  }
};
const importSodaTxtPhieuLe = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);
    const response = await FileUploadServer.post(
      `${URL.phieule.phieule}/import-soda-txt`,
      formData,
    );
    return response.data;
  } catch (error) {
    console.error("❌ Lỗi importSodaTxtPhieuLe:", error);
    throw error;
  }
};

const importSodaTxtPhieuLeMultiple = async (files) => {
  try {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const response = await FileUploadServer.post(
      `${URL.phieule.phieule}/import-soda-txt-multiple`,
      formData,
    );
    return response.data;
  } catch (error) {
    console.error("❌ Lỗi importSodaTxtPhieuLeMultiple:", error);
    throw error;
  }
};
const import8101PhieuLe = async (payload) => {
  const response = await ApiServer.post(
    `${URL.phieule.phieule}/import-8101`,
    payload,
  );
  return response.data;
};
// thêm vào export: import8101PhieuLe,
const deleteManyPhieuLe = async (ids) => {
  try {
    const response = await ApiServer.delete(`${URL.phieule.phieule}/many`, {
      data: { ids },
    });
    return response.data;
  } catch (error) {
    console.error("Lỗi deleteManyPhieuLe:", error);
    throw error;
  }
};

/** DELETE: xóa nhiều phiếu lẻ theo filter */
const deleteManyPhieuLeByFilter = async (filter) => {
  try {
    const response = await ApiServer.delete(
      `${URL.phieule.phieule}/by-filter`,
      {
        data: { filter, confirmation: "CONFIRM_DELETE" },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi deleteManyPhieuLeByFilter:", error);
    throw error;
  }
};
export const phieuLeService = {
  getAllPhieuLe, // GET  /api/saigoncoop/phieule?page=1&limit=10&search=...
  getPhieuLeById, // GET  /api/saigoncoop/phieule/:id
  getPhieuLeBySoDocument, // GET  /api/saigoncoop/phieule/document/:so_document
  getPhieuLeStatistics, // GET  /api/saigoncoop/phieule/statistics
  createPhieuLe, // POST /api/saigoncoop/phieule
  updatePhieuLe, // PUT  /api/saigoncoop/phieule/:id
  updatePhieuLeStatus, // PUT  /api/saigoncoop/phieule/:id/status
  deletePhieuLe, // DELETE /api/saigoncoop/phieule/:id
  importManyPhieuLe, // POST /api/saigoncoop/phieule/import (từ Excel)
  clearAllPhieuLe, // POST /api/saigoncoop/phieule/clear-all
  importTxtPhieuLe, // POST /api/saigoncoop/phieule/import-txt (1 file txt)
  importTxtPhieuLeMultiple, // POST /api/saigoncoop/phieule/import-txt-multiple (nhiều file txt)
  updateManyPhieuLeByFilter,
  updateManyPhieuLe,
  updateChiTietPhieuLe,
  updateTrangThaiBySDTF,
  updatePackUnit1ForPhieu, // ✅ THÊM MỚI
  getPackUnit1Info,
  updateMultipleChiTiet,
  importSodaTxtPhieuLe,
  importSodaTxtPhieuLeMultiple,
  import8101PhieuLe,
  deleteManyPhieuLe, // DELETE /phieule/many
  deleteManyPhieuLeByFilter, // DELETE /phieule/by-filter
};
