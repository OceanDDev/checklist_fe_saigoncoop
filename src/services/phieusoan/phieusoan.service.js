// services/phieusoan.service.js
import { URL } from "@/configs/api-request";
import { requestService } from "../request.service";

/** Helper: build query string cho pagination và filter */
const buildQueryString = (params = {}) => {
  const {
    page = 1,
    limit = 10,
    trang_thai = "",
    type = "",
    store = "",
    sku = "",
    soda_transfer = "",
    chan_le = "",
    loai_hang = "Bình thường",
    search = "",
    tu_ngay = "",
    den_ngay = "",
    ngay = "",
    phieu_soan_id = "",
    // 👇 NEW filters
    maNCC = "",
    maNH = "",
    Dept = "",
    SubDept = "",
  } = params;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  if (trang_thai !== "") qs.set("trang_thai", trang_thai);
  if (type) qs.set("type", String(type).trim());
  if (store) qs.set("store", String(store).trim());
  if (sku) qs.set("sku", String(sku).trim());
  if (soda_transfer) qs.set("soda_transfer", String(soda_transfer).trim());
  if (chan_le) qs.set("chan_le", String(chan_le).trim());

  if (loai_hang) qs.set("loai_hang", String(loai_hang).trim());
  if (search) qs.set("search", String(search).trim());
  if (phieu_soan_id) qs.set("phieu_soan_id", String(phieu_soan_id).trim());

  // ⏱ Date filters
  if (ngay) {
    qs.set("ngay", ngay);
  } else {
    if (tu_ngay) qs.set("tu_ngay", tu_ngay);
    if (den_ngay) qs.set("den_ngay", den_ngay);
  }

  // 🔎 NEW: 4 field search
  if (maNCC) qs.set("maNCC", String(maNCC).trim());
  if (maNH) qs.set("maNH", String(maNH).trim());
  if (Dept) qs.set("Dept", String(Dept).trim());
  if (SubDept) qs.set("SubDept", String(SubDept).trim());

  return qs.toString();
};

/** POST: Xử lý tạo phiếu soạn từ đơn hàng */
const processOrders = async (payload) => {
  try {
    const { donHangIds } = payload;
    if (!Array.isArray(donHangIds) || donHangIds.length === 0) {
      throw new Error("Danh sách ID đơn hàng không hợp lệ");
    }
    const path = `${URL.phieusoan.phieusoan}/process`;
    return await requestService.post(path, { donHangIds });
  } catch (error) {
    console.error("❌ Lỗi processOrders:", error);
    throw error;
  }
};

/** GET: Lấy toàn bộ phiếu soạn (mặc định chỉ hàng bình thường) */
const getAllPhieuSoan = async (params = {}, signal) => {
  try {
    if (!params.loai_hang) {
      params.loai_hang = "Bình thường";
    }
    const query = buildQueryString(params);
    const path = `${URL.phieusoan.phieusoan}?${query}`;

    // ⚠️ Hỗ trợ AbortSignal
    return await requestService.get(path, { signal });
    // Nếu requestService.get không nhận options, dùng:
    // return await fetch(path, { method: "GET", headers: { "Content-Type": "application/json" }, signal }).then(r => r.json());
  } catch (error) {
    console.error("❌ Lỗi getAllPhieuSoan:", error);
    throw error;
  }
};

/** GET: Lấy phiếu soạn theo ID */
const getPhieuSoanById = async (id) => {
  try {
    const path = `${URL.phieusoan.phieusoan}/${id}`;
    return await requestService.get(path);
  } catch (error) {
    console.error("❌ Lỗi getPhieuSoanById:", error);
    throw error;
  }
};

/** GET: Lấy phiếu soạn theo mã phiếu soạn (phieu_soan_id) */
const getPhieuSoanByCode = async (phieu_soan_id) => {
  try {
    const params = { phieu_soan_id, limit: 1 };
    const results = await getAllPhieuSoan(params);
    const data = Array.isArray(results?.data) ? results.data : [];
    if (data.length === 0) {
      throw new Error(`Không tìm thấy phiếu soạn với mã: ${phieu_soan_id}`);
    }
    return data[0];
  } catch (error) {
    console.error("❌ Lỗi getPhieuSoanByCode:", error);
    throw error;
  }
};

/** GET: Lấy thống kê phiếu soạn */
const getStatistics = async () => {
  try {
    const path = `${URL.phieusoan.phieusoan}/statistics`;
    return await requestService.get(path);
  } catch (error) {
    console.error("❌ Lỗi getStatistics:", error);
    throw error;
  }
};

/** PUT: Cập nhật trạng thái phiếu soạn */
const updateStatus = async (id, trang_thai) => {
  try {
    const path = `${URL.phieusoan.phieusoan}/${id}/status`;
    return await requestService.put(path, { trang_thai });
  } catch (error) {
    console.error("❌ Lỗi updateStatus:", error);
    throw error;
  }
};

/** PUT: Cập nhật phiếu soạn */
const updatePhieuSoan = async (id, payload) => {
  try {
    const path = `${URL.phieusoan.phieusoan}/${id}`;

    // Chỉ tính lại khi có đủ pack & luong
    if (payload.pack !== undefined && payload.luong !== undefined) {
      const pack = payload.pack;
      const luong = payload.luong;
      payload.kien_hang = pack > 0 ? Math.floor(luong / pack) : 0;
    } else if (payload.pack !== undefined || payload.luong !== undefined) {
      console.log(
        `⚠️ Chỉ cập nhật ${payload.pack !== undefined ? "pack" : "luong"}, backend sẽ tự tính kien_hang`
      );
    }

    return await requestService.put(path, payload);
  } catch (error) {
    console.error("❌ Lỗi updatePhieuSoan:", error);
    throw error;
  }
};

/** DELETE: Xóa phiếu soạn theo ID */
const deletePhieuSoan = async (id) => {
  try {
    const path = `${URL.phieusoan.phieusoan}/${id}`;
    return await requestService.del(path);
  } catch (error) {
    console.error("❌ Lỗi deletePhieuSoan:", error);
    throw error;
  }
};

/** POST: Xóa nhiều phiếu soạn */
const deleteManyPhieuSoan = async (ids) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Danh sách ID không hợp lệ");
    }
    const path = `${URL.phieusoan.phieusoan}/delete-many`;
    return await requestService.post(path, { ids });
  } catch (error) {
    console.error("❌ Lỗi deleteManyPhieuSoan:", error);
    throw error;
  }
};

const updateManyPhieuSoan = async (ids, updateData) => {
  try {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new Error("Danh sách ID không hợp lệ");
    }
    if (!updateData || typeof updateData !== "object") {
      throw new Error("updateData phải là object");
    }
    const path = `${URL.phieusoan.phieusoan}/update-many`;
    return await requestService.put(path, { ids, updateData });
  } catch (error) {
    console.error("❌ Lỗi updateManyPhieuSoan:", error);
    throw error;
  }
};

/** POST: Xóa tất cả phiếu soạn */
const deleteAllPhieuSoan = async () => {
  try {
    const path = `${URL.phieusoan.phieusoan}/delete-all`;
    return await requestService.post(path, { confirm: "DELETE_ALL" });
  } catch (error) {
    console.error("❌ Lỗi deleteAllPhieuSoan:", error);
    throw error;
  }
};

// ==================== HÀNG ĐẶC THÙ (PACK = 1) ====================

const getSpecialOrders = async (params = {}) => {
  try {
    const query = buildQueryString(params);
    const path = `${URL.phieusoan.phieusoan}/special-orders?${query}`;
    return await requestService.get(path);
  } catch (error) {
    console.error("❌ Lỗi getSpecialOrders:", error);
    throw error;
  }
};

const getSpecialOrdersCount = async () => {
  try {
    const path = `${URL.phieusoan.phieusoan}/special-orders/count`;
    const response = await requestService.get(path);
    return response?.data?.count || 0;
  } catch (error) {
    console.error("❌ Lỗi getSpecialOrdersCount:", error);
    return 0;
  }
};

const updateSpecialChanLe = async (updates) => {
  try {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new Error("Danh sách updates không hợp lệ");
    }
    const path = `${URL.phieusoan.phieusoan}/update-special-chan-le`;
    return await requestService.post(path, { updates });
  } catch (error) {
    console.error("❌ Lỗi updateSpecialChanLe:", error);
    throw error;
  }
};

// ==================== HELPERS ====================

const calculateTotalQuantity = (chi_tiet) => {
  if (!Array.isArray(chi_tiet)) return 0;
  return chi_tiet.reduce((sum, item) => sum + (item.so_luong_lay || 0), 0);
};

const calculateKienHang = (luong, pack) => {
  if (!pack || pack <= 0) return 0;
  if (!luong || luong <= 0) return 0;
  return Math.floor(luong / pack);
};

const formatDateForAPI = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const getTodayString = () => formatDateForAPI(new Date());

const getDaysAgoString = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return formatDateForAPI(date);
};

// ✅ Validate format: STORE-C/L-DDMMYYYY (vd: CH00224-C-20102025)
const validatePhieuSoanId = (phieu_soan_id) => {
  if (!phieu_soan_id) return false;
  const regex = /^.+-[CL]-\d{8}(-\d+)?$/;
  return regex.test(phieu_soan_id);
};

const generatePhieuSoanId = (store = "CH00224", chanLe = "Chẵn") => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, "0");
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const year = today.getFullYear();
  const chanLeChar = chanLe.charAt(0); // C hoặc L
  return `${store}-${chanLeChar}-${day}${month}${year}`;
};

export const phieuSoanService = {
  // Core CRUD
  getAllPhieuSoan,
  getPhieuSoanById,
  getPhieuSoanByCode,
  getStatistics,
  updatePhieuSoan,
  updateStatus,
  deletePhieuSoan,
  deleteManyPhieuSoan,
  deleteAllPhieuSoan,
  updateManyPhieuSoan,

  // Order Processing
  processOrders,

  // Special Orders
  getSpecialOrders,
  getSpecialOrdersCount,
  updateSpecialChanLe,

  // Helpers
  calculateTotalQuantity,
  calculateKienHang,
  formatDateForAPI,
  getTodayString,
  getDaysAgoString,
  validatePhieuSoanId,
  generatePhieuSoanId,
};
