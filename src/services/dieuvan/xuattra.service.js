import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "../request.service";

// ==================== XUAT TRA SERVICE ====================

const getAllXuatTra = async (params = {}) => {
  // ✅ Tối ưu: Thêm params
  try {
    const results = await requestService.get(
      URL.dieuvan.xuattra,
      params, // Truyền params để lọc/phân trang
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllXuatTra:", error);
    throw error; // Nên throw error để component gọi có thể xử lý
  }
};

const getXuatTraById = async (id) => {
  try {
    const results = await requestService.get(
      `${URL.dieuvan.xuattra}/${id}`, // ✅ Sửa lỗi thứ tự tham số
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getXuatTraById:", error);
    throw error;
  }
};

const createXuatTra = async (payload) => {
  try {
    // ✅ Giữ nguyên logic này (chuyển user name qua header)
    const user = JSON.parse(localStorage.getItem("user"));
    const results = await requestService.post(
      URL.dieuvan.xuattra,
      payload,
      {
        "x-user-name": user?.name || "Unknown",
      },
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi createXuatTra:", error);
    throw error;
  }
};

const updateXuatTra = async (id, payload) => {
  try {
    const results = await requestService.put(
      `${URL.dieuvan.xuattra}/${id}`,
      payload,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi updateXuatTra:", error);
    throw error;
  }
};

const deleteXuatTra = async (id) => {
  try {
    const results = await requestService.del(
      `${URL.dieuvan.xuattra}/${id}`,
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi deleteXuatTra:", error);
    throw error;
  }
};

export const xuatTraService = {
  getAllXuatTra,
  getXuatTraById,
  createXuatTra,
  updateXuatTra,
  deleteXuatTra,
};
