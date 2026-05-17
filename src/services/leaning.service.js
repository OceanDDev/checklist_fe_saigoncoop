import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "./request.service";

// ─────────────────────────────────────────────
// KHÓA HỌC
// ─────────────────────────────────────────────
const layTatCaKhoaHoc = async (params = {}) => {
  try {
    return await requestService.get(
      URL.learning.khoahoc,
      params,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi layTatCaKhoaHoc:", error);
    throw error;
  }
};

const layMotKhoaHoc = async (id) => {
  try {
    return await requestService.get(
      `${URL.learning.khoahoc}/${id}`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi layMotKhoaHoc:", error);
    throw error;
  }
};

const taoKhoaHoc = async (formData) => {
  try {
    const res = await ApiServer.post(
      URL.learning.khoahoc,
      formData,
      // Không set Content-Type, để axios tự set multipart/form-data
    );
    return res.data;
  } catch (error) {
    console.error("Lỗi khi gọi taoKhoaHoc:", error);
    throw error.response?.data || error;
  }
};

const capNhatKhoaHoc = async (id, payload) => {
  try {
    return await requestService.put(
      `${URL.learning.khoahoc}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi capNhatKhoaHoc:", error);
    throw error;
  }
};

const xoaKhoaHoc = async (id) => {
  try {
    return await requestService.del(
      `${URL.learning.khoahoc}/${id}`,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xoaKhoaHoc:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// BÀI HỌC
// ─────────────────────────────────────────────
const taoBaiHoc = async (khoaHocId, payload) => {
  try {
    return await requestService.post(
      `${URL.learning.baihoc}/khoa-hoc/${khoaHocId}`,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi taoBaiHoc:", error);
    throw error;
  }
};

const layMotBaiHoc = async (id) => {
  try {
    return await requestService.get(
      `${URL.learning.baihoc}/${id}`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi layMotBaiHoc:", error);
    throw error;
  }
};

const capNhatBaiHoc = async (id, payload) => {
  try {
    return await requestService.put(
      `${URL.learning.baihoc}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi capNhatBaiHoc:", error);
    throw error;
  }
};

const xoaBaiHoc = async (id) => {
  try {
    return await requestService.del(
      `${URL.learning.baihoc}/${id}`,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xoaBaiHoc:", error);
    throw error;
  }
};

const uploadTaiLieu = async (id, formData) => {
  try {
    const res = await ApiServer.post(
      `${URL.learning.baihoc}/${id}/upload/tai-lieu`,
      formData,
      // Không set headers — để interceptor + axios tự xử lý
    );
    return res.data;
  } catch (error) {
    console.error("Lỗi khi gọi uploadTaiLieu:", error);
    throw error.response?.data || error;
  }
};

const layUrlTaiLieu = async (baiHocId, taiLieuId) => {
  try {
    const res = await ApiServer.get(
      `${URL.learning.baihoc}/${baiHocId}/tai-lieu/${taiLieuId}/url`,
    );
    return res.data.url;
  } catch (error) {
    console.error("Lỗi khi lấy URL tài liệu:", error);
    throw error;
  }
};

const xoaTaiLieu = async (id, taiLieuId) => {
  try {
    return await requestService.del(
      `${URL.learning.baihoc}/${id}/tai-lieu/${taiLieuId}`,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xoaTaiLieu:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// BÀI KIỂM TRA
// ─────────────────────────────────────────────
const taoBaiKiemTra = async (payload) => {
  try {
    return await requestService.post(
      URL.learning.baikiemtra,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi taoBaiKiemTra:", error);
    throw error;
  }
};

const layMotBaiKiemTra = async (id) => {
  try {
    return await requestService.get(
      `${URL.learning.baikiemtra}/${id}`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi layMotBaiKiemTra:", error);
    throw error;
  }
};

const capNhatBaiKiemTra = async (id, payload) => {
  try {
    return await requestService.put(
      `${URL.learning.baikiemtra}/${id}`,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi capNhatBaiKiemTra:", error);
    throw error;
  }
};

const xoaBaiKiemTra = async (id) => {
  try {
    return await requestService.del(
      `${URL.learning.baikiemtra}/${id}`,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xoaBaiKiemTra:", error);
    throw error;
  }
};

// ── Quản lý phiên (admin/teacher) ────────────

const moPhien = async (id) => {
  try {
    return await requestService.post(
      `${URL.learning.baikiemtra}/${id}/mo-phien`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi moPhien:", error);
    throw error;
  }
};

const ketThuc = async (id) => {
  try {
    return await requestService.post(
      `${URL.learning.baikiemtra}/${id}/ket-thuc`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi ketThuc:", error);
    throw error;
  }
};

// ── Học viên làm bài (không cần auth) ────────

/**
 * GET /bai-kiem-tra/xac-thuc-qr?token=...
 * Trả về đề bài sau khi xác thực token QR
 */
const xacThucQR = async (token) => {
  try {
    return await requestService.get(
      `${URL.learning.baikiemtra}/xac-thuc-qr`,
      { token },
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xacThucQR:", error);
    throw error;
  }
};

/**
 * POST /bai-kiem-tra/:id/bat-dau
 * body: { ten, token }  →  nhận ketQuaId
 */
const batDau = async (id, payload) => {
  try {
    return await requestService.post(
      `${URL.learning.baikiemtra}/${id}/bat-dau`,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi batDau:", error);
    throw error;
  }
};

/**
 * POST /bai-kiem-tra/:id/nop-bai
 * body: { ketQuaId, cauTraLoi: [{ cauHoiId, dapAnChon }] }
 * →  nhận điểm + giải thích
 */
const nopBai = async (id, payload) => {
  try {
    return await requestService.post(
      `${URL.learning.baikiemtra}/${id}/nop-bai`,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi nopBai:", error);
    throw error;
  }
};

// ── Xem kết quả (admin/teacher) ──────────────

/**
 * GET /bai-kiem-tra/:id/ket-qua
 * Trả về: STT, tên, điểm%, số câu đúng/tổng, đạt/trượt,
 *         thời gian làm, tuDongNop + thống kê tổng
 */
const xemKetQua = async (id) => {
  try {
    return await requestService.get(
      `${URL.learning.baikiemtra}/${id}/ket-qua`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi xemKetQua:", error);
    throw error;
  }
};
const layTatCaBaiKiemTra = async () => {
  try {
    return await requestService.get(
      URL.learning.baikiemtra,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi layTatCaBaiKiemTra:", error);
    throw error;
  }
};
const resetPhien = async (id) => {
  try {
    return await requestService.post(
      `${URL.learning.baikiemtra}/${id}/reset-phien`,
      {},
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi resetPhien:", error);
    throw error;
  }
};
// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────
export const learningService = {
  // Khóa học
  layTatCaKhoaHoc,
  layMotKhoaHoc,
  taoKhoaHoc,
  capNhatKhoaHoc,
  xoaKhoaHoc,

  // Bài học
  taoBaiHoc,
  layMotBaiHoc,
  capNhatBaiHoc,
  xoaBaiHoc,
  uploadTaiLieu,
  layUrlTaiLieu,
  xoaTaiLieu,

  // Bài kiểm tra — CRUD
  taoBaiKiemTra,
  layMotBaiKiemTra,
  capNhatBaiKiemTra,
  xoaBaiKiemTra,
  layTatCaBaiKiemTra,
resetPhien,
  // Bài kiểm tra — Quản lý phiên
  moPhien,
  ketThuc,

  // Bài kiểm tra — Học viên làm bài
  xacThucQR,
  batDau,
  nopBai,

  // Bài kiểm tra — Kết quả
  xemKetQua,
};