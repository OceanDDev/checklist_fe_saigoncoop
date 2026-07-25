import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// ==========================
// 📥 GET ALL (có thể truyền query filter: page, limit, ma_ch, loai_ttb, so_bbgn, keyword, tu_ngay, den_ngay, ky)
// ==========================
const getAllTrangThietBi = async (params = {}) => {
  try {
    const results = await requestService.get(
      URL.trangthietbi.trangthietbi,
      params,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllTrangThietBi:", error);
  }
};

// ==========================
// 📥 Lấy danh sách loại TTB (distinct trực tiếp từ dữ liệu, không cần danh mục riêng)
// ==========================
const getDistinctLoaiTTB = async () => {
  try {
    const results = await requestService.get(
      `${URL.trangthietbi.trangthietbi}/loai-ttb`,
      {},
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getDistinctLoaiTTB:", error);
  }
};

// ==========================
// 📥 GET BY ID
// ==========================
const getTrangThietBiById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.trangthietbi.trangthietbi}/${id}`,
      {},
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getTrangThietBiById:", error);
  }
};

// ==========================
// ➕ ADD 1
// ==========================
const createTrangThietBi = async (payload) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const results = await requestService.post(
      URL.trangthietbi.trangthietbi,
      payload,
      {
        "x-user-name": user?.name || "Unknown",
      },
      ApiServer,
    );

    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createTrangThietBi:", error);
    throw error;
  }
};

// ==========================
// ➕ IMPORT NHIỀU (bulk-create) — nhận file Excel Đối Lưu Trang Thiết Bị
// ==========================
const createManyTrangThietBi = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const results = await requestService.post(
      `${URL.trangthietbi.trangthietbi}/bulk-create`,
      formData,
      { "Content-Type": "multipart/form-data" },
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createManyTrangThietBi:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE
// ==========================
const updateTrangThietBi = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.trangthietbi.trangthietbi}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateTrangThietBi:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE NHIỀU (bulk-update) — payload: { ids: [...], data: {...} }
// ==========================
const bulkUpdateTrangThietBi = async (payload) => {
  try {
    const results = await requestService.put(
      `${URL.trangthietbi.trangthietbi}/bulk-update`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi bulkUpdateTrangThietBi:", error);
    throw error;
  }
};

// ==========================
// ❌ DELETE 1
// ==========================
const deleteTrangThietBiById = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.trangthietbi.trangthietbi}/${id}`,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteTrangThietBiById:", error);
  }
};

// ==========================
// ❌ DELETE NHIỀU (bulk-delete) — payload: { ids: [...] }
// ==========================
const deleteManyTrangThietBi = async (ids) => {
  try {
    const results = await requestService.del(
      `${URL.trangthietbi.trangthietbi}/bulk-delete`,
      { ids },
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteManyTrangThietBi:", error);
    throw error;
  }
};

// ==========================
// ❌ DELETE ALL
// ==========================
const deleteAllTrangThietBi = async () => {
  try {
    const results = await requestService.del(
      `${URL.trangthietbi.trangthietbi}/delete-all`,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteAllTrangThietBi:", error);
    throw error;
  }
};

// ==========================
// 📦 TỒN KHO THEO CỬA HÀNG (ma_ch + loai_ttb + ky) — bảng "Cửa hàng còn nợ kho vận"
// ==========================

// 📥 GET bảng tồn kho — bắt buộc truyền ky (VD: "2026-06"), có thể lọc thêm ma_ch / loai_ttb
const getBangTonKhoCuaHang = async (params = {}) => {
  try {
    const results = await requestService.get(
      URL.trangthietbi.tonkhocuahang,
      params,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getBangTonKhoCuaHang:", error);
  }
};

// 📥 GET BY ID
const getTonKhoCuaHangById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.trangthietbi.tonkhocuahang}/${id}`,
      {},
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getTonKhoCuaHangById:", error);
  }
};

// 🔒 Chốt kỳ theo từng cửa hàng — tự động aggregate từ TrangThietBi và tính tồn cuối kỳ
// payload: { ky: "2026-06" }
const chotKyTheoCuaHang = async (payload) => {
  try {
    const results = await requestService.post(
      `${URL.trangthietbi.tonkhocuahang}/chot-ky`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi chotKyTheoCuaHang:", error);
    throw error;
  }
};

// 🔄 UPDATE tay 1 record tồn kho — payload: { ton_dau_ky?, tong_giao?, tong_tra? }
const updateTonKhoCuaHang = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.trangthietbi.tonkhocuahang}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateTonKhoCuaHang:", error);
    throw error;
  }
};

// ❌ DELETE 1 record tồn kho (dùng khi chốt nhầm kỳ)
const deleteTonKhoCuaHangById = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.trangthietbi.tonkhocuahang}/${id}`,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteTonKhoCuaHangById:", error);
  }
};

// ==========================
export const trangThietBiService = {
  getAllTrangThietBi,
  getDistinctLoaiTTB,
  getTrangThietBiById,
  createTrangThietBi,
  createManyTrangThietBi,
  updateTrangThietBi,
  bulkUpdateTrangThietBi,
  deleteTrangThietBiById,
  deleteManyTrangThietBi,
  deleteAllTrangThietBi,
  getBangTonKhoCuaHang,
  getTonKhoCuaHangById,
  chotKyTheoCuaHang,
  updateTonKhoCuaHang,
  deleteTonKhoCuaHangById,
};
