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
    return await requestService.put( // Đổi từ .patch sang .put
      `${URL.learning.khoahoc}/${id}`,
      payload,
      undefined,
      ApiServer
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
    return await requestService.put( // Đổi từ .patch sang .put
      `${URL.learning.baihoc}/${id}`,
      payload,
      undefined,
      ApiServer
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
      // không set headers — để interceptor + axios tự xử lý
    );
    return res.data;
  } catch (error) {
    console.error("Lỗi khi gọi uploadTaiLieu:", error);
    throw error.response?.data || error;
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
    return await requestService.put( // Đổi từ .patch sang .put
      `${URL.learning.baikiemtra}/${id}`,
      payload,
      undefined,
      ApiServer
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

const taoQR = async (id, payload = { thoiGianHetHan: 30 }) => {
  try {
    return await requestService.post(
      `${URL.learning.baikiemtra}/${id}/tao-qr`,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi taoQR:", error);
    throw error;
  }
};

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

// ─────────────────────────────────────────────
// LƯỢT LÀM BÀI
// ─────────────────────────────────────────────
const nopBaiQR = async (payload) => {
  try {
    // payload: { tenNguoiLam, baiKiemTraId, danhSachCauTraLoi, qrToken }
    return await requestService.post(
      `${URL.learning.luotlambai}/nop-qr`,
      payload,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi nopBaiQR:", error);
    throw error;
  }
};

const tatCaLuotLam = async (baiKiemTraId, params = {}) => {
  try {
    return await requestService.get(
      `${URL.learning.luotlambai}/tat-ca/${baiKiemTraId}`,
      params,
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi tatCaLuotLam:", error);
    throw error;
  }
};

const timTheoTen = async (ten) => {
  try {
    return await requestService.get(
      `${URL.learning.luotlambai}/tim-ten`,
      { ten },
      undefined,
      ApiServer,
    );
  } catch (error) {
    console.error("Lỗi khi gọi timTheoTen:", error);
    throw error;
  }
};
const layUrlTaiLieu = async (baiHocId, taiLieuId) => {
  try {
    const res = await ApiServer.get(
      `${URL.learning.baihoc}/${baiHocId}/tai-lieu/${taiLieuId}/url`
    );
    return res.data.url;
  } catch (error) {
    console.error("Lỗi khi lấy URL tài liệu:", error);
    throw error;
  }
};

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────
export const learningService = {
  layUrlTaiLieu,
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
  xoaTaiLieu,
  // Bài kiểm tra
  taoBaiKiemTra,
  layMotBaiKiemTra,
  capNhatBaiKiemTra,
  xoaBaiKiemTra,
  taoQR,
  xacThucQR,
  // Lượt làm bài
  nopBaiQR,
  tatCaLuotLam,
  timTheoTen,
};
