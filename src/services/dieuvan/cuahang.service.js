import { ApiServer, URL } from "@/configs/api-request";
import { requestService } from "../request.service";

const getAllCuaHang = async () => {
  try {
    const results = await requestService.get(
      URL.dieuvan.cuahang, // ✅ path
      {},                  // ✅ params (bắt buộc là object)
      undefined,           // headers (bạn có thể bỏ qua)
      ApiServer            // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getAllCuaHang:", error);
  }
};

const addCuaHang = async (data) => {
  try {
    const results = await requestService.post(
      URL.dieuvan.cuahang, // ✅ path
      data,                // ✅ body (dữ liệu cửa hàng)
      undefined,           // headers (nếu có)
      ApiServer            // axiosInstance
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi addCuaHang:", error);
  }
};
const getCuaHangByMaCH = async (maCH) => {
  try {
    const results = await requestService.get(
      `${URL.dieuvan.cuahang}/ma/${maCH}`, // ✅ /cuahang/ma/CH001
      {},
      undefined,
      ApiServer
    );
    return results;
  } catch (error) {
    console.error("Lỗi khi gọi getCuaHangByMaCH:", error);
    return null;
  }
};
export const cuaHangService = {
  getAllCuaHang,
  addCuaHang,
  getCuaHangByMaCH
};
