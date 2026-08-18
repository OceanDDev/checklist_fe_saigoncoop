// services/phieusoan/nhanSuSoan.service.js
import { URL, ApiServer } from "@/configs/api-request";

/** Helper: build query string cho pagination và filter */
const buildQueryString = (params = {}) => {
  const {
    page = 1,
    limit = 50,
    soDonHang = "",
    soPhieuGop = "",
    trangThai = "",
    maNXD = "",
    noiXuatDen = "",
    chuyen = "",
    lichDiHang = "",
    nvSoan = "",
    nvKC = "",
    tuNgay = "",
    denNgay = "",
    tuNgayHT = "",
    denNgayHT = "",
    tuNgayNP = "",
    denNgayNP = "",
  } = params;

  const qs = new URLSearchParams();
  qs.set("page", String(page));
  qs.set("limit", String(limit));

  if (soDonHang) qs.set("soDonHang", soDonHang);
  if (soPhieuGop) qs.set("soPhieuGop", soPhieuGop);
  if (trangThai) qs.set("trangThai", trangThai);
  if (maNXD) qs.set("maNXD", maNXD);
  if (noiXuatDen) qs.set("noiXuatDen", noiXuatDen);
  if (chuyen) qs.set("chuyen", chuyen);
  if (lichDiHang) qs.set("lichDiHang", lichDiHang);
  if (nvSoan) qs.set("nvSoan", nvSoan);
  if (nvKC) qs.set("nvKC", nvKC);
  if (tuNgay) qs.set("tuNgay", tuNgay);
  if (denNgay) qs.set("denNgay", denNgay);
  if (tuNgayHT) qs.set("tuNgayHT", tuNgayHT);
  if (denNgayHT) qs.set("denNgayHT", denNgayHT);
  if (tuNgayNP) qs.set("tuNgayNP", tuNgayNP);
  if (denNgayNP) qs.set("denNgayNP", denNgayNP);

  return qs.toString();
};

/** GET: lấy toàn bộ phiếu nhân sự soạn (có phân trang + filter) */
const getAllNhanSuSoan = async (params = {}) => {
  try {
    const query = buildQueryString(params);
    const path = query
      ? `${URL.phieusoan.nhansusoan}?${query}`
      : URL.phieusoan.nhansusoan;
    const response = await ApiServer.get(path);
    return response.data;
  } catch (error) {
    console.error("Lỗi getAllNhanSuSoan:", error);
    throw error;
  }
};

/** GET: lấy phiếu nhân sự soạn theo ID */
const getNhanSuSoanById = async (id) => {
  try {
    const response = await ApiServer.get(`${URL.phieusoan.nhansusoan}/${id}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi getNhanSuSoanById:", error);
    throw error;
  }
};

/** POST: tạo phiếu nhân sự soạn mới */
const createNhanSuSoan = async (payload) => {
  try {
    const response = await ApiServer.post(URL.phieusoan.nhansusoan, payload);
    return response.data;
  } catch (error) {
    console.error("Lỗi createNhanSuSoan:", error);
    throw error;
  }
};

/** POST: import nhiều phiếu nhân sự soạn */
const importManyNhanSuSoan = async (data) => {
  try {
    const response = await ApiServer.post(
      `${URL.phieusoan.nhansusoan}/import`,
      { data },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi importManyNhanSuSoan:", error);
    throw error;
  }
};

/** PUT: cập nhật 1 phiếu nhân sự soạn theo ID */
const updateNhanSuSoan = async (id, payload) => {
  try {
    const response = await ApiServer.put(
      `${URL.phieusoan.nhansusoan}/${id}`,
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi updateNhanSuSoan:", error);
    throw error;
  }
};

/**
 * PUT: cập nhật nhiều phiếu nhân sự soạn
 * - Cùng 1 nội dung cho nhiều id: updateManyNhanSuSoan({ ids, data })
 * - Mỗi phiếu 1 nội dung riêng:   updateManyNhanSuSoan({ updates: [{ id, data }] })
 */
const updateManyNhanSuSoan = async (payload) => {
  try {
    const response = await ApiServer.put(
      `${URL.phieusoan.nhansusoan}/update-many`,
      payload,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi updateManyNhanSuSoan:", error);
    throw error;
  }
};

/**
 * PUT: cập nhật trạng thái Book Xe cho nhiều phiếu
 * body: { ids: [...], trangThaiBookXe: "Chờ Book" | "Chờ Xe" | "Hoàn thành" }
 */
const updateTrangThaiBookXe = async (ids, trangThaiBookXe) => {
  try {
    const response = await ApiServer.put(
      `${URL.phieusoan.nhansusoan}/update-trang-thai-book-xe`,
      { ids, trangThaiBookXe },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi updateTrangThaiBookXe:", error);
    throw error;
  }
};

/** DELETE: xóa 1 phiếu nhân sự soạn theo ID */
const deleteNhanSuSoan = async (id) => {
  try {
    const response = await ApiServer.delete(
      `${URL.phieusoan.nhansusoan}/${id}`,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi deleteNhanSuSoan:", error);
    throw error;
  }
};

/** DELETE: xóa nhiều phiếu nhân sự soạn theo danh sách IDs */
const deleteManyNhanSuSoan = async (ids) => {
  try {
    const response = await ApiServer.delete(
      `${URL.phieusoan.nhansusoan}/many`,
      {
        data: { ids },
      },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi deleteManyNhanSuSoan:", error);
    throw error;
  }
};

/** DELETE: xóa toàn bộ phiếu nhân sự soạn */
const deleteAllNhanSuSoan = async () => {
  try {
    const response = await ApiServer.delete(
      `${URL.phieusoan.nhansusoan}/delete-all`,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi deleteAllNhanSuSoan:", error);
    throw error;
  }
};
const importUpdateNhanSuSoan = async (data) => {
  try {
    const response = await ApiServer.post(
      `${URL.phieusoan.nhansusoan}/import-update`,
      { data },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi importUpdateNhanSuSoan:", error);
    throw error;
  }
};
const addGiaoKhach = async (data) => {
  try {
    const response = await ApiServer.post(
      `${URL.phieusoan.nhansusoan}/add-giao-khach`,
      { data },
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi addGiaoKhach:", error);
    throw error;
  }
};
const getTopNangSuatCongKhai = async (ngay = "") => {
  try {
    const query = ngay ? `?ngay=${ngay}` : "";
    const response = await ApiServer.get(
      `${URL.phieusoan.nhansusoan}/top-nang-suat-cong-khai${query}`,
    );
    return response.data;
  } catch (error) {
    console.error("Lỗi getTopNangSuatCongKhai:", error);
    throw error;
  }
};
export const nhanSuSoanService = {
  getAllNhanSuSoan, // GET    /api/saigoncoop/nhansusoan?page=1&limit=50&...
  getNhanSuSoanById, // GET    /api/saigoncoop/nhansusoan/:id
  createNhanSuSoan, // POST   /api/saigoncoop/nhansusoan
  importManyNhanSuSoan, // POST   /api/saigoncoop/nhansusoan/import
  updateNhanSuSoan, // PUT    /api/saigoncoop/nhansusoan/:id
  updateManyNhanSuSoan, // PUT    /api/saigoncoop/nhansusoan/update-many
  updateTrangThaiBookXe, // PUT    /api/saigoncoop/nhansusoan/update-trang-thai-book-xe
  deleteNhanSuSoan, // DELETE /api/saigoncoop/nhansusoan/:id
  deleteManyNhanSuSoan, // DELETE /api/saigoncoop/nhansusoan/many
  deleteAllNhanSuSoan, // DELETE /api/saigoncoop/nhansusoan/delete-all
  importUpdateNhanSuSoan,
  addGiaoKhach,
  getTopNangSuatCongKhai
};
