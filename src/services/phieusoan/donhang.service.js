// services/donhang.service.js
import { URL } from "@/configs/api-request";
import { requestService } from "../request.service";

/** Helper: build query string cho pagination và filter */
const buildQueryString = (params = {}) => {
  const {
    page = 1,
    limit = 10,
    // Old filters
    madonhang = "",
    khachhang = "",
    trangthai = "",
    ngaytao = "",
    // New filters from DonHangTable
    store = "",
    type = "",
    soda_transfer = "",
    sku = "",
    name = "",
    startDate = "",
    endDate = "",
    minLuong = "",
    maxLuong = "",
    search = "",
  } = params;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  // Old filters
  if (madonhang) qs.set("madonhang", madonhang);
  if (khachhang) qs.set("khachhang", khachhang);
  if (trangthai) qs.set("trangthai", trangthai);
  if (ngaytao) qs.set("ngaytao", ngaytao);

  // New filters
  if (store) qs.set("store", store);
  if (type) qs.set("type", type);
  if (soda_transfer) qs.set("soda_transfer", soda_transfer);
  if (sku) qs.set("sku", sku);
  if (name) qs.set("name", name);
  if (startDate) qs.set("startDate", startDate);
  if (endDate) qs.set("endDate", endDate);
  if (minLuong !== "" && minLuong !== undefined)
    qs.set("minLuong", String(minLuong));
  if (maxLuong !== "" && maxLuong !== undefined)
    qs.set("maxLuong", String(maxLuong));
  if (search) qs.set("search", search);

  return qs.toString();
};
/** GET: lấy toàn bộ đơn hàng (có phân trang + filter) */
const getAllDonHang = async (params = {}) => {
  try {
    const query = buildQueryString(params);
    const path = `${URL.phieusoan.donhang}?${query}`;
    const results = await requestService.get(path);
    return results;
  } catch (error) {
    console.error("Lỗi getAllDonHang:", error);
    throw error;
  }
};

/** GET: tìm kiếm đơn hàng */
const searchDonHang = async (params = {}) => {
  try {
    const query = buildQueryString(params);
    const path = `${URL.phieusoan.donhang}/search?${query}`;
    const results = await requestService.get(path);
    return results;
  } catch (error) {
    console.error("Lỗi searchDonHang:", error);
    throw error;
  }
};

/** GET: lấy đơn hàng theo ID */
const getDonHangById = async (id) => {
  try {
    const path = `${URL.phieusoan.donhang}/${id}`;
    const result = await requestService.get(path);
    return result;
  } catch (error) {
    console.error("Lỗi getDonHangById:", error);
    throw error;
  }
};

/** POST: tạo đơn hàng mới */
const createDonHang = async (payload) => {
  try {
    const path = URL.phieusoan.donhang;
    const results = await requestService.post(path, payload);
    return results;
  } catch (error) {
    console.error("Lỗi createDonHang:", error);
    throw error;
  }
};

/** POST: tạo nhiều đơn hàng */
const createManyDonHang = async (payload) => {
  try {
    const rawData = Array.isArray(payload) ? payload : payload.donHangs;
    
    // Normalize inline
    const donHangs = rawData
      .map(item => ({
        store: item.store || item.STORE || item.maCH,
        type: item.type || item.TYPE,
        soda_transfer: item.soda_transfer || item.SODA_TRANSFER,
        sku: Number(item.sku || item.SKU),
        name: item.name || item.NAME,
        luong: Number(item.luong || item.LUONG || 0),
      }))
      .filter(item => item.store && item.type && item.sku && item.name);

    if (donHangs.length === 0) throw new Error("Không có dữ liệu hợp lệ");

    return await requestService.post(
      `${URL.phieusoan.donhang}/many`,
      { donHangs }
    );
  } catch (error) {
    console.error("Lỗi:", error);
    throw error;
  }
};

/** PUT: cập nhật đơn hàng theo ID */
const updateDonHang = async (id, payload) => {
  try {
    const path = `${URL.phieusoan.donhang}/${id}`;
    const results = await requestService.put(path, payload);
    return results;
  } catch (error) {
    console.error("Lỗi updateDonHang:", error);
    throw error;
  }
};
 const checkDuplicateDonHang =  async (donHangs) => {
    try {
      const path = `${URL.phieusoan.donhang}/check-duplicate`;
      const response = await requestService.post(path, { donHangs });
      return response;
    } catch (error) {
      console.error('Error checking duplicate:', error);
      throw error;
    }
  }
/** PUT: cập nhật trạng thái đơn hàng */
const updateTrangThai = async (id, payload) => {
  try {
    const path = `${URL.phieusoan.donhang}/${id}/trangthai`;
    const results = await requestService.put(path, payload);
    return results;
  } catch (error) {
    console.error("Lỗi updateTrangThai:", error);
    throw error;
  }
};

/** DELETE: xóa đơn hàng theo ID */
const deleteDonHang = async (id) => {
  try {
    const path = `${URL.phieusoan.donhang}/${id}`;
    const results = await requestService.del(path);
    return results;
  } catch (error) {
    console.error("Lỗi deleteDonHang:", error);
    throw error;
  }
};

/** POST: xóa nhiều đơn hàng */
const deleteManyDonHang = async () => {
  try {
    const path = `${URL.phieusoan.donhang}/clear-all`;
    const payload = { confirmation: "DELETE_ALL" };
    const results = await requestService.post(path, payload);
    return results;
  } catch (error) {
    console.error("Lỗi clearAllDonHang:", error);
    throw error;
  }
};

export const donHangService = {
  getAllDonHang, // GET /donhang?page=1&limit=10&search=...
  searchDonHang, // GET /donhang/search?...
  getDonHangById, // GET /donhang/:id
  createDonHang, // POST /donhang
  createManyDonHang, // POST /donhang/many
  updateDonHang, // PUT /donhang/:id
  updateTrangThai, // PUT /donhang/:id/trangthai
  deleteDonHang, // DELETE /donhang/:id
  deleteManyDonHang, // POST /donhang/many/delete
  checkDuplicateDonHang
};
