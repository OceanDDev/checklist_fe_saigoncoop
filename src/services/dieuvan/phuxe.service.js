import { ApiServer, URL, DEF_HEADERS } from "@/configs/api-request";
import { requestService } from "../request.service";

//
// ==============================
// 🚚 API 1: QUẢN LÝ PHỤ XE
// ==============================
//

/**
 * ✅ Lấy danh sách tất cả phụ xe
 */
const getAllPhuXe = async () => {
  try {
    const results = await requestService.get(
      URL.dieuvan.phuxe,
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("❌ Lỗi getAllPhuXe:", error);
    throw error; // ✅ Throw để component xử lý UI error
  }
};

/**
 * ✅ Lấy 1 phụ xe theo ID
 */
const getPhuXeById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.dieuvan.phuxe}/${id}`,
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("❌ Lỗi getPhuXeById:", error);
    throw error;
  }
};

/**
 * ➕ Thêm 1 phụ xe (tự động phát hiện FormData hoặc JSON)
 * @param {Object|FormData} data - Dữ liệu phụ xe (có thể có file ảnh)
 */
const addPhuXe = async (data) => {
  try {
    const isFormData = data instanceof FormData;

    // ✅ ĐÚNG: Thứ tự tham số
    const results = await requestService.post(
      URL.dieuvan.phuxe, // path
      data, // body
      isFormData ? { "Content-Type": "multipart/form-data" } : DEF_HEADERS, // headers
      ApiServer // axiosInstance
    );

    return results;
  } catch (error) {
    console.error("❌ Lỗi addPhuXe:", error);

    // ✅ Xử lý lỗi storage đầy
    if (error?.errorType === "STORAGE_LIMIT_EXCEEDED") {
      throw new Error(
        "Hệ thống lưu trữ đã đầy. Vui lòng liên hệ quản trị viên."
      );
    }

    throw error;
  }
};
/**
 * 🔥 Import nhiều phụ xe cùng lúc
 * @param {Array} dataArray - Mảng dữ liệu phụ xe
 */
const addManyPhuXe = async (dataArray) => {
  try {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new Error("Dữ liệu không hợp lệ hoặc rỗng");
    }

    const results = await requestService.post(
      `${URL.dieuvan.phuxe}/addmany`,
      dataArray,
      undefined,
      ApiServer
    );

    return results;
  } catch (error) {
    console.error("❌ Lỗi addManyPhuXe:", error);
    throw error;
  }
};

/**
 * ✏️ Cập nhật phụ xe (tự động phát hiện FormData hoặc JSON)
 * @param {string} id - ID phụ xe
 * @param {Object|FormData} data - Dữ liệu cập nhật (có thể có file ảnh)
 */
const updatePhuXe = async (id, data) => {
  try {
    const isFormData = data instanceof FormData;

    // ✅ ĐÚNG: Thứ tự tham số (path, body, headers, axiosInstance)
    const results = await requestService.put(
      `${URL.dieuvan.phuxe}/${id}`, // path
      data, // body
      isFormData ? { "Content-Type": "multipart/form-data" } : DEF_HEADERS, // headers
      ApiServer // axiosInstance
    );

    console.log("✅ Service - Update result:", results);
    return results;
  } catch (error) {
    console.error("❌ Lỗi updatePhuXe:", error);

    // ✅ Xử lý lỗi storage đầy
    if (error?.errorType === "STORAGE_LIMIT_EXCEEDED") {
      throw new Error(
        "Hệ thống lưu trữ đã đầy. Vui lòng liên hệ quản trị viên."
      );
    }

    throw error;
  }
};

/**
 * ✅ Xác nhận điều vận
 * @param {string} id - ID phụ xe
 * @param {boolean} dieu_van_xac_nhan - Trạng thái xác nhận
 */
const xacNhanDieuVan = async (id, dieu_van_xac_nhan) => {
  try {
    const results = await requestService.patch(
      `${URL.dieuvan.phuxe}/${id}/xac-nhan`,
      { dieu_van_xac_nhan },
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("❌ Lỗi xacNhanDieuVan:", error);
    throw error;
  }
};

/**
 * 🗑️ Xóa phụ xe (tự động xóa ảnh trên Cloudinary)
 * @param {string} id - ID phụ xe
 */
const deletePhuXe = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.dieuvan.phuxe}/${id}`,
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("❌ Lỗi deletePhuXe:", error);
    throw error;
  }
};

//
// ==============================
// 👷 API 2: QUẢN LÝ TÊN PHỤ XE
// ==============================
//

/**
 * ✅ Lấy danh sách tất cả tên phụ xe
 */
const getAllPhuXeNames = async () => {
  try {
    const results = await requestService.get(
      URL.dieuvan.tenphuxe,
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("❌ Lỗi getAllPhuXeNames:", error);
    throw error;
  }
};

/**
 * ➕ Thêm tên phụ xe mới
 * @param {string} name - Tên phụ xe
 */
const addPhuXeName = async (name) => {
  try {
    const results = await requestService.post(
      URL.dieuvan.tenphuxe,
      { name },
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("❌ Lỗi addPhuXeName:", error);
    throw error;
  }
};

/**
 * 🗑️ Xóa tên phụ xe
 * @param {string} id - ID tên phụ xe
 */
const deletePhuXeName = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.dieuvan.tenphuxe}/${id}`,
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("❌ Lỗi deletePhuXeName:", error);
    throw error;
  }
};

//
// ==============================
// 🏪 API 3: QUẢN LÝ CỬA HÀNG (CHBX)
// ==============================
//

/**
 * ✅ Lấy danh sách tất cả cửa hàng
 */
const getAllChbx = async () => {
  try {
    const results = await requestService.get(
      URL.dieuvan.chbx,
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("❌ Lỗi getAllChbx:", error);
    throw error;
  }
};

/**
 * ✅ Lấy 1 cửa hàng theo ID
 * @param {string} id - ID cửa hàng
 */
const getChbxById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.dieuvan.chbx}/${id}`,
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("❌ Lỗi getChbxById:", error);
    throw error;
  }
};

/**
 * ➕ Thêm 1 cửa hàng mới
 * @param {Object} data - { ma_cua_hang, ten_cua_hang }
 */
const addChbx = async (data) => {
  try {
    const results = await requestService.post(
      URL.dieuvan.chbx,
      data,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("❌ Lỗi addChbx:", error);
    throw error;
  }
};

/**
 * 🔥 Import nhiều cửa hàng cùng lúc
 * @param {Array} dataArray - Mảng { ma_cua_hang, ten_cua_hang }
 */
const addManyChbx = async (dataArray) => {
  try {
    if (!Array.isArray(dataArray) || dataArray.length === 0) {
      throw new Error("Dữ liệu không hợp lệ hoặc rỗng");
    }

    const results = await requestService.post(
      `${URL.dieuvan.chbx}/addmany`,
      dataArray,
      undefined,
      ApiServer
    );

    return results;
  } catch (error) {
    console.error("❌ Lỗi addManyChbx:", error);
    throw error;
  }
};

/**
 * ✏️ Cập nhật cửa hàng
 * @param {string} id - ID cửa hàng
 * @param {Object} data - Dữ liệu cập nhật
 */
const updateChbx = async (id, data) => {
  try {
    const results = await requestService.put(
      `${URL.dieuvan.chbx}/${id}`,
      data,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("❌ Lỗi updateChbx:", error);
    throw error;
  }
};

/**
 * 🗑️ Xóa cửa hàng
 * @param {string} id - ID cửa hàng
 */
const deleteChbx = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.dieuvan.chbx}/${id}`,
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("❌ Lỗi deleteChbx:", error);
    throw error;
  }
};

//
// ==============================
// 📦 EXPORT SERVICE
// ==============================
//

export const phuXeService = {
  // 📘 Quản lý phụ xe
  getAllPhuXe,
  getPhuXeById,
  addPhuXe,
  addManyPhuXe,
  updatePhuXe,
  xacNhanDieuVan, // 🆕 Thêm API xác nhận điều vận
  deletePhuXe,

  // 📗 Quản lý tên phụ xe
  getAllPhuXeNames,
  addPhuXeName,
  deletePhuXeName,

  // 🏪 Quản lý cửa hàng (CHBX)
  getAllChbx,
  getChbxById,
  addChbx,
  addManyChbx,
  updateChbx,
  deleteChbx,
};
