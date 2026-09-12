import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// ==========================
// 📥 GET ALL (có filter + phân trang)
// LƯU Ý: khi gọi cho màn Nhập/Xuất, luôn truyền loai: "nhap" | "xuat"
// ==========================
const getAllBaoBi = async (params = {}) => {
  try {
    const results = await requestService.get(
      URL.baobi.baobi,
      params,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllBaoBi:", error);
  }
};

// ==========================
// 📥 GET BY ID
// ==========================
const getBaoBiById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.baobi.baobi}/${id}`,
      {},
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getBaoBiById:", error);
  }
};

// ==========================
// 🔍 GET BY MÃ CỬA HÀNG
// ==========================
const getBaoBiByMaCH = async (ma_ch) => {
  try {
    const results = await requestService.get(
      `${URL.baobi.baobi}/search/ma-ch`,
      { ma_ch },
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getBaoBiByMaCH:", error);
    return [];
  }
};

// ==========================
// ➕ ADD 1 (NHẬP)
// ==========================
const createBaoBi = async (payload) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const results = await requestService.post(
      URL.baobi.baobi,
      payload,
      {
        "x-user-name": user?.name || "Unknown",
      },
      ApiServer,
    );

    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createBaoBi:", error);
    throw error;
  }
};

// ==========================
// ➕ ADD 1 (XUẤT)
// ==========================
const createXuatBaoBi = async (payload) => {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");

    const results = await requestService.post(
      `${URL.baobi.baobi}/xuat`,
      payload,
      {
        "x-user-name": user?.name || "Unknown",
      },
      ApiServer,
    );

    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createXuatBaoBi:", error);
    throw error;
  }
};

// ==========================
// 📦 CREATE MANY (import Excel) — dùng chung cho cả Nhập lẫn Xuất
// payload dạng: { items: [ {...nhap...} | {...xuat...}, ... ] }
// ==========================
const createManyBaoBi = async (payload) => {
  try {
    const results = await requestService.post(
      `${URL.baobi.baobi}/many`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createManyBaoBi:", error);
    throw error;
  }
};

// ==========================
// 🔄 UPDATE (sửa thô, không tự tính lại lũy kế)
// ==========================
const updateBaoBi = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.baobi.baobi}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateBaoBi:", error);
    throw error;
  }
};

// ==========================
// ❌ DELETE 1
// ==========================
const deleteBaoBiById = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.baobi.baobi}/${id}`,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteBaoBiById:", error);
  }
};

// ==========================
// 📊 Tồn kho tổng quan tất cả SKU (card "Tồn Kho Hiện Tại")
// ==========================
const getTonKhoTatCa = async (params = {}) => {
  try {
    const results = await requestService.get(
      `${URL.baobi.baobi}/ton-kho-tat-ca`,
      params,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getTonKhoTatCa:", error);
    return { data: [] };
  }
};

// ==========================
// 📊 Tồn hiện tại theo SKU (dùng cho form Nhập)
// ==========================
const getTonHienTaiBySku = async (sku) => {
  try {
    const results = await requestService.get(
      `${URL.baobi.baobi}/ton-hien-tai`,
      { sku },
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getTonHienTaiBySku:", error);
    return null;
  }
};

// ==========================
// 📊 Kiểm tra khả dụng xuất theo SKU (dùng cho form Xuất)
// - exists_in_kho: false -> SKU chưa từng nhập, chặn xuất
// - ton_kha_dung: số lượng tối đa được phép xuất
// ==========================
const getKhaDungXuatBySku = async (sku) => {
  try {
    const results = await requestService.get(
      `${URL.baobi.baobi}/kha-dung-xuat`,
      { sku },
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getKhaDungXuatBySku:", error);
    return null;
  }
};

// ==========================
export const baoBiService = {
  getAllBaoBi,
  getBaoBiById,
  getBaoBiByMaCH,
  createBaoBi,
  createXuatBaoBi,
  createManyBaoBi,
  updateBaoBi,
  deleteBaoBiById,
  getTonHienTaiBySku,
  getKhaDungXuatBySku,
  getTonKhoTatCa,
};
