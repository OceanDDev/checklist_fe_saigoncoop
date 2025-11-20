import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "../request.service";

//
// ==============================
// 🚚 API CHÍNH — DANH SÁCH PHỤ XE
// ==============================
//

// ✅ Lấy danh sách tất cả phụ xe
const getAllPhuXe = async () => {
  try {
    const results = await requestService.get(
      URL.dieuvan.phuxe, // GET /api/phuxe
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

// ✅ Thêm 1 phụ xe
const addPhuXe = async (data) => {
  try {
    const results = await requestService.post(
      URL.dieuvan.phuxe, // POST /api/phuxe
      data,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi addPhuXe:", error);
    return null;
  }
};

// ✅ Import nhiều phụ xe cùng lúc
const addManyPhuXe = async (dataArray) => {
  try {
    const results = await requestService.post(
      `${URL.dieuvan.phuxe}/addmany`, // POST /api/phuxe/addmany
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

// ✅ Lấy phụ xe theo ID
const getPhuXeById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.dieuvan.phuxe}/${id}`, // GET /api/phuxe/:id
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

// ✅ Cập nhật phụ xe
const updatePhuXe = async (id, data) => {
  try {
    const results = await requestService.put(
      `${URL.dieuvan.phuxe}/${id}`, // PUT /api/phuxe/:id
      data,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updatePhuXe:", error);
    return null;
  }
};

// ✅ Xóa phụ xe
const deletePhuXe = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.dieuvan.phuxe}/${id}`, // DELETE /api/phuxe/:id
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
// 👷 API QUẢN LÝ TÊN PHỤ XE
// ==============================
//

const getAllPhuXeNames = async () => {
  try {
    const results = await requestService.get(
      URL.dieuvan.tenphuxe, // GET /api/phuxename
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllPhuXeNames:", error);
    return null;
  }
};

const addPhuXeName = async (name) => {
  try {
    const results = await requestService.post(
      URL.dieuvan.tenphuxe, // POST /api/phuxename
      { name },
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi addPhuXeName:", error);
    return null;
  }
};

const deletePhuXeName = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.dieuvan.tenphuxe}/${id}`, // DELETE /api/phuxename/:id
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deletePhuXeName:", error);
    return null;
  }
};

//
// ==============================
// 📦 Xuất các hàm dùng chung
// ==============================
//

export const phuXeService = {
  // 📘 Quản lý phụ xe
  getAllPhuXe,
  addPhuXe,
  addManyPhuXe,
  getPhuXeById,
  updatePhuXe,
  deletePhuXe,

  // 📗 Quản lý tên phụ xe
  getAllPhuXeNames,
  addPhuXeName,
  deletePhuXeName,
};
