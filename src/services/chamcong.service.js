import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// 🧭 Lấy danh sách chấm công (có thể filter theo query)
const getAllChamCong = async (params = {}) => {
  try {
    const results = await requestService.get(
      URL.chamcong.chamcong,
      params,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllChamCong:", error);
    throw error;
  }
};

// 🔍 Lấy chi tiết 1 bản ghi chấm công
const getChamCongById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.chamcong.chamcong}/${id}`,
      {},
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getChamCongById:", error);
    throw error;
  }
};

// 🕒 Gửi yêu cầu chấm công (check-in/out)
const checkChamCong = async (payload) => {
  try {
    const results = await requestService.post(
      `${URL.chamcong.chamcong}/check`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi checkChamCong:", error);
    throw error; // giữ nguyên error.response để component đọc được
  }
};

// 📝 Cập nhật ghi chú chấm công
const updateGhiChu = async (id, payload) => {
  try {
    const results = await requestService.patch(
      `${URL.chamcong.chamcong}/${id}/ghi-chu`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateGhiChu:", error);
    throw error;
  }
};

// ❌ Xóa 1 bản ghi chấm công
const deleteChamCong = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.chamcong.chamcong}/${id}`,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteChamCong:", error);
    throw error;
  }
};

// 🧺 Xóa nhiều bản ghi cùng lúc
const deleteManyChamCong = async (ids) => {
  try {
    const results = await requestService.post(
      `${URL.chamcong.chamcong}/delete-many`,
      { ids },
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteManyChamCong:", error);
    throw error;
  }
};

const trangThaiHomNay = async (ma_nhan_vien) => {
  try {
    const results = await requestService.get(
      `${URL.chamcong.chamcong}/trang-thai-hom-nay`,
      { ma_nhan_vien },
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi trangThaiHomNay:", error);
    throw error;
  }
};

const getCurrentQr = async () => {
  try {
    const results = await requestService.get(
      `${URL.chamcong.chamcong}/qr/current`,
      {},
      undefined,
      ApiServer,
    );
    console.log("🔍 getCurrentQr raw:", results);
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getCurrentQr:", error);
    throw error;
  }
};

// 🔐 Chấm công qua QR
const checkChamCongQR = async (payload) => {
  // ⚠️  KHÔNG bọc try/catch ở đây
  //     Để error.response (chứa blocked_by, message...) đi thẳng lên component
  //     Component sẽ tự xử lý và hiển thị đúng toast cảnh cáo
  return await requestService.post(
    `${URL.chamcong.chamcong}/check-qr`,
    payload,
    undefined,
    ApiServer,
  );
};

const validateQrToken = async (token) => {
  return await requestService.get(
    `${URL.chamcong.chamcong}/qr/validate`,
    { qr_token: token },
    undefined,
    ApiServer,
  );
};
const adminAddChamCong = async (payload) => {
  return await requestService.post(
    `${URL.chamcong.chamcong}/admin-add`,
    payload,
    undefined,
    ApiServer,
  );
};

const adminEditChamCong = async (id, payload) => {
  return await requestService.patch(
    `${URL.chamcong.chamcong}/${id}/admin-edit`,
    payload,
    undefined,
    ApiServer,
  );
};
const importNangSuat = async (payload) =>
  requestService.post(
    `${URL.chamcong.chamcong}/import-nang-suat`,
    payload,
    undefined,
    ApiServer,
  );
const toggleKhoa = async (id, payload) =>
  requestService.patch(
    `${URL.chamcong.chamcong}/${id}/toggle-khoa`,
    payload,
    undefined,
    ApiServer,
  );

export const chamCongService = {
  getAllChamCong,
  getChamCongById,
  checkChamCong,
  updateGhiChu,
  deleteChamCong,
  deleteManyChamCong,
  trangThaiHomNay,
  getCurrentQr,
  checkChamCongQR,
  validateQrToken,
  adminAddChamCong,
  adminEditChamCong,
  importNangSuat,
  toggleKhoa,
};
