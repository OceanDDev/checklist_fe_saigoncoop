import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

//
// ==============================
// 🛠️ API CHÍNH — QUẢN LÝ THIẾT BỊ (TTB)
// ==============================
//

// ✅ Lấy danh sách tất cả TTB
// ✅ Lấy danh sách tất cả TTB (đã tích hợp search)
const getAllTtb = async (params = {}) => {
  try {
    // Chuẩn bị params cho API
    const queryParams = {};

    // Pagination
    queryParams.limit = params.limit || 999999;
    queryParams.page = params.page || 1;

    // Search fields
    if (params.so_bb) {
      queryParams.so_bb = params.so_bb;
    }

    if (params.ma_cua_hang) {
      queryParams.ma_cua_hang = params.ma_cua_hang;
    }

    if (params.tai_xe) {
      queryParams.tai_xe = params.tai_xe;
    }

    if (params.bien_so_xe) {
      queryParams.bien_so_xe = params.bien_so_xe;
    }

    // Date range
    if (params.date_range && Array.isArray(params.date_range)) {
      const [startDate, endDate] = params.date_range;
      if (startDate) {
        queryParams.ngay_di_start = startDate.format("YYYY-MM-DD");
      }
      if (endDate) {
        queryParams.ngay_di_end = endDate.format("YYYY-MM-DD");
      }
    }

    console.log("🔍 getAllTtb params:", queryParams);

    const results = await requestService.get(
      URL.ttb.ttb, // GET /api/ttb
      queryParams,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllTtb:", error);
    return null;
  }
};

// ✅ Thêm 1 TTB
const addTtb = async (data) => {
  try {
    const results = await requestService.post(
      URL.ttb.ttb, // POST /api/ttb
      data,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi addTtb:", error);
    return null;
  }
};

// ✅ Thêm nhiều TTB cùng lúc
const addManyTtb = async (ttbList) => {
  try {
    const results = await requestService.post(
      `${URL.ttb.ttb}/add-many`, // POST /api/ttb/add-many
      { ttbList },
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi addManyTtb:", error);
    return null;
  }
};

// ✅ Lấy TTB theo ID
const getTtbById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.ttb.ttb}/${id}`, // GET /api/ttb/:id
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getTtbById:", error);
    return null;
  }
};

// ✅ Cập nhật TTB
const updateTtb = async (id, data) => {
  try {
    const results = await requestService.put(
      `${URL.ttb.ttb}/${id}`, // PUT /api/ttb/:id
      data,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateTtb:", error);
    return null;
  }
};

// ✅ Cập nhật nhiều TTB cùng lúc
const updateManyTtb = async (updates) => {
  try {
    const results = await requestService.put(
      `${URL.ttb.ttb}/update-many`, // PUT /api/ttb/update-many
      { updates },
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateManyTtb:", error);
    return null;
  }
};

// ✅ Xóa TTB
const deleteTtb = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.ttb.ttb}/${id}`, // DELETE /api/ttb/:id
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteTtb:", error);
    return null;
  }
};

// ✅ Xóa nhiều TTB
const deleteManyTtb = async (ids) => {
  try {
    const results = await requestService.del(
      `${URL.ttb.ttb}/bulk/delete`, // DELETE /api/ttb/bulk/delete
      { ids },
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteManyTtb:", error);
    return null;
  }
};

// ✅ Lấy thống kê TTB theo cửa hàng
const getStatsByStore = async () => {
  try {
    const results = await requestService.get(
      `${URL.ttb.ttb}/stats`, // GET /api/ttb/stats
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getStatsByStore:", error);
    return null;
  }
};

//
// ==============================
// 🔧 QUẢN LÝ CẤU HÌNH THIẾT BỊ
// ==============================
//

// ✅ Lấy danh sách tất cả thiết bị config
const getAllThietBi = async () => {
  try {
    const results = await requestService.get(
      URL.ttb.thietbi, // GET /api/thietbi
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllThietBi:", error);
    return null;
  }
};

// ✅ Thêm thiết bị mới
const addThietBi = async (data) => {
  try {
    const results = await requestService.post(
      URL.ttb.thietbi, // POST /api/thietbi
      data,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi addThietBi:", error);
    return null;
  }
};

// ✅ Cập nhật thiết bị
const updateThietBi = async (id, data) => {
  try {
    const results = await requestService.put(
      `${URL.ttb.thietbi}/${id}`, // PUT /api/thietbi/:id
      data,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateThietBi:", error);
    return null;
  }
};

// ✅ Xóa thiết bị
const deleteThietBi = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.ttb.thietbi}/${id}`, // DELETE /api/thietbi/:id
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteThietBi:", error);
    return null;
  }
};

//
// ==============================
// 📦 Xuất các hàm dùng chung
// ==============================
//

export const ttbService = {
  // 🛠️ Quản lý thiết bị (TTB)
  getAllTtb,
  addTtb,
  addManyTtb,
  getTtbById,
  updateTtb,
  updateManyTtb,
  deleteTtb,
  deleteManyTtb,
  getStatsByStore,

  // 🔧 Quản lý cấu hình thiết bị
  getAllThietBi,
  addThietBi,
  updateThietBi,
  deleteThietBi,
};
