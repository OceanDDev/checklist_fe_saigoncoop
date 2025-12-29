import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "../request.service";

//
// ==============================
// 🚚 API 1: QUẢN LÝ PHỤ XE
// ==============================
//

// ✅ Lấy danh sách tất cả phụ xe
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
    console.error("Lỗi khi gọi getAllPhuXe:", error);
    return null;
  }
};

// ✅ Thêm 1 phụ xe (tự động nhận biết FormData hoặc JSON)
const addPhuXe = async (data) => {
  try {
    const isFormData = data instanceof FormData;
    const results = await requestService.post(
      URL.dieuvan.phuxe,
      data,
      undefined,
      ApiServer,
      isFormData ? { "Content-Type": "multipart/form-data" } : undefined
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi addPhuXe:", error);
    return null;
  }
};

const addPhuXeWithImage = async (formData) => {
  try {
    const results = await requestService.post(
      URL.dieuvan.phuxe,
      formData,
      undefined,
      ApiServer,
      { "Content-Type": "multipart/form-data" }
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi addPhuXeWithImage:", error);
    return null;
  }
};

const addManyPhuXe = async (dataArray) => {
  try {
    const results = await requestService.post(
      `${URL.dieuvan.phuxe}/addmany`,
      dataArray,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi addManyPhuXe:", error);
    return null;
  }
};

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
    console.error("Lỗi khi gọi getPhuXeById:", error);
    return null;
  }
};

const updatePhuXe = async (id, data) => {
  try {
    const isFormData = data instanceof FormData;
    const results = await requestService.put(
      `${URL.dieuvan.phuxe}/${id}`,
      data,
      undefined,
      ApiServer,
      isFormData ? { "Content-Type": "multipart/form-data" } : undefined
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updatePhuXe:", error);
    return null;
  }
};

const updatePhuXeWithImage = async (id, formData) => {
  try {
    const response = await ApiServer.put(
      `${URL.dieuvan.phuxe}/${id}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  } catch (error) {
    console.error("❌ Lỗi khi gọi updatePhuXeWithImage:", error);
    return null;
  }
};

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
    console.error("Lỗi khi gọi deletePhuXe:", error);
    return null;
  }
};

//
// ==============================
// 👷 API 2: QUẢN LÝ TÊN PHỤ XE
// ==============================
//

const getAllPhuXeNames = async () => {
  try {
    const results = await requestService.get(URL.dieuvan.tenphuxe, {}, undefined, ApiServer);
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllPhuXeNames:", error);
    return null;
  }
};

const addPhuXeName = async (name) => {
  try {
    const results = await requestService.post(URL.dieuvan.tenphuxe, { name }, undefined, ApiServer);
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi addPhuXeName:", error);
    return null;
  }
};

const deletePhuXeName = async (id) => {
  try {
    const results = await requestService.del(`${URL.dieuvan.tenphuxe}/${id}`, {}, undefined, ApiServer);
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deletePhuXeName:", error);
    return null;
  }
};

//
// ==============================
// 🏪 API 3: QUẢN LÝ CỬA HÀNG (CHBX) 🆕
// ==============================
//

const getAllChbx = async () => {
  try {
    const results = await requestService.get(
      URL.dieuvan.chbx, // Đảm bảo URL này tồn tại trong config
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllChbx:", error);
    return null;
  }
};

const addChbx = async (data) => {
  try {
    const results = await requestService.post(
      URL.dieuvan.chbx,
      data, // Gửi { ma_cua_hang, ten_cua_hang }
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi addChbx:", error);
    return null;
  }
};

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
    console.error("Lỗi khi gọi getChbxById:", error);
    return null;
  }
};

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
    console.error("Lỗi khi gọi updateChbx:", error);
    return null;
  }
};

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
    console.error("Lỗi khi gọi deleteChbx:", error);
    return null;
  }
};

// Thêm tính năng import nhiều cửa hàng cùng lúc
const addManyChbx = async (dataArray) => {
  try {
    const results = await requestService.post(
      `${URL.dieuvan.chbx}/addmany`,
      dataArray,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi addManyChbx:", error);
    return null;
  }
};

//
// ==============================
// 📦 XUẤT CÁC HÀM DÙNG CHUNG
// ==============================
//

export const phuXeService = {
  // 📘 Quản lý phụ xe
  getAllPhuXe,
  addPhuXe,
  addPhuXeWithImage,
  addManyPhuXe,
  getPhuXeById,
  updatePhuXe,
  updatePhuXeWithImage,
  updatePhuXeWithImages: updatePhuXeWithImage,
  deletePhuXe,

  // 📗 Quản lý tên phụ xe
  getAllPhuXeNames,
  addPhuXeName,
  deletePhuXeName,

  // 🏪 Quản lý Cửa hàng bán xe (CHBX)
  getAllChbx,
  addChbx,
  getChbxById,
  updateChbx,
  deleteChbx,
  addManyChbx,
};