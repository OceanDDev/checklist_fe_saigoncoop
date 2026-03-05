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
    throw error;
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
    console.log("🔍 getCurrentQr raw:", results); // ← thêm dòng này
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getCurrentQr:", error);
    throw error;
  }
};

// 🔐 Chấm công qua QR (không cần GPS)
const checkChamCongQR = async (payload) => {
  try {
    const results = await requestService.post(
      `${URL.chamcong.chamcong}/check-qr`,
      payload,
      undefined,
      ApiServer,
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi checkChamCongQR:", error);
    throw error;
  }
};

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
};
